
'use client';

import { useRouter } from "next/navigation";
import { Settings, Star, ChevronRight, User, Bell, ShieldCheck, LogOut, Gift, Loader2, Package, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";

function HistoryItem({ transaction, type }: { transaction: any, type: 'borrow' | 'lend' }) {
  const db = useFirestore();
  const itemRef = useMemoFirebase(() => db ? doc(db, 'items', transaction.itemId) : null, [db, transaction.itemId]);
  const { data: item } = useDoc(itemRef);

  if (!item) return null;

  return (
    <Link 
      href={`/item/${item.id}`}
      className="flex items-center p-3 bg-white rounded-[24px] shadow-sm border border-border/10 hover:shadow-md transition-all group"
    >
      <div className="relative h-16 w-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
        <Image src={item.photoUrls?.[0] || `https://picsum.photos/seed/${item.id}/200/200`} alt={item.name} fill className="object-cover" />
      </div>
      <div className="ml-4 flex-1 overflow-hidden">
        <h3 className="text-sm font-black text-primary truncate group-hover:text-accent transition-colors">{item.name}</h3>
        <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
          <span className="text-[10px] font-bold uppercase">{transaction.status}</span>
          <span className="h-1 w-1 bg-border rounded-full" />
          <span className="text-[10px] font-medium">{new Date(transaction.requestDate).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-sm font-black text-accent">₹{item.pricePerDay}</span>
        <p className="text-[8px] font-black text-muted-foreground uppercase">/ DAY</p>
      </div>
    </Link>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => 
    db && user ? doc(db, 'users', user.uid) : null, 
  [db, user]);
  const { data: profile, isLoading: profileLoading } = useDoc(userRef);

  // Fetch Borrow History
  const borrowQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'transactions'),
      where('borrowerId', '==', user.uid)
    );
  }, [db, user]);
  const { data: borrowHistory, isLoading: borrowLoading } = useCollection(borrowQuery);

  // Fetch Lending History
  const lendQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'transactions'),
      where('ownerId', '==', user.uid)
    );
  }, [db, user]);
  const { data: lendHistory, isLoading: lendLoading } = useCollection(lendQuery);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "See you next time on campus!",
      });
      router.push("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message,
      });
    }
  };

  if (isUserLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const settingsRows = [
    { id: "personal", label: "Personal Information", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Security", icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background">
        <h1 className="text-2xl font-bold font-headline text-primary">My Profile</h1>
        <button className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow text-primary">
          <Settings className="h-6 w-6" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="flex flex-col items-center px-4 space-y-4">
        <div className="relative">
          <Avatar className="h-28 w-28 ring-4 ring-white shadow-2xl">
            <AvatarImage src={profile?.profilePhotoUrl || "https://picsum.photos/seed/user/200/200"} />
            <AvatarFallback className="text-xl font-bold bg-primary text-white">
              {profile?.fullName?.[0] || user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-1 right-1 bg-accent p-1.5 rounded-full ring-4 ring-background shadow-lg">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black font-headline text-primary">{profile?.fullName || user?.email?.split('@')[0]}</h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center bg-yellow-400/10 text-yellow-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Star className="h-3 w-3 fill-yellow-500 mr-1" />
              {profile?.trustScore || '5.0'} Trust Score
            </div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Member since 2024</span>
          </div>
        </div>
      </div>

      {/* Referral Rewards */}
      <div className="px-4">
        <div className="bg-primary rounded-[32px] p-6 text-white shadow-2xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-32 w-32 bg-accent rounded-full opacity-20 transition-transform group-hover:scale-125 duration-700"></div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center space-x-2 mb-1">
              <Gift className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">Referral Rewards</span>
            </div>
            <h3 className="text-2xl font-black">{profile?.pointsBalance || 0} Points</h3>
            <p className="text-[10px] opacity-80 font-medium">Invite friends to earn campus perks.</p>
          </div>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white font-black rounded-xl relative z-10 px-6 py-5 shadow-lg active:scale-95">
            Invite
          </Button>
        </div>
      </div>

      {/* History Tabs */}
      <div className="px-4">
        <Tabs defaultValue="borrow" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl bg-white p-1 shadow-sm border border-border/10">
            <TabsTrigger value="borrow" className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Borrow History</TabsTrigger>
            <TabsTrigger value="lend" className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Lending History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="borrow" className="pt-4 space-y-3">
            {borrowLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : borrowHistory?.length === 0 ? (
              <div className="py-12 text-center opacity-50 space-y-2">
                <Package className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-bold text-primary">No borrow history yet</p>
                <p className="text-xs">Find items nearby to start borrowing!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {borrowHistory?.map((t: any) => (
                  <HistoryItem key={t.id} transaction={t} type="borrow" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lend" className="pt-4 space-y-3">
            {lendLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : lendHistory?.length === 0 ? (
              <div className="py-12 text-center opacity-50 space-y-2">
                <Package className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-bold text-primary">No lending history found</p>
                <p className="text-xs">Share your items to help other students!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lendHistory?.map((t: any) => (
                  <HistoryItem key={t.id} transaction={t} type="lend" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings Sections */}
      <div className="px-4 space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Account Settings</h3>
        <div className="bg-white rounded-[32px] overflow-hidden border border-border/10 shadow-sm">
          {settingsRows.map((row, idx) => (
            <div key={row.id}>
              <button className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-background rounded-2xl">
                    <row.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-primary">{row.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {idx < settingsRows.length - 1 && <div className="h-px bg-border/50 mx-6" />}
            </div>
          ))}
        </div>
      </div>

      {/* Log Out */}
      <div className="px-4 pt-4 mb-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full h-16 rounded-2xl text-destructive hover:bg-destructive/5 hover:text-destructive font-black text-lg flex items-center justify-center gap-2"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
