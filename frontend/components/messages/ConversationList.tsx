'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, X } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { getConversations, searchUsers } from '@/lib/messages';
import { cn } from '@/lib/utils';
import type { Conversation, Message, SearchUser } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface ChatPartner {
  id: number;
  nombre: string;
  carrera: string;
  email: string;
}

interface Props {
  activeUserId: number | null;
  onSelect: (partner: ChatPartner) => void;
}

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function ConversationList({ activeUserId, onSelect }: Props) {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [results,       setResults]       = useState<SearchUser[]>([]);
  const [searching,     setSearching]     = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Update conversation list when a new message arrives
  useEffect(() => {
    if (!socket) return;

    const handle = (msg: Message) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.userId === msg.senderId);
        if (idx === -1) {
          // New conversation — reload to get user metadata
          loadConversations();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastContent:    msg.content,
          lastCreatedAt:  msg.createdAt,
          lastSenderId:   msg.senderId,
          lastRead:       0,
          unreadCount:    (updated[idx].unreadCount ?? 0) + 1,
        };
        // Bubble to top
        const [item] = updated.splice(idx, 1);
        return [item, ...updated];
      });
    };

    socket.on('message:receive', handle);
    return () => { socket.off('message:receive', handle); };
  }, [socket, loadConversations]);

  // Debounced user search
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchUsers(search));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSelectConv = (conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => c.userId === conv.userId ? { ...c, unreadCount: 0 } : c)
    );
    onSelect({ id: conv.userId, nombre: conv.nombre, carrera: conv.carrera, email: conv.email });
  };

  const handleSelectUser = (u: SearchUser) => {
    setSearch('');
    setResults([]);
    onSelect({ id: u.id, nombre: u.nombre, carrera: u.carrera, email: u.email });
  };

  const inputCls = cn(
    'w-full h-8 pl-8 pr-8 rounded-lg border border-input bg-transparent text-sm',
    'placeholder:text-muted-foreground outline-none transition-colors',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header + search */}
      <div className="shrink-0 p-4 border-b border-border space-y-3">
        <h2 className="font-semibold">Mensajes</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar personas…"
            className={inputCls}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setResults([]); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search results */}
        {search.trim() && (
          <>
            <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">Personas</p>
            {searching ? (
              <p className="px-4 py-2 text-xs text-muted-foreground">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-2 text-xs text-muted-foreground">Sin resultados</p>
            ) : results.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
              >
                <Avatar size="sm">
                  <AvatarFallback>{initials(u.nombre)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.carrera}</p>
                </div>
              </button>
            ))}
            <div className="mx-4 my-2 border-t border-border" />
            <p className="px-4 pb-1 text-xs font-medium text-muted-foreground">Conversaciones recientes</p>
          </>
        )}

        {/* Conversation list */}
        {loading ? (
          <div className="p-2 space-y-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5 animate-pulse">
                <div className="size-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-3 w-36 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          !search.trim() && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Sin conversaciones aún.<br />Busca a alguien para escribirle.
            </p>
          )
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.userId}
              onClick={() => handleSelectConv(conv)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                activeUserId === conv.userId
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/60'
              )}
            >
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback>{initials(conv.nombre)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-sm font-medium truncate">{conv.nombre}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(conv.lastCreatedAt), { locale: es })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground truncate">{conv.lastContent}</p>
                  {conv.unreadCount > 0 && (
                    <span className="shrink-0 flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
