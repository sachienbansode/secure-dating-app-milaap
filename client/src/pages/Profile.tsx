import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Edit, Shield, ChevronRight, Bell, Sparkles, User, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import profileUser from "@/assets/profiles/profile1.jpg"; // Placeholder using one of the downloaded images

export default function Profile() {
  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="bg-white pt-10 pb-6 px-6 rounded-b-[2rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-brand-gradient opacity-10" />
          
          <div className="relative flex flex-col items-center">
            <div className="relative mb-4 group">
              <Avatar className="w-28 h-28 border-4 border-white shadow-lg">
                <AvatarImage src={profileUser} className="object-cover" />
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                <Edit size={16} className="text-primary" />
              </div>
            </div>
            
            <h2 className="text-2xl font-heading font-bold text-gray-900">Alex, 26</h2>
            <p className="text-muted-foreground text-sm mb-4">Designer • New York, NY</p>
            
            <div className="flex gap-4 w-full justify-center">
              <div className="flex flex-col items-center bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                <span className="text-green-600 font-bold text-xl">96</span>
                <span className="text-green-700/60 text-[10px] uppercase font-bold tracking-wider">Respect Score</span>
              </div>
              <div className="flex flex-col items-center bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                <span className="text-purple-600 font-bold text-xl">Pro</span>
                <span className="text-purple-700/60 text-[10px] uppercase font-bold tracking-wider">Plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">AI Assistant</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">AI Persona</h4>
                    <p className="text-xs text-muted-foreground">Get help with writing messages</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Settings size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Tone & Style</h4>
                    <p className="text-xs text-muted-foreground">Witty, Polite, Flirty</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Account & Safety</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Privacy & Safety</h4>
                    <p className="text-xs text-muted-foreground">Manage visibility & blocks</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Notifications</h4>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
               <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <LogOut size={16} />
                  </div>
                  <div className="text-red-600 font-medium text-sm">
                    Log Out
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
