import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Heart, MessageCircle, Shield, Sparkles, Crown, MapPin, Camera, Users, Lock, Bell, Zap, Phone, Share2, Thermometer, Calendar, Volume2, VolumeX, ChevronRight, ChevronLeft } from "lucide-react";

import imgAiProxy from "../assets/tour/ai-proxy.png";
import imgMatchmaking from "../assets/tour/matchmaking.png";
import imgChat from "../assets/tour/chat.png";
import imgPremium from "../assets/tour/premium.png";
import imgPrivacy from "../assets/tour/privacy.png";
import imgFestival from "../assets/tour/festival.png";
import imgContactSharing from "../assets/tour/contact-sharing.png";
import imgQuiz from "../assets/tour/quiz.png";
import imgRespect from "../assets/tour/respect.png";
import imgLocation from "../assets/tour/location.png";
import imgPhotoVerify from "../assets/tour/photo-verify.png";
import imgFamily from "../assets/tour/family.png";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Proxy Presence",
    subtitle: "Never Miss a Connection",
    description: "Your AI assistant chats on your behalf when you're away. It learns your style, pace, and boundaries to keep conversations warm and natural.",
    detail: "5 conversation stages from opening to date planning — with Indian cultural awareness built in.",
    color: "#8B5CF6",
    bgGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    image: imgAiProxy,
  },
  {
    icon: Heart,
    title: "Smart Matchmaking",
    subtitle: "Find Your Perfect Match",
    description: "Swipe, like, and super-like profiles curated to your interests, age, location, and intent preferences.",
    detail: "Smart 4-hour cooldown prevents fatigue. Gender, age, and city filters. Intent-based matching.",
    color: "#dc2626",
    bgGradient: "linear-gradient(135deg, #dc2626, #991b1b)",
    image: imgMatchmaking,
  },
  {
    icon: MessageCircle,
    title: "AI-Powered Chat",
    subtitle: "Conversations That Flow",
    description: "Get AI-powered message suggestions, conversation coaching, and smart icebreakers tailored to each match.",
    detail: "Tone analysis keeps chats respectful. Auto-replies when you're busy. Chat attachments with one-time view.",
    color: "#2563eb",
    bgGradient: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    image: imgChat,
  },
  {
    icon: Crown,
    title: "Premium Direct Chat",
    subtitle: "Skip the Wait",
    description: "Gold and Platinum members can start a conversation with anyone instantly — no matching required.",
    detail: "4-tier membership: Basic, Silver, Gold, Platinum. Each tier unlocks exclusive features and more daily likes.",
    color: "#F59E0B",
    bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    image: imgPremium,
  },
  {
    icon: Phone,
    title: "Mutual Contact Sharing",
    subtitle: "Share on Your Terms",
    description: "Share your phone number or email with a match — independently and only when you're ready. Full control over what you share.",
    detail: "Each person chooses what to share. No pressure, no auto-reveal. Visible only to the chosen match.",
    color: "#0ea5e9",
    bgGradient: "linear-gradient(135deg, #0ea5e9, #0284c7)",
    image: imgContactSharing,
  },
  {
    icon: MapPin,
    title: "Location Sharing",
    subtitle: "Meet Safely",
    description: "Share your current location or go live for up to 1 hour — perfect for coordinating safe meetups.",
    detail: "One-time location or live tracking with auto-expiry. Google Maps integration. GPS-based city search.",
    color: "#14b8a6",
    bgGradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    image: imgLocation,
  },
  {
    icon: Shield,
    title: "Respect & Safety",
    subtitle: "A Culture of Respect",
    description: "Every user has a visible Respect Meter. Disrespectful behavior lowers your score and limits your daily likes.",
    detail: "AI tone analysis, report & block with chat review, auto-deactivation for repeat offenders.",
    color: "#16a34a",
    bgGradient: "linear-gradient(135deg, #16a34a, #15803d)",
    image: imgRespect,
  },
  {
    icon: Thermometer,
    title: "Chat Cool-Down",
    subtitle: "Keeping It Respectful",
    description: "AI monitors chat tone every 5 messages. If things escalate, a 5-minute cool-down pause kicks in with respectful prompts.",
    detail: "Repeat offenders face chat bans. Protects everyone and promotes healthy conversations.",
    color: "#ef4444",
    bgGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    image: imgChat,
  },
  {
    icon: Lock,
    title: "No-Phone-Number Culture",
    subtitle: "Privacy by Default",
    description: "AI blocks accidental sharing of phone numbers and WhatsApp IDs in chat. Unlock contact sharing only with mutual consent.",
    detail: "24-hour cool-off after unlock request. Both users must agree. No pressure, no surprises.",
    color: "#6366f1",
    bgGradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    image: imgPrivacy,
  },
  {
    icon: Sparkles,
    title: "Dating Quiz",
    subtitle: "Discover Your Style",
    description: "15 fun questions covering personality, communication, and values — with Indian cultural flavor (Bollywood couples, festivals!).",
    detail: "6 dating styles: Romantic, Adventurer, Intellectual, Family-First, Free Spirit, Ambitious Go-Getter.",
    color: "#a855f7",
    bgGradient: "linear-gradient(135deg, #a855f7, #9333ea)",
    image: imgQuiz,
  },
  {
    icon: Camera,
    title: "Photo Verification",
    subtitle: "Real People, Real Profiles",
    description: "AI-powered photo authenticity scoring gives every profile a trust badge from 0 to 100.",
    detail: "Verified badges show on discover cards and profiles. Build trust before you match.",
    color: "#06b6d4",
    bgGradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    image: imgPhotoVerify,
  },
  {
    icon: Users,
    title: "Family-Aware Mode",
    subtitle: "Respectful Dating",
    description: "Enable family-aware mode for filtered, respectful conversations. Matches only with others who share your family values.",
    detail: "AI filters inappropriate language. Perfect for those who want to involve family in their dating journey.",
    color: "#ec4899",
    bgGradient: "linear-gradient(135deg, #ec4899, #db2777)",
    image: imgFamily,
  },
  {
    icon: Calendar,
    title: "Festival Boosts",
    subtitle: "Celebrate Together",
    description: "Get special compatibility boosts during Diwali, Holi, Eid, Christmas, and more Indian festivals.",
    detail: "Festival preference matching + hometown proximity. Find someone who celebrates the way you do.",
    color: "#f97316",
    bgGradient: "linear-gradient(135deg, #f97316, #ea580c)",
    image: imgFestival,
  },
  {
    icon: Bell,
    title: "Date Readiness",
    subtitle: "Set Your Pace",
    description: "Show if you're ready for chat-only, voice calls, or meeting in person — visible on your profile and in chat.",
    detail: "No pressure to rush. Your match knows exactly where you stand. Update anytime.",
    color: "#10b981",
    bgGradient: "linear-gradient(135deg, #10b981, #059669)",
    image: imgMatchmaking,
  },
  {
    icon: Zap,
    title: "Green Flag Stories",
    subtitle: "Show Your Best Self",
    description: "Share 3 micro-prompts: what you never joke about, your idea of respect, and what you're healing from.",
    detail: "AI analyzes your stories for genuine green flags. Authentic profiles attract better matches.",
    color: "#84cc16",
    bgGradient: "linear-gradient(135deg, #84cc16, #65a30d)",
    image: imgRespect,
  },
  {
    icon: Share2,
    title: "30-Day Intent Lock",
    subtitle: "Serious About Your Goals",
    description: "Choose Casual, Dating, Serious, or Marriage — and lock it for 30 days. Shows commitment to your dating intent.",
    detail: "Breaking the lock costs -10 respect and -15 daily likes. Matches see your intent upfront.",
    color: "#f43f5e",
    bgGradient: "linear-gradient(135deg, #f43f5e, #e11d48)",
    image: imgPrivacy,
  },
  {
    icon: Lock,
    title: "No Screenshot Mode",
    subtitle: "Your Privacy, Protected",
    description: "Enable screenshot protection on your profile and chats. Alerts you if someone tries to capture your content.",
    detail: "CSS protection, PrintScreen detection, visibility change monitoring. Stay in control of your data.",
    color: "#7c3aed",
    bgGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    image: imgPrivacy,
  },
];

