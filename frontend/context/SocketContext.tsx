'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { Message } from '@/types';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: string[];
}

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000');

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuth();
  const [socket,       setSocket]       = useState<Socket | null>(null);
  const [connected,    setConnected]    = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      setOnlineUserIds([]);
      return;
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('message:sync');
    });
    s.on('disconnect', () => { setConnected(false); setOnlineUserIds([]); });
    s.on('auth:expired', logout);
    s.on('connect_error', (err) => {
      setConnected(false);
      if (['INVALID_TOKEN', 'INVALID_USER', 'INVALID_DOMAIN', 'AUTH_REQUIRED'].includes(err.message)) logout();
    });
    s.on('message:receive', (message: Message) => {
      s.emit('message:delivered', { id: message.id });
    });
    s.on('users:online',  (ids: string[]) => setOnlineUserIds(ids));

    setSocket(s);
    s.connect();

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token, logout]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket debe usarse dentro de <SocketProvider>');
  return ctx;
}
