import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
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
  membershipTier: text("membership_tier").default("basic"),
  membershipExpiresAt: timestamp("membership_expires_at"),
  membershipStartedAt: timestamp("membership_started_at"),
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
  botModeActivatedAt: timestamp("bot_mode_activated_at"),
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
  zodiacSign: text("zodiac_sign"),
  dateOfBirth: text("date_of_birth"),
  dateReadiness: text("date_readiness").default("Chat-only"),
  photoAuthenticityScore: integer("photo_authenticity_score"),
  photoVerifiedAt: timestamp("photo_verified_at"),
  datingStyle: text("dating_style"),
  datingStyleTraits: jsonb("dating_style_traits").$type<Record<string, number>>(),
  quizCompletedAt: timestamp("quiz_completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  isMatched: boolean("is_matched").default(false),
  isArchived: boolean("is_archived").default(false),
  isDeleted: boolean("is_deleted").default(false),
  archivedAt: timestamp("archived_at"),
  deletedAt: timestamp("deleted_at"),
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
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  attachmentSize: integer("attachment_size"),
  attachmentOriginalName: text("attachment_original_name"),
  isOneTimeView: boolean("is_one_time_view").default(false),
  oneTimeViewed: boolean("one_time_viewed").default(false),
  oneTimeViewedAt: timestamp("one_time_viewed_at"),
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

export const contactShares = pgTable("contact_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  sharerUserId: varchar("sharer_user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id),
  sharePhone: boolean("share_phone").default(false),
  shareEmail: boolean("share_email").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locationShares = pgTable("location_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  sharerUserId: varchar("sharer_user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  isLive: boolean("is_live").default(false),
  expiresAt: timestamp("expires_at"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
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

export const membershipPlans = pgTable("membership_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: text("tier").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: numeric("price_monthly").default("0"),
  priceYearly: numeric("price_yearly").default("0"),
  durationDays: integer("duration_days").default(30),
  dailyLikesLimit: integer("daily_likes_limit").default(50),
  superLikesPerDay: integer("super_likes_per_day").default(1),
  showAds: boolean("show_ads").default(true),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  color: text("color").default("#6b7280"),
  features: jsonb("features").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const membershipTransactions = pgTable("membership_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planTier: text("plan_tier").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("INR"),
  durationDays: integer("duration_days").notNull(),
  status: text("status").default("completed"),
  paymentMethod: text("payment_method").default("simulated"),
  startsAt: timestamp("starts_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
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
export const insertContactShareSchema = createInsertSchema(contactShares).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLocationShareSchema = createInsertSchema(locationShares).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, createdAt: true });
export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMembershipTransactionSchema = createInsertSchema(membershipTransactions).omit({ id: true, createdAt: true });

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
export type ContactShare = typeof contactShares.$inferSelect;
export type InsertContactShare = z.infer<typeof insertContactShareSchema>;
export type LocationShare = typeof locationShares.$inferSelect;
export type InsertLocationShare = z.infer<typeof insertLocationShareSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type MembershipTransaction = typeof membershipTransactions.$inferSelect;
export type InsertMembershipTransaction = z.infer<typeof insertMembershipTransactionSchema>;

export const quizResponses = pgTable("quiz_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  questionId: text("question_id").notNull(),
  selectedOption: integer("selected_option").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizResponseSchema = createInsertSchema(quizResponses).omit({ id: true, createdAt: true });
export type QuizResponse = typeof quizResponses.$inferSelect;
export type InsertQuizResponse = z.infer<typeof insertQuizResponseSchema>;

export const DATING_STYLES = [
  "The Romantic",
  "The Adventurer",
  "The Intellectual",
  "The Family-First",
  "The Free Spirit",
  "The Ambitious Go-Getter",
] as const;

export type DatingStyle = typeof DATING_STYLES[number];

export const DATING_STYLE_TRAITS = ["romance", "adventure", "intellect", "family", "freedom", "ambition"] as const;

export const DATING_STYLE_COMPATIBILITY: Record<string, Record<string, number>> = {
  "The Romantic": { "The Romantic": 95, "The Adventurer": 75, "The Intellectual": 80, "The Family-First": 90, "The Free Spirit": 60, "The Ambitious Go-Getter": 70 },
  "The Adventurer": { "The Romantic": 75, "The Adventurer": 90, "The Intellectual": 70, "The Family-First": 55, "The Free Spirit": 95, "The Ambitious Go-Getter": 80 },
  "The Intellectual": { "The Romantic": 80, "The Adventurer": 70, "The Intellectual": 90, "The Family-First": 75, "The Free Spirit": 65, "The Ambitious Go-Getter": 95 },
  "The Family-First": { "The Romantic": 90, "The Adventurer": 55, "The Intellectual": 75, "The Family-First": 95, "The Free Spirit": 40, "The Ambitious Go-Getter": 70 },
  "The Free Spirit": { "The Romantic": 60, "The Adventurer": 95, "The Intellectual": 65, "The Family-First": 40, "The Free Spirit": 85, "The Ambitious Go-Getter": 60 },
  "The Ambitious Go-Getter": { "The Romantic": 70, "The Adventurer": 80, "The Intellectual": 95, "The Family-First": 70, "The Free Spirit": 60, "The Ambitious Go-Getter": 90 },
};

export const MEMBERSHIP_TIERS = ["basic", "silver", "gold", "platinum"] as const;
export type MembershipTier = typeof MEMBERSHIP_TIERS[number];

export const PREMIUM_FEATURES = [
  "ai_proxy_mode",
  "no_screenshot_mode",
  "photo_authenticity",
  "green_flag_stories",
  "festival_boosts",
  "family_mode",
  "date_readiness",
  "chat_attachments",
  "contact_sharing",
  "location_sharing",
  "super_likes",
  "unlimited_likes",
  "see_who_liked",
  "profile_boost",
  "read_receipts",
  "advanced_filters",
] as const;

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
  bio: z.string().max(1000).optional(),
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
  zodiacSign: z.string().optional(),
  dateOfBirth: z.string().optional(),
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
