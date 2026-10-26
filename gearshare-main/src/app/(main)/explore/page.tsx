
"use client";

import { Search, MapPin, Loader2, X, Map as MapIcon, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Load map dynamically to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/explore/map-view'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
    </div>
  )
});

const CATEGORIES = ["All", "Books", "Calculators", "Electronics", "Cameras", "Lab Gear", "Sports", "Other"];

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeChip, setActiveChip] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.0274, 76.3288]); // Default: Software Block
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  
  const db = useFirestore();

  // Fetch real items from Firestore
  const exploreQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'items'), limit(100));
  }, [db]);

  const { data: items, isLoading } = useCollection(exploreQuery);

  // Read initial search state from URL
  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('cat');
    if (q) setSearchQuery(q);
    if (cat && CATEGORIES.includes(cat)) {
      setActiveChip(cat);
    }
  }, [searchParams, items]); // Include items to ensure we check URL params when data arrives

  // Debounced suggestion fetching
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      const matchesCategory = activeChip === "All" || item.categoryId === activeChip;
      const matchesSearch = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [items, activeChip, searchQuery]);

  // Update map center when filtered items change (e.g., when a category is selected)
  useEffect(() => {
    if (filteredItems.length > 0 && activeChip !== "All") {
      const firstItem = filteredItems[0];
      if (firstItem.latitude && firstItem.longitude) {
        setMapCenter([firstItem.latitude, firstItem.longitude]);
      }
    }
  }, [activeChip, filteredItems]);

  const handleSelectLocation = (lat: string, lon: string, name: string) => {
    setMapCenter([parseFloat(lat), parseFloat(lon)]);
    setShowSuggestions(false);
    toast({
      title: "Location Selected",
      description: `Moving map to ${name.split(',')[0]}`,
    });
  };

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearchingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        handleSelectLocation(data[0].lat, data[0].lon, data[0].display_name);
      } else {
        toast({
          variant: "destructive",
          title: "Location Not Found",
          description: "Try a more specific campus landmark or city name.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "Could not connect to location services.",
      });
    } finally {
      setIsSearchingLocation(false);
    }
  };

  return (
    <div className="relative h-screen flex flex-col bg-background">
      {/* Search and Filters Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 space-y-3 pointer-events-none">
        <div className="relative pointer-events-auto max-w-md mx-auto w-full flex gap-2" ref={suggestionRef}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
              placeholder="Search items or locations..."
              className="pl-12 pr-12 h-14 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-none text-sm font-bold focus-visible:ring-accent"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                className="absolute right-4 top-4 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2">
                  <p className="px-3 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/10 mb-1">
                    Locations
                  </p>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleSelectLocation(suggestion.lat, suggestion.lon, suggestion.display_name)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors rounded-xl text-left group"
                    >
                      <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                        <MapPin className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary truncate">
                          {suggestion.display_name.split(',')[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {suggestion.display_name.split(',').slice(1).join(',')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleLocationSearch}
            disabled={isSearchingLocation}
            className="h-14 w-14 bg-primary text-white rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90 hover:bg-accent disabled:opacity-50"
            title="Search for location"
          >
            {isSearchingLocation ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <div className="flex overflow-x-auto space-x-2 hide-scrollbar pointer-events-auto pb-2 max-w-md mx-auto w-full">
          {CATEGORIES.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all shadow-md active:scale-95 border-2 ${
                activeChip === chip
                  ? "bg-primary text-white border-primary"
                  : "bg-white/90 backdrop-blur-md text-primary border-transparent hover:bg-white"
              }`}
            >
              {chip.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map View */}
      <div className="flex-1 relative bg-slate-200">
        <MapView 
          items={filteredItems} 
          onSelectPin={setSelectedItem} 
          center={mapCenter}
        />

        {/* Selected Item Preview Card */}
        {selectedItem && (
          <div className="absolute bottom-24 left-4 right-4 z-[1000] animate-in slide-in-from-bottom-8 duration-500 max-w-md mx-auto">
            <div className="bg-white rounded-[32px] p-4 shadow-2xl flex items-center relative overflow-hidden border border-border/10">
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-1 rounded-full bg-muted/50 text-muted-foreground hover:text-primary transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-border/10">
                <Image
                  src={selectedItem.photoUrls?.[0] || `https://picsum.photos/seed/${selectedItem.id}/300/300`}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="ml-5 flex-1 min-w-0 pr-6">
                <Badge variant="secondary" className="mb-1.5 text-[10px] bg-accent/10 text-accent border-none font-black uppercase tracking-widest">
                  {selectedItem.categoryId}
                </Badge>
                <h3 className="font-black text-primary truncate text-lg leading-tight">
                  {selectedItem.name}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                   <MapPin className="h-3 w-3" />
                   <p className="text-[10px] font-bold uppercase tracking-tight truncate">
                     {selectedItem.pickupLocationAddress || 'Main Campus'}
                   </p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-black text-accent">₹{selectedItem.pricePerDay}</span>
                  <Link 
                    href={`/item/${selectedItem.id}`} 
                    className="text-[10px] font-black bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-accent transition-all active:scale-95"
                  >
                    DETAILS
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <ExploreContent />
    </Suspense>
  );
}
