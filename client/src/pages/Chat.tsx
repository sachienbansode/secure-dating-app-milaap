import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles, MoreVertical, ShieldCheck, Phone, Video, Paperclip, CheckCheck, Flag, Loader2, Bot, ShieldAlert, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe } from "@/lib/auth";

interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  isAiGenerated: boolean;
  isAiProxy: boolean;
  isRead: boolean;
  createdAt: string;
}

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const [, setLocation] = useLocation();
  const matchId = params?.id;
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [screenshotAlert, setScreenshotAlert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: matchesAll = [] } = useQuery<any[]>({
    queryKey: ["/api/matches"],
    enabled: !!session?.user,
  });

  const matchData = matchesAll?.find((m: any) => m.id === matchId);
  const profile = matchData?.profile;

  const { data: messages = [], isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: [`/api/messages/${matchId}`],
    enabled: !!matchId && !!session?.user,
    refetchInterval: 3000,
  });

  const { data: screenshotSetting } = useQuery({
    queryKey: ["/api/settings/no-screenshot"],
    enabled: !!session?.user,
  });

  const noScreenshotActive = (screenshotSetting as any)?.enabled || profile?.noScreenshotMode || session?.profile?.noScreenshotMode;

  const sendMutation = useMutation({
    mutationFn: async (data: { matchId: string; content: string; isAiGenerated?: boolean }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
    },
  });

  const aiSuggestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/suggest", { matchId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.suggestion) setInput(data.suggestion);
      setAiMode(false);
    },
    onError: () => setAiMode(false),
  });

  const reportMutation = useMutation({
    mutationFn: async (data: { reportedUserId: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/report", data);
      return res.json();
    },
    onSuccess: () => { setShowReport(false); setReportReason(""); },
  });

  const screenshotAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/screenshot-alert", { matchId });
      return res.json();
    },
  });

  useEffect(() => {
    if (noScreenshotActive) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5"))) {
          e.preventDefault();
          screenshotAlertMutation.mutate();
          setScreenshotAlert("Screenshot attempt detected! The other user has been notified.");
          setTimeout(() => setScreenshotAlert(null), 4000);
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden" && noScreenshotActive) {
          screenshotAlertMutation.mutate();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [noScreenshotActive, matchId]);

  useEffect(() => {
    if (!checkingSession && !session?.user) setLocation("/");
  }, [checkingSession, session, setLocation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, aiMode]);

  if (checkingSession || !session?.user) {
    return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  const currentUserId = session.user.id;
  const otherUserId = matchData ? (matchData.userId === currentUserId ? matchData.targetUserId : matchData.userId) : null;
  const hasAiProxyMessages = messages.some(m => m.isAiProxy);
  const otherIsOnline = profile?.isOnline;
  const otherRespectScore = profile?.respectScore ?? 85;

  const handleSend = () => {
    if (!input.trim() || !matchId) return;
    sendMutation.mutate({ matchId, content: input, isAiGenerated: false });
    setInput("");
  };

  const handleAiSuggest = () => { aiSuggestMutation.mutate(); };

  const handleReport = () => {
    if (!otherUserId || !reportReason) return;
    reportMutation.mutate({ reportedUserId: otherUserId, reason: reportReason });
  };

  if (!matchId) return <div>Invalid chat</div>;

  const getRespectColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className={`h-full flex flex-col bg-neutral-50 ${noScreenshotActive ? "select-none" : ""}`}>
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 -ml-2" data-testid="button-back"><ArrowLeft size={20} /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border border-gray-100">
                <AvatarImage src={profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"} />
                <AvatarFallback>{profile?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-0 right-0 w-3 h-3 ${otherIsOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"} border-2 border-white rounded-full`}></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-heading font-bold text-sm" data-testid="text-chat-name">{profile?.name || "Match"}</h3>
                <ShieldCheck size={12} className="text-blue-500" />
                <div className={`w-2 h-2 rounded-full ${getRespectColor(otherRespectScore)}`} title={`Respect: ${otherRespectScore}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-medium ${otherIsOnline ? "text-green-600" : "text-gray-400"}`}>
                  {otherIsOnline ? "Online now" : "Offline"}
                </p>
                {profile?.intent && (
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500 font-medium">{profile.intent}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          {noScreenshotActive && (
            <div className="bg-red-50 px-2 py-1 rounded-full flex items-center gap-1" title="Screenshot protection active">
              <ShieldAlert size={12} className="text-red-500" />
            </div>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9"><Phone size={18} /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9"><Video size={18} /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9" onClick={() => setShowMenu(!showMenu)} data-testid="button-menu">
            <MoreVertical size={18} />
          </Button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-30 w-48">
              <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={() => { setShowReport(true); setShowMenu(false); }} data-testid="button-report-user">
                <Flag size={14} /> Report User
              </button>
            </div>
          )}
        </div>
      </header>

      {hasAiProxyMessages && (
        <div className="bg-purple-50 px-4 py-2 flex items-center gap-2 text-xs text-purple-700 border-b border-purple-100">
          <Bot size={14} />
          <span className="font-medium">Some replies may be AI-assisted (sent while user was offline)</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1" style={noScreenshotActive ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}>
        <div className="flex justify-center my-4">
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Start of conversation</span>
        </div>

        {loadingMessages ? (
          <div className="text-center text-muted-foreground animate-pulse py-4">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            const isNextSame = messages[index + 1]?.senderId === msg.senderId;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isNextSame ? "mb-1" : "mb-4"}`}
                data-testid={`message-${msg.id}`}
              >
                <div className={`max-w-[75%] px-4 py-3 shadow-sm text-sm relative group ${isMe ? "bg-brand-gradient text-white rounded-2xl rounded-tr-sm" : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"}`}>
                  {msg.content}
                  {msg.isAiProxy && (
                    <span className="inline-flex items-center gap-0.5 ml-1 opacity-70">
                      <Bot size={10} />
                    </span>
                  )}
                  {msg.isAiGenerated && !msg.isAiProxy && (
                    <Sparkles size={10} className="inline-block ml-1 opacity-60" />
                  )}
                  {isMe && (
                    <div className="absolute bottom-1 right-2 opacity-70">
                      <CheckCheck size={12} className={msg.isRead ? "text-white" : "text-white/50"} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.isAiProxy && (
                    <span className="text-[9px] text-purple-400 font-medium bg-purple-50 px-1.5 py-0.5 rounded-full">AI-assisted</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        <AnimatePresence>
          {aiMode && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="sticky bottom-2 mx-auto w-full max-w-[95%] z-20">
              <div className="bg-white/80 backdrop-blur-md border border-purple-200 rounded-2xl p-4 shadow-lg ring-1 ring-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-100 p-1.5 rounded-lg"><Sparkles size={14} className="text-purple-600" /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">AI Assistant</span>
                </div>
                <p className="text-sm text-gray-800 mb-4 font-medium leading-relaxed">
                  {aiSuggestMutation.isPending ? "Crafting the perfect message for you..." : "Let me suggest something thoughtful to say..."}
                </p>
                <div className="flex gap-3">
                  <Button data-testid="button-use-ai-suggestion" className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl flex-1 shadow-purple-200 shadow-md" onClick={handleAiSuggest} disabled={aiSuggestMutation.isPending}>
                    {aiSuggestMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" /> Generating...</> : "Generate Suggestion"}
                  </Button>
                  <Button variant="ghost" className="h-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl px-4" onClick={() => setAiMode(false)}>Dismiss</Button>
                </div>
                {aiSuggestMutation.isError && <p className="text-xs text-red-500 mt-2">Could not generate suggestion. Try again later.</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-3 border-t border-gray-100 flex items-end gap-2 pb-6 md:pb-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-gray-100 rounded-full h-10 w-10 shrink-0"><Paperclip size={20} /></Button>
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-[1.5rem] flex items-end min-h-[44px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Input data-testid="input-message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="border-0 bg-transparent focus-visible:ring-0 px-4 py-3 min-h-[44px] max-h-32 resize-none" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
          <Button variant="ghost" size="icon" className={`mr-1 mb-1 h-8 w-8 rounded-full transition-colors ${aiMode ? "bg-purple-100 text-purple-600" : "text-gray-400 hover:text-purple-600"}`} onClick={() => setAiMode(!aiMode)} data-testid="button-ai-toggle">
            <Sparkles size={18} />
          </Button>
        </div>
        <Button data-testid="button-send" size="icon" className={`h-11 w-11 rounded-full shadow-md shrink-0 transition-transform active:scale-95 ${input.trim() ? "bg-brand-gradient" : "bg-gray-200 text-gray-400"}`} onClick={handleSend} disabled={!input.trim() || sendMutation.isPending}>
          <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
        </Button>
      </div>

      <AnimatePresence>
        {screenshotAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-4 right-4 z-50">
            <div className="bg-red-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-lg mx-auto">
              <Camera size={20} />
              <span className="text-sm font-medium">{screenshotAlert}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4">
              <h3 className="text-lg font-heading font-bold text-center">Report User</h3>
              <p className="text-sm text-muted-foreground text-center">Why are you reporting {profile?.name || "this user"}?</p>
              <div className="space-y-2">
                {["Inappropriate behavior", "Fake profile", "Harassment", "Spam", "Other"].map((reason) => (
                  <button key={reason} onClick={() => setReportReason(reason)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${reportReason === reason ? "bg-red-50 border-red-200 border text-red-700" : "bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100"}`} data-testid={`button-report-reason-${reason.toLowerCase().replace(/\s/g, "-")}`}>
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowReport(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleReport} disabled={!reportReason || reportMutation.isPending} data-testid="button-submit-report">
                  {reportMutation.isPending ? "Reporting..." : "Submit Report"}
                </Button>
              </div>
              {reportMutation.isSuccess && <p className="text-green-600 text-sm text-center">Report submitted. Thank you for keeping Milaap safe.</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
