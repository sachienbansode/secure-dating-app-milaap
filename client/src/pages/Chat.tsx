import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles, MoreVertical, ShieldCheck, Phone, Video, Paperclip, CheckCheck, Flag, Loader2, Bot, ShieldAlert, Camera, Ban, Unlock, Clock, MessageCircle, Mic, Users, Archive, Trash2, Image, X, Eye, EyeOff, Play } from "lucide-react";
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
  isSystemMessage?: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  attachmentOriginalName?: string | null;
  isOneTimeView?: boolean;
  oneTimeViewed?: boolean;
  createdAt: string;
}

const DATE_READINESS_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  "Chat-only": { icon: MessageCircle, label: "Chat-only", color: "text-blue-400 bg-blue-900/20" },
  "Voice-ready": { icon: Mic, label: "Voice-ready", color: "text-green-400 bg-green-900/20" },
  "Meet-ready": { icon: Users, label: "Meet-ready", color: "text-blue-400 bg-blue-900/20" },
};

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
  const [cooldownAlert, setCooldownAlert] = useState<string | null>(null);
  const [phoneBlockedAlert, setPhoneBlockedAlert] = useState(false);
  const [showPhoneUnlock, setShowPhoneUnlock] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isOneTimeView, setIsOneTimeView] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [viewOnceMedia, setViewOnceMedia] = useState<{ url: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: matchesAll = [] } = useQuery<any[]>({
    queryKey: ["/api/matches"],
    enabled: !!session?.user,
  });

  const { data: appSettings } = useQuery<any>({
    queryKey: ["/api/app-settings"],
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

  const { data: phoneUnlockStatus } = useQuery<any>({
    queryKey: [`/api/phone-unlock/status/${matchId}`],
    enabled: !!matchId && !!session?.user && appSettings?.feature_no_phone_number,
    refetchInterval: 10000,
  });

  const { data: cooldownStatus } = useQuery<any>({
    queryKey: [`/api/chat/cooldown-status/${matchId}`],
    enabled: !!matchId && !!session?.user && appSettings?.feature_chat_cooldown,
    refetchInterval: 5000,
  });

  const noScreenshotActive = (screenshotSetting as any)?.enabled || profile?.noScreenshotMode || session?.profile?.noScreenshotMode;

  const sendMutation = useMutation({
    mutationFn: async (data: { matchId: string; content: string; isAiGenerated?: boolean }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
      if (appSettings?.feature_chat_cooldown && messages.filter(m => m.senderId === session?.user?.id && !m.isSystemMessage).length > 0 && messages.filter(m => m.senderId === session?.user?.id && !m.isSystemMessage).length % 5 === 4) {
        escalationMutation.mutate();
      }
    },
    onError: (err: any) => {
      if (err.cooldown) {
        setCooldownAlert(`Chat paused for ${err.minutesLeft} minute(s). Take a moment to reflect.`);
        setTimeout(() => setCooldownAlert(null), 5000);
      } else if (err.phoneBlocked) {
        setPhoneBlockedAlert(true);
        setTimeout(() => setPhoneBlockedAlert(false), 5000);
      }
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
    mutationFn: async (data: { reportedUserId: string; reason: string; matchId?: string }) => {
      const res = await apiRequest("POST", "/api/report-enhanced", data);
      return res.json();
    },
    onSuccess: () => { setShowReport(false); setReportReason(""); },
  });

  const blockMutation = useMutation({
    mutationFn: async (blockedUserId: string) => {
      const res = await apiRequest("POST", "/api/block", { blockedUserId });
      return res.json();
    },
    onSuccess: () => {
      setShowMenu(false);
      setLocation("/matches");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setLocation("/matches");
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/delete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setLocation("/matches");
    },
  });

  const screenshotAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/screenshot-alert", { matchId });
      return res.json();
    },
  });

  const escalationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/analyze-escalation", { matchId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.escalated) {
        setCooldownAlert(`Cool-down activated: ${data.reason}. Please wait ${data.cooldownMinutes} minutes.`);
        queryClient.invalidateQueries({ queryKey: [`/api/chat/cooldown-status/${matchId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
      }
    },
  });

  const phoneUnlockRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/phone-unlock/request", { matchId });
      return res.json();
    },
    onSuccess: () => {
      setShowPhoneUnlock(false);
      queryClient.invalidateQueries({ queryKey: [`/api/phone-unlock/status/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
    },
  });

  const phoneUnlockRespondMutation = useMutation({
    mutationFn: async (approve: boolean) => {
      const res = await apiRequest("POST", "/api/phone-unlock/respond", { matchId, approve });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/phone-unlock/status/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
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
  const otherDateReadiness = profile?.dateReadiness || "Chat-only";
  const readinessConfig = DATE_READINESS_CONFIG[otherDateReadiness] || DATE_READINESS_CONFIG["Chat-only"];
  const ReadinessIcon = readinessConfig.icon;

  const isChatCooledDown = cooldownStatus?.cooldown || cooldownStatus?.banned;
  const isChatBanned = cooldownStatus?.banned;

  const handleSend = () => {
    if (!input.trim() || !matchId || isChatCooledDown) return;
    sendMutation.mutate({ matchId, content: input, isAiGenerated: false });
    setInput("");
  };

  const handleAiSuggest = () => { aiSuggestMutation.mutate(); };

  const handleReport = () => {
    if (!otherUserId || !reportReason) return;
    reportMutation.mutate({ reportedUserId: otherUserId, reason: reportReason, matchId });
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setCooldownAlert("File too large. Maximum size is 5MB.");
      setTimeout(() => setCooldownAlert(null), 3000);
      return;
    }

    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const videoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if (!imageTypes.includes(file.type) && !videoTypes.includes(file.type)) {
      setCooldownAlert("Only image and video files are allowed.");
      setTimeout(() => setCooldownAlert(null), 3000);
      return;
    }

    setAttachmentFile(file);
    if (imageTypes.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview("video");
    }
  };

  const handleSendAttachment = async () => {
    if (!attachmentFile || !matchId) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("attachment", attachmentFile);
      formData.append("matchId", matchId);
      formData.append("isOneTimeView", String(isOneTimeView));

      const res = await fetch("/api/messages/attachment", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setCooldownAlert(err.message || "Failed to send attachment");
        setTimeout(() => setCooldownAlert(null), 3000);
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
      }
    } catch {
      setCooldownAlert("Failed to send attachment");
      setTimeout(() => setCooldownAlert(null), 3000);
    }
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setIsOneTimeView(false);
    setUploadingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleViewOnce = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/view-once`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.canView && data.url) {
        setViewOnceMedia({ url: data.url, type: data.type });
        queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
      } else if (!data.canView) {
        setCooldownAlert(data.message || "This attachment has already been viewed.");
        setTimeout(() => setCooldownAlert(null), 3000);
      }
    } catch {
      setCooldownAlert("Failed to load attachment");
      setTimeout(() => setCooldownAlert(null), 3000);
    }
  };

  if (!matchId) return <div>Invalid chat</div>;

  const getRespectColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-red-400";
    return "bg-red-500";
  };

  return (
    <div className={`h-full flex flex-col bg-background ${noScreenshotActive ? "select-none" : ""}`}>
      <header className="bg-card px-4 py-3 flex items-center justify-between border-b border-border shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 -ml-2" data-testid="button-back"><ArrowLeft size={20} /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"} />
                <AvatarFallback>{profile?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-0 right-0 w-3 h-3 ${otherIsOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground"} border-2 border-card rounded-full`}></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-heading font-bold text-sm" data-testid="text-chat-name">{profile?.name || "Match"}</h3>
                {profile?.photoVerifiedAt && (
                  <ShieldCheck size={12} className="text-blue-500" />
                )}
                <div className={`w-2 h-2 rounded-full ${getRespectColor(otherRespectScore)}`} title={`Respect: ${otherRespectScore}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-medium ${otherIsOnline ? "text-green-600" : "text-muted-foreground"}`}>
                  {otherIsOnline ? "Online now" : "Offline"}
                </p>
                {profile?.intent && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">{profile.intent}</span>
                )}
                {appSettings?.feature_date_readiness && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${readinessConfig.color}`} data-testid="badge-date-readiness">
                    <ReadinessIcon size={10} /> {readinessConfig.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          {noScreenshotActive && (
            <div className="bg-red-900/30 px-2 py-1 rounded-full flex items-center gap-1" title="Screenshot protection active">
              <ShieldAlert size={12} className="text-red-500" />
            </div>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9"><Phone size={18} /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9"><Video size={18} /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9" onClick={() => setShowMenu(!showMenu)} data-testid="button-menu">
            <MoreVertical size={18} />
          </Button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-30 w-52">
              <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2" onClick={() => { setShowReport(true); setShowMenu(false); }} data-testid="button-report-user">
                <Flag size={14} /> Report User
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 border-t border-border" onClick={() => { if (otherUserId) blockMutation.mutate(otherUserId); }} data-testid="button-block-user">
                <Ban size={14} /> Block User
              </button>
              {appSettings?.feature_no_phone_number && !phoneUnlockStatus?.unlocked && (
                <button className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:bg-blue-900/20 flex items-center gap-2 border-t border-border" onClick={() => { setShowPhoneUnlock(true); setShowMenu(false); }} data-testid="button-phone-unlock">
                  <Unlock size={14} /> Request Contact Sharing
                </button>
              )}
              <button className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:bg-blue-900/20 flex items-center gap-2 border-t border-border" onClick={() => { archiveMutation.mutate(); setShowMenu(false); }} data-testid="button-archive-chat">
                <Archive size={14} /> Archive Chat
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 border-t border-border" onClick={() => { deleteChatMutation.mutate(); setShowMenu(false); }} data-testid="button-delete-chat">
                <Trash2 size={14} /> Delete Chat
              </button>
            </div>
          )}
        </div>
      </header>

      {hasAiProxyMessages && (
        <div className="bg-blue-900/20 px-4 py-2 flex items-center gap-2 text-xs text-blue-400 border-b border-blue-900/30">
          <Bot size={14} />
          <span className="font-medium">Some replies may be AI-assisted (sent while user was offline)</span>
        </div>
      )}

      {isChatBanned && (
        <div className="bg-red-900/20 px-4 py-3 flex items-center gap-2 text-xs text-red-400 border-b border-red-900/30">
          <Ban size={14} />
          <span className="font-medium">Your chat privileges have been revoked due to repeated violations.</span>
        </div>
      )}

      {isChatCooledDown && !isChatBanned && (
        <div className="bg-red-900/10 px-4 py-3 flex items-center gap-2 text-xs text-red-300 border-b border-red-900/20">
          <Clock size={14} />
          <span className="font-medium">Cool-down active. {cooldownStatus?.minutesLeft} minute(s) remaining. Take a moment to reflect.</span>
        </div>
      )}

      {phoneUnlockStatus?.theirRequest?.status === "pending" && !phoneUnlockStatus?.myRequest && (
        <div className="bg-blue-900/20 px-4 py-3 flex items-center gap-2 text-xs text-blue-400 border-b border-blue-900/30">
          <Unlock size={14} />
          <span className="font-medium flex-1">{profile?.name} wants to share contact details.</span>
          <button className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold" onClick={() => phoneUnlockRespondMutation.mutate(true)} data-testid="button-approve-unlock">Approve</button>
          <button className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold ml-1" onClick={() => phoneUnlockRespondMutation.mutate(false)} data-testid="button-decline-unlock">Decline</button>
        </div>
      )}

      {phoneUnlockStatus?.unlocked && (
        <div className="bg-green-900/20 px-4 py-2 flex items-center gap-2 text-xs text-green-400 border-b border-green-900/30">
          <Unlock size={14} />
          <span className="font-medium">Contact sharing unlocked! You can now share phone numbers.</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1" style={noScreenshotActive ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}>
        <div className="flex justify-center my-4">
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full uppercase tracking-wider">Start of conversation</span>
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
            const isSystem = msg.isSystemMessage;

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3" data-testid={`message-system-${msg.id}`}>
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-4 py-2 rounded-full max-w-[80%] text-center">{msg.content}</span>
                </div>
              );
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isNextSame ? "mb-1" : "mb-4"}`}
                data-testid={`message-${msg.id}`}
              >
                <div className={`max-w-[75%] shadow-sm text-sm relative group ${msg.attachmentUrl && !msg.isOneTimeView ? "p-1" : "px-4 py-3"} ${isMe ? "bg-brand-gradient text-white rounded-2xl rounded-tr-sm" : "bg-card text-foreground rounded-2xl rounded-tl-sm border border-border"}`}>
                  {msg.attachmentUrl && !msg.isOneTimeView && (
                    <div className="mb-1">
                      {msg.attachmentType === "image" ? (
                        <img src={msg.attachmentUrl} alt="Shared image" className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer" onClick={() => window.open(msg.attachmentUrl!, "_blank")} data-testid={`attachment-image-${msg.id}`} />
                      ) : (
                        <video src={msg.attachmentUrl} controls className="rounded-xl max-w-full max-h-60" data-testid={`attachment-video-${msg.id}`} />
                      )}
                    </div>
                  )}
                  {msg.isOneTimeView && (
                    <div className="flex items-center gap-2">
                      {msg.oneTimeViewed && msg.senderId !== currentUserId ? (
                        <span className="flex items-center gap-1.5 text-xs opacity-70"><EyeOff size={14} /> Opened</span>
                      ) : (
                        <button
                          className={`flex items-center gap-1.5 text-xs font-medium ${isMe ? "text-white/90 hover:text-white" : "text-blue-400 hover:text-blue-300"}`}
                          onClick={() => handleViewOnce(msg.id)}
                          data-testid={`button-view-once-${msg.id}`}
                        >
                          {msg.senderId === currentUserId ? (
                            <><Eye size={14} /> {msg.attachmentType === "image" ? "📷" : "🎥"} View once {msg.oneTimeViewed ? "(Opened)" : ""}</>
                          ) : (
                            <><Eye size={14} /> Tap to view</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {!msg.attachmentUrl && msg.content}
                  {msg.attachmentUrl && !msg.isOneTimeView && (
                    <div className="px-3 pb-2 pt-1 text-xs opacity-80">{msg.content}</div>
                  )}
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
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.isAiProxy && (
                    <span className="text-[9px] text-blue-400 font-medium bg-blue-900/20 px-1.5 py-0.5 rounded-full">AI-assisted</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        <AnimatePresence>
          {aiMode && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="sticky bottom-2 mx-auto w-full max-w-[95%] z-20">
              <div className="bg-card/90 backdrop-blur-md border border-blue-800 rounded-2xl p-4 shadow-lg ring-1 ring-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-900/30 p-1.5 rounded-lg"><Sparkles size={14} className="text-blue-400" /></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">AI Assistant</span>
                </div>
                <p className="text-sm text-foreground mb-4 font-medium leading-relaxed">
                  {aiSuggestMutation.isPending ? "Crafting the perfect message for you..." : "Let me suggest something thoughtful to say..."}
                </p>
                <div className="flex gap-3">
                  <Button data-testid="button-use-ai-suggestion" className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex-1 shadow-blue-900/30 shadow-md" onClick={handleAiSuggest} disabled={aiSuggestMutation.isPending}>
                    {aiSuggestMutation.isPending ? <><Loader2 size={16} className="animate-spin mr-2" /> Generating...</> : "Generate Suggestion"}
                  </Button>
                  <Button variant="ghost" className="h-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl px-4" onClick={() => setAiMode(false)}>Dismiss</Button>
                </div>
                {aiSuggestMutation.isError && <p className="text-xs text-red-500 mt-2">Could not generate suggestion. Try again later.</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {attachmentPreview && (
        <div className="bg-card border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {attachmentPreview === "video" ? (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Play size={24} className="text-blue-400" />
                </div>
              ) : (
                <img src={attachmentPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover" />
              )}
              <button className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center" onClick={() => { setAttachmentFile(null); setAttachmentPreview(null); setIsOneTimeView(false); if (fileInputRef.current) fileInputRef.current.value = ""; }} data-testid="button-remove-attachment">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-medium truncate">{attachmentFile?.name}</p>
              <p className="text-[10px] text-muted-foreground">{attachmentFile ? (attachmentFile.size / 1024 / 1024).toFixed(2) + " MB" : ""}</p>
              <button
                className={`flex items-center gap-1 mt-1 text-[11px] font-medium transition-colors ${isOneTimeView ? "text-red-400" : "text-muted-foreground hover:text-blue-400"}`}
                onClick={() => setIsOneTimeView(!isOneTimeView)}
                data-testid="button-toggle-one-time"
              >
                {isOneTimeView ? <><EyeOff size={12} /> View once enabled</> : <><Eye size={12} /> Enable view once</>}
              </button>
            </div>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-brand-gradient shrink-0"
              onClick={handleSendAttachment}
              disabled={uploadingAttachment}
              data-testid="button-send-attachment"
            >
              {uploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card p-3 border-t border-border flex items-end gap-2 pb-6 md:pb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleAttachmentSelect}
          data-testid="input-attachment-file"
        />
        <Button
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:bg-muted hover:text-blue-400 rounded-full h-10 w-10 shrink-0 ${!appSettings?.feature_attachments ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => { if (appSettings?.feature_attachments !== false) fileInputRef.current?.click(); }}
          disabled={isChatCooledDown || appSettings?.feature_attachments === false}
          data-testid="button-attachment"
        >
          <Paperclip size={20} />
        </Button>
        <div className="flex-1 bg-background border border-border rounded-[1.5rem] flex items-end min-h-[44px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Input data-testid="input-message" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isChatCooledDown ? "Chat paused..." : "Type a message..."} className="border-0 bg-transparent focus-visible:ring-0 px-4 py-3 min-h-[44px] max-h-32 resize-none" onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={isChatCooledDown} />
          <Button variant="ghost" size="icon" className={`mr-1 mb-1 h-8 w-8 rounded-full transition-colors ${aiMode ? "bg-blue-900/30 text-blue-400" : "text-muted-foreground hover:text-blue-400"}`} onClick={() => setAiMode(!aiMode)} data-testid="button-ai-toggle" disabled={isChatCooledDown}>
            <Sparkles size={18} />
          </Button>
        </div>
        <Button data-testid="button-send" size="icon" className={`h-11 w-11 rounded-full shadow-md shrink-0 transition-transform active:scale-95 ${input.trim() && !isChatCooledDown ? "bg-brand-gradient" : "bg-muted text-muted-foreground"}`} onClick={handleSend} disabled={!input.trim() || sendMutation.isPending || isChatCooledDown}>
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
        {cooldownAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-4 right-4 z-50">
            <div className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-lg mx-auto">
              <Clock size={20} />
              <span className="text-sm font-medium">{cooldownAlert}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phoneBlockedAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-4 right-4 z-50">
            <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-lg mx-auto">
              <Phone size={20} />
              <span className="text-sm font-medium">Phone numbers and contact info are blocked. Use the menu to request contact sharing.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhoneUnlock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowPhoneUnlock(false); }}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4">
              <h3 className="text-lg font-heading font-bold text-center text-foreground">Request Contact Sharing</h3>
              <div className="bg-blue-900/20 rounded-xl p-4 text-sm text-blue-400 space-y-2">
                <p className="font-medium">How it works:</p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-blue-300">
                  <li>Both users must agree to share contact info</li>
                  <li>A 24-hour cool-off period applies after mutual consent</li>
                  <li>Only then can you share phone numbers in chat</li>
                </ul>
              </div>
              {phoneUnlockStatus?.myRequest?.status === "pending" && (
                <p className="text-red-400 text-sm text-center font-medium">Your request is pending approval.</p>
              )}
              {phoneUnlockStatus?.myRequest?.status === "approved" && !phoneUnlockStatus?.unlocked && (
                <p className="text-green-600 text-sm text-center font-medium">Approved! Waiting for 24-hour cool-off to complete.</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowPhoneUnlock(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => phoneUnlockRequestMutation.mutate()} disabled={phoneUnlockRequestMutation.isPending || !!phoneUnlockStatus?.myRequest} data-testid="button-send-unlock-request">
                  {phoneUnlockRequestMutation.isPending ? "Sending..." : phoneUnlockStatus?.myRequest ? "Already Requested" : "Send Request"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4">
              <h3 className="text-lg font-heading font-bold text-center text-foreground">Report & Block User</h3>
              <p className="text-sm text-muted-foreground text-center">Why are you reporting {profile?.name || "this user"}?</p>
              {appSettings?.feature_enhanced_report && (
                <p className="text-xs text-blue-400 text-center bg-blue-900/20 px-3 py-2 rounded-lg">AI will analyze the chat history for evidence-based review.</p>
              )}
              <div className="space-y-2">
                {["Inappropriate behavior", "Fake profile", "Harassment", "Spam", "Threatening messages", "Other"].map((reason) => (
                  <button key={reason} onClick={() => setReportReason(reason)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${reportReason === reason ? "bg-red-900/30 border-red-800 border text-red-400" : "bg-muted border border-border text-foreground hover:bg-muted/80"}`} data-testid={`button-report-reason-${reason.toLowerCase().replace(/\s/g, "-")}`}>
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowReport(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleReport} disabled={!reportReason || reportMutation.isPending} data-testid="button-submit-report">
                  {reportMutation.isPending ? "Reporting..." : "Report & Block"}
                </Button>
              </div>
              {reportMutation.isSuccess && <p className="text-green-600 text-sm text-center">Report submitted. The user has been blocked and action will be taken.</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewOnceMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setViewOnceMedia(null)}
          >
            <button className="absolute top-4 right-4 bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center z-10" data-testid="button-close-view-once">
              <X size={24} />
            </button>
            <p className="absolute top-4 left-4 text-white/60 text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <EyeOff size={12} /> View once
            </p>
            {viewOnceMedia.type === "image" ? (
              <img src={viewOnceMedia.url} alt="View once" className="max-w-full max-h-full object-contain" />
            ) : (
              <video src={viewOnceMedia.url} controls autoPlay className="max-w-full max-h-full" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
