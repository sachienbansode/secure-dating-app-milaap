import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Edit, Shield, ChevronRight, Bell, Sparkles, LogOut, Save, ArrowLeft, Camera, X, Plus, Loader2, Lock, Heart, Leaf, PartyPopper, Flag as FlagIcon, Bot, ShieldAlert, Home as HomeIcon, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe, logout } from "@/lib/auth";

const CITIES = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Goa"];
const INTERESTS = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading", "Cooking", "Dancing", "Photography", "Fitness", "Meditation", "Gaming", "Fashion", "Startups", "Biriyani", "Hiking"];
const INTENT_OPTIONS = ["Casual", "Dating", "Serious", "Marriage"] as const;
const FESTIVAL_LIST = ["Diwali", "Eid", "Navratri", "Christmas", "Holi", "Ganesh Chaturthi", "Onam", "Pongal", "Baisakhi", "Durga Puja"] as const;
const GREEN_FLAG_PROMPTS = [
  "Something I'll never joke about",
  "My idea of respect",
  "One thing I'm healing from",
] as const;
const AI_BOUNDARIES = ["Personal finances", "Family details", "Ex relationships", "Religious beliefs", "Political views", "Health issues"];

const INTENT_ICONS: Record<string, string> = { Casual: "☕", Dating: "💕", Serious: "💎", Marriage: "💍" };
const INTENT_COLORS: Record<string, string> = { Casual: "bg-blue-50 border-blue-200 text-blue-700", Dating: "bg-pink-50 border-pink-200 text-pink-700", Serious: "bg-purple-50 border-purple-200 text-purple-700", Marriage: "bg-amber-50 border-amber-200 text-amber-700" };

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [intentWarning, setIntentWarning] = useState<string | null>(null);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const isNewUser = session?.user && !session?.profile;

  const [form, setForm] = useState({
    name: "",
    age: 25,
    gender: "Male" as "Male" | "Female" | "Trans",
    bio: "",
    city: "Mumbai",
    location: "Mumbai",
    interests: [] as string[],
    photos: [] as string[],
    aiPersonaEnabled: false,
    aiTone: "Friendly",
    aiLanguage: "English",
    aiProxyEnabled: false,
    aiChatPace: "Normal" as "Slow" | "Normal" | "Fast",
    aiBoundaries: [] as string[],
    isVisible: true,
    intent: "" as string,
    familyMode: false,
    noScreenshotMode: false,
    festivalPrefs: [] as string[],
    hometownForFestivals: "",
    greenFlagStories: [] as {prompt: string; answer: string}[],
  });

  useEffect(() => {
    if (session?.profile) {
      const p = session.profile;
      setForm({
        name: p.name || "",
        age: p.age || 25,
        gender: (p.gender as "Male" | "Female" | "Trans") || "Male",
        bio: p.bio || "",
        city: p.city || "Mumbai",
        location: p.location || "Mumbai",
        interests: p.interests || [],
        photos: p.photos || [],
        aiPersonaEnabled: p.aiPersonaEnabled || false,
        aiTone: p.aiTone || "Friendly",
        aiLanguage: p.aiLanguage || "English",
        aiProxyEnabled: p.aiProxyEnabled || false,
        aiChatPace: (p.aiChatPace as "Slow" | "Normal" | "Fast") || "Normal",
        aiBoundaries: p.aiBoundaries || [],
        isVisible: p.isVisible !== false,
        intent: p.intent || "",
        familyMode: p.familyMode || false,
        noScreenshotMode: p.noScreenshotMode || false,
        festivalPrefs: (p.festivalPrefs as string[]) || [],
        hometownForFestivals: p.hometownForFestivals || "",
        greenFlagStories: (p.greenFlagStories as {prompt: string; answer: string}[]) || [],
      });
    }
  }, [session?.profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile", form);
      const data = await res.json();
      if (!res.ok) {
        if (data.canForceChange) {
          setIntentWarning(data.message);
          throw new Error(data.message);
        }
        throw new Error(data.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
      setActiveSection(null);
      if (isNewUser) setLocation("/home");
    },
  });

  const forceIntentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile/force-intent", { intent: form.intent });
      return res.json();
    },
    onSuccess: () => {
      setIntentWarning(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      saveMutation.mutate();
    },
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    setLocation("/");
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest].slice(0, 10),
    }));
  };

  const toggleFestival = (festival: string) => {
    setForm((prev) => ({
      ...prev,
      festivalPrefs: prev.festivalPrefs.includes(festival)
        ? prev.festivalPrefs.filter((f) => f !== festival)
        : [...prev.festivalPrefs, festival],
    }));
  };

  const toggleBoundary = (boundary: string) => {
    setForm((prev) => ({
      ...prev,
      aiBoundaries: prev.aiBoundaries.includes(boundary)
        ? prev.aiBoundaries.filter((b) => b !== boundary)
        : [...prev.aiBoundaries, boundary],
    }));
  };

  const updateGreenFlagStory = (index: number, answer: string) => {
    setForm((prev) => {
      const stories = [...prev.greenFlagStories];
      stories[index] = { prompt: GREEN_FLAG_PROMPTS[index], answer };
      return { ...prev, greenFlagStories: stories };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, photos: [...prev.photos, data.url].slice(0, 6) }));
    } catch (err) {
      console.error("Photo upload error:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  useEffect(() => {
    if (!loadingSession && !session?.user) setLocation("/");
  }, [loadingSession, session, setLocation]);

  if (loadingSession || !session?.user) {
    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (isNewUser || isEditing) {
    return (
      <div className="h-full flex flex-col bg-white">
        <header className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100">
          {!isNewUser && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setIsEditing(false); setActiveSection(null); }}>
              <ArrowLeft size={20} />
            </Button>
          )}
          <h1 className="text-xl font-heading font-bold" data-testid="text-profile-edit-title">
            {isNewUser ? "Create Your Profile" : activeSection ? activeSection : "Edit Profile"}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {(!activeSection || activeSection === "Edit Profile") && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Photos ({form.photos.length}/6)</label>
                <div className="grid grid-cols-3 gap-3">
                  {form.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center" data-testid={`button-remove-photo-${index}`}>
                        <X size={14} />
                      </button>
                      {index === 0 && <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">Main</span>}
                    </div>
                  ))}
                  {form.photos.length < 6 && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors" data-testid="button-add-photo">
                      {uploadingPhoto ? <Loader2 size={24} className="animate-spin" /> : <><Plus size={24} /><span className="text-xs font-medium">Add Photo</span></>}
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Name</label>
                <Input data-testid="input-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" className="h-12 rounded-xl" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Age</label>
                  <Input data-testid="input-age" type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: parseInt(e.target.value) || 18 }))} min={18} max={100} className="h-12 rounded-xl" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Gender</label>
                  <select data-testid="select-gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as "Male" | "Female" | "Trans" }))} className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Trans">Trans</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Bio</label>
                <textarea data-testid="input-bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell us about yourself..." className="w-full h-24 rounded-xl border border-gray-200 px-4 py-3 resize-none text-sm" maxLength={500} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
                <select data-testid="select-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value, location: e.target.value }))} className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white">
                  {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Interests ({form.interests.length}/10)</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button key={interest} data-testid={`button-interest-${interest}`} onClick={() => toggleInterest(interest)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${form.interests.includes(interest) ? "bg-brand-gradient text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 space-y-3 border border-amber-200">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-amber-600" />
                  <h4 className="font-bold text-sm text-amber-800">Why Are You Here? (30-Day Lock)</h4>
                </div>
                <p className="text-xs text-amber-700">Choose your intent. Once set, it's locked for 30 days. Breaking the lock reduces your visibility.</p>
                <div className="grid grid-cols-2 gap-2">
                  {INTENT_OPTIONS.map((intent) => (
                    <button key={intent} data-testid={`button-intent-${intent.toLowerCase()}`} onClick={() => setForm((f) => ({ ...f, intent }))} className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${form.intent === intent ? INTENT_COLORS[intent] + " shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <span className="text-lg mr-1">{INTENT_ICONS[intent]}</span> {intent}
                    </button>
                  ))}
                </div>
                {session?.profile?.intent && session?.profile?.intentLockedAt && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-100 px-3 py-2 rounded-lg">
                    <Lock size={12} />
                    <span>Currently locked as: <strong>{session.profile.intent}</strong></span>
                  </div>
                )}
              </div>

              <div className="bg-green-50 rounded-2xl p-4 space-y-4 border border-green-200">
                <div className="flex items-center gap-2">
                  <FlagIcon size={16} className="text-green-600" />
                  <h4 className="font-bold text-sm text-green-800">Green Flag Stories</h4>
                </div>
                <p className="text-xs text-green-700">Answer these prompts to show your values. AI highlights your green flags!</p>
                {GREEN_FLAG_PROMPTS.map((prompt, i) => (
                  <div key={i}>
                    <label className="text-xs font-medium text-green-700 mb-1 block">"{prompt}"</label>
                    <textarea data-testid={`input-green-flag-${i}`} value={form.greenFlagStories[i]?.answer || ""} onChange={(e) => updateGreenFlagStory(i, e.target.value)} placeholder="Your honest answer..." className="w-full h-16 rounded-lg border border-green-200 px-3 py-2 resize-none text-sm bg-white" maxLength={200} />
                  </div>
                ))}
              </div>
            </>
          )}

          {(!activeSection || activeSection === "AI & Settings") && (
            <>
              <div className="bg-purple-50 rounded-2xl p-4 space-y-4 border border-purple-200">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600" />
                  <h4 className="font-bold text-sm text-purple-800">AI Chat Assistant</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-sm">AI Suggestions</h5>
                    <p className="text-xs text-muted-foreground">Get help writing messages</p>
                  </div>
                  <Switch data-testid="switch-ai-persona" checked={form.aiPersonaEnabled} onCheckedChange={(checked) => setForm((f) => ({ ...f, aiPersonaEnabled: checked }))} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                  <div>
                    <h5 className="font-semibold text-sm flex items-center gap-1">
                      <Bot size={14} className="text-purple-500" /> AI Proxy Mode
                    </h5>
                    <p className="text-xs text-muted-foreground">AI chats for you when you're offline</p>
                  </div>
                  <Switch data-testid="switch-ai-proxy" checked={form.aiProxyEnabled} onCheckedChange={(checked) => setForm((f) => ({ ...f, aiProxyEnabled: checked }))} />
                </div>

                {(form.aiPersonaEnabled || form.aiProxyEnabled) && (
                  <div className="space-y-3 pl-1 pt-2 border-t border-purple-100">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Tone</label>
                      <select value={form.aiTone} onChange={(e) => setForm((f) => ({ ...f, aiTone: e.target.value }))} className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm" data-testid="select-ai-tone">
                        <option value="Friendly">Friendly</option>
                        <option value="Witty">Witty</option>
                        <option value="Polite">Polite</option>
                        <option value="Flirty">Flirty</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Language</label>
                      <select value={form.aiLanguage} onChange={(e) => setForm((f) => ({ ...f, aiLanguage: e.target.value }))} className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm" data-testid="select-ai-language">
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Hinglish">Hinglish</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Chat Pace</label>
                      <select value={form.aiChatPace} onChange={(e) => setForm((f) => ({ ...f, aiChatPace: e.target.value as "Slow" | "Normal" | "Fast" }))} className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm" data-testid="select-ai-pace">
                        <option value="Slow">Slow (Thoughtful)</option>
                        <option value="Normal">Normal</option>
                        <option value="Fast">Fast (Snappy)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">AI Boundaries (topics AI won't discuss)</label>
                      <div className="flex flex-wrap gap-2">
                        {AI_BOUNDARIES.map((b) => (
                          <button key={b} onClick={() => toggleBoundary(b)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.aiBoundaries.includes(b) ? "bg-red-100 text-red-700 border border-red-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`} data-testid={`button-boundary-${b.toLowerCase().replace(/\s/g, "-")}`}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-pink-50 rounded-2xl p-4 space-y-3 border border-pink-200">
                <div className="flex items-center gap-2">
                  <HomeIcon size={16} className="text-pink-600" />
                  <h4 className="font-bold text-sm text-pink-800">Family-Aware Dating Mode</h4>
                </div>
                <p className="text-xs text-pink-700">Clean language only. No innuendos. Conservative matching pool. Ideal for tier 2/3 cities.</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Enable Family Mode</span>
                  <Switch data-testid="switch-family-mode" checked={form.familyMode} onCheckedChange={(checked) => setForm((f) => ({ ...f, familyMode: checked }))} />
                </div>
              </div>

              <div className="bg-orange-50 rounded-2xl p-4 space-y-3 border border-orange-200">
                <div className="flex items-center gap-2">
                  <PartyPopper size={16} className="text-orange-600" />
                  <h4 className="font-bold text-sm text-orange-800">Festival Compatibility</h4>
                </div>
                <p className="text-xs text-orange-700">Select festivals you celebrate. During festival seasons, you'll be matched with people who celebrate the same!</p>
                <div className="flex flex-wrap gap-2">
                  {FESTIVAL_LIST.map((f) => (
                    <button key={f} onClick={() => toggleFestival(f)} className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${form.festivalPrefs.includes(f) ? "bg-orange-200 text-orange-800 border border-orange-300" : "bg-white text-gray-600 border border-gray-200"}`} data-testid={`button-festival-${f.toLowerCase().replace(/\s/g, "-")}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium text-orange-700 mb-1 block">Hometown (for festival proximity matching)</label>
                  <select value={form.hometownForFestivals} onChange={(e) => setForm((f) => ({ ...f, hometownForFestivals: e.target.value }))} className="w-full h-10 rounded-lg border border-orange-200 px-3 bg-white text-sm" data-testid="select-hometown">
                    <option value="">Select hometown</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-1">
                      <ShieldAlert size={14} className="text-red-500" /> No Screenshot Mode
                    </h4>
                    <p className="text-xs text-muted-foreground">Protect your chats from screenshots</p>
                  </div>
                  <Switch data-testid="switch-no-screenshot" checked={form.noScreenshotMode} onCheckedChange={(checked) => setForm((f) => ({ ...f, noScreenshotMode: checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Profile Visible</h4>
                    <p className="text-xs text-muted-foreground">Others can see your profile</p>
                  </div>
                  <Switch data-testid="switch-visibility" checked={form.isVisible} onCheckedChange={(checked) => setForm((f) => ({ ...f, isVisible: checked }))} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto">
          <Button data-testid="button-save-profile" className="w-full h-14 rounded-2xl font-bold text-lg bg-brand-gradient shadow-lg" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
            {saveMutation.isPending ? "Saving..." : <>{isNewUser ? "Create Profile" : "Save Changes"} <Save className="ml-2" size={18} /></>}
          </Button>
          {saveMutation.isError && !intentWarning && (
            <p className="text-red-500 text-sm text-center mt-2">{(saveMutation.error as any)?.message || "Failed to save"}</p>
          )}
        </div>

        {intentWarning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4">
              <div className="text-center">
                <Lock size={32} className="mx-auto text-amber-500 mb-2" />
                <h3 className="text-lg font-bold">Intent Lock Warning</h3>
                <p className="text-sm text-muted-foreground mt-2">{intentWarning}</p>
                <p className="text-xs text-red-500 mt-2">Breaking the lock will reduce your respect score (-10) and daily likes (-15).</p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setIntentWarning(null)}>Keep Current</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => forceIntentMutation.mutate()} disabled={forceIntentMutation.isPending} data-testid="button-force-intent">
                  {forceIntentMutation.isPending ? "Changing..." : "Change Anyway"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const profile = session.profile!;
  const respectScore = session.user.respectScore ?? 85;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-50 border-green-100";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-red-600 bg-red-50 border-red-100";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 40) return "Fair";
    return "Low";
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white pt-10 pb-6 px-6 rounded-b-[2rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-brand-gradient opacity-10" />
          <div className="relative flex flex-col items-center">
            <div className="relative mb-4 group">
              <Avatar className="w-28 h-28 border-4 border-white shadow-lg">
                <AvatarImage src={profile.photos?.[0] || "/profiles/generic_indian_1.jpg"} className="object-cover" />
                <AvatarFallback>{profile.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setIsEditing(true); setActiveSection("Edit Profile"); }}>
                <Edit size={16} className="text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-heading font-bold text-gray-900" data-testid="text-profile-name">{profile.name}, {profile.age}</h2>
            <p className="text-muted-foreground text-sm mb-1">{profile.gender} • {profile.city}</p>

            {profile.intent && (
              <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border ${INTENT_COLORS[profile.intent] || "bg-gray-50 border-gray-200 text-gray-700"}`} data-testid="text-intent-badge">
                {INTENT_ICONS[profile.intent]} {profile.intent}
                {profile.intentLockedAt && <Lock size={10} className="inline ml-1" />}
              </div>
            )}

            {profile.photos && profile.photos.length > 1 && (
              <div className="flex gap-2 mt-3 mb-3">
                {profile.photos.slice(0, 4).map((photo, i) => (
                  <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {profile.photos.length > 4 && (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">+{profile.photos.length - 4}</div>
                )}
              </div>
            )}

            <div className="flex gap-3 w-full justify-center mt-2">
              <div className={`flex flex-col items-center px-4 py-2 rounded-xl border ${getScoreColor(respectScore)}`}>
                <span className="font-bold text-xl" data-testid="text-respect-score">{respectScore}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Respect • {getScoreLabel(respectScore)}</span>
              </div>
              <div className="flex flex-col items-center bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                <span className="text-purple-600 font-bold text-xl">{profile.aiProxyEnabled ? "Proxy" : profile.aiPersonaEnabled ? "On" : "Off"}</span>
                <span className="text-purple-700/60 text-[10px] uppercase font-bold tracking-wider">AI Mode</span>
              </div>
              {profile.familyMode && (
                <div className="flex flex-col items-center bg-pink-50 px-4 py-2 rounded-xl border border-pink-100">
                  <HomeIcon size={20} className="text-pink-600" />
                  <span className="text-pink-700/60 text-[10px] uppercase font-bold tracking-wider">Family</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {profile.greenFlagStories && (profile.greenFlagStories as any[]).length > 0 && (
          <div className="px-6 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Green Flag Stories</h3>
            <div className="space-y-2">
              {(profile.greenFlagStories as {prompt: string; answer: string}[]).map((story, i) => (
                story.answer && (
                  <div key={i} className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <p className="text-xs font-medium text-green-700">"{story.prompt}"</p>
                    <p className="text-sm text-gray-800 mt-1">{story.answer}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {profile.bio && (
          <div className="px-6 pt-4">
            <p className="text-sm text-muted-foreground bg-white p-4 rounded-2xl border border-gray-100">{profile.bio}</p>
          </div>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="px-6 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span key={interest} className="px-3 py-1.5 bg-white rounded-full text-xs font-medium border border-gray-100 shadow-sm">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {profile.festivalPrefs && (profile.festivalPrefs as string[]).length > 0 && (
          <div className="px-6 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Festival Celebrations</h3>
            <div className="flex flex-wrap gap-2">
              {(profile.festivalPrefs as string[]).map((f) => (
                <span key={f} className="px-3 py-1.5 bg-orange-50 rounded-full text-xs font-medium border border-orange-100 text-orange-700">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Settings</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50" onClick={() => { setIsEditing(true); setActiveSection("Edit Profile"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Edit size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">Edit Profile</h4>
                    <p className="text-xs text-muted-foreground">Photos, bio, interests, intent & stories</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50" onClick={() => { setIsEditing(true); setActiveSection("AI & Settings"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Sparkles size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">AI, Privacy & Preferences</h4>
                    <p className="text-xs text-muted-foreground">Proxy mode, family mode, festivals, safety</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Account</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Shield size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">Privacy & Safety</h4>
                    <p className="text-xs text-muted-foreground">Manage visibility & blocks</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={handleLogout} data-testid="button-logout">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><LogOut size={16} /></div>
                  <div className="text-red-600 font-medium text-sm">Log Out</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
