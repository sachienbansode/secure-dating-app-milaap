import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - core authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone"),
  email: text("email"),
  passwordHash: text("password_hash"),
  isVerified: boolean("is_verified").default(false),
  respectScore: integer("respect_score").default(85),
  reportCount: integer("report_count").default(0),
  isBanned: boolean("is_banned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profiles table - user profile data (encrypted fields stored as text)
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // encrypted
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // Male, Female, Trans
  bio: text("bio"), // encrypted
  city: text("city").notNull(),
  location: text("location").notNull(),
  interests: text("interests").array(),
  photos: text("photos").array(),
  isVisible: boolean("is_visible").default(true),
  aiPersonaEnabled: boolean("ai_persona_enabled").default(false),
  aiTone: text("ai_tone").default("Friendly"),
  aiLanguage: text("ai_language").default("English"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Matches table
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'like', 'pass', 'superlike'
  isMatched: boolean("is_matched").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table (encrypted content)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => matches.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(), // encrypted
  isAiGenerated: boolean("is_ai_generated").default(false),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports table
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").default("pending"), // pending, reviewed, actioned
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, updatedAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

// Types
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

// API validation schemas
export const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => data.phone || data.email, { message: "Phone or email required" });

export const verifyOtpSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  otp: z.string().length(6),
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
});

export const swipeSchema = z.object({
  targetUserId: z.string(),
  action: z.enum(["like", "pass", "superlike"]),
});

export const sendMessageSchema = z.object({
  matchId: z.string(),
  content: z.string().min(1).max(2000),
  isAiGenerated: z.boolean().optional(),
});

export const reportSchema = z.object({
  reportedUserId: z.string(),
  reason: z.string(),
  details: z.string().optional(),
});
