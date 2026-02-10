import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import {
  loginSchema, verifyOtpSchema, updateProfileSchema,
  swipeSchema, sendMessageSchema, reportSchema,
  GREEN_FLAG_PROMPTS, FESTIVAL_LIST,
} from "@shared/schema";
import { randomInt } from "crypto";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "client", "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

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

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function isActiveFestivalSeason(): { active: boolean; festival: string | null } {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 9 || (month === 10 && day <= 15)) return { active: true, festival: "Diwali" };
  if (month === 2 || (month === 3 && day <= 10)) return { active: true, festival: "Holi" };
  if (month === 8 && day >= 15) return { active: true, festival: "Ganesh Chaturthi" };
  if (month === 9 && day <= 15) return { active: true, festival: "Navratri" };
  if (month === 11 && day >= 20) return { active: true, festival: "Christmas" };

  const ramadanStart = new Date(now.getFullYear(), 2, 1);
  const ramadanEnd = new Date(now.getFullYear(), 3, 15);
  if (now >= ramadanStart && now <= ramadanEnd) return { active: true, festival: "Eid" };

  return { active: false, festival: null };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "milaap-session-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.use(async (req: Request, _res: Response, next: Function) => {
    if (req.session.userId) {
      await storage.setUserOnlineStatus(req.session.userId, true);
    }
    next();
  });

  // ==================== AUTH ====================
  
  app.post("/api/auth/request-otp", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const { phone, email } = parsed.data;
      const key = phone || email || "";
      const otp = generateOtp();
      
      otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
      console.log(`[OTP] ${key}: ${otp}`);
      
      return res.json({ message: "OTP sent successfully", otp_hint: otp });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

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
      await storage.setUserOnlineStatus(user.id, true);

      const profile = await storage.getProfile(user.id);

      return res.json({
        user: { id: user.id, respectScore: user.respectScore, dailyLikesLimit: user.dailyLikesLimit, dailyLikesUsed: user.dailyLikesUsed },
        hasProfile: !!profile,
        profile: profile || null,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const profile = await storage.getProfile(user.id);
      return res.json({
        user: {
          id: user.id,
          respectScore: user.respectScore,
          isVerified: user.isVerified,
          dailyLikesLimit: user.dailyLikesLimit,
          dailyLikesUsed: user.dailyLikesUsed,
          isOnline: user.isOnline,
          lastSeenAt: user.lastSeenAt,
        },
        profile: profile || null,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    if (req.session.userId) {
      await storage.setUserOnlineStatus(req.session.userId, false);
    }
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.post("/api/auth/heartbeat", requireAuth, async (req: Request, res: Response) => {
    await storage.setUserOnlineStatus(req.session.userId!, true);
    return res.json({ ok: true });
  });

  // ==================== PROFILES ====================

  app.post("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const userId = req.session.userId!;
      const existing = await storage.getProfile(userId);

      if (parsed.data.intent && existing?.intent && existing?.intentLockedAt) {
        const lockExpiry = new Date(existing.intentLockedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (new Date() < lockExpiry && parsed.data.intent !== existing.intent) {
          const daysLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          return res.status(400).json({
            message: `Intent is locked for ${daysLeft} more days. Changing it will reduce your profile visibility.`,
            canForceChange: true,
          });
        }
      }

      const profileData: any = { ...parsed.data };

      if (parsed.data.intent && (!existing?.intent || parsed.data.intent !== existing?.intent)) {
        profileData.intentLockedAt = new Date();
        if (existing?.intent && existing?.intentLockedAt) {
          const lockExpiry = new Date(existing.intentLockedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (new Date() < lockExpiry) {
            profileData.intentLockBroken = true;
            const user = await storage.getUser(userId);
            if (user) {
              await storage.updateUser(userId, {
                respectScore: Math.max(0, (user.respectScore ?? 85) - 10),
                dailyLikesLimit: Math.max(10, (user.dailyLikesLimit ?? 50) - 15),
              });
            }
          }
        }
      }

      if (existing) {
        const updated = await storage.updateProfile(userId, profileData);
        return res.json(updated);
      }

      const profile = await storage.createProfile({
        userId,
        ...profileData,
      });
      return res.status(201).json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/profile/force-intent", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { intent } = req.body;
      if (!["Casual", "Dating", "Serious", "Marriage"].includes(intent)) {
        return res.status(400).json({ message: "Invalid intent" });
      }

      const existing = await storage.getProfile(userId);
      if (!existing) return res.status(404).json({ message: "Profile not found" });

      await storage.updateProfile(userId, {
        intent,
        intentLockedAt: new Date() as any,
        intentLockBroken: true,
      });

      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          respectScore: Math.max(0, (user.respectScore ?? 85) - 10),
          dailyLikesLimit: Math.max(10, (user.dailyLikesLimit ?? 50) - 15),
        });
      }

      return res.json({ message: "Intent changed. Visibility reduced for 30 days.", penalized: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getProfile(req.session.userId!);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/profile/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getProfile(req.params.userId as string);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      const user = await storage.getUser(req.params.userId as string);
      return res.json({
        ...profile,
        respectScore: user?.respectScore,
        isOnline: user?.isOnline,
        lastSeenAt: user?.lastSeenAt,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/upload-photo", requireAuth, (req: Request, res: Response, next: Function) => {
    upload.single("photo")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      const photoUrl = `/uploads/${req.file.filename}`;
      return res.json({ url: photoUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== RESPECT METER ====================

  app.get("/api/respect/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const targetUserId = req.params.userId as string;
      const user = await storage.getUser(targetUserId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const reportsCount = user.reportCount ?? 0;
      const dropRate = await storage.getConversationDropRate(targetUserId);

      const baseScore = user.respectScore ?? 85;
      let breakdown = {
        baseScore,
        reportPenalty: reportsCount * -5,
        dropPenalty: Math.round(-dropRate * 0.2),
        totalScore: baseScore,
      };
      breakdown.totalScore = Math.max(0, Math.min(100, baseScore));

      return res.json({
        score: breakdown.totalScore,
        breakdown,
        effects: {
          matchQuality: breakdown.totalScore >= 70 ? "High" : breakdown.totalScore >= 40 ? "Medium" : "Low",
          dailyLikes: user.dailyLikesLimit,
          profileReach: breakdown.totalScore >= 70 ? "Full" : breakdown.totalScore >= 40 ? "Reduced" : "Limited",
        },
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== DISCOVER / MATCHMAKING ====================

  app.get("/api/discover", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      const myProfile = await storage.getProfile(userId);
      const filters = {
        gender: req.query.gender as string | undefined,
        ageMin: req.query.ageMin ? parseInt(req.query.ageMin as string) : undefined,
        ageMax: req.query.ageMax ? parseInt(req.query.ageMax as string) : undefined,
        city: req.query.city as string | undefined,
        intent: req.query.intent as string | undefined,
        familyMode: myProfile?.familyMode ? true : undefined,
      };
      let profilesList = await storage.getDiscoverProfiles(userId, limit, filters);

      const festivalSeason = isActiveFestivalSeason();
      if (festivalSeason.active && festivalSeason.festival && myProfile?.festivalPrefs) {
        const myFestivals = myProfile.festivalPrefs as string[];
        if (myFestivals.includes(festivalSeason.festival)) {
          profilesList.sort((a, b) => {
            const aFestivals = (a.festivalPrefs as string[]) || [];
            const bFestivals = (b.festivalPrefs as string[]) || [];
            const aMatch = aFestivals.includes(festivalSeason.festival!) ? 1 : 0;
            const bMatch = bFestivals.includes(festivalSeason.festival!) ? 1 : 0;

            if (aMatch !== bMatch) return bMatch - aMatch;

            const aHometown = a.hometownForFestivals === myProfile.hometownForFestivals ? 1 : 0;
            const bHometown = b.hometownForFestivals === myProfile.hometownForFestivals ? 1 : 0;
            return bHometown - aHometown;
          });
        }
      }

      const enrichedProfiles = await Promise.all(profilesList.map(async (p) => {
        const user = await storage.getUser(p.userId);
        return {
          ...p,
          respectScore: user?.respectScore,
          isOnline: user?.isOnline,
          lastSeenAt: user?.lastSeenAt,
        };
      }));

      return res.json(enrichedProfiles);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/festival-status", requireAuth, async (_req: Request, res: Response) => {
    const status = isActiveFestivalSeason();
    return res.json(status);
  });

  app.post("/api/swipe", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = swipeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const userId = req.session.userId!;
      const { targetUserId, action } = parsed.data;

      if (userId === targetUserId) {
        return res.status(400).json({ message: "Cannot swipe on yourself" });
      }

      const existing = await storage.getMatch(userId, targetUserId);
      if (existing) {
        return res.status(409).json({ message: "Already swiped on this user" });
      }

      if (action === "like" || action === "superlike") {
        const user = await storage.getUser(userId);
        if (user) {
          const now = new Date();
          const resetAt = user.dailyLikesResetAt;
          if (resetAt && now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
            await storage.updateUser(userId, { dailyLikesUsed: 0, dailyLikesResetAt: now });
          } else if ((user.dailyLikesUsed ?? 0) >= (user.dailyLikesLimit ?? 50)) {
            return res.status(429).json({ message: "Daily like limit reached. Come back tomorrow!" });
          }
          await storage.updateUser(userId, { dailyLikesUsed: (user.dailyLikesUsed ?? 0) + 1 });
        }
      }

      const match = await storage.createMatch({
        userId,
        targetUserId,
        action,
        isMatched: false,
      });

      let isMutualMatch = false;
      if (action === "like" || action === "superlike") {
        isMutualMatch = await storage.checkMutualMatch(userId, targetUserId);
        
        if (isMutualMatch) {
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

  app.get("/api/matches", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const mutualMatches = await storage.getMutualMatches(userId);
      
      const enriched = await Promise.all(
        mutualMatches.map(async (match) => {
          const profile = await storage.getProfile(match.targetUserId);
          const user = await storage.getUser(match.targetUserId);
          return {
            ...match,
            profile: profile ? { ...profile, respectScore: user?.respectScore, isOnline: user?.isOnline, lastSeenAt: user?.lastSeenAt } : null,
          };
        })
      );

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== CHAT / MESSAGES ====================

  app.post("/api/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const userId = req.session.userId!;

      const match = await storage.getMatchById(parsed.data.matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Cannot send messages to non-matched users" });
      }
      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not part of this match" });
      }

      const senderProfile = await storage.getProfile(userId);
      if (senderProfile?.familyMode) {
        const inappropriate = /\b(sex|sexy|hot|hookup|fwb|one night|booty)\b/i;
        if (inappropriate.test(parsed.data.content)) {
          return res.status(400).json({ message: "This message doesn't meet Family Mode standards. Please keep the conversation respectful." });
        }
      }

      const message = await storage.sendMessage({
        matchId: parsed.data.matchId,
        senderId: userId,
        content: parsed.data.content,
        isAiGenerated: parsed.data.isAiGenerated || false,
        isAiProxy: parsed.data.isAiProxy || false,
      });

      return res.status(201).json(message);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;

      const match = await storage.getMatchById(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });
      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not part of this match" });
      }

      await storage.markMessagesRead(matchId, userId);

      const messagesList = await storage.getMessages(matchId);
      return res.json(messagesList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== SCREENSHOT PROTECTION ====================

  app.get("/api/settings/no-screenshot", requireAuth, async (_req: Request, res: Response) => {
    const enabled = await storage.getAppSetting("no_screenshot_global");
    return res.json({ enabled: enabled === "true" });
  });

  app.post("/api/settings/no-screenshot", requireAuth, async (req: Request, res: Response) => {
    const { enabled } = req.body;
    await storage.setAppSetting("no_screenshot_global", String(!!enabled));
    return res.json({ enabled: !!enabled });
  });

  app.post("/api/screenshot-alert", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId } = req.body;

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(400).json({ message: "Invalid match" });
      }

      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not authorized for this match" });
      }

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const alert = await storage.createScreenshotAlert({
        matchId,
        detectedByUserId: userId,
        notifiedUserId: otherUserId,
      });

      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, {
          respectScore: Math.max(0, (user.respectScore ?? 85) - 3),
        });
      }

      return res.json({ alert, message: "Screenshot detected. Other user has been notified." });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/screenshot-alerts/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const alerts = await storage.getScreenshotAlerts(req.params.matchId as string);
      return res.json(alerts);
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

  // ==================== AI PERSONA & PROXY ====================

  app.post("/api/ai/suggest", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId, context } = req.body;

      if (!matchId) {
        return res.status(400).json({ message: "matchId is required" });
      }

      const myProfile = await storage.getProfile(userId);
      if (!myProfile) {
        return res.status(400).json({ message: "Profile not found" });
      }

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Invalid match" });
      }
      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not part of this match" });
      }

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;
      const otherProfile = await storage.getProfile(otherUserId);

      const recentMessages = await storage.getMessages(matchId, 10);
      const chatHistory = recentMessages.map(m => 
        `${m.senderId === userId ? "Me" : otherProfile?.name || "Them"}: ${m.content}`
      ).join("\n");

      const tone = myProfile.aiTone || "Friendly";
      const language = myProfile.aiLanguage || "English";
      const pace = myProfile.aiChatPace || "Normal";
      const boundaries = myProfile.aiBoundaries || [];

      let familyModeRule = "";
      if (myProfile.familyMode) {
        familyModeRule = "\n- IMPORTANT: Family Mode is ON. Keep language clean and respectful. No innuendos, no flirting, keep it wholesome.";
      }

      const systemPrompt = `You are a dating chat assistant for Milaap, an Indian dating app. Generate a single short, natural message suggestion.

Rules:
- Tone: ${tone}
- Language: ${language === "Hinglish" ? "Mix of Hindi and English (Hinglish)" : language}
- Chat pace: ${pace} (${pace === "Slow" ? "give thoughtful, longer responses" : pace === "Fast" ? "keep it snappy and quick" : "natural pacing"})
${boundaries.length > 0 ? `- Boundaries to respect: ${boundaries.join(", ")}` : ""}
- Keep it under 100 words
- Be respectful and culturally appropriate for Indian context
- Reference shared interests if possible
- Don't be overly formal or use heavy slang
- Return ONLY the suggested message text, nothing else${familyModeRule}

My name: ${myProfile.name}
My interests: ${(myProfile.interests || []).join(", ")}
Their name: ${otherProfile?.name || "my match"}
Their interests: ${(otherProfile?.interests || []).join(", ")}`;

      const userPrompt = chatHistory 
        ? `Here's our recent conversation:\n${chatHistory}\n\nSuggest a natural follow-up message.`
        : `We just matched! Suggest a great opening message${context ? ` about: ${context}` : ""}.`;

      const openai = getOpenAI();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      const suggestion = completion.choices[0]?.message?.content?.trim() || "";

      return res.json({ suggestion });
    } catch (err: any) {
      console.error("AI suggestion error:", err);
      return res.status(500).json({ message: "Failed to generate suggestion", suggestion: "" });
    }
  });

  app.post("/api/ai/proxy-reply", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId } = req.body;

      const myProfile = await storage.getProfile(userId);
      if (!myProfile || !myProfile.aiProxyEnabled) {
        return res.status(400).json({ message: "AI Proxy is not enabled" });
      }

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Invalid match" });
      }

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;
      const otherProfile = await storage.getProfile(otherUserId);
      const recentMessages = await storage.getMessages(matchId, 15);

      const chatHistory = recentMessages.map(m => 
        `${m.senderId === userId ? myProfile.name : otherProfile?.name || "Them"}: ${m.content}`
      ).join("\n");

      const tone = myProfile.aiTone || "Friendly";
      const language = myProfile.aiLanguage || "English";
      const pace = myProfile.aiChatPace || "Normal";
      const boundaries = myProfile.aiBoundaries || [];

      const systemPrompt = `You are acting as a proxy for ${myProfile.name} on Milaap dating app. They are currently offline, and you should respond naturally as if you were them.

CRITICAL Rules:
- Match their tone: ${tone}
- Language: ${language === "Hinglish" ? "Mix of Hindi and English (Hinglish)" : language}
- Chat pace: ${pace}
${boundaries.length > 0 ? `- NEVER discuss these topics: ${boundaries.join(", ")}` : ""}
- Keep responses under 80 words
- Be authentic to Indian cultural context
- Don't commit to plans or share personal info
- Don't ask overly personal questions
- Return ONLY the message text
${myProfile.familyMode ? "- FAMILY MODE: Keep language clean and wholesome" : ""}

${myProfile.name}'s interests: ${(myProfile.interests || []).join(", ")}
${myProfile.name}'s bio: ${myProfile.bio || "Not set"}`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Recent conversation:\n${chatHistory}\n\nGenerate a natural reply as ${myProfile.name}.` },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content?.trim() || "";

      if (reply) {
        const message = await storage.sendMessage({
          matchId,
          senderId: userId,
          content: reply,
          isAiGenerated: true,
          isAiProxy: true,
        });
        return res.json({ message, proxyReply: true });
      }

      return res.json({ message: null, proxyReply: false });
    } catch (err: any) {
      console.error("AI proxy error:", err);
      return res.status(500).json({ message: "Proxy reply failed" });
    }
  });

  app.post("/api/ai/analyze-tone", requireAuth, async (req: Request, res: Response) => {
    try {
      const { matchId } = req.body;
      const userId = req.session.userId!;

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Invalid match" });
      }

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;
      const recentMessages = await storage.getMessages(matchId, 20);
      const otherMessages = recentMessages.filter(m => m.senderId === otherUserId).map(m => m.content);

      if (otherMessages.length < 3) {
        return res.json({ tone: "Not enough data", respectful: true, score: null });
      }

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Analyze the tone of these dating app messages. Return JSON only: {"tone": "friendly|flirty|aggressive|rude|neutral", "respectful": true/false, "score": 0-100, "flags": ["list of concerns if any"]}`,
          },
          {
            role: "user",
            content: `Messages:\n${otherMessages.join("\n")}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      try {
        const analysis = JSON.parse(raw);
        if (!analysis.respectful && analysis.score < 30) {
          const user = await storage.getUser(otherUserId);
          if (user) {
            await storage.updateUser(otherUserId, {
              respectScore: Math.max(0, (user.respectScore ?? 85) - 3),
            });
          }
        }
        return res.json(analysis);
      } catch {
        return res.json({ tone: "neutral", respectful: true, score: 70, flags: [] });
      }
    } catch (err: any) {
      console.error("Tone analysis error:", err);
      return res.status(500).json({ message: "Analysis failed" });
    }
  });

  app.post("/api/ai/analyze-green-flags", requireAuth, async (req: Request, res: Response) => {
    try {
      const { stories } = req.body;
      if (!stories || !Array.isArray(stories) || stories.length === 0) {
        return res.status(400).json({ message: "Stories required" });
      }

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You analyze dating profile "Green Flag Stories" from an Indian dating app. For each story, identify green flags that show emotional maturity, respect, and good values. Return JSON: {"greenFlags": ["flag1", "flag2", ...], "highlights": [{"prompt": "...", "flag": "short positive trait"}]}. Keep flags concise (2-4 words). Max 5 flags total.`,
          },
          {
            role: "user",
            content: stories.map((s: any) => `Q: ${s.prompt}\nA: ${s.answer}`).join("\n\n"),
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      try {
        return res.json(JSON.parse(raw));
      } catch {
        return res.json({ greenFlags: [], highlights: [] });
      }
    } catch (err: any) {
      return res.status(500).json({ message: "Analysis failed" });
    }
  });

  return httpServer;
}
