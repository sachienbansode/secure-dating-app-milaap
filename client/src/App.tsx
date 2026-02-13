import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { queryClient, setSessionExpiredHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { MobileWrapper } from "@/components/layout/MobileWrapper";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import Home from "@/pages/Home";
import Matches from "@/pages/Matches";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import AdminConsole from "@/pages/AdminConsole";
import ViewProfile from "@/pages/ViewProfile";
import Quiz from "@/pages/Quiz";
import { Download, X } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/home" component={Home} />
      <Route path="/matches" component={Matches} />
      <Route path="/chat" component={Matches} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route path="/view-profile/:userId" component={ViewProfile} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/admin" component={AdminConsole} />
      <Route component={NotFound} />
    </Switch>
  );
}

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem("pwa-install-dismissed");
    if (alreadyDismissed) {
      setDismissed(true);
      return;
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (isStandalone) return;

    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] rounded-2xl p-4 shadow-2xl border"
      style={{
        background: "linear-gradient(135deg, #141428, #1a1a35)",
        borderColor: "rgba(220,38,38,0.3)",
      }}
      data-testid="pwa-install-banner"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
        data-testid="button-dismiss-install"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #dc2626, #2563eb)" }}
        >
          <Download size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Install Milaap</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            {isIOS
              ? "Tap the Share button, then 'Add to Home Screen'"
              : "Add to your home screen for the best experience"
            }
          </p>
        </div>
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="px-4 py-2 rounded-xl text-white text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
            data-testid="button-install-app"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}

function SessionHandler() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setSessionExpiredHandler((message: string) => {
      queryClient.clear();
      toast({
        title: "Session Expired",
        description: message,
        variant: "destructive",
      });
      setLocation("/");
    });
    return () => setSessionExpiredHandler(() => {});
  }, [setLocation, toast]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileWrapper>
        <SessionHandler />
        <Router />
      </MobileWrapper>
      <InstallPrompt />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
