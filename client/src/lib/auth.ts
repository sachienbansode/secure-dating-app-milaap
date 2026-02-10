import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  respectScore: number;
  isVerified?: boolean;
  dailyLikesLimit?: number;
  dailyLikesUsed?: number;
  isOnline?: boolean;
  lastSeenAt?: string;
}

export interface AuthProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  city: string;
  location: string;
  interests: string[];
  photos: string[];
  isVisible: boolean;
  aiPersonaEnabled: boolean;
  aiTone: string;
  aiLanguage: string;
  aiProxyEnabled: boolean;
  aiChatPace: string;
  aiBoundaries: string[];
  intent: string | null;
  intentLockedAt: string | null;
  intentLockBroken: boolean;
  familyMode: boolean;
  noScreenshotMode: boolean;
  festivalPrefs: string[] | null;
  hometownForFestivals: string | null;
  greenFlagStories: {prompt: string; answer: string}[] | null;
  dateReadiness: string | null;
  photoAuthenticityScore: number | null;
  photoVerifiedAt: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  hasProfile?: boolean;
  profile: AuthProfile | null;
}

export async function requestOtp(data: { phone?: string; email?: string }) {
  const res = await apiRequest("POST", "/api/auth/request-otp", data);
  return res.json();
}

export async function verifyOtp(data: { phone?: string; email?: string; otp: string }) {
  const res = await apiRequest("POST", "/api/auth/verify-otp", data);
  return res.json() as Promise<AuthResponse>;
}

export async function getMe(): Promise<AuthResponse | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function logout() {
  await apiRequest("POST", "/api/auth/logout");
}
