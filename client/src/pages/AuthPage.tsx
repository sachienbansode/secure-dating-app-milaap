import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { requestOtp, verifyOtp, getMe } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import WelcomeOverlay from "@/components/WelcomeOverlay";

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
      <div className="h-full flex flex-col items-center justify-between p-8 bg-brand-gradient text-white relative overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-80 h-80 bg-red-400/20 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-[40px] border-white/5 rounded-full z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border-[20px] border-white/5 rounded-full z-0" />

        <div className="mt-20 flex flex-col items-center text-center z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl p-4 rotate-3 hover:rotate-0 transition-transform duration-500"
          >
            <img src={logo} alt="Milaap Logo" className="w-full h-full object-contain" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-heading font-extrabold mb-3 tracking-tight drop-shadow-sm"
          >
            Milaap
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-white/95 font-medium max-w-[280px]"
          >
            Dil se dil tak. <br />
            Meaningful connections with respect.
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full space-y-4 z-10"
        >
          <Button
            data-testid="button-login-phone"
            onClick={() => setMethod("phone")}
            className="w-full bg-white text-primary hover:bg-orange-50 font-bold h-14 rounded-2xl shadow-xl border-0 cursor-pointer text-lg"
          >
            <Phone className="mr-3 h-5 w-5" /> Login with Phone
          </Button>
          <Button
            data-testid="button-login-email"
            onClick={() => setMethod("email")}
            variant="outline"
            className="w-full border-2 border-white/30 bg-white/10 text-white hover:bg-white/20 font-semibold h-14 rounded-2xl backdrop-blur-sm cursor-pointer text-lg"
          >
            <Mail className="mr-3 h-5 w-5" /> Login with Email
          </Button>
          <p className="text-xs text-center text-white/70 mt-6 font-medium">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-background">
      <Button
        variant="ghost"
        className="w-fit p-0 hover:bg-transparent -ml-2 mb-8 text-primary"
        onClick={() => { setMethod("splash"); setStep("input"); setError(""); setContactValue(""); setOtpValue(""); }}
      >
        ← Back
      </Button>

      <div className="flex-1">
        <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
          Namaste! 🙏
        </h2>
        <h3 className="text-xl text-muted-foreground mb-8">
          {step === "input"
            ? (method === "phone" ? "Enter your mobile number" : "Enter your email address")
            : "Enter the 6-digit OTP"
          }
        </h3>

        {error && (
          <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-xl mb-4" data-testid="text-error">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {step === "input" ? (
            <>
              <div className="relative">
                {method === "phone" && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium border-r border-border pr-3 mr-2">
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
                  className={`h-16 text-xl bg-card border-2 border-border rounded-2xl ${method === "phone" ? "pl-20" : "px-6"} focus-visible:ring-primary focus-visible:border-primary`}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                />
              </div>
              <Button
                data-testid="button-send-otp"
                onClick={handleRequestOtp}
                disabled={isLoading || !contactValue.trim()}
                className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg bg-brand-gradient hover:opacity-95 transition-all active:scale-95"
              >
                {isLoading ? "Sending..." : "Send OTP"} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              {otpHint && (
                <div className="bg-blue-900/30 text-blue-400 text-sm p-3 rounded-xl" data-testid="text-otp-hint">
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
                    className="w-12 h-14 text-2xl text-center bg-card text-foreground border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono transition-all"
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
              <div className="flex items-start gap-3 bg-muted rounded-xl p-3">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  data-testid="checkbox-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-border text-primary accent-primary"
                />
                <label htmlFor="terms-checkbox" className="text-sm text-muted-foreground">
                  I agree to the{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-primary font-semibold underline" data-testid="button-view-terms">
                    Terms & Conditions
                  </button>
                </label>
              </div>
              <Button
                data-testid="button-verify-otp"
                onClick={handleVerifyOtp}
                disabled={isLoading || otpValue.length !== 6 || !termsAccepted}
                className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg bg-brand-gradient hover:opacity-95 transition-all active:scale-95"
              >
                {isLoading ? "Verifying..." : "Verify & Login"} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setStep("input"); setOtpValue(""); setError(""); }}
              >
                Change {method === "phone" ? "number" : "email"}
              </Button>
            </>
          )}
        </div>
      </div>
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Terms & Conditions</h3>
              <button onClick={() => setShowTerms(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {termsContent || "Loading..."}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => { setTermsAccepted(true); setShowTerms(false); }}
                className="w-full h-12 rounded-xl font-bold text-white bg-brand-gradient"
                data-testid="button-accept-terms"
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      )}
      {showTermsUpdate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-lg text-foreground">Updated Terms & Conditions</h3>
              <p className="text-xs text-muted-foreground mt-1">Our terms have been updated. Please review and accept to continue.</p>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed flex-1">
              {termsContent || "Loading..."}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={handleAcceptTermsAndContinue}
                className="w-full h-12 rounded-xl font-bold text-white bg-brand-gradient"
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
