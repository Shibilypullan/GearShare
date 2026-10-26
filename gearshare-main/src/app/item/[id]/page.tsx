"use client";

import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Share2, Star, Loader2, MessageCircle, ShieldCheck, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useFirestore, useDoc, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, Firestore, deleteDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Load map dynamically to avoid SSR issues
const MapView = dynamic(() => import('@/components/explore/map-view'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-[32px]">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
    </div>
  )
});

export default function ItemDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [date] = useState<Date | undefined>(new Date());
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const itemRef = useMemoFirebase(() => db ? doc(db, 'items', id) : null, [db, id]);
  const { data: item, isLoading: itemLoading } = useDoc(itemRef);

  const ownerRef = useMemoFirebase(() => (db && item?.ownerId) ? doc(db, 'users', item.ownerId) : null, [db, item?.ownerId]);
  const { data: owner, isLoading: ownerLoading } = useDoc(ownerRef);

  async function getOrCreateConversation(db: Firestore, currentUserId: string, otherUserId: string, itemId?: string) {
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, where('participantUserIds', 'array-contains', currentUserId));
    const querySnapshot = await getDocs(q);
    
    const existingConv = querySnapshot.docs.find(doc => {
      const participants = doc.data().participantUserIds as string[];
      return participants.includes(otherUserId);
    });

    if (existingConv) {
      return existingConv.id;
    }

    const newConvData = {
      participantUserIds: [currentUserId, otherUserId],
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      itemId: itemId || null,
      createdAt: serverTimestamp()
    };
    
    const newDocRef = await addDoc(conversationsRef, newConvData);
    return newDocRef.id;
  }

  const handleChat = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!owner || !item) return;

    setIsRequesting(true);
    try {
      const convId = await getOrCreateConversation(db, user.uid, owner.id, item.id);
      router.push(`/messages/${convId}`);
    } catch (error: any) {
      toast({ title: "Chat failed", description: error.message, variant: "destructive" });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequest = async () => {
    if (!user) {
      toast({ title: "Please login to borrow items", variant: "destructive" });
      router.push('/login');
      return;
    }

    if (!item || !owner) return;

    setIsRequesting(true);
    try {
      const transactionData = {
        itemId: item.id,
        borrowerId: user.uid,
        ownerId: item.ownerId,
        requestedStartDate: date?.toISOString() || new Date().toISOString(),
        requestedEndDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'Pending',
        requestDate: new Date().toISOString(),
        pickupCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      };

      const transDoc = await addDoc(collection(db, 'transactions'), transactionData);
      const convId = await getOrCreateConversation(db, user.uid, item.ownerId, item.id);
      const automatedMessage = `Hi ${owner.fullName || 'there'}! I'm interested in borrowing your ${item.name}. I've sent a formal request via the app. Let me know when you're available to meet at ${item.pickupLocationAddress || 'campus'}!`;

      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: automatedMessage,
        lastMessageAt: serverTimestamp(),
        itemId: item.id,
        transactionId: transDoc.id
      });

      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId: user.uid,
        content: automatedMessage,
        sentAt: serverTimestamp(),
        isRead: false,
        participantUserIds: [user.uid, item.ownerId],
        conversationId: convId
      });
      
      toast({ title: "Request Sent!", description: "Owner notified via automated message." });
      router.push(`/borrow/success?itemId=${item.id}&ownerId=${item.ownerId}&transactionId=${transDoc.id}`);
    } catch (error: any) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!user || !item || user.uid !== item.ownerId) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'items', item.id));
      toast({ title: "Listing Deleted", description: "Your item has been removed from the marketplace." });
      router.push('/home');
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (itemLoading || ownerLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Item not found</h1>
        <Button onClick={() => router.push('/home')}>Back to Home</Button>
      </div>
    );
  }

  const isOwner = user?.uid === item.ownerId;
  const itemImg = item.photoUrls?.[0] || `https://picsum.photos/seed/${item.id}/600/400`;

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative pb-24">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button onClick={() => router.back()} className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="flex gap-2">
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-destructive hover:text-white transition-all">
                  <Trash2 className="h-5 w-5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[32px] max-w-[90%] mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black text-primary">Delete Listing?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium">
                    This action cannot be undone. This will permanently remove "{item.name}" from the campus marketplace.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col space-y-2 mt-4">
                  <AlertDialogAction 
                    onClick={handleDeleteListing}
                    className="h-14 rounded-2xl bg-destructive text-white font-black hover:bg-destructive/90"
                  >
                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Yes, Delete Gear"}
                  </AlertDialogAction>
                  <AlertDialogCancel className="h-14 rounded-2xl font-black border-none bg-muted hover:bg-muted/80">
                    Cancel
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <button className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors">
            <Share2 className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-80 overflow-hidden bg-muted">
        <Image
          src={itemImg}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-col px-6 py-6 -mt-8 bg-background rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] space-y-8 z-10 relative">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-2xl font-black font-headline text-primary tracking-tight">{item.name}</h1>
            <div className="flex gap-2">
              <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-none font-bold">
                {item.condition}
              </Badge>
              {item.isFree && (
                <Badge className="bg-green-500 text-white border-none font-bold">FREE</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-accent block">₹{item.pricePerDay || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">per day</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-5 bg-white rounded-[24px] shadow-sm border border-border/40">
          <div className="flex items-center space-x-3">
            <Avatar className="h-14 w-14 ring-4 ring-background shadow-md">
              <AvatarImage src={owner?.profilePhotoUrl} />
              <AvatarFallback className="bg-primary text-white font-bold text-lg">
                {owner?.fullName?.[0] || owner?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-primary leading-tight">{owner?.fullName || "Student Owner"}</h3>
              <div className="flex items-center space-x-1 mt-0.5">
                <div className="flex items-center bg-yellow-400/10 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                  <Star className="h-3 w-3 fill-yellow-400 mr-1" />
                  {owner?.trustScore?.toFixed(1) || "5.0"}
                </div>
                <ShieldCheck className="h-3 w-3 text-accent ml-1" />
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-accent hover:bg-accent/5 font-black text-xs uppercase tracking-widest"
            onClick={handleChat}
          >
            Chat
          </Button>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">About this gear</h2>
          <div className="p-6 bg-secondary/30 rounded-[28px] border border-secondary/50">
            <p className="text-sm text-primary/80 leading-relaxed font-medium">
              {item.description}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Pickup Location</h2>
          <div className="h-64 rounded-[32px] overflow-hidden shadow-sm border border-border/40 bg-muted/20 relative z-0">
             <MapView 
                items={[item]} 
                center={[item.latitude || 10.0274, item.longitude || 76.3288]} 
                onSelectPin={() => {}} 
             />
          </div>
          <div className="flex items-center gap-3 px-2">
             <div className="p-3 bg-accent/10 rounded-2xl">
               <MapPin className="h-5 w-5 text-accent" />
             </div>
             <div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Meeting Point</p>
                <p className="text-sm font-bold text-primary">
                  {item.pickupLocationAddress || "Software Block"}
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl p-4 border-t border-border/40 flex items-center justify-between max-w-md mx-auto z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col px-2">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Total Daily</span>
          <span className="text-2xl font-black text-primary">₹{item.pricePerDay}</span>
        </div>
        <Button 
          onClick={handleRequest}
          disabled={isRequesting || isOwner}
          className="h-14 px-10 rounded-[20px] text-md font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          {isRequesting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            isOwner ? "Manage My Listing" : "Request to Borrow"
          )}
        </Button>
      </div>
    </div>
  );
}
