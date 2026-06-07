'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import * as authLib from '@/lib/auth';
import type { LoginData, RegisterData, User } from '@/types';

// ─── Tipos del contexto ────────────────────────────────────────────────────

interface AuthContextValue {
  user:     User | null;
  token:    string | null;
  loading:  boolean;
  login:    (data: LoginData)    => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout:   () => void;
}

// ─── Contexto ──────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restaura la sesión desde localStorage al montar el componente
  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = authLib.tokenStorage.get();
    if (stored) {
      setToken(stored);
      authLib
        .getProfile()
        .then(setUser)
        .catch(() => {
          // Token expirado o inválido — limpiar
          authLib.tokenStorage.remove();
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const res = await authLib.login(data);
    authLib.tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await authLib.register(data);
    authLib.tokenStorage.set(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authLib.tokenStorage.remove();
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
