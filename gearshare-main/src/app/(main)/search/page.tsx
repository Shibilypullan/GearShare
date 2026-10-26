
'use client';

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Map as MapIcon, Star, Filter, ArrowLeft, Loader2, MapPin, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || "");
  const activeCategory = searchParams.get('cat') || "All";
  
  const db = useFirestore();

  const exploreQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'items'), limit(100));
  }, [db]);

  const { data: items, isLoading } = useCollection(exploreQuery);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      const matchesCategory = activeCategory === "All" || item.categoryId === activeCategory;
      const matchesSearch = !searchTerm.trim() || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchTerm)}&cat=${encodeURIComponent(activeCategory)}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/home')} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search gear..."
              className="pl-9 h-10 bg-muted/50 border-none rounded-xl text-sm"
            />
          </form>
          <Button variant="ghost" size="icon" className="rounded-full">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {filteredItems.length} {filteredItems.length === 1 ? 'Result' : 'Results'}
            </p>
            {activeCategory !== "All" && (
              <Badge variant="secondary" className="bg-accent/10 text-accent border-none text-[10px] font-black">
                {activeCategory.toUpperCase()}
              </Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(`/explore?q=${searchTerm}&cat=${activeCategory}`)}
            className="rounded-full border-primary/20 text-[10px] font-black h-8 px-4"
          >
            <MapIcon className="mr-2 h-3.5 w-3.5" />
            VIEW MAP
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Searching campus...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-6 bg-muted/30 rounded-full">
              <Search className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-primary">No items found</h3>
              <p className="text-xs text-muted-foreground px-10">Try a different keyword or check another category.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => { setSearchTerm(""); router.push('/search?cat=All'); }}
              className="rounded-xl font-bold"
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/10 group"
              >
                <div className="relative aspect-[4/5] w-full bg-muted">
                  <Image
                    src={item.photoUrls?.[0] || `https://picsum.photos/seed/${item.id}/600/800`}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-white/90 backdrop-blur-md text-primary border-none text-[8px] font-black px-2 py-0.5">
                      {item.categoryId.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="flex items-center bg-yellow-400/10 text-yellow-700 px-1.5 py-0.5 rounded-full text-[8px] font-black">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 mr-0.5" />
                      5.0
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-primary text-sm line-clamp-2 leading-tight flex-1">
                    {item.name}
                  </h3>
                  
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-accent">₹{item.pricePerDay}</span>
                      <span className="text-[8px] font-black text-muted-foreground uppercase">/ DAY</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[9px] font-medium truncate">
                        {item.pickupLocationAddress || 'Main Campus'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
