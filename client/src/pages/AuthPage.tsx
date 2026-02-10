import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { requestOtp, verifyOtp, getMe } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<"splash" | "phone" | "email">("splash");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpHint, setOtpHint] = useState("");

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
    retry: false,
  });

  if (checkingSession) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-gradient">
        <div className="animate-pulse text-white text-xl font-heading">Milaap</div>
      </div>
    );
  }

  if (session?.user) {
    if (!session.profile) {
      setLocation("/profile");
    } else {
      setLocation("/home");
    }
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

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = method === "phone"
        ? { phone: `+91${contactValue.replace(/\s/g, "")}`, otp: otpValue }
        : { email: contactValue, otp: otpValue };
      const result = await verifyOtp(payload);
      if (result.hasProfile) {
        setLocation("/home");
      } else {
        setLocation("/profile");
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
        <div className="absolute top-[-15%] left-[-15%] w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl mix-blend-overlay" />
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
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4" data-testid="text-error">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {step === "input" ? (
            <>
              <div className="relative">
                {method === "phone" && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium border-r border-gray-300 pr-3 mr-2">
                    +91
                  </span>
                )}
                <Input
                  data-testid="input-contact"
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={method === "phone" ? "98765 43210" : "name@example.com"}
                  className={`h-16 text-xl bg-white border-2 border-gray-100 rounded-2xl ${method === "phone" ? "pl-20" : "px-6"} focus-visible:ring-primary focus-visible:border-primary`}
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
                <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-xl" data-testid="text-otp-hint">
                  Demo OTP: <span className="font-bold">{otpHint}</span>
                </div>
              )}
              <Input
                data-testid="input-otp"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-16 text-3xl text-center bg-white border-2 border-gray-100 rounded-2xl tracking-[0.5em] focus-visible:ring-primary focus-visible:border-primary font-mono"
                autoFocus
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />
              <Button
                data-testid="button-verify-otp"
                onClick={handleVerifyOtp}
                disabled={isLoading || otpValue.length !== 6}
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
    </div>
  );
}
