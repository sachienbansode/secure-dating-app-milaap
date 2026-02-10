import { BottomNav } from "@/components/layout/BottomNav";
import { Link, useLocation } from "wouter";
import { Search } from "lucide-react";
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
      <header className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-heading font-bold mb-4" data-testid="text-matches-title">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            data-testid="input-search-matches"
            placeholder="Search matches..."
            className="pl-9 bg-gray-50 border-gray-100 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading matches...</div>
        ) : matchesData.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">💕</div>
            <h3 className="font-bold text-lg mb-2" data-testid="text-no-matches">No matches yet</h3>
            <p className="text-muted-foreground text-sm">Keep swiping to find your perfect match!</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Matches ({matchesData.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {matchesData.map((match) => (
                  <Link key={match.id} href={`/chat/${match.id}`}>
                    <div className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer" data-testid={`card-match-${match.id}`}>
                      <div className="w-[70px] h-[90px] rounded-2xl overflow-hidden relative shadow-md">
                        <img
                          src={match.profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"}
                          alt={match.profile?.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-1 left-0 right-0 text-center text-white text-xs font-medium">
                          {match.profile?.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="px-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-4">Conversations</h3>
              <div className="space-y-1">
                {filteredMatches.map((match) => (
                  <Link key={match.id} href={`/chat/${match.id}`}>
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer" data-testid={`row-chat-${match.id}`}>
                      <div className="relative">
                        <img
                          src={match.profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"}
                          alt={match.profile?.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-heading font-bold text-base">{match.profile?.name}, {match.profile?.age}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(match.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm truncate text-muted-foreground">
                          {match.profile?.city} • Tap to start chatting
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
