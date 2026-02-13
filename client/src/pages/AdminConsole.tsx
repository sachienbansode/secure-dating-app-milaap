import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail, ArrowRight, LogOut, Users, MessageSquareQuote,
  Settings, Shield, Clock, ShieldAlert, ShieldCheck,
  Lock, EyeOff, Trash2, Plus, ChevronRight, ArrowLeft,
  Activity, Heart, Paperclip, Crown, DollarSign, Bot, Megaphone, Image,
  Search, Download, AlertTriangle, Phone, MapPin, Calendar, Eye, Ban, FileText,
  MessageCircle, BarChart3, UserSearch,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AuthResponse } from "@/lib/auth";
import logoNew from "@/assets/milaap-logo.png";
import logoClassic from "@/assets/logo.png";

export default function AdminConsole() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection(null)} className="p-1 hover:bg-slate-800 rounded-lg" data-testid="button-admin-back">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-bold text-lg">{activeSection}</h2>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            data-testid="button-admin-logout-section"
          >
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === "User Lookup" && <UserLookup />}
          {activeSection === "All Profiles" && <AllProfilesViewer />}
          {activeSection === "Activity Logs" && <ActivityLogsViewer />}
          {activeSection === "Terms & Conditions" && <TermsEditor />}
          {activeSection === "Feature Toggles" && <FeatureToggles />}
          {activeSection === "Welcome Taglines" && <TaglineEditor />}
          {activeSection === "Membership Plans" && <MembershipPlansEditor />}
          {activeSection === "Ad Settings" && <AdSettingsEditor />}
          {activeSection === "Bot Mode Settings" && <BotModeSettings />}
          {activeSection === "Membership Revenue" && <MembershipRevenue />}
          {activeSection === "App Logo" && <LogoSelector />}
        </div>

        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
            <div className="relative bg-white rounded-2xl p-6 mx-6 w-full max-w-sm shadow-2xl">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3">
                  <LogOut size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Admin Logout</h3>
                <p className="text-sm text-slate-500 mt-1">Are you sure you want to log out of the admin console?</p>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  onClick={() => setShowLogoutConfirm(false)}
                  data-testid="button-admin-logout-cancel-section"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                  onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                  data-testid="button-admin-logout-confirm-section"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
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
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            data-testid="button-admin-logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          { id: "User Lookup", icon: UserSearch, color: "bg-orange-100 text-orange-600", desc: "Search & inspect any user (legal compliance)" },
          { id: "All Profiles", icon: Users, color: "bg-indigo-100 text-indigo-600", desc: "View all registered profiles" },
          { id: "Activity Logs", icon: Activity, color: "bg-slate-100 text-slate-600", desc: "View all user activity logs" },
          { id: "Terms & Conditions", icon: Shield, color: "bg-cyan-100 text-cyan-600", desc: "Edit T&C with versioning" },
          { id: "Feature Toggles", icon: Settings, color: "bg-indigo-100 text-indigo-600", desc: "Enable/disable app features" },
          { id: "Welcome Taglines", icon: MessageSquareQuote, color: "bg-red-100 text-red-600", desc: "Manage login welcome messages" },
          { id: "Membership Plans", icon: Crown, color: "bg-amber-100 text-amber-600", desc: "Manage membership tiers & pricing" },
          { id: "Ad Settings", icon: Megaphone, color: "bg-green-100 text-green-600", desc: "Configure Google Ads settings" },
          { id: "Bot Mode Settings", icon: Bot, color: "bg-purple-100 text-purple-600", desc: "Configure bot mode auto-offline" },
          { id: "Membership Revenue", icon: DollarSign, color: "bg-emerald-100 text-emerald-600", desc: "View revenue & transactions" },
          { id: "App Logo", icon: Image, color: "bg-pink-100 text-pink-600", desc: "Choose between logo styles" },
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 mx-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3">
                <LogOut size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Admin Logout</h3>
              <p className="text-sm text-slate-500 mt-1">Are you sure you want to log out of the admin console?</p>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                onClick={() => setShowLogoutConfirm(false)}
                data-testid="button-admin-logout-cancel"
              >
                Cancel
              </button>
              <button
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                data-testid="button-admin-logout-confirm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOtpHint(data.otp_hint || "");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Login failed");
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
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #030712 0%, #0a1628 30%, #041420 60%, #030712 100%)" }}>
      <div className="absolute top-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, #059669, transparent 70%)" }} />
      <div className="absolute bottom-[-10%] right-[-15%] w-[350px] h-[350px] rounded-full blur-[100px] opacity-15" style={{ background: "radial-gradient(circle, #0ea5e9, transparent 70%)" }} />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative w-20 h-20 mx-auto mb-5"
          >
            <div className="absolute inset-0 rounded-2xl blur-lg opacity-40" style={{ background: "linear-gradient(135deg, #059669, #0ea5e9)" }} />
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.2), rgba(14,165,233,0.2))", border: "1px solid rgba(5,150,105,0.3)" }}>
              <Shield size={32} style={{ color: "#34d399" }} />
            </div>
          </motion.div>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight">Admin Console</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Milaap Administration Portal</p>
        </div>

        {error && (
          <div className="text-sm p-3 rounded-xl mb-4 border" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.2)" }} data-testid="text-admin-error">
            {error}
          </div>
        )}

        {step === "credentials" ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Email</label>
              <Input
                data-testid="input-admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@milaap.co.in"
                type="email"
                className="h-14 text-lg rounded-xl text-white px-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Password</label>
              <Input
                data-testid="input-admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type="password"
                className="h-14 text-lg rounded-xl text-white px-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              data-testid="button-admin-login"
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #059669, #0ea5e9)" }}
            >
              {loading ? "Verifying..." : "Login"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm p-3 rounded-xl border" style={{ background: "rgba(5,150,105,0.1)", color: "#34d399", borderColor: "rgba(5,150,105,0.25)" }}>
              Password verified. Enter the OTP sent to your email.
            </div>
            {otpHint && (
              <div className="text-sm p-3 rounded-xl border" style={{ background: "rgba(14,165,233,0.1)", color: "#38bdf8", borderColor: "rgba(14,165,233,0.25)" }} data-testid="text-admin-otp-hint">
                Demo OTP: <span className="font-bold">{otpHint}</span>
              </div>
            )}
            <div className="flex gap-2 justify-center" data-testid="input-admin-otp">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  id={`admin-otp-box-${i}`}
                  data-testid={`input-admin-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={otp[i] || ""}
                  autoFocus={i === 0}
                  className="w-12 h-14 text-2xl text-center border-2 rounded-xl text-white font-mono focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 1) {
                      const newOtp = otp.split("");
                      newOtp[i] = val;
                      const joined = newOtp.join("").slice(0, 6);
                      setOtp(joined);
                      if (val && i < 5) document.getElementById(`admin-otp-box-${i + 1}`)?.focus();
                    } else {
                      const pasted = val.slice(0, 6);
                      setOtp(pasted);
                      const focusIdx = Math.min(pasted.length, 5);
                      document.getElementById(`admin-otp-box-${focusIdx}`)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      const newOtp = otp.split("");
                      newOtp[i - 1] = "";
                      setOtp(newOtp.join(""));
                      document.getElementById(`admin-otp-box-${i - 1}`)?.focus();
                    }
                    if (e.key === "Enter" && otp.length === 6) handleVerifyOtp();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    setOtp(pasted);
                    const focusIdx = Math.min(pasted.length, 5);
                    document.getElementById(`admin-otp-box-${focusIdx}`)?.focus();
                  }}
                />
              ))}
            </div>
            <Button
              data-testid="button-admin-verify-otp"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #059669, #0ea5e9)" }}
            >
              {loading ? "Verifying..." : "Verify & Login"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className="w-full hover:text-white"
              style={{ color: "rgba(255,255,255,0.35)" }}
              onClick={() => { setStep("credentials"); setOtp(""); setError(""); setPassword(""); }}
            >
              Back to login
            </Button>
          </div>
        )}
        <p className="text-xs text-slate-600 text-center mt-6">Email + Password + OTP authentication</p>
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
      match: "bg-blue-900/30 text-blue-400",
      chat: "bg-blue-900/30 text-blue-400",
      moderation: "bg-red-100 text-red-700",
      admin: "bg-red-900/30 text-red-400",
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
      Female: "bg-blue-900/30 text-blue-400",
      Trans: "bg-blue-900/30 text-blue-400",
      Couple: "bg-red-900/30 text-red-400",
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
    { key: "feature_couple_profiles", label: "Couple Profiles", desc: "Allow couple profile creation and visibility in discover", icon: Heart },
    { key: "feature_attachments", label: "Chat Attachments", desc: "Allow sending pictures and videos in chat (max 5MB)", icon: Paperclip },
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
      if (settings.attachment_extensions) {
        await fetch("/api/app-settings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "attachment_extensions", value: settings.attachment_extensions }),
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

      {settings.feature_attachments !== false && (
        <div className="bg-blue-900/20 rounded-2xl p-4 border border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip size={16} className="text-blue-400" />
            <h4 className="font-bold text-sm text-blue-400">Attachment Settings</h4>
          </div>
          <p className="text-xs text-blue-300 mb-3">Configure allowed file extensions for chat attachments. Comma-separated.</p>
          <Input
            value={settings.attachment_extensions || ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.mkv"}
            onChange={(e) => setSettings(s => ({ ...s, attachment_extensions: e.target.value }))}
            placeholder=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.mkv"
            className="bg-card border-blue-800 text-foreground text-sm"
            data-testid="input-attachment-extensions"
          />
          <p className="text-[10px] text-muted-foreground mt-2">Max file size: 5MB. Only image and video MIME types are accepted regardless of extension.</p>
        </div>
      )}

      <Button
        className="w-full h-12 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white"
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
      <div className="bg-red-900/20 rounded-2xl p-4 border border-red-800">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareQuote size={16} className="text-red-400" />
          <h4 className="font-bold text-sm text-red-300">Welcome Taglines</h4>
        </div>
        <p className="text-xs text-red-400 mb-4">These taglines show randomly when users log in.</p>

        <div className="space-y-2 mb-4">
          {taglines.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-red-800 group">
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
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-red-800 text-red-400 hover:bg-red-900/30" onClick={addTagline}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      <Button
        className="w-full h-12 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white"
        onClick={handleSave}
        disabled={saving || taglines.length === 0}
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Taglines"}
      </Button>
    </div>
  );
}

const PREMIUM_FEATURES = [
  { key: "ai_proxy_mode", label: "AI Proxy Mode" },
  { key: "no_screenshot_mode", label: "No Screenshot Mode" },
  { key: "photo_authenticity", label: "Photo Authenticity" },
  { key: "green_flag_stories", label: "Green Flag Stories" },
  { key: "festival_boosts", label: "Festival Boosts" },
  { key: "family_mode", label: "Family Mode" },
  { key: "date_readiness", label: "Date Readiness" },
  { key: "chat_attachments", label: "Chat Attachments" },
  { key: "contact_sharing", label: "Contact Sharing" },
  { key: "location_sharing", label: "Location Sharing" },
  { key: "super_likes", label: "Super Likes" },
  { key: "unlimited_likes", label: "Unlimited Likes" },
  { key: "see_who_liked", label: "See Who Liked" },
  { key: "profile_boost", label: "Profile Boost" },
  { key: "read_receipts", label: "Read Receipts" },
  { key: "advanced_filters", label: "Advanced Filters" },
];

function MembershipPlansEditor() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    tier: "basic",
    name: "",
    description: "",
    priceMonthly: 0,
    priceYearly: 0,
    durationDays: 30,
    dailyLikesLimit: 10,
    superLikesPerDay: 0,
    showAds: true,
    isActive: true,
    sortOrder: 0,
    color: "#6366f1",
    features: [] as string[],
  });

  useEffect(() => {
    fetch("/api/membership/plans", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updatePlanField = (id: number, field: string, value: any) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const toggleFeature = (id: number, feature: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const features = p.features || [];
        return {
          ...p,
          features: features.includes(feature)
            ? features.filter((f: string) => f !== feature)
            : [...features, feature],
        };
      })
    );
  };

  const handleSave = async (plan: any) => {
    setSavingId(plan.id);
    setSavedId(null);
    try {
      const { id, createdAt, updatedAt, ...body } = plan;
      const res = await fetch(`/api/admin/membership/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedId(plan.id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/membership/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newPlan),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = await res.json();
      setPlans((prev) => [...prev, created]);
      setNewPlan({
        tier: "basic",
        name: "",
        description: "",
        priceMonthly: 0,
        priceYearly: 0,
        durationDays: 30,
        dailyLikesLimit: 10,
        superLikesPerDay: 0,
        showAds: true,
        isActive: true,
        sortOrder: 0,
        color: "#6366f1",
        features: [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this plan?")) return;
    try {
      await fetch(`/api/admin/membership/plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="text-center py-8 text-slate-400">Loading plans...</div>
    );

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          data-testid={`plan-card-${plan.id}`}
        >
          <button
            className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
            onClick={() =>
              setExpandedId(expandedId === plan.id ? null : plan.id)
            }
            data-testid={`plan-toggle-${plan.id}`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: plan.color || "#6366f1" }}
            >
              <Crown size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-800">
                  {plan.name || plan.tier}
                </h3>
                {!plan.isActive && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-bold">
                    INACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                ₹{plan.priceMonthly}/mo · ₹{plan.priceYearly}/yr ·{" "}
                {(plan.features || []).length} features
              </p>
            </div>
            <ChevronRight
              size={18}
              className={`text-slate-300 transition-transform ${expandedId === plan.id ? "rotate-90" : ""}`}
            />
          </button>

          {expandedId === plan.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Tier
                  </label>
                  <select
                    value={plan.tier}
                    onChange={(e) =>
                      updatePlanField(plan.id, "tier", e.target.value)
                    }
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    data-testid={`plan-tier-${plan.id}`}
                  >
                    <option value="basic">Basic</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Name
                  </label>
                  <Input
                    value={plan.name || ""}
                    onChange={(e) =>
                      updatePlanField(plan.id, "name", e.target.value)
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-name-${plan.id}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                  Description
                </label>
                <Input
                  value={plan.description || ""}
                  onChange={(e) =>
                    updatePlanField(plan.id, "description", e.target.value)
                  }
                  className="h-10 rounded-xl text-sm"
                  data-testid={`plan-desc-${plan.id}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Price Monthly (₹)
                  </label>
                  <Input
                    type="number"
                    value={plan.priceMonthly ?? 0}
                    onChange={(e) =>
                      updatePlanField(
                        plan.id,
                        "priceMonthly",
                        Number(e.target.value)
                      )
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-price-monthly-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Price Yearly (₹)
                  </label>
                  <Input
                    type="number"
                    value={plan.priceYearly ?? 0}
                    onChange={(e) =>
                      updatePlanField(
                        plan.id,
                        "priceYearly",
                        Number(e.target.value)
                      )
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-price-yearly-${plan.id}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Duration (days)
                  </label>
                  <Input
                    type="number"
                    value={plan.durationDays ?? 30}
                    onChange={(e) =>
                      updatePlanField(
                        plan.id,
                        "durationDays",
                        Number(e.target.value)
                      )
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-duration-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Daily Likes
                  </label>
                  <Input
                    type="number"
                    value={plan.dailyLikesLimit ?? 10}
                    onChange={(e) =>
                      updatePlanField(
                        plan.id,
                        "dailyLikesLimit",
                        Number(e.target.value)
                      )
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-likes-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Super Likes/Day
                  </label>
                  <Input
                    type="number"
                    value={plan.superLikesPerDay ?? 0}
                    onChange={(e) =>
                      updatePlanField(
                        plan.id,
                        "superLikesPerDay",
                        Number(e.target.value)
                      )
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-superlikes-${plan.id}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={plan.sortOrder ?? 0}
                    onChange={(e) =>
                      updatePlanField(
                        plan.id,
                        "sortOrder",
                        Number(e.target.value)
                      )
                    }
                    className="h-10 rounded-xl text-sm"
                    data-testid={`plan-sort-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Color
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={plan.color || "#6366f1"}
                      onChange={(e) =>
                        updatePlanField(plan.id, "color", e.target.value)
                      }
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      data-testid={`plan-color-${plan.id}`}
                    />
                    <Input
                      value={plan.color || "#6366f1"}
                      onChange={(e) =>
                        updatePlanField(plan.id, "color", e.target.value)
                      }
                      className="h-10 rounded-xl text-sm flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.showAds !== false}
                    onCheckedChange={(checked) =>
                      updatePlanField(plan.id, "showAds", checked)
                    }
                    data-testid={`plan-showads-${plan.id}`}
                  />
                  <span className="text-sm text-slate-700">Show Ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.isActive !== false}
                    onCheckedChange={(checked) =>
                      updatePlanField(plan.id, "isActive", checked)
                    }
                    data-testid={`plan-active-${plan.id}`}
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">
                  Features
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PREMIUM_FEATURES.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors"
                      data-testid={`plan-feature-${plan.id}-${f.key}`}
                    >
                      <input
                        type="checkbox"
                        checked={(plan.features || []).includes(f.key)}
                        onChange={() => toggleFeature(plan.id, f.key)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleSave(plan)}
                  disabled={savingId === plan.id}
                  className="flex-1 h-10 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid={`plan-save-${plan.id}`}
                >
                  {savingId === plan.id
                    ? "Saving..."
                    : savedId === plan.id
                      ? "Saved!"
                      : "Save Plan"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDelete(plan.id)}
                  className="h-10 rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                  data-testid={`plan-delete-${plan.id}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Plus size={16} className="text-amber-600" />
          <h4 className="font-bold text-sm text-amber-800">Create New Plan</h4>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Tier
            </label>
            <select
              value={newPlan.tier}
              onChange={(e) =>
                setNewPlan((p) => ({ ...p, tier: e.target.value }))
              }
              className="w-full h-10 rounded-xl border border-amber-200 px-3 text-sm bg-white"
              data-testid="new-plan-tier"
            >
              <option value="basic">Basic</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Name
            </label>
            <Input
              value={newPlan.name}
              onChange={(e) =>
                setNewPlan((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Plan name"
              className="h-10 rounded-xl text-sm"
              data-testid="new-plan-name"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Price Monthly (₹)
            </label>
            <Input
              type="number"
              value={newPlan.priceMonthly}
              onChange={(e) =>
                setNewPlan((p) => ({
                  ...p,
                  priceMonthly: Number(e.target.value),
                }))
              }
              className="h-10 rounded-xl text-sm"
              data-testid="new-plan-price-monthly"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Price Yearly (₹)
            </label>
            <Input
              type="number"
              value={newPlan.priceYearly}
              onChange={(e) =>
                setNewPlan((p) => ({
                  ...p,
                  priceYearly: Number(e.target.value),
                }))
              }
              className="h-10 rounded-xl text-sm"
              data-testid="new-plan-price-yearly"
            />
          </div>
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating || !newPlan.name.trim()}
          className="w-full h-10 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
          data-testid="button-create-plan"
        >
          {creating ? "Creating..." : "Create Plan"}
        </Button>
      </div>
    </div>
  );
}

function AdSettingsEditor() {
  const [settings, setSettings] = useState<any>({
    enabled: false,
    publisherId: "",
    slotId: "",
    bannerSlotId: "",
    frequency: 5,
    interstitialFrequency: 10,
    placements: { discover: true, matches: false, profile: false },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/ad-settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/ad-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
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

  if (loading)
    return (
      <div className="text-center py-8 text-slate-400">Loading...</div>
    );

  const placements = settings.placements || {
    discover: true,
    matches: false,
    profile: false,
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={16} className="text-green-600" />
          <h4 className="font-bold text-sm text-green-800">
            Google Ads Configuration
          </h4>
        </div>
        <p className="text-xs text-green-700 mb-4">
          Configure ad display settings for free-tier users.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-green-100">
            <div className="flex-1">
              <h5 className="font-semibold text-sm">Ads Enabled</h5>
              <p className="text-[10px] text-slate-500">
                Toggle ads on/off globally
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings((s: any) => ({ ...s, enabled: checked }))
              }
              data-testid="toggle-ads-enabled"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Publisher ID
            </label>
            <Input
              value={settings.publisherId || ""}
              onChange={(e) =>
                setSettings((s: any) => ({ ...s, publisherId: e.target.value }))
              }
              placeholder="ca-pub-xxxxxxxxxxxxxxxx"
              className="h-10 rounded-xl text-sm"
              data-testid="input-ad-publisher-id"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Slot ID
              </label>
              <Input
                value={settings.slotId || ""}
                onChange={(e) =>
                  setSettings((s: any) => ({ ...s, slotId: e.target.value }))
                }
                placeholder="xxxxxxxxxx"
                className="h-10 rounded-xl text-sm"
                data-testid="input-ad-slot-id"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Banner Slot ID
              </label>
              <Input
                value={settings.bannerSlotId || ""}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    bannerSlotId: e.target.value,
                  }))
                }
                placeholder="xxxxxxxxxx"
                className="h-10 rounded-xl text-sm"
                data-testid="input-ad-banner-slot-id"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Ad Frequency (every N swipes)
              </label>
              <Input
                type="number"
                value={settings.frequency ?? 5}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    frequency: Number(e.target.value),
                  }))
                }
                className="h-10 rounded-xl text-sm"
                data-testid="input-ad-frequency"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Interstitial Frequency
              </label>
              <Input
                type="number"
                value={settings.interstitialFrequency ?? 10}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    interstitialFrequency: Number(e.target.value),
                  }))
                }
                className="h-10 rounded-xl text-sm"
                data-testid="input-ad-interstitial-frequency"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">
              Ad Placements
            </label>
            <div className="space-y-1.5">
              {(["discover", "matches", "profile"] as const).map((placement) => (
                <label
                  key={placement}
                  className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 cursor-pointer hover:bg-green-50 transition-colors border border-green-100"
                  data-testid={`ad-placement-${placement}`}
                >
                  <input
                    type="checkbox"
                    checked={placements[placement] || false}
                    onChange={(e) =>
                      setSettings((s: any) => ({
                        ...s,
                        placements: {
                          ...s.placements,
                          [placement]: e.target.checked,
                        },
                      }))
                    }
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {placement}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-2xl font-bold bg-green-600 hover:bg-green-700 text-white"
        data-testid="button-save-ad-settings"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Ad Settings"}
      </Button>
    </div>
  );
}

function BotModeSettings() {
  const [maxHours, setMaxHours] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot-mode-settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.maxHours !== undefined) setMaxHours(data.maxHours);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/bot-mode-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ maxHours }),
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

  if (loading)
    return (
      <div className="text-center py-8 text-slate-400">Loading...</div>
    );

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={16} className="text-purple-600" />
          <h4 className="font-bold text-sm text-purple-800">
            Bot Mode Auto-Offline
          </h4>
        </div>
        <p className="text-xs text-purple-700 mb-4">
          Users in bot mode will automatically go offline after this many hours
          of inactivity. This prevents bot profiles from appearing online
          indefinitely and ensures a more authentic experience for other users.
        </p>

        <div className="bg-white rounded-xl px-4 py-3 border border-purple-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
            Max Hours Before Auto-Offline
          </label>
          <Input
            type="number"
            value={maxHours}
            onChange={(e) => setMaxHours(Number(e.target.value))}
            min={1}
            max={168}
            className="h-10 rounded-xl text-sm"
            data-testid="input-bot-max-hours"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Default: 12 hours. Range: 1-168 hours (1 week).
          </p>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white"
        data-testid="button-save-bot-settings"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Bot Mode Settings"}
      </Button>
    </div>
  );
}

function MembershipRevenue() {
  const [revenue, setRevenue] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    fetch("/api/admin/membership/revenue", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setRevenue(data);
        setLoadingRevenue(false);
      })
      .catch(() => setLoadingRevenue(false));

    fetch("/api/admin/membership/transactions", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : data.transactions || []);
        setLoadingTx(false);
      })
      .catch(() => setLoadingTx(false));
  }, []);

  const formatCurrency = (amount: number) =>
    `₹${(amount || 0).toLocaleString("en-IN")}`;

  const formatDate = (date: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {loadingRevenue ? (
        <div className="text-center py-8 text-slate-400">
          Loading revenue...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">
                Total Revenue
              </p>
              <p
                className="text-xl font-bold text-emerald-800 mt-1"
                data-testid="text-total-revenue"
              >
                {formatCurrency(revenue?.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-[10px] font-bold text-blue-600 uppercase">
                Monthly Revenue
              </p>
              <p
                className="text-xl font-bold text-blue-800 mt-1"
                data-testid="text-monthly-revenue"
              >
                {formatCurrency(revenue?.monthlyRevenue || 0)}
              </p>
            </div>
          </div>

          {revenue?.revenueByTier &&
            Object.keys(revenue.revenueByTier).length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-bold text-sm text-slate-800 mb-3">
                  Revenue by Tier
                </h4>
                <div className="space-y-2">
                  {Object.entries(revenue.revenueByTier).map(
                    ([tier, amount]: [string, any]) => (
                      <div
                        key={tier}
                        className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5"
                        data-testid={`revenue-tier-${tier}`}
                      >
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {tier}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {formatCurrency(Number(amount))}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </>
      )}

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h4 className="font-bold text-sm text-slate-800 mb-3">
          Recent Transactions
        </h4>
        {loadingTx ? (
          <div className="text-center py-4 text-slate-400 text-sm">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-sm">
            No transactions found
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any, idx: number) => (
              <div
                key={tx.id || idx}
                className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                data-testid={`transaction-${tx.id || idx}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {tx.userName || tx.userId || "User"}
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-bold uppercase">
                      {tx.tier || tx.planName || "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatDate(tx.createdAt || tx.date)} ·{" "}
                    {tx.type || tx.billingCycle || "purchase"}
                  </p>
                </div>
                <span className="font-bold text-sm text-emerald-700">
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogoSelector() {
  const [selected, setSelected] = useState<"new" | "classic">("new");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/app-settings")
      .then(r => r.json())
      .then(data => {
        if (data.selected_logo) setSelected(data.selected_logo);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (choice: "new" | "classic") => {
    setSelected(choice);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "selected_logo", value: choice }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-pink-900/20 rounded-2xl p-4 border border-pink-800">
        <div className="flex items-center gap-2 mb-3">
          <Image size={16} className="text-pink-400" />
          <h4 className="font-bold text-sm text-pink-300">App Logo</h4>
        </div>
        <p className="text-xs text-pink-400 mb-4">Select which logo to display on the login screen.</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSave("new")}
            className="rounded-2xl p-4 flex flex-col items-center gap-3 transition-all border-2"
            style={{
              background: selected === "new" ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.03)",
              borderColor: selected === "new" ? "#ec4899" : "rgba(255,255,255,0.1)",
            }}
            data-testid="button-logo-new"
          >
            <div className="w-20 h-20 rounded-xl bg-black/40 flex items-center justify-center p-2 border border-white/10">
              <img src={logoNew} alt="New Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-semibold" style={{ color: selected === "new" ? "#ec4899" : "rgba(255,255,255,0.5)" }}>Modern</span>
            {selected === "new" && <span className="text-[10px] font-bold text-pink-400 bg-pink-900/40 px-2 py-0.5 rounded-full">Active</span>}
          </button>
          <button
            onClick={() => handleSave("classic")}
            className="rounded-2xl p-4 flex flex-col items-center gap-3 transition-all border-2"
            style={{
              background: selected === "classic" ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.03)",
              borderColor: selected === "classic" ? "#ec4899" : "rgba(255,255,255,0.1)",
            }}
            data-testid="button-logo-classic"
          >
            <div className="w-20 h-20 rounded-xl bg-black/40 flex items-center justify-center p-2 border border-white/10">
              <img src={logoClassic} alt="Classic Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-semibold" style={{ color: selected === "classic" ? "#ec4899" : "rgba(255,255,255,0.5)" }}>Classic</span>
            {selected === "classic" && <span className="text-[10px] font-bold text-pink-400 bg-pink-900/40 px-2 py-0.5 rounded-full">Active</span>}
          </button>
        </div>
      </div>
      {saved && (
        <div className="text-center text-sm text-green-400 font-medium py-2">Logo updated successfully!</div>
      )}
    </div>
  );
}

function UserLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["/api/admin/user-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { results: [] };
      const res = await fetch(`/api/admin/user-search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const { data: userDetail, isLoading: loadingDetail, isError: detailError } = useQuery({
    queryKey: ["/api/admin/user-detail", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/user-detail/${selectedUserId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedUserId,
    retry: 1,
  });

  const handleExport = async () => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/admin/user-export/${selectedUserId}`, { credentials: "include" });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `milaap-user-${selectedUserId}-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  const tierColors: Record<string, string> = {
    basic: "bg-slate-500", silver: "bg-slate-400", gold: "bg-yellow-500", platinum: "bg-purple-500",
  };

  if (selectedUserId && userDetail) {
    const { user, profile, matches, sessions, reports, blocks, messages, activityLogs, transactions, quizResponses, chaiDates } = userDetail;
    const tabs = [
      { id: "profile", label: "Profile", icon: Eye },
      { id: "activity", label: "Activity", icon: Activity },
      { id: "chats", label: "Chats", icon: MessageCircle },
      { id: "reports", label: "Reports & Blocks", icon: AlertTriangle },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "export", label: "Export", icon: Download },
    ];

    return (
      <div className="space-y-4" data-testid="admin-user-detail-view">
        <button
          onClick={() => { setSelectedUserId(null); setActiveTab("profile"); }}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          data-testid="button-back-to-search"
        >
          <ArrowLeft size={16} /> Back to search
        </button>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            {profile?.photos?.[0] ? (
              <img src={profile.photos[0]} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <Users size={24} className="text-slate-400" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900" data-testid="text-user-name">{profile?.name || "No Profile"}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${tierColors[user.membershipTier] || "bg-slate-500"}`}>
                  {user.membershipTier}
                </span>
                {user.isBanned && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Banned</span>}
                {user.isDeactivated && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Deactivated</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-1"><Phone size={12} /> {user.phone || "N/A"}</div>
                <div className="flex items-center gap-1"><Mail size={12} /> {user.email || "N/A"}</div>
                <div className="flex items-center gap-1"><Calendar size={12} /> Joined: {formatDate(user.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
              data-testid={`tab-${t.id}`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="space-y-3" data-testid="tab-content-profile">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3">User Account</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">User ID</span><p className="font-mono text-slate-700 break-all">{user.id}</p></div>
                <div><span className="text-slate-400">Respect Score</span><p className="font-semibold text-slate-700">{user.respectScore}/100</p></div>
                <div><span className="text-slate-400">Report Count</span><p className="font-semibold text-slate-700">{user.reportCount}</p></div>
                <div><span className="text-slate-400">Last Seen</span><p className="text-slate-700">{formatDate(user.lastSeenAt)}</p></div>
                <div><span className="text-slate-400">Online</span><p className="text-slate-700">{user.isOnline ? "Yes" : "No"}</p></div>
                <div><span className="text-slate-400">Terms Accepted</span><p className="text-slate-700">v{user.termsAcceptedVersion || "N/A"} at {formatDate(user.termsAcceptedAt)}</p></div>
                <div><span className="text-slate-400">Membership Expires</span><p className="text-slate-700">{formatDate(user.membershipExpiresAt)}</p></div>
                <div><span className="text-slate-400">Daily Likes Used</span><p className="text-slate-700">{user.dailyLikesUsed}/{user.dailyLikesLimit}</p></div>
              </div>
            </div>
            {profile && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 mb-3">Profile Details</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">Age</span><p className="text-slate-700">{profile.age}</p></div>
                  <div><span className="text-slate-400">Gender</span><p className="text-slate-700">{profile.gender}</p></div>
                  <div><span className="text-slate-400">City</span><p className="text-slate-700">{profile.city}</p></div>
                  <div><span className="text-slate-400">Location</span><p className="text-slate-700">{profile.location}</p></div>
                  <div><span className="text-slate-400">DOB</span><p className="text-slate-700">{profile.dateOfBirth || "N/A"}</p></div>
                  <div><span className="text-slate-400">Zodiac</span><p className="text-slate-700">{profile.zodiacSign || "N/A"}</p></div>
                  <div><span className="text-slate-400">Intent</span><p className="text-slate-700">{profile.intent || "N/A"}</p></div>
                  <div><span className="text-slate-400">Expectations</span><p className="text-slate-700">{profile.expectations || "N/A"}</p></div>
                  <div><span className="text-slate-400">Date Readiness</span><p className="text-slate-700">{profile.dateReadiness || "N/A"}</p></div>
                  <div><span className="text-slate-400">Verified</span><p className="text-slate-700">{profile.isVerified ? "Yes" : "No"}</p></div>
                  <div><span className="text-slate-400">Interested In</span><p className="text-slate-700">{profile.interestedIn?.join(", ") || "N/A"}</p></div>
                  <div><span className="text-slate-400">Dating Style</span><p className="text-slate-700">{profile.datingStyle || "N/A"}</p></div>
                </div>
                {profile.bio && (
                  <div className="mt-3"><span className="text-slate-400 text-xs">Bio</span><p className="text-xs text-slate-700 mt-1">{profile.bio}</p></div>
                )}
                {profile.interests?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-slate-400 text-xs">Interests</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.interests.map((i: string, idx: number) => (
                        <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.photos?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-slate-400 text-xs">Photos ({profile.photos.length})</span>
                    <div className="flex gap-2 mt-1 overflow-x-auto">
                      {profile.photos.map((p: string, idx: number) => (
                        <img key={idx} src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {sessions?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 mb-3">Login Sessions ({sessions.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sessions.map((s: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-xl p-2 flex items-center justify-between">
                      <div>
                        <div className="text-slate-700 font-medium">{s.ipAddress || "Unknown IP"}</div>
                        <div className="text-slate-400">{s.location || "Unknown location"} | {s.userAgent?.substring(0, 40) || "Unknown"}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${s.isActive ? "text-green-600" : "text-slate-400"}`}>
                          {s.isActive ? "Active" : "Expired"}
                        </div>
                        <div className="text-slate-400">{formatDate(s.lastActivityAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {matches?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 mb-3">Matches ({matches.length})</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {matches.map((m: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-lg p-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-slate-500">{m.userId === selectedUserId ? m.targetUserId : m.userId}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${m.action === "like" ? "bg-green-100 text-green-700" : m.action === "dislike" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {m.action}
                        </span>
                        {m.isMatched && <span className="ml-1 px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[10px] font-medium">Mutual</span>}
                      </div>
                      <span className="text-slate-400">{formatDate(m.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3" data-testid="tab-content-activity">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3">Activity Logs ({activityLogs?.length || 0})</h3>
              {activityLogs?.length > 0 ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {activityLogs.map((log: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-xl p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{log.action}</span>
                        <span className="text-slate-400">{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-medium">{log.category}</span>
                        {log.ipAddress && <span className="text-slate-400">{log.ipAddress}</span>}
                      </div>
                      {log.details && (
                        <div className="mt-1 text-slate-500 font-mono text-[10px] break-all">{JSON.stringify(log.details)}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No activity logs found.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "chats" && (
          <div className="space-y-3" data-testid="tab-content-chats">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3">Messages Sent ({messages?.length || 0})</h3>
              {messages?.length > 0 ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {messages.map((m: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 font-mono text-[10px]">Match: {m.matchId?.substring(0, 8)}...</span>
                        <span className="text-slate-400">{formatDate(m.message?.createdAt)}</span>
                      </div>
                      <p className="text-slate-700">{m.message?.content}</p>
                      {m.message?.isAiGenerated && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded mt-1 inline-block">AI Generated</span>}
                      {m.message?.attachmentUrl && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded mt-1 inline-block ml-1">Attachment</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No messages found.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3" data-testid="tab-content-reports">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Reports ({reports?.length || 0})
              </h3>
              {reports?.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reports.map((r: any, idx: number) => (
                    <div key={idx} className="text-xs bg-red-50 rounded-xl p-3 border border-red-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.reporterId === selectedUserId ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                          {r.reporterId === selectedUserId ? "Filed by user" : "Against user"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.status === "resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium mt-1">{r.reason}</p>
                      {r.details && <p className="text-slate-500 mt-0.5">{r.details}</p>}
                      {r.actionTaken && r.actionTaken !== "pending" && <p className="text-slate-600 mt-1">Action: {r.actionTaken}</p>}
                      <p className="text-slate-400 mt-1">{formatDate(r.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No reports found.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <Ban size={16} className="text-slate-500" /> Blocks ({blocks?.length || 0})
              </h3>
              {blocks?.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {blocks.map((b: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${b.blockerId === selectedUserId ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                          {b.blockerId === selectedUserId ? "Blocked by user" : "User was blocked"}
                        </span>
                        <span className="ml-2 font-mono text-slate-500">{b.blockerId === selectedUserId ? b.blockedUserId : b.blockerId}</span>
                      </div>
                      <span className="text-slate-400">{formatDate(b.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No blocks found.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-3" data-testid="tab-content-analytics">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3">User Analytics Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Matches", value: matches?.length || 0, color: "text-pink-600" },
                  { label: "Mutual Matches", value: matches?.filter((m: any) => m.isMatched).length || 0, color: "text-green-600" },
                  { label: "Messages Sent", value: messages?.length || 0, color: "text-blue-600" },
                  { label: "Reports Filed", value: reports?.filter((r: any) => r.reporterId === selectedUserId).length || 0, color: "text-orange-600" },
                  { label: "Reports Against", value: reports?.filter((r: any) => r.reportedUserId === selectedUserId).length || 0, color: "text-red-600" },
                  { label: "Users Blocked", value: blocks?.filter((b: any) => b.blockerId === selectedUserId).length || 0, color: "text-slate-600" },
                  { label: "Blocked By Others", value: blocks?.filter((b: any) => b.blockedUserId === selectedUserId).length || 0, color: "text-slate-500" },
                  { label: "Login Sessions", value: sessions?.length || 0, color: "text-indigo-600" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {transactions?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 mb-3">Membership Transactions ({transactions.length})</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {transactions.map((t: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-700">{t.planTier}</span>
                        <span className="ml-2 text-slate-500">INR {t.amount}</span>
                      </div>
                      <div className="text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{t.status}</span>
                        <div className="text-slate-400 mt-0.5">{formatDate(t.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quizResponses?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 mb-3">Quiz Responses ({quizResponses.length})</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {quizResponses.map((q: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-lg p-2">
                      <span className="text-slate-500">Q{q.questionId}:</span> <span className="text-slate-700 font-medium">{q.answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chaiDates?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 mb-3">Chai Dates ({chaiDates.length})</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {chaiDates.map((cd: any, idx: number) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500">With: </span>
                        <span className="font-mono text-slate-700">{cd.requesterId === selectedUserId ? cd.recipientId : cd.requesterId}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cd.status === "completed" ? "bg-green-100 text-green-700" : cd.status === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {cd.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div className="space-y-3" data-testid="tab-content-export">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" /> Legal Data Export
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Export all user data as a JSON file for legal compliance purposes. This includes profile information, 
                messages, activity logs, reports, blocks, session history, and membership transactions. 
                This action is logged for audit purposes.
              </p>
              <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium">Legal Notice</p>
                    <p className="mt-1">Data exports are permitted under Milaap's Terms & Conditions for legitimate legal purposes only. 
                    All export actions are logged with admin ID, timestamp, and IP address for audit trail compliance.</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Export Contents:</h4>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>- User account details (phone, email, membership, respect score)</li>
                  <li>- Profile information (name, age, gender, city, bio, interests, photos)</li>
                  <li>- Match history (all likes, dislikes, mutual matches)</li>
                  <li>- Messages sent by user (up to 500 most recent)</li>
                  <li>- Reports filed by and against user</li>
                  <li>- Block actions (initiated and received)</li>
                  <li>- Login session history (IP addresses, locations, devices)</li>
                  <li>- Activity logs (up to 500 most recent)</li>
                  <li>- Membership transactions</li>
                  <li>- Quiz responses & Chai Date history</li>
                </ul>
              </div>
              <button
                onClick={handleExport}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                data-testid="button-export-user-data"
              >
                <Download size={16} /> Download User Data Export (JSON)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedUserId && loadingDetail) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-slate-400 text-sm">Loading user details...</div>
      </div>
    );
  }

  if (selectedUserId && detailError) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedUserId(null); setActiveTab("profile"); }}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <ArrowLeft size={16} /> Back to search
        </button>
        <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-100">
          <AlertTriangle size={32} className="mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-600 font-medium">Failed to load user details</p>
          <p className="text-xs text-red-400 mt-1">The user may not exist or there was a server error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-user-search-view">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
          <UserSearch size={16} className="text-orange-500" /> User Lookup
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Search by name, mobile number, or email address. Minimum 2 characters required.
        </p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone (+91...), or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            data-testid="input-user-search"
          />
        </div>
      </div>

      {searching && (
        <div className="text-center py-4">
          <div className="animate-pulse text-sm text-slate-400">Searching...</div>
        </div>
      )}

      {searchResults?.results?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium">{searchResults.results.length} result(s) found</p>
          {searchResults.results.map((r: any) => (
            <button
              key={r.userId}
              onClick={() => setSelectedUserId(r.userId)}
              className="w-full bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors text-left flex items-center gap-3"
              data-testid={`search-result-${r.userId}`}
            >
              {r.photos?.[0] ? (
                <img src={r.photos[0]} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <Users size={18} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800 truncate">{r.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${tierColors[r.membershipTier] || "bg-slate-500"}`}>
                    {r.membershipTier}
                  </span>
                  {r.isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Banned</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {r.phone && <span className="mr-3">{r.phone}</span>}
                  {r.email && <span>{r.email}</span>}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {r.city && <span>{r.city}</span>}
                  {r.gender && <span className="ml-2">{r.gender}</span>}
                  {r.lastSeenAt && <span className="ml-2">Last seen: {formatDate(r.lastSeenAt)}</span>}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {debouncedQuery.length >= 2 && !searching && searchResults?.results?.length === 0 && (
        <div className="text-center py-8">
          <UserSearch size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No users found for "{debouncedQuery}"</p>
        </div>
      )}
    </div>
  );
}
