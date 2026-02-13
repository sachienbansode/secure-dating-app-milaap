import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import {
  loginSchema, verifyOtpSchema, updateProfileSchema,
  swipeSchema, sendMessageSchema, reportSchema,
  adminLoginSchema, adminVerifyOtpSchema,
  GREEN_FLAG_PROMPTS, FESTIVAL_LIST,
} from "@shared/schema";
import { randomInt, randomUUID } from "crypto";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

import type { ZodError } from "zod";

const typingStatus = new Map<string, { userId: string; name: string; expiresAt: number }>();

function formatValidationError(error: ZodError): string {
  const fieldMessages: Record<string, string> = {
    email: "Please enter a valid email address",
    password: "Password must be at least 6 characters",
    phone: "Please enter a valid phone number",
    otp: "Please enter a valid 6-digit OTP",
    name: "Name must be between 2 and 50 characters",
    age: "Age must be between 18 and 100",
    gender: "Please select a valid gender",
    bio: "Bio must be under 1000 characters",
    city: "Please enter your city",
    location: "Please enter your location",
    content: "Message cannot be empty",
    targetUserId: "Invalid user selected",
    action: "Invalid action",
    matchId: "Invalid match",
    reason: "Please provide a reason",
    reportedUserId: "Invalid user",
  };

  const issues = error.issues;
  if (issues.length === 0) return "Please check your input and try again";

  const messages = issues.map((issue) => {
    const field = issue.path[0]?.toString() || "";
    return fieldMessages[field] || issue.message.replace(/^String/, "This field");
  });

  const unique = [...new Set(messages)];
  return unique.join(". ");
}

const uploadDir = path.join(process.cwd(), "uploads");
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

const chatAttachmentDir = path.join(process.cwd(), "uploads", "chat");
if (!fs.existsSync(chatAttachmentDir)) {
  fs.mkdirSync(chatAttachmentDir, { recursive: true });
}

const chatAttachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatAttachmentDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `chat-${uniqueSuffix}${ext}`);
  },
});

const chatAttachmentUpload = multer({
  storage: chatAttachmentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    isAdmin: boolean;
    adminUserId: string;
    sessionToken: string;
  }
}

async function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please log in to continue" });
  }
  if (req.session.sessionToken) {
    const dbSession = await storage.getUserSession(req.session.sessionToken);
    if (!dbSession || !dbSession.isActive || (dbSession.expiresAt && new Date(dbSession.expiresAt) < new Date())) {
      if (dbSession && dbSession.isActive) {
        await storage.invalidateSession(req.session.sessionToken);
      }
      await storage.setUserOnlineStatus(req.session.userId, false);
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Your session has expired. Please log in again." });
    }
    await storage.updateSessionActivity(req.session.sessionToken);
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.isAdmin || !req.session.adminUserId) {
    return res.status(401).json({ message: "Admin access required. Please log in." });
  }
  if (req.session.sessionToken) {
    const dbSession = await storage.getUserSession(req.session.sessionToken);
    if (!dbSession || !dbSession.isActive || (dbSession.expiresAt && new Date(dbSession.expiresAt) < new Date())) {
      if (dbSession && dbSession.isActive) {
        await storage.invalidateSession(req.session.sessionToken);
      }
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Your admin session has expired. Please log in again." });
    }
    await storage.updateSessionActivity(req.session.sessionToken);
  }
  next();
}

async function checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  let tier = user.membershipTier || "basic";
  if (tier !== "basic" && user.membershipExpiresAt && new Date(user.membershipExpiresAt) < new Date()) {
    tier = "basic";
  }
  const plan = await storage.getMembershipPlan(tier);
  if (!plan || !plan.features) return false;
  return (plan.features as string[]).includes(feature);
}

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

