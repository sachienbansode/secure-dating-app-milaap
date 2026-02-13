# Milaap - Dating App for India

## Overview
Milaap is a mobile-first dating application tailored for the Indian market. It offers OTP-based authentication, AES-256-GCM data encryption, AI-assisted messaging, photo uploads, respect-based matchmaking, and 12 advanced cultural features. The project aims to provide a secure and culturally relevant dating platform for Indian users, enhancing connection through innovative AI and privacy features.

## User Preferences
- Indian cultural context throughout (names, cities, interests like Bollywood, Cricket, Chai)
- 50% profiles from Mumbai/Pune, rest from major Indian cities
- Gender-appropriate profile images (male photos for males, female for females, neutral for trans)
- Mobile-first UI with Red, Blue & Black dark theme
- Tailwind v4 syntax (@plugin, @theme inline)
- Users should be able to upload their own photos during profile creation

## System Architecture
Milaap uses a React frontend with Tailwind v4, TanStack Query, wouter, and Framer Motion for a dynamic and responsive user experience. The backend is built with Express.js, handling session-based authentication and file uploads via Multer. PostgreSQL with Drizzle ORM serves as the database, ensuring data integrity and efficient management. Core data such as names, bios, and message content are secured with AES-256-GCM encryption. OpenAI integrations power AI features like chat suggestions, proxy replies, tone analysis, and green flag analysis.

The application incorporates a 4-tier membership system (Basic, Silver, Gold, Platinum) with feature gating and pricing. Key features include an interactive dating quiz with cultural context, a sophisticated AI bot proxy with conversation stages, and advanced privacy controls such as "No Screenshot Mode" and an "Enhanced Report & Block" system. User interactions are enhanced with haptic feedback and dynamic location search using OpenStreetMap/Nominatim API. Admin functionalities cover membership management, ad settings, bot mode configurations, and comprehensive activity logging.

## Recent Changes (Feb 2026)
- **DOB Field**: Replaced age number input with Date of Birth date picker; age computed from DOB with 18+ validation
- **SwipeCard Fix**: Added bottom padding (pb-24) and max-height (200px) for expanded content to prevent overlap with action buttons
- **Chai Date Icebreaker**: Added inline answer input on Chai Date screen; answers sent to chat with ☕ prefix
- **Attachments Democratized**: Voice notes and file attachments available to all users (removed membership gate); admin toggle retained; audio MIME types added
- **Server-side Cooldown**: Moved swipe cooldown from localStorage to DB column (users.lastDiscoverDepletedAt); persists across reloads
- **Auto-seed**: 22 profiles total (20 seed + 2 founders: Ithan Hunt +919820098200 and Rekha +917950903063 as Platinum)
- **Expectations Field**: Mandatory profile field with 3 options (Paid benefits/FWB, Strict NO to paid benefits/FWB, Okay with both); "Strict NO" users only see "Strict NO" profiles; others see the other two options; 5 seed profiles marked as "Strict NO", rest as "Okay with both"
- **Chat Optimistic Updates**: Messages appear immediately in chat using TanStack Query optimistic updates with rollback on error
- **Chat Profile Fix**: Dedicated /api/match-detail/:matchId endpoint for reliable profile display in chat

## External Dependencies
- **OpenAI**: Used for AI-assisted messaging, chat suggestions, AI proxy replies, tone analysis, and green flag analysis.
- **OpenStreetMap/Nominatim API**: Integrated for location search functionality in discover filters and hometown selection.
- **Google AdSense**: For displaying advertisements within the application.
- **PostgreSQL**: Primary database for all application data, managed with Drizzle ORM.
- **Multer**: Used for handling photo uploads to the server.