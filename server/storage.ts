import { db } from "./db";
import { eq, and, ne, notInArray, inArray, desc, sql, or, gt } from "drizzle-orm";
import {
  users, profiles, matches, messages, reports, screenshotAlerts, appSettings,
  chatCooldowns, phoneUnlockRequests, blockedUsers,
  type User, type InsertUser,
  type Profile, type InsertProfile,
  type Match, type InsertMatch,
  type Message, type InsertMessage,
  type Report, type InsertReport,
  type ScreenshotAlert, type InsertScreenshotAlert,
  type AppSetting, type InsertAppSetting,
  type ChatCooldown, type InsertChatCooldown,
  type PhoneUnlockRequest, type InsertPhoneUnlockRequest,
  type BlockedUser, type InsertBlockedUser,
} from "@shared/schema";
import { encryptProfile, decryptProfile, encryptMessage, decryptMessage } from "./encryption";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  setUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;

  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;
  getDiscoverProfiles(userId: string, limit?: number, filters?: { gender?: string; ageMin?: number; ageMax?: number; city?: string; intent?: string; familyMode?: boolean }): Promise<Profile[]>;

  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(userId: string, targetUserId: string): Promise<Match | undefined>;
  getMatchById(id: string): Promise<Match | undefined>;
  getMutualMatches(userId: string): Promise<Match[]>;
  checkMutualMatch(userId: string, targetUserId: string): Promise<boolean>;

  sendMessage(message: InsertMessage): Promise<Message>;
  getMessages(matchId: string, limit?: number): Promise<Message[]>;
  markMessagesRead(matchId: string, userId: string): Promise<void>;
  getConversationDropRate(userId: string): Promise<number>;

  createReport(report: InsertReport): Promise<Report>;
  getReportsForUser(userId: string): Promise<Report[]>;

  createScreenshotAlert(alert: InsertScreenshotAlert): Promise<ScreenshotAlert>;
  getScreenshotAlerts(matchId: string): Promise<ScreenshotAlert[]>;

  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;

  createChatCooldown(cooldown: InsertChatCooldown): Promise<ChatCooldown>;
  getActiveCooldown(userId: string, matchId: string): Promise<ChatCooldown | undefined>;

  createPhoneUnlockRequest(req: Omit<InsertPhoneUnlockRequest, "id">): Promise<PhoneUnlockRequest>;
  getPhoneUnlockRequest(requesterId: string, targetUserId: string, matchId: string): Promise<PhoneUnlockRequest | undefined>;
  updatePhoneUnlockRequest(id: string, data: Partial<PhoneUnlockRequest>): Promise<PhoneUnlockRequest | undefined>;
  getMutualPhoneUnlock(userId1: string, userId2: string, matchId: string): Promise<boolean>;

  blockUser(blockerId: string, blockedUserId: string): Promise<BlockedUser>;
  isBlocked(blockerId: string, blockedUserId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<BlockedUser[]>;
}

export class DatabaseStorage implements IStorage {
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

