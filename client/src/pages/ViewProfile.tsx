import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle, MapPin, Heart, Sparkles, Shield, CheckCircle, Mic, Users, Clock, X, ChevronLeft, ChevronRight, Maximize2, Crown, Lock, Star, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { getMe } from "@/lib/auth";

function getCompatibility(myId: string, theirId: string): number {
  let hash = 0;
  const combined = myId < theirId ? myId + theirId : theirId + myId;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return 85 + (Math.abs(hash) % 11);
}

const INTENT_ICONS: Record<string, string> = { Casual: "☕", Dating: "💕", Serious: "💎", Marriage: "💍" };
const DATE_READINESS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  "Chat-only": { label: "Chat only", color: "text-blue-400", icon: "💬" },
  "Voice-ready": { label: "Voice ready", color: "text-green-400", icon: "🎙️" },
  "Meet-ready": { label: "Ready to meet", color: "text-purple-400", icon: "🤝" },
};

function FullScreenPhoto({ photos, currentIndex, onClose, onNext, onPrev }: {
  photos: string[]; currentIndex: number; onClose: () => void; onNext: () => void; onPrev: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      data-testid="fullscreen-photo-viewer"
    >
      <div className="flex items-center justify-between p-4 z-10">
        <span className="text-white/70 text-sm font-medium">{currentIndex + 1} / {photos.length}</span>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" data-testid="button-close-fullscreen">
          <X size={20} className="text-white" />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          src={photos[currentIndex]}
          alt="Profile photo"
          className="max-w-full max-h-full object-contain"
        />
        {photos.length > 1 && (
          <>
            <button onClick={onPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center" data-testid="button-fullscreen-prev">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button onClick={onNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center" data-testid="button-fullscreen-next">
              <ChevronRight size={24} className="text-white" />
            </button>
          </>
        )}
      </div>
      <div className="flex justify-center gap-2 p-4">
        {photos.map((_: string, i: number) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-white scale-125" : "bg-white/30"}`} />
        ))}
      </div>
    </motion.div>
  );
}

