'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import CreateCommunityDialog from '@/components/communities/CreateCommunityDialog';
import { getCommunities } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Community } from '@/types';

const CARRERAS = [
  'Ingeniería en Computación',
  'Ingeniería Industrial',
  'Ingeniería en Electrónica y Computación',
  'Ingeniería Biomédica',
  'Ingeniería Mecánica Eléctrica',
  'Licenciatura en Física',
  'Licenciatura en Matemáticas',
  'Otra',
];

const inputCls = cn(
  'h-10 rounded-lg border border-input bg-transparent px-3 text-sm',
  'placeholder:text-muted-foreground outline-none transition-colors',
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
);

const selectCls = cn(
  'h-9 rounded-lg border border-input bg-transparent px-3 text-sm',
  'outline-none transition-colors',
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
);

function CommunitiesContent() {
  const router = useRouter();
  const [communities, setCommunities]   = useState<Community[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [debounced, setDebounced]       = useState('');
  const [materiaFilter, setMateriaFilter] = useState('');
  const [carreraFilter, setCarreraFilter] = useState('');
  const [showCreate, setShowCreate]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCommunities({
        search:   debounced   || undefined,
        materia:  materiaFilter || undefined,
        carrera:  carreraFilter || undefined,
      });
      setCommunities(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debounced, materiaFilter, carreraFilter]);

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

  const hasFilters = debounced || materiaFilter || carreraFilter;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h1 className="text-xl font-bold">Comunidades</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> Crear comunidad
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, materia o tema…"
            className={cn(inputCls, 'pl-9 w-full')}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={materiaFilter}
            onChange={(e) => setMateriaFilter(e.target.value)}
            placeholder="Filtrar por materia"
            className={cn(selectCls, 'min-w-[160px]')}
          />
          <select value={carreraFilter} onChange={(e) => setCarreraFilter(e.target.value)} className={selectCls}>
            <option value="">Todas las carreras</option>
            {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setMateriaFilter(''); setCarreraFilter(''); }}
              className="text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2 animate-pulse">
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="flex gap-3 mt-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="size-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm font-medium">No se encontraron comunidades</p>
          {hasFilters
            ? <p className="text-xs mt-1">Prueba con otros filtros</p>
            : <p className="text-xs mt-1">¡Crea la primera comunidad!</p>
          }
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {communities.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/communities/${c.id}`)}
              className="text-left rounded-xl border bg-card hover:bg-accent/40 p-4 space-y-2 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.nombre}</p>
                  {c.materia && <p className="text-xs text-primary font-medium truncate">{c.materia}</p>}
                </div>
                {c.isMember && (
                  <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 shrink-0 font-medium">
                    Miembro
                  </span>
                )}
              </div>

              {c.descripcion && (
                <p className="text-xs text-muted-foreground line-clamp-2">{c.descripcion}</p>
              )}

              {(c.carrera || c.tema) && (
                <div className="flex flex-wrap gap-1">
                  {c.carrera && (
                    <span className="text-xs bg-muted rounded-full px-2 py-0.5 truncate max-w-[180px]">{c.carrera}</span>
                  )}
                  {c.tema && (
                    <span className="text-xs bg-muted rounded-full px-2 py-0.5">{c.tema}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><Users className="size-3" />{c.memberCount} miembros</span>
                <span className="flex items-center gap-1"><BookOpen className="size-3" />{c.materialCount} materiales</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateCommunityDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { fetchCommunities(); }}
      />
    </div>
  );
}

export default function CommunitiesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CommunitiesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
