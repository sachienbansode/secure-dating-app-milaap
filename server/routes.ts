import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import {
  loginSchema, verifyOtpSchema, updateProfileSchema,
  swipeSchema, sendMessageSchema, reportSchema
} from "@shared/schema";
import { randomInt } from "crypto";

// In-memory OTP store (in production: use Redis)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

// Session middleware setup
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "milaap-session-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  // ==================== AUTH ====================
  
  // Request OTP
  app.post("/api/auth/request-otp", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const { phone, email } = parsed.data;
      const key = phone || email || "";
      const otp = generateOtp();
      
      otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min expiry
      
      // In production: send OTP via SMS/Email service
      console.log(`[OTP] ${key}: ${otp}`);
      
      return res.json({ message: "OTP sent successfully", otp_hint: otp }); // hint for demo
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Verify OTP & Login
  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const { phone, email, otp } = parsed.data;
      const key = phone || email || "";
      const stored = otpStore.get(key);

      if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      otpStore.delete(key);

      // Find or create user
      let user = phone
        ? await storage.getUserByPhone(phone)
        : await storage.getUserByEmail(email!);

      if (!user) {
        user = await storage.createUser({
          phone: phone || null,
          email: email || null,
          isVerified: true,
        });
      } else {
        await storage.updateUser(user.id, { isVerified: true });
      }

      if (user.isBanned) {
        return res.status(403).json({ message: "Account has been suspended" });
      }

      req.session.userId = user.id;

      // Check if profile exists
      const profile = await storage.getProfile(user.id);

      return res.json({
        user: { id: user.id, respectScore: user.respectScore },
        hasProfile: !!profile,
        profile: profile || null,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get current session
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const profile = await storage.getProfile(user.id);
      return res.json({
        user: { id: user.id, respectScore: user.respectScore, isVerified: user.isVerified },
        profile: profile || null,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // ==================== PROFILES ====================

  // Create/Update profile
  app.post("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const userId = req.session.userId!;
      const existing = await storage.getProfile(userId);

      if (existing) {
        const updated = await storage.updateProfile(userId, parsed.data);
        return res.json(updated);
      }

      const profile = await storage.createProfile({
        userId,
        ...parsed.data,
      });
      return res.status(201).json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get own profile
  app.get("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getProfile(req.session.userId!);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get another user's profile
  app.get("/api/profile/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getProfile(req.params.userId as string);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== DISCOVER / MATCHMAKING ====================

  // Get profiles to swipe on
  app.get("/api/discover", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      const profilesList = await storage.getDiscoverProfiles(userId, limit);
      return res.json(profilesList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Swipe (like/pass/superlike)
  app.post("/api/swipe", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = swipeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const userId = req.session.userId!;
      const { targetUserId, action } = parsed.data;

      // Prevent self-swipe
      if (userId === targetUserId) {
        return res.status(400).json({ message: "Cannot swipe on yourself" });
      }

      // Check if already swiped
      const existing = await storage.getMatch(userId, targetUserId);
      if (existing) {
        return res.status(409).json({ message: "Already swiped on this user" });
      }

      // Create the swipe record
      const match = await storage.createMatch({
        userId,
        targetUserId,
        action,
        isMatched: false,
      });

      // Check for mutual match (only on like/superlike)
      let isMutualMatch = false;
      if (action === "like" || action === "superlike") {
        isMutualMatch = await storage.checkMutualMatch(userId, targetUserId);
        
        if (isMutualMatch) {
          // Update both records to matched
          const { eq, and } = await import("drizzle-orm");
          const { db } = await import("./db");
          const { matches: matchesTable } = await import("@shared/schema");
          
          await db.update(matchesTable)
            .set({ isMatched: true })
            .where(and(eq(matchesTable.userId, userId), eq(matchesTable.targetUserId, targetUserId)));
          
          await db.update(matchesTable)
            .set({ isMatched: true })
            .where(and(eq(matchesTable.userId, targetUserId), eq(matchesTable.targetUserId, userId)));
        }
      }

      return res.json({ match, isMutualMatch });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get mutual matches
  app.get("/api/matches", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const mutualMatches = await storage.getMutualMatches(userId);
      
      // Enrich with profile data
      const enriched = await Promise.all(
        mutualMatches.map(async (match) => {
          const profile = await storage.getProfile(match.targetUserId);
          return { ...match, profile };
        })
      );

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== CHAT / MESSAGES ====================

  // Send message
  app.post("/api/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const userId = req.session.userId!;

      // Verify the match exists and user is part of it
      const match = await storage.getMatchById(parsed.data.matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Cannot send messages to non-matched users" });
      }
      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not part of this match" });
      }

      const message = await storage.sendMessage({
        matchId: parsed.data.matchId,
        senderId: userId,
        content: parsed.data.content,
        isAiGenerated: parsed.data.isAiGenerated || false,
      });

      return res.status(201).json(message);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get messages for a match
  app.get("/api/messages/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;

      // Verify user is part of this match
      const match = await storage.getMatchById(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });
      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not part of this match" });
      }

      // Mark messages as read
      await storage.markMessagesRead(matchId, userId);

      const messagesList = await storage.getMessages(matchId);
      return res.json(messagesList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== REPORTS ====================

  app.post("/api/report", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const report = await storage.createReport({
        reporterId: req.session.userId!,
        ...parsed.data,
        status: "pending",
      });

      return res.status(201).json(report);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
