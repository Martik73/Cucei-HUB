'use client';

import { useEffect } from 'react';
import InstitutionalBrand from '@/components/layout/InstitutionalBrand';
import InstitutionalFooter from '@/components/layout/InstitutionalFooter';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return <div className="flex min-h-dvh flex-col">
    <header className="border-b border-border bg-card px-6 py-4 sm:px-12"><InstitutionalBrand /></header>
    <div className="grid flex-1 lg:grid-cols-2">
    <section className="relative flex flex-col justify-center gap-6 overflow-hidden bg-accent px-6 py-10 sm:px-12 lg:px-16">
      <div className="relative z-10 max-w-lg"><p className="mb-4 text-sm font-bold tracking-widest text-primary">CUCEI HUB</p><h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Una comunidad.<br />Mil formas de conectar.</h1><p className="mt-5 text-base leading-relaxed text-muted-foreground">Tu próxima idea, tu equipo de estudio y esa respuesta que buscas pueden estar aquí.</p></div>
      <div className="flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-card px-4 py-2">📚 Aprende</span><span className="rounded-full bg-card px-4 py-2">💬 Comparte</span><span className="rounded-full bg-card px-4 py-2">✨ Conecta</span></div>
    </section>
    <div className="flex items-center justify-center px-4 py-8 sm:px-8">{children}</div>
    </div>
    <InstitutionalFooter />
  </div>;
}
