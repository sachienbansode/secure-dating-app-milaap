import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, MapPin, Heart, Sparkles, Shield, CheckCircle, Mic, Users, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe } from "@/lib/auth";

const INTENT_ICONS: Record<string, string> = { Casual: "☕", Dating: "💕", Serious: "💎", Marriage: "💍" };
const DATE_READINESS_LABELS: Record<string, { label: string; color: string }> = {
  "Chat-only": { label: "Chat only", color: "text-blue-400" },
  "Voice-ready": { label: "Voice ready", color: "text-green-400" },
  "Meet-ready": { label: "Ready to meet", color: "text-purple-400" },
};

export default function ViewProfile() {
  const [, setLocation] = useLocation();
  const { userId } = useParams<{ userId: string }>();
  const [currentPhoto, setCurrentPhoto] = useState(0);

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

  const matchWithUser = matches?.find(
    (m: any) => m.isMatched && (m.userId === userId || m.targetUserId === userId)
  );

  const handleChat = () => {
    if (matchWithUser) {
      setLocation(`/chat/${matchWithUser.id}`);
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

  const photos = profile.photos?.length ? profile.photos : ["/profiles/neutral1.jpg"];
  const isCouple = profile.gender === "Couple";
  const displayName = isCouple && profile.partner2Name
    ? `${profile.name} & ${profile.partner2Name}`
    : profile.name;
  const displayAge = isCouple && profile.partner2Age
    ? `${profile.age} & ${profile.partner2Age}`
    : profile.age;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="relative w-full aspect-[3/4] max-h-[55vh] bg-black">
        <motion.img
          key={currentPhoto}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          src={photos[currentPhoto]}
          alt={displayName}
          className="w-full h-full object-cover"
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
            <button
              className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
              onClick={() => setCurrentPhoto((p) => Math.max(0, p - 1))}
              data-testid="button-photo-prev"
            />
            <button
              className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
              onClick={() => setCurrentPhoto((p) => Math.min(photos.length - 1, p + 1))}
              data-testid="button-photo-next"
            />
          </>
        )}

        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
          data-testid="button-back-profile"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        {profile.isOnline && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full text-xs font-medium text-green-400 flex items-center gap-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-20">
          <h1 className="text-3xl font-heading font-bold text-white" data-testid="text-profile-name">{displayName}, {displayAge}</h1>
          <div className="flex items-center gap-2 mt-1">
            <MapPin size={14} className="text-white/70" />
            <span className="text-white/70 text-sm">{profile.city}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-28">
        {profile.intent && (
          <div className="flex items-center gap-2">
            <span className="text-lg">{INTENT_ICONS[profile.intent] || "💕"}</span>
            <span className="text-sm font-medium text-foreground">Looking for {profile.intent}</span>
          </div>
        )}

        {profile.dateReadiness && DATE_READINESS_LABELS[profile.dateReadiness] && (
          <div className="flex items-center gap-2">
            {profile.dateReadiness === "Chat-only" && <MessageCircle size={14} className="text-blue-400" />}
            {profile.dateReadiness === "Voice-ready" && <Mic size={14} className="text-green-400" />}
            {profile.dateReadiness === "Meet-ready" && <Users size={14} className="text-purple-400" />}
            <span className={`text-sm font-medium ${DATE_READINESS_LABELS[profile.dateReadiness].color}`}>
              {DATE_READINESS_LABELS[profile.dateReadiness].label}
            </span>
          </div>
        )}

        {profile.datingStyle && (
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-sm font-medium text-purple-300" data-testid="text-dating-style">{profile.datingStyle}</span>
          </div>
        )}

        {profile.bio && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-bold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-profile-bio">{profile.bio}</p>
          </div>
        )}

        {profile.interests?.length > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-bold text-foreground mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest: string) => (
                <span key={interest} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20" data-testid={`tag-interest-${interest}`}>
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.respectScore != null && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-green-400" />
                <h3 className="text-sm font-bold text-foreground">Respect Score</h3>
              </div>
              <span className="text-lg font-bold text-green-400" data-testid="text-respect-score">{profile.respectScore}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${profile.respectScore}%` }} />
            </div>
          </div>
        )}

        {profile.photoAuthenticityScore != null && profile.photoAuthenticityScore > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold text-foreground">Photo Verified</h3>
              </div>
              <span className="text-sm font-bold text-blue-400">{profile.photoAuthenticityScore}%</span>
            </div>
          </div>
        )}

        {profile.greenFlagStories?.length > 0 && profile.greenFlagStories.some((s: any) => s.answer) && (
          <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400" />
              <h3 className="text-sm font-bold text-foreground">Green Flags</h3>
            </div>
            {profile.greenFlagStories.filter((s: any) => s.answer).map((story: any, i: number) => (
              <div key={i} className="bg-muted rounded-xl p-3">
                <p className="text-xs font-medium text-primary mb-1">{story.prompt}</p>
                <p className="text-sm text-foreground">{story.answer}</p>
              </div>
            ))}
          </div>
        )}

        {profile.familyMode && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-xl border border-green-800">
            <Heart size={14} className="text-green-400" />
            <span className="text-xs font-medium text-green-400">Family-Aware Mode Enabled</span>
          </div>
        )}

        {!profile.isOnline && profile.lastSeenAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            Last seen {new Date(profile.lastSeenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {matchWithUser && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-30" style={{ background: "linear-gradient(to top, hsl(var(--background)) 80%, transparent)" }}>
          <div className="max-w-lg mx-auto">
            <Button
              onClick={handleChat}
              className="w-full h-14 rounded-2xl font-bold text-lg text-white shadow-xl"
              style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
              data-testid="button-chat-with-user"
            >
              <MessageCircle size={20} className="mr-2" /> Chat with {profile.name}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
