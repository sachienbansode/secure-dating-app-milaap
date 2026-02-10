import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";

interface MobileWrapperProps {
  children: ReactNode;
}

export function MobileWrapper({ children }: MobileWrapperProps) {
  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-0 md:p-4 font-sans">
      <div className="w-full max-w-md h-[100dvh] md:h-[90vh] bg-background md:rounded-[2.5rem] md:border-[8px] md:border-neutral-900 overflow-hidden shadow-2xl relative flex flex-col">
        {/* Notch simulation for desktop view */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-900 rounded-b-xl z-50"></div>
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative">
          {children}
        </main>
        <Toaster />
      </div>
    </div>
  );
}
