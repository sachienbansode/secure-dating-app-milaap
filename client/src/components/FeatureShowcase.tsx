import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, Shield, Sparkles, Crown, MapPin, Camera, Users, Lock, Bell, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Heart,
    title: "Smart Matchmaking",
    description: "Swipe, like & super-like profiles matched to your interests and preferences",
    color: "#dc2626",
    bgGradient: "linear-gradient(135deg, #dc2626, #991b1b)",
  },
  {
    icon: MessageCircle,
    title: "AI-Powered Chat",
    description: "Smart suggestions, auto-replies when offline, and conversation coaching",
    color: "#2563eb",
    bgGradient: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  },
  {
    icon: Shield,
    title: "Respect & Safety",
    description: "Respect meter, tone analysis, chat cool-down, and enhanced reporting",
    color: "#16a34a",
    bgGradient: "linear-gradient(135deg, #16a34a, #15803d)",
  },
  {
    icon: Crown,
    title: "Premium Direct Chat",
    description: "Gold & Platinum members can chat directly without waiting to match",
    color: "#F59E0B",
    bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
  },
  {
    icon: Sparkles,
    title: "Dating Quiz",
    description: "Discover your dating style with our fun quiz — Romantic, Adventurer, or Intellectual?",
    color: "#8B5CF6",
    bgGradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
  },
  {
    icon: Camera,
    title: "Photo Verification",
    description: "AI-powered photo authenticity scoring builds trust and verified badges",
    color: "#06b6d4",
    bgGradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
  },
  {
    icon: Users,
    title: "Family-Aware Mode",
    description: "Respectful dating mode with family values — safe, filtered conversations",
    color: "#ec4899",
    bgGradient: "linear-gradient(135deg, #ec4899, #db2777)",
  },
  {
    icon: MapPin,
    title: "Festival Boosts",
    description: "Special compatibility boosts during Diwali, Holi, Eid, and more festivals",
    color: "#f97316",
    bgGradient: "linear-gradient(135deg, #f97316, #ea580c)",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "No-screenshot mode, contact sharing with consent, and encrypted messages",
    color: "#6366f1",
    bgGradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
  },
  {
    icon: Bell,
    title: "Date Readiness",
    description: "Show if you're ready for chat-only, voice calls, or meeting in person",
    color: "#14b8a6",
    bgGradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
  },
  {
    icon: Zap,
    title: "Green Flag Stories",
    description: "Share what matters — respect, healing, boundaries. AI analyzes your green flags",
    color: "#84cc16",
    bgGradient: "linear-gradient(135deg, #84cc16, #65a30d)",
  },
];

export default function FeatureShowcase({ onClose }: { onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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
    }, 3000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const feature = FEATURES[currentIndex];
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 50%, #0d0d20 100%)" }}
      data-testid="feature-showcase"
    >
      <div className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: `radial-gradient(circle, ${feature.color}, transparent 70%)` }} />
      <div className="absolute bottom-[-10%] left-[-20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15" style={{ background: `radial-gradient(circle, ${feature.color}, transparent 70%)` }} />

      <div className="flex items-center justify-between p-4 z-10">
        <span className="text-white/50 text-sm font-medium">{currentIndex + 1} / {FEATURES.length}</span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm"
          data-testid="button-close-showcase"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-2xl"
              style={{ background: feature.bgGradient }}
            >
              <Icon size={48} className="text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-heading font-extrabold text-white mb-4"
            >
              {feature.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg leading-relaxed max-w-[320px]"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {feature.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 z-10 space-y-4">
        <div className="flex justify-center gap-1.5">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setIsAutoPlaying(false); }}
              className="transition-all"
              data-testid={`dot-feature-${i}`}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === currentIndex ? 24 : 8,
                  backgroundColor: i === currentIndex ? feature.color : "rgba(255,255,255,0.2)",
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setIsAutoPlaying(false); }}
            disabled={currentIndex === 0}
            className="flex-1 h-12 rounded-xl font-semibold text-sm transition-all disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="button-showcase-prev"
          >
            Previous
          </button>
          {currentIndex < FEATURES.length - 1 ? (
            <button
              onClick={() => { setCurrentIndex(currentIndex + 1); setIsAutoPlaying(false); }}
              className="flex-1 h-12 rounded-xl font-bold text-sm text-white transition-all shadow-lg"
              style={{ background: feature.bgGradient }}
              data-testid="button-showcase-next"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl font-bold text-sm text-white transition-all shadow-lg"
              style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
              data-testid="button-showcase-getstarted"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
