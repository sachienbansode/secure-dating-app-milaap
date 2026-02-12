import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, Heart, Compass, BookOpen, Home, Wind, Rocket, RefreshCw, Crown } from "lucide-react";
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
