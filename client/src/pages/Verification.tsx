import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, Shield, ShieldCheck, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe } from "@/lib/auth";

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[style]);
  }
};

type VerificationStep = "intro" | "pose" | "capture" | "verifying" | "result";

export default function Verification() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<VerificationStep>("intro");
  const [pose, setPose] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: session } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: status } = useQuery<any>({
    queryKey: ["/api/verification/status"],
    enabled: !!session?.user,
  });

  const fetchPose = useCallback(async () => {
    try {
      const res = await fetch("/api/verification/pose", { credentials: "include" });
      const data = await res.json();
      setPose(data);
      setStep("pose");
    } catch (err) {
      console.error("Failed to fetch pose:", err);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep("capture");
    } catch (err: any) {
      setCameraError("Camera access denied. Please allow camera access in your browser settings.");
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerHaptic("medium");

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);

    canvas.toBlob((blob) => {
      if (blob) setCapturedBlob(blob);
    }, "image/jpeg", 0.85);

    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  }, [startCamera]);

  const submitVerification = useCallback(async () => {
    if (!capturedBlob || !pose) return;
    setStep("verifying");
    triggerHaptic("light");

    try {
      const formData = new FormData();
      formData.append("selfie", capturedBlob, "selfie.jpg");
      formData.append("poseId", pose.id);

      const res = await fetch("/api/verification/submit", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await res.json();
      setVerificationResult(result);
      setStep("result");
      triggerHaptic(result.verified ? "heavy" : "medium");

      if (result.verified) {
        queryClient.invalidateQueries({ queryKey: ["/api/verification/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      }
    } catch (err) {
      setVerificationResult({ verified: false, message: "Something went wrong. Please try again." });
      setStep("result");
    }
  }, [capturedBlob, pose, queryClient]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  if (status?.isVerified) {
    return (
      <div className="flex flex-col h-screen" style={{ background: "#0a0a1a" }}>
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <button onClick={() => setLocation("/profile")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }} data-testid="button-back">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-white font-bold text-lg">Verification</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}
          >
            <ShieldCheck size={56} className="text-white" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">You're Verified!</h2>
            <p className="text-gray-400 text-sm">
              Your profile has a verified badge. This helps build trust with your matches.
            </p>
            {status.verifiedAt && (
              <p className="text-gray-500 text-xs mt-2">
                Verified on {new Date(status.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          <Button onClick={() => setLocation("/profile")} className="px-6 py-3 rounded-xl text-white font-bold" style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }} data-testid="button-back-profile">
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0a0a1a" }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <button onClick={() => { stopCamera(); setLocation("/profile"); }} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }} data-testid="button-back">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-lg">Verify Your Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 p-6 pt-12">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}>
                <Shield size={48} className="text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-3">Get Your Verified Badge</h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                  Verify your profile by taking a quick selfie. It proves you're a real person and builds trust with your matches.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-3">
                {[
                  { icon: "📸", text: "We'll show you a pose to mimic" },
                  { icon: "🤳", text: "Take a selfie doing that pose" },
                  { icon: "✅", text: "AI verifies it's really you" },
                  { icon: "🛡️", text: "Get your verified badge instantly" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-white text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <Button
                onClick={fetchPose}
                className="w-full max-w-sm py-4 rounded-xl text-white font-bold text-base"
                style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}
                data-testid="button-start-verification"
              >
                <Camera size={20} className="mr-2" /> Start Verification
              </Button>
            </motion.div>
          )}

          {step === "pose" && pose && (
            <motion.div key="pose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 p-6 pt-12">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)" }}
              >
                <span className="text-6xl">{pose.emoji}</span>
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Your Pose: {pose.label}</h2>
                <p className="text-amber-400 text-sm font-medium mb-1">{pose.instruction}</p>
                <p className="text-gray-500 text-xs">Make sure you're in a well-lit area</p>
              </div>
              <div className="w-full max-w-sm space-y-3">
                <Button
                  onClick={startCamera}
                  className="w-full py-4 rounded-xl text-white font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
                  data-testid="button-open-camera"
                >
                  <Camera size={20} className="mr-2" /> Open Camera
                </Button>
                <Button
                  onClick={fetchPose}
                  variant="outline"
                  className="w-full py-3 rounded-xl border-gray-700 text-gray-400"
                  data-testid="button-different-pose"
                >
                  <RefreshCw size={16} className="mr-2" /> Get Different Pose
                </Button>
              </div>
              {cameraError && (
                <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm text-center max-w-sm">
                  {cameraError}
                </div>
              )}
            </motion.div>
          )}

          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 p-4">
              {!capturedImage ? (
                <>
                  <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} data-testid="video-camera" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <div className="px-3 py-1.5 rounded-full flex items-center gap-2" style={{ background: "rgba(0,0,0,0.6)" }}>
                        <span className="text-lg">{pose?.emoji}</span>
                        <span className="text-white text-xs font-medium">{pose?.label}</span>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs text-center">Position your face inside the circle and do the pose</p>
                  <Button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
                    data-testid="button-capture"
                  >
                    <Camera size={32} className="text-white" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-black">
                    <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" data-testid="img-captured-selfie" />
                    <div className="absolute top-3 right-3">
                      <div className="px-3 py-1.5 rounded-full flex items-center gap-2" style={{ background: "rgba(0,0,0,0.6)" }}>
                        <CheckCircle2 size={14} className="text-green-400" />
                        <span className="text-white text-xs">Captured</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full max-w-sm">
                    <Button
                      onClick={retakePhoto}
                      variant="outline"
                      className="flex-1 py-3 rounded-xl border-gray-700 text-gray-300"
                      data-testid="button-retake"
                    >
                      <RefreshCw size={16} className="mr-2" /> Retake
                    </Button>
                    <Button
                      onClick={submitVerification}
                      className="flex-1 py-3 rounded-xl text-white font-bold"
                      style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}
                      data-testid="button-submit-verification"
                    >
                      <ShieldCheck size={16} className="mr-2" /> Verify
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === "verifying" && (
            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-6 p-6 pt-24">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}
              >
                <Loader2 size={40} className="text-white" />
              </motion.div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Verifying Your Selfie...</h2>
                <p className="text-gray-400 text-sm">Checking your pose and identity. This takes a few seconds.</p>
              </div>
            </motion.div>
          )}

          {step === "result" && verificationResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 p-6 pt-12">
              {verificationResult.verified ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-28 h-28 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}
                  >
                    <ShieldCheck size={56} className="text-white" />
                  </motion.div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Verified!</h2>
                    <p className="text-gray-400 text-sm">{verificationResult.message}</p>
                  </div>
                  <Button
                    onClick={() => setLocation("/profile")}
                    className="w-full max-w-sm py-4 rounded-xl text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
                    data-testid="button-done-verification"
                  >
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-28 h-28 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.2)", border: "2px solid rgba(239,68,68,0.4)" }}
                  >
                    <X size={56} className="text-red-400" />
                  </motion.div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
                    <p className="text-gray-400 text-sm max-w-xs">{verificationResult.message}</p>
                  </div>
                  <div className="w-full max-w-sm space-y-3">
                    <Button
                      onClick={() => { setStep("intro"); setCapturedImage(null); setCapturedBlob(null); setVerificationResult(null); }}
                      className="w-full py-4 rounded-xl text-white font-bold"
                      style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
                      data-testid="button-try-again"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => setLocation("/profile")}
                      variant="outline"
                      className="w-full py-3 rounded-xl border-gray-700 text-gray-400"
                      data-testid="button-maybe-later"
                    >
                      Maybe Later
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
