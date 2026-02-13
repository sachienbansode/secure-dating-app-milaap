import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, ArrowRight, Shield, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { requestOtp, verifyOtp, getMe } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import FeatureShowcase from "@/components/FeatureShowcase";

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

  const handleRequestOtp = async () => {
    if (!contactValue.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = method === "phone"
        ? { phone: `+91${contactValue.replace(/\s/g, "")}` }
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
        ? { phone: `+91${contactValue.replace(/\s/g, "")}`, otp: otpValue }
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
            <div className="absolute inset-0 w-28 h-28 rounded-3xl blur-xl opacity-50" style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }} />
            <div className="relative w-28 h-28 rounded-3xl flex items-center justify-center p-3 border border-white/10" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))", backdropFilter: "blur(20px)" }}>
              <img src={logo} alt="Milaap Logo" className="w-full h-full object-contain drop-shadow-2xl" />
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
            className="text-lg font-medium max-w-[300px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            Dil se dil tak. <br />
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Meaningful connections with respect.</span>
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
        <h2 className="text-3xl font-heading font-bold text-white mb-2">
          Namaste! 🙏
        </h2>
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
              <div className="relative">
                {method === "phone" && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium pr-3 mr-2" style={{ color: "rgba(255,255,255,0.4)", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                    +91
                  </span>
                )}
                <Input
                  data-testid="input-contact"
                  type={method === "phone" ? "tel" : "email"}
                  inputMode={method === "phone" ? "numeric" : "email"}
                  pattern={method === "phone" ? "[0-9]*" : undefined}
                  value={contactValue}
                  onChange={(e) => setContactValue(method === "phone" ? e.target.value.replace(/[^\d\s]/g, "") : e.target.value)}
                  placeholder={method === "phone" ? "98765 43210" : "name@example.com"}
                  className={`h-16 text-xl rounded-2xl ${method === "phone" ? "pl-20" : "px-6"} text-white placeholder-white/30`}
                  style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                />
              </div>
              <Button
                data-testid="button-send-otp"
                onClick={handleRequestOtp}
                disabled={isLoading || !contactValue.trim()}
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
