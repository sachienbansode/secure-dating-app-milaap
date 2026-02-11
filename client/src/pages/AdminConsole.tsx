import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail, ArrowRight, LogOut, Users, MessageSquareQuote,
  Settings, Shield, Clock, ShieldAlert, ShieldCheck,
  Lock, EyeOff, Trash2, Plus, ChevronRight, ArrowLeft,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AuthResponse } from "@/lib/auth";

export default function AdminConsole() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: adminSession, isLoading: checkingAdmin } = useQuery({
    queryKey: ["/api/admin/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/admin/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not admin");
      return res.json();
    },
    retry: false,
  });

  if (checkingAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="animate-pulse text-white text-xl font-heading">Admin Console</div>
      </div>
    );
  }

  if (!adminSession?.admin) {
    return <AdminLogin onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/me"] })} />;
  }

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/me"] });
  };

  if (activeSection) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="p-1 hover:bg-slate-800 rounded-lg" data-testid="button-admin-back">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-lg">{activeSection}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === "All Profiles" && <AllProfilesViewer />}
          {activeSection === "Activity Logs" && <ActivityLogsViewer />}
          {activeSection === "Terms & Conditions" && <TermsEditor />}
          {activeSection === "Feature Toggles" && <FeatureToggles />}
          {activeSection === "Welcome Taglines" && <TaglineEditor />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-slate-900 text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Admin Console</h1>
            <p className="text-slate-400 text-sm mt-1">{adminSession.admin.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            data-testid="button-admin-logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          { id: "All Profiles", icon: Users, color: "bg-indigo-100 text-indigo-600", desc: "View all registered profiles" },
          { id: "Activity Logs", icon: Activity, color: "bg-slate-100 text-slate-600", desc: "View all user activity logs" },
          { id: "Terms & Conditions", icon: Shield, color: "bg-cyan-100 text-cyan-600", desc: "Edit T&C with versioning" },
          { id: "Feature Toggles", icon: Settings, color: "bg-indigo-100 text-indigo-600", desc: "Enable/disable app features" },
          { id: "Welcome Taglines", icon: MessageSquareQuote, color: "bg-amber-100 text-amber-600", desc: "Manage login welcome messages" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors text-left"
            data-testid={`admin-nav-${item.id.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-slate-800">{item.id}</h3>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOtpHint(data.otp_hint || "");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-900">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Shield size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">Admin Console</h1>
          <p className="text-slate-400 text-sm mt-1">Milaap Administration</p>
        </div>

        {error && (
          <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-xl mb-4 border border-red-800" data-testid="text-admin-error">
            {error}
          </div>
        )}

        {step === "email" ? (
          <div className="space-y-4">
            <Input
              data-testid="input-admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              type="email"
              className="h-14 text-lg bg-slate-800 border-slate-700 rounded-xl text-white placeholder-slate-500 px-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
            />
            <Button
              data-testid="button-admin-send-otp"
              onClick={handleRequestOtp}
              disabled={loading || !email.trim()}
              className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black"
            >
              {loading ? "Sending..." : "Send OTP"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {otpHint && (
              <div className="bg-blue-900/30 text-blue-400 text-sm p-3 rounded-xl border border-blue-800" data-testid="text-admin-otp-hint">
                Demo OTP: <span className="font-bold">{otpHint}</span>
              </div>
            )}
            <Input
              data-testid="input-admin-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-14 text-2xl text-center bg-slate-800 border-slate-700 rounded-xl text-white tracking-[0.5em] font-mono"
              autoFocus
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            />
            <Button
              data-testid="button-admin-verify-otp"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black"
            >
              {loading ? "Verifying..." : "Login"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-white"
              onClick={() => { setStep("email"); setOtp(""); setError(""); }}
            >
              Change email
            </Button>
          </div>
        )}
        <p className="text-xs text-slate-600 text-center mt-6">Email + OTP authentication only</p>
      </motion.div>
    </div>
  );
}

function TermsEditor() {
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/terms").then(r => r.json()).then(data => {
      setContent(data.content || "");
      setVersion(data.version || 1);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setVersion(data.version || version + 1);
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
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm text-cyan-800">Edit Terms & Conditions</h4>
          <span className="px-2 py-0.5 bg-cyan-200 text-cyan-800 rounded-full text-xs font-bold">v{version}</span>
        </div>
        <p className="text-xs text-cyan-600 mb-3">Saving will create a new version. Existing users who haven't accepted this version will see an update prompt on their next login.</p>
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
        className="w-full h-12 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white"
        data-testid="button-save-terms"
      >
        {saving ? "Saving..." : saved ? "Saved!" : `Save as v${version + 1}`}
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
      const res = await fetch(`/api/admin/activity-logs?${params}`, { credentials: "include" });
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
                      <div><span className="font-bold text-slate-600">Intent:</span> <span className="text-slate-700">{profile.intent || "—"}</span></div>
                      <div><span className="font-bold text-slate-600">Readiness:</span> <span className="text-slate-700">{profile.dateReadiness || "—"}</span></div>
                      <div><span className="font-bold text-slate-600">Interested In:</span> <span className="text-slate-700">{profile.interestedIn?.join(", ") || "—"}</span></div>
                      <div><span className="font-bold text-slate-600">Respect:</span> <span className="text-slate-700">{profile.user?.respectScore ?? "—"}</span></div>
                      <div><span className="font-bold text-slate-600">Verified:</span> <span className="text-slate-700">{profile.user?.isVerified ? "Yes" : "No"}</span></div>
                      <div><span className="font-bold text-slate-600">Photo Score:</span> <span className="text-slate-700">{profile.photoAuthenticityScore ?? "—"}</span></div>
                      <div><span className="font-bold text-slate-600">Family Mode:</span> <span className="text-slate-700">{profile.familyMode ? "On" : "Off"}</span></div>
                      <div><span className="font-bold text-slate-600">Visible:</span> <span className="text-slate-700">{profile.isVisible ? "Yes" : "No"}</span></div>
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

function FeatureToggles() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      for (const { key } of FEATURE_TOGGLES) {
        await fetch("/api/app-settings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: String(settings[key] !== false) }),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-slate-400">Loading...</div>;

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
                <p className="text-[10px] text-slate-500 truncate">{desc}</p>
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

function TaglineEditor() {
  const [taglines, setTaglines] = useState<string[]>([]);
  const [newTagline, setNewTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    } catch {}
    setSaving(false);
  };

  const addTagline = () => {
    const trimmed = newTagline.trim();
    if (trimmed && !taglines.includes(trimmed)) {
      setTaglines([...taglines, trimmed]);
      setNewTagline("");
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareQuote size={16} className="text-amber-600" />
          <h4 className="font-bold text-sm text-amber-800">Welcome Taglines</h4>
        </div>
        <p className="text-xs text-amber-700 mb-4">These taglines show randomly when users log in.</p>

        <div className="space-y-2 mb-4">
          {taglines.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-amber-100 group">
              <span className="text-sm flex-1 italic text-gray-700">"{t}"</span>
              <button onClick={() => setTaglines(taglines.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
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
          />
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100" onClick={addTagline}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      <Button
        className="w-full h-12 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
        onClick={handleSave}
        disabled={saving || taglines.length === 0}
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Taglines"}
      </Button>
    </div>
  );
}
