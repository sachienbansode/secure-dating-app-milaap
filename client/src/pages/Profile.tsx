import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Edit, Shield, ChevronRight, Bell, Sparkles, LogOut, Save, ArrowLeft, Camera, X, Plus, Loader2, Lock, Heart, Leaf, PartyPopper, Flag as FlagIcon, Bot, ShieldAlert, Home as HomeIcon, Eye, EyeOff, MessageSquareQuote, Trash2, MessageCircle, Mic, Users, CheckCircle, Phone, Ban, Clock, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe, logout, type AuthResponse } from "@/lib/auth";

const CITIES = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Goa"];
const INTERESTS = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading", "Cooking", "Dancing", "Photography", "Fitness", "Meditation", "Gaming", "Fashion", "Startups", "Biriyani", "Hiking"];
const ROMANTIC_INTERESTS = ["Late Night Talks", "Candlelight Dinners", "Long Drives", "Cuddling", "Rooftop Dates", "Love Letters", "Slow Dancing", "Netflix & Chill", "Midnight Snacks", "Skinny Dipping", "Role Play", "Sensual Massages", "Hookups", "Friends with Benefits", "Weekend Getaways", "Sunset Walks", "Morning Kisses", "Body Positivity", "Flirting", "Dirty Jokes"];
const INTENT_OPTIONS = ["Casual", "Dating", "Serious", "Marriage"] as const;
const FESTIVAL_LIST = ["Diwali", "Eid", "Navratri", "Christmas", "Holi", "Ganesh Chaturthi", "Onam", "Pongal", "Baisakhi", "Durga Puja"] as const;
const GREEN_FLAG_PROMPTS = [
  "Something I'll never joke about",
  "My idea of respect",
  "One thing I'm healing from",
] as const;
const AI_BOUNDARIES = ["Personal finances", "Family details", "Ex relationships", "Religious beliefs", "Political views", "Health issues"];
const DATE_READINESS_OPTIONS = ["Chat-only", "Voice-ready", "Meet-ready"] as const;
const DATE_READINESS_ICONS: Record<string, any> = { "Chat-only": MessageCircle, "Voice-ready": Mic, "Meet-ready": Users };
const DATE_READINESS_COLORS: Record<string, string> = { "Chat-only": "bg-blue-50 border-blue-200 text-blue-700", "Voice-ready": "bg-green-50 border-green-200 text-green-700", "Meet-ready": "bg-purple-50 border-purple-200 text-purple-700" };

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
    gender: "Male" as "Male" | "Female" | "Trans" | "Couple",
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
    dateReadiness: "Chat-only" as string,
    interestedIn: [] as string[],
  });

  useEffect(() => {
    if (session?.profile) {
      const p = session.profile;
      setForm({
        name: p.name || "",
        age: p.age || 25,
        gender: (p.gender as "Male" | "Female" | "Trans" | "Couple") || "Male",
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
        dateReadiness: p.dateReadiness || "Chat-only",
        interestedIn: p.interestedIn || [],
      });
    }
  }, [session?.profile]);

  const { data: appSettings } = useQuery<any>({
    queryKey: ["/api/app-settings"],
    enabled: !!session?.user,
  });

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
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
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

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
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
                    <select data-testid="select-gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as "Male" | "Female" | "Trans" | "Couple" }))} className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Trans">Trans</option>
                      <option value="Couple">Couple</option>
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
              </div>

              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200">
                <label className="text-sm font-medium text-rose-800 mb-3 block">Interested In</label>
                <div className="flex flex-wrap gap-2">
                  {(["Male", "Female", "Trans", "Couple"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      data-testid={`button-interested-${option}`}
                      onClick={() => setForm((f) => ({
                        ...f,
                        interestedIn: f.interestedIn.includes(option)
                          ? f.interestedIn.filter((g) => g !== option)
                          : [...f.interestedIn, option],
                      }))}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                        form.interestedIn.includes(option)
                          ? "bg-brand-gradient text-white shadow-sm"
                          : "bg-white text-gray-600 hover:bg-gray-50 border border-rose-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-rose-400 mt-2">Select one or more to see matching profiles</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Interests ({form.interests.length}/10)</label>

                <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">General</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {INTERESTS.map((interest) => (
                    <button key={interest} data-testid={`button-interest-${interest}`} onClick={() => toggleInterest(interest)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${form.interests.includes(interest) ? "bg-brand-gradient text-white shadow-sm" : "bg-white text-gray-600 hover:bg-gray-200 border border-gray-200"}`}>
                      {interest}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Romantic & Spicy</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ROMANTIC_INTERESTS.map((interest) => (
                    <button key={interest} data-testid={`button-interest-${interest.toLowerCase().replace(/\s/g, "-")}`} onClick={() => toggleInterest(interest)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${form.interests.includes(interest) ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-sm" : "bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200"}`}>
                      {interest}
                    </button>
                  ))}
                </div>

                {form.interests.filter((i) => !INTERESTS.includes(i) && !ROMANTIC_INTERESTS.includes(i)).length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Custom</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {form.interests.filter((i) => !INTERESTS.includes(i) && !ROMANTIC_INTERESTS.includes(i)).map((interest) => (
                        <button key={interest} data-testid={`button-interest-custom-${interest.toLowerCase().replace(/\s/g, "-")}`} onClick={() => toggleInterest(interest)} className="px-4 py-2 rounded-full text-sm font-medium bg-purple-500 text-white shadow-sm flex items-center gap-1">
                          {interest} <X size={12} />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex gap-2 mt-2">
                  <Input
                    data-testid="input-custom-interest"
                    placeholder="Add your own interest..."
                    className="flex-1 h-10 rounded-xl text-sm"
                    maxLength={30}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !form.interests.includes(val) && form.interests.length < 10) {
                          toggleInterest(val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    data-testid="button-add-custom-interest"
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => {
                      const input = document.querySelector('[data-testid="input-custom-interest"]') as HTMLInputElement;
                      if (input) {
                        const val = input.value.trim();
                        if (val && !form.interests.includes(val) && form.interests.length < 10) {
                          toggleInterest(val);
                          input.value = "";
                        }
                      }
                    }}
                  >
                    <Plus size={14} className="mr-1" /> Add
                  </Button>
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

              {appSettings?.feature_date_readiness && (
                <div className="bg-teal-50 rounded-2xl p-4 space-y-3 border border-teal-200">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-teal-600" />
                    <h4 className="font-bold text-sm text-teal-800">Date Readiness</h4>
                  </div>
                  <p className="text-xs text-teal-700">Let your matches know your comfort level. This shows on your profile and in chat.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DATE_READINESS_OPTIONS.map((opt) => {
                      const Icon = DATE_READINESS_ICONS[opt];
                      return (
                        <button key={opt} data-testid={`button-readiness-${opt.toLowerCase().replace(/\s/g, "-")}`} onClick={() => setForm((f) => ({ ...f, dateReadiness: opt }))} className={`px-3 py-3 rounded-xl text-xs font-medium transition-all border flex flex-col items-center gap-1.5 ${form.dateReadiness === opt ? DATE_READINESS_COLORS[opt] + " shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                          <Icon size={18} />
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

          {activeSection === "Welcome Taglines" && (
            <TaglineEditor />
          )}

          {activeSection === "Feature Toggles" && (
            <FeatureToggles />
          )}

          {activeSection === "Terms & Conditions" && (
            <TermsEditor />
          )}

          {activeSection === "Activity Logs" && (
            <ActivityLogsViewer />
          )}

          {activeSection === "All Profiles" && (
            <AllProfilesViewer />
          )}
        </div>

        {activeSection !== "Welcome Taglines" && activeSection !== "Feature Toggles" && activeSection !== "Terms & Conditions" && activeSection !== "Activity Logs" && activeSection !== "All Profiles" && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto">
            <Button data-testid="button-save-profile" className="w-full h-14 rounded-2xl font-bold text-lg bg-brand-gradient shadow-lg" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
              {saveMutation.isPending ? "Saving..." : <>{isNewUser ? "Create Profile" : "Save Changes"} <Save className="ml-2" size={18} /></>}
            </Button>
            {saveMutation.isError && !intentWarning && (
              <p className="text-red-500 text-sm text-center mt-2">{(saveMutation.error as any)?.message || "Failed to save"}</p>
            )}
          </div>
        )}

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
  const [localInterestedIn, setLocalInterestedIn] = useState<string[]>(profile.interestedIn || []);
  const [savingInterest, setSavingInterest] = useState(false);

  useEffect(() => {
    setLocalInterestedIn(profile.interestedIn || []);
  }, [profile.interestedIn]);

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

            {profile.dateReadiness && appSettings?.feature_date_readiness && (
              <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${DATE_READINESS_COLORS[profile.dateReadiness] || "bg-gray-50 border-gray-200 text-gray-600"}`} data-testid="text-readiness-badge">
                {(() => { const Icon = DATE_READINESS_ICONS[profile.dateReadiness] || MessageCircle; return <Icon size={12} />; })()}
                {profile.dateReadiness}
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

            <div className="flex gap-3 w-full justify-center mt-2 flex-wrap">
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
              {profile.photoVerifiedAt && (
                <div className="flex flex-col items-center bg-blue-50 px-4 py-2 rounded-xl border border-blue-100" data-testid="badge-photo-verified">
                  <ShieldCheck size={20} className="text-blue-600" />
                  <span className="text-blue-700/60 text-[10px] uppercase font-bold tracking-wider">Verified</span>
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
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Interested In</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap gap-2">
                {(["Male", "Female", "Trans", "Couple"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={savingInterest}
                    data-testid={`button-settings-interested-${option}`}
                    onClick={async () => {
                      const updated = localInterestedIn.includes(option)
                        ? localInterestedIn.filter((g) => g !== option)
                        : [...localInterestedIn, option];
                      setLocalInterestedIn(updated);
                      setSavingInterest(true);
                      try {
                        const res = await apiRequest("POST", "/api/profile", {
                          name: profile.name,
                          age: profile.age,
                          gender: profile.gender,
                          city: profile.city,
                          location: profile.location,
                          interestedIn: updated,
                        });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                        } else {
                          setLocalInterestedIn(profile.interestedIn || []);
                        }
                      } catch {
                        setLocalInterestedIn(profile.interestedIn || []);
                      } finally {
                        setSavingInterest(false);
                      }
                    }}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      localInterestedIn.includes(option)
                        ? "bg-brand-gradient text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } ${savingInterest ? "opacity-60" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Profiles matching your selection will appear in Discover</p>
            </div>
          </section>

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

          {appSettings?.feature_photo_authenticity && (
            <section>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Photo Verification</h3>
              <PhotoVerifyCard />
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Admin</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => { setIsEditing(true); setActiveSection("All Profiles"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Users size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">All Profiles</h4>
                    <p className="text-xs text-muted-foreground">View all registered profiles</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50" onClick={() => { setIsEditing(true); setActiveSection("Welcome Taglines"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><MessageSquareQuote size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">Welcome Taglines</h4>
                    <p className="text-xs text-muted-foreground">Manage login welcome messages</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50" onClick={() => { setIsEditing(true); setActiveSection("Feature Toggles"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Settings size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">Feature Toggles</h4>
                    <p className="text-xs text-muted-foreground">Enable/disable app features</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => { setIsEditing(true); setActiveSection("Terms & Conditions"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600"><Shield size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">Terms & Conditions</h4>
                    <p className="text-xs text-muted-foreground">Edit the terms users accept</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => { setIsEditing(true); setActiveSection("Activity Logs"); }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><Clock size={16} /></div>
                  <div>
                    <h4 className="font-semibold text-sm">Activity Logs</h4>
                    <p className="text-xs text-muted-foreground">View all user activity</p>
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

function TaglineEditor() {
  const [taglines, setTaglines] = useState<string[]>([]);
  const [newTagline, setNewTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/app-settings")
      .then(r => r.json())
      .then(data => {
        if (data.welcome_taglines?.length) setTaglines(data.welcome_taglines);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "welcome_taglines", value: taglines }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save taglines");
    }
    setSaving(false);
  };

  const addTagline = () => {
    const trimmed = newTagline.trim();
    if (trimmed && !taglines.includes(trimmed)) {
      setTaglines([...taglines, trimmed]);
      setNewTagline("");
    }
  };

  const removeTagline = (index: number) => {
    setTaglines(taglines.filter((_, i) => i !== index));
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareQuote size={16} className="text-amber-600" />
          <h4 className="font-bold text-sm text-amber-800">Welcome Taglines</h4>
        </div>
        <p className="text-xs text-amber-700 mb-4">These taglines show randomly when users log in. Edit, add, or remove them below.</p>

        <div className="space-y-2 mb-4">
          {taglines.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-amber-100 group" data-testid={`tagline-item-${i}`}>
              <span className="text-sm flex-1 italic text-gray-700">"{t}"</span>
              <button onClick={() => removeTagline(i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1" data-testid={`button-remove-tagline-${i}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newTagline}
            onChange={(e) => setNewTagline(e.target.value)}
            placeholder="Add a new tagline..."
            className="flex-1 h-10 rounded-xl text-sm"
            onKeyDown={(e) => e.key === "Enter" && addTagline()}
            data-testid="input-new-tagline"
          />
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100" onClick={addTagline} data-testid="button-add-tagline">
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      <Button
        className="w-full h-12 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
        onClick={handleSave}
        disabled={saving || taglines.length === 0}
        data-testid="button-save-taglines"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Taglines"}
      </Button>

      {taglines.length === 0 && (
        <p className="text-xs text-red-500 text-center">Add at least one tagline to save.</p>
      )}
      {saveError && (
        <p className="text-xs text-red-500 text-center">{saveError}</p>
      )}
    </div>
  );
}

function PhotoVerifyCard() {
  const { data: auth } = useQuery<AuthResponse>({ queryKey: ["/api/auth/me"] });
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ score: number; verified: boolean } | null>(null);
  const queryClient = useQueryClient();

  const profile = auth?.profile;
  if (!profile) return null;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/photo-verify", { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    } catch {}
    setVerifying(false);
  };

  const alreadyVerified = !!profile.photoVerifiedAt;
  const score = result?.score ?? profile.photoAuthenticityScore;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4" data-testid="card-photo-verify">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><ShieldCheck size={20} className="text-blue-600" /></div>
        <div>
          <h4 className="font-bold text-sm">Photo Authenticity</h4>
          <p className="text-xs text-muted-foreground">{alreadyVerified ? "Your photos are verified" : "Verify your photos with AI"}</p>
        </div>
      </div>

      {score !== null && score !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Authenticity Score</span>
            <span className={`text-sm font-bold ${(score ?? 0) >= 70 ? "text-green-600" : (score ?? 0) >= 40 ? "text-amber-600" : "text-red-600"}`}>{score}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${(score ?? 0) >= 70 ? "bg-green-500" : (score ?? 0) >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      )}

      {!alreadyVerified && (
        <Button data-testid="button-verify-photos" className="w-full h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium" onClick={handleVerify} disabled={verifying || !profile.photos?.length}>
          {verifying ? "Analyzing..." : "Verify My Photos"}
        </Button>
      )}

      {alreadyVerified && (
        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2 border border-green-200">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-xs font-medium text-green-700">Verified on {new Date(profile.photoVerifiedAt!).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}

function FeatureToggles() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/app-settings", { credentials: "include" }).then(r => r.json()).then(d => { setSettings(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const FEATURE_TOGGLES = [
    { key: "feature_chat_cooldown", label: "Chat Cool-Down", desc: "5-min pauses on tone escalation, repeat offender bans", icon: Clock },
    { key: "feature_enhanced_report", label: "Enhanced Report & Block", desc: "AI chat analysis, auto-deactivation at 5 reports", icon: ShieldAlert },
    { key: "feature_date_readiness", label: "Date Readiness Indicator", desc: "Chat-only / Voice-ready / Meet-ready levels", icon: Users },
    { key: "feature_no_phone_number", label: "No-Phone-Number Culture", desc: "AI blocks contact sharing, mutual consent unlock", icon: Lock },
    { key: "feature_photo_authenticity", label: "Photo Authenticity Score", desc: "AI photo verification with scored badges", icon: ShieldCheck },
    { key: "global_screenshot_protection", label: "Screenshot Protection", desc: "Global screenshot detection and alerts", icon: EyeOff },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const featureKeys = FEATURE_TOGGLES.map(t => t.key);
      for (const key of featureKeys) {
        await fetch("/api/app-settings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: String(settings[key] !== false) }),
        });
      }
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/app-settings"] });
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} className="text-indigo-600" />
          <h4 className="font-bold text-sm text-indigo-800">Feature Toggles</h4>

        </div>
        <p className="text-xs text-indigo-700 mb-4">Enable or disable app-wide features. Changes apply to all users immediately.</p>

        <div className="space-y-2">
          {FEATURE_TOGGLES.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-indigo-100" data-testid={`toggle-${key}`}>
              <Icon size={16} className="text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <h5 className="font-semibold text-sm">{label}</h5>
                <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
              </div>
              <Switch
                checked={settings[key] !== false}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, [key]: checked }))}
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        className="w-full h-12 rounded-2xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white"
        onClick={handleSave}
        disabled={saving}
        data-testid="button-save-feature-toggles"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Feature Settings"}
      </Button>
    </div>
  );
}

function TermsEditor() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/terms").then(r => r.json()).then(data => setContent(data.content || "")).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: "terms_and_conditions", value: content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-200">
        <h4 className="font-bold text-sm text-cyan-800 mb-2">Edit Terms & Conditions</h4>
        <p className="text-xs text-cyan-600 mb-3">This content is shown to users during registration. They must accept before creating an account.</p>
        <textarea
          data-testid="textarea-terms"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 rounded-xl border border-cyan-200 px-4 py-3 resize-y text-sm bg-white"
          placeholder="Enter your terms and conditions here..."
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="w-full h-12 rounded-xl font-bold bg-brand-gradient"
        data-testid="button-save-terms"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Terms & Conditions"}
      </Button>
    </div>
  );
}

function ActivityLogsViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const limit = 20;

  const categories = ["all", "auth", "profile", "match", "chat", "moderation", "admin", "security", "privacy"];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/activity-logs?${params}`, { credentials: "include" });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, categoryFilter]);

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      auth: "bg-blue-100 text-blue-700",
      profile: "bg-green-100 text-green-700",
      match: "bg-pink-100 text-pink-700",
      chat: "bg-purple-100 text-purple-700",
      moderation: "bg-red-100 text-red-700",
      admin: "bg-amber-100 text-amber-700",
      security: "bg-orange-100 text-orange-700",
      privacy: "bg-cyan-100 text-cyan-700",
    };
    return colors[cat] || "bg-gray-100 text-gray-700";
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
        <h4 className="font-bold text-sm text-slate-800 mb-3">Activity Logs ({total})</h4>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setPage(0); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                categoryFilter === cat ? "bg-slate-700 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
              data-testid={`filter-log-${cat}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No logs found</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="bg-white rounded-xl p-3 border border-slate-100 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getCategoryColor(log.category)}`}>
                      {log.category}
                    </span>
                    <span className="font-medium text-slate-800">{log.action.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{formatTime(log.createdAt)}</span>
                </div>
                {log.userId && (
                  <p className="text-[10px] text-slate-400 mt-0.5">User: {log.userId.slice(0, 8)}...</p>
                )}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-1 text-[10px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1">
                    {Object.entries(log.details).map(([k, v]) => (
                      <span key={k} className="mr-3">{k}: <strong>{String(v)}</strong></span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 disabled:opacity-40"
              data-testid="button-logs-prev"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 disabled:opacity-40"
              data-testid="button-logs-next"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AllProfilesViewer() {
  const [profilesData, setProfilesData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [genderFilter, setGenderFilter] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const limit = 20;

  const genders = ["all", "Male", "Female", "Trans", "Couple"];

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (genderFilter !== "all") params.set("gender", genderFilter);
      const res = await fetch(`/api/admin/profiles?${params}`, { credentials: "include" });
      const data = await res.json();
      setProfilesData(data.profiles || []);
      setTotal(data.total || 0);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, [page, genderFilter]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getGenderColor = (gender: string) => {
    const colors: Record<string, string> = {
      Male: "bg-blue-100 text-blue-700",
      Female: "bg-pink-100 text-pink-700",
      Trans: "bg-purple-100 text-purple-700",
      Couple: "bg-amber-100 text-amber-700",
    };
    return colors[gender] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
        <h4 className="font-bold text-sm text-indigo-800 mb-3">All Profiles ({total})</h4>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {genders.map((g) => (
            <button
              key={g}
              onClick={() => { setGenderFilter(g); setPage(0); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                genderFilter === g ? "bg-indigo-700 text-white" : "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
              }`}
              data-testid={`filter-profile-${g.toLowerCase()}`}
            >
              {g === "all" ? "All" : g}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-indigo-400 text-sm">Loading profiles...</div>
        ) : profilesData.length === 0 ? (
          <div className="text-center py-8 text-indigo-400 text-sm">No profiles found</div>
        ) : (
          <div className="space-y-2">
            {profilesData.map((profile: any) => (
              <div
                key={profile.id}
                className="bg-white rounded-xl p-3 border border-indigo-100 cursor-pointer hover:bg-indigo-50/50 transition-colors"
                onClick={() => setSelectedProfile(selectedProfile?.id === profile.id ? null : profile)}
                data-testid={`profile-card-${profile.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {profile.photos && profile.photos[0] ? (
                      <img src={profile.photos[0]} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No pic</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 truncate">{profile.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${getGenderColor(profile.gender)}`}>
                        {profile.gender}
                      </span>
                      {profile.age && <span className="text-[10px] text-slate-400">{profile.age}y</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{profile.city} · {profile.location}</div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[9px] text-slate-400">Created: {formatDate(profile.user?.createdAt)}</span>
                      <span className="text-[9px] text-slate-400">Modified: {formatDate(profile.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {selectedProfile?.id === profile.id && (
                  <div className="mt-3 pt-3 border-t border-indigo-100 space-y-3">
                    {profile.photos && profile.photos.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 mb-1.5 uppercase">Photos ({profile.photos.length})</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {profile.photos.map((photo: string, idx: number) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`${profile.name} photo ${idx + 1}`}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-indigo-100"
                              data-testid={`profile-photo-${profile.id}-${idx}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.bio && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Bio</p>
                        <p className="text-xs text-slate-700">{profile.bio}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="font-bold text-slate-600">Intent:</span>
                        <span className="ml-1 text-slate-700">{profile.intent || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Readiness:</span>
                        <span className="ml-1 text-slate-700">{profile.dateReadiness || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Interested In:</span>
                        <span className="ml-1 text-slate-700">{profile.interestedIn?.join(", ") || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Respect:</span>
                        <span className="ml-1 text-slate-700">{profile.user?.respectScore ?? "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Verified:</span>
                        <span className="ml-1 text-slate-700">{profile.user?.isVerified ? "Yes" : "No"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Photo Score:</span>
                        <span className="ml-1 text-slate-700">{profile.photoAuthenticityScore ?? "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Family Mode:</span>
                        <span className="ml-1 text-slate-700">{profile.familyMode ? "On" : "Off"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Visible:</span>
                        <span className="ml-1 text-slate-700">{profile.isVisible ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    {profile.interests && profile.interests.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 mb-1 uppercase">Interests</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.interests.map((interest: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px]">{interest}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-indigo-100">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-indigo-200 disabled:opacity-40"
              data-testid="button-profiles-prev"
            >
              Previous
            </button>
            <span className="text-xs text-indigo-500">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-indigo-200 disabled:opacity-40"
              data-testid="button-profiles-next"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
