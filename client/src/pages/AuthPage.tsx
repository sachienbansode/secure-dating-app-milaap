import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, ArrowRight, Shield, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoNew from "@/assets/milaap-logo.png";
import logoClassic from "@/assets/logo.png";
import { requestOtp, verifyOtp, getMe } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import FeatureShowcase from "@/components/FeatureShowcase";

const COUNTRY_CODES = [
  { name: "India", flag: "🇮🇳", dial: "91", digits: 10 },
  { name: "USA", flag: "🇺🇸", dial: "1", digits: 10 },
  { name: "UK", flag: "🇬🇧", dial: "44", digits: 10 },
  { name: "UAE", flag: "🇦🇪", dial: "971", digits: 9 },
  { name: "Singapore", flag: "🇸🇬", dial: "65", digits: 8 },
  { name: "Australia", flag: "🇦🇺", dial: "61", digits: 9 },
  { name: "Canada", flag: "🇨🇦", dial: "1", digits: 10 },
  { name: "Germany", flag: "🇩🇪", dial: "49", digits: 10 },
  { name: "France", flag: "🇫🇷", dial: "33", digits: 9 },
  { name: "Saudi Arabia", flag: "🇸🇦", dial: "966", digits: 9 },
  { name: "Bangladesh", flag: "🇧🇩", dial: "880", digits: 10 },
  { name: "Pakistan", flag: "🇵🇰", dial: "92", digits: 10 },
  { name: "Sri Lanka", flag: "🇱🇰", dial: "94", digits: 9 },
  { name: "Nepal", flag: "🇳🇵", dial: "977", digits: 10 },
  { name: "Qatar", flag: "🇶🇦", dial: "974", digits: 8 },
  { name: "Kuwait", flag: "🇰🇼", dial: "965", digits: 8 },
  { name: "Bahrain", flag: "🇧🇭", dial: "973", digits: 8 },
  { name: "Oman", flag: "🇴🇲", dial: "968", digits: 8 },
  { name: "New Zealand", flag: "🇳🇿", dial: "64", digits: 9 },
  { name: "South Africa", flag: "🇿🇦", dial: "27", digits: 9 },
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"splash" | "phone" | "email">("splash");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [loginDestination, setLoginDestination] = useState<string | null>(null);
  const [taglines, setTaglines] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [termsVersion, setTermsVersion] = useState(1);
  const [showTermsUpdate, setShowTermsUpdate] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<"new" | "classic">("new");

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
    retry: false,
  });

  useEffect(() => {
    fetch("/api/app-settings")
      .then(r => r.json())
      .then(data => {
        if (data.welcome_taglines?.length) setTaglines(data.welcome_taglines);
        if (data.selected_logo) setSelectedLogo(data.selected_logo);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/terms")
      .then(r => r.json())
      .then(data => {
        setTermsContent(data.content || "");
        setTermsVersion(data.version || 1);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.user && !showWelcome && !loginDestination) {
      if (!session.profile) {
        setLocation("/profile");
      } else {
        setLocation("/home");
      }
    }
  }, [session, setLocation, showWelcome, loginDestination]);

  if (checkingSession) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-gradient">
        <div className="animate-pulse text-white text-xl font-heading">Milaap</div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <WelcomeOverlay
        show={true}
        taglines={taglines}
        onDone={() => {
          setShowWelcome(false);
          setLocation(loginDestination || "/home");
        }}
      />
    );
  }

  if (session?.user) {
    return null;
  }

  const phoneDigits = contactValue.replace(/\D/g, "");
  const isPhoneValid = method === "phone" ? phoneDigits.length === selectedCountry.digits : contactValue.trim().length > 0;

  const handleRequestOtp = async () => {
    if (!isPhoneValid) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = method === "phone"
        ? { phone: `+${selectedCountry.dial}${phoneDigits}` }
        : { email: contactValue };
      const result = await requestOtp(payload);
      setOtpHint(result.otp_hint || "");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTermsAndContinue = async () => {
    try {
      await fetch("/api/terms/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: termsVersion }),
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch {}
    setShowTermsUpdate(false);
    if (pendingDestination) {
      if (pendingDestination === "/home") {
        setLoginDestination(pendingDestination);
        setShowWelcome(true);
      } else {
        setLocation(pendingDestination);
      }
      setPendingDestination(null);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = method === "phone"
        ? { phone: `+${selectedCountry.dial}${phoneDigits}`, otp: otpValue }
        : { email: contactValue, otp: otpValue };
      const result = await verifyOtp(payload);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      const dest = result.hasProfile ? "/home" : "/profile";
      const isNew = result.isNewUser || !result.hasProfile;
      const userAcceptedVersion = result.user?.termsAcceptedVersion || 0;

      if (isNew) {
        await fetch("/api/terms/accept", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: termsVersion }),
        });
        setLocation(dest);
      } else if (userAcceptedVersion < termsVersion) {
        setPendingDestination(dest);
        setShowTermsUpdate(true);
      } else {
        if (result.hasProfile) {
          setLoginDestination(dest);
          setShowWelcome(true);
        } else {
          setLocation(dest);
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (method === "splash") {
    return (
      <div className="h-full flex flex-col items-center justify-between p-8 text-white relative overflow-y-auto" style={{ background: "linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 25%, #2d0a0a 50%, #0a1a3d 75%, #0a0a1a 100%)" }}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-15%] right-[-15%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)" }}
        />

        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />

        <div className="mt-8 flex flex-col items-center text-center z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, duration: 0.8 }}
            className="relative mb-5"
          >
            <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-[-8px] rounded-[28px] blur-xl" style={{ background: "linear-gradient(135deg, #dc2626, #8B5CF6, #2563eb)" }} />
            <div className="relative w-28 h-28 rounded-[24px] flex items-center justify-center overflow-hidden border border-white/20" style={{ background: "linear-gradient(160deg, rgba(20,10,30,0.9), rgba(10,5,20,0.95))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(139,92,246,0.2)" }}>
              <img src={selectedLogo === "classic" ? logoClassic : logoNew} alt="Milaap Logo" className="w-[85%] h-[85%] object-contain drop-shadow-2xl" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl font-heading font-extrabold mb-3 tracking-tight"
            style={{ background: "linear-gradient(135deg, #ffffff 0%, #ff6b6b 50%, #4dabf7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Milaap
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[11px] font-medium max-w-[280px] leading-relaxed tracking-wide"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Dil se dil tak. <br />
            Meaningful connections with respect.
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full space-y-3 z-10 pb-4"
        >
          <Button
            data-testid="button-login-phone"
            onClick={() => setMethod("phone")}
            className="w-full font-bold h-14 rounded-2xl shadow-2xl border-0 cursor-pointer text-lg text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
          >
            <Phone className="mr-3 h-5 w-5" /> Login with Phone
          </Button>
          <Button
            data-testid="button-login-email"
            onClick={() => setMethod("email")}
            variant="outline"
            className="w-full font-semibold h-14 rounded-2xl cursor-pointer text-lg text-white border-0"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(37,99,235,0.15))", border: "1px solid rgba(37,99,235,0.4)" }}
          >
            <Mail className="mr-3 h-5 w-5" /> Login with Email
          </Button>
          <p className="text-xs text-center mt-2 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
          <button
            data-testid="button-view-features"
            onClick={() => setShowFeatures(true)}
            className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold py-2.5 px-6 rounded-2xl transition-all active:scale-95"
            style={{ color: "#f59e0b", background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(139,92,246,0.15))", border: "1px solid rgba(245,158,11,0.4)", boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}
          >
            <Play size={16} /> Watch Feature Tour
          </button>
          <button
            data-testid="button-admin-portal"
            onClick={() => setLocation("/admin")}
            className="flex items-center justify-center gap-2 mx-auto text-sm font-semibold py-2.5 px-6 rounded-2xl transition-all active:scale-95"
            style={{ color: "#34d399", background: "linear-gradient(135deg, rgba(5,150,105,0.2), rgba(14,165,233,0.15))", border: "1px solid rgba(5,150,105,0.4)", boxShadow: "0 0 20px rgba(5,150,105,0.15)" }}
          >
            <Shield size={16} /> Admin Portal
          </button>
        </motion.div>
        <AnimatePresence>
          {showFeatures && <FeatureShowcase onClose={() => setShowFeatures(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 50%, #0d0d20 100%)" }}>
      <motion.div className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: "radial-gradient(circle, #dc2626, transparent 70%)" }} />
      <motion.div className="absolute bottom-[-10%] left-[-20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15" style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)" }} />

      <Button
        variant="ghost"
        className="w-fit p-0 hover:bg-transparent -ml-2 mb-8 z-10"
        style={{ color: "#ff6b6b" }}
        onClick={() => { setMethod("splash"); setStep("input"); setError(""); setContactValue(""); setOtpValue(""); }}
      >
        ← Back
      </Button>

      <div className="flex-1 z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            initial={{ scale: 0, rotateY: -90 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative"
          >
            <svg width="40" height="40" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="skinGrad" x1="30" y1="10" x2="50" y2="70" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D4A574" />
                  <stop offset="100%" stopColor="#C08B5C" />
                </linearGradient>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
                <filter id="handGlow">
                  <feGaussianBlur stdDeviation="1.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#handGlow)">
                <path d="M40 16 C40 16, 34 22, 34 30 L34 52 C34 54, 36 55, 38 55 L42 55 C44 55, 46 54, 46 52 L46 30 C46 22, 40 16, 40 16Z" fill="url(#skinGrad)" />
                <path d="M34 30 C32 24, 28 18, 24 16 C22 15, 20 17, 21 20 C22 24, 26 32, 30 40 L30 44 C30 44, 32 46, 34 44 L34 30Z" fill="url(#skinGrad)" opacity="0.95" />
                <path d="M46 30 C48 24, 52 18, 56 16 C58 15, 60 17, 59 20 C58 24, 54 32, 50 40 L50 44 C50 44, 48 46, 46 44 L46 30Z" fill="url(#skinGrad)" opacity="0.95" />
                <path d="M34 55 L32 60 C31 63, 33 66, 36 67 C38 68, 40 66, 40 64 C40 66, 42 68, 44 67 C47 66, 49 63, 48 60 L46 55" fill="url(#skinGrad)" opacity="0.9" />
                <line x1="40" y1="30" x2="40" y2="50" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
              </g>
              <circle cx="40" cy="11" r="2.5" fill="url(#sparkGrad)" opacity="0.8">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="28" cy="14" r="1.5" fill="#F59E0B" opacity="0.5">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="52" cy="14" r="1.5" fill="#F59E0B" opacity="0.5">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
              </circle>
              <path d="M22 10 L18 6" stroke="url(#sparkGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M58 10 L62 6" stroke="url(#sparkGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" begin="1s" />
              </path>
              <path d="M15 20 L12 18" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" opacity="0.3">
                <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3.5s" repeatCount="indefinite" begin="0.3s" />
              </path>
              <path d="M65 20 L68 18" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" opacity="0.3">
                <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3.5s" repeatCount="indefinite" begin="1.5s" />
              </path>
            </svg>
          </motion.div>
          <h2 className="text-3xl font-heading font-bold" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316, #EF4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Namaste!
          </h2>
        </div>
        <h3 className="text-xl mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          {step === "input"
            ? (method === "phone" ? "Enter your mobile number" : "Enter your email address")
            : "Enter the 6-digit OTP"
          }
        </h3>

        {error && (
          <div className="text-sm p-3 rounded-xl mb-4 border" style={{ background: "rgba(220,38,38,0.15)", color: "#ff6b6b", borderColor: "rgba(220,38,38,0.3)" }} data-testid="text-error">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {step === "input" ? (
            <>
              {method === "phone" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      data-testid="button-country-picker"
                      type="button"
                      onClick={() => { setShowCountryPicker(!showCountryPicker); setCountrySearch(""); }}
                      className="h-16 px-4 rounded-2xl flex items-center gap-2 flex-shrink-0 font-medium transition-all"
                      style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", minWidth: "100px" }}
                    >
                      <span className="text-xl">{selectedCountry.flag}</span>
                      <span className="text-sm">+{selectedCountry.dial}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <Input
                      data-testid="input-contact"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={contactValue}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        if (raw.length <= selectedCountry.digits) setContactValue(raw);
                      }}
                      placeholder={"0".repeat(selectedCountry.digits)}
                      maxLength={selectedCountry.digits}
                      className="flex-1 h-16 text-xl rounded-2xl px-5 text-white placeholder-white/20"
                      style={{ background: "rgba(255,255,255,0.08)", border: `2px solid ${phoneDigits.length > 0 && phoneDigits.length < selectedCountry.digits ? "rgba(251,146,60,0.5)" : phoneDigits.length === selectedCountry.digits ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.12)"}` }}
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    />
                  </div>

                  {showCountryPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-2xl overflow-hidden border"
                      style={{ background: "rgba(15,15,30,0.98)", borderColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)" }}
                      data-testid="country-picker-dropdown"
                    >
                      <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none px-2 py-1"
                          data-testid="input-country-search"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {COUNTRY_CODES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)).map((c) => (
                          <button
                            key={`${c.name}-${c.dial}`}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setShowCountryPicker(false);
                              setContactValue("");
                              setCountrySearch("");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                            style={{ color: "rgba(255,255,255,0.85)", background: selectedCountry.name === c.name ? "rgba(255,255,255,0.08)" : "transparent" }}
                            data-testid={`country-option-${c.dial}`}
                          >
                            <span className="text-lg">{c.flag}</span>
                            <span className="flex-1 text-sm">{c.name}</span>
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>+{c.dial}</span>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{c.digits} digits</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs" style={{ color: phoneDigits.length === selectedCountry.digits ? "rgba(74,222,128,0.8)" : "rgba(255,255,255,0.3)" }}>
                      {selectedCountry.name} numbers are {selectedCountry.digits} digits
                    </p>
                    <p className="text-xs font-mono" style={{ color: phoneDigits.length === selectedCountry.digits ? "rgba(74,222,128,0.8)" : "rgba(255,255,255,0.3)" }}>
                      {phoneDigits.length}/{selectedCountry.digits}
                    </p>
                  </div>
                </div>
              ) : (
                <Input
                  data-testid="input-contact"
                  type="email"
                  inputMode="email"
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder="name@example.com"
                  className="h-16 text-xl rounded-2xl px-6 text-white placeholder-white/30"
                  style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                />
              )}

              <Button
                data-testid="button-send-otp"
                onClick={handleRequestOtp}
                disabled={isLoading || !isPhoneValid}
                className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
              >
                {isLoading ? "Sending..." : "Send OTP"} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              {otpHint && (
                <div className="text-sm p-3 rounded-xl border" style={{ background: "rgba(37,99,235,0.15)", color: "#60a5fa", borderColor: "rgba(37,99,235,0.3)" }} data-testid="text-otp-hint">
                  Demo OTP: <span className="font-bold">{otpHint}</span>
                </div>
              )}
              <div className="flex gap-2 justify-center" data-testid="input-otp">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    id={`otp-box-${i}`}
                    data-testid={`input-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={otpValue[i] || ""}
                    autoFocus={i === 0}
                    className="w-12 h-14 text-2xl text-center text-white border-2 rounded-xl font-mono transition-all focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 1) {
                        const newOtp = otpValue.split("");
                        newOtp[i] = val;
                        const joined = newOtp.join("").slice(0, 6);
                        setOtpValue(joined);
                        if (val && i < 5) document.getElementById(`otp-box-${i + 1}`)?.focus();
                      } else {
                        const pasted = val.slice(0, 6);
                        setOtpValue(pasted);
                        const focusIdx = Math.min(pasted.length, 5);
                        document.getElementById(`otp-box-${focusIdx}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpValue[i] && i > 0) {
                        const newOtp = otpValue.split("");
                        newOtp[i - 1] = "";
                        setOtpValue(newOtp.join(""));
                        document.getElementById(`otp-box-${i - 1}`)?.focus();
                      }
                      if (e.key === "Enter" && otpValue.length === 6) handleVerifyOtp();
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      setOtpValue(pasted);
                      const focusIdx = Math.min(pasted.length, 5);
                      document.getElementById(`otp-box-${focusIdx}`)?.focus();
                    }}
                  />
                ))}
              </div>
              <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  data-testid="checkbox-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded accent-red-500"
                />
                <label htmlFor="terms-checkbox" className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  I agree to the{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="font-semibold underline" style={{ color: "#ff6b6b" }} data-testid="button-view-terms">
                    Terms & Conditions
                  </button>
                </label>
              </div>
              <Button
                data-testid="button-verify-otp"
                onClick={handleVerifyOtp}
                disabled={isLoading || otpValue.length !== 6 || !termsAccepted}
                className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
              >
                {isLoading ? "Verifying..." : "Verify & Login"} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onClick={() => { setStep("input"); setOtpValue(""); setError(""); }}
              >
                Change {method === "phone" ? "number" : "email"}
              </Button>
            </>
          )}
        </div>
      </div>
      {showTerms && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col border" style={{ background: "#141428", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 className="font-bold text-lg text-white">Terms & Conditions</h3>
              <button onClick={() => setShowTerms(false)} style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
            </div>
            <div className="p-4 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              {termsContent || "Loading..."}
            </div>
            <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => { setTermsAccepted(true); setShowTerms(false); }}
                className="w-full h-12 rounded-xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
                data-testid="button-accept-terms"
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      )}
      {showTermsUpdate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col border" style={{ background: "#141428", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 className="font-bold text-lg text-white">Updated Terms & Conditions</h3>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Our terms have been updated. Please review and accept to continue.</p>
            </div>
            <div className="p-4 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              {termsContent || "Loading..."}
            </div>
            <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={handleAcceptTermsAndContinue}
                className="w-full h-12 rounded-xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
                data-testid="button-accept-updated-terms"
              >
                I Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
