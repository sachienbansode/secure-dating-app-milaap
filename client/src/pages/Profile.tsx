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
    partner2Name: "" as string,
    partner2Age: 25 as number,
    partner2Gender: "" as string,
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
        partner2Name: (p as any).partner2Name || "",
        partner2Age: (p as any).partner2Age || 25,
        partner2Gender: (p as any).partner2Gender || "",
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

  const profile = session?.profile;
  const [localInterestedIn, setLocalInterestedIn] = useState<string[]>(profile?.interestedIn || []);
  const [savingInterest, setSavingInterest] = useState(false);

  useEffect(() => {
    setLocalInterestedIn(profile?.interestedIn || []);
  }, [profile?.interestedIn]);

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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{form.gender === "Couple" && appSettings?.feature_couple_profiles !== false ? "Partner 1 Name" : "Name"}</label>
                  <Input data-testid="input-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={form.gender === "Couple" && appSettings?.feature_couple_profiles !== false ? "First partner's name" : "Your name"} className="h-12 rounded-xl" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">{form.gender === "Couple" && appSettings?.feature_couple_profiles !== false ? "Partner 1 Age" : "Age"}</label>
                    <Input data-testid="input-age" type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: parseInt(e.target.value) || 18 }))} min={18} max={100} className="h-12 rounded-xl" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">{form.gender === "Couple" && appSettings?.feature_couple_profiles !== false ? "Profile Type" : "Gender"}</label>
                    <select data-testid="select-gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as "Male" | "Female" | "Trans" | "Couple" }))} className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Trans">Trans</option>
                      {appSettings?.feature_couple_profiles !== false && <option value="Couple">Couple</option>}
                    </select>
                  </div>
                </div>

                {form.gender === "Couple" && appSettings?.feature_couple_profiles !== false && (
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={16} className="text-pink-600" />
                      <h4 className="font-bold text-sm text-pink-800">Partner 2 Details</h4>
                    </div>
                    <p className="text-xs text-pink-600">Both individuals in the couple can be of any gender</p>
                    <div>
                      <label className="text-sm font-medium text-pink-700 mb-2 block">Partner 2 Name</label>
                      <Input data-testid="input-partner2-name" value={form.partner2Name} onChange={(e) => setForm((f) => ({ ...f, partner2Name: e.target.value }))} placeholder="Partner's name" className="h-12 rounded-xl" />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-pink-700 mb-2 block">Partner 2 Age</label>
                        <Input data-testid="input-partner2-age" type="number" value={form.partner2Age} onChange={(e) => setForm((f) => ({ ...f, partner2Age: parseInt(e.target.value) || 18 }))} min={18} max={100} className="h-12 rounded-xl" />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-pink-700 mb-2 block">Partner 2 Gender</label>
                        <select data-testid="select-partner2-gender" value={form.partner2Gender} onChange={(e) => setForm((f) => ({ ...f, partner2Gender: e.target.value }))} className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Trans">Trans</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

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
                  {(["Male", "Female", "Trans", "Couple"] as const).filter(o => appSettings?.feature_couple_profiles !== false || o !== "Couple").map((option) => (
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

          
        </div>

        {(
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

  const currentProfile = profile!;
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
                <AvatarImage src={currentProfile.photos?.[0] || "/profiles/generic_indian_1.jpg"} className="object-cover" />
                <AvatarFallback>{currentProfile.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setIsEditing(true); setActiveSection("Edit Profile"); }}>
                <Edit size={16} className="text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-heading font-bold text-gray-900" data-testid="text-profile-name">{currentProfile.name}, {currentProfile.age}</h2>
            <p className="text-muted-foreground text-sm mb-1">{currentProfile.gender} • {currentProfile.city}</p>

            {currentProfile.intent && (
              <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border ${INTENT_COLORS[currentProfile.intent] || "bg-gray-50 border-gray-200 text-gray-700"}`} data-testid="text-intent-badge">
                {INTENT_ICONS[currentProfile.intent]} {currentProfile.intent}
                {currentProfile.intentLockedAt && <Lock size={10} className="inline ml-1" />}
              </div>
            )}

            {currentProfile.dateReadiness && appSettings?.feature_date_readiness && (
              <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${DATE_READINESS_COLORS[currentProfile.dateReadiness] || "bg-gray-50 border-gray-200 text-gray-600"}`} data-testid="text-readiness-badge">
                {(() => { const Icon = DATE_READINESS_ICONS[currentProfile.dateReadiness] || MessageCircle; return <Icon size={12} />; })()}
                {currentProfile.dateReadiness}
              </div>
            )}

            {currentProfile.photos && currentProfile.photos.length > 1 && (
              <div className="flex gap-2 mt-3 mb-3">
                {currentProfile.photos.slice(0, 4).map((photo, i) => (
                  <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {currentProfile.photos.length > 4 && (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">+{currentProfile.photos.length - 4}</div>
                )}
              </div>
            )}

            <div className="flex gap-3 w-full justify-center mt-2 flex-wrap">
              <div className={`flex flex-col items-center px-4 py-2 rounded-xl border ${getScoreColor(respectScore)}`}>
                <span className="font-bold text-xl" data-testid="text-respect-score">{respectScore}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Respect • {getScoreLabel(respectScore)}</span>
              </div>
              <div className="flex flex-col items-center bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                <span className="text-purple-600 font-bold text-xl">{currentProfile.aiProxyEnabled ? "Proxy" : currentProfile.aiPersonaEnabled ? "On" : "Off"}</span>
                <span className="text-purple-700/60 text-[10px] uppercase font-bold tracking-wider">AI Mode</span>
              </div>
              {currentProfile.familyMode && (
                <div className="flex flex-col items-center bg-pink-50 px-4 py-2 rounded-xl border border-pink-100">
                  <HomeIcon size={20} className="text-pink-600" />
                  <span className="text-pink-700/60 text-[10px] uppercase font-bold tracking-wider">Family</span>
                </div>
              )}
              {currentProfile.photoVerifiedAt && (
                <div className="flex flex-col items-center bg-blue-50 px-4 py-2 rounded-xl border border-blue-100" data-testid="badge-photo-verified">
                  <ShieldCheck size={20} className="text-blue-600" />
                  <span className="text-blue-700/60 text-[10px] uppercase font-bold tracking-wider">Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {currentProfile.greenFlagStories && (currentProfile.greenFlagStories as any[]).length > 0 && (
          <div className="px-6 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Green Flag Stories</h3>
            <div className="space-y-2">
              {(currentProfile.greenFlagStories as {prompt: string; answer: string}[]).map((story, i) => (
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

        {currentProfile.bio && (
          <div className="px-6 pt-4">
            <p className="text-sm text-muted-foreground bg-white p-4 rounded-2xl border border-gray-100">{currentProfile.bio}</p>
          </div>
        )}

        {currentProfile.interests && currentProfile.interests.length > 0 && (
          <div className="px-6 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {currentProfile.interests.map((interest) => (
                <span key={interest} className="px-3 py-1.5 bg-white rounded-full text-xs font-medium border border-gray-100 shadow-sm">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {currentProfile.festivalPrefs && (currentProfile.festivalPrefs as string[]).length > 0 && (
          <div className="px-6 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Festival Celebrations</h3>
            <div className="flex flex-wrap gap-2">
              {(currentProfile.festivalPrefs as string[]).map((f) => (
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
                {(["Male", "Female", "Trans", "Couple"] as const).filter(o => appSettings?.feature_couple_profiles !== false || o !== "Couple").map((option) => (
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
                          name: currentProfile.name,
                          age: currentProfile.age,
                          gender: currentProfile.gender,
                          city: currentProfile.city,
                          location: currentProfile.location,
                          interestedIn: updated,
                        });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                        } else {
                          setLocalInterestedIn(currentProfile.interestedIn || []);
                        }
                      } catch {
                        setLocalInterestedIn(currentProfile.interestedIn || []);
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

