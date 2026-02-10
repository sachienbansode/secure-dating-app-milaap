import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { MOCK_PROFILES } from "@/lib/mockData";
import { ArrowLeft, Send, Sparkles, MoreVertical, ShieldCheck, Smile, Phone, Video, Paperclip, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const userId = params?.id;
  const profile = MOCK_PROFILES.find(p => p.id === userId);

  const [messages, setMessages] = useState([
    { id: 1, text: "Hey! I saw you like art galleries too.", sender: "them", time: "10:00 AM", status: "read" },
    { id: 2, text: "Yes! The MoMA is my favorite spot in the city.", sender: "me", time: "10:05 AM", status: "read" },
    { id: 3, text: "No way, I was just there last weekend! Did you see the new exhibit?", sender: "them", time: "10:07 AM", status: "read" },
  ]);

  const [input, setInput] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, aiMode]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { 
      id: Date.now(), 
      text: input, 
      sender: "me", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    }]);
    setInput("");
    
    // Simulate typing indicator
    setTimeout(() => setIsTyping(true), 1000);

    // Simulate reply
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "That sounds awesome! We should go together sometime.",
        sender: "them",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "read"
      }]);
    }, 3500);
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
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-heading font-bold text-sm">{profile.name}</h3>
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        
        {/* Date Separator */}
        <div className="flex justify-center my-4">
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.sender === "me";
          const isNextSame = messages[index + 1]?.sender === msg.sender;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-${isNextSame ? '1' : '4'}`}
            >
              <div 
                className={`max-w-[75%] px-4 py-3 shadow-sm text-sm relative group ${
                  isMe 
                    ? "bg-brand-gradient text-white rounded-2xl rounded-tr-sm" 
                    : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"
                }`}
              >
                {msg.text}
                
                {isMe && (
                  <div className="absolute bottom-1 right-2 opacity-70">
                    <CheckCheck size={12} className="text-white" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {msg.time}
              </span>
            </motion.div>
          );
        })}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="flex justify-start mb-4"
             >
               <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
               </div>
             </motion.div>
          )}
        </AnimatePresence>
        
        {/* AI Suggestion Bubble */}
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
                  "That sounds amazing! I'd love to hear more about your favorite piece there. 🎨"
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl flex-1 shadow-purple-200 shadow-md"
                    onClick={handleAiSuggest}
                  >
                    Use Suggestion
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

      {/* Input Area */}
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
          >
            <Sparkles size={18} />
          </Button>
        </div>

        <Button 
          size="icon" 
          className={`h-11 w-11 rounded-full shadow-md shrink-0 transition-transform active:scale-95 ${input.trim() ? "bg-brand-gradient" : "bg-gray-200 text-gray-400"}`}
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
        </Button>
      </div>
    </div>
  );
}