  async setUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await db.update(users).set({
      isOnline,
      lastSeenAt: new Date(),
    }).where(eq(users.id, id));
  }

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

  async getDiscoverProfiles(userId: string, limit = 20, filters?: { gender?: string; ageMin?: number; ageMax?: number; city?: string; intent?: string; familyMode?: boolean }): Promise<Profile[]> {
    const swipedMatches = await db.select({ targetUserId: matches.targetUserId })
      .from(matches)
      .where(eq(matches.userId, userId));
    
    const swipedIds = swipedMatches.map(m => m.targetUserId);
    swipedIds.push(userId);

    const blocked = await this.getBlockedUsers(userId);
    const blockedIds = blocked.map(b => b.blockedUserId);
    const allExcluded = [...new Set([...swipedIds, ...blockedIds])];

    const deactivatedUsers = await db.select({ id: users.id }).from(users)
      .where(or(eq(users.isDeactivated, true), eq(users.isBanned, true)));
    const deactivatedIds = deactivatedUsers.map(u => u.id);
    const finalExcluded = [...new Set([...allExcluded, ...deactivatedIds])];

    const conditions: any[] = [
      eq(profiles.isVisible, true),
      notInArray(profiles.userId, finalExcluded),
    ];

    if (filters?.gender && filters.gender !== "All") {
      conditions.push(eq(profiles.gender, filters.gender));
    } else {
      const myProfile = await this.getProfile(userId);
      if (myProfile?.interestedIn && myProfile.interestedIn.length > 0) {
        conditions.push(inArray(profiles.gender, myProfile.interestedIn));
      }
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
    if (filters?.intent) {
      conditions.push(eq(profiles.intent, filters.intent));
    }
    if (filters?.familyMode) {
      conditions.push(eq(profiles.familyMode, true));
    }

    const result = await db.select().from(profiles)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return result.map(decryptProfile);
  }

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

  async sendMessage(message: InsertMessage): Promise<Message> {
    const encrypted = { ...message, content: message.isSystemMessage ? message.content : encryptMessage(message.content) };
    const [created] = await db.insert(messages).values(encrypted).returning();
    return { ...created, content: created.isSystemMessage ? created.content : decryptMessage(created.content) };
  }

  async getMessages(matchId: string, limit = 50): Promise<Message[]> {
    const result = await db.select().from(messages)
      .where(eq(messages.matchId, matchId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return result.map(m => ({ ...m, content: m.isSystemMessage ? m.content : decryptMessage(m.content) })).reverse();
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

  async getConversationDropRate(userId: string): Promise<number> {
    const userMatches = await db.select().from(matches)
      .where(and(eq(matches.userId, userId), eq(matches.isMatched, true)));
    
    if (userMatches.length === 0) return 0;

    let droppedCount = 0;
    for (const match of userMatches) {
      const msgs = await db.select().from(messages)
        .where(and(eq(messages.matchId, match.id), eq(messages.senderId, userId)));
      if (msgs.length === 0) droppedCount++;
    }

    return (droppedCount / userMatches.length) * 100;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    
    await db.update(users)
      .set({ reportCount: sql`${users.reportCount} + 1` })
      .where(eq(users.id, report.reportedUserId));
    
    const [reportedUser] = await db.select().from(users).where(eq(users.id, report.reportedUserId));
    if (reportedUser && (reportedUser.reportCount ?? 0) >= 5) {
      await db.update(users).set({ isBanned: true }).where(eq(users.id, report.reportedUserId));
    }

    const newScore = Math.max(0, (reportedUser?.respectScore ?? 85) - 5);
    await db.update(users).set({ respectScore: newScore }).where(eq(users.id, report.reportedUserId));
    
    return created;
  }

  async getReportsForUser(userId: string): Promise<Report[]> {
    return db.select().from(reports)
      .where(eq(reports.reportedUserId, userId))
      .orderBy(desc(reports.createdAt));
  }

  async createScreenshotAlert(alert: InsertScreenshotAlert): Promise<ScreenshotAlert> {
    const [created] = await db.insert(screenshotAlerts).values(alert).returning();
    return created;
  }

  async getScreenshotAlerts(matchId: string): Promise<ScreenshotAlert[]> {
    return db.select().from(screenshotAlerts)
      .where(eq(screenshotAlerts.matchId, matchId))
      .orderBy(desc(screenshotAlerts.createdAt));
  }

  async getAppSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting?.value ?? null;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    const existing = await this.getAppSetting(key);
    if (existing !== null) {
      await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }
  }

  async createChatCooldown(cooldown: InsertChatCooldown): Promise<ChatCooldown> {
    const [created] = await db.insert(chatCooldowns).values(cooldown).returning();
    return created;
  }

  async getActiveCooldown(userId: string, matchId: string): Promise<ChatCooldown | undefined> {
    const [cooldown] = await db.select().from(chatCooldowns)
      .where(and(
        eq(chatCooldowns.userId, userId),
        eq(chatCooldowns.matchId, matchId),
        gt(chatCooldowns.expiresAt, new Date())
      ))
      .orderBy(desc(chatCooldowns.createdAt))
      .limit(1);
    return cooldown;
  }

  async createPhoneUnlockRequest(req: any): Promise<PhoneUnlockRequest> {
    const [created] = await db.insert(phoneUnlockRequests).values(req).returning();
    return created;
  }

  async getPhoneUnlockRequest(requesterId: string, targetUserId: string, matchId: string): Promise<PhoneUnlockRequest | undefined> {
    const [req] = await db.select().from(phoneUnlockRequests)
      .where(and(
        eq(phoneUnlockRequests.requesterId, requesterId),
        eq(phoneUnlockRequests.targetUserId, targetUserId),
        eq(phoneUnlockRequests.matchId, matchId),
      ));
    return req;
  }

  async updatePhoneUnlockRequest(id: string, data: Partial<PhoneUnlockRequest>): Promise<PhoneUnlockRequest | undefined> {
    const [updated] = await db.update(phoneUnlockRequests).set(data).where(eq(phoneUnlockRequests.id, id)).returning();
    return updated;
  }

  async getMutualPhoneUnlock(userId1: string, userId2: string, matchId: string): Promise<boolean> {
    const req1 = await this.getPhoneUnlockRequest(userId1, userId2, matchId);
    const req2 = await this.getPhoneUnlockRequest(userId2, userId1, matchId);
    if (!req1 || !req2) return false;
    if (req1.status !== "approved" || req2.status !== "approved") return false;
    const now = new Date();
    if (req1.coolOffEndsAt && now < req1.coolOffEndsAt) return false;
    if (req2.coolOffEndsAt && now < req2.coolOffEndsAt) return false;
    return true;
  }

  async blockUser(blockerId: string, blockedUserId: string): Promise<BlockedUser> {
    const [created] = await db.insert(blockedUsers).values({ blockerId, blockedUserId }).returning();
    return created;
  }

  async isBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    const [block] = await db.select().from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedUserId, blockedUserId)));
    return !!block;
  }

  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    return db.select().from(blockedUsers)
      .where(eq(blockedUsers.blockerId, userId));
  }
}

export const storage = new DatabaseStorage();
