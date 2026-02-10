# Milaap - Dating App for India

## Overview
Milaap is a mobile-first dating application designed for the Indian market featuring OTP-based authentication, AES-256-GCM data encryption at rest, AI-assisted messaging via OpenAI, photo uploads, respect-based matchmaking, and 12 advanced cultural features.

## Recent Changes
- 2026-02-10: Added comprehensive activity logging system (18+ logged actions across auth/profile/chat/moderation/admin/security/privacy), admin viewer with category filtering and pagination
- 2026-02-10: Added Terms & Conditions system: mandatory acceptance during OTP verification, modal viewer, admin editor via Profile > Admin > Terms & Conditions, termsAcceptedAt tracking
- 2026-02-10: Added "Interested In" gender preference multiselect (Male/Female/Trans/Couple) to profile form, auto-filters discover profiles by preference, added Couple as gender option
- 2026-02-10: Implemented Features 8-12: Chat Cool-Down (tone escalation detection, 5-min pauses, repeat offender bans), Enhanced Report & Block (AI chat analysis, auto-deactivation, blocking), Date Readiness Indicator (Chat-only/Voice-ready/Meet-ready), No-Phone-Number Culture (AI blocks contact sharing, mutual consent unlock with 24h cool-off), Photo Authenticity Score (AI verification with scored badges)
- 2026-02-10: Added admin Feature Toggles panel for all 5 new features plus screenshot protection
- 2026-02-10: Added welcome tagline overlay on login with chime sound, animation, and admin-configurable taglines via Profile > Admin > Welcome Taglines
- 2026-02-10: Implemented 7 advanced features: AI Proxy Presence Mode, 30-Day Intent Lock, Respect Meter, No Screenshot Mode, Family-Aware Dating Mode, Festival Compatibility Boosts, Green Flag Stories
- 2026-02-10: Re-seeded 120 profiles with intent, green flag stories, festival preferences, family mode
- 2026-02-10: Added screenshot alert authorization check for match ownership
- 2026-02-10: Added authentic Indian stock images - 10 male, 10 female, 3 neutral portraits
- 2026-02-10: Added photo upload feature (multer) for profile creation/editing (up to 6 photos)
- 2026-02-10: Fixed overlapping UI in matches page, improved layout and spacing
- 2026-02-10: Added discover preference filters (gender, age range, city)
- 2026-02-10: Added expandable profile detail view on swipe cards
- 2026-02-10: Integrated OpenAI for AI persona message suggestions in chat
- 2026-02-10: Added report user UI with reason selection in chat
- 2026-02-10: Full backend implementation with PostgreSQL, encrypted storage, OTP auth, matchmaking, chat, and reporting APIs

## Project Architecture
- **Frontend**: React + Tailwind v4 + TanStack Query + wouter + Framer Motion
- **Backend**: Express.js with session-based auth + multer for file uploads
- **Database**: PostgreSQL with Drizzle ORM
- **Encryption**: AES-256-GCM for names, bios, and message content
- **AI**: OpenAI via Replit AI Integrations (gpt-4o-mini for chat suggestions, proxy replies, tone analysis, green flag analysis)

### Key Files
- `shared/schema.ts` - Database schema & Zod validation (users, profiles, matches, messages, reports, screenshot_alerts, app_settings)
- `server/routes.ts` - All API endpoints including 7 new feature endpoints
- `server/storage.ts` - Database CRUD operations with encryption
- `server/encryption.ts` - AES-256-GCM encrypt/decrypt utilities
- `server/seed.ts` - Database seeder for 120 dummy profiles with all new fields
- `server/db.ts` - Database connection
- `client/src/pages/` - AuthPage, Home (swipe with filters + badges), Matches, Chat (with AI proxy + screenshot protection + cooldown + phone unlock), Profile (with all 12 feature settings)
- `client/src/lib/auth.ts` - Auth API client utilities

