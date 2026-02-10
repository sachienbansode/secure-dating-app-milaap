import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_TAGLINES = [
  "Respect first. Connection next.",
  "Safe. Honest. Meaningful.",
  "Dating, done right.",
  "Built on trust, not swipes.",
  "Clarity before chemistry.",
];

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const durations = [0.15, 0.15, 0.15, 0.4];

    let time = now;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, time);

      const vol = i === notes.length - 1 ? 0.15 : 0.1;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i] + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + durations[i] + 0.35);

      time += durations[i];
    });

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(1568, now + 0.3);
    shimmerGain.gain.setValueAtTime(0, now + 0.3);
    shimmerGain.gain.linearRampToValueAtTime(0.04, now + 0.35);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.3);
    shimmer.stop(now + 1.3);
  } catch (e) {}
}

interface WelcomeOverlayProps {
  show: boolean;
  onDone: () => void;
  taglines?: string[];
}

export default function WelcomeOverlay({ show, onDone, taglines }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(false);
  const lines = taglines && taglines.length > 0 ? taglines : DEFAULT_TAGLINES;
  const [tagline] = useState(() => lines[Math.floor(Math.random() * lines.length)]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDone, 600);
  }, [onDone]);

  useEffect(() => {
    if (show) {
      setVisible(true);
      playChime();
      const timer = setTimeout(dismiss, 3200);
      return () => clearTimeout(timer);
    }
  }, [show, dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-gradient overflow-hidden cursor-pointer"
          onClick={dismiss}
          data-testid="welcome-overlay"
        >
          <div className="absolute top-[-20%] left-[-15%] w-[500px] h-[500px] bg-yellow-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-3xl" />

          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100, x: Math.random() * 300 - 150 }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [100, -200],
                x: Math.random() * 200 - 100,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 1.5,
                ease: "easeOut",
              }}
              className="absolute text-2xl pointer-events-none"
              style={{ left: `${10 + Math.random() * 80}%`, bottom: "0%" }}
            >
              {["✨", "💫", "🌟", "⭐", "🪷"][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}

          <div className="relative z-10 text-center px-8 max-w-md">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-8 border border-white/30"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.3 }}
                className="text-4xl"
              >
                🙏
              </motion.span>
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-4xl font-heading font-extrabold text-white mb-2 drop-shadow-sm"
            >
              Welcome back!
            </motion.h1>

            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.6, type: "spring", stiffness: 150 }}
              className="relative mt-6"
            >
              <div className="absolute inset-0 bg-white/10 rounded-2xl blur-md" />
              <div className="relative bg-white/15 backdrop-blur-sm rounded-2xl px-8 py-5 border border-white/25">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                  className="text-xl font-medium text-white/95 italic leading-relaxed"
                  data-testid="text-welcome-tagline"
                >
                  "{tagline}"
                </motion.p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8"
            >
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white/50 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
