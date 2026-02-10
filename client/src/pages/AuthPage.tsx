import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Mail, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<"splash" | "phone" | "email">("splash");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLocation("/home");
    }, 1500);
  };

  if (method === "splash") {
    return (
      <div className="h-full flex flex-col items-center justify-between p-8 bg-brand-gradient text-white relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="mt-20 flex flex-col items-center text-center z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/30"
          >
            <Sparkles className="w-12 h-12 text-white fill-white" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-heading font-bold mb-2 tracking-tight"
          >
            Spark
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-white/90 font-medium"
          >
            Meaningful connections,<br/>powered by respect & AI.
          </motion.p>
        </div>

        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full space-y-4 z-10"
        >
          <Button 
            onClick={() => setMethod("phone")}
            className="w-full bg-white text-primary hover:bg-white/90 font-bold h-12 rounded-xl shadow-lg border-0 cursor-pointer"
          >
            <Phone className="mr-2 h-4 w-4" /> Continue with Phone
          </Button>
          <Button 
            onClick={() => setMethod("email")}
            variant="outline"
            className="w-full border-white/40 text-white hover:bg-white/10 hover:text-white font-semibold h-12 rounded-xl backdrop-blur-sm cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" /> Continue with Email
          </Button>
          
          <p className="text-xs text-center text-white/60 mt-4">
            By continuing, you agree to our Terms & Privacy Policy.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-background">
      <Button 
        variant="ghost" 
        className="w-fit p-0 hover:bg-transparent -ml-2 mb-8"
        onClick={() => setMethod("splash")}
      >
        ← Back
      </Button>

      <div className="flex-1">
        <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
          {method === "phone" ? "What's your number?" : "What's your email?"}
        </h2>
        <p className="text-muted-foreground mb-8">
          We'll send you a verification code to log you in.
        </p>

        <div className="space-y-6">
          <Input 
            placeholder={method === "phone" ? "+1 (555) 000-0000" : "you@example.com"}
            className="h-14 text-lg bg-secondary/30 border-secondary-foreground/10 rounded-xl px-4"
            autoFocus
          />
          
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-xl font-bold text-md shadow-md bg-brand-gradient hover:opacity-90 transition-opacity"
          >
            {isLoading ? "Sending code..." : "Send Code"} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
