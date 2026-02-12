import { Link, useLocation } from "wouter";
import { Home, MessageCircle, Heart, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: Home, label: "Discover" },
    { href: "/matches", icon: Heart, label: "Matches" },
    { href: "/quiz", icon: Sparkles, label: "Quiz" },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-40">
      {navItems.map((item) => {
        const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/home");
        return (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/70"
            )}>
              <item.icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
                className={cn("transition-all", isActive && "drop-shadow-sm")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
