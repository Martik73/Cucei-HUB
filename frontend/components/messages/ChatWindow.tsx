'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { getHistory } from '@/lib/messages';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export interface ChatPartner {
  id: string;
  nombre: string;
  carrera: string;
  email: string;
}

interface Props {
  partner: ChatPartner;
  onBack: () => void;
}

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function msgTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return `Ayer ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM HH:mm');
}

// Merge history and live delivery by database ID so reconnect replay cannot duplicate bubbles.
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) {
    const previous = byId.get(message.id);
    byId.set(message.id, { ...previous, ...message,
      read: !!(previous?.read || message.read),
      deliveredAt: previous?.deliveredAt || message.deliveredAt,
    });
  }
  return [...byId.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export default function ChatWindow({ partner, onBack }: Props) {
  const { user } = useAuth();
  const { socket, connected, onlineUserIds } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receivedTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestVersion = useRef(0);
  const pendingOptId = useRef<string | null>(null);
  const invalidateHistory = useCallback(() => { requestVersion.current++; }, []);

  const loadHistory = useCallback(async (p: number, prepend = false) => {
    const version = ++requestVersion.current;
    if (prepend) setLoadingMore(true);
    try {
      const data = await getHistory(partner.id, p);
      if (version !== requestVersion.current) return;
      setMessages(prev => mergeMessages(data.messages, prev));
      for (const message of data.messages) {
        if (message.receiverId === user?.id) socket?.emit('message:delivered', { id: message.id });
      }
      if (socket?.connected && document.visibilityState === 'visible') socket.emit('message:read', { senderId: partner.id });
      setHasMore(p < data.totalPages);
      setPage(p);
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally {
      if (version === requestVersion.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [partner.id, user?.id, socket]);

  useEffect(() => {
    loadHistory(1);
    return invalidateHistory;
  }, [loadHistory, invalidateHistory]);

  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping, loadingMore]);

  useEffect(() => {
    if (!socket) return;
    const onReceive = (message: Message) => {
      if (message.senderId !== partner.id) return;
      setMessages(prev => mergeMessages(prev, [message]));
      setPartnerTyping(false);
      if (document.visibilityState === 'visible') socket.emit('message:read', { senderId: partner.id });
    };
    const onSent = (message: Message) => {
      if (message.receiverId === partner.id) setMessages(prev => mergeMessages(prev, [message]));
    };
    const onTyping = (data: { senderId: string; isTyping: boolean }) => {
      if (data.senderId !== partner.id) return;
      setPartnerTyping(data.isTyping);
      if (receivedTypingTimer.current) clearTimeout(receivedTypingTimer.current);
      receivedTypingTimer.current = setTimeout(() => setPartnerTyping(false), 3000);
    };
    const onDelivered = (data: { id: string; deliveredAt: string }) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, deliveredAt: data.deliveredAt } : m));
    };
    const onRead = ({ readBy }: { readBy: string }) => {
      if (readBy === partner.id) setMessages(prev => prev.map(m =>
        m.senderId === user?.id && !m.id.startsWith('pending-') ? { ...m, read: true } : m));
    };
    const onDisconnect = () => setPartnerTyping(false);
    const onReconnect = () => { loadHistory(1); };
    const onError = ({ message }: { message: string }) => toast.error(message);
    const onVisible = () => {
      if (socket.connected && document.visibilityState === 'visible') socket.emit('message:read', { senderId: partner.id });
    };
    document.addEventListener('visibilitychange', onVisible);
    socket.on('message:receive', onReceive);
    socket.on('message:sent', onSent);
    socket.on('message:typing', onTyping);
    socket.on('message:delivered', onDelivered);
    socket.on('message:read', onRead);
    socket.on('message:error', onError);
    socket.on('connect', onReconnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      socket.off('message:receive', onReceive);
      socket.off('message:sent', onSent);
      socket.off('message:typing', onTyping);
      socket.off('message:delivered', onDelivered);
      socket.off('message:read', onRead);
      socket.off('message:error', onError);
      socket.off('connect', onReconnect);
      socket.off('disconnect', onDisconnect);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (receivedTypingTimer.current) clearTimeout(receivedTypingTimer.current);
      if (socket.connected) socket.volatile.emit('message:typing', { receiverId: partner.id, isTyping: false });
    };
  }, [socket, partner.id, user?.id, loadHistory]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000 || !socket?.connected || sending || pendingOptId.current) return;
    const optId = 'pending-' + crypto.randomUUID();
    pendingOptId.current = optId;
    setMessages(prev => [...prev, {
      id: optId, senderId: user!.id, receiverId: partner.id, content: trimmed,
      read: false, deliveredAt: null, createdAt: new Date().toISOString(),
    }]);
    setContent('');
    setSending(true);
    socket.timeout(10000).emit('message:send', { receiverId: partner.id, content: trimmed },
      (error: Error | null, result?: { ok: boolean; message?: Message; error?: string }) => {
        setMessages(prev => {
          const remaining = prev.filter(m => m.id !== optId);
          return result?.message ? mergeMessages(remaining, [result.message]) : remaining;
        });
        pendingOptId.current = null;
        setSending(false);
        if (error) {
          toast.error('No se pudo confirmar el envío. Revisa el historial antes de volver a enviarlo.');
          loadHistory(1);
        } else if (!result?.ok) {
          setContent(current => current || trimmed);
          toast.error(result?.error || 'No se pudo enviar el mensaje');
        }
      });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    socket.volatile.emit('message:typing', { receiverId: partner.id, isTyping: false });
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!socket?.connected) return;
    socket.volatile.emit('message:typing', { receiverId: partner.id, isTyping: !!e.target.value.trim() });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.volatile.emit('message:typing', { receiverId: partner.id, isTyping: false });
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button
          onClick={onBack}
          className="md:hidden rounded-md p-1 hover:bg-muted transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Avatar>
          <AvatarFallback>{initials(partner.nombre)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold leading-tight">{partner.nombre}</p>
          <p className="text-xs text-muted-foreground">{!connected ? 'Reconectando…' : onlineUserIds.includes(partner.id) ? 'En línea' : 'Desconectado'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Load older messages */}
        {hasMore && (
          <div className="text-center pb-2">
            <button
              onClick={() => loadHistory(page + 1, true)}
              disabled={loadingMore}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Cargando…' : 'Ver mensajes anteriores'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 pt-4">
            {[40, 60, 45, 70, 35].map((w, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <div
                  className="h-8 rounded-2xl bg-muted animate-pulse"
                  style={{ width: `${w}%`, maxWidth: '280px' }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center">
              Sin mensajes aún.<br />¡Empieza la conversación!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine      = msg.senderId === user?.id;
            const isOptimistic = msg.id.startsWith('pending-');
            const prev         = messages[idx - 1];
            const next         = messages[idx + 1];
            const sameAsPrev   = prev?.senderId === msg.senderId;
            const sameAsNext   = next?.senderId === msg.senderId;

            // Show timestamp for last message in a group
            const showTime = !sameAsNext;

            return (
              <div
                key={`${msg.id}-${idx}`}
                className={cn('flex', isMine ? 'justify-end' : 'justify-start', sameAsPrev ? 'mt-0.5' : 'mt-3')}
              >
                <div className={cn('max-w-[72%] flex flex-col', isMine ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'px-3 py-2 text-sm leading-relaxed break-words',
                      isMine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                      // Rounded corners based on message group position
                      isMine ? [
                        'rounded-2xl rounded-br-sm',
                        sameAsNext && 'rounded-br-2xl',
                        sameAsPrev && 'rounded-tr-2xl',
                      ] : [
                        'rounded-2xl rounded-bl-sm',
                        sameAsNext && 'rounded-bl-2xl',
                        sameAsPrev && 'rounded-tl-2xl',
                      ],
                      isOptimistic && 'opacity-60'
                    )}
                  >
                    {msg.content}
                  </div>
                  {showTime && (
                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {msgTime(msg.createdAt)}{isMine && (' · ' + (isOptimistic ? 'Enviando…' : msg.read ? 'Leído' : msg.deliveredAt ? 'Entregado' : 'Enviado'))}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex justify-start mt-3">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
              <span className="flex gap-1 items-center" role="status" aria-label="Escribiendo">
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:160ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:320ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3 bg-background">
        <div className="flex items-end gap-2">
          <textarea
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje…"
            rows={1}
            maxLength={2000}
            aria-label="Mensaje"
            className={cn(
              'flex-1 resize-none rounded-2xl border border-input bg-transparent px-3 py-2 text-sm',
              'placeholder:text-muted-foreground outline-none transition-colors',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'max-h-32 overflow-y-auto dark:bg-input/30'
            )}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!content.trim() || !connected || sending}
            className="shrink-0 rounded-full size-9"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {connected ? 'Enter para enviar · Shift+Enter para nueva línea' : 'Sin conexión. Tu borrador se conserva mientras reconectamos.'}
        </p>
      </div>
    </div>
  );
}
