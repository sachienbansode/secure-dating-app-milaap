import { useState, useRef, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles, MoreVertical, ShieldCheck, Phone, Video, Paperclip, CheckCheck } from "lucide-react";
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
  isRead: boolean;
  createdAt: string;
}

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const [, setLocation] = useLocation();
  const matchId = params?.id;
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getMe,
  });

  if (!session?.user) {
    setLocation("/");
    return null;
  }

  const currentUserId = session.user.id;

  const { data: matchData } = useQuery<any>({
    queryKey: ["/api/matches"],
    select: (data: any[]) => data?.find((m: any) => m.id === matchId),
  });

  const profile = matchData?.profile;

  const { data: messages = [], isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: [`/api/messages/${matchId}`],
    enabled: !!matchId,
    refetchInterval: 3000,
  });

  const [input, setInput] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiMode]);

  const sendMutation = useMutation({
    mutationFn: async (data: { matchId: string; content: string; isAiGenerated?: boolean }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${matchId}`] });
    },
  });

  const handleSend = () => {
    if (!input.trim() || !matchId) return;
    sendMutation.mutate({ matchId, content: input });
    setInput("");
  };

  const handleAiSuggest = () => {
    const suggestions = [
      "That sounds amazing! I'd love to hear more about that. 🎨",
      "Ha, that's so cool! We should definitely meet up for chai sometime. ☕",
      "I'm really enjoying our conversation! What else do you like to do? 😊",
      "That's really interesting. I think we have a lot in common! 💫",
    ];
    setInput(suggestions[Math.floor(Math.random() * suggestions.length)]);
    setAiMode(false);
  };

  if (!matchId) return <div>Invalid chat</div>;

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 -ml-2" data-testid="button-back">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border border-gray-100">
                <AvatarImage src={profile?.photos?.[0] || "/profiles/generic_indian_1.jpg"} />
                <AvatarFallback>{profile?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-heading font-bold text-sm" data-testid="text-chat-name">{profile?.name || "Match"}</h3>
                <ShieldCheck size={12} className="text-blue-500" />
              </div>
              <p className="text-xs text-green-600 font-medium">Online now</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9">
            <Phone size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9">
            <Video size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full w-9 h-9">
            <MoreVertical size={18} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="flex justify-center my-4">
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Start of conversation</span>
        </div>

        {loadingMessages ? (
          <div className="text-center text-muted-foreground animate-pulse py-4">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No messages yet. Say hi! 👋</p>
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
                <div
                  className={`max-w-[75%] px-4 py-3 shadow-sm text-sm relative group ${
                    isMe
                      ? "bg-brand-gradient text-white rounded-2xl rounded-tr-sm"
                      : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"
                  }`}
                >
                  {msg.content}
                  {isMe && (
                    <div className="absolute bottom-1 right-2 opacity-70">
                      <CheckCheck size={12} className={msg.isRead ? "text-white" : "text-white/50"} />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </motion.div>
            );
          })
        )}

        <AnimatePresence>
          {aiMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="sticky bottom-2 mx-auto w-full max-w-[95%] z-20"
            >
              <div className="bg-white/80 backdrop-blur-md border border-purple-200 rounded-2xl p-4 shadow-lg ring-1 ring-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-100 p-1.5 rounded-lg">
                    <Sparkles size={14} className="text-purple-600" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">AI Assistant</span>
                </div>
                <p className="text-sm text-gray-800 mb-4 font-medium leading-relaxed">
                  Let me suggest something thoughtful to say...
                </p>
                <div className="flex gap-3">
                  <Button
                    data-testid="button-use-ai-suggestion"
                    className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl flex-1 shadow-purple-200 shadow-md"
                    onClick={handleAiSuggest}
                  >
                    Generate Suggestion
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl px-4"
                    onClick={() => setAiMode(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-3 border-t border-gray-100 flex items-end gap-2 pb-6 md:pb-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-gray-100 rounded-full h-10 w-10 shrink-0"
        >
          <Paperclip size={20} />
        </Button>

        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-[1.5rem] flex items-end min-h-[44px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Input
            data-testid="input-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="border-0 bg-transparent focus-visible:ring-0 px-4 py-3 min-h-[44px] max-h-32 resize-none"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            variant="ghost"
            size="icon"
            className={`mr-1 mb-1 h-8 w-8 rounded-full transition-colors ${aiMode ? "bg-purple-100 text-purple-600" : "text-gray-400 hover:text-purple-600"}`}
            onClick={() => setAiMode(!aiMode)}
            data-testid="button-ai-toggle"
          >
            <Sparkles size={18} />
          </Button>
        </div>

        <Button
          data-testid="button-send"
          size="icon"
          className={`h-11 w-11 rounded-full shadow-md shrink-0 transition-transform active:scale-95 ${input.trim() ? "bg-brand-gradient" : "bg-gray-200 text-gray-400"}`}
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
        >
          <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
        </Button>
      </div>
    </div>
  );
}
