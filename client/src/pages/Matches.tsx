import { BottomNav } from "@/components/layout/BottomNav";
import { Link, useLocation } from "wouter";
import { Search, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/auth";
import { useState, useEffect } from "react";

interface MatchWithProfile {
  id: string;
  userId: string;
  targetUserId: string;
  isMatched: boolean;
  createdAt: string;
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

  const { data: session, isLoading: checkingSession } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  const { data: matchesData = [], isLoading } = useQuery<MatchWithProfile[]>({
    queryKey: ["/api/matches"],
    enabled: !!session?.user,
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

  const filteredMatches = matchesData.filter((m) =>
    m.profile?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="px-6 pt-6 pb-3 shrink-0">
        <h1 className="text-2xl font-heading font-bold mb-3" data-testid="text-matches-title">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            data-testid="input-search-matches"
            placeholder="Search matches..."
            className="pl-9 bg-gray-50 border-gray-100 rounded-xl h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading matches...</div>
        ) : matchesData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="text-pink-400" size={32} />
            </div>
            <h3 className="font-bold text-lg mb-2" data-testid="text-no-matches">No matches yet</h3>
            <p className="text-muted-foreground text-sm">Keep swiping to find your perfect match!</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="px-6 py-3 shrink-0">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                New Matches ({matchesData.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {matchesData.map((match) => (
                  <Link key={match.id} href={`/chat/${match.id}`}>
                    <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" data-testid={`card-match-${match.id}`}>
                      <div className="w-16 h-20 rounded-2xl overflow-hidden relative shadow-md border-2 border-white ring-2 ring-pink-200">
                        <img
                          src={match.profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"}
                          alt={match.profile?.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <span className="text-[11px] font-medium text-gray-700 max-w-[64px] truncate text-center">
                        {match.profile?.name?.split(" ")[0]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 shrink-0" />

            <div className="px-3 pt-2 pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 px-3">Conversations</h3>
              <div>
                {filteredMatches.map((match) => (
                  <Link key={match.id} href={`/chat/${match.id}`}>
                    <div className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer" data-testid={`row-chat-${match.id}`}>
                      <div className="relative shrink-0">
                        <img
                          src={match.profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"}
                          alt={match.profile?.name}
                          className="w-13 h-13 rounded-full object-cover border-2 border-white shadow-sm"
                          style={{ width: "52px", height: "52px" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="font-heading font-bold text-sm truncate pr-2">{match.profile?.name}, {match.profile?.age}</h4>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(match.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-xs truncate text-muted-foreground">
                          {match.profile?.city} • Tap to start chatting
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
