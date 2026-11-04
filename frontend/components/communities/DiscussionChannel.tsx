'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getMessages, sendMessage } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
import type { CommunityMessage } from '@/types';

interface Props {
  communityId: string;
  isMember: boolean;
  currentUserId: string;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function DiscussionChannel({ communityId, isMember, currentUserId }: Props) {
  return <DiscussionContent key={communityId} communityId={communityId} isMember={isMember} currentUserId={currentUserId} />;
}

function mergeMessages(older: CommunityMessage[], current: CommunityMessage[]) {
  return [...new Map([...older, ...current].map(message => [message.id, message])).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

function DiscussionContent({ communityId, isMember, currentUserId }: Props) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const olderRequest = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollMode = useRef<'bottom' | 'preserve' | null>(null);
  const previousScroll = useRef({ height: 0, top: 0 });

  const fetchMessages = useCallback(async () => {
    try {
      const res = await getMessages(communityId);
      scrollMode.current = 'bottom';
      setMessages(prev => mergeMessages(res.messages, prev));
      setHasMore(res.page < res.totalPages);
      setPage(res.page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (scrollMode.current === 'preserve' && list) {
      list.scrollTop = previousScroll.current.top + list.scrollHeight - previousScroll.current.height;
    } else if (scrollMode.current === 'bottom') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    scrollMode.current = null;
  }, [messages]);

  const loadOlder = async () => {
    if (olderRequest.current) return;
    olderRequest.current = true;
    setLoadingMore(true);
    const list = listRef.current;
    if (list) previousScroll.current = { height: list.scrollHeight, top: list.scrollTop };
    scrollMode.current = 'preserve';
    try {
      const res = await getMessages(communityId, page + 1);
      setMessages(prev => mergeMessages(res.messages, prev));
      setPage(res.page);
      setHasMore(res.page < res.totalPages);
    } catch (error) {
      scrollMode.current = null;
      toast.error(getErrorMessage(error));
    } finally {
      olderRequest.current = false;
      setLoadingMore(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(communityId, content.trim());
      scrollMode.current = 'bottom';
      setMessages((prev) => mergeMessages(prev, [msg]));
      setContent('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="size-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lista de mensajes */}
      <div ref={listRef} className="flex flex-col gap-3 min-h-[200px] max-h-[500px] overflow-y-auto pr-1">
        {hasMore && (
          <button type="button" onClick={loadOlder} disabled={loadingMore}
            className="self-center text-xs text-primary hover:underline disabled:opacity-50">
            {loadingMore ? 'Cargando…' : 'Ver mensajes anteriores'}
          </button>
        )}
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="size-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm">No hay mensajes aún</p>
            {isMember && <p className="text-xs mt-1">¡Sé el primero en escribir!</p>}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials(msg.userNombre)}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-2">
                    {!isMe && <span className="text-xs font-medium">{msg.userNombre}</span>}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.createdAt), 'd MMM, HH:mm', { locale: es })}
                    </span>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isMember ? (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un mensaje…"
            className="flex-1 h-10 px-3 rounded-lg border border-input bg-transparent text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground transition-colors"
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
          >
            <Send className="size-4" />
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Únete a la comunidad para participar en la discusión
        </p>
      )}
    </div>
  );
}
