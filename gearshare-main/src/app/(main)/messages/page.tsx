
'use client';

import { useRouter } from 'next/navigation';
import { Search, MoreVertical, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

function ConversationRow({ chat, currentUser }: { chat: any, currentUser: any }) {
  const router = useRouter();
  const db = useFirestore();
  const otherUserId = chat.participantUserIds?.find((id: string) => id !== currentUser?.uid);
  
  const otherUserRef = useMemoFirebase(() => 
    db && otherUserId ? doc(db, 'users', otherUserId) : null, 
  [db, otherUserId]);
  const { data: otherUser, isLoading } = useDoc(otherUserRef);

  // Check for pending transaction to show notification dot
  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !chat.transactionId) return null;
    return doc(db, 'transactions', chat.transactionId);
  }, [db, chat.transactionId]);
  
  const { data: transaction } = useDoc(transactionsQuery);
  const hasPendingRequest = transaction?.status === 'Pending' && transaction?.ownerId === currentUser?.uid;

  return (
    <div
      onClick={() => router.push(`/messages/${chat.id}`)}
      className="flex items-center p-4 bg-white rounded-[24px] shadow-sm border border-border/10 hover:shadow-md transition-all cursor-pointer group relative"
    >
      <div className="relative">
        <Avatar className="h-14 w-14">
          <AvatarImage src={otherUser?.profilePhotoUrl} />
          <AvatarFallback className="bg-primary text-white">
            {otherUser?.fullName?.[0] || chat.lastMessage?.slice(0, 1).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        {hasPendingRequest && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full border-2 border-white animate-pulse" />
        )}
      </div>
      <div className="ml-4 flex-1 overflow-hidden">
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-primary truncate">
              {isLoading ? '...' : (otherUser?.fullName || 'GearShare Student')}
            </h3>
            {hasPendingRequest && (
              <span className="text-[8px] font-black bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                NEW REQUEST
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {chat.lastMessageAt?.toDate ? formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true }) : ''}
          </span>
        </div>
        <p className="text-xs truncate text-muted-foreground font-medium">
          {chat.lastMessage || 'No messages yet'}
        </p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const db = useFirestore();
  const { user } = useUser();

  const conversationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'conversations'),
      where('participantUserIds', 'array-contains', user.uid)
    );
  }, [db, user]);

  const { data: rawConversations, isLoading: loading } = useCollection(conversationsQuery);

  const conversations = rawConversations ? [...rawConversations]
    .sort((a: any, b: any) => {
      const timeA = a.lastMessageAt?.toDate?.()?.getTime() || 0;
      const timeB = b.lastMessageAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    })
    .filter((chat, index, self) => {
      const otherId = chat.participantUserIds.find((id: string) => id !== user?.uid);
      return index === self.findIndex((t) => (
        t.participantUserIds.includes(otherId) && t.participantUserIds.includes(user?.uid)
      ));
    }) : [];

  return (
    <div className="flex flex-col space-y-4 pb-20">
      <div className="p-4 bg-background sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline text-primary">Messages</h1>
        <button className="p-2 rounded-full hover:bg-muted">
          <MoreVertical className="h-6 w-6 text-primary" />
        </button>
      </div>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-10 h-12 bg-white rounded-xl shadow-sm border-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-2 opacity-50">
          <p className="font-bold text-primary">No conversations yet</p>
          <p className="text-xs">Start sharing items to chat with students!</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {conversations.map((chat: any) => (
            <ConversationRow key={chat.id} chat={chat} currentUser={user} />
          ))}
        </div>
      )}
    </div>
  );
}
