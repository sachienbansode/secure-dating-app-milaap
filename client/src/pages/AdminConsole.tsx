import { useState, useEffect, useRef } from "react";
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
  MessageCircle, BarChart3, UserSearch, X,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AuthResponse } from "@/lib/auth";
import logoNew from "@/assets/milaap-logo.png";
import logoClassic from "@/assets/logo.png";

const NAV_ITEMS = [
  { id: "Analytics Dashboard", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50", desc: "Onboarding, DAU & usage trends" },
  { id: "Active Duration", icon: Clock, color: "text-cyan-600", bg: "bg-cyan-50", desc: "User daily active time" },
  { id: "User Lookup", icon: UserSearch, color: "text-orange-600", bg: "bg-orange-50", desc: "Search & inspect any user" },
  { id: "User Memberships", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", desc: "Search & update user memberships" },
  { id: "All Profiles", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", desc: "View all registered profiles" },
  { id: "Activity Logs", icon: Activity, color: "text-slate-600", bg: "bg-slate-100", desc: "View all user activity logs" },
  { id: "Terms & Conditions", icon: Shield, color: "text-teal-600", bg: "bg-teal-50", desc: "Edit T&C with versioning" },
  { id: "Feature Toggles", icon: Settings, color: "text-violet-600", bg: "bg-violet-50", desc: "Enable/disable app features" },
  { id: "Welcome Taglines", icon: MessageSquareQuote, color: "text-red-600", bg: "bg-red-50", desc: "Manage login messages" },
  { id: "Membership Plans", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", desc: "Manage membership tiers" },
  { id: "Ad Settings", icon: Megaphone, color: "text-green-600", bg: "bg-green-50", desc: "Configure Google Ads" },
  { id: "Bot Mode Settings", icon: Bot, color: "text-purple-600", bg: "bg-purple-50", desc: "Bot auto-offline & proxy pause" },
  { id: "Membership Revenue", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Revenue & transactions" },
  { id: "App Logo", icon: Image, color: "text-pink-600", bg: "bg-pink-50", desc: "Choose between logo styles" },
  { id: "Seed Profiles", icon: Users, color: "text-teal-600", bg: "bg-teal-50", desc: "Test profiles with phone numbers" },
  { id: "Background Music", icon: Megaphone, color: "text-rose-600", bg: "bg-rose-50", desc: "Upload background music" },
];

export default function AdminConsole() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string>("Analytics Dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  useEffect(() => {
    const el = document.getElementById("admin-theme-style") || (() => {
      const s = document.createElement("style"); s.id = "admin-theme-style"; document.head.appendChild(s); return s;
    })();
    el.textContent = `
      .admin-root [class~="bg-white"] { background-color: #0d1728 !important; color: rgba(255,255,255,0.9) !important; }
      .admin-root [class~="bg-slate-50"] { background-color: #080f1e !important; }
      .admin-root [class~="bg-slate-100"] { background-color: rgba(255,255,255,0.06) !important; }
      .admin-root [class~="bg-slate-200"] { background-color: rgba(255,255,255,0.1) !important; }
      .admin-root [class~="bg-indigo-50"] { background-color: rgba(6,182,212,0.07) !important; }
      .admin-root [class~="bg-teal-50"] { background-color: rgba(20,184,166,0.07) !important; }
      .admin-root [class~="bg-cyan-50"] { background-color: rgba(6,182,212,0.07) !important; }
      .admin-root [class~="bg-orange-50"] { background-color: rgba(249,115,22,0.07) !important; }
      .admin-root [class~="bg-amber-50"] { background-color: rgba(245,158,11,0.07) !important; }
      .admin-root [class~="bg-violet-50"] { background-color: rgba(139,92,246,0.07) !important; }
      .admin-root [class~="bg-red-50"] { background-color: rgba(239,68,68,0.07) !important; }
      .admin-root [class~="bg-blue-50"] { background-color: rgba(59,130,246,0.07) !important; }
      .admin-root [class~="bg-green-50"] { background-color: rgba(16,185,129,0.07) !important; }
      .admin-root [class~="bg-pink-50"] { background-color: rgba(236,72,153,0.07) !important; }
      .admin-root [class~="bg-purple-50"] { background-color: rgba(168,85,247,0.07) !important; }
      .admin-root [class~="bg-rose-50"] { background-color: rgba(244,63,94,0.07) !important; }
      .admin-root [class~="bg-emerald-50"] { background-color: rgba(16,185,129,0.07) !important; }
      .admin-root [class~="bg-green-100"] { background-color: rgba(16,185,129,0.12) !important; }
      .admin-root [class~="bg-red-100"] { background-color: rgba(239,68,68,0.12) !important; }
      .admin-root [class~="bg-blue-100"] { background-color: rgba(59,130,246,0.12) !important; }
      .admin-root [class~="bg-yellow-100"] { background-color: rgba(234,179,8,0.12) !important; }
      .admin-root [class~="bg-purple-100"] { background-color: rgba(168,85,247,0.12) !important; }
      .admin-root [class~="bg-orange-100"] { background-color: rgba(249,115,22,0.12) !important; }
      .admin-root [class~="bg-amber-100"] { background-color: rgba(245,158,11,0.12) !important; }
      .admin-root [class~="bg-indigo-100"] { background-color: rgba(99,102,241,0.12) !important; }
      .admin-root [class~="text-slate-900"] { color: rgba(255,255,255,0.95) !important; }
      .admin-root [class~="text-slate-800"] { color: rgba(255,255,255,0.9) !important; }
      .admin-root [class~="text-slate-700"] { color: rgba(255,255,255,0.72) !important; }
      .admin-root [class~="text-slate-600"] { color: rgba(255,255,255,0.52) !important; }
      .admin-root [class~="text-slate-500"] { color: rgba(255,255,255,0.4) !important; }
      .admin-root [class~="text-slate-400"] { color: rgba(255,255,255,0.32) !important; }
      .admin-root [class~="text-slate-300"] { color: rgba(255,255,255,0.28) !important; }
      .admin-root [class~="text-indigo-800"] { color: #67e8f9 !important; }
      .admin-root [class~="text-indigo-600"] { color: #67e8f9 !important; }
      .admin-root [class~="text-cyan-800"] { color: #67e8f9 !important; }
      .admin-root [class~="text-cyan-600"] { color: #22d3ee !important; }
      .admin-root [class~="text-teal-800"] { color: #2dd4bf !important; }
      .admin-root [class~="text-teal-700"] { color: #2dd4bf !important; }
      .admin-root [class~="text-teal-600"] { color: #2dd4bf !important; }
      .admin-root [class~="text-green-700"] { color: #34d399 !important; }
      .admin-root [class~="text-green-600"] { color: #34d399 !important; }
      .admin-root [class~="text-red-700"] { color: #f87171 !important; }
      .admin-root [class~="text-red-600"] { color: #f87171 !important; }
      .admin-root [class~="text-blue-700"] { color: #60a5fa !important; }
      .admin-root [class~="text-blue-600"] { color: #60a5fa !important; }
      .admin-root [class~="text-orange-700"] { color: #fb923c !important; }
      .admin-root [class~="text-orange-600"] { color: #fb923c !important; }
      .admin-root [class~="text-amber-700"] { color: #fbbf24 !important; }
      .admin-root [class~="text-amber-600"] { color: #fbbf24 !important; }
      .admin-root [class~="text-violet-700"] { color: #c084fc !important; }
      .admin-root [class~="text-violet-600"] { color: #c084fc !important; }
      .admin-root [class~="text-purple-700"] { color: #c084fc !important; }
      .admin-root [class~="text-purple-600"] { color: #c084fc !important; }
      .admin-root [class~="text-pink-600"] { color: #f472b6 !important; }
      .admin-root [class~="text-emerald-600"] { color: #34d399 !important; }
      .admin-root [class~="border-slate-200"] { border-color: rgba(255,255,255,0.09) !important; }
      .admin-root [class~="border-slate-100"] { border-color: rgba(255,255,255,0.07) !important; }
      .admin-root [class~="border-indigo-200"] { border-color: rgba(6,182,212,0.22) !important; }
      .admin-root [class~="border-indigo-100"] { border-color: rgba(6,182,212,0.15) !important; }
      .admin-root [class~="border-teal-200"] { border-color: rgba(20,184,166,0.22) !important; }
      .admin-root [class~="border-cyan-200"] { border-color: rgba(6,182,212,0.22) !important; }
      .admin-root [class~="border-dashed"] { border-color: rgba(255,255,255,0.12) !important; }
      .admin-root input:not([type="color"]):not([type="file"]), .admin-root select, .admin-root textarea {
        background-color: rgba(255,255,255,0.06) !important;
        border-color: rgba(255,255,255,0.1) !important;
        color: rgba(255,255,255,0.87) !important;
      }
      .admin-root input::placeholder, .admin-root textarea::placeholder { color: rgba(255,255,255,0.3) !important; }
      .admin-root [class~="hover:bg-slate-50"]:hover { background-color: rgba(255,255,255,0.06) !important; }
      .admin-root [class~="hover:bg-slate-100"]:hover { background-color: rgba(255,255,255,0.08) !important; }
      .admin-root [class~="hover:bg-slate-200"]:hover { background-color: rgba(255,255,255,0.1) !important; }
      .admin-root [class~="shadow-sm"] { box-shadow: 0 1px 3px rgba(0,0,0,0.4) !important; }
      .admin-root [class~="divide-slate-50"] > * + * { border-color: rgba(255,255,255,0.05) !important; }
    `;
    return () => { el.textContent = ""; };
  }, []);

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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse text-white text-xl font-heading">Milaap Admin</div>
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

  const activeNav = NAV_ITEMS.find(n => n.id === activeSection);

  return (
    <div className="admin-root h-screen w-screen flex overflow-hidden" style={{ background: "linear-gradient(160deg, #030712 0%, #0a1628 50%, #041420 100%)" }}>
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col h-full">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Milaap Admin</p>
              <p className="text-slate-500 text-[10px] truncate max-w-[130px]">{adminSession.admin.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                data-testid={`admin-nav-${item.id.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? item.bg : "bg-white/5"}`}>
                  <item.icon size={14} className={active ? item.color : "text-slate-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{item.id}</p>
                </div>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all"
            data-testid="button-admin-logout"
          >
            <LogOut size={16} />
            <span className="text-xs font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="px-8 py-4 flex items-center gap-4 shrink-0" style={{ background: "rgba(13,23,40,0.8)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {activeNav && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(5,150,105,0.15)", border: "1px solid rgba(5,150,105,0.2)" }}>
              <activeNav.icon size={18} className={activeNav.color} />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{activeSection}</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{activeNav?.desc}</p>
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 overflow-y-auto p-8" style={{ background: "transparent" }}>
          <div className="max-w-4xl mx-auto">
            {activeSection === "Analytics Dashboard" && <AnalyticsDashboard />}
            {activeSection === "Active Duration" && <ActiveDurationViewer />}
            {activeSection === "User Lookup" && <UserLookup />}
            {activeSection === "User Memberships" && <UserMembershipsManager />}
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
            {activeSection === "Seed Profiles" && <SeedProfilesViewer />}
            {activeSection === "Background Music" && <BackgroundMusicUploader />}
          </div>
        </main>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" style={{ background: "#0d1728", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <LogOut size={24} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Admin Logout</h3>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Are you sure you want to log out?</p>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 h-11 rounded-xl text-sm font-medium transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }} onClick={() => setShowLogoutConfirm(false)} data-testid="button-admin-logout-cancel">Cancel</button>
              <button className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors" onClick={() => { setShowLogoutConfirm(false); handleLogout(); }} data-testid="button-admin-logout-confirm">Log Out</button>
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
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const categories = ["all", "auth", "profile", "match", "chat", "moderation", "admin", "security", "privacy"];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500", offset: "0" });
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/admin/activity-logs?${params}`, { credentials: "include" });
      const data = await res.json();
      setAllLogs(data.logs || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [categoryFilter]);

  const getCategoryBadge = (cat: string) => {
    const c: Record<string, [string, string]> = {
      auth: ["rgba(59,130,246,0.18)", "#60a5fa"],
      profile: ["rgba(16,185,129,0.18)", "#34d399"],
      match: ["rgba(236,72,153,0.18)", "#f472b6"],
      chat: ["rgba(14,165,233,0.18)", "#38bdf8"],
      moderation: ["rgba(239,68,68,0.18)", "#f87171"],
      admin: ["rgba(168,85,247,0.18)", "#c084fc"],
      security: ["rgba(249,115,22,0.18)", "#fb923c"],
      privacy: ["rgba(6,182,212,0.18)", "#22d3ee"],
    };
    const [bg, text] = c[cat] || ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.5)"];
    return { background: bg, color: text, padding: "1px 7px", borderRadius: 999, fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const };
  };

  const formatTime = (date: string) => new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const grouped = allLogs.reduce((acc: Record<string, any>, log: any) => {
    const key = log.userId || "__system__";
    if (!acc[key]) acc[key] = { userId: log.userId, userName: log.userName, logs: [], lastAt: log.createdAt };
    acc[key].logs.push(log);
    if (new Date(log.createdAt) > new Date(acc[key].lastAt)) acc[key].lastAt = log.createdAt;
    return acc;
  }, {});

  const userGroups = Object.values(grouped)
    .sort((a: any, b: any) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
    .filter((g: any) => {
      if (!userSearch) return true;
      const q = userSearch.toLowerCase();
      return (g.userName || "").toLowerCase().includes(q) || (g.userId || "").toLowerCase().includes(q);
    });

  const CARD = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={CARD}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm text-white">Activity Logs</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{allLogs.length} events · {userGroups.length} users</span>
        </div>

        {/* User search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input
            type="text"
            placeholder="Search user name or ID..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", outline: "none" }}
            data-testid="input-log-user-search"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={categoryFilter === cat
                ? { background: "linear-gradient(135deg,#059669,#0ea5e9)", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid={`filter-log-${cat}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
        ) : userGroups.length === 0 ? (
          <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Activity size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No activity found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userGroups.map((group: any) => {
              const isOpen = expandedUser === (group.userId || "__system__");
              return (
                <div key={group.userId || "__system__"} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* User row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                    style={isOpen ? { background: "rgba(5,150,105,0.1)" } : {}}
                    onClick={() => setExpandedUser(isOpen ? null : (group.userId || "__system__"))}
                    data-testid={`button-log-user-${group.userId || "system"}`}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "linear-gradient(135deg,#059669,#0ea5e9)", color: "#fff" }}>
                      {(group.userName || (group.userId ? "?" : "S"))[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{group.userName || (group.userId ? "Unknown User" : "System")}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>{group.logs.length} events</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {group.userId && <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{group.userId.slice(0, 12)}...</span>}
                        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Last: {formatTime(group.lastAt)}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="shrink-0 transition-transform" style={{ color: "rgba(255,255,255,0.3)", transform: isOpen ? "rotate(90deg)" : "none" }} />
                  </button>

                  {/* Log entries */}
                  {isOpen && (
                    <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      {group.logs.map((log: any) => (
                        <div key={log.id} className="px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span style={getCategoryBadge(log.category)}>{log.category}</span>
                              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{log.action.replace(/_/g, " ")}</span>
                            </div>
                            <span className="text-[9px] ml-2 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{formatTime(log.createdAt)}</span>
                          </div>
                          {log.ipAddress && <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{log.ipAddress}</p>}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-1.5">
                              <button
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                className="text-[9px] font-medium transition-colors"
                                style={{ color: expandedLogId === log.id ? "#22d3ee" : "rgba(255,255,255,0.3)" }}
                                data-testid={`button-log-details-${log.id}`}
                              >
                                {expandedLogId === log.id ? "▲ Hide Details" : "▼ View Details"}
                              </button>
                              {expandedLogId === log.id && (
                                <div className="mt-1.5 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                  {Object.entries(log.details).map(([k, v]) => (
                                    <div key={k} className="flex gap-2 text-[9px] py-0.5">
                                      <span className="shrink-0 font-medium" style={{ color: "#22d3ee" }}>{k}:</span>
                                      <span className="break-all font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMembershipsManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newTier, setNewTier] = useState("");
  const [updating, setUpdating] = useState(false);
  const [quizResetting, setQuizResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: results = [], isLoading: searching } = useQuery<any[]>({
    queryKey: ["/api/admin/user-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/admin/user-search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return d.results || [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  const TIERS = ["basic", "silver", "gold", "platinum"];
  const TIER_COLORS: Record<string, string> = {
    basic: "text-slate-400", silver: "text-slate-300", gold: "text-amber-400", platinum: "text-violet-400"
  };

  const handleAssign = async () => {
    if (!selectedUser || !newTier) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/membership/assign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.userId, tier: newTier }),
      });
      if (res.ok) {
        setSuccessMsg(`${selectedUser.name}'s membership updated to ${newTier}`);
        setSelectedUser({ ...selectedUser, membershipTier: newTier });
        setNewTier("");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/user-search"] });
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleQuizResetAll = async () => {
    if (!confirm("Reset ALL quiz completions for all users?")) return;
    setQuizResetting(true);
    try {
      await fetch("/api/admin/quiz/reset-all", { method: "POST", credentials: "include" });
      setSuccessMsg("All quiz completions reset successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    } finally {
      setQuizResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">User Memberships</h2>
        <p className="text-sm text-slate-400">Search any user and update their membership tier</p>
      </div>

      {successMsg && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 text-sm font-medium">{successMsg}</div>
      )}

      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Assign Membership</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            data-testid="input-membership-search"
          />
        </div>

        {searching && <p className="text-xs text-slate-400 animate-pulse">Searching...</p>}

        {results.length > 0 && !selectedUser && (
          <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
            {results.map((u: any) => (
              <button
                key={u.userId}
                onClick={() => { setSelectedUser(u); setNewTier(u.membershipTier); setSearchQuery(u.name); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-left transition-colors"
                data-testid={`button-select-user-${u.userId}`}
              >
                <img
                  src={u.photos?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.userId}`}
                  alt={u.name}
                  className="w-9 h-9 rounded-full object-cover border border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.phone || u.email || ""} · {u.city}</p>
                </div>
                <span className={`text-xs font-bold uppercase ${TIER_COLORS[u.membershipTier] || "text-slate-400"}`}>{u.membershipTier}</span>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={selectedUser.photos?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.userId}`}
                alt={selectedUser.name}
                className="w-12 h-12 rounded-full object-cover border border-white/10"
              />
              <div>
                <p className="font-bold text-sm">{selectedUser.name}</p>
                <p className="text-xs text-slate-400">{selectedUser.phone || selectedUser.email}</p>
                <p className="text-xs">Current: <span className={`font-bold ${TIER_COLORS[selectedUser.membershipTier] || ""}`}>{selectedUser.membershipTier}</span></p>
              </div>
              <button onClick={() => { setSelectedUser(null); setSearchQuery(""); }} className="ml-auto p-1 rounded-full hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TIERS.map(t => (
                <button
                  key={t}
                  onClick={() => setNewTier(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all ${newTier === t ? "border-amber-500 bg-amber-500/20 text-amber-300" : "border-white/10 text-slate-400 hover:border-white/30"}`}
                  data-testid={`button-tier-${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={handleAssign}
              disabled={updating || !newTier || newTier === selectedUser.membershipTier}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-assign-membership"
            >
              {updating ? "Updating..." : `Assign ${newTier || "..."} to ${selectedUser.name}`}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Quiz Management</h3>
        <p className="text-sm text-slate-300">Force-reset all quiz completions (users will need to retake). Quizzes also auto-reset weekly for each user.</p>
        <button
          onClick={handleQuizResetAll}
          disabled={quizResetting}
          className="px-4 py-2.5 rounded-xl bg-red-800/40 border border-red-700/40 text-red-300 text-sm font-bold hover:bg-red-800/60 disabled:opacity-50"
          data-testid="button-quiz-reset-all"
        >
          {quizResetting ? "Resetting..." : "Reset All Quiz Completions"}
        </button>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 20;

  const genders = ["all", "Male", "Female", "Trans", "Couple"];

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (genderFilter !== "all") params.set("gender", genderFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/admin/profiles?${params}`, { credentials: "include" });
      const data = await res.json();
      setProfilesData(data.profiles || []);
      setTotal(data.total || 0);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, [page, genderFilter, debouncedSearch]);

  const getDisplayName = (profile: any) => {
    if (profile.gender === "Couple" && profile.partner2Name) {
      const p1 = profile.name?.split(" ")[0] || profile.name;
      const p2 = profile.partner2Name?.split(" ")[0] || profile.partner2Name;
      return `${p1} & ${p2}`;
    }
    return profile.name;
  };

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
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm text-indigo-800">All Profiles ({total})</h4>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
            data-testid="input-profiles-search"
          />
        </div>
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
                      <span className="font-semibold text-sm text-slate-800 truncate">{getDisplayName(profile)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${getGenderColor(profile.gender)}`}>
                        {profile.gender}
                      </span>
                      {profile.age && <span className="text-[10px] text-slate-400">{profile.gender === "Couple" && profile.partner2Age ? `${profile.age} & ${profile.partner2Age}` : `${profile.age}y`}</span>}
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
                  <input
                    type="number"
                    value={plan.priceMonthly ?? 0}
                    onChange={(e) => updatePlanField(plan.id, "priceMonthly", Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                    data-testid={`plan-price-monthly-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Price Yearly (₹)
                  </label>
                  <input
                    type="number"
                    value={plan.priceYearly ?? 0}
                    onChange={(e) => updatePlanField(plan.id, "priceYearly", Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                    data-testid={`plan-price-yearly-${plan.id}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={plan.durationDays ?? 30}
                    onChange={(e) => updatePlanField(plan.id, "durationDays", Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                    data-testid={`plan-duration-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Daily Likes
                  </label>
                  <input
                    type="number"
                    value={plan.dailyLikesLimit ?? 10}
                    onChange={(e) => updatePlanField(plan.id, "dailyLikesLimit", Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                    data-testid={`plan-likes-${plan.id}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Super Likes/Day
                  </label>
                  <input
                    type="number"
                    value={plan.superLikesPerDay ?? 0}
                    onChange={(e) => updatePlanField(plan.id, "superLikesPerDay", Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                    data-testid={`plan-superlikes-${plan.id}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={plan.sortOrder ?? 0}
                    onChange={(e) => updatePlanField(plan.id, "sortOrder", Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
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
  const [minPauseMinutes, setMinPauseMinutes] = useState(60);
  const [pauseDurationMinutes, setPauseDurationMinutes] = useState(120);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/bot-mode-settings", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/bot-mode/proxy-pause-settings", { credentials: "include" }).then(r => r.json()),
    ]).then(([botData, pauseData]) => {
      if (botData.maxHours !== undefined) setMaxHours(botData.maxHours);
      if (pauseData.minPauseMinutes !== undefined) setMinPauseMinutes(pauseData.minPauseMinutes);
      if (pauseData.pauseDurationMinutes !== undefined) setPauseDurationMinutes(pauseData.pauseDurationMinutes);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        fetch("/api/admin/bot-mode-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ maxHours }),
        }),
        fetch("/api/admin/bot-mode/proxy-pause-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ minPauseMinutes, pauseDurationMinutes }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={16} className="text-purple-600" />
          <h4 className="font-bold text-sm text-purple-800">Bot Mode Auto-Offline</h4>
        </div>
        <p className="text-xs text-purple-700 mb-4">
          Users in bot mode will automatically go offline after this many hours of inactivity.
        </p>
        <div className="bg-white rounded-xl px-4 py-3 border border-purple-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Max Hours Before Auto-Offline</label>
          <Input type="number" value={maxHours} onChange={(e) => setMaxHours(Number(e.target.value))} min={1} max={168} className="h-10 rounded-xl text-sm" data-testid="input-bot-max-hours" />
          <p className="text-[10px] text-slate-400 mt-1">Default: 12 hours. Range: 1-168 hours.</p>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-indigo-600" />
          <h4 className="font-bold text-sm text-indigo-800">AI Proxy Silence Mode</h4>
        </div>
        <p className="text-xs text-indigo-700 mb-4">
          After a minimum conversation age, the AI proxy will randomly pause for a period. The proxy resumes when the other user sends a manual reply. This makes interactions feel more real.
        </p>
        <div className="space-y-3">
          <div className="bg-white rounded-xl px-4 py-3 border border-indigo-100">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Min Conversation Age Before Pause (minutes)</label>
            <Input type="number" value={minPauseMinutes} onChange={(e) => setMinPauseMinutes(Number(e.target.value))} min={30} max={1440} className="h-10 rounded-xl text-sm" data-testid="input-proxy-min-pause" />
            <p className="text-[10px] text-slate-400 mt-1">Default: 60 min. Proxy won't pause before this age.</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-indigo-100">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pause Duration (minutes)</label>
            <Input type="number" value={pauseDurationMinutes} onChange={(e) => setPauseDurationMinutes(Number(e.target.value))} min={30} max={480} className="h-10 rounded-xl text-sm" data-testid="input-proxy-pause-duration" />
            <p className="text-[10px] text-slate-400 mt-1">Default: 120 min (~2 hrs). Actual pause = this + random 0-30 min.</p>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-2xl font-bold bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-save-bot-settings">
        {saving ? "Saving..." : saved ? "Saved!" : "Save Bot Mode Settings"}
      </Button>
    </div>
  );
}

function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const CARD_STYLE = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
  const CARD_GLOW = (color: string) => ({ background: `rgba(255,255,255,0.04)`, border: `1px solid ${color}30`, borderRadius: 16 });

  const tierMeta: Record<string, { label: string; color: string; glow: string }> = {
    basic: { label: "Basic", color: "#94a3b8", glow: "rgba(148,163,184,0.4)" },
    silver: { label: "Silver", color: "#e2e8f0", glow: "rgba(226,232,240,0.4)" },
    gold: { label: "Gold", color: "#fbbf24", glow: "rgba(251,191,36,0.5)" },
    platinum: { label: "Platinum", color: "#c084fc", glow: "rgba(192,132,252,0.5)" },
  };

  const BarChart = ({ days, color, gradient }: { days: any[]; color: string; gradient: string }) => {
    const max = Math.max(...days.map((d: any) => d.count), 1);
    return (
      <div className="flex items-end gap-[2px] h-20">
        {days.slice(-30).map((d: any, i: number) => (
          <div key={i} className="flex-1 flex flex-col justify-end" title={`${d.day}: ${d.count}`} style={{ minWidth: 0 }}>
            <div className="w-full rounded-[2px] transition-all" style={{
              height: `${Math.max(Math.round((d.count / max) * 68), d.count > 0 ? 3 : 0)}px`,
              background: gradient,
            }} />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl p-8 text-center" style={CARD_STYLE}>
        <p className="text-red-400 font-medium">Failed to load analytics</p>
        <button onClick={() => { setLoading(true); setError(false); fetch("/api/admin/analytics", { credentials: "include" }).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => { setError(true); setLoading(false); }); }} className="mt-3 text-xs px-4 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Retry</button>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: data.totals?.users ?? 0, icon: Users, grad: "linear-gradient(135deg,#059669,#0ea5e9)", glow: "rgba(5,150,105,0.3)" },
    { label: "Active Today", value: data.totals?.activeToday ?? 0, icon: Activity, grad: "linear-gradient(135deg,#0ea5e9,#6366f1)", glow: "rgba(14,165,233,0.3)" },
    { label: "Active This Week", value: data.totals?.activeWeek ?? 0, icon: Clock, grad: "linear-gradient(135deg,#6366f1,#a855f7)", glow: "rgba(99,102,241,0.3)" },
    { label: "Total Matches", value: data.totals?.matches ?? 0, icon: Heart, grad: "linear-gradient(135deg,#ec4899,#f43f5e)", glow: "rgba(236,72,153,0.3)" },
    { label: "Total Messages", value: data.totals?.messages ?? 0, icon: MessageCircle, grad: "linear-gradient(135deg,#f59e0b,#ef4444)", glow: "rgba(245,158,11,0.3)" },
  ];

  const totalUsers = data.totals?.users || 1;

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="absolute inset-0 opacity-10 rounded-2xl" style={{ background: stat.grad }} />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: stat.grad, boxShadow: `0 4px 14px ${stat.glow}` }}>
                <stat.icon size={16} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-3">
        {/* New Users */}
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm text-white">New Registrations</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(5,150,105,0.15)", color: "#34d399" }}>Last 30 days</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Daily new user signups</p>
          {data.newUsersByDay?.length > 0 ? (
            <BarChart days={data.newUsersByDay} color="#34d399" gradient="linear-gradient(180deg,#059669,#034d38)" />
          ) : (
            <div className="h-20 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.25)" }}><p className="text-xs">No data yet</p></div>
          )}
          <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>Each bar = 1 day · Hover for count</p>
        </div>

        {/* DAU */}
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm text-white">Daily Active Users</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(14,165,233,0.15)", color: "#38bdf8" }}>Last 30 days</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Unique users seen per day</p>
          {data.dauByDay?.length > 0 ? (
            <BarChart days={data.dauByDay} color="#38bdf8" gradient="linear-gradient(180deg,#0ea5e9,#0369a1)" />
          ) : (
            <div className="h-20 flex items-center justify-center"><p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>No data yet</p></div>
          )}
        </div>

        {/* Messages */}
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm text-white">Messages Sent</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>Last 30 days</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Chat messages per day</p>
          {data.messagesByDay?.length > 0 ? (
            <BarChart days={data.messagesByDay} color="#fbbf24" gradient="linear-gradient(180deg,#f59e0b,#b45309)" />
          ) : (
            <div className="h-20 flex items-center justify-center"><p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>No data yet</p></div>
          )}
        </div>
      </div>

      {/* Membership Breakdown */}
      <div className="rounded-2xl p-5" style={CARD_STYLE}>
        <h4 className="font-semibold text-sm text-white mb-4">Membership Breakdown</h4>
        <div className="space-y-3">
          {(data.membershipBreakdown || []).map((m: any) => {
            const meta = tierMeta[m.tier] || { label: m.tier, color: "#94a3b8", glow: "rgba(148,163,184,0.4)" };
            const pct = Math.round((m.count / totalUsers) * 100);
            return (
              <div key={m.tier}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.glow}` }} />
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{m.count}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color, boxShadow: `0 0 8px ${meta.glow}` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg Daily Active", value: data.dauByDay?.length > 0 ? Math.round(data.dauByDay.reduce((a: number, d: any) => a + d.count, 0) / data.dauByDay.length) : 0, unit: "users/day" },
          { label: "Match Rate", value: data.totals?.users > 0 ? Math.round((data.totals.matches / data.totals.users) * 100) : 0, unit: "% of users" },
          { label: "Msgs / User", value: data.totals?.users > 0 ? Math.round(data.totals.messages / data.totals.users) : 0, unit: "avg messages" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xl font-bold text-white">{s.value.toLocaleString()}</p>
            <p className="text-[9px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>{s.unit}</p>
            <p className="text-[9px] mt-1 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveDurationViewer() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/active-duration", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const downloadCSV = () => {
    window.open("/api/admin/active-duration?format=csv", "_blank");
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Daily active time (non-AI mode) per user</p>
        <Button onClick={downloadCSV} className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4">
          <Download size={14} className="mr-1" /> Export CSV
        </Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
        <div className="grid grid-cols-3 px-4 py-2 bg-slate-50">
          <span className="text-[10px] font-bold text-slate-500 uppercase">User</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Today (min)</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase text-right">Last Seen</span>
        </div>
        {users.slice(0, 50).map((u) => (
          <div key={u.userId} className="grid grid-cols-3 px-4 py-3 items-center">
            <div>
              <p className="text-xs font-semibold text-slate-800 truncate">{u.name || "—"}</p>
              <p className="text-[10px] text-slate-400">{u.phone || "—"}</p>
            </div>
            <div className="text-center">
              <span className={`text-sm font-bold ${u.dailyActiveMinutes > 10 ? "text-green-600" : "text-slate-400"}`}>{u.dailyActiveMinutes || 0}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}</span>
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No active duration data yet</div>}
      </div>
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
              <h3 className="font-bold text-sm text-slate-800 mb-3">Conversations ({messages?.length || 0} messages)</h3>
              {messages?.length > 0 ? (() => {
                const grouped: Record<string, any[]> = {};
                for (const m of messages) {
                  const key = m.matchId || "unknown";
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(m);
                }
                const matchMap: Record<string, any> = {};
                for (const match of (matches || [])) {
                  matchMap[match.id] = match;
                }
                return (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(grouped).map(([matchId, msgs]) => {
                      const match = matchMap[matchId];
                      const otherProfile = match?.profile;
                      const otherName = otherProfile?.name || "Unknown User";
                      return (
                        <div key={matchId} className="border border-slate-100 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-3 py-2 flex items-center gap-2">
                            {otherProfile?.photos?.[0] && (
                              <img src={otherProfile.photos[0]} alt="" className="w-7 h-7 rounded-full object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-xs text-slate-800">{otherName}</span>
                              <span className="text-[10px] text-slate-400 ml-2">{msgs.length} message{msgs.length !== 1 ? "s" : ""}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{matchId.substring(0, 8)}...</span>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {msgs.slice(0, 5).map((m: any, idx: number) => {
                              const msg = m.message || m;
                              return (
                                <div key={idx} className="px-3 py-2 text-xs">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-[10px] font-medium ${msg.senderId === selectedUserId ? "text-blue-600" : "text-slate-500"}`}>
                                      {msg.senderId === selectedUserId ? "↑ Sent" : "↓ Received"}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{formatDate(msg.createdAt)}</span>
                                  </div>
                                  <p className="text-slate-700 leading-snug">{msg.content}</p>
                                  <div className="flex gap-1 mt-0.5">
                                    {msg.isAiGenerated && <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">AI</span>}
                                    {msg.attachmentUrl && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Attachment</span>}
                                  </div>
                                </div>
                              );
                            })}
                            {msgs.length > 5 && (
                              <p className="px-3 py-1.5 text-[10px] text-slate-400">+{msgs.length - 5} more messages...</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
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

function BackgroundMusicUploader() {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/app-settings", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.background_music_url) setCurrentUrl(d.background_music_url); });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const form = new FormData();
    form.append("music", file);
    try {
      const res = await fetch("/api/admin/upload-bg-music", { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (res.ok) { setCurrentUrl(data.url); setMsg("Music uploaded successfully!"); }
      else setMsg(data.message || "Upload failed");
    } catch { setMsg("Upload failed"); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    try {
      await fetch("/api/admin/bg-music", { method: "DELETE", credentials: "include" });
      setCurrentUrl(null);
      setMsg("Music removed.");
    } catch { setMsg("Failed to remove"); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-1">App Background Music</h3>
        <p className="text-xs text-slate-500 mb-4">Upload an audio file (MP3, MP4, WAV, OGG) to play as background music in the app tour.</p>
        {currentUrl ? (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3 border border-slate-200">
            <p className="text-xs font-medium text-slate-600">Current music:</p>
            <audio controls src={currentUrl} className="w-full" />
            <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1" data-testid="button-delete-bg-music">
              <Trash2 size={12} /> Remove music
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-center border border-dashed border-slate-300">
            <p className="text-xs text-slate-400">No background music set</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="audio/*,video/mp4" className="hidden" onChange={handleUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          data-testid="button-upload-bg-music"
        >
          {uploading ? "Uploading..." : "Upload Music File"}
        </button>
        {msg && <p className={`text-xs mt-2 text-center font-medium ${msg.includes("success") || msg.includes("removed") ? "text-green-600" : "text-red-500"}`}>{msg}</p>}
      </div>
    </div>
  );
}

function SeedProfilesViewer() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data: seedProfiles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/seed-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/seed-profiles", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load seed profiles");
      return res.json();
    },
  });

  const handleCopy = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(phone);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const tierColors: Record<string, string> = {
    basic: "bg-slate-500",
    silver: "bg-slate-400",
    gold: "bg-amber-500",
    platinum: "bg-violet-600",
  };

  const genderEmoji: Record<string, string> = {
    Male: "👨",
    Female: "👩",
    Trans: "🏳️‍⚧️",
    Couple: "👫",
  };

  const founders = seedProfiles.filter((p) => p.isFounder);
  const seeds = seedProfiles.filter((p) => !p.isFounder);

  if (isLoading) {
    return <div className="flex justify-center items-center py-16 text-slate-400 text-sm animate-pulse">Loading seed profiles...</div>;
  }

  const renderCard = (profile: any) => (
    <div
      key={profile.id}
      className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm"
      data-testid={`seed-profile-${profile.id}`}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
        {genderEmoji[profile.gender] || "👤"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-800">{profile.name || "—"}</span>
          {profile.age && <span className="text-xs text-slate-500">{profile.age}y</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${tierColors[profile.membershipTier] || "bg-slate-500"}`}>
            {profile.membershipTier}
          </span>
          {profile.isFounder && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Founder</span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{profile.city || "—"} · Score: {profile.respectScore}</div>
        <div className="flex items-center gap-1 mt-1">
          <Phone size={11} className="text-slate-400" />
          <span className="text-xs font-mono text-slate-700">{profile.phone}</span>
        </div>
      </div>
      <button
        onClick={() => handleCopy(profile.phone)}
        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
          copied === profile.phone
            ? "bg-green-100 text-green-700"
            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
        }`}
        data-testid={`button-copy-phone-${profile.id}`}
      >
        {copied === profile.phone ? "Copied!" : "Copy"}
      </button>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-sm text-teal-800">
        <p className="font-semibold mb-1">Test Login Numbers</p>
        <p className="text-xs text-teal-700">Use any of these phone numbers to log in as a seed or founder profile. OTP will appear in server logs during development.</p>
      </div>

      {founders.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Founder Profiles</p>
          <div className="space-y-2">
            {founders.map(renderCard)}
          </div>
        </div>
      )}

      {seeds.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Seed Profiles ({seeds.length})</p>
          <div className="space-y-2">
            {seeds.map(renderCard)}
          </div>
        </div>
      )}

      {seedProfiles.length === 0 && (
        <div className="text-center py-12">
          <Users size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No seed profiles found</p>
          <p className="text-xs text-slate-300 mt-1">Run auto-seed to create test profiles</p>
        </div>
      )}
    </div>
  );
}
