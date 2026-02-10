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
  respectScore: integer("respect_score").default(85),
  reportCount: integer("report_count").default(0),
  isBanned: boolean("is_banned").default(false),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  isOnline: boolean("is_online").default(false),
  dailyLikesUsed: integer("daily_likes_used").default(0),
  dailyLikesLimit: integer("daily_likes_limit").default(50),
  dailyLikesResetAt: timestamp("daily_likes_reset_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, updatedAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export const insertScreenshotAlertSchema = createInsertSchema(screenshotAlerts).omit({ id: true, createdAt: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });

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

export const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => data.phone || data.email, { message: "Phone or email required" });

export const verifyOtpSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  otp: z.string().length(6),
});

export const greenFlagStorySchema = z.object({
  prompt: z.string(),
  answer: z.string().max(200),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().min(18).max(100),
  gender: z.enum(["Male", "Female", "Trans"]),
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
