import { BottomNav } from "@/components/layout/BottomNav";
import { Link, useLocation } from "wouter";
import { Search, Heart, Archive, Trash2, ArchiveRestore, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getMe } from "@/lib/auth";
import { useState, useEffect } from "react";
import { AdBanner } from "@/components/AdBanner";

interface MatchWithProfile {
  id: string;
  userId: string;
  targetUserId: string;
  isMatched: boolean;
  isArchived?: boolean;
  createdAt: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  profile: {
    name: string;
    age: number;
    photos: string[];
    city: string;
    location: string;
  } | null;
}

export default function Matches() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ matchId: string; action: "archive" | "delete" } | null>(null);
  const queryClient = useQueryClient();

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: matchesData = [], isLoading } = useQuery<MatchWithProfile[]>({
    queryKey: ["/api/matches"],
    enabled: !!session?.user,
  });

  const { data: archivedData = [] } = useQuery<MatchWithProfile[]>({
    queryKey: ["/api/matches/archived"],
    enabled: !!session?.user && tab === "archived",
  });

  const archiveMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/archived"] });
      setMenuOpen(null);
      setConfirmAction(null);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/unarchive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/archived"] });
      setMenuOpen(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/matches/${matchId}/delete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/archived"] });
      setMenuOpen(null);
      setConfirmAction(null);
    },
  });

  useEffect(() => {
    if (!checkingSession && !session?.user) {
      setLocation("/");
    }
  }, [checkingSession, session, setLocation]);

  if (checkingSession || !session?.user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const displayMatches = tab === "active" ? matchesData : archivedData;
  const filteredMatches = displayMatches.filter((m) =>
    m.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return date.toLocaleDateString("en-IN", { weekday: "short" });
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="px-6 pt-6 pb-3 shrink-0">
        <h1 className="text-2xl font-heading font-bold mb-3" data-testid="text-matches-title">Messages</h1>
        <div className="flex gap-2 mb-3">
          <button
            data-testid="tab-active"
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Active
          </button>
          <button
            data-testid="tab-archived"
            onClick={() => setTab("archived")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${tab === "archived" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Archive size={14} /> Archived
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            data-testid="input-search-matches"
            placeholder="Search matches..."
            className="pl-9 bg-card border-border rounded-xl h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading matches...</div>
        ) : displayMatches.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              {tab === "archived" ? <Archive className="text-muted-foreground" size={32} /> : <Heart className="text-red-400" size={32} />}
            </div>
            <h3 className="font-bold text-lg mb-2" data-testid="text-no-matches">
              {tab === "archived" ? "No archived chats" : "No matches yet"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {tab === "archived" ? "Archived chats will appear here" : "Keep swiping to find your perfect match!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {tab === "active" && matchesData.length > 0 && (
              <>
                <div className="px-6 py-3 shrink-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    New Matches ({matchesData.length})
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                    {matchesData.map((match) => (
                      <Link key={match.id} href={`/chat/${match.id}`}>
                        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" data-testid={`card-match-${match.id}`}>
                          <div className="w-16 h-20 rounded-2xl overflow-hidden relative shadow-md border-2 border-card ring-2 ring-blue-600">
                            <img
                              src={match.profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"}
                              alt={match.profile?.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground max-w-[64px] truncate text-center">
                            {match.profile?.name?.split(" ")[0]}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border shrink-0" />
              </>
            )}

            <div className="px-3 pt-2 pb-2">
              <AdBanner placement="matches" className="my-3 mx-3" />
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 px-3">
                {tab === "archived" ? "Archived Chats" : "Conversations"}
              </h3>
              <div>
                {filteredMatches.map((match, matchIndex) => (
                  <div key={match.id}>
                  {matchIndex > 0 && matchIndex % 5 === 0 && (
                    <AdBanner placement="matches" className="my-2 mx-3" />
                  )}
                  <div className="flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-xl transition-colors relative" data-testid={`row-chat-${match.id}`}>
                    <Link href={`/chat/${match.id}`} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <div className="relative shrink-0">
                        <img
                          src={match.profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"}
                          alt={match.profile?.name}
                          className="w-13 h-13 rounded-full object-cover border-2 border-card shadow-sm"
                          style={{ width: "52px", height: "52px" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="font-heading font-bold text-sm truncate pr-2">{match.profile?.name}, {match.profile?.age}</h4>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimestamp(match.lastMessage?.createdAt || match.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs truncate text-muted-foreground">
                          {match.lastMessage
                            ? match.lastMessage.content.length > 40
                              ? match.lastMessage.content.substring(0, 40) + "..."
                              : match.lastMessage.content
                            : tab === "archived" ? "Archived" : "Tap to start chatting"}
                        </p>
                      </div>
                    </Link>
                    <div className="relative">
                      <button
                        data-testid={`button-menu-${match.id}`}
                        onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === match.id ? null : match.id); }}
                        className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen === match.id && (
                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-30 w-44">
                          {tab === "active" ? (
                            <>
                              <button
                                data-testid={`button-archive-${match.id}`}
                                className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:bg-muted flex items-center gap-2"
                                onClick={() => setConfirmAction({ matchId: match.id, action: "archive" })}
                              >
                                <Archive size={14} /> Archive Chat
                              </button>
                              <button
                                data-testid={`button-delete-${match.id}`}
                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-muted flex items-center gap-2 border-t border-border"
                                onClick={() => setConfirmAction({ matchId: match.id, action: "delete" })}
                              >
                                <Trash2 size={14} /> Delete Chat
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                data-testid={`button-unarchive-${match.id}`}
                                className="w-full text-left px-4 py-3 text-sm text-green-400 hover:bg-muted flex items-center gap-2"
                                onClick={() => unarchiveMutation.mutate(match.id)}
                              >
                                <ArchiveRestore size={14} /> Unarchive
                              </button>
                              <button
                                data-testid={`button-delete-${match.id}`}
                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-muted flex items-center gap-2 border-t border-border"
                                onClick={() => setConfirmAction({ matchId: match.id, action: "delete" })}
                              >
                                <Trash2 size={14} /> Delete Chat
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setConfirmAction(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">
              {confirmAction.action === "delete" ? "Delete Chat?" : "Archive Chat?"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {confirmAction.action === "delete"
                ? "This chat will be removed from your view. The data is retained for safety purposes."
                : "This chat will be moved to your archived folder. You can restore it anytime."}
            </p>
            <div className="flex gap-3">
              <button
                data-testid="button-confirm-cancel"
                className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-medium text-sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                data-testid="button-confirm-action"
                className={`flex-1 py-3 rounded-xl font-medium text-sm text-white ${confirmAction.action === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
                onClick={() => {
                  if (confirmAction.action === "delete") {
                    deleteMutation.mutate(confirmAction.matchId);
                  } else {
                    archiveMutation.mutate(confirmAction.matchId);
                  }
                }}
              >
                {confirmAction.action === "delete" ? "Delete" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
