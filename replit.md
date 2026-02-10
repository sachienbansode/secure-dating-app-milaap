# Milaap - Dating App for India

## Overview
Milaap is a mobile-first dating application designed for the Indian market featuring OTP-based authentication, AES-256-GCM data encryption at rest, AI-assisted messaging, and a respect-based matchmaking system.

## Recent Changes
- 2026-02-10: Full backend implementation with PostgreSQL, encrypted storage, OTP auth, matchmaking, chat, and reporting APIs
- 2026-02-10: Connected all frontend pages to real API endpoints (previously mock data)
- 2026-02-10: Seeded 120 diverse dummy profiles (50M/50F/20T) with Indian cultural data
- 2026-02-10: Rebranded to "Milaap" with Marigold Orange & Rani Pink gradient

## Project Architecture
- **Frontend**: React + Tailwind v4 + TanStack Query + wouter + Framer Motion
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Encryption**: AES-256-GCM for names, bios, and message content

### Key Files
- `shared/schema.ts` - Database schema & Zod validation
- `server/routes.ts` - All API endpoints (/api/auth/*, /api/profile, /api/discover, /api/swipe, /api/matches, /api/messages/*, /api/report)
- `server/storage.ts` - Database CRUD operations with encryption
- `server/encryption.ts` - AES-256-GCM encrypt/decrypt utilities
- `server/seed.ts` - Database seeder for 120 dummy profiles
- `server/db.ts` - Database connection
- `client/src/pages/` - AuthPage, Home (swipe), Matches, Chat, Profile
- `client/src/lib/auth.ts` - Auth API client utilities

### Data Model
- **users**: Auth (phone/email), respect score, ban status
- **profiles**: Encrypted name/bio, age, gender, city, interests, photos, AI settings
- **matches**: Swipe actions (like/pass/superlike), mutual match detection
- **messages**: Encrypted chat content, read receipts
- **reports**: User reporting with auto-ban at 5 reports

## User Preferences
- Indian cultural context throughout (names, cities, interests like Bollywood, Cricket, Chai)
- 50% profiles from Mumbai/Pune, rest from major Indian cities
- Mobile-first UI with Marigold Orange (#F59E0B → #E11D48) gradient
- Tailwind v4 syntax (@plugin, @theme inline)