export default function ViewProfile() {
  const [, setLocation] = useLocation();
  const { userId } = useParams<{ userId: string }>();
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId,
  });

  const { data: matches } = useQuery<any[]>({
    queryKey: ["/api/matches"],
    enabled: !!session?.user,
  });

  const { data: myMembership } = useQuery<any>({
    queryKey: ["/api/membership/my"],
    enabled: !!session?.user,
  });

  const { data: horoscope } = useQuery<any>({
    queryKey: [`/api/horoscope/${userId}`],
    enabled: !!userId && !!session?.user,
  });

  const matchWithUser = matches?.find(
    (m: any) => m.isMatched && (m.userId === userId || m.targetUserId === userId)
  );

  const isPremiumChat = myMembership?.tier === "gold" || myMembership?.tier === "platinum";
  const canDirectChat = isPremiumChat && !matchWithUser && session?.user?.id !== userId;

  const [directChatError, setDirectChatError] = useState<string | null>(null);

  const directChatMutation = useMutation({
    mutationFn: async () => {
      setDirectChatError(null);
      const res = await fetch("/api/direct-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to start direct chat");
      }
      return data;
    },
    onSuccess: (data: any) => {
      if (data.matchId) {
        setLocation(`/chat/${data.matchId}`);
      }
    },
    onError: (error: Error) => {
      setDirectChatError(error.message);
    },
  });

  const handleChat = () => {
    if (matchWithUser) {
      setLocation(`/chat/${matchWithUser.id}`);
    } else if (canDirectChat) {
      directChatMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-lg font-heading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Profile not found</p>
        <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back-not-found">
          <ArrowLeft size={18} className="mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const photos = profile.photos?.length ? profile.photos : ["/profiles/generic_indian_1.jpg"];
  const isCouple = profile.gender === "Couple";
  const displayName = isCouple && profile.partner2Name
    ? `${profile.name} & ${profile.partner2Name}`
    : profile.name;
  const displayAge = isCouple && profile.partner2Age
    ? `${profile.age} & ${profile.partner2Age}`
    : profile.age;

  return (
    <div className="h-full flex flex-col bg-background">
      <AnimatePresence>
        {showFullScreen && (
          <FullScreenPhoto
            photos={photos}
            currentIndex={currentPhoto}
            onClose={() => setShowFullScreen(false)}
            onNext={() => setCurrentPhoto(p => (p + 1) % photos.length)}
            onPrev={() => setCurrentPhoto(p => (p - 1 + photos.length) % photos.length)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="relative w-full aspect-square max-h-[40vh] bg-black">
          <motion.img
            key={currentPhoto}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={photos[currentPhoto]}
            alt={displayName}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setShowFullScreen(true)}
          />

          <div className="absolute top-0 left-0 right-0 flex">
            {photos.map((_: string, i: number) => (
              <div key={i} className="flex-1 h-1 mx-0.5 mt-2 rounded-full overflow-hidden bg-white/30">
                <div className={`h-full rounded-full transition-all ${i === currentPhoto ? "bg-white w-full" : "w-0"}`} />
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <>
              <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={() => setCurrentPhoto(p => Math.max(0, p - 1))} data-testid="button-photo-prev" />
              <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={() => setCurrentPhoto(p => Math.min(photos.length - 1, p + 1))} data-testid="button-photo-next" />
            </>
          )}

          <button onClick={() => window.history.back()} className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="button-back-profile">
            <ArrowLeft size={20} className="text-white" />
          </button>

          <button onClick={() => setShowFullScreen(true)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="button-fullscreen-photo">
            <Maximize2 size={18} className="text-white" />
          </button>

          {profile.isOnline && (
            <div className="absolute bottom-4 right-4 z-20 px-3 py-1 rounded-full text-xs font-medium text-green-400 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online
            </div>
          )}
        </div>

        <div className="px-5 -mt-6 relative z-10">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-lg">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-heading font-bold text-foreground" data-testid="text-profile-name">{displayName}, {displayAge}</h1>
                  {profile.isVerified && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }} data-testid="badge-verified">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                  )}
                </div>
                {!profile.isOnline && profile.lastSeenAt && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Clock size={12} />
                    Last seen {new Date(profile.lastSeenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {profile.isOnline && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Online now
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin size={13} className="text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">{profile.city}</span>
                  <span className="text-muted-foreground text-xs mx-1">·</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{profile.gender}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {session?.user?.id && userId && session.user.id !== userId && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-500/30" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.15), rgba(168,85,247,0.15))" }} data-testid="text-match-compatibility">
                    <Heart size={13} className="text-pink-400" />
                    <span className="text-sm font-bold text-pink-400">{getCompatibility(session.user.id, userId)}%</span>
                    <span className="text-[10px] text-pink-400/70">Match</span>
                  </div>
                )}
                {profile.respectScore != null && (
                  <div className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                    <Shield size={13} className="text-green-400" />
                    <span className="text-sm font-bold text-green-400" data-testid="text-respect-score">{profile.respectScore}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {profile.intent && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                  {INTENT_ICONS[profile.intent] || "💕"} {profile.intent}
                </span>
              )}
              {profile.dateReadiness && DATE_READINESS_LABELS[profile.dateReadiness] && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${DATE_READINESS_LABELS[profile.dateReadiness].color} bg-current/10 border border-current/20`} style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                  {DATE_READINESS_LABELS[profile.dateReadiness].icon} {DATE_READINESS_LABELS[profile.dateReadiness].label}
                </span>
              )}
              {profile.datingStyle && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles size={10} className="inline mr-1" />{profile.datingStyle}
                </span>
              )}
              {profile.familyMode && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                  <Heart size={10} className="inline mr-1" />Family Mode
                </span>
              )}
              {profile.photoVerifiedAt && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <CheckCircle size={10} className="inline mr-1" />Verified {profile.photoAuthenticityScore ? `${profile.photoAuthenticityScore}%` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 mt-4 space-y-4">
          {profile.bio && (
            <div className="bg-card rounded-2xl p-4 border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">About</h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-profile-bio">{profile.bio}</p>
            </div>
          )}

          {profile.interests?.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string) => (
                  <span key={interest} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20" data-testid={`tag-interest-${interest}`}>
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {horoscope && (
            <div className="bg-card rounded-2xl p-4 border border-purple-500/20" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))" }} data-testid="card-horoscope">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-purple-400" />
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Daily Horoscope</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-medium">{horoscope.zodiac}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">{horoscope.text}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-pink-500/10 rounded-xl p-2 text-center border border-pink-500/15">
                  <Heart size={12} className="text-pink-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Love Tip</p>
                  <p className="text-xs text-pink-300 font-medium mt-0.5">{horoscope.love}</p>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-2 text-center border border-yellow-500/15">
                  <Sun size={12} className="text-yellow-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Lucky</p>
                  <p className="text-xs text-yellow-300 font-medium mt-0.5">{horoscope.lucky}</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-2 text-center border border-blue-500/15">
                  <Sparkles size={12} className="text-blue-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Mood</p>
                  <p className="text-xs text-blue-300 font-medium mt-0.5">{horoscope.mood}</p>
                </div>
              </div>
            </div>
          )}

          {isCouple && profile.partner2Name && (
            <div className="bg-card rounded-2xl p-4 border border-blue-500/20">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Couple Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
                  <p className="text-xs text-muted-foreground mb-1">Partner 1</p>
                  <p className="text-sm font-bold text-foreground">{profile.name}, {profile.age}</p>
                  <p className="text-xs text-muted-foreground">{profile.gender !== "Couple" ? profile.gender : "—"}</p>
                </div>
                <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
                  <p className="text-xs text-muted-foreground mb-1">Partner 2</p>
                  <p className="text-sm font-bold text-foreground">{profile.partner2Name}, {profile.partner2Age}</p>
                  <p className="text-xs text-muted-foreground">{profile.partner2Gender || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {profile.respectScore != null && (
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-green-400" />
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Respect Score</h3>
                </div>
                <span className="text-sm font-bold text-green-400">{profile.respectScore}/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all" style={{ width: `${profile.respectScore}%` }} />
              </div>
            </div>
          )}

          {profile.greenFlagStories?.length > 0 && profile.greenFlagStories.some((s: any) => s.answer) && (
            <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Green Flags</h3>
              </div>
              {profile.greenFlagStories.filter((s: any) => s.answer).map((story: any, i: number) => (
                <div key={i} className="bg-muted rounded-xl p-3">
                  <p className="text-xs font-medium text-primary mb-1">"{story.prompt}"</p>
                  <p className="text-sm text-foreground">{story.answer}</p>
                </div>
              ))}
            </div>
          )}

          {profile.festivalPrefs && profile.festivalPrefs.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Festival Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {profile.festivalPrefs.map((f: string) => (
                  <span key={f} className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">🎉 {f}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 z-30" style={{ background: "linear-gradient(to top, hsl(var(--background)) 80%, transparent)" }}>
        <div className="max-w-lg mx-auto">
          {matchWithUser ? (
            <Button
              onClick={handleChat}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white shadow-xl"
              style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
              data-testid="button-chat-with-user"
            >
              <MessageCircle size={16} className="mr-2" /> Chat with {profile.name}
            </Button>
          ) : canDirectChat ? (
            <div className="space-y-2">
              {directChatError && (
                <div className="text-xs text-red-400 text-center p-2 rounded-xl bg-red-500/10 border border-red-500/20" data-testid="text-direct-chat-error">
                  {directChatError}
                </div>
              )}
              <Button
                onClick={handleChat}
                disabled={directChatMutation.isPending}
                className="w-full h-11 rounded-2xl font-bold text-sm text-white shadow-xl"
                style={{ background: "linear-gradient(135deg, #F59E0B, #8B5CF6)" }}
                data-testid="button-direct-chat"
              >
                <Crown size={16} className="mr-2" />
                {directChatMutation.isPending ? "Connecting..." : `Chat with ${profile.name}`}
              </Button>
            </div>
          ) : session?.user?.id !== userId ? (
            <div className="bg-card rounded-2xl border border-border p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Lock size={16} />
                <span>Match with {profile.name} to start chatting</span>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Upgrade to <span className="text-yellow-400 font-semibold">Gold</span> or <span className="text-purple-400 font-semibold">Platinum</span> to chat directly
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
