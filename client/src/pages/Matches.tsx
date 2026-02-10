import { BottomNav } from "@/components/layout/BottomNav";
import { MOCK_PROFILES, MOCK_CHATS } from "@/lib/mockData";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Matches() {
  // Combine chat data with profile data
  const chats = MOCK_CHATS.map(chat => {
    const profile = MOCK_PROFILES.find(p => p.id === chat.userId);
    return { ...chat, profile };
  }).filter(c => c.profile);

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-heading font-bold mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search matches..." 
            className="pl-9 bg-gray-50 border-gray-100 rounded-xl" 
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* New Matches Row */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">New Matches</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {MOCK_PROFILES.map((profile) => (
              <div key={profile.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="w-[70px] h-[90px] rounded-2xl overflow-hidden relative shadow-md">
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-1 left-0 right-0 text-center text-white text-xs font-medium">{profile.name}</span>
                  {profile.respectScore > 90 && (
                     <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white shadow-sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chats List */}
        <div className="px-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-4">Conversations</h3>
          <div className="space-y-1">
            {chats.map((chat) => (
              <Link key={chat.id} href={`/chat/${chat.userId}`}>
                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer">
                  <div className="relative">
                    <img 
                      src={chat.profile?.image} 
                      alt={chat.profile?.name} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" 
                    />
                    {chat.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-heading font-bold text-base">{chat.profile?.name}</h4>
                      <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                    </div>
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {chat.aiHandover && <span className="text-purple-500 font-bold mr-1">[AI Suggestion]</span>}
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
