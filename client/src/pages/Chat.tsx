import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles, MoreVertical, ShieldCheck, Phone, Paperclip, CheckCheck, Flag, Loader2, Bot, ShieldAlert, Camera, Ban, Unlock, Clock, MessageCircle, Mic, Users, Archive, Trash2, Image, X, Eye, EyeOff, Play, Mail, MapPin, Navigation, Share2, Coffee, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe } from "@/lib/auth";

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[style]);
  }
};

const FESTIVAL_CARDS: { name: string; emoji: string; greeting: string; colors: [string, string] }[] = [
  { name: "Diwali", emoji: "🪔", greeting: "Happy Diwali! May this festival of lights brighten your life with joy and love!", colors: ["#F59E0B", "#DC2626"] },
  { name: "Holi", emoji: "🎨", greeting: "Happy Holi! May your life be as colorful and vibrant as this beautiful festival!", colors: ["#EC4899", "#8B5CF6"] },
  { name: "Eid", emoji: "🌙", greeting: "Eid Mubarak! Wishing you peace, happiness, and blessings on this special day!", colors: ["#10B981", "#065F46"] },
  { name: "Navratri", emoji: "🔱", greeting: "Happy Navratri! May Maa Durga bless you with strength and happiness!", colors: ["#EF4444", "#F97316"] },
  { name: "Christmas", emoji: "🎄", greeting: "Merry Christmas! Wishing you love, joy, and magical moments this holiday!", colors: ["#DC2626", "#166534"] },
  { name: "Ganesh Chaturthi", emoji: "🐘", greeting: "Ganpati Bappa Morya! May Lord Ganesha remove all obstacles from your path!", colors: ["#F97316", "#EAB308"] },
  { name: "Onam", emoji: "🌸", greeting: "Happy Onam! May King Mahabali bring prosperity and joy to your life!", colors: ["#EAB308", "#16A34A"] },
  { name: "Pongal", emoji: "🌾", greeting: "Happy Pongal! Wishing you a harvest of love, happiness, and sweet moments!", colors: ["#F97316", "#84CC16"] },
  { name: "Baisakhi", emoji: "🌻", greeting: "Happy Baisakhi! May this new year bring abundance and joy to your life!", colors: ["#EAB308", "#F97316"] },
  { name: "Durga Puja", emoji: "🙏", greeting: "Shubho Bijoya! May Maa Durga's blessings fill your life with love and light!", colors: ["#DC2626", "#EAB308"] },
  { name: "Raksha Bandhan", emoji: "🧵", greeting: "Happy Raksha Bandhan! Celebrating the beautiful bond of love and protection!", colors: ["#8B5CF6", "#EC4899"] },
  { name: "Makar Sankranti", emoji: "🪁", greeting: "Happy Makar Sankranti! May your life soar high like a kite with joy!", colors: ["#3B82F6", "#06B6D4"] },
];

