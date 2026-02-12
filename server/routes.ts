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
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.session.sessionToken) {
    const dbSession = await storage.getUserSession(req.session.sessionToken);
    if (!dbSession || !dbSession.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Session expired. Please login again." });
    }
    await storage.updateSessionActivity(req.session.sessionToken);
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.isAdmin || !req.session.adminUserId) {
    return res.status(403).json({ message: "Admin access required" });
  }
  if (req.session.sessionToken) {
    const dbSession = await storage.getUserSession(req.session.sessionToken);
    if (!dbSession || !dbSession.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Admin session expired. Please login again." });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
        return res.status(400).json({ message: parsed.error.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const parsed = adminVerifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/auth/logout", requireAdmin, async (req: Request, res: Response) => {
    const adminId = req.session.adminUserId;
    if (req.session.sessionToken) {
      await storage.invalidateSession(req.session.sessionToken);
    }
    await logActivity(adminId || null, "admin_logout", "admin", { ip: getClientIp(req) }, req);
    req.session.isAdmin = false;
    req.session.adminUserId = undefined as any;
    req.session.sessionToken = undefined as any;
    return res.json({ message: "Admin logged out" });
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

      await logActivity(userId, "intent_lock_broken", "profile", { newIntent: req.body.intent }, req);
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
        isOnline: user?.isOnline || profile.aiProxyEnabled,
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

      const enrichedProfiles = await Promise.all(profilesList.map(async (p) => {
        const user = await storage.getUser(p.userId);
        return {
          ...p,
          respectScore: user?.respectScore,
          isOnline: user?.isOnline || p.aiProxyEnabled,
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

      await logActivity(userId, "swipe_action", "match", { action: parsed.data.action, targetUserId: parsed.data.targetUserId }, req);
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
            profile: profile ? { ...profile, respectScore: user?.respectScore, isOnline: user?.isOnline || profile.aiProxyEnabled, lastSeenAt: user?.lastSeenAt } : null,
          };
        })
      );

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/matches/archived", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const archivedMatches = await storage.getArchivedMatches(userId);
      const enriched = await Promise.all(
        archivedMatches.map(async (match) => {
          const profile = await storage.getProfile(match.targetUserId);
          const user = await storage.getUser(match.targetUserId);
          return {
            ...match,
            profile: profile ? { ...profile, respectScore: user?.respectScore, isOnline: user?.isOnline || profile.aiProxyEnabled, lastSeenAt: user?.lastSeenAt } : null,
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
        if (recipientProfile?.aiProxyEnabled && !recipientUser?.isOnline) {
          const delay = Math.floor(Math.random() * 8000) + 3000;
          setTimeout(async () => {
            try {
              await generateBotProxyReply(recipientUserId, parsed.data.matchId);
            } catch (err) {
              console.error("Auto bot-reply error:", err);
            }
          }, delay);
        }
      }

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
      return res.status(500).json({ message: err.message });
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

      await logActivity(req.session.userId!, "user_reported", "moderation", { reportedUserId: req.body.reportedUserId, reason: req.body.reason }, req);
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

  async function generateBotProxyReply(proxyUserId: string, matchId: string): Promise<any> {
    const hasAccess = await checkFeatureAccess(proxyUserId, "ai_proxy_mode");
    if (!hasAccess) return null;

    const myProfile = await storage.getProfile(proxyUserId);
    if (!myProfile || !myProfile.aiProxyEnabled) return null;

    const match = await storage.getMatchById(matchId);
    if (!match || !match.isMatched) return null;

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
2. Playful challenges: "Bet you can't name 3 Bollywood songs from the 90s 😄"  
3. Shared experiences: Connect over common Indian experiences (monsoon chai, street food, festivals)
4. Emotional hooks: "That's actually really sweet" or "Okay now I'm curious about something..."
5. Future projection: "Imagine us trying to cook biryani together 😂"
6. Gentle flirting: Compliment their humor, taste, or perspective (not just looks)
7. Open loops: End messages with curiosity hooks that make them WANT to reply

CRITICAL RULES:
- Be INTERESTING - no boring "How was your day?" type questions
- Match their energy - if they're playful, be playful back; if deep, go deep
- Use emojis naturally but don't overdo it (1-2 per message max)
- Keep responses 30-120 words - varied lengths feel more natural
- NEVER reveal you're an AI or bot
- NEVER share actual phone numbers, addresses, or personal info directly
- Return ONLY the message text, nothing else`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Chat history (most recent):\n${chatHistory}\n\nReply as ${myProfile.name}. Be engaging, build connection, and keep the conversation flowing.` },
      ],
      max_tokens: 200,
      temperature: 0.85,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";

    if (reply) {
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/report-enhanced", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/blocked-users", requireAuth, async (req: Request, res: Response) => {
    try {
      const blocked = await storage.getBlockedUsers(req.session.userId!);
      return res.json(blocked);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
        return res.status(409).json({ message: "Unlock request already sent", status: existing.status });
      }

      const coolOffEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const request = await storage.createPhoneUnlockRequest({
        requesterId: userId,
        targetUserId: otherUserId,
        matchId,
        status: "pending",
        requestedAt: new Date(),
        coolOffEndsAt,
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
      return res.status(500).json({ message: err.message });
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
            coolOffEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
          content: `✅ Contact sharing approved! After the 24-hour cool-off period, you'll be able to share contact details.`,
          isAiGenerated: false,
          isAiProxy: false,
          isSystemMessage: true,
        });

        await logActivity(userId, "phone_unlock_responded", "privacy", { requestId: theirRequest.id, status: "approved" }, req);
        return res.json({ message: "Approved. Contact sharing will be unlocked after 24-hour cool-off.", mutual: true });
      } else {
        await storage.updatePhoneUnlockRequest(theirRequest.id, {
          status: "rejected",
          respondedAt: new Date(),
        });

        await logActivity(userId, "phone_unlock_responded", "privacy", { requestId: theirRequest.id, status: "rejected" }, req);
        return res.json({ message: "Request declined." });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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

      return res.json({
        restricted: true,
        unlocked,
        myRequest: myRequest ? { status: myRequest.status, coolOffEndsAt: myRequest.coolOffEndsAt } : null,
        theirRequest: theirRequest ? { status: theirRequest.status } : null,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      const taglines = await storage.getAppSetting("welcome_taglines");
      let parsedTaglines = defaultTaglines;
      if (taglines) {
        try { parsedTaglines = JSON.parse(taglines); } catch { parsedTaglines = defaultTaglines; }
      }
      const screenshotProtection = await storage.getAppSetting("global_screenshot_protection");
      const chatCooldown = await storage.getAppSetting("feature_chat_cooldown");
      const enhancedReport = await storage.getAppSetting("feature_enhanced_report");
      const noPhoneNumber = await storage.getAppSetting("feature_no_phone_number");
      const photoAuthenticity = await storage.getAppSetting("feature_photo_authenticity");
      const dateReadiness = await storage.getAppSetting("feature_date_readiness");
      const coupleProfiles = await storage.getAppSetting("feature_couple_profiles");
      const attachments = await storage.getAppSetting("feature_attachments");
      const attachmentExtensions = await storage.getAppSetting("attachment_extensions");
      const botModeMaxHours = await storage.getAppSetting("bot_mode_max_hours");

      return res.json({
        welcome_taglines: parsedTaglines,
        global_screenshot_protection: screenshotProtection !== null ? screenshotProtection === "true" : true,
        feature_chat_cooldown: chatCooldown !== null ? chatCooldown === "true" : true,
        feature_enhanced_report: enhancedReport !== null ? enhancedReport === "true" : true,
        feature_no_phone_number: noPhoneNumber !== null ? noPhoneNumber === "true" : true,
        feature_photo_authenticity: photoAuthenticity !== null ? photoAuthenticity === "true" : true,
        feature_date_readiness: dateReadiness !== null ? dateReadiness === "true" : true,
        feature_couple_profiles: coupleProfiles !== null ? coupleProfiles === "true" : true,
        feature_attachments: attachments !== null ? attachments === "true" : true,
        attachment_extensions: attachmentExtensions || ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.mkv",
        bot_mode_max_hours: botModeMaxHours ? parseInt(botModeMaxHours) : 12,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== TERMS & CONDITIONS ====================

  const DEFAULT_TERMS = "Welcome to Milaap. By using this application, you agree to treat all users with respect and dignity. You must be 18 years or older to use this service. We are committed to creating a safe and inclusive dating environment for everyone.";

  app.get("/api/terms", async (_req: Request, res: Response) => {
    try {
      const content = await storage.getAppSetting("terms_and_conditions");
      const versionStr = await storage.getAppSetting("terms_version");
      const version = versionStr ? parseInt(versionStr) : 1;
      return res.json({ content: content || DEFAULT_TERMS, version });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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

      await logActivity(userId, "contact_share_updated", "privacy", { matchId, sharePhone, shareEmail }, req);
      return res.json({ success: true, share });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== MEMBERSHIP PLANS ====================

  app.get("/api/membership/plans", async (_req: Request, res: Response) => {
    try {
      let plans = await storage.getMembershipPlans();
      if (plans.length === 0) {
        const defaultPlans = [
          { tier: "basic", name: "Basic", description: "Free plan with essential features", priceMonthly: "0", priceYearly: "0", durationDays: 0, dailyLikesLimit: 25, superLikesPerDay: 1, showAds: true, isActive: true, sortOrder: 0, color: "#6b7280", features: ["chat_attachments", "contact_sharing"] },
          { tier: "silver", name: "Silver", description: "Enhanced dating experience with more likes and fewer ads", priceMonthly: "299", priceYearly: "2999", durationDays: 30, dailyLikesLimit: 50, superLikesPerDay: 3, showAds: true, isActive: true, sortOrder: 1, color: "#9ca3af", features: ["chat_attachments", "contact_sharing", "location_sharing", "read_receipts", "date_readiness", "green_flag_stories"] },
          { tier: "gold", name: "Gold", description: "Premium features including AI and advanced matching", priceMonthly: "599", priceYearly: "5999", durationDays: 30, dailyLikesLimit: 100, superLikesPerDay: 5, showAds: false, isActive: true, sortOrder: 2, color: "#f59e0b", features: ["chat_attachments", "contact_sharing", "location_sharing", "read_receipts", "date_readiness", "green_flag_stories", "ai_proxy_mode", "no_screenshot_mode", "photo_authenticity", "festival_boosts", "super_likes", "advanced_filters", "see_who_liked"] },
          { tier: "platinum", name: "Platinum", description: "Ultimate experience with all features and unlimited likes", priceMonthly: "999", priceYearly: "9999", durationDays: 30, dailyLikesLimit: 9999, superLikesPerDay: 10, showAds: false, isActive: true, sortOrder: 3, color: "#8b5cf6", features: ["chat_attachments", "contact_sharing", "location_sharing", "read_receipts", "date_readiness", "green_flag_stories", "ai_proxy_mode", "no_screenshot_mode", "photo_authenticity", "festival_boosts", "super_likes", "unlimited_likes", "advanced_filters", "see_who_liked", "profile_boost", "family_mode"] },
        ];
        for (const p of defaultPlans) {
          await storage.createMembershipPlan(p as any);
        }
        plans = await storage.getMembershipPlans();
      }
      return res.json({ plans });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/membership/plans/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const plan = await storage.updateMembershipPlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      return res.json({ plan });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/membership/plans/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteMembershipPlan(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== AD SETTINGS ====================

  app.get("/api/ad-settings", async (_req: Request, res: Response) => {
    try {
      const adEnabled = await storage.getAppSetting("ads_enabled");
      const adFrequency = await storage.getAppSetting("ads_frequency");
      const adPlacement = await storage.getAppSetting("ads_placement");
      const adPublisherId = await storage.getAppSetting("ads_publisher_id");
      const adSlotId = await storage.getAppSetting("ads_slot_id");
      const adBannerSlotId = await storage.getAppSetting("ads_banner_slot_id");
      const adInterstitialFreq = await storage.getAppSetting("ads_interstitial_frequency");
      return res.json({
        enabled: adEnabled !== null ? adEnabled === "true" : true,
        frequency: adFrequency ? parseInt(adFrequency) : 5,
        placement: adPlacement || "discover,matches,profile",
        publisherId: adPublisherId || "",
        slotId: adSlotId || "",
        bannerSlotId: adBannerSlotId || "",
        interstitialFrequency: adInterstitialFreq ? parseInt(adInterstitialFreq) : 10,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== BOT MODE AUTO-OFFLINE ====================

  app.get("/api/admin/bot-mode-settings", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const maxHours = await storage.getAppSetting("bot_mode_max_hours");
      return res.json({ maxHours: maxHours ? parseInt(maxHours) : 12 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
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
      return res.status(500).json({ message: err.message });
    }
  });

  // ==================== MEMBERSHIP REVENUE ====================

  app.get("/api/admin/membership/revenue", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const revenue = await storage.getMembershipRevenue();
      return res.json(revenue);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/membership/transactions", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const transactions = await storage.getMembershipTransactions(userId);
      return res.json({ transactions });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
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