### Advanced Features
1. **AI Proxy Presence Mode**: Auto-replies when offline using AI, pace/language/boundary learning, "AI-assisted" tag
2. **30-Day Intent Lock**: Casual/Dating/Serious/Marriage selection, 30-day lock, -10 respect and -15 likes penalty for breaking
3. **Visible Respect Meter**: Score from reports (-5), tone analysis (-3 disrespectful), drop behavior; affects daily likes (base 50, min 10)
4. **No Screenshot Mode**: CSS user-select protection, PrintScreen/Cmd+Shift detection, visibility change detection, alert notifications
5. **Family-Aware Dating Mode**: Regex inappropriate language filter, matches only other family-mode users when enabled
6. **Festival Compatibility Boosts**: Time-based detection (Diwali Oct-Nov, Holi Mar-Apr, etc.), festival preference matching, hometown proximity
7. **Green Flag Stories**: 3 micro-prompts ("Something I'll never joke about", "My idea of respect", "One thing I'm healing from"), AI green flag analysis
8. **Chat Cool-Down System**: AI tone escalation detection every 5 messages, 5-min cooldown pauses, respectful suggestion prompts, repeat offender bans after 5 violations
9. **Enhanced Report & Block**: AI chat history analysis, severity-based auto-deactivation, immediate blocking with redirect, email notification simulation
10. **Date Readiness Indicator**: Chat-only/Voice-ready/Meet-ready levels with icons, shown in chat header, profile view, and discover cards
11. **No-Phone-Number Culture**: AI/regex blocks phone numbers/WhatsApp/contact sharing, mutual consent unlock with 24h cool-off, unlock request/respond UI in chat
12. **Photo Authenticity Score**: AI photo verification with scored badges (0-100), verified tag on discover cards and profile, authenticity progress bar

### Data Model
- **users**: Auth (phone/email), respect score, ban status, isOnline, lastSeenAt, dailyLikes, isDeactivated, chatSuspendedUntil, chatBanned
- **profiles**: Encrypted name/bio, age, gender, city, interests, photos, AI settings, intent (locked 30 days), familyMode, festivalPrefs, hometownForFestivals, greenFlagStories, noScreenshotMode, aiProxyEnabled, aiChatPace, aiBoundaries, dateReadiness, photoAuthenticityScore, photoVerifiedAt
- **matches**: Swipe actions (like/pass/superlike), mutual match detection
- **messages**: Encrypted chat content, AI-generated flag, isAiProxy flag, read receipts
- **reports**: User reporting with auto-ban at 5 reports, AI chat analysis, actionTaken tracking
- **screenshot_alerts**: Match-based screenshot detection records
- **app_settings**: Admin configurable settings (6 feature toggles + screenshot protection + welcome taglines)
- **chat_cooldowns**: Per-user cooldown tracking with violation counts
- **phone_unlock_requests**: Mutual consent phone number sharing with 24h cool-off
- **blocked_users**: User blocking records

### API Endpoints (New)
- `POST /api/profile/force-intent` - Break intent lock with penalties
- `POST /api/ai/proxy-reply` - AI auto-reply for offline users
- `POST /api/ai/analyze-tone` - Respect meter tone analysis
- `POST /api/ai/analyze-green-flags` - Green flag story analysis
- `POST /api/screenshot-alert` - Report screenshot detection
- `GET /api/screenshot-alerts/:matchId` - Get alerts for a match
- `GET /api/festival-status` - Current festival season status
- `GET /api/app-settings` - Admin settings
- `POST /api/app-settings` - Update admin settings
- `POST /api/chat-cooldown/check` - Check/enforce chat cooldown
- `GET /api/chat-cooldown/status/:matchId` - Get cooldown status for match
- `POST /api/report-enhanced` - Enhanced report with AI chat analysis
- `POST /api/block-user` - Block a user
- `POST /api/profile/date-readiness` - Update date readiness level
- `POST /api/phone-unlock/request` - Request phone number sharing
- `POST /api/phone-unlock/respond` - Accept/reject phone unlock
- `GET /api/phone-unlock/status/:matchId` - Get unlock status
- `POST /api/photo-verify` - AI photo authenticity verification

## User Preferences
- Indian cultural context throughout (names, cities, interests like Bollywood, Cricket, Chai)
- 50% profiles from Mumbai/Pune, rest from major Indian cities
- Gender-appropriate profile images (male photos for males, female for females, neutral for trans)
- Mobile-first UI with Marigold Orange (#F59E0B -> #E11D48) gradient
- Tailwind v4 syntax (@plugin, @theme inline)
- Users should be able to upload their own photos during profile creation
