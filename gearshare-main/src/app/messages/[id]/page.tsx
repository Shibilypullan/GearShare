
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Send, 
  Loader2,
  CheckCheck,
  Handshake,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  useFirestore, 
  useUser,
  useDoc, 
  useCollection,
  useMemoFirebase
} from '@/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  where,
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [inputText, setInputText] = useState('');
  const [isLending, setIsLending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationRef = useMemoFirebase(() => 
    db ? doc(db, 'conversations', conversationId) : null, 
  [db, conversationId]);
  const { data: conversation } = useDoc(conversationRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !user || !conversationId) return null;
    return query(
      collection(db, 'conversations', conversationId, 'messages'),
      where('participantUserIds', 'array-contains', user.uid)
    );
  }, [db, conversationId, user]);

  const { data: rawMessages, isLoading: messagesLoading } = useCollection(messagesQuery);

  const messages = rawMessages ? [...rawMessages].sort((a: any, b: any) => {
    const timeA = a.sentAt?.toDate?.()?.getTime() || 0;
    const timeB = b.sentAt?.toDate?.()?.getTime() || 0;
    return timeA - timeB;
  }) : [];

  const otherUserId = conversation?.participantUserIds?.find((id: string) => id !== user?.uid);
  
  const otherUserRef = useMemoFirebase(() => 
    db && otherUserId ? doc(db, 'users', otherUserId) : null, 
  [db, otherUserId]);
  const { data: otherUser } = useDoc(otherUserRef);

  const transactionRef = useMemoFirebase(() => 
    db && conversation?.transactionId ? doc(db, 'transactions', conversation.transactionId) : null,
  [db, conversation?.transactionId]);
  const { data: transaction } = useDoc(transactionRef);

  const itemRef = useMemoFirebase(() => 
    db && conversation?.itemId ? doc(db, 'items', conversation.itemId) : null,
  [db, conversation?.itemId]);
  const { data: item } = useDoc(itemRef);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (textOverride?: string) => {
    const text = textOverride || inputText;
    if (!text.trim() || !user || !db || !conversation) return;

    const messageData = {
      senderId: user.uid,
      content: text,
      sentAt: serverTimestamp(),
      isRead: false,
      participantUserIds: conversation.participantUserIds,
      conversationId: conversationId
    };

    addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
    updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp()
    });

    if (!textOverride) setInputText('');
  };

  const handleLendItem = async () => {
    if (!db || !transaction || !user || isLending) return;
    setIsLending(true);
    try {
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: 'Approved',
        approvalDate: new Date().toISOString()
      });
      
      const confirmMsg = `I've approved your request! The ${item?.name || 'gear'} is now officially lent to you. Let's coordinate the pickup!`;
      handleSendMessage(confirmMsg);

      toast({
        title: "Item Lent!",
        description: `You've successfully approved the request for ${item?.name}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error.message
      });
    } finally {
      setIsLending(false);
    }
  };

  const isOwner = user?.uid === transaction?.ownerId;
  const showLendButton = isOwner && transaction?.status === 'Pending';

  if (messagesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto relative overflow-hidden">
      <header className="flex items-center justify-between p-4 bg-white border-b border-border z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={otherUser?.profilePhotoUrl} />
                <AvatarFallback className="bg-primary text-white font-bold">{otherUser?.fullName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-sm font-bold text-primary tracking-tight">{otherUser?.fullName || 'Loading...'}</span>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/item/${conversation?.itemId || ''}`)}
          className="text-accent hover:text-accent/80 hover:bg-accent/5 font-black text-[10px] uppercase tracking-widest"
        >
          View Item
        </Button>
      </header>

      {/* Request Overlay for Owner */}
      {showLendButton && (
        <div className="bg-primary/5 border-b border-primary/10 p-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-primary/10">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-xl">
                 <Handshake className="h-5 w-5 text-primary" />
               </div>
               <div>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Borrow Request</p>
                 <p className="text-sm font-bold text-primary">{item?.name || 'Gear'}</p>
               </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleLendItem}
              disabled={isLending}
              className="bg-primary hover:bg-primary/90 text-white font-black rounded-xl text-[10px] h-9 px-4"
            >
              {isLending ? <Loader2 className="h-3 w-3 animate-spin" /> : "APPROVE & LEND"}
            </Button>
          </div>
        </div>
      )}

      {/* Request Info for Borrower */}
      {!isOwner && transaction?.status === 'Approved' && (
        <div className="bg-accent/5 border-b border-accent/10 p-3 flex items-center justify-center gap-2">
           <ShieldCheck className="h-4 w-4 text-accent" />
           <span className="text-[10px] font-black text-accent uppercase tracking-widest">OWNER HAS APPROVED YOUR REQUEST</span>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F1F5F9]"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center space-y-2">
            <p className="text-sm font-bold">No messages yet</p>
            <p className="text-[10px]">Send a message to start the conversation!</p>
          </div>
        )}
        {messages.map((msg: any) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex items-end space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                isMe ? "justify-end" : "justify-start"
              )}
            >
              {!isMe && (
                <Avatar className="h-8 w-8 mb-1">
                  <AvatarImage src={otherUser?.profilePhotoUrl} />
                  <AvatarFallback className="bg-primary text-white text-[10px]">{otherUser?.fullName?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col space-y-1 max-w-[75%]">
                <div className={cn(
                  "p-4 rounded-[24px] text-sm shadow-sm leading-relaxed",
                  isMe 
                    ? "bg-[#1E293B] text-white rounded-br-none" 
                    : "bg-white text-primary border border-border/50 rounded-bl-none"
                )}>
                  {msg.content}
                </div>
                <div className={cn(
                  "flex items-center space-x-1.5 px-2",
                  isMe ? "justify-end" : "justify-start"
                )}>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">
                    {msg.sentAt?.toDate ? format(msg.sentAt.toDate(), 'HH:mm') : ''}
                  </span>
                  {isMe && <CheckCheck className="h-3 w-3 text-accent" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-white border-t border-border flex items-center space-x-3">
        <button className="p-2.5 text-muted-foreground hover:text-primary rounded-full">
          <Plus className="h-6 w-6" />
        </button>
        <div className="flex-1 relative">
          <Input 
            placeholder="Type a message..."
            className="h-14 bg-[#F8FAFC] border-none rounded-2xl px-5 text-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
        </div>
        <button 
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim()}
          className="h-14 w-14 bg-[#22C55E] disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all active:scale-90"
        >
          <Send className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
