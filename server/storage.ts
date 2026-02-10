import { db } from "./db";
import { eq, and, ne, notInArray, desc, sql } from "drizzle-orm";
import {
  users, profiles, matches, messages, reports,
  type User, type InsertUser,
  type Profile, type InsertProfile,
  type Match, type InsertMatch,
  type Message, type InsertMessage,
  type Report, type InsertReport,
} from "@shared/schema";
import { encryptProfile, decryptProfile, encryptMessage, decryptMessage } from "./encryption";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;
  getDiscoverProfiles(userId: string, limit?: number, filters?: { gender?: string; ageMin?: number; ageMax?: number; city?: string }): Promise<Profile[]>;

  // Matches
  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(userId: string, targetUserId: string): Promise<Match | undefined>;
  getMatchById(id: string): Promise<Match | undefined>;
  getMutualMatches(userId: string): Promise<Match[]>;
  checkMutualMatch(userId: string, targetUserId: string): Promise<boolean>;

  // Messages
  sendMessage(message: InsertMessage): Promise<Message>;
  getMessages(matchId: string, limit?: number): Promise<Message[]>;
  markMessagesRead(matchId: string, userId: string): Promise<void>;

  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReportsForUser(userId: string): Promise<Report[]>;
}

export class DatabaseStorage implements IStorage {
  // === USERS ===
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  // === PROFILES ===
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile ? decryptProfile(profile) : undefined;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const encrypted = encryptProfile(profile);
    const [created] = await db.insert(profiles).values(encrypted).returning();
    return decryptProfile(created);
  }

  async updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined> {
    const toUpdate = { ...data } as any;
    if (toUpdate.name) toUpdate.name = (await import("./encryption")).encrypt(toUpdate.name);
    if (toUpdate.bio) toUpdate.bio = (await import("./encryption")).encrypt(toUpdate.bio);
    toUpdate.updatedAt = new Date();
    
    const [updated] = await db.update(profiles).set(toUpdate).where(eq(profiles.userId, userId)).returning();
    return updated ? decryptProfile(updated) : undefined;
  }

  async getDiscoverProfiles(userId: string, limit = 20, filters?: { gender?: string; ageMin?: number; ageMax?: number; city?: string }): Promise<Profile[]> {
    const swipedMatches = await db.select({ targetUserId: matches.targetUserId })
      .from(matches)
      .where(eq(matches.userId, userId));
    
    const swipedIds = swipedMatches.map(m => m.targetUserId);
    swipedIds.push(userId);

    const conditions = [
      eq(profiles.isVisible, true),
      notInArray(profiles.userId, swipedIds),
    ];

    if (filters?.gender && filters.gender !== "All") {
      conditions.push(eq(profiles.gender, filters.gender));
    }
    if (filters?.ageMin) {
      conditions.push(sql`${profiles.age} >= ${filters.ageMin}`);
    }
    if (filters?.ageMax) {
      conditions.push(sql`${profiles.age} <= ${filters.ageMax}`);
    }
    if (filters?.city && filters.city !== "All") {
      conditions.push(eq(profiles.city, filters.city));
    }

    const result = await db.select().from(profiles)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return result.map(decryptProfile);
  }

  // === MATCHES ===
  async createMatch(match: InsertMatch): Promise<Match> {
    const [created] = await db.insert(matches).values(match).returning();
    return created;
  }

  async getMatch(userId: string, targetUserId: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches)
      .where(and(eq(matches.userId, userId), eq(matches.targetUserId, targetUserId)));
    return match;
  }

  async getMatchById(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMutualMatches(userId: string): Promise<Match[]> {
    return db.select().from(matches)
      .where(and(eq(matches.userId, userId), eq(matches.isMatched, true)))
      .orderBy(desc(matches.createdAt));
  }

  async checkMutualMatch(userId: string, targetUserId: string): Promise<boolean> {
    const [reverseMatch] = await db.select().from(matches)
      .where(
        and(
          eq(matches.userId, targetUserId),
          eq(matches.targetUserId, userId),
          eq(matches.action, "like")
        )
      );
    return !!reverseMatch;
  }

  // === MESSAGES ===
  async sendMessage(message: InsertMessage): Promise<Message> {
    const encrypted = { ...message, content: encryptMessage(message.content) };
    const [created] = await db.insert(messages).values(encrypted).returning();
    return { ...created, content: decryptMessage(created.content) };
  }

  async getMessages(matchId: string, limit = 50): Promise<Message[]> {
    const result = await db.select().from(messages)
      .where(eq(messages.matchId, matchId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return result.map(m => ({ ...m, content: decryptMessage(m.content) })).reverse();
  }

  async markMessagesRead(matchId: string, userId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.matchId, matchId),
          ne(messages.senderId, userId),
          eq(messages.isRead, false)
        )
      );
  }

  // === REPORTS ===
  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    
    // Auto-increment report count for reported user
    await db.update(users)
      .set({ reportCount: sql`${users.reportCount} + 1` })
      .where(eq(users.id, report.reportedUserId));
    
    // Auto-ban if report count exceeds threshold
    const [reportedUser] = await db.select().from(users).where(eq(users.id, report.reportedUserId));
    if (reportedUser && (reportedUser.reportCount ?? 0) >= 5) {
      await db.update(users).set({ isBanned: true }).where(eq(users.id, report.reportedUserId));
    }
    
    return created;
  }

  async getReportsForUser(userId: string): Promise<Report[]> {
    return db.select().from(reports)
      .where(eq(reports.reportedUserId, userId))
      .orderBy(desc(reports.createdAt));
  }
}

export const storage = new DatabaseStorage();
