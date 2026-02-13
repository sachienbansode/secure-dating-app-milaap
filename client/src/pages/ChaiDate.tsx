import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Coffee, Heart, Plus, Sparkles, X, Timer, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { getMe } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[style]);
  }
};

const ICEBREAKERS = [
  "What's the best chai you've ever had?",
  "If you could travel anywhere in India tomorrow, where would you go?",
  "What's your most embarrassing Bollywood moment?",
  "What does a perfect Sunday look like for you?",
  "What's one thing most people don't know about you?",
  "If you could have dinner with any person, who would it be?",
  "What's your go-to comfort food?",
  "Mountains or beaches - and why?",
  "What's the best compliment you've ever received?",
  "What's your hidden talent?",
  "If your life had a theme song, what would it be?",
  "What's the most spontaneous thing you've ever done?",
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ChaiDate() {
  const [, params] = useRoute("/chai-date/:chaiDateId");
  const [, setLocation] = useLocation();
  const chaiDateId = params?.chaiDateId;
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [currentIcebreaker, setCurrentIcebreaker] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ended, setEnded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: session } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: chaiDate, isLoading } = useQuery<any>({
    queryKey: [`/api/chai-date/${chaiDateId}`],
    enabled: !!chaiDateId,
    refetchInterval: 5000,
  });

  const { data: requesterProfile } = useQuery<any>({
    queryKey: [`/api/profile/${chaiDate?.requesterId}`],
    enabled: !!chaiDate?.requesterId,
  });

  const { data: recipientProfile } = useQuery<any>({
    queryKey: [`/api/profile/${chaiDate?.recipientId}`],
    enabled: !!chaiDate?.recipientId,
  });

  const extendMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/chai-date/${chaiDateId}/extend`),
    onSuccess: () => {
      triggerHaptic("medium");
      queryClient.invalidateQueries({ queryKey: [`/api/chai-date/${chaiDateId}`] });
      setTimeRemaining(prev => prev + 180);
    },
  });

  const endMutation = useMutation({
    mutationFn: (reason: string) => apiRequest("POST", `/api/chai-date/${chaiDateId}/end`, { reason }),
    onSuccess: () => {
      triggerHaptic("heavy");
      setEnded(true);
    },
  });

  useEffect(() => {
    if (!chaiDate?.startedAt || chaiDate?.status !== "active") return;

    const startTime = new Date(chaiDate.startedAt).getTime();
    const totalDuration = (chaiDate.durationMinutes || 5) * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        endMutation.mutate("timer_expired");
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [chaiDate?.startedAt, chaiDate?.durationMinutes, chaiDate?.status]);

  const nextIcebreaker = useCallback(() => {
    triggerHaptic("light");
    setCurrentIcebreaker(prev => (prev + 1) % ICEBREAKERS.length);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0a0a1a" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <Coffee size={40} className="text-amber-500" />
        </motion.div>
      </div>
    );
  }

  if (!chaiDate || chaiDate.status === "declined") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6" style={{ background: "#0a0a1a" }}>
        <Coffee size={48} className="text-gray-500" />
        <p className="text-gray-400 text-center">This Chai Date is no longer available</p>
        <Button onClick={() => setLocation(`/chat/${chaiDate?.matchId || ""}`)} variant="outline" className="border-gray-700 text-gray-300" data-testid="button-back-to-chat">
          Back to Chat
        </Button>
      </div>
    );
  }

  if (ended || chaiDate.status === "completed") {
    const myProfile = session?.user?.id === chaiDate.requesterId ? requesterProfile : recipientProfile;
    const otherProfile = session?.user?.id === chaiDate.requesterId ? recipientProfile : requesterProfile;

    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 p-6" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a0a 100%)" }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)" }}>
            <Coffee size={48} className="text-white" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center"
          >
            <Heart size={20} className="text-white" />
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Chai Date Complete!</h2>
          <p className="text-gray-400 text-sm">
            Hope you enjoyed your chai with {otherProfile?.name || "your match"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => { triggerHaptic("medium"); setLocation(`/chat/${chaiDate.matchId}`); }}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
            data-testid="button-continue-chatting"
          >
            <MessageCircle size={18} className="mr-2" /> Continue Chatting
          </Button>
          <Button
            onClick={() => setLocation("/matches")}
            variant="outline"
            className="w-full py-3 rounded-xl border-gray-700 text-gray-300"
            data-testid="button-back-matches"
          >
            Back to Matches
          </Button>
        </motion.div>
      </div>
    );
  }

  const myProfile = session?.user?.id === chaiDate.requesterId ? requesterProfile : recipientProfile;
  const otherProfile = session?.user?.id === chaiDate.requesterId ? recipientProfile : requesterProfile;
  const isLowTime = timeRemaining <= 60;
  const timerProgress = chaiDate.durationMinutes ? (timeRemaining / (chaiDate.durationMinutes * 60)) : 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a0f05 50%, #0a0a1a 100%)" }}>
      <div className="flex items-center justify-between p-4 z-10">
        <button
          onClick={() => setShowEndConfirm(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
          data-testid="button-end-chai-date"
        >
          <X size={20} className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Coffee size={18} className="text-amber-500" />
          <span className="text-amber-400 font-bold text-sm">Chai Date</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        <div className="flex items-center gap-6">
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-20 h-20 border-2 border-amber-500/50">
                <AvatarImage src={myProfile?.photos?.[0]} />
                <AvatarFallback className="bg-gray-800 text-white text-lg">{myProfile?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              {myProfile?.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-black">
                  <span className="text-xs">✓</span>
                </div>
              )}
            </div>
            <span className="text-white text-sm font-medium">{myProfile?.name || "You"}</span>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)" }}>
              <Coffee size={28} className="text-white" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)", opacity: 0.3 }}
              />
            </div>
          </motion.div>

          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-20 h-20 border-2 border-amber-500/50">
                <AvatarImage src={otherProfile?.photos?.[0]} />
                <AvatarFallback className="bg-gray-800 text-white text-lg">{otherProfile?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              {otherProfile?.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-black">
                  <span className="text-xs">✓</span>
                </div>
              )}
            </div>
            <span className="text-white text-sm font-medium">{otherProfile?.name || "Match"}</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={isLowTime ? "#ef4444" : "#f59e0b"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerProgress)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${isLowTime ? "text-red-400" : "text-amber-400"}`} data-testid="text-timer">
                {formatTime(timeRemaining)}
              </span>
              <span className="text-xs text-gray-500">remaining</span>
            </div>
          </div>

          {isLowTime && !chaiDate.extended && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Button
                onClick={() => extendMutation.mutate()}
                disabled={extendMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)" }}
                data-testid="button-extend-chai-date"
              >
                <Plus size={14} className="mr-1" /> Extend 3 mins
              </Button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Icebreaker</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={currentIcebreaker}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-white text-base font-medium leading-relaxed"
                data-testid="text-icebreaker"
              >
                {ICEBREAKERS[currentIcebreaker]}
              </motion.p>
            </AnimatePresence>
            <button
              onClick={nextIcebreaker}
              className="mt-4 text-amber-500 text-sm font-medium hover:text-amber-400 transition-colors"
              data-testid="button-next-icebreaker"
            >
              Next question →
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-gray-500 text-xs text-center max-w-xs"
        >
          Talk about the icebreaker in your chat! This is a fun timed session to get to know each other.
        </motion.p>
      </div>

      <div className="p-4">
        <Button
          onClick={() => { triggerHaptic("light"); setLocation(`/chat/${chaiDate.matchId}`); }}
          className="w-full py-3 rounded-xl text-white font-bold"
          style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
          data-testid="button-go-to-chat"
        >
          <MessageCircle size={18} className="mr-2" /> Open Chat
        </Button>
      </div>

      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <h3 className="text-white text-lg font-bold mb-2">End Chai Date?</h3>
              <p className="text-gray-400 text-sm mb-5">
                Are you sure you want to end this chai date with {otherProfile?.name}? You can always start another one later.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowEndConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300"
                  data-testid="button-cancel-end"
                >
                  Keep Going
                </Button>
                <Button
                  onClick={() => { endMutation.mutate("user_ended"); setShowEndConfirm(false); }}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  data-testid="button-confirm-end"
                >
                  End Date
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
