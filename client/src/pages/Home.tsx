import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { MOCK_PROFILES } from "@/lib/mockData";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { MapPin, Info, Heart, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  
  const removeProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="px-6 pt-6 pb-2 flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-heading font-bold text-brand-gradient">Discover</h1>
          <p className="text-xs text-muted-foreground">New York, NY</p>
        </div>
        <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
          <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse" />
        </div>
      </header>

      {/* Card Stack */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        <AnimatePresence>
          {profiles.length > 0 ? (
            profiles.slice().reverse().map((profile, index) => {
              const isFront = index === profiles.length - 1;
              return (
                <SwipeCard 
                  key={profile.id} 
                  profile={profile} 
                  isFront={isFront}
                  onSwipe={() => removeProfile(profile.id)}
                />
              );
            })
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">No more profiles</h3>
              <p className="text-muted-foreground">Check back later for new matches in your area.</p>
              <Button 
                onClick={() => setProfiles(MOCK_PROFILES)}
                className="mt-6" 
                variant="outline"
              >
                Reset Demo
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}

function SwipeCard({ profile, isFront, onSwipe }: { profile: any, isFront: boolean, onSwipe: () => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const color = useTransform(x, [-150, 0, 150], ["#ef4444", "#ffffff", "#22c55e"]); // Red to Green

  // Overlay opacity for like/nope indicators
  const likeOpacity = useTransform(x, [20, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -150], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe();
    } else if (info.offset.x < -100) {
      onSwipe();
    }
  };

  return (
    <motion.div
      style={{ 
        x: isFront ? x : 0, 
        rotate: isFront ? rotate : 0,
        zIndex: isFront ? 10 : 0,
        scale: isFront ? 1 : 0.95,
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: isFront ? 1 : 0.95 - (0.05 * 1), opacity: 1, y: isFront ? 0 : 10 }}
      exit={{ x: x.get() < 0 ? -500 : 500, opacity: 0, transition: { duration: 0.2 } }}
      className="absolute w-full h-full max-h-[600px] max-w-sm"
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl bg-white select-none">
        <img 
          src={profile.image} 
          alt={profile.name} 
          className="w-full h-full object-cover pointer-events-none" 
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

        {/* Swipe Indicators */}
        {isFront && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 right-8 border-4 border-green-500 rounded-lg px-4 py-2 rotate-12 bg-black/20 backdrop-blur-sm z-20">
              <span className="text-green-500 font-bold text-2xl tracking-widest uppercase">Like</span>
            </motion.div>
            <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 left-8 border-4 border-red-500 rounded-lg px-4 py-2 -rotate-12 bg-black/20 backdrop-blur-sm z-20">
              <span className="text-red-500 font-bold text-2xl tracking-widest uppercase">Nope</span>
            </motion.div>
          </>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-heading font-bold">{profile.name}, {profile.age}</h2>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/30">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-sm">{profile.respectScore}</span>
            </div>
          </div>
          
          <div className="flex items-center text-white/80 text-sm mb-4">
            <MapPin size={14} className="mr-1" />
            <span>{profile.distance} • {profile.location}</span>
          </div>

          <p className="text-white/90 line-clamp-2 mb-4 font-light">
            {profile.bio}
          </p>

          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest: string) => (
              <span key={interest} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium border border-white/20">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
