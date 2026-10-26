
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, MessageCircle, MapPin, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';

export default function VerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();

  const transactionId = searchParams.get('transactionId');
  const itemId = searchParams.get('itemId');
  const ownerId = searchParams.get('ownerId');

  const transactionRef = useMemoFirebase(() => (db && transactionId) ? doc(db, 'transactions', transactionId) : null, [db, transactionId]);
  const itemRef = useMemoFirebase(() => (db && itemId) ? doc(db, 'items', itemId) : null, [db, itemId]);
  const ownerRef = useMemoFirebase(() => (db && ownerId) ? doc(db, 'users', ownerId) : null, [db, ownerId]);

  const { data: transaction, isLoading: transLoading } = useDoc(transactionRef);
  const { data: item, isLoading: itemLoading } = useDoc(itemRef);
  const { data: owner, isLoading: ownerLoading } = useDoc(ownerRef);

  if (transLoading || itemLoading || ownerLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayImage = item?.photoUrls?.[0] || "https://picsum.photos/seed/gear/400/300";

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto p-6 space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="h-6 w-6 text-primary" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold font-headline">Request Confirmed</h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2">
        <div className="h-1.5 flex-1 bg-accent rounded-full"></div>
        <div className="h-1.5 flex-1 bg-accent rounded-full"></div>
        <div className="h-1.5 flex-1 bg-accent rounded-full"></div>
      </div>

      {/* Confirmation */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-6 bg-accent/10 rounded-full animate-in zoom-in duration-500">
          <CheckCircle2 className="h-16 w-16 text-accent" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black font-headline text-primary tracking-tight">Request Sent to Owner</h2>
          <p className="text-sm text-muted-foreground px-4 leading-relaxed">
            We've notified the owner of your interest. You'll receive a notification once they approve your borrow request.
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="space-y-4 bg-white rounded-[32px] p-6 shadow-sm border border-border/40">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Order Details</p>
          <div className="flex items-center space-x-4 pt-2">
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden shadow-sm">
              <Image src={displayImage} alt={item?.name || "Item"} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-primary">{item?.name || "Professional Gear"}</h3>
              <p className="text-xs text-muted-foreground">Lending by {owner?.fullName || "Student"}</p>
            </div>
          </div>
        </div>
        
        <Separator className="bg-border/50" />

        <div className="grid grid-cols-1 gap-4">
          {/* Time */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-accent/10 rounded-xl">
              <CalendarIcon className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Requested Date</p>
              <p className="text-sm font-bold text-primary">
                {transaction?.requestedStartDate ? format(new Date(transaction.requestedStartDate), 'EEE, MMM d · h:mm a') : 'Pending Date'}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Pickup Point</p>
              <p className="text-sm font-bold text-primary truncate">
                {item?.pickupLocationAddress || "On-Campus Location"}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="bg-muted/30 px-4 py-3 rounded-2xl flex justify-between items-center">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Verification ID</span>
            <span className="text-xs font-mono font-bold text-primary">#{transaction?.pickupCode || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col space-y-4 pt-4">
        <Button 
          onClick={() => router.push("/home")} 
          className="h-16 rounded-[24px] text-lg font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Back to Home
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push("/messages")}
          className="h-16 rounded-[24px] border-border bg-white text-primary font-black hover:bg-muted/20 active:scale-95 transition-all"
        >
          <MessageCircle className="mr-2 h-5 w-5 text-accent" />
          Check Messages
        </Button>
      </div>
    </div>
  );
}