function useAudioContext() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);
  const bgSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playChime = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [getCtx]);

  const startBgMusic = useCallback(() => {
    if (isPlayingRef.current) return;
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const sr = ctx.sampleRate;
      const bpm = 76;
      const beat = (60 / bpm) * sr;
      const raagYaman = [261.63, 309.03, 349.23, 369.99, 392.0, 466.16, 523.25, 587.33, 659.26, 698.46, 783.99, 880.0];
      const melody = [
        [4, 0.75], [5, 0.5], [6, 1.0], [7, 0.5], [6, 0.75], [5, 0.5], [4, 1.0],
        [3, 0.5], [2, 0.75], [4, 0.5], [2, 1.0], [1, 0.5], [2, 0.75], [4, 1.5],
        [6, 0.5], [7, 0.75], [8, 0.5], [9, 1.0], [8, 0.5], [7, 0.75], [6, 0.5],
        [4, 1.0], [5, 0.5], [4, 0.75], [2, 0.5], [0, 2.0],
      ];
      const totalBeats = melody.reduce((s, [, d]) => s + d, 0);
      const bufferSize = Math.ceil(totalBeats * beat);
      const buffer = ctx.createBuffer(2, bufferSize, sr);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let pos = 0;
        for (const [noteIdx, dur] of melody) {
          const freq = raagYaman[noteIdx];
          const len = Math.floor(dur * beat);
          for (let i = 0; i < len && pos + i < bufferSize; i++) {
            const t = i / sr;
            const env = i < sr * 0.04
              ? i / (sr * 0.04)
              : Math.exp(-2.5 * (i - sr * 0.04) / sr);
            const pan = ch === 0 ? 0.95 : 1.0;
            data[pos + i] =
              Math.sin(2 * Math.PI * freq * t) * 0.04 * env * pan +
              Math.sin(2 * Math.PI * freq * 2.001 * t) * 0.018 * env +
              Math.sin(2 * Math.PI * freq * 3.0 * t) * 0.008 * env +
              Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.012 * env * (ch === 1 ? 1 : 0.9);
          }
          pos += len;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 1.5);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      bgGainRef.current = gain;
      bgSourceRef.current = source;
      isPlayingRef.current = true;
    } catch {}
  }, [getCtx]);

  const stopBgMusic = useCallback(() => {
    try {
      if (bgSourceRef.current) {
        bgSourceRef.current.stop();
        bgSourceRef.current = null;
      }
      bgGainRef.current = null;
      isPlayingRef.current = false;
    } catch {}
  }, []);

  const cleanup = useCallback(() => {
    stopBgMusic();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, [stopBgMusic]);

  return { playChime, startBgMusic, stopBgMusic, isPlaying: isPlayingRef, cleanup };
}

