import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface AdBannerProps {
  placement: string;
  className?: string;
}

export function AdBanner({ placement, className = "" }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: adSettings } = useQuery({
    queryKey: ["/api/ad-settings"],
    queryFn: async () => {
      const res = await fetch("/api/ad-settings");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: membership } = useQuery({
    queryKey: ["/api/membership/feature-access"],
    queryFn: async () => {
      const res = await fetch("/api/membership/feature-access", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  const shouldShow = adSettings?.enabled && membership?.showAds !== false &&
    adSettings?.placement?.includes(placement);

  useEffect(() => {
    if (!shouldShow || !adSettings?.publisherId || !containerRef.current) return;

    try {
      const existingScript = document.querySelector('script[src*="adsbygoogle"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSettings.publisherId}`;
        script.crossOrigin = "anonymous";
        script.async = true;
        document.head.appendChild(script);
      }

      const adEl = document.createElement("ins");
      adEl.className = "adsbygoogle";
      adEl.style.display = "block";
      adEl.setAttribute("data-ad-client", adSettings.publisherId);
      adEl.setAttribute("data-ad-slot", adSettings.slotId || adSettings.bannerSlotId || "");
      adEl.setAttribute("data-ad-format", "auto");
      adEl.setAttribute("data-full-width-responsive", "true");

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(adEl);

        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }, [shouldShow, adSettings]);

  if (!shouldShow) return null;

  if (!adSettings?.publisherId) {
    return (
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-xl border border-dashed border-slate-600/30 bg-slate-800/20 ${className}`}
        data-testid={`ad-banner-${placement}`}
      >
        <div className="flex items-center justify-center py-3 px-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Sponsored</p>
            <p className="text-xs text-slate-400 mt-1">Ad space - Configure in Admin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      data-testid={`ad-banner-${placement}`}
    />
  );
}

export function useAdFrequency(placement: string) {
  const [swipeCount, setSwipeCount] = useState(0);
  const [showAd, setShowAd] = useState(false);

  const { data: adSettings } = useQuery({
    queryKey: ["/api/ad-settings"],
    queryFn: async () => {
      const res = await fetch("/api/ad-settings");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: membership } = useQuery({
    queryKey: ["/api/membership/feature-access"],
    queryFn: async () => {
      const res = await fetch("/api/membership/feature-access", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  const frequency = adSettings?.frequency || 5;
  const enabled = adSettings?.enabled && membership?.showAds !== false &&
    adSettings?.placement?.includes(placement);

  const recordSwipe = () => {
    if (!enabled) return;
    const next = swipeCount + 1;
    setSwipeCount(next);
    if (next % frequency === 0) {
      setShowAd(true);
    }
  };

  const dismissAd = () => {
    setShowAd(false);
  };

  return { showAd, recordSwipe, dismissAd, enabled };
}
