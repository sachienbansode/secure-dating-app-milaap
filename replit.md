# Milaap - Dating App for India

## Overview
Milaap is a mobile-first dating application designed for the Indian market featuring OTP-based authentication, AES-256-GCM data encryption at rest, AI-assisted messaging via OpenAI, photo uploads, and a respect-based matchmaking system.

## Recent Changes
- 2026-02-10: Added authentic Indian stock images - 10 male, 10 female, 3 neutral portraits
- 2026-02-10: Added photo upload feature (multer) for profile creation/editing (up to 6 photos)
- 2026-02-10: Fixed overlapping UI in matches page, improved layout and spacing
- 2026-02-10: Added discover preference filters (gender, age range, city)
- 2026-02-10: Added expandable profile detail view on swipe cards
- 2026-02-10: Integrated OpenAI for AI persona message suggestions in chat
- 2026-02-10: Added report user UI with reason selection in chat
- 2026-02-10: Full backend implementation with PostgreSQL, encrypted storage, OTP auth, matchmaking, chat, and reporting APIs
- 2026-02-10: Seeded 120 diverse dummy profiles (50M/50F/20T) with gender-appropriate Indian photos

## Project Architecture
- **Frontend**: React + Tailwind v4 + TanStack Query + wouter + Framer Motion
- **Backend**: Express.js with session-based auth + multer for file uploads
- **Database**: PostgreSQL with Drizzle ORM
- **Encryption**: AES-256-GCM for names, bios, and message content
- **AI**: OpenAI via Replit AI Integrations (gpt-4o-mini for chat suggestions)

### Key Files
- `shared/schema.ts` - Database schema & Zod validation
- `server/routes.ts` - All API endpoints (/api/auth/*, /api/profile, /api/upload-photo, /api/discover, /api/swipe, /api/matches, /api/messages/*, /api/report, /api/ai/suggest)
- `server/storage.ts` - Database CRUD operations with encryption
- `server/encryption.ts` - AES-256-GCM encrypt/decrypt utilities
- `server/seed.ts` - Database seeder for 120 dummy profiles with gender-specific photos
- `server/db.ts` - Database connection
- `client/src/pages/` - AuthPage, Home (swipe with filters), Matches, Chat (with AI & report), Profile (with photo upload)
- `client/src/lib/auth.ts` - Auth API client utilities

### Data Model
- **users**: Auth (phone/email), respect score, ban status
- **profiles**: Encrypted name/bio, age, gender, city, interests, photos (array), AI settings
- **matches**: Swipe actions (like/pass/superlike), mutual match detection
- **messages**: Encrypted chat content, AI-generated flag, read receipts
- **reports**: User reporting with auto-ban at 5 reports

## User Preferences
- Indian cultural context throughout (names, cities, interests like Bollywood, Cricket, Chai)
- 50% profiles from Mumbai/Pune, rest from major Indian cities
- Gender-appropriate profile images (male photos for males, female for females, neutral for trans)
- Mobile-first UI with Marigold Orange (#F59E0B -> #E11D48) gradient
- Tailwind v4 syntax (@plugin, @theme inline)
- Users should be able to upload their own photos during profile creation
