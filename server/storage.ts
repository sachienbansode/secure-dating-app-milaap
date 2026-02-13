import { db } from "./db";
import { eq, and, ne, notInArray, inArray, desc, sql, or, gt } from "drizzle-orm";
import {
  users, profiles, matches, messages, reports, screenshotAlerts, appSettings,
  chatCooldowns, phoneUnlockRequests, blockedUsers, activityLogs,
  adminUsers, userSessions, contactShares, locationShares,
  membershipPlans, membershipTransactions, quizResponses, chaiDates,
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
  type ContactShare, type InsertContactShare,
  type LocationShare, type InsertLocationShare,
  type ActivityLog, type InsertActivityLog,
  type AdminUser, type InsertAdminUser,
  type UserSession, type InsertUserSession,
  type MembershipPlan, type InsertMembershipPlan,
  type MembershipTransaction, type InsertMembershipTransaction,
  type QuizResponse, type InsertQuizResponse,
  type ChaiDate, type InsertChaiDate,
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
  getProfilesByUserIds(userIds: string[]): Promise<Map<string, Profile>>;
  getUsersByIds(userIds: string[]): Promise<Map<string, User>>;
  getLastMessagesForMatches(matchIds: string[]): Promise<Map<string, { content: string; createdAt: Date; senderId: string }>>;
  getAppSettings(keys: string[]): Promise<Map<string, string>>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: Partial<InsertProfile>): Promise<Profile | undefined>;
  getDiscoverProfiles(userId: string, limit?: number, filters?: { gender?: string; ageMin?: number; ageMax?: number; city?: string; intent?: string; familyMode?: boolean }, myProfile?: Profile | null): Promise<Profile[]>;

  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(userId: string, targetUserId: string): Promise<Match | undefined>;
  getMatchById(id: string): Promise<Match | undefined>;
  getMutualMatches(userId: string): Promise<Match[]>;
  checkMutualMatch(userId: string, targetUserId: string): Promise<boolean>;

  sendMessage(message: InsertMessage): Promise<Message>;
  getMessages(matchId: string, limit?: number): Promise<Message[]>;
  getMessageById(id: string): Promise<Message | undefined>;
  markMessagesRead(matchId: string, userId: string): Promise<void>;
  markOneTimeViewed(messageId: string): Promise<void>;
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

  logActivity(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number, offset?: number, category?: string, userId?: string): Promise<ActivityLog[]>;
  getActivityLogCount(category?: string, userId?: string): Promise<number>;

  getAllProfilesAdmin(limit?: number, offset?: number, genderFilter?: string): Promise<{ profiles: (Profile & { user?: User })[], total: number }>;
  getAppSettingWithMeta(key: string): Promise<AppSetting | undefined>;

  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  createAdminUser(data: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, data: Partial<AdminUser>): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;

  createUserSession(data: InsertUserSession): Promise<UserSession>;
  getUserSession(sessionToken: string): Promise<UserSession | undefined>;
  invalidateUserSessions(userId: string, userType: string): Promise<void>;
  invalidateSession(sessionToken: string): Promise<void>;
  updateSessionActivity(sessionToken: string): Promise<void>;
  getActiveSessions(userId: string, userType: string): Promise<UserSession[]>;

  upsertContactShare(data: InsertContactShare): Promise<ContactShare>;
  getContactShare(matchId: string, sharerUserId: string): Promise<ContactShare | undefined>;
  getContactSharesForMatch(matchId: string): Promise<ContactShare[]>;

  createLocationShare(data: InsertLocationShare): Promise<LocationShare>;
  updateLocationShare(id: string, data: Partial<LocationShare>): Promise<LocationShare | undefined>;
  getActiveLocationShares(matchId: string): Promise<LocationShare[]>;
  getLocationShare(id: string): Promise<LocationShare | undefined>;
  deleteLocationShare(id: string): Promise<void>;

  getMembershipPlans(): Promise<MembershipPlan[]>;
  getMembershipPlan(tier: string): Promise<MembershipPlan | undefined>;
  createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan>;
  updateMembershipPlan(id: string, data: Partial<MembershipPlan>): Promise<MembershipPlan | undefined>;
  deleteMembershipPlan(id: string): Promise<void>;
  createMembershipTransaction(txn: InsertMembershipTransaction): Promise<MembershipTransaction>;
  getMembershipTransactions(userId?: string, limit?: number): Promise<MembershipTransaction[]>;
  getExpiredBotModeUsers(maxHours: number): Promise<Profile[]>;
  getMembershipRevenue(): Promise<{ total: number; monthly: number; byTier: Record<string, number> }>;

  saveQuizResponses(userId: string, responses: InsertQuizResponse[]): Promise<QuizResponse[]>;
  getQuizResponses(userId: string): Promise<QuizResponse[]>;
  deleteQuizResponses(userId: string): Promise<void>;

  createChaiDate(data: InsertChaiDate): Promise<ChaiDate>;
  getChaiDate(id: string): Promise<ChaiDate | undefined>;
  getChaiDateForMatch(matchId: string, status?: string): Promise<ChaiDate | undefined>;
  updateChaiDate(id: string, data: Partial<ChaiDate>): Promise<ChaiDate | undefined>;
  getChaiDateHistory(userId: string): Promise<ChaiDate[]>;
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

  async getProfilesByUserIds(userIds: string[]): Promise<Map<string, Profile>> {
    if (userIds.length === 0) return new Map();
    const result = await db.select().from(profiles).where(inArray(profiles.userId, userIds));
    const map = new Map<string, Profile>();
    for (const p of result) {
      map.set(p.userId, decryptProfile(p));
    }
    return map;
  }

  async getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
    if (userIds.length === 0) return new Map();
    const result = await db.select().from(users).where(inArray(users.id, userIds));
    const map = new Map<string, User>();
    for (const u of result) {
      map.set(u.id, u);
    }
    return map;
  }

  async getLastMessagesForMatches(matchIds: string[]): Promise<Map<string, { content: string; createdAt: Date; senderId: string }>> {
    if (matchIds.length === 0) return new Map();
    const matchIdsArray = `{${matchIds.join(',')}}`;
    const result = await db.execute(sql`
      SELECT DISTINCT ON (match_id) match_id, content, created_at, sender_id
      FROM messages
      WHERE match_id = ANY(${matchIdsArray}::text[])
      ORDER BY match_id, created_at DESC
    `);
    const map = new Map<string, { content: string; createdAt: Date; senderId: string }>();
    for (const row of (result.rows || []) as any[]) {
      const decryptedContent = decryptMessage(row.content);
      map.set(row.match_id, { content: decryptedContent, createdAt: new Date(row.created_at), senderId: row.sender_id });
    }
    return map;
  }

  async getAppSettings(keys: string[]): Promise<Map<string, string>> {
    if (keys.length === 0) return new Map();
    const result = await db.select().from(appSettings).where(inArray(appSettings.key, keys));
    const map = new Map<string, string>();
    for (const s of result) {
      map.set(s.key, s.value);
    }
    return map;
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
    if (toUpdate.partner2Name) toUpdate.partner2Name = (await import("./encryption")).encrypt(toUpdate.partner2Name);
    toUpdate.updatedAt = new Date();
    
    const [updated] = await db.update(profiles).set(toUpdate).where(eq(profiles.userId, userId)).returning();
    return updated ? decryptProfile(updated) : undefined;
  }

  async getDiscoverProfiles(userId: string, limit = 50, filters?: { gender?: string; ageMin?: number; ageMax?: number; city?: string; intent?: string; familyMode?: boolean }, myProfile?: Profile | null): Promise<Profile[]> {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const [recentSwipes, blocked, deactivatedUsers] = await Promise.all([
      db.select({ targetUserId: matches.targetUserId })
        .from(matches)
        .where(and(eq(matches.userId, userId), gt(matches.createdAt, fourHoursAgo))),
      this.getBlockedUsers(userId),
      db.select({ id: users.id }).from(users)
        .where(or(eq(users.isDeactivated, true), eq(users.isBanned, true))),
    ]);
    const recentlySwipedIds = recentSwipes.map(m => m.targetUserId);

    const excludeIds: string[] = [userId, ...recentlySwipedIds];
    for (const b of blocked) excludeIds.push(b.blockedUserId);
    for (const u of deactivatedUsers) excludeIds.push(u.id);

    const finalExcluded = [...new Set(excludeIds)];

    const conditions: any[] = [
      eq(profiles.isVisible, true),
    ];
    if (finalExcluded.length > 0) {
      conditions.push(notInArray(profiles.userId, finalExcluded));
    }

    if (filters?.gender && filters.gender !== "All") {
      conditions.push(eq(profiles.gender, filters.gender));
    } else {
      const profile = myProfile ?? await this.getProfile(userId);
      if (profile?.interestedIn && profile.interestedIn.length > 0) {
        conditions.push(inArray(profiles.gender, profile.interestedIn));
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

  async getMutualMatches(userId: string, includeArchived = false): Promise<Match[]> {
    const conditions = [eq(matches.userId, userId), eq(matches.isMatched, true), eq(matches.isDeleted, false)];
    if (!includeArchived) {
      conditions.push(eq(matches.isArchived, false));
    }
    return db.select().from(matches)
      .where(and(...conditions))
      .orderBy(desc(matches.createdAt));
  }

  async archiveMatch(matchId: string, userId: string): Promise<void> {
    await db.update(matches)
      .set({ isArchived: true, archivedAt: new Date() })
      .where(and(eq(matches.id, matchId), eq(matches.userId, userId)));
  }

  async unarchiveMatch(matchId: string, userId: string): Promise<void> {
    await db.update(matches)
      .set({ isArchived: false, archivedAt: null })
      .where(and(eq(matches.id, matchId), eq(matches.userId, userId)));
  }

  async deleteMatch(matchId: string, userId: string): Promise<void> {
    await db.update(matches)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(and(eq(matches.id, matchId), eq(matches.userId, userId)));
  }

  async getArchivedMatches(userId: string): Promise<Match[]> {
    return db.select().from(matches)
      .where(and(eq(matches.userId, userId), eq(matches.isMatched, true), eq(matches.isArchived, true), eq(matches.isDeleted, false)))
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

  async getMessageById(id: string): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    if (!msg) return undefined;
    return { ...msg, content: msg.isSystemMessage ? msg.content : decryptMessage(msg.content) };
  }

  async markOneTimeViewed(messageId: string): Promise<void> {
    await db.update(messages)
      .set({ oneTimeViewed: true, oneTimeViewedAt: new Date() })
      .where(eq(messages.id, messageId));
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

  async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  async getActivityLogs(limit = 50, offset = 0, category?: string, userId?: string): Promise<ActivityLog[]> {
    const conditions: any[] = [];
    if (category) conditions.push(eq(activityLogs.category, category));
    if (userId) conditions.push(eq(activityLogs.userId, userId));
    const query = db.select().from(activityLogs);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(activityLogs.createdAt)).limit(limit).offset(offset);
    }
    return query.orderBy(desc(activityLogs.createdAt)).limit(limit).offset(offset);
  }

  async getActivityLogCount(category?: string, userId?: string): Promise<number> {
    const conditions: any[] = [];
    if (category) conditions.push(eq(activityLogs.category, category));
    if (userId) conditions.push(eq(activityLogs.userId, userId));
    const query = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)::int` }).from(activityLogs).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)::int` }).from(activityLogs);
    const [result] = await query;
    return result?.count || 0;
  }

  async getAllProfilesAdmin(limit = 50, offset = 0, genderFilter?: string): Promise<{ profiles: (Profile & { user?: User })[], total: number }> {
    const conditions: any[] = [];
    if (genderFilter && genderFilter !== "all") {
      conditions.push(eq(profiles.gender, genderFilter));
    }

    const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = baseWhere
      ? await db.select({ count: sql<number>`count(*)::int` }).from(profiles).where(baseWhere)
      : await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    const total = countResult?.count || 0;

    const profileRows = baseWhere
      ? await db.select().from(profiles).where(baseWhere).orderBy(desc(profiles.updatedAt)).limit(limit).offset(offset)
      : await db.select().from(profiles).orderBy(desc(profiles.updatedAt)).limit(limit).offset(offset);

    const enriched = await Promise.all(
      profileRows.map(async (p) => {
        const decrypted = decryptProfile(p);
        const [user] = await db.select().from(users).where(eq(users.id, p.userId));
        return { ...decrypted, user: user || undefined };
      })
    );

    return { profiles: enriched, total };
  }

  async getAppSettingWithMeta(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting || undefined;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin;
  }

  async createAdminUser(data: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db.insert(adminUsers).values(data).returning();
    return admin;
  }

  async updateAdminUser(id: string, data: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const [admin] = await db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning();
    return admin;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  }

  async createUserSession(data: InsertUserSession): Promise<UserSession> {
    const [session] = await db.insert(userSessions).values(data).returning();
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const [session] = await db.select().from(userSessions)
      .where(and(eq(userSessions.sessionToken, sessionToken), eq(userSessions.isActive, true)));
    return session;
  }

  async invalidateUserSessions(userId: string, userType: string): Promise<void> {
    await db.update(userSessions)
      .set({ isActive: false })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.userType, userType), eq(userSessions.isActive, true)));
  }

  async invalidateSession(sessionToken: string): Promise<void> {
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async updateSessionActivity(sessionToken: string): Promise<void> {
    await db.update(userSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async getActiveSessions(userId: string, userType: string): Promise<UserSession[]> {
    return db.select().from(userSessions)
      .where(and(eq(userSessions.userId, userId), eq(userSessions.userType, userType), eq(userSessions.isActive, true)))
      .orderBy(desc(userSessions.createdAt));
  }

  async upsertContactShare(data: InsertContactShare): Promise<ContactShare> {
    const existing = await this.getContactShare(data.matchId, data.sharerUserId);
    if (existing) {
      const [updated] = await db.update(contactShares)
        .set({ sharePhone: data.sharePhone, shareEmail: data.shareEmail, updatedAt: new Date() })
        .where(eq(contactShares.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(contactShares).values(data).returning();
    return created;
  }

  async getContactShare(matchId: string, sharerUserId: string): Promise<ContactShare | undefined> {
    const [share] = await db.select().from(contactShares)
      .where(and(eq(contactShares.matchId, matchId), eq(contactShares.sharerUserId, sharerUserId)));
    return share;
  }

  async getContactSharesForMatch(matchId: string): Promise<ContactShare[]> {
    return db.select().from(contactShares).where(eq(contactShares.matchId, matchId));
  }

  async createLocationShare(data: InsertLocationShare): Promise<LocationShare> {
    const [created] = await db.insert(locationShares).values(data).returning();
    return created;
  }

  async updateLocationShare(id: string, data: Partial<LocationShare>): Promise<LocationShare | undefined> {
    const [updated] = await db.update(locationShares).set(data).where(eq(locationShares.id, id)).returning();
    return updated;
  }

  async getActiveLocationShares(matchId: string): Promise<LocationShare[]> {
    const now = new Date();
    const allShares = await db.select().from(locationShares)
      .where(eq(locationShares.matchId, matchId))
      .orderBy(desc(locationShares.createdAt));
    const active: LocationShare[] = [];
    const expiredIds: string[] = [];
    for (const s of allShares) {
      if (s.isLive && s.expiresAt && new Date(s.expiresAt) < now) {
        expiredIds.push(s.id);
      } else {
        active.push(s);
      }
    }
    if (expiredIds.length > 0) {
      for (const id of expiredIds) {
        await db.delete(locationShares).where(eq(locationShares.id, id));
      }
    }
    return active;
  }

  async getLocationShare(id: string): Promise<LocationShare | undefined> {
    const [share] = await db.select().from(locationShares).where(eq(locationShares.id, id));
    return share;
  }

  async deleteLocationShare(id: string): Promise<void> {
    await db.delete(locationShares).where(eq(locationShares.id, id));
  }

  async getMembershipPlans(): Promise<MembershipPlan[]> {
    return db.select().from(membershipPlans).orderBy(membershipPlans.sortOrder);
  }

  async getMembershipPlan(tier: string): Promise<MembershipPlan | undefined> {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.tier, tier));
    return plan;
  }

  async createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan> {
    const [created] = await db.insert(membershipPlans).values(plan).returning();
    return created;
  }

  async updateMembershipPlan(id: string, data: Partial<MembershipPlan>): Promise<MembershipPlan | undefined> {
    const [updated] = await db.update(membershipPlans).set({ ...data, updatedAt: new Date() }).where(eq(membershipPlans.id, id)).returning();
    return updated;
  }

  async deleteMembershipPlan(id: string): Promise<void> {
    await db.delete(membershipPlans).where(eq(membershipPlans.id, id));
  }

  async createMembershipTransaction(txn: InsertMembershipTransaction): Promise<MembershipTransaction> {
    const [created] = await db.insert(membershipTransactions).values(txn).returning();
    return created;
  }

  async getMembershipTransactions(userId?: string, limit = 50): Promise<MembershipTransaction[]> {
    if (userId) {
      return db.select().from(membershipTransactions)
        .where(eq(membershipTransactions.userId, userId))
        .orderBy(desc(membershipTransactions.createdAt))
        .limit(limit);
    }
    return db.select().from(membershipTransactions)
      .orderBy(desc(membershipTransactions.createdAt))
      .limit(limit);
  }

  async getExpiredBotModeUsers(maxHours: number): Promise<Profile[]> {
    const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);
    const result = await db.select().from(profiles)
      .where(and(
        eq(profiles.aiProxyEnabled, true),
        sql`${profiles.botModeActivatedAt} IS NOT NULL`,
        sql`${profiles.botModeActivatedAt} < ${cutoff}`
      ));
    return result;
  }

  async getMembershipRevenue(): Promise<{ total: number; monthly: number; byTier: Record<string, number> }> {
    const allTxns = await db.select().from(membershipTransactions)
      .where(eq(membershipTransactions.status, "completed"));
    const total = allTxns.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyTxns = allTxns.filter(t => t.createdAt && new Date(t.createdAt) > thirtyDaysAgo);
    const monthly = monthlyTxns.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
    const byTier: Record<string, number> = {};
    for (const t of allTxns) {
      byTier[t.planTier] = (byTier[t.planTier] || 0) + parseFloat(t.amount || "0");
    }
    return { total, monthly, byTier };
  }

  async saveQuizResponses(userId: string, responses: InsertQuizResponse[]): Promise<QuizResponse[]> {
    await db.delete(quizResponses).where(eq(quizResponses.userId, userId));
    const saved: QuizResponse[] = [];
    for (const r of responses) {
      const [created] = await db.insert(quizResponses).values({ ...r, userId }).returning();
      saved.push(created);
    }
    return saved;
  }

  async getQuizResponses(userId: string): Promise<QuizResponse[]> {
    return db.select().from(quizResponses).where(eq(quizResponses.userId, userId));
  }

  async deleteQuizResponses(userId: string): Promise<void> {
    await db.delete(quizResponses).where(eq(quizResponses.userId, userId));
  }

  async createChaiDate(data: InsertChaiDate): Promise<ChaiDate> {
    const [created] = await db.insert(chaiDates).values(data).returning();
    return created;
  }

  async getChaiDate(id: string): Promise<ChaiDate | undefined> {
    const [found] = await db.select().from(chaiDates).where(eq(chaiDates.id, id));
    return found;
  }

  async getChaiDateForMatch(matchId: string, status?: string): Promise<ChaiDate | undefined> {
    const conditions = [eq(chaiDates.matchId, matchId)];
    if (status) {
      conditions.push(eq(chaiDates.status, status));
    }
    const [found] = await db.select().from(chaiDates)
      .where(and(...conditions))
      .orderBy(desc(chaiDates.createdAt))
      .limit(1);
    return found;
  }

  async updateChaiDate(id: string, data: Partial<ChaiDate>): Promise<ChaiDate | undefined> {
    const [updated] = await db.update(chaiDates).set(data).where(eq(chaiDates.id, id)).returning();
    return updated;
  }

  async getChaiDateHistory(userId: string): Promise<ChaiDate[]> {
    return db.select().from(chaiDates)
      .where(or(eq(chaiDates.requesterId, userId), eq(chaiDates.recipientId, userId)))
      .orderBy(desc(chaiDates.createdAt))
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
