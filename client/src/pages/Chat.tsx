import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { MOCK_PROFILES } from "@/lib/mockData";
import { ArrowLeft, Send, Sparkles, MoreVertical, ShieldCheck, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const userId = params?.id;
  const profile = MOCK_PROFILES.find(p => p.id === userId);

  const [messages, setMessages] = useState([
    { id: 1, text: "Hey! I saw you like art galleries too.", sender: "them", time: "10:00 AM" },
    { id: 2, text: "Yes! The MoMA is my favorite spot in the city.", sender: "me", time: "10:05 AM" },
    { id: 3, text: "No way, I was just there last weekend! Did you see the new exhibit?", sender: "them", time: "10:07 AM" },
  ]);

  const [input, setInput] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { 
      id: Date.now(), 
      text: input, 
      sender: "me", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    setInput("");
    
    // Simulate reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "That sounds awesome! We should go together sometime.",
        sender: "them",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 2000);
  };

  const handleAiSuggest = () => {
    setInput("That sounds amazing! I'd love to hear more about your favorite piece there. 🎨");
    setAiMode(false);
  };

  if (!profile) return <div>User not found</div>;

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Chat Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 -ml-2">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border border-gray-100">
                <AvatarImage src={profile.image} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-heading font-bold text-sm">{profile.name}</h3>
                <ShieldCheck size={12} className="text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">Online now</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreVertical size={20} />
        </Button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id} 
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div 
              className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm text-sm ${
                msg.sender === "me" 
                  ? "bg-brand-gradient text-white rounded-tr-none" 
                  : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-400 self-end ml-2 mb-1">{msg.time}</span>
          </motion.div>
        ))}
        
        {/* AI Suggestion Bubble */}
        <AnimatePresence>
          {aiMode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mx-auto w-full max-w-[90%] mb-2"
            >
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-purple-600">
                  <Sparkles size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Persona Suggestion</span>
                </div>
                <p className="text-sm text-gray-700 italic mb-3">
                  "That sounds amazing! I'd love to hear more about your favorite piece there. 🎨"
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg flex-1"
                    onClick={handleAiSuggest}
                  >
                    Use this
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50"
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

      {/* Input Area */}
      <div className="bg-white p-3 border-t border-gray-100 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`rounded-full shrink-0 ${aiMode ? "bg-purple-100 text-purple-600" : "text-muted-foreground hover:bg-gray-100"}`}
          onClick={() => setAiMode(!aiMode)}
        >
          <Sparkles size={20} />
        </Button>
        <div className="flex-1 relative">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..." 
            className="rounded-full bg-gray-50 border-gray-200 pr-10 focus-visible:ring-brand-gradient"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent"
          >
            <Smile size={18} />
          </Button>
        </div>
        <Button 
          size="icon" 
          className="rounded-full bg-brand-gradient shadow-md shrink-0"
          onClick={handleSend}
        >
          <Send size={18} className="ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
