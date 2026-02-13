import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, Heart, Compass, BookOpen, Home, Wind, Rocket, RefreshCw, Crown, Share2, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe, type AuthResponse } from "@/lib/auth";
import { BottomNav } from "@/components/layout/BottomNav";

const STYLE_CONFIG: Record<string, { icon: any; color: string; gradient: string; emoji: string; description: string; strengths: string[]; idealMatch: string }> = {
  "The Romantic": {
    icon: Heart, color: "#dc2626", gradient: "from-red-600 to-pink-500",
    emoji: "💕", description: "You wear your heart on your sleeve. Love, for you, is about deep emotional connections, grand gestures, and making your partner feel like the most special person in the world.",
    strengths: ["Deeply caring & expressive", "Creates magical moments", "Emotionally present", "Loyal & devoted"],
    idealMatch: "The Family-First or The Intellectual",
  },
  "The Adventurer": {
    icon: Compass, color: "#f59e0b", gradient: "from-amber-500 to-orange-500",
    emoji: "🌍", description: "Life is an adventure and love is the greatest one! You seek a partner who's ready to explore, try new things, and create unforgettable memories together.",
    strengths: ["Spontaneous & exciting", "Always up for something new", "Brings energy to relationships", "Never lets things get boring"],
    idealMatch: "The Free Spirit or The Ambitious Go-Getter",
  },
  "The Intellectual": {
    icon: BookOpen, color: "#8b5cf6", gradient: "from-violet-600 to-purple-500",
    emoji: "🧠", description: "For you, the brain is the most attractive organ. You crave deep conversations, shared learning experiences, and a partner who challenges your thinking.",
    strengths: ["Thoughtful & reflective", "Values personal growth", "Great communicator", "Emotionally intelligent"],
    idealMatch: "The Ambitious Go-Getter or The Romantic",
  },
  "The Family-First": {
    icon: Home, color: "#22c55e", gradient: "from-green-600 to-emerald-500",
    emoji: "🏡", description: "Family is everything to you. You're looking for someone who values traditions, respects elders, and dreams of building a warm, loving household together.",
    strengths: ["Nurturing & supportive", "Values traditions", "Reliable & stable", "Brings people together"],
    idealMatch: "The Romantic or The Family-First",
  },
  "The Free Spirit": {
    icon: Wind, color: "#06b6d4", gradient: "from-cyan-500 to-teal-500",
    emoji: "🦋", description: "You dance to your own beat and need a partner who respects your independence. Love should feel like freedom, not a cage - fun, light, and full of laughter.",
    strengths: ["Independent & confident", "Fun-loving & creative", "Open-minded", "Brings joy to every moment"],
    idealMatch: "The Adventurer or The Free Spirit",
  },
  "The Ambitious Go-Getter": {
    icon: Rocket, color: "#2563eb", gradient: "from-blue-600 to-indigo-500",
    emoji: "🚀", description: "You're driven, focused, and building something big. You need a partner who understands your hustle, supports your dreams, and is equally passionate about their own.",
    strengths: ["Goal-oriented & driven", "Supportive of partner's goals", "Values work-life balance", "Inspiring & motivating"],
    idealMatch: "The Intellectual or The Adventurer",
  },
};

