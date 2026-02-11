import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/layout/BottomNav";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { MapPin, Info, Heart, X, Star, SlidersHorizontal, ChevronDown, Shield, Lock, Leaf, PartyPopper, FlagIcon, ShieldCheck, MessageCircle, Mic, Users, Eye } from "lucide-react";
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
  respectScore?: number;
  isOnline?: boolean;
  intent?: string;
  familyMode?: boolean;
  festivalPrefs?: string[];
  greenFlagStories?: {prompt: string; answer: string}[];
  dateReadiness?: string | null;
  photoVerifiedAt?: string | null;
  photoAuthenticityScore?: number | null;
  partner2Name?: string | null;
  partner2Age?: number | null;
  partner2Gender?: string | null;
}

const CITIES = ["All", "Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Goa"];
const INTENT_ICONS: Record<string, string> = { Casual: "☕", Dating: "💕", Serious: "💎", Marriage: "💍" };
const INTENT_COLORS: Record<string, string> = { Casual: "bg-blue-500/80", Dating: "bg-pink-500/80", Serious: "bg-purple-500/80", Marriage: "bg-amber-500/80" };

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCard, setExpandedCard] = useState(false);

  const [filters, setFilters] = useState({
    gender: "All" as "All" | "Male" | "Female" | "Trans" | "Couple",
    ageMin: 18,
    ageMax: 45,
    city: "All",
  });

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: festivalStatus } = useQuery<{active: boolean; festival: string | null}>({
    queryKey: ["/api/festival-status"],
    enabled: !!session?.user,
  });

  const { data: appSettings } = useQuery<any>({
    queryKey: ["/api/app-settings"],
    enabled: !!session?.user,
  });

  const discoverUrl = `/api/discover?${new URLSearchParams({
    ...(filters.gender !== "All" && { gender: filters.gender }),
    ...(filters.ageMin !== 18 && { ageMin: String(filters.ageMin) }),
    ...(filters.ageMax !== 45 && { ageMax: String(filters.ageMax) }),
    ...(filters.city !== "All" && { city: filters.city }),
  }).toString()}`;

  const { data: profiles = [], isLoading } = useQuery<DiscoverProfile[]>({
    queryKey: [discoverUrl],
    enabled: !!session?.user,
  });

  const swipeMutation = useMutation({
    mutationFn: async ({ targetUserId, action }: { targetUserId: string; action: string }) => {
      const res = await apiRequest("POST", "/api/swipe", { targetUserId, action });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.isMutualMatch) setMatchPopup(data.match.targetUserId);
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
  });

  useEffect(() => {
    if (!checkingSession && !session?.user) setLocation("/");
  }, [checkingSession, session, setLocation]);

  if (checkingSession || !session?.user) {
    return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  const coupleProfilesEnabled = appSettings?.feature_couple_profiles !== false;
  const filteredProfiles = profiles.filter((p) => !dismissed.includes(p.userId) && (coupleProfilesEnabled || p.gender !== "Couple"));

  const handleSwipe = (userId: string, action: "like" | "pass" | "superlike") => {
    setDismissed((prev) => [...prev, userId]);
    setExpandedCard(false);
    swipeMutation.mutate({ targetUserId: userId, action });
  };

  const handleRefresh = () => {
    setDismissed([]);
    queryClient.invalidateQueries({ queryKey: [discoverUrl] });
  };

  const activeFilterCount = [
    filters.gender !== "All",
    filters.ageMin !== 18 || filters.ageMax !== 45,
    filters.city !== "All",
  ].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <header className="px-6 pt-6 pb-2 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold text-brand-gradient" data-testid="text-discover-title">Discover</h1>
          <p className="text-xs text-muted-foreground">{session.profile?.city || "India"}</p>
        </div>
        <div className="flex items-center gap-2">
          {festivalStatus?.active && (
            <div className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse" data-testid="text-festival-active">
              <span>🎉</span> {festivalStatus.festival} Boost
            </div>
          )}
          <Button variant="outline" size="sm" className={`rounded-full h-9 px-3 gap-1.5 border-gray-200 ${activeFilterCount > 0 ? "bg-primary/5 border-primary text-primary" : ""}`} onClick={() => setShowFilters(!showFilters)} data-testid="button-filters">
            <SlidersHorizontal size={14} />
            <span className="text-xs font-medium">Filters</span>
            {activeFilterCount > 0 && <span className="bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0 z-10">
            <div className="px-6 pb-4 space-y-4 bg-white border-b border-gray-100 shadow-sm">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Gender</label>
                <div className="flex gap-2">
                  {(["All", "Male", "Female", "Trans", "Couple"] as const).filter(g => coupleProfilesEnabled || g !== "Couple").map((g) => (
                    <button key={g} onClick={() => setFilters((f) => ({ ...f, gender: g }))} className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${filters.gender === g ? "bg-brand-gradient text-white shadow-sm" : "bg-gray-100 text-gray-600"}`} data-testid={`filter-gender-${g.toLowerCase()}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Age Range: {filters.ageMin} - {filters.ageMax}</label>
                <div className="flex gap-3 items-center">
                  <input type="range" min="18" max="45" value={filters.ageMin} onChange={(e) => setFilters((f) => ({ ...f, ageMin: Math.min(parseInt(e.target.value), f.ageMax - 1) }))} className="flex-1 accent-primary" data-testid="filter-age-min" />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="range" min="18" max="45" value={filters.ageMax} onChange={(e) => setFilters((f) => ({ ...f, ageMax: Math.max(parseInt(e.target.value), f.ageMin + 1) }))} className="flex-1 accent-primary" data-testid="filter-age-max" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">City</label>
                <select value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-sm" data-testid="filter-city">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setFilters({ gender: "All", ageMin: 18, ageMax: 45, city: "All" })} data-testid="button-clear-filters">
                  Clear all filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {isLoading ? (
          <div className="text-muted-foreground animate-pulse">Loading profiles...</div>
        ) : (
          <AnimatePresence>
            {filteredProfiles.length > 0 ? (
              filteredProfiles.slice(0, 5).reverse().map((profile, index) => {
                const isFront = index === Math.min(filteredProfiles.length, 5) - 1;
                return (
                  <SwipeCard key={profile.userId} profile={profile} isFront={isFront} expanded={isFront && expandedCard} onSwipe={(action) => handleSwipe(profile.userId, action)} onToggleExpand={() => setExpandedCard(!expandedCard)} appSettings={appSettings} />
                );
              })
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Info className="text-gray-400" size={32} /></div>
                <h3 className="text-lg font-bold mb-2" data-testid="text-no-profiles">No more profiles</h3>
                <p className="text-muted-foreground text-sm mb-2">{activeFilterCount > 0 ? "Try changing your filters to see more profiles." : "Check back later for new matches in your area."}</p>
                <div className="flex gap-3 justify-center mt-4">
                  {activeFilterCount > 0 && <Button variant="outline" onClick={() => setFilters({ gender: "All", ageMin: 18, ageMax: 45, city: "All" })} data-testid="button-clear-filters-empty">Clear Filters</Button>}
                  <Button data-testid="button-refresh" onClick={handleRefresh} variant="outline">Refresh Profiles</Button>
                </div>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {matchPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8" onClick={() => setMatchPopup(null)}>
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-heading font-bold text-brand-gradient mb-2">It's a Match!</h2>
            <p className="text-muted-foreground mb-6">You both liked each other. Start a conversation!</p>
            <div className="space-y-3">
              <Button data-testid="button-send-message" className="w-full bg-brand-gradient h-12 rounded-2xl font-bold" onClick={() => { setMatchPopup(null); setLocation("/matches"); }}>Send a Message</Button>
              <Button variant="ghost" className="w-full" onClick={() => setMatchPopup(null)}>Keep Swiping</Button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function SwipeCard({ profile, isFront, expanded, onSwipe, onToggleExpand, appSettings }: { 
  profile: DiscoverProfile; isFront: boolean; expanded: boolean;
  onSwipe: (action: "like" | "pass" | "superlike") => void; onToggleExpand: () => void; appSettings?: any;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [20, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -150], [0, 1]);

  const photoUrl = profile.photos?.[0] || "/profiles/generic_indian_1.jpg";
  const respectScore = profile.respectScore ?? 85;
  const greenFlags = profile.greenFlagStories?.filter(s => s.answer) || [];
  const coupleProfilesEnabled = appSettings?.feature_couple_profiles !== false;

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onSwipe("like");
    else if (info.offset.x < -100) onSwipe("pass");
  };

  const getRespectColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <motion.div
      data-testid={`card-profile-${profile.userId}`}
      style={{ x: isFront ? x : 0, rotate: isFront ? rotate : 0, zIndex: isFront ? 10 : 0, scale: isFront ? 1 : 0.95 }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: isFront ? 1 : 0.9, opacity: 1, y: isFront ? 0 : 10 }}
      exit={{ x: x.get() < 0 ? -500 : 500, opacity: 0, transition: { duration: 0.2 } }}
      className="absolute w-full h-full max-h-[600px] max-w-sm"
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl bg-white select-none">
        <img src={photoUrl} alt={profile.name} className="w-full h-full object-cover pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

        <div className="absolute top-4 left-4 flex gap-2 z-10">
          {profile.intent && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${INTENT_COLORS[profile.intent] || "bg-gray-500/80"} backdrop-blur-sm`} data-testid={`badge-intent-${profile.userId}`}>
              {INTENT_ICONS[profile.intent]} {profile.intent}
            </span>
          )}
          {profile.familyMode && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white bg-pink-500/80 backdrop-blur-sm">Family</span>
          )}
          {profile.photoVerifiedAt && appSettings?.feature_photo_authenticity && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white bg-blue-500/80 backdrop-blur-sm flex items-center gap-0.5" data-testid={`badge-verified-${profile.userId}`}>
              <ShieldCheck size={10} /> Verified
            </span>
          )}
          {profile.dateReadiness && appSettings?.feature_date_readiness && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white bg-teal-500/80 backdrop-blur-sm flex items-center gap-0.5" data-testid={`badge-readiness-${profile.userId}`}>
              {profile.dateReadiness === "Chat-only" ? <MessageCircle size={10} /> : profile.dateReadiness === "Voice-ready" ? <Mic size={10} /> : <Users size={10} />}
              {profile.dateReadiness}
            </span>
          )}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          <div className={`w-2.5 h-2.5 rounded-full ${getRespectColor(respectScore)}`} />
          <span className="text-white/90 text-xs font-bold bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full" data-testid={`badge-respect-${profile.userId}`}>
            {respectScore}
          </span>
        </div>

        {isFront && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-16 right-8 border-4 border-green-500 rounded-lg px-4 py-2 rotate-12 bg-black/20 backdrop-blur-sm z-20">
              <span className="text-green-500 font-bold text-2xl tracking-widest uppercase">Like</span>
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="absolute top-16 left-8 border-4 border-red-500 rounded-lg px-4 py-2 -rotate-12 bg-black/20 backdrop-blur-sm z-20">
              <span className="text-red-500 font-bold text-2xl tracking-widest uppercase">Nope</span>
            </motion.div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); if (isFront) onToggleExpand(); }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-3xl font-heading font-bold" data-testid={`text-name-${profile.userId}`}>
              {coupleProfilesEnabled && profile.gender === "Couple" && profile.partner2Name
                ? `${profile.name} & ${profile.partner2Name}`
                : profile.name}
              {coupleProfilesEnabled && profile.gender === "Couple" && profile.partner2Age
                ? `, ${profile.age} & ${profile.partner2Age}`
                : `, ${profile.age}`}
            </h2>
            {isFront && <motion.div animate={{ rotate: expanded ? 180 : 0 }}><ChevronDown size={20} className="text-white/70" /></motion.div>}
          </div>
          <div className="flex items-center text-white/80 text-sm mb-3 flex-wrap gap-y-1">
            <MapPin size={14} className="mr-1" /><span>{profile.location}</span>
            <span className="mx-2 text-white/40">·</span>
            <span className="bg-white/15 px-2 py-0.5 rounded-full text-xs">{profile.gender}</span>
            
            {profile.isOnline && <span className="ml-2 text-green-400 text-xs font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Online</span>}
          </div>

          <AnimatePresence>
            {expanded && isFront && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {profile.bio && <p className="text-white/90 mb-3 font-light text-sm">{profile.bio}</p>}
                {coupleProfilesEnabled && profile.gender === "Couple" && profile.partner2Name && (
                  <div className="bg-pink-500/20 backdrop-blur-sm rounded-lg px-3 py-2 mb-3 border border-pink-400/20">
                    <p className="text-[10px] uppercase tracking-wider text-pink-300 font-bold mb-1">Couple Details</p>
                    <div className="flex items-center gap-3 text-xs text-white/90">
                      <span>{profile.name}, {profile.age}</span>
                      <span className="text-pink-300">&</span>
                      <span>{profile.partner2Name}, {profile.partner2Age}</span>
                    </div>
                    {profile.partner2Gender && (
                      <p className="text-[10px] text-pink-200 mt-1">Partner 2: {profile.partner2Gender}</p>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3 text-xs text-white/70">
                  <span className="bg-white/15 px-2 py-1 rounded-full">{profile.city}</span>
                </div>
                {greenFlags.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-green-300 font-bold">Green Flag Stories</p>
                    {greenFlags.map((story, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                        <p className="text-[10px] text-green-300 font-medium">"{story.prompt}"</p>
                        <p className="text-xs text-white/90 mt-0.5">{story.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
                {profile.festivalPrefs && profile.festivalPrefs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {profile.festivalPrefs.map((f) => (
                      <span key={f} className="px-2 py-1 bg-orange-500/30 backdrop-blur-sm rounded-full text-[10px] font-medium text-orange-200 border border-orange-400/20">🎉 {f}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2">
            {(profile.interests || []).slice(0, expanded ? 10 : 4).map((interest: string) => (
              <span key={interest} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/20">{interest}</span>
            ))}
            {!expanded && (profile.interests || []).length > 4 && (
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/20">+{(profile.interests || []).length - 4}</span>
            )}
          </div>
        </div>

        {isFront && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 pointer-events-auto z-20 px-6">
            <Button data-testid="button-pass" size="icon" variant="outline" className="w-14 h-14 rounded-full bg-white/90 backdrop-blur border-red-200 shadow-lg hover:bg-red-50" onClick={() => onSwipe("pass")}>
              <X className="text-red-500" size={24} />
            </Button>
            <Button data-testid="button-view-profile" size="icon" variant="outline" className="w-11 h-11 rounded-full bg-white/90 backdrop-blur border-purple-200 shadow-lg hover:bg-purple-50 self-center" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Eye className="text-purple-500" size={16} />
            </Button>
            <Button data-testid="button-superlike" size="icon" variant="outline" className="w-11 h-11 rounded-full bg-white/90 backdrop-blur border-blue-200 shadow-lg hover:bg-blue-50 self-center" onClick={() => onSwipe("superlike")}>
              <Star className="text-blue-500 fill-blue-500" size={16} />
            </Button>
            <Button data-testid="button-like" size="icon" className="w-14 h-14 rounded-full bg-green-500 shadow-lg hover:bg-green-600 border-0" onClick={() => onSwipe("like")}>
              <Heart className="text-white fill-white" size={24} />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
