import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone"),
  email: text("email"),
  passwordHash: text("password_hash"),
  isVerified: boolean("is_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  adminEmail: text("admin_email"),
  respectScore: integer("respect_score").default(85),
  reportCount: integer("report_count").default(0),
  isBanned: boolean("is_banned").default(false),
  isDeactivated: boolean("is_deactivated").default(false),
  deactivationReason: text("deactivation_reason"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  isOnline: boolean("is_online").default(false),
  dailyLikesUsed: integer("daily_likes_used").default(0),
  dailyLikesLimit: integer("daily_likes_limit").default(50),
  dailyLikesResetAt: timestamp("daily_likes_reset_at").defaultNow(),
  chatSuspendedUntil: timestamp("chat_suspended_until"),
  chatCooldownCount: integer("chat_cooldown_count").default(0),
  chatBanned: boolean("chat_banned").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsAcceptedVersion: integer("terms_accepted_version"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  bio: text("bio"),
  city: text("city").notNull(),
  location: text("location").notNull(),
  interests: text("interests").array(),
  photos: text("photos").array(),
  isVisible: boolean("is_visible").default(true),
  aiPersonaEnabled: boolean("ai_persona_enabled").default(false),
  aiTone: text("ai_tone").default("Friendly"),
  aiLanguage: text("ai_language").default("English"),
  aiProxyEnabled: boolean("ai_proxy_enabled").default(false),
  aiChatPace: text("ai_chat_pace").default("Normal"),
  aiBoundaries: text("ai_boundaries").array(),
  intent: text("intent"),
  intentLockedAt: timestamp("intent_locked_at"),
  intentLockBroken: boolean("intent_lock_broken").default(false),
  familyMode: boolean("family_mode").default(false),
  noScreenshotMode: boolean("no_screenshot_mode").default(false),
  festivalPrefs: jsonb("festival_prefs").$type<string[]>(),
  hometownForFestivals: text("hometown_for_festivals"),
  greenFlagStories: jsonb("green_flag_stories").$type<{prompt: string; answer: string}[]>(),
  interestedIn: text("interested_in").array(),
  partner2Name: text("partner2_name"),
  partner2Age: integer("partner2_age"),
  partner2Gender: text("partner2_gender"),
  dateReadiness: text("date_readiness").default("Chat-only"),
  photoAuthenticityScore: integer("photo_authenticity_score"),
  photoVerifiedAt: timestamp("photo_verified_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  isMatched: boolean("is_matched").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isAiGenerated: boolean("is_ai_generated").default(false),
  isAiProxy: boolean("is_ai_proxy").default(false),
  isRead: boolean("is_read").default(false),
  isSystemMessage: boolean("is_system_message").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
  matchId: text("match_id"),
  chatAnalysis: text("chat_analysis"),
  actionTaken: text("action_taken").default("pending"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const screenshotAlerts = pgTable("screenshot_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  detectedByUserId: varchar("detected_by_user_id").notNull().references(() => users.id),
  notifiedUserId: varchar("notified_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatCooldowns = pgTable("chat_cooldowns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  reason: text("reason"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const phoneUnlockRequests = pgTable("phone_unlock_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  status: text("status").default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
  coolOffEndsAt: timestamp("cool_off_ends_at"),
  respondedAt: timestamp("responded_at"),
});

export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedUserId: varchar("blocked_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default("Admin"),
  role: text("role").notNull().default("super_admin"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  lastLoginLocation: text("last_login_location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userType: text("user_type").notNull().default("user"),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  location: text("location"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  category: text("category").notNull(),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, updatedAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export const insertScreenshotAlertSchema = createInsertSchema(screenshotAlerts).omit({ id: true, createdAt: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export const insertChatCooldownSchema = createInsertSchema(chatCooldowns).omit({ id: true, createdAt: true });
export const insertPhoneUnlockRequestSchema = createInsertSchema(phoneUnlockRequests).omit({ id: true });
export const insertBlockedUserSchema = createInsertSchema(blockedUsers).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ScreenshotAlert = typeof screenshotAlerts.$inferSelect;
export type InsertScreenshotAlert = z.infer<typeof insertScreenshotAlertSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type ChatCooldown = typeof chatCooldowns.$inferSelect;
export type InsertChatCooldown = z.infer<typeof insertChatCooldownSchema>;
export type PhoneUnlockRequest = typeof phoneUnlockRequests.$inferSelect;
export type InsertPhoneUnlockRequest = z.infer<typeof insertPhoneUnlockRequestSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => data.phone || data.email, { message: "Phone or email required" });

export const verifyOtpSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  otp: z.string().length(6),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const adminVerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const greenFlagStorySchema = z.object({
  prompt: z.string(),
  answer: z.string().max(200),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().min(18).max(100),
  gender: z.enum(["Male", "Female", "Trans", "Couple"]),
  bio: z.string().max(500).optional(),
  city: z.string(),
  location: z.string(),
  interests: z.array(z.string()).max(10).optional(),
  photos: z.array(z.string()).max(10).optional(),
  isVisible: z.boolean().optional(),
  aiPersonaEnabled: z.boolean().optional(),
  aiTone: z.string().optional(),
  aiLanguage: z.string().optional(),
  aiProxyEnabled: z.boolean().optional(),
  aiChatPace: z.enum(["Slow", "Normal", "Fast"]).optional(),
  aiBoundaries: z.array(z.string()).optional(),
  intent: z.enum(["Casual", "Dating", "Serious", "Marriage"]).optional(),
  familyMode: z.boolean().optional(),
  noScreenshotMode: z.boolean().optional(),
  festivalPrefs: z.array(z.string()).optional(),
  hometownForFestivals: z.string().optional(),
  greenFlagStories: z.array(greenFlagStorySchema).max(3).optional(),
  interestedIn: z.array(z.enum(["Male", "Female", "Trans", "Couple"])).optional(),
  partner2Name: z.string().min(2).max(50).optional().nullable(),
  partner2Age: z.number().min(18).max(100).optional().nullable(),
  partner2Gender: z.enum(["Male", "Female", "Trans"]).optional().nullable(),
  dateReadiness: z.enum(["Chat-only", "Voice-ready", "Meet-ready"]).optional(),
});

export const swipeSchema = z.object({
  targetUserId: z.string(),
  action: z.enum(["like", "pass", "superlike"]),
});

export const sendMessageSchema = z.object({
  matchId: z.string(),
  content: z.string().min(1).max(2000),
  isAiGenerated: z.boolean().optional(),
  isAiProxy: z.boolean().optional(),
});

export const reportSchema = z.object({
  reportedUserId: z.string(),
  reason: z.string(),
  details: z.string().optional(),
  matchId: z.string().optional(),
});

export const GREEN_FLAG_PROMPTS = [
  "Something I'll never joke about",
  "My idea of respect",
  "One thing I'm healing from",
] as const;

export const FESTIVAL_LIST = [
  "Diwali",
  "Eid",
  "Navratri",
  "Christmas",
  "Holi",
  "Ganesh Chaturthi",
  "Onam",
  "Pongal",
  "Baisakhi",
  "Durga Puja",
] as const;

export const INTENT_OPTIONS = ["Casual", "Dating", "Serious", "Marriage"] as const;
export const DATE_READINESS_OPTIONS = ["Chat-only", "Voice-ready", "Meet-ready"] as const;