export default function Quiz() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [resultStyle, setResultStyle] = useState<string | null>(null);
  const [resultTraits, setResultTraits] = useState<Record<string, number> | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: session } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: existingResults } = useQuery<any>({
    queryKey: ["/api/quiz/my-results"],
    queryFn: async () => {
      const res = await fetch("/api/quiz/my-results", { credentials: "include" });
      if (!res.ok) return { completed: false };
      return res.json();
    },
    enabled: !!session?.user,
  });

  const { data: questionsData } = useQuery<any>({
    queryKey: ["/api/quiz/questions"],
    queryFn: async () => {
      const res = await fetch("/api/quiz/questions", { credentials: "include" });
      return res.json();
    },
    enabled: !!session?.user,
  });

  const questions = questionsData?.questions || [];

  const submitMutation = useMutation({
    mutationFn: async (responses: { questionId: string; selectedOption: number }[]) => {
      const res = await apiRequest("POST", "/api/quiz/submit", { responses });
      return res.json();
    },
    onSuccess: (data) => {
      setResultStyle(data.style);
      setResultTraits(data.traits);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/my-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const retakeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/quiz/retake", {});
      return res.json();
    },
    onSuccess: () => {
      setAnswers({});
      setCurrentQuestion(0);
      setShowResults(false);
      setResultStyle(null);
      setResultTraits(null);
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/my-results"] });
    },
  });

  useEffect(() => {
    if (existingResults?.completed && existingResults.style) {
      setResultStyle(existingResults.style);
      setResultTraits(existingResults.traits);
      setShowResults(true);
    }
  }, [existingResults]);

  if (!session?.user) return null;

  const selectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 400);
    }
  };

  const handleSubmit = () => {
    const responses = Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }));
    submitMutation.mutate(responses);
  };

  const progress = questions.length > 0 ? ((Object.keys(answers).length) / questions.length) * 100 : 0;
  const canSubmit = Object.keys(answers).length >= 10;

  if (showResults && resultStyle) {
    const config = STYLE_CONFIG[resultStyle] || STYLE_CONFIG["The Romantic"];
    const StyleIcon = config.icon;
    const maxTrait = resultTraits ? Math.max(...Object.values(resultTraits)) : 1;

    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="p-4 space-y-5"
          >
            <div className="text-center pt-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className={`w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} mx-auto flex items-center justify-center shadow-lg mb-4`}
              >
                <span className="text-4xl">{config.emoji}</span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-bold text-white"
              >
                You are...
              </motion.h2>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-3xl font-extrabold mt-2"
                style={{ color: config.color }}
                data-testid="text-dating-style"
              >
                {resultStyle}
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles size={16} style={{ color: config.color }} /> Your Strengths
              </h3>
              <div className="space-y-2">
                {config.strengths.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <Check size={14} style={{ color: config.color }} />
                    <span className="text-sm text-foreground">{s}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {resultTraits && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="bg-card rounded-2xl p-4 border border-border"
              >
                <h3 className="font-bold text-sm mb-3">Your Trait Profile</h3>
                <div className="space-y-2.5">
                  {Object.entries(resultTraits)
                    .sort((a, b) => b[1] - a[1])
                    .map(([trait, score]) => (
                      <div key={trait} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{trait}</span>
                          <span className="font-medium">{Math.round((score / maxTrait) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(score / maxTrait) * 100}%` }}
                            transition={{ delay: 1.6, duration: 0.8 }}
                            className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Crown size={16} className="text-amber-400" /> Best Compatible With
              </h3>
              <p className="text-sm text-muted-foreground">{config.idealMatch}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.0 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Share2 size={16} style={{ color: config.color }} /> Share Your Results
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Let your friends discover their dating style too!</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    const text = `${config.emoji} I just discovered I'm "${resultStyle}" on Milaap's Dating Style Quiz! ${config.description.split(".")[0]}. Take the quiz and find your dating style!`;
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, "_blank");
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                  data-testid="button-share-whatsapp"
                >
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.603-1.209A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.234 0-4.308-.724-5.993-1.95l-.349-.258-3.427.9.917-3.35-.283-.449A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    const text = `${config.emoji} I'm "${resultStyle}" on Milaap's Dating Style Quiz! ${config.strengths[0]} & ${config.strengths[1].toLowerCase()}. Discover yours!`;
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=Milaap,DatingStyle,LoveQuiz`;
                    window.open(url, "_blank");
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors"
                  data-testid="button-share-twitter"
                >
                  <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-background"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">X</span>
                </button>

                <button
                  onClick={() => {
                    const text = `${config.emoji} I just took Milaap's Dating Style Quiz and I'm "${resultStyle}"! ${config.description.split(".")[0]}.`;
                    const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`;
                    window.open(url, "_blank");
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors"
                  data-testid="button-share-facebook"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Facebook</span>
                </button>

                <button
                  onClick={async () => {
                    const text = `${config.emoji} I'm "${resultStyle}" on Milaap's Dating Style Quiz!\n\n${config.description.split(".")[0]}.\n\nMy strengths:\n${config.strengths.map(s => `✅ ${s}`).join("\n")}\n\nBest match: ${config.idealMatch}\n\nDiscover your dating style on Milaap!`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: `My Milaap Dating Style: ${resultStyle}`, text });
                      } catch {}
                    } else {
                      await navigator.clipboard.writeText(text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                  data-testid="button-share-copy"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center">
                    {copied ? <CheckCircle size={18} className="text-white" /> : <Copy size={18} className="text-white" />}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </motion.div>

            <div className="flex gap-3 pb-6">
              <Button
                onClick={() => retakeMutation.mutate()}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                disabled={retakeMutation.isPending}
                data-testid="button-retake-quiz"
              >
                <RefreshCw size={16} className="mr-2" /> Retake Quiz
              </Button>
              <Button
                onClick={() => setLocation("/home")}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700"
                data-testid="button-find-matches"
              >
                Find Matches
              </Button>
            </div>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading quiz...</div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => currentQuestion > 0 ? setCurrentQuestion(prev => prev - 1) : setLocation("/profile")}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"
            data-testid="button-quiz-back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-sm">Dating Style Quiz</h2>
          <span className="text-xs text-muted-foreground">{currentQuestion + 1}/{questions.length}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 to-blue-600 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">{question.category.replace("_", " ")}</span>
              <h3 className="text-lg font-bold mt-2 text-foreground leading-snug" data-testid={`text-question-${question.id}`}>
                {question.question}
              </h3>
            </div>

            <div className="space-y-3">
              {question.options.map((opt: any, idx: number) => {
                const isSelected = answers[question.id] === idx;
                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectAnswer(question.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                    data-testid={`button-option-${question.id}-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-foreground"}`}>
                        {opt.text}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-3">
          {currentQuestion > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              className="h-12 rounded-xl px-6"
              data-testid="button-prev-question"
            >
              <ArrowLeft size={16} />
            </Button>
          )}
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-blue-600"
              disabled={answers[question?.id] === undefined}
              data-testid="button-next-question"
            >
              Next <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-blue-600"
              disabled={!canSubmit || submitMutation.isPending}
              data-testid="button-submit-quiz"
            >
              {submitMutation.isPending ? "Discovering your style..." : `Discover My Style (${Object.keys(answers).length}/${questions.length})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
