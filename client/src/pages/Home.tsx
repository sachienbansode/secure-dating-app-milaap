import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/layout/BottomNav";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { MapPin, Info, Heart, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe } from "@/lib/auth";

interface DiscoverProfile {
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
}

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: profiles = [], isLoading } = useQuery<DiscoverProfile[]>({
    queryKey: ["/api/discover"],
    enabled: !!session?.user,
  });

  const swipeMutation = useMutation({
    mutationFn: async ({ targetUserId, action }: { targetUserId: string; action: string }) => {
      const res = await apiRequest("POST", "/api/swipe", { targetUserId, action });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.isMutualMatch) {
        setMatchPopup(data.match.targetUserId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
  });

  useEffect(() => {
    if (!checkingSession && !session?.user) {
      setLocation("/");
    }
  }, [checkingSession, session, setLocation]);

  if (checkingSession || !session?.user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const activeProfiles = profiles.filter((p) => !dismissed.includes(p.userId));

  const handleSwipe = (userId: string, action: "like" | "pass" | "superlike") => {
    setDismissed((prev) => [...prev, userId]);
    swipeMutation.mutate({ targetUserId: userId, action });
  };

  const handleRefresh = () => {
    setDismissed([]);
    queryClient.invalidateQueries({ queryKey: ["/api/discover"] });
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <header className="px-6 pt-6 pb-2 flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-heading font-bold text-brand-gradient" data-testid="text-discover-title">Discover</h1>
          <p className="text-xs text-muted-foreground">{session.profile?.city || "India"}</p>
        </div>
        <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
          <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse" />
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {isLoading ? (
          <div className="text-muted-foreground animate-pulse">Loading profiles...</div>
        ) : (
          <AnimatePresence>
            {activeProfiles.length > 0 ? (
              activeProfiles.slice(0, 5).reverse().map((profile, index) => {
                const isFront = index === Math.min(activeProfiles.length, 5) - 1;
                return (
                  <SwipeCard
                    key={profile.userId}
                    profile={profile}
                    isFront={isFront}
                    onSwipe={(action) => handleSwipe(profile.userId, action)}
                  />
                );
              })
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-bold mb-2" data-testid="text-no-profiles">No more profiles</h3>
                <p className="text-muted-foreground">Check back later for new matches in your area.</p>
                <Button
                  data-testid="button-refresh"
                  onClick={handleRefresh}
                  className="mt-6"
                  variant="outline"
                >
                  Refresh Profiles
                </Button>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {matchPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8" onClick={() => setMatchPopup(null)}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-heading font-bold text-brand-gradient mb-2">It's a Match!</h2>
            <p className="text-muted-foreground mb-6">You both liked each other. Start a conversation!</p>
            <div className="space-y-3">
              <Button
                data-testid="button-send-message"
                className="w-full bg-brand-gradient h-12 rounded-2xl font-bold"
                onClick={() => { setMatchPopup(null); setLocation("/matches"); }}
              >
                Send a Message
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setMatchPopup(null)}
              >
                Keep Swiping
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function SwipeCard({ profile, isFront, onSwipe }: { profile: DiscoverProfile; isFront: boolean; onSwipe: (action: "like" | "pass" | "superlike") => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [20, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -150], [0, 1]);

  const photoUrl = profile.photos?.[0] || "/profiles/generic_indian_1.jpg";

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe("like");
    } else if (info.offset.x < -100) {
      onSwipe("pass");
    }
  };

  return (
    <motion.div
      data-testid={`card-profile-${profile.userId}`}
      style={{
        x: isFront ? x : 0,
        rotate: isFront ? rotate : 0,
        zIndex: isFront ? 10 : 0,
        scale: isFront ? 1 : 0.95,
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: isFront ? 1 : 0.9, opacity: 1, y: isFront ? 0 : 10 }}
      exit={{ x: x.get() < 0 ? -500 : 500, opacity: 0, transition: { duration: 0.2 } }}
      className="absolute w-full h-full max-h-[600px] max-w-sm"
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl bg-white select-none">
        <img
          src={photoUrl}
          alt={profile.name}
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

        {isFront && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 right-8 border-4 border-green-500 rounded-lg px-4 py-2 rotate-12 bg-black/20 backdrop-blur-sm z-20">
              <span className="text-green-500 font-bold text-2xl tracking-widest uppercase">Like</span>
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 left-8 border-4 border-red-500 rounded-lg px-4 py-2 -rotate-12 bg-black/20 backdrop-blur-sm z-20">
              <span className="text-red-500 font-bold text-2xl tracking-widest uppercase">Nope</span>
            </motion.div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-heading font-bold" data-testid={`text-name-${profile.userId}`}>{profile.name}, {profile.age}</h2>
          </div>
          <div className="flex items-center text-white/80 text-sm mb-4">
            <MapPin size={14} className="mr-1" />
            <span>{profile.location}</span>
          </div>
          {profile.bio && (
            <p className="text-white/90 line-clamp-2 mb-4 font-light">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {(profile.interests || []).map((interest: string) => (
              <span key={interest} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/20">
                {interest}
              </span>
            ))}
          </div>
        </div>

        {isFront && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 pointer-events-auto z-20 px-6">
            <Button
              data-testid="button-pass"
              size="icon"
              variant="outline"
              className="w-14 h-14 rounded-full bg-white/90 backdrop-blur border-red-200 shadow-lg hover:bg-red-50"
              onClick={() => onSwipe("pass")}
            >
              <X className="text-red-500" size={24} />
            </Button>
            <Button
              data-testid="button-superlike"
              size="icon"
              variant="outline"
              className="w-12 h-12 rounded-full bg-white/90 backdrop-blur border-blue-200 shadow-lg hover:bg-blue-50 self-center"
              onClick={() => onSwipe("superlike")}
            >
              <Star className="text-blue-500 fill-blue-500" size={18} />
            </Button>
            <Button
              data-testid="button-like"
              size="icon"
              className="w-14 h-14 rounded-full bg-green-500 shadow-lg hover:bg-green-600 border-0"
              onClick={() => onSwipe("like")}
            >
              <Heart className="text-white fill-white" size={24} />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
