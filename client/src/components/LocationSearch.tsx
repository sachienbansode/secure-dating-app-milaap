import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Locate, Search, X, Loader2 } from "lucide-react";

interface LocationSearchProps {
  value: string;
  onChange: (city: string, location: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchResult {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state_district?: string;
    state?: string;
    county?: string;
    suburb?: string;
  };
  lat: string;
  lon: string;
}

export default function LocationSearch({ value, onChange, placeholder = "Search for your city...", className = "" }: LocationSearchProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchCity = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&countrycodes=in&format=json&addressdetails=1&limit=8&featuretype=city`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: SearchResult[] = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setGpsError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCity(val), 400);
  };

  const extractCityName = (result: SearchResult): string => {
    const addr = result.address;
    return addr.city || addr.town || addr.village || addr.state_district || addr.county || addr.suburb || result.display_name.split(",")[0];
  };

  const handleSelect = (result: SearchResult) => {
    const cityName = extractCityName(result);
    const locationParts = [cityName];
    if (result.address.state) locationParts.push(result.address.state);
    const location = locationParts.join(", ");
    setQuery(cityName);
    setShowDropdown(false);
    setResults([]);
    onChange(cityName, location);
  };

  const handleGPS = async () => {
    setGpsError("");
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setGpsError("GPS not supported by your browser");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data: SearchResult = await res.json();
          const cityName = extractCityName(data);
          const locationParts = [cityName];
          if (data.address.state) locationParts.push(data.address.state);
          const location = locationParts.join(", ");
          setQuery(cityName);
          onChange(cityName, location);
        } catch {
          setGpsError("Could not detect location");
        }
        setGpsLoading(false);
      },
      (err) => {
        if (err.code === 1) setGpsError("Location access denied");
        else if (err.code === 2) setGpsError("Location unavailable");
        else setGpsError("Location request timed out");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onChange("", "");
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          data-testid="input-city-search"
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          className="w-full h-12 rounded-xl border border-gray-200 pl-10 pr-20 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              data-testid="button-clear-city"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
            title="Use GPS location"
            data-testid="button-gps-location"
          >
            {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
          </button>
        </div>
      </div>

      {gpsError && (
        <p className="text-xs text-red-500 mt-1 px-1" data-testid="text-gps-error">{gpsError}</p>
      )}

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-3 z-50">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            Searching...
          </div>
        </div>
      )}

      {showDropdown && results.length > 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto" data-testid="dropdown-city-results">
          {results.map((result, i) => {
            const cityName = extractCityName(result);
            const parts = result.display_name.split(",").map(s => s.trim());
            const subtitle = parts.slice(1, 3).join(", ");
            return (
              <button
                key={`${result.lat}-${result.lon}-${i}`}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                data-testid={`option-city-${i}`}
              >
                <MapPin size={14} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cityName}</p>
                  {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showDropdown && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-3 z-50">
          <p className="text-sm text-gray-400 text-center">No cities found</p>
        </div>
      )}
    </div>
  );
}
