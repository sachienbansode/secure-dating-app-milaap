import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Edit, Shield, ChevronRight, Bell, Sparkles, LogOut, Save, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe, logout } from "@/lib/auth";

const CITIES = ["Mumbai", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Goa"];
const INTERESTS = ["Bollywood", "Cricket", "Chai", "Street Food", "Yoga", "Tech", "Art", "Music", "Travel", "Reading", "Cooking", "Dancing", "Photography", "Fitness", "Meditation", "Gaming", "Fashion", "Startups", "Biriyani", "Hiking"];

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

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
    aiPersonaEnabled: false,
    aiTone: "Friendly",
    aiLanguage: "English",
    isVisible: true,
  });

  useEffect(() => {
    if (session?.profile) {
      setForm({
        name: session.profile.name || "",
        age: session.profile.age || 25,
        gender: (session.profile.gender as "Male" | "Female" | "Trans") || "Male",
        bio: session.profile.bio || "",
        city: session.profile.city || "Mumbai",
        location: session.profile.location || "Mumbai",
        interests: session.profile.interests || [],
        aiPersonaEnabled: session.profile.aiPersonaEnabled || false,
        aiTone: session.profile.aiTone || "Friendly",
        aiLanguage: session.profile.aiLanguage || "English",
        isVisible: session.profile.isVisible !== false,
      });
    }
  }, [session?.profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
      if (isNewUser) {
        setLocation("/home");
      }
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

  if (loadingSession) {
    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!session?.user) {
    setLocation("/");
    return null;
  }

  // Profile creation/edit form
  if (isNewUser || isEditing) {
    return (
      <div className="h-full flex flex-col bg-white">
        <header className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100">
          {!isNewUser && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsEditing(false)}>
              <ArrowLeft size={20} />
            </Button>
          )}
          <h1 className="text-xl font-heading font-bold" data-testid="text-profile-edit-title">
            {isNewUser ? "Create Your Profile" : "Edit Profile"}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Name</label>
            <Input
              data-testid="input-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Age</label>
              <Input
                data-testid="input-age"
                type="number"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: parseInt(e.target.value) || 18 }))}
                min={18}
                max={100}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Gender</label>
              <select
                data-testid="select-gender"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as "Male" | "Female" | "Trans" }))}
                className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Trans">Trans</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Bio</label>
            <textarea
              data-testid="input-bio"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              className="w-full h-24 rounded-xl border border-gray-200 px-4 py-3 resize-none text-sm"
              maxLength={500}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
            <select
              data-testid="select-city"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value, location: e.target.value }))}
              className="w-full h-12 rounded-xl border border-gray-200 px-3 bg-white"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Interests ({form.interests.length}/10)
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  data-testid={`button-interest-${interest}`}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    form.interests.includes(interest)
                      ? "bg-brand-gradient text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">AI Persona</h4>
                <p className="text-xs text-muted-foreground">Get help writing messages</p>
              </div>
              <Switch
                data-testid="switch-ai-persona"
                checked={form.aiPersonaEnabled}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, aiPersonaEnabled: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Profile Visible</h4>
                <p className="text-xs text-muted-foreground">Others can see your profile</p>
              </div>
              <Switch
                data-testid="switch-visibility"
                checked={form.isVisible}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isVisible: checked }))}
              />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-lg mx-auto">
          <Button
            data-testid="button-save-profile"
            className="w-full h-14 rounded-2xl font-bold text-lg bg-brand-gradient shadow-lg"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name.trim()}
          >
            {saveMutation.isPending ? "Saving..." : (
              <>{isNewUser ? "Create Profile" : "Save Changes"} <Save className="ml-2" size={18} /></>
            )}
          </Button>
          {saveMutation.isError && (
            <p className="text-red-500 text-sm text-center mt-2">{(saveMutation.error as any)?.message || "Failed to save"}</p>
          )}
        </div>
      </div>
    );
  }

  // Profile view
  const profile = session.profile!;

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
              <div
                className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <Edit size={16} className="text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-heading font-bold text-gray-900" data-testid="text-profile-name">{profile.name}, {profile.age}</h2>
            <p className="text-muted-foreground text-sm mb-4">{profile.gender} • {profile.city}</p>
            <div className="flex gap-4 w-full justify-center">
              <div className="flex flex-col items-center bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                <span className="text-green-600 font-bold text-xl" data-testid="text-respect-score">{session.user.respectScore}</span>
                <span className="text-green-700/60 text-[10px] uppercase font-bold tracking-wider">Respect Score</span>
              </div>
              <div className="flex flex-col items-center bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                <span className="text-purple-600 font-bold text-xl">{profile.aiPersonaEnabled ? "On" : "Off"}</span>
                <span className="text-purple-700/60 text-[10px] uppercase font-bold tracking-wider">AI Persona</span>
              </div>
            </div>
          </div>
        </div>

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
                <span key={interest} className="px-3 py-1.5 bg-white rounded-full text-xs font-medium border border-gray-100 shadow-sm">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">AI Assistant</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">AI Persona</h4>
                    <p className="text-xs text-muted-foreground">{profile.aiPersonaEnabled ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setIsEditing(true)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Settings size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Tone & Style</h4>
                    <p className="text-xs text-muted-foreground">{profile.aiTone}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Account & Safety</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Privacy & Safety</h4>
                    <p className="text-xs text-muted-foreground">Manage visibility & blocks</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Notifications</h4>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <LogOut size={16} />
                  </div>
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