function isFestivalCard(content: string): { isFestival: boolean; festival?: typeof FESTIVAL_CARDS[0] } {
  const match = content.match(/^\[FESTIVAL_CARD:(.+?)\]$/);
  if (!match) return { isFestival: false };
  const card = FESTIVAL_CARDS.find(f => f.name === match[1]);
  return card ? { isFestival: true, festival: card } : { isFestival: false };
}

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
  const [showContactShare, setShowContactShare] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);
  const [shareEmail, setShareEmail] = useState(false);
  const [showLocationShare, setShowLocationShare] = useState(false);
  const [showFestivalCards, setShowFestivalCards] = useState(false);
  const [sharingLiveLocation, setSharingLiveLocation] = useState(false);
  const [liveLocationId, setLiveLocationId] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const liveLocationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: matchDetail } = useQuery<any>({
    queryKey: [`/api/match-detail/${matchId}`],
    enabled: !!matchId && !!session?.user,
    refetchInterval: 15000,
  });

  const { data: appSettings } = useQuery<any>({
    queryKey: ["/api/app-settings"],
    enabled: !!session?.user,
  });

  const matchData = matchDetail;
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

  const { data: contactShareStatus } = useQuery<any>({
    queryKey: [`/api/contact-share/${matchId}`],
    enabled: !!matchId && !!session?.user,
    refetchInterval: 10000,
  });

  const { data: locationShareData } = useQuery<any>({
    queryKey: [`/api/location-share/${matchId}`],
    enabled: !!matchId && !!session?.user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!matchId || !session?.user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/typing/${matchId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setOtherTyping(data.typing);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [matchId, session?.user]);

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

  const contactShareMutation = useMutation({
    mutationFn: async (data: { sharePhone: boolean; shareEmail: boolean }) => {
      const res = await apiRequest("POST", "/api/contact-share", { matchId, ...data });
      return res.json();
    },
    onSuccess: () => {
      setShowContactShare(false);
      queryClient.invalidateQueries({ queryKey: [`/api/contact-share/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
    },
  });

  const contactShareUpdateMutation = useMutation({
    mutationFn: async (data: { sharePhone: boolean; shareEmail: boolean }) => {
      const res = await apiRequest("POST", "/api/contact-share/update", { matchId, ...data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contact-share/${matchId}`] });
    },
  });

  const locationShareMutation = useMutation({
    mutationFn: async (data: { latitude: number; longitude: number; isLive: boolean }) => {
      const res = await apiRequest("POST", "/api/location-share", { matchId, ...data });
      return res.json();
    },
    onSuccess: (data) => {
      setShowLocationShare(false);
      if (data.location?.isLive) {
        setSharingLiveLocation(true);
        setLiveLocationId(data.location.id);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/location-share/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
    },
  });

  const locationUpdateMutation = useMutation({
    mutationFn: async (data: { locationShareId: string; latitude: number; longitude: number }) => {
      const res = await apiRequest("POST", "/api/location-share/update", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/location-share/${matchId}`] });
    },
  });

  const stopLocationMutation = useMutation({
    mutationFn: async (locationShareId: string) => {
      const res = await apiRequest("POST", "/api/location-share/stop", { locationShareId });
      return res.json();
    },
    onSuccess: () => {
      setSharingLiveLocation(false);
      setLiveLocationId(null);
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
      }
      queryClient.invalidateQueries({ queryKey: [`/api/location-share/${matchId}`] });
    },
  });

  const { data: chaiDateStatus } = useQuery<any>({
    queryKey: [`/api/chai-date/match/${matchId}`],
    enabled: !!matchId,
    refetchInterval: 5000,
  });

  const chaiDateRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chai-date/request", { matchId });
      return res.json();
    },
    onSuccess: () => {
      triggerHaptic("medium");
      queryClient.invalidateQueries({ queryKey: [`/api/chai-date/match/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
    },
  });

  const chaiDateRespondMutation = useMutation({
    mutationFn: async ({ chaiDateId, action }: { chaiDateId: string; action: string }) => {
      const res = await apiRequest("POST", `/api/chai-date/${chaiDateId}/respond`, { action });
      return res.json();
    },
    onSuccess: (data) => {
      triggerHaptic("heavy");
      queryClient.invalidateQueries({ queryKey: [`/api/chai-date/match/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
      if (data?.status === "active") {
        setLocation(`/chai-date/${data.id}`);
      }
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

  useEffect(() => {
    if (contactShareStatus?.myShare) {
      setSharePhone(!!contactShareStatus.myShare.sharePhone);
      setShareEmail(!!contactShareStatus.myShare.shareEmail);
    }
  }, [contactShareStatus?.myShare]);

  useEffect(() => {
    return () => {
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
      }
    };
  }, []);

  if (checkingSession || !session?.user) {
    return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  const currentUserId = session.user.id;
  const otherUserId = matchData?.otherUserId || (matchData ? (matchData.userId === currentUserId ? matchData.targetUserId : matchData.userId) : null);
  const hasAiProxyMessages = messages.some(m => m.isAiProxy);
  const otherIsOnline = profile?.isOnline;
  const otherRespectScore = profile?.respectScore ?? 85;
  const otherDateReadiness = profile?.dateReadiness || "Chat-only";
  const readinessConfig = DATE_READINESS_CONFIG[otherDateReadiness] || DATE_READINESS_CONFIG["Chat-only"];
  const ReadinessIcon = readinessConfig.icon;

  const isChatCooledDown = cooldownStatus?.cooldown || cooldownStatus?.banned;
  const isChatBanned = cooldownStatus?.banned;

  const handleShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationShareMutation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isLive: false,
        });
      },
      () => alert("Unable to get your location. Please enable location access."),
      { enableHighAccuracy: true }
    );
  };

  const handleShareLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationShareMutation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isLive: true,
        });
      },
      () => alert("Unable to get your location. Please enable location access."),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (sharingLiveLocation && liveLocationId) {
      liveLocationIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            locationUpdateMutation.mutate({
              locationShareId: liveLocationId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }, 30000);
    }
    return () => {
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
      }
    };
  }, [sharingLiveLocation, liveLocationId]);

  const theirLocations = locationShareData?.locations?.filter((l: any) => l.sharerUserId !== session?.user?.id) || [];
  const myLiveLocations = locationShareData?.locations?.filter((l: any) => l.sharerUserId === session?.user?.id && l.isLive) || [];

  const handleSend = () => {
    if (!input.trim() || !matchId || isChatCooledDown) return;
    triggerHaptic("light");
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
    const audioTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"];
    if (!imageTypes.includes(file.type) && !videoTypes.includes(file.type) && !audioTypes.includes(file.type)) {
      setCooldownAlert("Only image, video, and audio files are allowed.");
      setTimeout(() => setCooldownAlert(null), 3000);
      return;
    }

    setAttachmentFile(file);
    if (imageTypes.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else if (audioTypes.includes(file.type)) {
      setAttachmentPreview("audio");
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
      <header className="bg-card px-3 py-2.5 flex items-center gap-2 border-b border-border shadow-sm z-10">
        <Link href="/matches">
          <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 shrink-0" data-testid="button-back"><ArrowLeft size={18} /></Button>
        </Link>
        <Link href={otherUserId ? `/view-profile/${otherUserId}` : "#"} className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src={profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"} />
              <AvatarFallback>{profile?.name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${otherIsOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground"} border-2 border-card rounded-full`}></div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-heading font-bold text-sm truncate" data-testid="text-chat-name">{profile?.name || "Match"}</h3>
              {(profile?.isVerified || profile?.photoVerifiedAt) && <ShieldCheck size={11} className="text-blue-500 shrink-0" />}
              <div className={`w-2 h-2 rounded-full shrink-0 ${getRespectColor(otherRespectScore)}`} title={`Respect: ${otherRespectScore}`} />
            </div>
            <p className={`text-[11px] font-medium ${otherIsOnline ? "text-green-500" : "text-muted-foreground"}`}>
              {otherIsOnline ? "Online" : "Offline"}
              {profile?.intent && <span className="text-muted-foreground"> · {profile.intent}</span>}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-0.5 shrink-0">
          {noScreenshotActive && (
            <div className="bg-red-900/30 p-1.5 rounded-full" title="Screenshot protection active">
              <ShieldAlert size={12} className="text-red-500" />
            </div>
          )}
          {appSettings?.feature_date_readiness && (
            <div className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-0.5 ${readinessConfig.color}`} data-testid="badge-date-readiness">
              <ReadinessIcon size={10} /> {readinessConfig.label}
            </div>
          )}
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-8 h-8" onClick={() => setShowMenu(!showMenu)} data-testid="button-menu">
              <MoreVertical size={18} />
            </Button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30 w-56">
                  <Link href={otherUserId ? `/view-profile/${otherUserId}` : "#"} onClick={() => setShowMenu(false)}>
                    <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" data-testid="button-view-profile">
                      <Eye size={15} className="text-blue-400" /> View Profile
                    </button>
                  </Link>
                  <div className="h-px bg-border mx-3" />
                  <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" onClick={() => { setShowContactShare(true); setShowMenu(false); }} data-testid="button-contact-share">
                    <Share2 size={15} className="text-blue-400" /> Share Contact Info
                  </button>
                  <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" onClick={() => { setShowLocationShare(true); setShowMenu(false); }} data-testid="button-location-share">
                    <MapPin size={15} className="text-green-400" /> Share Location
                  </button>
                  <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" onClick={() => { setShowFestivalCards(true); setShowMenu(false); }} data-testid="button-festival-cards">
                    <span className="text-base">🎉</span> Send Festival Greeting
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5"
                    onClick={() => { chaiDateRequestMutation.mutate(); setShowMenu(false); }}
                    disabled={!!chaiDateStatus?.pending || !!chaiDateStatus?.active || chaiDateRequestMutation.isPending}
                    data-testid="button-chai-date"
                  >
                    <Coffee size={15} className="text-amber-500" /> Chai Date ☕
                    {(chaiDateStatus?.pending || chaiDateStatus?.active) && <span className="text-xs text-amber-400 ml-auto">Active</span>}
                  </button>
                  {appSettings?.feature_no_phone_number && !phoneUnlockStatus?.unlocked && (
                    <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" onClick={() => { setShowPhoneUnlock(true); setShowMenu(false); }} data-testid="button-phone-unlock">
                      <Unlock size={15} className="text-blue-400" /> Request Contact Sharing
                    </button>
                  )}
                  <div className="h-px bg-border mx-3" />
                  <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" onClick={() => { archiveMutation.mutate(); setShowMenu(false); }} data-testid="button-archive-chat">
                    <Archive size={15} className="text-muted-foreground" /> Archive Chat
                  </button>
                  <button className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted flex items-center gap-2.5" onClick={() => { deleteChatMutation.mutate(); setShowMenu(false); }} data-testid="button-delete-chat">
                    <Trash2 size={15} className="text-red-400" /> Delete Chat
                  </button>
                  <div className="h-px bg-border mx-3" />
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/10 flex items-center gap-2.5" onClick={() => { setShowReport(true); setShowMenu(false); }} data-testid="button-report-user">
                    <Flag size={15} /> Report User
                  </button>
                  <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/10 flex items-center gap-2.5" onClick={() => { if (otherUserId) blockMutation.mutate(otherUserId); }} data-testid="button-block-user">
                    <Ban size={15} /> Block User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {messages.some(m => m.isAiProxy && m.senderId === currentUserId) && (
        <div className="bg-blue-900/20 px-4 py-2 flex items-center gap-2 text-xs text-blue-400 border-b border-blue-900/30">
          <Bot size={14} />
          <span className="font-medium">Your AI proxy sent replies on your behalf while you were offline. Look for the blue "Sent by AI" labels below.</span>
        </div>
      )}
      {messages.some(m => m.isAiProxy && m.senderId !== currentUserId) && (
        <div className="bg-blue-900/10 px-4 py-2 flex items-center gap-2 text-xs text-blue-400/70 border-b border-blue-900/20">
          <Bot size={14} />
          <span className="font-medium">Some replies from your match may be AI-assisted</span>
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
          <span className="font-medium flex-1">Your match wants to share contact details.</span>
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

      {contactShareStatus?.theirSharedData && (contactShareStatus.theirSharedData.phone || contactShareStatus.theirSharedData.email) && (
        <div className="bg-blue-900/20 px-4 py-3 border-b border-blue-900/30 space-y-1.5" data-testid="shared-contact-card">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
            <Share2 size={12} />
            Match's shared contact info
          </div>
          {contactShareStatus.theirSharedData.phone && (
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-green-400" />
              <a href={`tel:${contactShareStatus.theirSharedData.phone}`} className="text-xs text-green-400 font-medium hover:underline" data-testid="text-shared-phone">{contactShareStatus.theirSharedData.phone}</a>
            </div>
          )}
          {contactShareStatus.theirSharedData.email && (
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-blue-400" />
              <a href={`mailto:${contactShareStatus.theirSharedData.email}`} className="text-xs text-blue-400 font-medium hover:underline" data-testid="text-shared-email">{contactShareStatus.theirSharedData.email}</a>
            </div>
          )}
        </div>
      )}

      {theirLocations.length > 0 && (
        <div className="bg-green-900/20 px-4 py-3 border-b border-green-900/30 space-y-2" data-testid="shared-location-card">
          <div className="flex items-center gap-2 text-xs font-bold text-green-300">
            <MapPin size={12} />
            Match's shared location
          </div>
          {theirLocations.map((loc: any) => {
            const isExpired = loc.isLive && loc.expiresAt && new Date(loc.expiresAt) < new Date();
            if (isExpired) return null;
            const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
            const minutesLeft = loc.isLive && loc.expiresAt ? Math.max(0, Math.round((new Date(loc.expiresAt).getTime() - Date.now()) / 60000)) : null;
            return (
              <div key={loc.id} className="flex items-center gap-2">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-400 font-medium hover:underline" data-testid={`link-location-${loc.id}`}>
                  <Navigation size={10} />
                  View on Maps
                </a>
                {loc.isLive && (
                  <span className="flex items-center gap-1 text-[10px] text-green-300 bg-green-900/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live {minutesLeft !== null ? `(${minutesLeft}m left)` : ""}
                  </span>
                )}
                {!loc.isLive && (
                  <span className="text-[10px] text-muted-foreground">Current location</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(sharingLiveLocation || myLiveLocations.length > 0) && (
        <div className="bg-green-900/10 px-4 py-2 flex items-center gap-2 text-xs text-green-400 border-b border-green-900/20">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-medium flex-1">You are sharing live location</span>
          <button
            className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-red-500/30"
            onClick={() => { const id = liveLocationId || myLiveLocations[0]?.id; if (id) stopLocationMutation.mutate(id); }}
            data-testid="button-stop-live-location"
          >
            Stop
          </button>
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
              const chaiRequestMatch = msg.content.match(/^\[CHAI_DATE_REQUEST:(.+?)\]$/);
              const chaiAcceptedMatch = msg.content.match(/^\[CHAI_DATE_ACCEPTED:(.+?)\]$/);
              const chaiDeclinedMatch = msg.content.match(/^\[CHAI_DATE_DECLINED:(.+?)\]$/);
              const chaiEndedMatch = msg.content.match(/^\[CHAI_DATE_ENDED:(.+?)\]$/);

              if (chaiRequestMatch) {
                const cdId = chaiRequestMatch[1];
                const isRequester = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className="flex justify-center my-4" data-testid={`message-chai-request-${msg.id}`}>
                    <div
                      className="rounded-2xl p-4 max-w-[85%] text-center cursor-pointer"
                      style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(220,38,38,0.1))", border: "1px solid rgba(245,158,11,0.3)" }}
                      onClick={() => {
                        if (chaiDateStatus?.active?.id === cdId) setLocation(`/chai-date/${cdId}`);
                      }}
                    >
                      <div className="text-3xl mb-2">☕</div>
                      <p className="text-amber-400 font-bold text-sm mb-1">
                        {isRequester ? "You invited for a Chai Date!" : "You're invited for a Chai Date!"}
                      </p>
                      <p className="text-gray-400 text-xs mb-3">5-minute timed virtual meetup with icebreakers</p>
                      {!isRequester && chaiDateStatus?.pending?.id === cdId && (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); chaiDateRespondMutation.mutate({ chaiDateId: cdId, action: "accept" }); }}
                            className="px-4 py-2 rounded-xl text-white text-xs font-bold"
                            style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                            data-testid="button-accept-chai-date"
                          >
                            <Check size={14} className="inline mr-1" /> Accept
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); chaiDateRespondMutation.mutate({ chaiDateId: cdId, action: "decline" }); }}
                            className="px-4 py-2 rounded-xl text-white text-xs font-bold bg-gray-700"
                            data-testid="button-decline-chai-date"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {chaiDateStatus?.active?.id === cdId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setLocation(`/chai-date/${cdId}`); }}
                          className="px-5 py-2 rounded-xl text-white text-xs font-bold mt-2"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)" }}
                          data-testid="button-join-chai-date-from-request"
                        >
                          <Coffee size={14} className="inline mr-1" /> Join Chai Date
                        </button>
                      )}
                      {isRequester && !chaiDateStatus?.active && <span className="text-xs text-gray-500">Waiting for response...</span>}
                    </div>
                  </div>
                );
              }

              if (chaiAcceptedMatch) {
                const cdId = chaiAcceptedMatch[1];
                return (
                  <div key={msg.id} className="flex justify-center my-4" data-testid={`message-chai-accepted-${msg.id}`}>
                    <div className="rounded-2xl p-4 max-w-[85%] text-center" style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.15), rgba(245,158,11,0.1))", border: "1px solid rgba(22,163,74,0.3)" }}>
                      <div className="text-3xl mb-2">☕✨</div>
                      <p className="text-green-400 font-bold text-sm mb-2">Chai Date Accepted!</p>
                      <button
                        onClick={() => setLocation(`/chai-date/${cdId}`)}
                        className="px-5 py-2 rounded-xl text-white text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #dc2626)" }}
                        data-testid="button-join-chai-date"
                      >
                        <Coffee size={14} className="inline mr-1" /> Join Chai Date
                      </button>
                    </div>
                  </div>
                );
              }

              if (chaiDeclinedMatch) {
                return (
                  <div key={msg.id} className="flex justify-center my-3" data-testid={`message-chai-declined-${msg.id}`}>
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-800/50 px-4 py-2 rounded-full">☕ Chai Date invitation was declined</span>
                  </div>
                );
              }

              if (chaiEndedMatch) {
                return (
                  <div key={msg.id} className="flex justify-center my-3" data-testid={`message-chai-ended-${msg.id}`}>
                    <span className="text-[11px] font-medium text-amber-500/70 bg-amber-900/20 px-4 py-2 rounded-full">☕ Chai Date has ended</span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex justify-center my-3" data-testid={`message-system-${msg.id}`}>
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-4 py-2 rounded-full max-w-[80%] text-center">{msg.content}</span>
                </div>
              );
            }

            const festivalCheck = isFestivalCard(msg.content);

            if (festivalCheck.isFestival && festivalCheck.festival) {
              const fc = festivalCheck.festival;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-4`}
                  data-testid={`message-festival-${msg.id}`}
                >
                  <div className="w-64 rounded-2xl overflow-hidden shadow-lg border border-white/10" style={{ background: `linear-gradient(135deg, ${fc.colors[0]}, ${fc.colors[1]})` }}>
                    <div className="p-4 text-center">
                      <div className="text-4xl mb-2">{fc.emoji}</div>
                      <h4 className="text-white font-bold text-lg mb-1">Happy {fc.name}!</h4>
                      <p className="text-white/90 text-xs leading-relaxed">{fc.greeting}</p>
                      <div className="mt-3 flex justify-center gap-1">
                        {["✨", fc.emoji, "✨"].map((e, i) => (
                          <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>{e}</span>
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-1.5 bg-black/20 flex items-center justify-between">
                      <span className="text-white/60 text-[10px]">{isMe ? "You sent a greeting" : "Sent you a greeting"}</span>
                      <span className="text-white/50 text-[10px]">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  </div>
                </motion.div>
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
                      ) : msg.attachmentType === "audio" ? (
                        <audio controls src={msg.attachmentUrl} className="max-w-[250px] mt-1" data-testid={`audio-attachment-${msg.id}`} />
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
                            <><Eye size={14} /> {msg.attachmentType === "image" ? "📷" : msg.attachmentType === "audio" ? "🎵" : "🎥"} View once {msg.oneTimeViewed ? "(Opened)" : ""}</>
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
                  {msg.isAiGenerated && !msg.isAiProxy && (
                    <Sparkles size={10} className="inline-block ml-1 opacity-60" />
                  )}
                  {isMe && !msg.isAiProxy && (
                    <div className="absolute bottom-1 right-2 opacity-70">
                      <CheckCheck size={12} className={msg.isRead ? "text-white" : "text-white/50"} />
                    </div>
                  )}
                </div>
                {msg.isAiProxy && isMe && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border-t border-blue-500/20 rounded-b-2xl rounded-br-sm" data-testid={`proxy-label-${msg.id}`}>
                    <Bot size={12} className="text-blue-400" />
                    <span className="text-[10px] text-blue-400 font-medium">Sent by AI on your behalf</span>
                  </div>
                )}
                {msg.isAiProxy && !isMe && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/5 border-t border-blue-500/10 rounded-b-2xl rounded-bl-sm">
                    <Bot size={10} className="text-blue-400/70" />
                    <span className="text-[9px] text-blue-400/70">AI-assisted</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.isAiProxy && isMe && (
                    <span className="text-[9px] text-blue-400 font-medium bg-blue-900/20 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Bot size={8} /> AI Proxy</span>
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

        {otherTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2"
          >
            <div className="bg-card rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs text-gray-400 ml-2">typing...</span>
            </div>
          </motion.div>
        )}
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
              ) : attachmentPreview === "audio" ? (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Mic size={24} className="text-green-400" />
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
          accept="image/*,video/*,audio/*"
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
          <Input data-testid="input-message" value={input} onChange={(e) => {
            setInput(e.target.value);
            if (matchId && !typingTimeoutRef.current) {
              fetch("/api/typing", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ matchId }) }).catch(() => {});
              typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 3000);
            }
          }} placeholder={isChatCooledDown ? "Chat paused..." : "Type a message..."} className="border-0 bg-transparent focus-visible:ring-0 px-4 py-3 min-h-[44px] max-h-32 resize-none" onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={isChatCooledDown} />
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
                  <li>Once both agree, contact sharing unlocks immediately</li>
                  <li>Shared contact info stays visible until you choose to hide it</li>
                </ul>
              </div>
              {phoneUnlockStatus?.myRequest?.status === "pending" && !phoneUnlockStatus?.canReRequest && (
                <p className="text-amber-400 text-sm text-center font-medium">Your request is pending approval.</p>
              )}
              {phoneUnlockStatus?.myRequest?.status === "pending" && phoneUnlockStatus?.canReRequest && (
                <p className="text-blue-400 text-sm text-center font-medium">No response yet. You can send a reminder since they are online.</p>
              )}
              {phoneUnlockStatus?.myRequest?.status === "approved" && phoneUnlockStatus?.unlocked && (
                <p className="text-green-500 text-sm text-center font-medium">Contact sharing is unlocked! Use the share contact option from the menu.</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowPhoneUnlock(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => phoneUnlockRequestMutation.mutate()} disabled={phoneUnlockRequestMutation.isPending || (!!phoneUnlockStatus?.myRequest && !phoneUnlockStatus?.canReRequest)} data-testid="button-send-unlock-request">
                  {phoneUnlockRequestMutation.isPending ? "Sending..." : phoneUnlockStatus?.canReRequest ? "Send Reminder" : phoneUnlockStatus?.myRequest ? "Already Requested" : "Send Request"}
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
              <p className="text-sm text-muted-foreground text-center">Why are you reporting this user?</p>
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

      <AnimatePresence>
        {showContactShare && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowContactShare(false); }}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4">
              <h3 className="text-lg font-heading font-bold text-center text-foreground">Share Contact Info</h3>
              <p className="text-sm text-muted-foreground text-center">Choose what you want to share with your match</p>

              <div className="space-y-3">
                <button
                  onClick={() => setSharePhone(!sharePhone)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${sharePhone ? "bg-green-900/20 border-green-700 text-green-400" : "bg-muted border-border text-foreground hover:bg-muted/80"}`}
                  data-testid="toggle-share-phone"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sharePhone ? "bg-green-900/30" : "bg-muted"}`}>
                    <Phone size={18} className={sharePhone ? "text-green-400" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">Mobile Number</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.phone || "Not set"}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${sharePhone ? "border-green-400 bg-green-400" : "border-muted-foreground"}`}>
                    {sharePhone && <CheckCheck size={14} className="text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => setShareEmail(!shareEmail)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${shareEmail ? "bg-blue-900/20 border-blue-700 text-blue-400" : "bg-muted border-border text-foreground hover:bg-muted/80"}`}
                  data-testid="toggle-share-email"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${shareEmail ? "bg-blue-900/30" : "bg-muted"}`}>
                    <Mail size={18} className={shareEmail ? "text-blue-400" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">Email Address</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email || "Not set"}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${shareEmail ? "border-blue-400 bg-blue-400" : "border-muted-foreground"}`}>
                    {shareEmail && <CheckCheck size={14} className="text-white" />}
                  </div>
                </button>
              </div>

              {contactShareStatus?.myShare && (
                <p className="text-xs text-muted-foreground text-center">
                  {[contactShareStatus.myShare.sharePhone && "Mobile", contactShareStatus.myShare.shareEmail && "Email"].filter(Boolean).length > 0
                    ? `Currently sharing: ${[contactShareStatus.myShare.sharePhone && "Mobile", contactShareStatus.myShare.shareEmail && "Email"].filter(Boolean).join(", ")}`
                    : "Not sharing anything. Toggle options above to share again."}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowContactShare(false)}>Cancel</Button>
                <Button
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    if (contactShareStatus?.myShare) {
                      contactShareUpdateMutation.mutate({ sharePhone, shareEmail });
                    } else {
                      contactShareMutation.mutate({ sharePhone, shareEmail });
                    }
                    setShowContactShare(false);
                  }}
                  disabled={!contactShareStatus?.myShare && !sharePhone && !shareEmail}
                  data-testid="button-confirm-contact-share"
                >
                  {contactShareStatus?.myShare ? (!sharePhone && !shareEmail ? "Hide My Contact" : "Update Sharing") : "Share Now"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLocationShare && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowLocationShare(false); }}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4">
              <h3 className="text-lg font-heading font-bold text-center text-foreground">Share Location</h3>
              <p className="text-sm text-muted-foreground text-center">Share your location with your match</p>

              <div className="space-y-3">
                <button
                  onClick={() => { handleShareCurrentLocation(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-muted hover:bg-muted/80 transition-all"
                  disabled={locationShareMutation.isPending}
                  data-testid="button-share-current-location"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center">
                    <MapPin size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-foreground">Current Location</p>
                    <p className="text-xs text-muted-foreground">Share your location once</p>
                  </div>
                </button>

                <button
                  onClick={() => { handleShareLiveLocation(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-muted hover:bg-muted/80 transition-all"
                  disabled={locationShareMutation.isPending || sharingLiveLocation}
                  data-testid="button-share-live-location"
                >
                  <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center">
                    <Navigation size={18} className="text-green-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-foreground">Live Location</p>
                    <p className="text-xs text-muted-foreground">Share for 1 hour (updates every 30 sec)</p>
                  </div>
                  {sharingLiveLocation && (
                    <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-1 rounded-full font-medium">Active</span>
                  )}
                </button>
              </div>

              {locationShareMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                  <Loader2 size={16} className="animate-spin" /> Getting your location...
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowLocationShare(false)}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFestivalCards && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowFestivalCards(false); }}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="bg-card w-full max-w-lg rounded-t-3xl p-5 max-h-[70vh] flex flex-col">
              <h3 className="text-lg font-heading font-bold text-center text-foreground mb-1">Festival Greetings</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">Send a beautiful greeting card</p>
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-4">
                {FESTIVAL_CARDS.map((fc) => (
                  <button
                    key={fc.name}
                    className="rounded-xl overflow-hidden shadow-md border border-white/10 hover:scale-105 transition-transform active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${fc.colors[0]}, ${fc.colors[1]})` }}
                    onClick={() => {
                      if (matchId) {
                        sendMutation.mutate({ matchId, content: `[FESTIVAL_CARD:${fc.name}]` });
                        triggerHaptic("medium");
                        setShowFestivalCards(false);
                      }
                    }}
                    data-testid={`button-send-festival-${fc.name}`}
                  >
                    <div className="p-3 text-center">
                      <div className="text-3xl mb-1">{fc.emoji}</div>
                      <p className="text-white font-bold text-sm">{fc.name}</p>
                      <p className="text-white/70 text-[10px] mt-0.5 line-clamp-2">{fc.greeting}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" className="w-full rounded-xl mt-2" onClick={() => setShowFestivalCards(false)}>Close</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