export default function FeatureShowcase({ onClose }: { onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const { playChime, startBgMusic, stopBgMusic, isPlaying, cleanup } = useAudioContext();
  const touchStartX = useRef(0);
  const particles = useMemo(() => Array.from({ length: 20 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, dur: 3 + Math.random() * 2, del: Math.random() * 3 })), []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= FEATURES.length - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  useEffect(() => {
    if (currentIndex > 0) playChime();
  }, [currentIndex, playChime]);

  const toggleMusic = () => {
    if (isPlaying.current) {
      stopBgMusic();
      setMusicOn(false);
    } else {
      startBgMusic();
      setMusicOn(true);
    }
  };

  const goNext = () => {
    if (currentIndex < FEATURES.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsAutoPlaying(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsAutoPlaying(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const feature = FEATURES[currentIndex];
  const Icon = feature.icon;
  const progress = ((currentIndex + 1) / FEATURES.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "#050510" }}
      data-testid="feature-showcase"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          key={`glow-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.25, scale: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-[-20%] right-[-30%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: feature.color }}
        />
        <motion.div
          key={`glow2-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="absolute bottom-[-15%] left-[-25%] w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ background: feature.color }}
        />
        {particles.map((p, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{ background: feature.color, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del }}
          />
        ))}
      </div>

      <div className="w-full h-1 bg-white/10 z-10">
        <motion.div
          className="h-full rounded-r-full"
          style={{ background: `linear-gradient(90deg, ${feature.color}, ${feature.color}88)` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 z-10">
        <span className="text-white/40 text-xs font-mono tracking-wider">{String(currentIndex + 1).padStart(2, "0")} / {FEATURES.length}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMusic}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: musicOn ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)" }}
            data-testid="button-toggle-music"
          >
            {musicOn ? <Volume2 size={16} className="text-white/70" /> : <VolumeX size={16} className="text-white/40" />}
          </button>
          <button
            onClick={() => { cleanup(); onClose(); }}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
            data-testid="button-close-showcase"
          >
            <X size={18} className="text-white/70" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="w-full max-w-[340px] rounded-2xl overflow-hidden mb-5 shadow-2xl relative"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={feature.image}
                alt={feature.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${feature.color}30 100%)` }} />
            </motion.div>

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 250, damping: 15 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl"
              style={{ background: feature.bgGradient, boxShadow: `0 8px 32px ${feature.color}40` }}
            >
              <Icon size={32} className="text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-2xl font-heading font-extrabold text-white mb-1 text-center"
            >
              {feature.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
              style={{ color: feature.color }}
            >
              {feature.subtitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-sm leading-relaxed max-w-[320px] text-center mb-3"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              {feature.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="max-w-[300px] rounded-xl px-4 py-2.5 text-center"
              style={{ background: `${feature.color}12`, border: `1px solid ${feature.color}25` }}
            >
              <p className="text-xs leading-relaxed" style={{ color: `${feature.color}cc` }}>
                {feature.detail}
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 pb-6 pt-3 z-10 space-y-3">
        <div className="flex justify-center gap-1">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setIsAutoPlaying(false); }}
              className="py-1"
              data-testid={`dot-feature-${i}`}
            >
              <motion.div
                className="h-1 rounded-full"
                animate={{
                  width: i === currentIndex ? 20 : 5,
                  backgroundColor: i === currentIndex ? feature.color : "rgba(255,255,255,0.15)",
                }}
                transition={{ duration: 0.3 }}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="w-12 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 active:scale-95"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid="button-showcase-prev"
          >
            <ChevronLeft size={20} className="text-white/70" />
          </button>
          {currentIndex === FEATURES.length - 1 ? (
            <button
              onClick={() => { cleanup(); onClose(); }}
              className="flex-1 h-11 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              style={{ background: feature.bgGradient, color: "white", boxShadow: `0 4px 20px ${feature.color}40` }}
              data-testid="button-showcase-done"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex-1 h-11 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{ background: feature.bgGradient, color: "white", boxShadow: `0 4px 20px ${feature.color}40` }}
              data-testid="button-showcase-next"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
