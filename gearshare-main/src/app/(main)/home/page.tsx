
'use client';

import { useState } from "react";
import { Bell, Search, Book, Calculator, FlaskConical, Camera, Laptop, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

const categories = [
  { name: "Books", icon: Book },
  { name: "Calculators", icon: Calculator },
  { name: "Electronics", icon: Laptop },
  { name: "Cameras", icon: Camera },
  { name: "Lab Gear", icon: FlaskConical },
];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const db = useFirestore();

  const trendingQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'items'), orderBy('createdAt', 'desc'), limit(10)) : null, 
  [db]);
  const { data: items, isLoading: loading } = useCollection(trendingQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push(`/search`);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Bar */}
      <header className="flex items-center justify-between p-4 bg-background sticky top-0 z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-primary font-headline">GearShare</h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
            Campus Marketplace
          </span>
        </div>
        <button className="p-2 rounded-full hover:bg-secondary relative">
          <Bell className="h-6 w-6 text-primary" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full border-2 border-background"></span>
        </button>
      </header>

      {/* Search Section */}
      <form onSubmit={handleSearchSubmit} className="px-4">
        <div className="relative group">
          <Search className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground/60 group-focus-within:text-accent transition-colors" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="What do you need today?"
            className="pl-12 h-14 bg-white rounded-2xl border-none shadow-sm text-sm font-medium focus-visible:ring-accent transition-all"
          />
        </div>
      </form>

      {/* Categories */}
      <div className="flex overflow-x-auto px-4 py-2 space-x-6 hide-scrollbar">
        {categories.map((cat) => (
          <Link 
            key={cat.name} 
            href={`/search?cat=${encodeURIComponent(cat.name)}`}
            className="flex flex-col items-center space-y-2 shrink-0"
          >
            <div className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 active:scale-95">
              <cat.icon className="h-6 w-6 text-primary" />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{cat.name}</span>
          </Link>
        ))}
      </div>

      {/* Share CTA Card */}
      <div className="px-4">
        <Link 
          href="/share"
          className="flex items-center justify-between p-6 bg-accent rounded-[32px] text-white shadow-xl shadow-accent/20 relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 h-full w-32 bg-white/10 skew-x-12 transform translate-x-8"></div>
          <div className="relative z-10 space-y-1">
            <h3 className="text-xl font-black font-headline">Extra Gear?</h3>
            <p className="text-xs font-bold opacity-90">Share it and earn points!</p>
          </div>
          <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-accent shadow-lg relative z-10 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6" />
          </div>
        </Link>
      </div>

      {/* Trending Near You */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-xl font-bold font-headline text-primary">Trending Near You</h2>
          <Link href="/search" className="text-sm font-bold text-accent hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items?.length === 0 ? (
          <div className="px-4 py-8 bg-white mx-4 rounded-3xl border border-dashed border-primary/20 text-center">
            <p className="text-xs text-muted-foreground font-medium">No items listed yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto px-4 pb-4 space-x-4 hide-scrollbar">
            {items?.map((item: any) => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="flex flex-col shrink-0 w-64 bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-border/10"
              >
                <div className="relative h-44 w-full">
                  <Image
                    src={item.photoUrls?.[0] || `https://picsum.photos/seed/${item.id}/600/400`}
                    alt={item.name}
                    fill
                    className="object-cover"
                    data-ai-hint="marketplace item"
                  />
                  <Badge className="absolute top-3 left-3 bg-primary text-white border-none text-[10px] font-bold">
                    {item.categoryId}
                  </Badge>
                </div>
                <div className="p-4 flex flex-col justify-between">
                  <h3 className="font-bold text-primary line-clamp-1">{item.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-black text-accent">₹{item.pricePerDay || 0}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">per day</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recently Shared */}
      <section className="px-4 pb-6 space-y-4">
        <h2 className="text-xl font-bold font-headline text-primary">Recently Shared</h2>
        <div className="space-y-4">
          {items?.slice(0, 3).map((item: any) => (
            <Link
              key={item.id}
              href={`/item/${item.id}`}
              className="flex items-center p-3 bg-white rounded-[24px] shadow-sm hover:shadow-md transition-all group border border-border/10"
            >
              <div className="relative h-16 w-16 rounded-2xl overflow-hidden shrink-0">
                <Image
                  src={item.photoUrls?.[0] || `https://picsum.photos/seed/${item.id}/400/300`}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="ml-4 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-primary group-hover:text-accent transition-colors">
                  {item.name}
                </h3>
                <span className="text-[10px] text-muted-foreground font-medium">Shared recently</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-black text-accent">₹{item.pricePerDay}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