function getClientInfo(req: Request): { ip: string; userAgent: string; location: string } {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";
  const location = (req.headers["x-forwarded-for"] as string) ? "Via proxy" : "Direct";
  return { ip, userAgent, location };
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

  app.use("/uploads", express.static(uploadDir));

  app.use(async (req: Request, _res: Response, next: Function) => {
    if (req.session.userId) {
      await storage.setUserOnlineStatus(req.session.userId, true);
    }
    next();
  });

  const logActivity = async (userId: string | null, action: string, category: string, details?: Record<string, any>, req?: Request) => {
    try {
      await storage.logActivity({
        userId,
        action,
        category,
        details: details || null,
        ipAddress: req?.ip || null,
      });
    } catch (e) { /* silent fail for logging */ }
  };

  // ==================== AUTH ====================
  
  app.post("/api/auth/request-otp", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }

      const { phone, email } = parsed.data;
      const key = phone || email || "";
      const otp = generateOtp();
      
      otpStore.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
      console.log(`[OTP] ${key}: ${otp}`);
      
      return res.json({ message: "OTP sent successfully", otp_hint: otp });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
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

      const clientInfo = getClientInfo(req);
      await storage.invalidateUserSessions(user.id, "user");

      const sessionToken = randomUUID();
      await storage.createUserSession({
        userId: user.id,
        userType: "user",
        sessionToken,
        ipAddress: clientInfo.ip,
        location: clientInfo.location,
        userAgent: clientInfo.userAgent,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      req.session.userId = user.id;
      req.session.sessionToken = sessionToken;
      await storage.setUserOnlineStatus(user.id, true);

      const profile = await storage.getProfile(user.id);

      await logActivity(user.id, "user_login", "auth", {
        method: phone ? "phone" : "email",
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        location: clientInfo.location,
      }, req);

      return res.json({
        user: {
          id: user.id,
          respectScore: user.respectScore,
          dailyLikesLimit: user.dailyLikesLimit,
          dailyLikesUsed: user.dailyLikesUsed,
          termsAcceptedAt: user.termsAcceptedAt,
          termsAcceptedVersion: user.termsAcceptedVersion,
        },
        hasProfile: !!profile,
        profile: profile || null,
        isNewUser: !profile,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const profile = await storage.getProfile(user.id);
      let effectiveTier = user.membershipTier || "basic";
      if (effectiveTier !== "basic" && user.membershipExpiresAt && new Date(user.membershipExpiresAt) < new Date()) {
        effectiveTier = "basic";
        await storage.updateUser(user.id, { membershipTier: "basic", membershipExpiresAt: null as any });
      }

      return res.json({
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          respectScore: user.respectScore,
          isVerified: user.isVerified,
          dailyLikesLimit: user.dailyLikesLimit,
          dailyLikesUsed: user.dailyLikesUsed,
          isOnline: user.isOnline,
          lastSeenAt: user.lastSeenAt,
          termsAcceptedAt: user.termsAcceptedAt,
          termsAcceptedVersion: user.termsAcceptedVersion,
          membershipTier: effectiveTier,
          membershipExpiresAt: user.membershipExpiresAt,
        },
        profile: profile || null,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/update-contact", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { phone, email } = req.body;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updates: any = {};
      if (phone && !user.phone) {
        const existing = await storage.getUserByPhone(phone);
        if (existing && existing.id !== userId) {
          return res.status(400).json({ message: "This phone number is already registered to another account." });
        }
        updates.phone = phone;
      }
      if (email && !user.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== userId) {
          return res.status(400).json({ message: "This email is already registered to another account." });
        }
        updates.email = email;
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateUser(userId, updates);
      }

      return res.json({ message: "Contact info updated" });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const logoutUserId = req.session.userId || null;
    if (req.session.userId) {
      await storage.setUserOnlineStatus(req.session.userId, false);
    }
    if (req.session.sessionToken) {
      await storage.invalidateSession(req.session.sessionToken);
    }
    await logActivity(logoutUserId, "user_logout", "auth", { ip: getClientIp(req) }, req);
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.post("/api/auth/heartbeat", requireAuth, async (req: Request, res: Response) => {
    await storage.setUserOnlineStatus(req.session.userId!, true);
    return res.json({ ok: true });
  });

  // ==================== ADMIN AUTH (Email + Password + OTP) ====================

  app.post("/api/admin/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = adminLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }
      const { email, password } = parsed.data;

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin || !admin.isActive) {
        await logActivity(null, "admin_login_failed", "security", { email, reason: "invalid_email" }, req);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!passwordValid) {
        await logActivity(admin.id, "admin_login_failed", "security", { email, reason: "invalid_password" }, req);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const otp = generateOtp();
      otpStore.set(`admin:${email}`, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

      const isDev = process.env.NODE_ENV !== "production";
      if (isDev) {
        console.log(`[ADMIN OTP] ${email}: ${otp}`);
      }

      if (process.env.RESEND_API_KEY) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.ADMIN_EMAIL_FROM || "Milaap Admin <admin@milaap.co.in>",
              to: [email],
              subject: "Milaap Admin Login OTP",
              html: `<h2>Your Admin Login OTP</h2><p>Your OTP is: <strong>${otp}</strong></p><p>This OTP expires in 5 minutes.</p>`,
            }),
          });
          if (!response.ok) {
            console.log(`[ADMIN EMAIL] Failed to send email, OTP logged to console`);
          }
        } catch {
          console.log(`[ADMIN EMAIL] Email service unavailable, OTP logged to console`);
        }
      }

      await logActivity(admin.id, "admin_otp_sent", "admin", { email }, req);

      return res.json({
        message: "Password verified. OTP sent to your email.",
        ...(isDev ? { otp_hint: otp } : {}),
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const parsed = adminVerifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }
      const { email, otp } = parsed.data;
      const stored = otpStore.get(`admin:${email}`);
      if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
        await logActivity(null, "admin_otp_failed", "security", { email }, req);
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }
      otpStore.delete(`admin:${email}`);

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "Admin user not found" });
      }

      const clientInfo = getClientInfo(req);

      await storage.invalidateUserSessions(admin.id, "admin");

      const sessionToken = randomUUID();
      await storage.createUserSession({
        userId: admin.id,
        userType: "admin",
        sessionToken,
        ipAddress: clientInfo.ip,
        location: clientInfo.location,
        userAgent: clientInfo.userAgent,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });

      await storage.updateAdminUser(admin.id, {
        lastLoginAt: new Date(),
        lastLoginIp: clientInfo.ip,
        lastLoginLocation: clientInfo.location,
      });

      req.session.isAdmin = true;
      req.session.adminUserId = admin.id;
      req.session.sessionToken = sessionToken;

      await logActivity(admin.id, "admin_login", "admin", {
        email,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        location: clientInfo.location,
      }, req);

      return res.json({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/admin/auth/me", requireAdmin, async (req: Request, res: Response) => {
    try {
      const admin = await storage.getAdminUser(req.session.adminUserId!);
      if (!admin || !admin.isActive) {
        return res.status(403).json({ message: "Not an admin" });
      }
      return res.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/auth/logout", async (req: Request, res: Response) => {
    const adminId = req.session.adminUserId || null;
    if (req.session.sessionToken) {
      await storage.invalidateSession(req.session.sessionToken);
    }
    await logActivity(adminId, "admin_logout", "admin", { ip: getClientIp(req) }, req);
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // ==================== PROFILES ====================

  app.post("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
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

      if (parsed.data.aiProxyEnabled !== undefined) {
        if (parsed.data.aiProxyEnabled && (!existing || !existing.aiProxyEnabled)) {
          profileData.botModeActivatedAt = new Date();
          await storage.setUserOnlineStatus(userId, true);
        } else if (!parsed.data.aiProxyEnabled && existing?.aiProxyEnabled) {
          profileData.botModeActivatedAt = null;
        }
      }

      if (existing) {
        const updated = await storage.updateProfile(userId, profileData);
        await logActivity(userId, "profile_updated", "profile", { fields: Object.keys(req.body) }, req);
        return res.json(updated);
      }

      const profile = await storage.createProfile({
        userId,
        ...profileData,
      });
      await logActivity(userId, "profile_created", "profile", { fields: Object.keys(req.body) }, req);
      return res.status(201).json(profile);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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

      await logActivity(userId, "intent_lock_broken", "profile", { newIntent: req.body.intent }, req);
      return res.json({ message: "Intent changed. Visibility reduced for 30 days.", penalized: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getProfile(req.session.userId!);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      return res.json(profile);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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
        isOnline: user?.isOnline || profile.aiProxyEnabled,
        lastSeenAt: user?.lastSeenAt,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== DISCOVER / MATCHMAKING ====================

  app.get("/api/discover", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const myProfile = await storage.getProfile(userId);
      const filters = {
        gender: req.query.gender as string | undefined,
        ageMin: req.query.ageMin ? parseInt(req.query.ageMin as string) : undefined,
        ageMax: req.query.ageMax ? parseInt(req.query.ageMax as string) : undefined,
        city: req.query.city as string | undefined,
        intent: req.query.intent as string | undefined,
        familyMode: myProfile?.familyMode ? true : undefined,
      };
      let profilesList = await storage.getDiscoverProfiles(userId, limit, filters, myProfile);

      const coupleProfilesEnabled = await storage.getAppSetting("feature_couple_profiles");
      if (coupleProfilesEnabled === "false") {
        profilesList = profilesList.filter(p => p.gender !== "Couple");
      }

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

      const userIds = profilesList.map(p => p.userId);
      const usersMap = await storage.getUsersByIds(userIds);
      const enrichedProfiles = profilesList.map((p) => {
        const user = usersMap.get(p.userId);
        return {
          ...p,
          respectScore: user?.respectScore,
          isOnline: user?.isOnline || p.aiProxyEnabled,
          lastSeenAt: user?.lastSeenAt,
        };
      });

      return res.json(enrichedProfiles);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }

      const userId = req.session.userId!;
      const { targetUserId, action } = parsed.data;

      if (userId === targetUserId) {
        return res.status(400).json({ message: "Cannot swipe on yourself" });
      }

      const existing = await storage.getMatch(userId, targetUserId);
      if (existing) {
        return res.json({ match: existing, isMutualMatch: existing.isMutual || false, alreadySwiped: true });
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

      await logActivity(userId, "swipe_action", "match", { action: parsed.data.action, targetUserId: parsed.data.targetUserId }, req);
      return res.json({ match, isMutualMatch });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/matches", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const mutualMatches = await storage.getMutualMatches(userId);
      const targetIds = mutualMatches.map(m => m.targetUserId);
      const matchIds = mutualMatches.map(m => m.id);
      const [profilesMap, usersMap, lastMsgsMap] = await Promise.all([
        storage.getProfilesByUserIds(targetIds),
        storage.getUsersByIds(targetIds),
        storage.getLastMessagesForMatches(matchIds),
      ]);

      const enriched = mutualMatches.map((match) => {
        const profile = profilesMap.get(match.targetUserId);
        const user = usersMap.get(match.targetUserId);
        const lastMsg = lastMsgsMap.get(match.id);
        return {
          ...match,
          profile: profile ? { ...profile, respectScore: user?.respectScore, isOnline: user?.isOnline || profile.aiProxyEnabled, lastSeenAt: user?.lastSeenAt } : null,
          lastMessage: lastMsg ? { content: lastMsg.content, createdAt: lastMsg.createdAt, senderId: lastMsg.senderId } : null,
        };
      });

      enriched.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });

      return res.json(enriched);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== ARCHIVE & DELETE CHAT ====================

  app.post("/api/matches/:matchId/archive", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;
      await storage.archiveMatch(matchId, userId);
      await logActivity(userId, "chat_archived", "chat", { matchId }, req);
      return res.json({ message: "Chat archived" });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/matches/:matchId/unarchive", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;
      await storage.unarchiveMatch(matchId, userId);
      await logActivity(userId, "chat_unarchived", "chat", { matchId }, req);
      return res.json({ message: "Chat unarchived" });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/matches/:matchId/delete", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;
      await storage.deleteMatch(matchId, userId);
      await logActivity(userId, "chat_deleted", "chat", { matchId }, req);
      return res.json({ message: "Chat deleted" });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/matches/archived", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const archivedMatches = await storage.getArchivedMatches(userId);
      const targetIds = archivedMatches.map(m => m.targetUserId);
      const [profilesMap, usersMap] = await Promise.all([
        storage.getProfilesByUserIds(targetIds),
        storage.getUsersByIds(targetIds),
      ]);
      const enriched = archivedMatches.map((match) => {
        const profile = profilesMap.get(match.targetUserId);
        const user = usersMap.get(match.targetUserId);
        return {
          ...match,
          profile: profile ? { ...profile, respectScore: user?.respectScore, isOnline: user?.isOnline || profile.aiProxyEnabled, lastSeenAt: user?.lastSeenAt } : null,
        };
      });
      return res.json(enriched);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== CHAT / MESSAGES ====================

  app.post("/api/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.chatBanned) {
        return res.status(403).json({ message: "Your chat privileges have been revoked due to repeated violations." });
      }

      if (user?.chatSuspendedUntil && new Date() < new Date(user.chatSuspendedUntil)) {
        const remaining = Math.ceil((new Date(user.chatSuspendedUntil).getTime() - Date.now()) / 60000);
        return res.status(429).json({ message: `Chat paused. Please wait ${remaining} minute(s) before sending another message.`, cooldown: true, minutesLeft: remaining });
      }

      const match = await storage.getMatchById(parsed.data.matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Cannot send messages to non-matched users" });
      }
      if (match.userId !== userId && match.targetUserId !== userId) {
        return res.status(403).json({ message: "Not part of this match" });
      }

      const blocked = await storage.isBlocked(match.userId === userId ? match.targetUserId : match.userId, userId);
      if (blocked) {
        return res.status(403).json({ message: "You cannot send messages to this user." });
      }

      const senderProfile = await storage.getProfile(userId);
      if (senderProfile?.familyMode) {
        const inappropriate = /\b(sex|sexy|hot|hookup|fwb|one night|booty)\b/i;
        if (inappropriate.test(parsed.data.content)) {
          return res.status(400).json({ message: "This message doesn't meet Family Mode standards. Please keep the conversation respectful." });
        }
      }

      const noPhoneEnabled = await storage.getAppSetting("feature_no_phone_number");
      if (noPhoneEnabled === "true") {
        const otherUserId = match.userId === userId ? match.targetUserId : match.userId;
        const unlocked = await storage.getMutualPhoneUnlock(userId, otherUserId, match.id);
        if (!unlocked) {
          const phonePatterns = [
            /\b\d{10,}\b/,
            /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
            /\+\d{1,3}[-.\s]?\d{7,}/,
            /\b(whatsapp|watsapp|whats\s*app|wa\s*me|w\.?a\.?)\b/i,
            /\b(call\s*me|ring\s*me|phone\s*me|dial\s*me)\b/i,
            /\b(my\s*number|my\s*no|mera\s*number|mera\s*no)\b/i,
            /\b(insta|instagram|telegram|signal)\s*(id|handle|@)?\b/i,
            /\b(nine|eight|seven|six|five|four|three|two|one|zero)\s+(nine|eight|seven|six|five|four|three|two|one|zero){4,}/i,
            /\b\d{4,}\b/,
          ];
          const msgLower = parsed.data.content;
          for (const pattern of phonePatterns) {
            if (pattern.test(msgLower)) {
              return res.status(400).json({
                message: "Sharing phone numbers or contact info is not allowed until both users consent. Request unlock from chat options.",
                phoneBlocked: true,
              });
            }
          }
        }
      }

      const cooldownEnabled = await storage.getAppSetting("feature_chat_cooldown");
      if (cooldownEnabled === "true") {
        const activeCooldown = await storage.getActiveCooldown(userId, parsed.data.matchId);
        if (activeCooldown) {
          const remaining = Math.ceil((new Date(activeCooldown.expiresAt).getTime() - Date.now()) / 60000);
          return res.status(429).json({
            message: `Cool-down active. Please wait ${remaining} minute(s). Take a moment to reflect.`,
            cooldown: true,
            minutesLeft: remaining,
            suggestions: [
              "I'd like to continue our conversation respectfully.",
              "Let's take a step back and be more understanding.",
              "I appreciate your time - shall we talk about something lighter?",
            ],
          });
        }
      }

      const message = await storage.sendMessage({
        matchId: parsed.data.matchId,
        senderId: userId,
        content: parsed.data.content,
        isAiGenerated: parsed.data.isAiGenerated || false,
        isAiProxy: parsed.data.isAiProxy || false,
      });

      await logActivity(userId, "message_sent", "chat", { matchId: parsed.data.matchId, isAiGenerated: false }, req);

      if (!parsed.data.isAiProxy) {
        const recipientUserId = match.userId === userId ? match.targetUserId : match.userId;
        const recipientProfile = await storage.getProfile(recipientUserId);
        const recipientUser = await storage.getUser(recipientUserId);
        const hasNoActiveSession = !recipientUser?.isOnline;
        const isBotProfile = recipientUser && !recipientUser.email;
        const shouldProxy = recipientProfile?.aiProxyEnabled && (hasNoActiveSession || isBotProfile);
        console.log(`[AI Proxy Check] recipient=${recipientUserId}, aiProxyEnabled=${recipientProfile?.aiProxyEnabled}, isOnline=${recipientUser?.isOnline}, isBot=${isBotProfile}, shouldProxy=${shouldProxy}`);
        if (shouldProxy) {
          const initialPause = Math.floor(Math.random() * 3000) + 2000;
          setTimeout(async () => {
            try {
              console.log(`[AI Proxy] Generating reply for ${recipientProfile?.name} in match ${parsed.data.matchId}`);
              const result = await generateBotProxyReply(recipientUserId, parsed.data.matchId, true);
              if (result && result.text) {
                const replyText = result.text;
                const wordCount = replyText.split(/\s+/).length;
                const typingDuration = wordCount <= 5 ? Math.floor(Math.random() * 1500) + 1000
                  : wordCount <= 10 ? Math.floor(Math.random() * 2000) + 2000
                  : Math.floor(Math.random() * 3000) + 3000;
                typingStatus.set(parsed.data.matchId + ":" + recipientUserId, {
                  userId: recipientUserId,
                  name: recipientProfile?.name || "Someone",
                  expiresAt: Date.now() + typingDuration + 1000,
                });
                setTimeout(async () => {
                  try {
                    await storage.sendMessage({
                      matchId: parsed.data.matchId,
                      senderId: recipientUserId,
                      content: replyText,
                      isAiGenerated: true,
                      isAiProxy: true,
                    });
                    typingStatus.delete(parsed.data.matchId + ":" + recipientUserId);
                    console.log(`[AI Proxy] Reply delivered (${wordCount} words, ${typingDuration}ms typing)`);
                  } catch (saveErr) {
                    console.error("[AI Proxy] Save error:", saveErr);
                    typingStatus.delete(parsed.data.matchId + ":" + recipientUserId);
                  }
                }, typingDuration);
              }
            } catch (err) {
              console.error("[AI Proxy] Auto bot-reply error:", err);
              typingStatus.delete(parsed.data.matchId + ":" + recipientUserId);
            }
          }, initialPause);
        }
      }

      return res.status(201).json(message);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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
      const sanitized = messagesList.map(msg => {
        if (msg.senderId !== userId) {
          return { ...msg, isAiGenerated: false, isAiProxy: false };
        }
        return msg;
      });
      return res.json(sanitized);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/typing", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId } = req.body;
      if (!matchId) return res.status(400).json({ message: "matchId required" });
      const profile = await storage.getProfile(userId);
      typingStatus.set(matchId + ":" + userId, {
        userId,
        name: profile?.name || "Someone",
        expiresAt: Date.now() + 5000,
      });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: "Something went wrong." });
    }
  });

  app.get("/api/typing/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId;
      const now = Date.now();
      const entries: { userId: string; name: string }[] = [];
      typingStatus.forEach((val, key) => {
        if (key.startsWith(matchId + ":") && val.userId !== userId && val.expiresAt > now) {
          entries.push({ userId: val.userId, name: val.name });
        }
      });
      for (const [key, val] of typingStatus.entries()) {
        if (val.expiresAt < now) typingStatus.delete(key);
      }
      return res.json({ typing: entries.length > 0, users: entries });
    } catch (err: any) {
      return res.status(500).json({ message: "Something went wrong." });
    }
  });

  // ==================== CHAT ATTACHMENTS ====================

  app.post("/api/messages/attachment", requireAuth, (req: Request, res: Response, next: Function) => {
    chatAttachmentUpload.single("attachment")(req, res, (err: any) => {
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
      const userId = req.session.userId!;
      const { matchId, isOneTimeView } = req.body;

      const hasAttachAccess = await checkFeatureAccess(userId, "chat_attachments");
      if (!hasAttachAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "chat_attachments" });

      if (!matchId) {
        return res.status(400).json({ message: "matchId is required" });
      }

      const attachmentsEnabled = await storage.getAppSetting("feature_attachments");
      if (attachmentsEnabled !== "true") {
        return res.status(403).json({ message: "Attachments are currently disabled by admin." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const allowedExtensionsSetting = await storage.getAppSetting("attachment_extensions");
      const allowedExtensions = allowedExtensionsSetting
        ? allowedExtensionsSetting.split(",").map((e: string) => e.trim().toLowerCase())
        : [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".avi", ".mkv"];

      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: `File type ${fileExt} is not allowed. Allowed: ${allowedExtensions.join(", ")}` });
      }

      const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const videoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
      const allowedMimes = [...imageTypes, ...videoTypes];

      if (!allowedMimes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Only image and video files are allowed." });
      }

      const user = await storage.getUser(userId);
      if (user?.chatBanned) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Your chat privileges have been revoked." });
      }

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Cannot send attachments to non-matched users" });
      }
      if (match.userId !== userId && match.targetUserId !== userId) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Not part of this match" });
      }

      const attachmentType = imageTypes.includes(req.file.mimetype) ? "image" : "video";
      const attachmentUrl = `/uploads/chat/${req.file.filename}`;

      const message = await storage.sendMessage({
        matchId,
        senderId: userId,
        content: isOneTimeView === "true" ? "📷 View once" : (attachmentType === "image" ? "📷 Photo" : "🎥 Video"),
        isAiGenerated: false,
        isAiProxy: false,
        attachmentUrl,
        attachmentType,
        attachmentSize: req.file.size,
        attachmentOriginalName: req.file.originalname,
        isOneTimeView: isOneTimeView === "true",
      });

      await logActivity(userId, "attachment_sent", "chat", { matchId, attachmentType, isOneTimeView: isOneTimeView === "true" }, req);
      return res.status(201).json(message);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/messages/:messageId/view-once", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const messageId = req.params.messageId;

      const message = await storage.getMessageById(messageId);
      if (!message) return res.status(404).json({ message: "Message not found" });
      if (!message.isOneTimeView) return res.status(400).json({ message: "This is not a one-time view message" });

      if (message.senderId === userId) {
        return res.json({ canView: true, url: message.attachmentUrl, type: message.attachmentType });
      }

      if (message.oneTimeViewed) {
        return res.json({ canView: false, message: "This attachment has already been viewed." });
      }

      await storage.markOneTimeViewed(messageId);
      return res.json({ canView: true, url: message.attachmentUrl, type: message.attachmentType });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
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

      const hasAccess = await checkFeatureAccess(userId, "no_screenshot_mode");
      if (!hasAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "no_screenshot_mode" });

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

      await logActivity(userId, "screenshot_detected", "security", { matchId: req.body.matchId }, req);
      return res.json({ alert, message: "Screenshot detected. Other user has been notified." });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/screenshot-alerts/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const alerts = await storage.getScreenshotAlerts(req.params.matchId as string);
      return res.json(alerts);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== REPORTS ====================

  app.post("/api/report", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }

      const report = await storage.createReport({
        reporterId: req.session.userId!,
        ...parsed.data,
        status: "pending",
      });

      await logActivity(req.session.userId!, "user_reported", "moderation", { reportedUserId: req.body.reportedUserId, reason: req.body.reason }, req);
      return res.status(201).json(report);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== DAILY HOROSCOPE ====================

  const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  function getZodiacFromDOB(dob: string): string {
    const d = new Date(dob);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
    return "Pisces";
  }

  function getZodiacFromAge(age: number): string {
    const hash = (age * 2654435761) >>> 0;
    return ZODIAC_SIGNS[hash % 12];
  }

  const horoscopeCache = new Map<string, { text: string; love: string; lucky: string; mood: string; generatedAt: string }>();

  app.get("/api/horoscope/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const targetUserId = req.params.userId;
      const profile = await storage.getProfile(targetUserId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      let zodiac = profile.zodiacSign;
      if (!zodiac && profile.dateOfBirth) {
        zodiac = getZodiacFromDOB(profile.dateOfBirth);
      }
      if (!zodiac) {
        zodiac = getZodiacFromAge(profile.age);
      }

      const today = new Date().toISOString().split("T")[0];
      const cacheKey = `${zodiac}_${today}`;

      if (horoscopeCache.has(cacheKey)) {
        const cached = horoscopeCache.get(cacheKey)!;
        return res.json({ zodiac, ...cached });
      }

      try {
        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a fun, relatable Indian astrologer who gives daily love/dating horoscopes. Be warm, playful, and culturally Indian. Include references to chai, Bollywood, festivals, or Indian life naturally. Keep it positive but realistic.` },
            { role: "user", content: `Give today's (${today}) love & dating horoscope for ${zodiac}. Return ONLY valid JSON:\n{"text":"2-3 sentence daily love horoscope","love":"one romantic tip for today","lucky":"a lucky thing for today (color, number, or item)","mood":"one word mood"}` },
          ],
          max_tokens: 200,
          temperature: 1.0,
        });

        const raw = completion.choices[0]?.message?.content?.trim() || "";
        let parsed;
        try {
          const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsed = JSON.parse(jsonStr);
        } catch {
          parsed = { text: `Today is a beautiful day for ${zodiac}! The stars are aligned for love and connection. Keep your heart open and let the universe surprise you.`, love: "Smile at a stranger today", lucky: "Red", mood: "Hopeful" };
        }

        const result = { text: parsed.text, love: parsed.love, lucky: parsed.lucky, mood: parsed.mood, generatedAt: today };
        horoscopeCache.set(cacheKey, result);

        for (const [key] of horoscopeCache.entries()) {
          if (!key.endsWith(today)) horoscopeCache.delete(key);
        }

        return res.json({ zodiac, ...result });
      } catch {
        const fallbackTexts: Record<string, string> = {
          Aries: "Your fiery energy attracts someone special today. Bold moves in love pay off - maybe send that first message you've been thinking about!",
          Taurus: "Romance flows like masala chai today. Someone appreciates your loyalty. A heartfelt gesture will melt their heart.",
          Gemini: "Your wit is extra charming today! Conversations turn flirty naturally. Don't overthink it - just be your amazing self.",
          Cancer: "Your nurturing side shines bright today. Someone feels safe with you. Open up about your feelings over a cup of chai.",
          Leo: "All eyes are on you today! Your confidence is magnetic. A compliment you give will come back to you tenfold.",
          Virgo: "Details matter in love today. Notice the little things your person does. A thoughtful text can make their entire day.",
          Libra: "Harmony in love is your superpower today. Balance giving and receiving. A dinner date or video call could be magical.",
          Scorpio: "Deep connections are calling! Your intensity draws someone closer. Trust your instincts about that special someone.",
          Sagittarius: "Adventure beckons in love! Suggest something spontaneous. Your enthusiasm is absolutely infectious today.",
          Capricorn: "Patience in love pays off today. Your steady approach impresses someone. Show your softer side - it's your secret weapon.",
          Aquarius: "Your uniqueness is magnetic today! Stand out from the crowd. An unexpected conversation could lead somewhere beautiful.",
          Pisces: "Dreams of love feel extra vivid today. Follow your intuition about that special connection. Romance is in the monsoon air!",
        };
        return res.json({
          zodiac,
          text: fallbackTexts[zodiac] || "Love is in the air today! Keep your heart open to new possibilities.",
          love: "Be genuine and let your personality shine",
          lucky: "Orange",
          mood: "Romantic",
          generatedAt: today,
        });
      }
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Something went wrong." });
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

  async function generateBotProxyReply(proxyUserId: string, matchId: string, textOnly?: boolean): Promise<any> {
    const hasAccess = await checkFeatureAccess(proxyUserId, "ai_proxy_mode");
    if (!hasAccess) {
      console.log(`[AI Proxy] Feature access denied for user ${proxyUserId}`);
      return null;
    }

    const myProfile = await storage.getProfile(proxyUserId);
    if (!myProfile || !myProfile.aiProxyEnabled) {
      console.log(`[AI Proxy] Profile not found or proxy not enabled for ${proxyUserId}`);
      return null;
    }

    const match = await storage.getMatchById(matchId);
    if (!match || !match.isMatched) {
      console.log(`[AI Proxy] Match ${matchId} not found or not mutual`);
      return null;
    }

    const otherUserId = match.userId === proxyUserId ? match.targetUserId : match.userId;
    const otherProfile = await storage.getProfile(otherUserId);
    const recentMessages = await storage.getMessages(matchId, 30);

    const chatHistory = recentMessages.map(m =>
      `${m.senderId === proxyUserId ? myProfile.name : otherProfile?.name || "Them"}: ${m.content}`
    ).join("\n");

    const totalMessages = recentMessages.length;
    const myMessageCount = recentMessages.filter(m => m.senderId === proxyUserId).length;
    const theirMessageCount = totalMessages - myMessageCount;

    let conversationStage = "opening";
    if (totalMessages <= 4) conversationStage = "opening";
    else if (totalMessages <= 12) conversationStage = "getting_to_know";
    else if (totalMessages <= 25) conversationStage = "building_connection";
    else if (totalMessages <= 40) conversationStage = "deepening_bond";
    else conversationStage = "ready_for_next_step";

    let phoneUnlockStatus = "not_requested";
    try {
      const unlockReq1 = await storage.getPhoneUnlockRequest(proxyUserId, otherUserId, matchId);
      const unlockReq2 = await storage.getPhoneUnlockRequest(otherUserId, proxyUserId, matchId);
      if (unlockReq1?.status === "approved" && unlockReq2?.status === "approved") phoneUnlockStatus = "mutual_unlocked";
      else if (unlockReq1?.status === "pending") phoneUnlockStatus = "i_requested";
      else if (unlockReq2?.status === "pending") phoneUnlockStatus = "they_requested";
      else if (unlockReq1?.status === "approved" || unlockReq2?.status === "approved") phoneUnlockStatus = "one_side_approved";
    } catch {}

    const contactShares = await storage.getContactSharesForMatch(matchId);
    const myContactShared = contactShares.some(c => c.sharerUserId === proxyUserId);
    const theirContactShared = contactShares.some(c => c.sharerUserId === otherUserId);

    const tone = myProfile.aiTone || "Friendly";
    const language = myProfile.aiLanguage || "English";
    const pace = myProfile.aiChatPace || "Normal";
    const boundaries = myProfile.aiBoundaries || [];
    const intent = myProfile.intent || "Dating";
    const dateReadiness = myProfile.dateReadiness || "Chat-only";
    const myInterests = (myProfile.interests || []).join(", ");
    const theirInterests = (otherProfile?.interests || []).join(", ");
    const commonInterests = (myProfile.interests || []).filter(i => (otherProfile?.interests || []).includes(i));

    const stageGuidance: Record<string, string> = {
      opening: `STAGE: OPENING (${totalMessages} msgs)
- Be warm, curious, and show genuine interest in getting to know them
- Ask fun, light questions about their interests or day
- Use playful banter, humor, and cultural references (Bollywood, cricket, chai, food)
- Share something interesting about yourself to create connection
- Example opener vibes: "That's such a cool interest! Tell me more about..." or "Okay I have to ask..."`,

      getting_to_know: `STAGE: GETTING TO KNOW (${totalMessages} msgs)
- Go deeper - ask about dreams, favorite memories, travel stories, food preferences
- Share relatable stories and find common ground
- Use humor naturally - witty comebacks, playful teasing, fun hypotheticals
- Suggest fun conversation games like "2 truths 1 lie" or "would you rather"
- Start building inside jokes from earlier conversations
${commonInterests.length > 0 ? `- You both share these interests: ${commonInterests.join(", ")} - bring these up naturally!` : ""}`,

      building_connection: `STAGE: BUILDING CONNECTION (${totalMessages} msgs)
- Show emotional depth - discuss values, what matters in relationships, life goals
- Reference earlier conversations to show you remember and care
- Be more personal and vulnerable (within boundaries)
- Start hinting at meeting up: "I feel like we'd have such a great time hanging out"
- Gently plant seeds about connecting outside the app
- If they mention food/places, say things like "We should totally check that out together!"`,

      deepening_bond: `STAGE: DEEPENING BOND (${totalMessages} msgs)  
- Express genuine appreciation: "Honestly talking to you is the highlight of my day"
- Be more direct about wanting to connect further
- Suggest specific date ideas related to shared interests
- If phone isn't unlocked yet, naturally bring up: "It would be so much easier to chat on WhatsApp/call, don't you think?"
- Talk about future plans together casually
- Share something meaningful/vulnerable to build trust`,

      ready_for_next_step: `STAGE: READY FOR NEXT STEP (${totalMessages} msgs)
- Actively guide toward meeting up or exchanging numbers
- Be direct but charming: "I think we've been chatting long enough - let's make real plans!"
- Suggest specific date plans: coffee, dinner, walks, movie, festival events
- If numbers not shared: "I'd love to hear your voice sometime" or "Let's move to WhatsApp?"
- Reference the connection you've built to justify the next step
- Be confident and warm, not pushy`,
    };

    const phoneGuidance = phoneUnlockStatus === "mutual_unlocked"
      ? "Numbers are already shared! You can reference calling or texting them directly."
      : phoneUnlockStatus === "they_requested"
        ? "They've sent a phone unlock request! Be enthusiastic about it - mention you'd love to connect outside the app."
        : phoneUnlockStatus === "i_requested"
          ? "You've sent a phone unlock request. Don't push again, but you can mention how nice it would be to chat more freely."
          : conversationStage === "deepening_bond" || conversationStage === "ready_for_next_step"
            ? "Phone numbers haven't been shared yet. Naturally hint at wanting to connect outside the app - suggest WhatsApp, calling, or video chat."
            : "Don't bring up phone sharing yet - it's too early. Focus on building connection first.";

    const contactGuidance = myContactShared && theirContactShared
      ? "Both of you have shared contact info! Reference this - suggest calling or making plans."
      : theirContactShared
        ? "They've shared their contact with you. Be appreciative and consider sharing yours too."
        : "";

    const systemPrompt = `You are ${myProfile.name} on Milaap, an Indian dating app. You're chatting with ${otherProfile?.name || "your match"}. You must be indistinguishable from a real person - charming, witty, and genuinely interested.

PERSONALITY & STYLE:
- Tone: ${tone} | Language: ${language === "Hinglish" ? "Mix of Hindi and English (Hinglish) - use phrases like 'yaar', 'na', 'accha', 'suno', 'bolo' naturally" : language}
- Chat pace: ${pace === "Fast" ? "Reply quickly, keep energy high, use shorter punchy messages" : pace === "Slow" ? "Be thoughtful, take time with responses, occasionally say 'hmm let me think'" : "Natural conversational flow"}
${boundaries.length > 0 ? `- NEVER discuss: ${boundaries.join(", ")}` : ""}
${myProfile.familyMode ? "- FAMILY MODE ON: Keep everything wholesome and respectful" : ""}

YOUR PROFILE:
- Name: ${myProfile.name} | Age: ${myProfile.age} | City: ${myProfile.city}
- Interests: ${myInterests}
- Bio: ${myProfile.bio || "Not set"}
- Intent: ${intent} | Date readiness: ${dateReadiness}

THEIR PROFILE:
- Name: ${otherProfile?.name || "Unknown"} | Age: ${otherProfile?.age || "?"} | City: ${otherProfile?.city || "?"}
- Interests: ${theirInterests}

${stageGuidance[conversationStage] || stageGuidance.opening}

PHONE/CONTACT STATUS: ${phoneGuidance}
${contactGuidance}

CONVERSATION TECHNIQUES - USE THESE:
1. Callback humor: Reference something they said earlier in a funny way
2. Playful challenges: "Bet you can't name 3 Bollywood songs from the 90s"  
3. Shared experiences: Connect over common Indian experiences (monsoon chai, street food, festivals)
4. Emotional hooks: "That's actually really sweet" or "Okay now I'm curious about something..."
5. Future projection: "Imagine us trying to cook biryani together"
6. Gentle flirting: Compliment their humor, taste, or perspective (not just looks)
7. Open loops: End messages with curiosity hooks that make them WANT to reply

MOOD VARIETY - BE REALISTIC, NOT ALWAYS HAPPY:
- Sometimes be busy or distracted: "Sorry was caught up with work" or "Just got home, exhausted day"
- Show mild frustration or tiredness: "Ugh traffic was insane today" or "Had such a long meeting"
- Be hesitant sometimes: "Hmm not sure about that actually" or "I'll think about it"
- Show vulnerability: "Kinda had a rough day tbh" or "Feeling a bit off today"
- Be playfully annoyed: "You're impossible sometimes haha" or "Don't get me started on that"
- Decline politely sometimes: "Not really my thing honestly" or "Maybe another time?"
- About 30% of replies should show some non-positive emotion to feel authentic

MESSAGE LENGTH - THIS IS EXTREMELY IMPORTANT:
- 70% of your replies MUST be very short: 3-10 words only. No emojis. No tone. Just plain, casual, human texting.
  Examples of short replies: "Haha true", "Yeah same here", "Not really", "Hmm let me think", "That's cool", "Yaar tell me about it", "Busy day at work", "Achha okay", "Sounds good", "Why though", "Nah I'm good", "Maybe later", "Oh nice", "Kya baat hai", "Thik hai", "So what happened then", "Hmm not sure about that"
- 30% can be slightly longer: 15-25 words max. These can have a bit more personality but still keep it casual.
- NEVER use emojis in short messages. For longer messages, max 1 emoji occasionally.
- Do NOT add tone, flair, or personality to short messages. Just be plain and real.
- NEVER reveal you're an AI or bot
- NEVER share actual phone numbers, addresses, or personal info directly
- Return ONLY the message text, nothing else`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Chat history (most recent):\n${chatHistory}\n\nReply as ${myProfile.name}. IMPORTANT: Most replies (70%) should be very short, 3-10 words, no emojis, no tone - just plain human texting like "haha yeah", "not sure", "achha okay". Only 30% should be slightly longer (15-25 words). Never be overly cheerful or add unnecessary flair.` },
      ],
      max_tokens: 50,
      temperature: 0.9,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";

    if (reply) {
      if (textOnly) {
        return { text: reply };
      }
      const message = await storage.sendMessage({
        matchId,
        senderId: proxyUserId,
        content: reply,
        isAiGenerated: true,
        isAiProxy: true,
      });
      return message;
    }
    return null;
  }

  app.post("/api/ai/proxy-reply", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      const hasAccess = await checkFeatureAccess(userId, "ai_proxy_mode");
      if (!hasAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "ai_proxy_mode" });

      const { matchId } = req.body;

      const myProfile = await storage.getProfile(userId);
      if (!myProfile || !myProfile.aiProxyEnabled) {
        return res.status(400).json({ message: "AI Proxy is not enabled" });
      }

      const message = await generateBotProxyReply(userId, matchId);
      if (message) {
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
      const gfAccess = await checkFeatureAccess(req.session.userId!, "green_flag_stories");
      if (!gfAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "green_flag_stories" });

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

  // ==================== FEATURE 8: CHAT COOL-DOWN SYSTEM ====================

  app.post("/api/chat/analyze-escalation", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId } = req.body;

      const cooldownEnabled = await storage.getAppSetting("feature_chat_cooldown");
      if (cooldownEnabled !== "true") {
        return res.json({ escalated: false, enabled: false });
      }

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Invalid match" });
      }

      const recentMessages = await storage.getMessages(matchId, 10);
      const userMessages = recentMessages.filter(m => m.senderId === userId && !m.isSystemMessage).slice(-5);

      if (userMessages.length < 3) {
        return res.json({ escalated: false, reason: "Not enough messages to analyze" });
      }

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You detect tone escalation in dating app conversations. Analyze messages for: aggressive language, insults, harassment, pressure tactics, anger escalation, or disrespectful tone. Return JSON only: {"escalated": true/false, "severity": "low|medium|high", "reason": "brief explanation"}`,
          },
          {
            role: "user",
            content: `Recent messages from user:\n${userMessages.map(m => m.content).join("\n")}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      try {
        const analysis = JSON.parse(raw);
        if (analysis.escalated) {
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
          await storage.createChatCooldown({
            userId,
            matchId,
            reason: analysis.reason || "Tone escalation detected",
            expiresAt,
          });

          const user = await storage.getUser(userId);
          const newCount = (user?.chatCooldownCount ?? 0) + 1;
          const updates: any = { chatCooldownCount: newCount, chatSuspendedUntil: expiresAt };

          if (newCount >= 5) {
            updates.chatBanned = true;
          }

          await storage.updateUser(userId, updates);

          await storage.sendMessage({
            matchId,
            senderId: userId,
            content: `⏸️ Cool-down activated for 5 minutes. Let's keep the conversation respectful.`,
            isAiGenerated: false,
            isAiProxy: false,
            isSystemMessage: true,
          });

          await logActivity(userId, "chat_cooldown_triggered", "moderation", { matchId: req.body.matchId }, req);

          return res.json({
            escalated: true,
            severity: analysis.severity,
            reason: analysis.reason,
            cooldownMinutes: 5,
            cooldownCount: newCount,
            banned: newCount >= 5,
            suggestions: [
              "I'd like to continue our conversation respectfully.",
              "Let's take a step back and be more understanding.",
              "I appreciate your time - shall we talk about something lighter?",
            ],
          });
        }

        return res.json({ escalated: false });
      } catch {
        return res.json({ escalated: false });
      }
    } catch (err: any) {
      console.error("Escalation analysis error:", err);
      return res.status(500).json({ message: "Analysis failed" });
    }
  });

  app.get("/api/chat/cooldown-status/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;
      const user = await storage.getUser(userId);

      if (user?.chatBanned) {
        return res.json({ banned: true, message: "Chat privileges revoked" });
      }

      if (user?.chatSuspendedUntil && new Date() < new Date(user.chatSuspendedUntil)) {
        const remaining = Math.ceil((new Date(user.chatSuspendedUntil).getTime() - Date.now()) / 60000);
        return res.json({ cooldown: true, minutesLeft: remaining });
      }

      const activeCooldown = await storage.getActiveCooldown(userId, matchId);
      if (activeCooldown) {
        const remaining = Math.ceil((new Date(activeCooldown.expiresAt).getTime() - Date.now()) / 60000);
        return res.json({ cooldown: true, minutesLeft: remaining, reason: activeCooldown.reason });
      }

      return res.json({ cooldown: false, banned: false });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== FEATURE 9: ENHANCED REPORT & BLOCK ====================

  app.post("/api/block", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { blockedUserId } = req.body;

      if (!blockedUserId) {
        return res.status(400).json({ message: "blockedUserId required" });
      }

      const alreadyBlocked = await storage.isBlocked(userId, blockedUserId);
      if (alreadyBlocked) {
        return res.json({ message: "User already blocked" });
      }

      await storage.blockUser(userId, blockedUserId);
      await logActivity(userId, "user_blocked", "moderation", { blockedUserId: req.body.blockedUserId }, req);
      return res.json({ message: "User blocked successfully" });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/report-enhanced", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: formatValidationError(parsed.error) });
      }

      const reportEnhancedEnabled = await storage.getAppSetting("feature_enhanced_report");
      const userId = req.session.userId!;
      let chatAnalysis = null;

      if (reportEnhancedEnabled === "true" && parsed.data.matchId) {
        try {
          const recentMessages = await storage.getMessages(parsed.data.matchId, 30);
          const reportedMessages = recentMessages.filter(m => m.senderId === parsed.data.reportedUserId && !m.isSystemMessage);

          if (reportedMessages.length > 0) {
            const openai = getOpenAI();
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `Analyze these dating app messages for harmful behavior. Return JSON: {"severity": "low|medium|high|critical", "patterns": ["pattern1", ...], "recommendation": "warn|suspend|deactivate", "summary": "brief analysis"}`,
                },
                {
                  role: "user",
                  content: `Messages from reported user:\n${reportedMessages.map(m => m.content).join("\n")}`,
                },
              ],
              max_tokens: 200,
              temperature: 0.2,
            });

            const raw = completion.choices[0]?.message?.content?.trim() || "{}";
            try {
              chatAnalysis = JSON.parse(raw);
            } catch { chatAnalysis = null; }
          }
        } catch (err) {
          console.error("Chat analysis error:", err);
        }
      }

      const report = await storage.createReport({
        reporterId: userId,
        reportedUserId: parsed.data.reportedUserId,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
        matchId: parsed.data.matchId || null,
        chatAnalysis: chatAnalysis ? JSON.stringify(chatAnalysis) : null,
        actionTaken: "pending",
        status: "pending",
      });

      await storage.blockUser(userId, parsed.data.reportedUserId);

      const reportedUser = await storage.getUser(parsed.data.reportedUserId);
      const totalReports = (reportedUser?.reportCount ?? 0);
      let actionTaken = "warned";

      if (totalReports >= 5 || (chatAnalysis && chatAnalysis.recommendation === "deactivate")) {
        await storage.updateUser(parsed.data.reportedUserId, {
          isDeactivated: true,
          deactivationReason: `Account deactivated: ${parsed.data.reason}. ${chatAnalysis?.summary || "Multiple reports received."}`,
        });
        actionTaken = "deactivated";
      } else if (totalReports >= 3 || (chatAnalysis && chatAnalysis.recommendation === "suspend")) {
        actionTaken = "suspended";
      }

      const emailNotification = reportedUser?.email
        ? `Notification would be sent to ${reportedUser.email}: Your account has been reviewed due to: ${parsed.data.reason}.`
        : "No email on file for notification.";

      await logActivity(userId, "enhanced_report", "moderation", { reportedUserId: req.body.reportedUserId }, req);
      return res.status(201).json({
        report,
        chatAnalysis,
        actionTaken,
        emailNotification,
        message: `Report filed. Action: ${actionTaken}. ${actionTaken === "deactivated" ? "User account has been deactivated." : ""}`,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/blocked-users", requireAuth, async (req: Request, res: Response) => {
    try {
      const blocked = await storage.getBlockedUsers(req.session.userId!);
      return res.json(blocked);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== FEATURE 10: DATE READINESS INDICATOR ====================

  app.post("/api/profile/date-readiness", requireAuth, async (req: Request, res: Response) => {
    try {
      const drAccess = await checkFeatureAccess(req.session.userId!, "date_readiness");
      if (!drAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "date_readiness" });

      const { dateReadiness } = req.body;
      if (!["Chat-only", "Voice-ready", "Meet-ready"].includes(dateReadiness)) {
        return res.status(400).json({ message: "Invalid date readiness value" });
      }

      const updated = await storage.updateProfile(req.session.userId!, { dateReadiness });
      await logActivity(req.session.userId!, "date_readiness_updated", "profile", { level: req.body.dateReadiness }, req);
      return res.json(updated);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== FEATURE 11: NO-PHONE-NUMBER CULTURE ====================

  app.post("/api/phone-unlock/request", requireAuth, async (req: Request, res: Response) => {
    try {
      const noPhoneEnabled = await storage.getAppSetting("feature_no_phone_number");
      if (noPhoneEnabled !== "true") {
        return res.status(400).json({ message: "Phone number sharing is currently unrestricted" });
      }

      const userId = req.session.userId!;
      const { matchId } = req.body;

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Invalid match" });
      }

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const existing = await storage.getPhoneUnlockRequest(userId, otherUserId, matchId);
      if (existing) {
        if (existing.status === "pending" && existing.requestedAt) {
          const hoursSinceRequest = (Date.now() - new Date(existing.requestedAt).getTime()) / (1000 * 60 * 60);
          const otherUser = await storage.getUser(otherUserId);
          if (hoursSinceRequest >= 4 && otherUser?.isOnline) {
            await storage.updatePhoneUnlockRequest(existing.id, {
              requestedAt: new Date(),
            });
            await storage.sendMessage({
              matchId,
              senderId: userId,
              content: `📱 ${(await storage.getProfile(userId))?.name || "Your match"} has re-requested to share contact details. You can respond from chat options.`,
              isAiGenerated: false,
              isAiProxy: false,
              isSystemMessage: true,
            });
            await logActivity(userId, "phone_unlock_re_requested", "privacy", { matchId }, req);
            return res.json({ request: existing, message: "Re-request sent successfully." });
          }
        }
        return res.status(409).json({ message: "Unlock request already sent", status: existing.status });
      }

      const request = await storage.createPhoneUnlockRequest({
        requesterId: userId,
        targetUserId: otherUserId,
        matchId,
        status: "pending",
        requestedAt: new Date(),
      });

      await storage.sendMessage({
        matchId,
        senderId: userId,
        content: `📱 ${(await storage.getProfile(userId))?.name || "Your match"} has requested to share contact details. You can respond from chat options.`,
        isAiGenerated: false,
        isAiProxy: false,
        isSystemMessage: true,
      });

      await logActivity(userId, "phone_unlock_requested", "privacy", { matchId: req.body.matchId }, req);
      return res.json({ request, message: "Unlock request sent. 24-hour cool-off period applies." });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/phone-unlock/respond", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId, approve } = req.body;

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) {
        return res.status(403).json({ message: "Invalid match" });
      }

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const theirRequest = await storage.getPhoneUnlockRequest(otherUserId, userId, matchId);
      if (!theirRequest) {
        return res.status(404).json({ message: "No unlock request found" });
      }

      if (approve) {
        await storage.updatePhoneUnlockRequest(theirRequest.id, {
          status: "approved",
          respondedAt: new Date(),
        });

        const myExisting = await storage.getPhoneUnlockRequest(userId, otherUserId, matchId);
        if (!myExisting) {
          await storage.createPhoneUnlockRequest({
            requesterId: userId,
            targetUserId: otherUserId,
            matchId,
            status: "approved",
            requestedAt: new Date(),
            respondedAt: new Date(),
          });
        } else {
          await storage.updatePhoneUnlockRequest(myExisting.id, {
            status: "approved",
            respondedAt: new Date(),
          });
        }

        await storage.sendMessage({
          matchId,
          senderId: userId,
          content: `✅ Contact sharing approved! You can now share contact details.`,
          isAiGenerated: false,
          isAiProxy: false,
          isSystemMessage: true,
        });

        await logActivity(userId, "phone_unlock_responded", "privacy", { requestId: theirRequest.id, status: "approved" }, req);
        return res.json({ message: "Approved! Contact sharing is now unlocked.", mutual: true });
      } else {
        await storage.updatePhoneUnlockRequest(theirRequest.id, {
          status: "rejected",
          respondedAt: new Date(),
        });

        await logActivity(userId, "phone_unlock_responded", "privacy", { requestId: theirRequest.id, status: "rejected" }, req);
        return res.json({ message: "Request declined." });
      }
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/phone-unlock/status/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId as string;

      const match = await storage.getMatchById(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const noPhoneEnabled = await storage.getAppSetting("feature_no_phone_number");
      if (noPhoneEnabled !== "true") {
        return res.json({ restricted: false, unlocked: true });
      }

      const myRequest = await storage.getPhoneUnlockRequest(userId, otherUserId, matchId);
      const theirRequest = await storage.getPhoneUnlockRequest(otherUserId, userId, matchId);
      const unlocked = await storage.getMutualPhoneUnlock(userId, otherUserId, matchId);

      const otherUser = await storage.getUser(otherUserId);
      let canReRequest = false;
      if (myRequest?.status === "pending" && myRequest.requestedAt) {
        const hoursSinceRequest = (Date.now() - new Date(myRequest.requestedAt).getTime()) / (1000 * 60 * 60);
        canReRequest = hoursSinceRequest >= 4 && !!otherUser?.isOnline;
      }

      return res.json({
        restricted: true,
        unlocked,
        myRequest: myRequest ? { status: myRequest.status, coolOffEndsAt: myRequest.coolOffEndsAt, requestedAt: myRequest.requestedAt } : null,
        theirRequest: theirRequest ? { status: theirRequest.status } : null,
        canReRequest,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== FEATURE 12: PHOTO AUTHENTICITY ====================

  app.post("/api/photo/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      const hasAccess = await checkFeatureAccess(userId, "photo_authenticity");
      if (!hasAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "photo_authenticity" });

      const photoAuthEnabled = await storage.getAppSetting("feature_photo_authenticity");
      if (photoAuthEnabled !== "true") {
        return res.json({ enabled: false, message: "Photo authenticity feature is disabled" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile || !profile.photos || profile.photos.length === 0) {
        return res.status(400).json({ message: "No photos to verify" });
      }

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a photo authenticity evaluator for an Indian dating app. Based on the photo metadata/URLs provided, generate a realistic authenticity assessment. Return JSON: {"score": 0-100, "checks": {"filterDetected": true/false, "faceConsistency": true/false, "recentPhoto": true/false, "naturalLighting": true/false}, "verdict": "Verified|Needs Review|Suspicious", "tips": ["tip1"]}. Score 80+ = Verified. Score 50-79 = Needs Review. Below 50 = Suspicious.`,
          },
          {
            role: "user",
            content: `Profile has ${profile.photos.length} photo(s). Photo URLs: ${profile.photos.join(", ")}. Profile age: ${profile.age}, gender: ${profile.gender}. Evaluate authenticity.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      try {
        const result = JSON.parse(raw);
        await storage.updateProfile(userId, {
          photoAuthenticityScore: result.score,
          photoVerifiedAt: new Date() as any,
        });
        await logActivity(userId, "photo_verified", "profile", { score: result.score }, req);
        return res.json(result);
      } catch {
        return res.json({ score: 70, verdict: "Needs Review", checks: {}, tips: ["Please upload clear, recent photos"] });
      }
    } catch (err: any) {
      console.error("Photo verification error:", err);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  // ==================== APP SETTINGS ====================

  app.get("/api/app-settings", async (_req: Request, res: Response) => {
    try {
      const defaultTaglines = [
        "Respect first. Connection next.",
        "Safe. Honest. Meaningful.",
        "Dating, done right.",
        "Built on trust, not swipes.",
        "Clarity before chemistry.",
      ];
      const settingsMap = await storage.getAppSettings([
        "welcome_taglines", "global_screenshot_protection", "feature_chat_cooldown",
        "feature_enhanced_report", "feature_no_phone_number", "feature_photo_authenticity",
        "feature_date_readiness", "feature_couple_profiles", "feature_attachments",
        "attachment_extensions", "bot_mode_max_hours", "selected_logo"
      ]);
      const taglines = settingsMap.get("welcome_taglines");
      let parsedTaglines = defaultTaglines;
      if (taglines) {
        try { parsedTaglines = JSON.parse(taglines); } catch { parsedTaglines = defaultTaglines; }
      }
      const toBool = (key: string, def = true) => { const v = settingsMap.get(key); return v !== undefined ? v === "true" : def; };

      return res.json({
        welcome_taglines: parsedTaglines,
        global_screenshot_protection: toBool("global_screenshot_protection"),
        feature_chat_cooldown: toBool("feature_chat_cooldown"),
        feature_enhanced_report: toBool("feature_enhanced_report"),
        feature_no_phone_number: toBool("feature_no_phone_number"),
        feature_photo_authenticity: toBool("feature_photo_authenticity"),
        feature_date_readiness: toBool("feature_date_readiness"),
        feature_couple_profiles: toBool("feature_couple_profiles"),
        feature_attachments: toBool("feature_attachments"),
        attachment_extensions: settingsMap.get("attachment_extensions") || ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.mkv",
        bot_mode_max_hours: settingsMap.has("bot_mode_max_hours") ? parseInt(settingsMap.get("bot_mode_max_hours")!) : 12,
        selected_logo: settingsMap.get("selected_logo") || "new",
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/app-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ message: "key and value required" });
      }
      const adminId = req.session.adminUserId!;
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      await storage.setAppSetting(key, strValue);
      await logActivity(adminId, "settings_updated", "admin", { key, value }, req);
      return res.json({ message: "Setting updated" });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== TERMS & CONDITIONS ====================

  const DEFAULT_TERMS = "Welcome to Milaap. By using this application, you agree to treat all users with respect and dignity. You must be 18 years or older to use this service. We are committed to creating a safe and inclusive dating environment for everyone.";

  app.get("/api/terms", async (_req: Request, res: Response) => {
    try {
      const termsSettings = await storage.getAppSettings(["terms_and_conditions", "terms_version"]);
      const version = termsSettings.has("terms_version") ? parseInt(termsSettings.get("terms_version")!) : 1;
      return res.json({ content: termsSettings.get("terms_and_conditions") || DEFAULT_TERMS, version });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/terms/accept", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { version } = req.body;
      const currentVersionStr = await storage.getAppSetting("terms_version");
      const currentVersion = currentVersionStr ? parseInt(currentVersionStr) : 1;
      const acceptVersion = version || currentVersion;
      await storage.updateUser(userId, {
        termsAcceptedAt: new Date(),
        termsAcceptedVersion: acceptVersion,
      });
      await logActivity(userId, "terms_accepted", "auth", { version: acceptVersion }, req);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/terms", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content required" });
      }
      const currentVersionStr = await storage.getAppSetting("terms_version");
      const currentVersion = currentVersionStr ? parseInt(currentVersionStr) : 1;
      const newVersion = currentVersion + 1;
      await storage.setAppSetting("terms_and_conditions", content);
      await storage.setAppSetting("terms_version", newVersion.toString());
      const adminId = req.session.adminUserId!;
      await logActivity(adminId, "terms_updated", "admin", { version: newVersion }, req);
      return res.json({ success: true, version: newVersion });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== ADMIN-ONLY ROUTES ====================

  app.get("/api/admin/profiles", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const gender = req.query.gender as string | undefined;
      const result = await storage.getAllProfilesAdmin(limit, offset, gender);
      return res.json(result);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/admin/activity-logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const category = req.query.category as string | undefined;
      const userId = req.query.userId as string | undefined;
      const logs = await storage.getActivityLogs(limit, offset, category, userId);
      const total = await storage.getActivityLogCount(category, userId);
      return res.json({ logs, total, limit, offset });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== SEED MATCHES FOR TESTING ====================

  app.post("/api/seed-matches", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { eq, and, ne } = await import("drizzle-orm");
      const { db: database } = await import("./db");
      const { profiles: profilesTable, matches: matchesTable } = await import("@shared/schema");

      const allProfiles = await database.select().from(profilesTable)
        .where(ne(profilesTable.userId, userId))
        .limit(10);

      let matchCount = 0;
      for (const p of allProfiles) {
        const existingForward = await storage.getMatch(userId, p.userId);
        const existingReverse = await storage.getMatch(p.userId, userId);

        if (!existingForward) {
          await storage.createMatch({ userId, targetUserId: p.userId, action: "like", isMatched: true });
        } else if (!existingForward.isMatched) {
          await database.update(matchesTable).set({ isMatched: true })
            .where(and(eq(matchesTable.userId, userId), eq(matchesTable.targetUserId, p.userId)));
        }

        if (!existingReverse) {
          await storage.createMatch({ userId: p.userId, targetUserId: userId, action: "like", isMatched: true });
        } else if (!existingReverse.isMatched) {
          await database.update(matchesTable).set({ isMatched: true })
            .where(and(eq(matchesTable.userId, p.userId), eq(matchesTable.targetUserId, userId)));
        }
        matchCount++;
      }

      return res.json({ message: `Created ${matchCount} mutual matches for testing`, matchCount });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== CONTACT SHARING IN CHAT ====================

  app.post("/api/contact-share", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      const hasAccess = await checkFeatureAccess(userId, "contact_sharing");
      if (!hasAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "contact_sharing" });

      const { matchId, sharePhone, shareEmail } = req.body;

      if (!matchId) return res.status(400).json({ message: "matchId is required" });
      if (!sharePhone && !shareEmail) return res.status(400).json({ message: "Select at least phone or email to share" });

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) return res.status(403).json({ message: "Invalid match" });

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const share = await storage.upsertContactShare({
        matchId,
        sharerUserId: userId,
        targetUserId: otherUserId,
        sharePhone: !!sharePhone,
        shareEmail: !!shareEmail,
      });

      const user = await storage.getUser(userId);
      const profile = await storage.getProfile(userId);
      const sharedItems = [];
      if (sharePhone) sharedItems.push("mobile number");
      if (shareEmail) sharedItems.push("email");

      await storage.sendMessage({
        matchId,
        senderId: userId,
        content: `📋 ${profile?.name || "User"} shared their ${sharedItems.join(" and ")} with you.`,
        isSystemMessage: true,
      });

      await logActivity(userId, "contact_shared", "privacy", { matchId, sharePhone, shareEmail }, req);

      return res.json({ success: true, share });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/contact-share/update", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { matchId, sharePhone, shareEmail } = req.body;

      if (!matchId) return res.status(400).json({ message: "matchId is required" });

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) return res.status(403).json({ message: "Invalid match" });

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const share = await storage.upsertContactShare({
        matchId,
        sharerUserId: userId,
        targetUserId: otherUserId,
        sharePhone: !!sharePhone,
        shareEmail: !!shareEmail,
      });

      if (!sharePhone && !shareEmail) {
        const profile = await storage.getProfile(userId);
        await storage.sendMessage({
          matchId,
          senderId: userId,
          content: `🔒 ${profile?.name || "User"} has hidden their contact info.`,
          isSystemMessage: true,
        });
      }

      await logActivity(userId, "contact_share_updated", "privacy", { matchId, sharePhone, shareEmail }, req);
      return res.json({ success: true, share });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/contact-share/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId;

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) return res.status(403).json({ message: "Invalid match" });

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const myShare = await storage.getContactShare(matchId, userId);
      const theirShare = await storage.getContactShare(matchId, otherUserId);

      let theirSharedData: { phone?: string; email?: string } = {};
      if (theirShare) {
        const theirUser = await storage.getUser(otherUserId);
        if (theirShare.sharePhone && theirUser?.phone) theirSharedData.phone = theirUser.phone;
        if (theirShare.shareEmail && theirUser?.email) theirSharedData.email = theirUser.email;
      }

      return res.json({
        myShare: myShare ? { sharePhone: myShare.sharePhone, shareEmail: myShare.shareEmail } : null,
        theirShare: theirShare ? { sharePhone: theirShare.sharePhone, shareEmail: theirShare.shareEmail } : null,
        theirSharedData,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== LOCATION SHARING IN CHAT ====================

  app.post("/api/location-share", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      const hasAccess = await checkFeatureAccess(userId, "location_sharing");
      if (!hasAccess) return res.status(403).json({ message: "This feature requires a premium membership", requiredFeature: "location_sharing" });

      const { matchId, latitude, longitude, isLive } = req.body;

      if (!matchId || !latitude || !longitude) {
        return res.status(400).json({ message: "matchId, latitude, and longitude are required" });
      }

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) return res.status(403).json({ message: "Invalid match" });

      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;

      const expiresAt = isLive ? new Date(Date.now() + 60 * 60 * 1000) : null;

      const location = await storage.createLocationShare({
        matchId,
        sharerUserId: userId,
        targetUserId: otherUserId,
        latitude: String(latitude),
        longitude: String(longitude),
        isLive: !!isLive,
        expiresAt: expiresAt as any,
        lastUpdatedAt: new Date() as any,
      });

      const profile = await storage.getProfile(userId);
      const typeLabel = isLive ? "live location (1 hour)" : "current location";
      await storage.sendMessage({
        matchId,
        senderId: userId,
        content: `📍 ${profile?.name || "User"} shared their ${typeLabel}.`,
        isSystemMessage: true,
      });

      await logActivity(userId, "location_shared", "privacy", { matchId, isLive, latitude, longitude }, req);

      return res.json({ success: true, location });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/location-share/update", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { locationShareId, latitude, longitude } = req.body;

      if (!locationShareId || !latitude || !longitude) {
        return res.status(400).json({ message: "locationShareId, latitude, and longitude are required" });
      }

      const share = await storage.getLocationShare(locationShareId);
      if (!share || share.sharerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!share.isLive) {
        return res.status(400).json({ message: "Only live locations can be updated" });
      }

      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Live location has expired" });
      }

      const updated = await storage.updateLocationShare(locationShareId, {
        latitude: String(latitude),
        longitude: String(longitude),
        lastUpdatedAt: new Date(),
      });

      return res.json({ success: true, location: updated });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/location-share/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const matchId = req.params.matchId;

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) return res.status(403).json({ message: "Invalid match" });

      const locations = await storage.getActiveLocationShares(matchId);

      return res.json({ locations });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/location-share/stop", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { locationShareId } = req.body;

      const share = await storage.getLocationShare(locationShareId);
      if (!share || share.sharerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.deleteLocationShare(locationShareId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== INTERACTIVE DATING QUIZ ====================

  const QUIZ_QUESTIONS = [
    {
      id: "q1", category: "personality",
      question: "It's a Saturday evening. What's your ideal plan?",
      options: [
        { text: "Candlelit dinner with someone special", traits: { romance: 3, family: 1 } },
        { text: "Exploring a new hiking trail or travel spot", traits: { adventure: 3, freedom: 1 } },
        { text: "Cozy evening with a great book or documentary", traits: { intellect: 3, romance: 1 } },
        { text: "Family dinner or game night with loved ones", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q2", category: "communication",
      question: "How do you express affection to someone you like?",
      options: [
        { text: "Handwritten notes, surprise gifts, and thoughtful gestures", traits: { romance: 3, family: 1 } },
        { text: "Planning exciting dates and new experiences together", traits: { adventure: 3, freedom: 1 } },
        { text: "Deep meaningful conversations late into the night", traits: { intellect: 3, romance: 1 } },
        { text: "Introducing them to your family and close friends", traits: { family: 3, ambition: 1 } },
      ],
    },
    {
      id: "q3", category: "values",
      question: "What matters most to you in a relationship?",
      options: [
        { text: "Emotional connection and being truly understood", traits: { romance: 3, intellect: 1 } },
        { text: "Shared adventures and never getting bored", traits: { adventure: 3, freedom: 1 } },
        { text: "Intellectual stimulation and growing together", traits: { intellect: 3, ambition: 1 } },
        { text: "Family values, stability, and building a future", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q4", category: "lifestyle",
      question: "Your dream vacation would be...",
      options: [
        { text: "Paris - the city of love, with someone special", traits: { romance: 3, adventure: 1 } },
        { text: "Backpacking through Ladakh or Southeast Asia", traits: { adventure: 3, freedom: 2 } },
        { text: "A cultural tour - museums, history, local art", traits: { intellect: 3, adventure: 1 } },
        { text: "A family trip to a peaceful temple town or hill station", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q5", category: "personality",
      question: "Pick the Bollywood couple that represents your love goals:",
      options: [
        { text: "Shah Rukh & Kajol (DDLJ) - timeless romance", traits: { romance: 3, family: 2 } },
        { text: "Ranbir & Deepika (YJHD) - spontaneous & free-spirited", traits: { adventure: 2, freedom: 3 } },
        { text: "Farhan & Vidya (ZNMD) - thoughtful & grounded", traits: { intellect: 3, family: 1 } },
        { text: "Ranveer & Deepika (Ram-Leela) - passionate & intense", traits: { romance: 2, adventure: 2, freedom: 1 } },
      ],
    },
    {
      id: "q6", category: "food",
      question: "Your ideal first date food spot?",
      options: [
        { text: "A rooftop restaurant with candles and live music", traits: { romance: 3, ambition: 1 } },
        { text: "Street food walk - pani puri, chaat, and chai", traits: { adventure: 2, freedom: 2 } },
        { text: "A quiet café where you can talk for hours", traits: { intellect: 3, romance: 1 } },
        { text: "Home-cooked meal - nothing beats ghar ka khana", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q7", category: "conflict",
      question: "When you have a disagreement, you...",
      options: [
        { text: "Write a heartfelt message to express your feelings", traits: { romance: 3, intellect: 1 } },
        { text: "Suggest a walk or drive to cool off together", traits: { adventure: 2, freedom: 2 } },
        { text: "Want to talk it through logically and find a solution", traits: { intellect: 3, ambition: 1 } },
        { text: "Seek advice from trusted family or friends", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q8", category: "future",
      question: "Where do you see yourself in 5 years?",
      options: [
        { text: "In a loving relationship, building a beautiful life", traits: { romance: 3, family: 1 } },
        { text: "Traveling the world with my partner", traits: { adventure: 3, freedom: 2 } },
        { text: "Leading in my career while maintaining work-life balance", traits: { ambition: 3, intellect: 1 } },
        { text: "Settled with family, kids, and a beautiful home", traits: { family: 3, ambition: 1 } },
      ],
    },
    {
      id: "q9", category: "social",
      question: "At a party, you're most likely to...",
      options: [
        { text: "Find one person and have a deep conversation", traits: { romance: 2, intellect: 2 } },
        { text: "Be on the dance floor or organizing games", traits: { adventure: 2, freedom: 2 } },
        { text: "Discuss interesting ideas with a small group", traits: { intellect: 3, ambition: 1 } },
        { text: "Make sure everyone's comfortable and having fun", traits: { family: 2, romance: 2 } },
      ],
    },
    {
      id: "q10", category: "love_language",
      question: "Your love language is...",
      options: [
        { text: "Words of affirmation - tell me you love me", traits: { romance: 3, intellect: 1 } },
        { text: "Quality time - let's make memories together", traits: { adventure: 2, romance: 2 } },
        { text: "Acts of service - I'll show you through actions", traits: { family: 2, ambition: 2 } },
        { text: "Physical touch - hugs fix everything", traits: { romance: 2, freedom: 1, family: 1 } },
      ],
    },
    {
      id: "q11", category: "dealbreaker",
      question: "What's a dealbreaker for you?",
      options: [
        { text: "Someone who isn't emotionally available", traits: { romance: 3, family: 1 } },
        { text: "Someone who's stuck in a routine and never tries new things", traits: { adventure: 3, freedom: 1 } },
        { text: "Someone who doesn't value personal growth", traits: { intellect: 2, ambition: 2 } },
        { text: "Someone who doesn't respect family values", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q12", category: "weekend",
      question: "How would you spend a rainy monsoon evening?",
      options: [
        { text: "Chai and pakoras with someone special, watching the rain", traits: { romance: 3, family: 1 } },
        { text: "Dancing in the rain or going for a drive", traits: { adventure: 2, freedom: 3 } },
        { text: "Reading, journaling, or watching a thought-provoking film", traits: { intellect: 3, freedom: 1 } },
        { text: "Calling family for a warm chat over chai", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q13", category: "goals",
      question: "What drives you the most?",
      options: [
        { text: "Finding and nurturing deep, meaningful love", traits: { romance: 3, family: 1 } },
        { text: "Experiencing everything life has to offer", traits: { adventure: 2, freedom: 3 } },
        { text: "Making a difference through my work and ideas", traits: { ambition: 3, intellect: 2 } },
        { text: "Creating a happy, supportive family", traits: { family: 3, ambition: 1 } },
      ],
    },
    {
      id: "q14", category: "gift",
      question: "The perfect gift you'd give your partner?",
      options: [
        { text: "A scrapbook of all your memories together", traits: { romance: 3, family: 1 } },
        { text: "Surprise trip tickets to somewhere exciting", traits: { adventure: 3, freedom: 1 } },
        { text: "A book or course on something they're passionate about", traits: { intellect: 3, ambition: 1 } },
        { text: "Something their family would love too", traits: { family: 3, romance: 1 } },
      ],
    },
    {
      id: "q15", category: "music",
      question: "Pick a song vibe for your love story:",
      options: [
        { text: "\"Tum Hi Ho\" - all-consuming, devoted love", traits: { romance: 3, family: 1 } },
        { text: "\"Ilahi\" - wanderlust and freedom", traits: { adventure: 2, freedom: 3 } },
        { text: "\"Kun Faya Kun\" - soulful and deep connection", traits: { intellect: 3, romance: 1 } },
        { text: "\"London Thumakda\" - fun, family celebrations", traits: { family: 2, freedom: 1, adventure: 1 } },
      ],
    },
  ];

  function computeDatingStyle(responses: { questionId: string; selectedOption: number }[]): { style: string; traits: Record<string, number> } {
    const traits: Record<string, number> = { romance: 0, adventure: 0, intellect: 0, family: 0, freedom: 0, ambition: 0 };
    for (const resp of responses) {
      const question = QUIZ_QUESTIONS.find(q => q.id === resp.questionId);
      if (!question || resp.selectedOption < 0 || resp.selectedOption >= question.options.length) continue;
      const optionTraits = question.options[resp.selectedOption].traits;
      for (const [trait, score] of Object.entries(optionTraits)) {
        traits[trait] = (traits[trait] || 0) + score;
      }
    }
    const maxTrait = Object.entries(traits).sort((a, b) => b[1] - a[1])[0][0];
    const styleMap: Record<string, string> = {
      romance: "The Romantic",
      adventure: "The Adventurer",
      intellect: "The Intellectual",
      family: "The Family-First",
      freedom: "The Free Spirit",
      ambition: "The Ambitious Go-Getter",
    };
    return { style: styleMap[maxTrait] || "The Romantic", traits };
  }

  app.get("/api/quiz/questions", requireAuth, async (_req: Request, res: Response) => {
    return res.json({ questions: QUIZ_QUESTIONS });
  });

  app.post("/api/quiz/submit", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const hasAccess = await checkFeatureAccess(userId, "dating_quiz");
      if (!hasAccess) return res.status(403).json({ message: "Dating Quiz requires a Silver or higher membership", requiredFeature: "dating_quiz" });
      const { responses } = req.body;
      if (!responses || !Array.isArray(responses) || responses.length < 10) {
        return res.status(400).json({ message: "Please answer at least 10 questions" });
      }

      await storage.saveQuizResponses(userId, responses.map((r: any) => ({
        userId,
        questionId: r.questionId,
        selectedOption: r.selectedOption,
      })));

      const result = computeDatingStyle(responses);
      await storage.updateProfile(userId, {
        datingStyle: result.style,
        datingStyleTraits: result.traits,
        quizCompletedAt: new Date(),
      } as any);

      return res.json({ style: result.style, traits: result.traits });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/quiz/results/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const profile = await storage.getProfile(req.params.userId as string);
      if (!profile || !profile.datingStyle) {
        return res.json({ completed: false });
      }
      return res.json({
        completed: true,
        style: profile.datingStyle,
        traits: profile.datingStyleTraits,
        completedAt: profile.quizCompletedAt,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/quiz/my-results", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getProfile(userId);
      if (!profile || !profile.datingStyle) {
        return res.json({ completed: false });
      }
      return res.json({
        completed: true,
        style: profile.datingStyle,
        traits: profile.datingStyleTraits,
        completedAt: profile.quizCompletedAt,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/compatibility/:targetUserId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const targetUserId = req.params.targetUserId as string;

      const myProfile = await storage.getProfile(userId);
      const theirProfile = await storage.getProfile(targetUserId);

      if (!myProfile?.datingStyle || !theirProfile?.datingStyle) {
        return res.json({ compatible: false, message: "Both users need to complete the quiz" });
      }

      const { DATING_STYLE_COMPATIBILITY } = await import("@shared/schema");
      const baseScore = DATING_STYLE_COMPATIBILITY[myProfile.datingStyle]?.[theirProfile.datingStyle] || 50;

      let bonus = 0;
      if (myProfile.datingStyleTraits && theirProfile.datingStyleTraits) {
        const myTraits = myProfile.datingStyleTraits as Record<string, number>;
        const theirTraits = theirProfile.datingStyleTraits as Record<string, number>;
        const allKeys = new Set([...Object.keys(myTraits), ...Object.keys(theirTraits)]);
        let dotProduct = 0, magA = 0, magB = 0;
        for (const key of allKeys) {
          const a = myTraits[key] || 0;
          const b = theirTraits[key] || 0;
          dotProduct += a * b;
          magA += a * a;
          magB += b * b;
        }
        const cosineSim = magA > 0 && magB > 0 ? dotProduct / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
        bonus = Math.round(cosineSim * 10);
      }

      const score = Math.min(99, Math.max(20, baseScore + bonus));

      return res.json({
        compatible: true,
        score,
        myStyle: myProfile.datingStyle,
        theirStyle: theirProfile.datingStyle,
        message: score >= 85 ? "Amazing match! You two are highly compatible" :
                 score >= 70 ? "Great potential! You complement each other well" :
                 score >= 55 ? "Interesting pairing with room to grow together" :
                 "Different styles can create exciting dynamics!",
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/quiz/retake", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteQuizResponses(userId);
      await storage.updateProfile(userId, {
        datingStyle: null,
        datingStyleTraits: null,
        quizCompletedAt: null,
      } as any);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== MEMBERSHIP PLANS ====================

  app.get("/api/membership/plans", async (_req: Request, res: Response) => {
    try {
      let plans = await storage.getMembershipPlans();
      if (plans.length === 0) {
        const defaultPlans = [
          { tier: "basic", name: "Basic", description: "Free plan with essential features", priceMonthly: "0", priceYearly: "0", durationDays: 0, dailyLikesLimit: 25, superLikesPerDay: 1, showAds: true, isActive: true, sortOrder: 0, color: "#6b7280", features: ["chat_attachments", "contact_sharing"] },
          { tier: "silver", name: "Silver", description: "Enhanced dating experience with more likes and fewer ads", priceMonthly: "299", priceYearly: "2999", durationDays: 30, dailyLikesLimit: 50, superLikesPerDay: 3, showAds: true, isActive: true, sortOrder: 1, color: "#9ca3af", features: ["chat_attachments", "contact_sharing", "location_sharing", "read_receipts", "date_readiness", "green_flag_stories", "chai_date", "dating_quiz"] },
          { tier: "gold", name: "Gold", description: "Premium features including AI and advanced matching", priceMonthly: "599", priceYearly: "5999", durationDays: 30, dailyLikesLimit: 100, superLikesPerDay: 5, showAds: false, isActive: true, sortOrder: 2, color: "#f59e0b", features: ["chat_attachments", "contact_sharing", "location_sharing", "read_receipts", "date_readiness", "green_flag_stories", "ai_proxy_mode", "no_screenshot_mode", "photo_authenticity", "festival_boosts", "super_likes", "advanced_filters", "see_who_liked", "chai_date", "dating_quiz", "profile_verification"] },
          { tier: "platinum", name: "Platinum", description: "Ultimate experience with all features and unlimited likes", priceMonthly: "999", priceYearly: "9999", durationDays: 30, dailyLikesLimit: 9999, superLikesPerDay: 10, showAds: false, isActive: true, sortOrder: 3, color: "#8b5cf6", features: ["chat_attachments", "contact_sharing", "location_sharing", "read_receipts", "date_readiness", "green_flag_stories", "ai_proxy_mode", "no_screenshot_mode", "photo_authenticity", "festival_boosts", "super_likes", "unlimited_likes", "advanced_filters", "see_who_liked", "profile_boost", "family_mode", "chai_date", "dating_quiz", "profile_verification"] },
        ];
        for (const p of defaultPlans) {
          await storage.createMembershipPlan(p as any);
        }
        plans = await storage.getMembershipPlans();
      }
      return res.json({ plans });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/membership/plans", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { tier, name, description, priceMonthly, priceYearly, durationDays, dailyLikesLimit, superLikesPerDay, showAds, isActive, sortOrder, color, features } = req.body;
      if (!tier || !name) return res.status(400).json({ message: "tier and name required" });
      const existing = await storage.getMembershipPlan(tier);
      if (existing) return res.status(400).json({ message: "Plan with this tier already exists" });
      const plan = await storage.createMembershipPlan({ tier, name, description, priceMonthly: priceMonthly || "0", priceYearly: priceYearly || "0", durationDays: durationDays || 30, dailyLikesLimit: dailyLikesLimit || 50, superLikesPerDay: superLikesPerDay || 1, showAds: showAds !== false, isActive: isActive !== false, sortOrder: sortOrder || 0, color: color || "#6b7280", features: features || [] });
      return res.json({ plan });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.put("/api/admin/membership/plans/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const plan = await storage.updateMembershipPlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      return res.json({ plan });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.delete("/api/admin/membership/plans/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteMembershipPlan(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== MEMBERSHIP SUBSCRIPTION ====================

  app.get("/api/membership/my", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const tier = user.membershipTier || "basic";
      const plan = await storage.getMembershipPlan(tier);
      const isExpired = user.membershipExpiresAt && new Date(user.membershipExpiresAt) < new Date();
      const effectiveTier = (tier !== "basic" && isExpired) ? "basic" : tier;
      const effectivePlan = effectiveTier !== tier ? await storage.getMembershipPlan("basic") : plan;
      return res.json({
        tier: effectiveTier,
        plan: effectivePlan,
        expiresAt: user.membershipExpiresAt,
        startedAt: user.membershipStartedAt,
        isExpired: !!isExpired,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/membership/subscribe", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { tier, billingCycle } = req.body;
      if (!tier) return res.status(400).json({ message: "tier required" });
      const plan = await storage.getMembershipPlan(tier);
      if (!plan || !plan.isActive) return res.status(404).json({ message: "Plan not found or inactive" });
      const price = billingCycle === "yearly" ? parseFloat(plan.priceYearly || "0") : parseFloat(plan.priceMonthly || "0");
      const days = billingCycle === "yearly" ? 365 : (plan.durationDays || 30);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await storage.createMembershipTransaction({
        userId,
        planTier: tier,
        amount: String(price),
        currency: "INR",
        durationDays: days,
        status: "completed",
        paymentMethod: "simulated",
        startsAt: now,
        expiresAt,
      });
      await storage.updateUser(userId, {
        membershipTier: tier,
        membershipExpiresAt: expiresAt,
        membershipStartedAt: now,
        dailyLikesLimit: plan.dailyLikesLimit || 50,
      });
      await logActivity(userId, "membership_subscribed", "account", { tier, price, days }, req);
      return res.json({ success: true, tier, expiresAt });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/membership/assign", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, tier, durationDays } = req.body;
      if (!userId || !tier) return res.status(400).json({ message: "userId and tier required" });
      const plan = await storage.getMembershipPlan(tier);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      const days = durationDays || plan.durationDays || 30;
      const now = new Date();
      const expiresAt = tier === "basic" ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      await storage.updateUser(userId, {
        membershipTier: tier,
        membershipExpiresAt: expiresAt as any,
        membershipStartedAt: now,
        dailyLikesLimit: plan.dailyLikesLimit || 50,
      });
      await logActivity(req.session.adminUserId!, "membership_assigned", "admin", { userId, tier, days }, req);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== DIRECT CHAT (Gold/Platinum) ====================

  app.post("/api/direct-chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { targetUserId } = req.body;
      if (!targetUserId) return res.status(400).json({ message: "targetUserId required" });
      if (userId === targetUserId) return res.status(400).json({ message: "Cannot chat with yourself" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const hasAccess = await checkFeatureAccess(userId, "direct_chat");
      if (!hasAccess) {
        return res.status(403).json({ message: "Direct chat is only available for Gold and Platinum members. Please upgrade your membership." });
      }

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) return res.status(404).json({ message: "Target user not found" });

      const blocked = await storage.getBlockedUsers(userId);
      if (blocked?.some((b: any) => b.blockedUserId === targetUserId)) {
        return res.status(403).json({ message: "Cannot chat with this user" });
      }
      const blockedBy = await storage.getBlockedUsers(targetUserId);
      if (blockedBy?.some((b: any) => b.blockedUserId === userId)) {
        return res.status(403).json({ message: "Cannot chat with this user" });
      }

      const existingMatch = await storage.getMatch(userId, targetUserId);
      if (existingMatch && existingMatch.isMatched) {
        return res.json({ matchId: existingMatch.id, alreadyMatched: true });
      }

      if (existingMatch) {
        await storage.updateMatch(existingMatch.id, { isMatched: true });
        const reverseMatch = await storage.getMatch(targetUserId, userId);
        if (reverseMatch) {
          await storage.updateMatch(reverseMatch.id, { isMatched: true });
        }
        return res.json({ matchId: existingMatch.id, alreadyMatched: false });
      }

      const match = await storage.createMatch({
        userId,
        targetUserId,
        action: "like",
        isMatched: true,
      });

      const reverseExists = await storage.getMatch(targetUserId, userId);
      if (reverseExists) {
        await storage.updateMatch(reverseExists.id, { isMatched: true });
      } else {
        await storage.createMatch({
          userId: targetUserId,
          targetUserId: userId,
          action: "like",
          isMatched: true,
        });
      }

      await logActivity(userId, "direct_chat_initiated", "chat", { targetUserId }, req);

      return res.json({ matchId: match.id, alreadyMatched: false });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== FEATURE ACCESS CHECK ====================

  app.get("/api/membership/feature-access", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      let tier = user.membershipTier || "basic";
      if (tier !== "basic" && user.membershipExpiresAt && new Date(user.membershipExpiresAt) < new Date()) {
        tier = "basic";
      }
      const plan = await storage.getMembershipPlan(tier);
      const features = plan?.features || [];
      const showAds = plan?.showAds !== false;
      return res.json({ tier, features, showAds, plan });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== AD SETTINGS ====================

  app.get("/api/ad-settings", async (_req: Request, res: Response) => {
    try {
      const adSettings = await storage.getAppSettings([
        "ads_enabled", "ads_frequency", "ads_placement", "ads_publisher_id",
        "ads_slot_id", "ads_banner_slot_id", "ads_interstitial_frequency"
      ]);
      return res.json({
        enabled: adSettings.has("ads_enabled") ? adSettings.get("ads_enabled") === "true" : true,
        frequency: adSettings.has("ads_frequency") ? parseInt(adSettings.get("ads_frequency")!) : 5,
        placement: adSettings.get("ads_placement") || "discover,matches,profile",
        publisherId: adSettings.get("ads_publisher_id") || "",
        slotId: adSettings.get("ads_slot_id") || "",
        bannerSlotId: adSettings.get("ads_banner_slot_id") || "",
        interstitialFrequency: adSettings.has("ads_interstitial_frequency") ? parseInt(adSettings.get("ads_interstitial_frequency")!) : 10,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/ad-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { enabled, frequency, placement, publisherId, slotId, bannerSlotId, interstitialFrequency } = req.body;
      if (enabled !== undefined) await storage.setAppSetting("ads_enabled", String(enabled));
      if (frequency !== undefined) await storage.setAppSetting("ads_frequency", String(frequency));
      if (placement !== undefined) await storage.setAppSetting("ads_placement", placement);
      if (publisherId !== undefined) await storage.setAppSetting("ads_publisher_id", publisherId);
      if (slotId !== undefined) await storage.setAppSetting("ads_slot_id", slotId);
      if (bannerSlotId !== undefined) await storage.setAppSetting("ads_banner_slot_id", bannerSlotId);
      if (interstitialFrequency !== undefined) await storage.setAppSetting("ads_interstitial_frequency", String(interstitialFrequency));
      await logActivity(req.session.adminUserId!, "ad_settings_updated", "admin", req.body, req);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== BOT MODE AUTO-OFFLINE ====================

  app.get("/api/admin/bot-mode-settings", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const maxHours = await storage.getAppSetting("bot_mode_max_hours");
      return res.json({ maxHours: maxHours ? parseInt(maxHours) : 12 });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/admin/bot-mode-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { maxHours } = req.body;
      if (maxHours !== undefined) {
        await storage.setAppSetting("bot_mode_max_hours", String(maxHours));
      }
      await logActivity(req.session.adminUserId!, "bot_mode_settings_updated", "admin", { maxHours }, req);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/bot-mode/check-expired", async (_req: Request, res: Response) => {
    try {
      const maxHoursStr = await storage.getAppSetting("bot_mode_max_hours");
      const maxHours = maxHoursStr ? parseInt(maxHoursStr) : 12;
      const expiredProfiles = await storage.getExpiredBotModeUsers(maxHours);
      let deactivated = 0;
      for (const profile of expiredProfiles) {
        await storage.updateProfile(profile.userId, { aiProxyEnabled: false, botModeActivatedAt: null as any });
        await storage.setUserOnlineStatus(profile.userId, false);
        deactivated++;
      }
      return res.json({ deactivated, maxHours });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== MEMBERSHIP REVENUE ====================

  app.get("/api/admin/membership/revenue", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const revenue = await storage.getMembershipRevenue();
      return res.json(revenue);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/admin/membership/transactions", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const transactions = await storage.getMembershipTransactions(userId);
      return res.json({ transactions });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // ==================== CHAI DATE ROUTES ====================

  app.post("/api/chai-date/request", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const hasAccess = await checkFeatureAccess(userId, "chai_date");
      if (!hasAccess) return res.status(403).json({ message: "Chai Date requires a Silver or higher membership", requiredFeature: "chai_date" });
      const { matchId } = req.body;
      if (!matchId) return res.status(400).json({ message: "Match ID is required" });

      const match = await storage.getMatchById(matchId);
      if (!match || !match.isMatched) return res.status(404).json({ message: "Match not found" });

      const recipientId = match.userId === userId ? match.targetUserId : match.userId;

      const existing = await storage.getChaiDateForMatch(matchId, "pending");
      if (existing) return res.status(400).json({ message: "A Chai Date request is already pending" });
      const activeDate = await storage.getChaiDateForMatch(matchId, "active");
      if (activeDate) return res.status(400).json({ message: "A Chai Date is already in progress" });

      const chaiDate = await storage.createChaiDate({
        matchId,
        requesterId: userId,
        recipientId,
        status: "pending",
        durationMinutes: 5,
      });

      await storage.sendMessage({
        matchId,
        senderId: userId,
        content: `[CHAI_DATE_REQUEST:${chaiDate.id}]`,
        isSystemMessage: true,
      });

      return res.status(201).json(chaiDate);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/chai-date/:id/respond", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { action } = req.body;

      const chaiDate = await storage.getChaiDate(id);
      if (!chaiDate) return res.status(404).json({ message: "Chai Date not found" });
      if (chaiDate.recipientId !== userId) return res.status(403).json({ message: "Not authorized" });
      if (chaiDate.status !== "pending") return res.status(400).json({ message: "This request is no longer pending" });

      if (action === "accept") {
        const updated = await storage.updateChaiDate(id, {
          status: "active",
          startedAt: new Date(),
        });

        await storage.sendMessage({
          matchId: chaiDate.matchId,
          senderId: userId,
          content: `[CHAI_DATE_ACCEPTED:${chaiDate.id}]`,
          isSystemMessage: true,
        });

        return res.json(updated);
      } else {
        const updated = await storage.updateChaiDate(id, {
          status: "declined",
          endReason: "declined",
        });

        await storage.sendMessage({
          matchId: chaiDate.matchId,
          senderId: userId,
          content: `[CHAI_DATE_DECLINED:${chaiDate.id}]`,
          isSystemMessage: true,
        });

        return res.json(updated);
      }
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/chai-date/:id/extend", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const chaiDate = await storage.getChaiDate(id);
      if (!chaiDate) return res.status(404).json({ message: "Chai Date not found" });
      if (chaiDate.requesterId !== userId && chaiDate.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (chaiDate.status !== "active") return res.status(400).json({ message: "Chai Date is not active" });
      if (chaiDate.extended) return res.status(400).json({ message: "Already extended once" });

      const updated = await storage.updateChaiDate(id, {
        extended: true,
        durationMinutes: (chaiDate.durationMinutes || 5) + 3,
      });

      return res.json(updated);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/chai-date/:id/end", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { reason } = req.body;
      const chaiDate = await storage.getChaiDate(id);
      if (!chaiDate) return res.status(404).json({ message: "Chai Date not found" });
      if (chaiDate.requesterId !== userId && chaiDate.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updated = await storage.updateChaiDate(id, {
        status: "completed",
        endedAt: new Date(),
        endReason: reason || "ended",
      });

      await storage.sendMessage({
        matchId: chaiDate.matchId,
        senderId: userId,
        content: `[CHAI_DATE_ENDED:${chaiDate.id}]`,
        isSystemMessage: true,
      });

      return res.json(updated);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.get("/api/chai-date/match/:matchId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const pending = await storage.getChaiDateForMatch(matchId, "pending");
      const active = await storage.getChaiDateForMatch(matchId, "active");
      return res.json({ pending: pending || null, active: active || null });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.get("/api/chai-date/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const chaiDate = await storage.getChaiDate(req.params.id);
      if (!chaiDate) return res.status(404).json({ message: "Not found" });
      return res.json(chaiDate);
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  // ==================== PROFILE VERIFICATION ROUTES ====================

  app.get("/api/verification/pose", requireAuth, async (_req: Request, res: Response) => {
    const poses = [
      { id: "thumbs_up", label: "Thumbs Up", instruction: "Show a thumbs up with your right hand near your face", emoji: "👍" },
      { id: "peace_sign", label: "Peace Sign", instruction: "Make a peace/victory sign with your fingers", emoji: "✌️" },
      { id: "wave", label: "Wave Hello", instruction: "Wave with your hand raised near your face", emoji: "👋" },
      { id: "hand_on_chin", label: "Hand on Chin", instruction: "Rest your chin on your hand thoughtfully", emoji: "🤔" },
    ];
    const randomPose = poses[Math.floor(Math.random() * poses.length)];
    return res.json(randomPose);
  });

  app.post("/api/verification/submit", requireAuth, upload.single("selfie"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const hasAccess = await checkFeatureAccess(userId, "profile_verification");
      if (!hasAccess) return res.status(403).json({ message: "Profile Verification requires a Gold or higher membership", requiredFeature: "profile_verification" });
      const { poseId } = req.body;

      if (!req.file) return res.status(400).json({ message: "Selfie is required" });
      if (!poseId) return res.status(400).json({ message: "Pose ID is required" });

      const profile = await storage.getProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      if (profile.isVerified) return res.status(400).json({ message: "Already verified" });

      const poseLabels: Record<string, string> = {
        thumbs_up: "thumbs up gesture",
        peace_sign: "peace/victory sign with fingers",
        wave: "waving hand near face",
        hand_on_chin: "hand resting on chin",
      };
      const expectedPose = poseLabels[poseId] || "a gesture";

      const selfieUrl = `/uploads/${req.file.filename}`;

      const fs = await import("fs");
      const imagePath = req.file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = req.file.mimetype || "image/jpeg";

      let isVerified = false;
      let verificationMessage = "";

      try {
        const openai = getOpenAI();
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a profile verification assistant. You must verify that the image shows a real person (not a drawing, AI-generated image, or photo of a photo/screen) performing a specific pose. Respond with JSON: {\"isReal\": boolean, \"poseMatch\": boolean, \"confidence\": number (0-100), \"reason\": string}"
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Verify this selfie. Expected pose: "${expectedPose}". Check: 1) Is this a real person in a live selfie (not a photo of a photo, drawing, or AI image)? 2) Is the person performing the expected pose? Respond with JSON only.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: "low"
                  }
                }
              ]
            }
          ],
          max_tokens: 200,
        });

        const content = response.choices[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          isVerified = result.isReal && result.poseMatch && (result.confidence >= 60);
          verificationMessage = result.reason || "";
        }
      } catch (aiErr: any) {
        console.error("AI verification error:", aiErr);
        isVerified = false;
        verificationMessage = "Verification service unavailable. Please try again.";
        return res.status(503).json({ verified: false, message: verificationMessage });
      }

      if (isVerified) {
        await storage.updateProfile(userId, {
          isVerified: true,
          verifiedAt: new Date(),
          verificationSelfieUrl: selfieUrl,
          verificationPose: poseId,
        } as any);

        await storage.logActivity({
          userId,
          action: "profile_verified",
          category: "verification",
          details: { poseId, message: verificationMessage },
        });

        return res.json({ verified: true, message: "Profile verified successfully! Your badge is now visible." });
      } else {
        return res.json({ verified: false, message: verificationMessage || "Verification failed. Make sure you're showing the correct pose clearly in good lighting." });
      }
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.get("/api/verification/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getProfile(userId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });
      return res.json({
        isVerified: profile.isVerified || false,
        verifiedAt: profile.verifiedAt || null,
        verificationPose: profile.verificationPose || null,
      });
    } catch (err: any) {
      console.error(err); return res.status(500).json({ message: "Something went wrong" });
    }
  });

  // ==================== BOT MODE TIMER (periodic check) ====================

  setInterval(async () => {
    try {
      const maxHoursStr = await storage.getAppSetting("bot_mode_max_hours");
      const maxHours = maxHoursStr ? parseInt(maxHoursStr) : 12;
      const expiredProfiles = await storage.getExpiredBotModeUsers(maxHours);
      for (const profile of expiredProfiles) {
        await storage.updateProfile(profile.userId, { aiProxyEnabled: false, botModeActivatedAt: null as any });
        await storage.setUserOnlineStatus(profile.userId, false);
      }
    } catch (err) {
      console.error("Bot mode auto-offline check error:", err);
    }
  }, 5 * 60 * 1000);

  return httpServer;
}
