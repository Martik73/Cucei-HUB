'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import StarRating from '@/components/professors/StarRating';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getProfessors, getSubjects } from '@/lib/professors';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Professor, Subject } from '@/types';

const SEMESTRES = Array.from({ length: 12 }, (_, i) => i + 1);

function initials(nombre: string) {
  return nombre.split(' ').filter(w => !/^(Dr|Dra|M\.C|Mtro|Mtra)\.?$/i.test(w)).slice(0, 2).map(n => n[0]).join('').toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

const selectCls = cn(
  'h-9 rounded-lg border border-input bg-transparent px-3 text-sm',
  'outline-none transition-colors',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
);

function ProfessorsContent() {
  const router = useRouter();

  const [professors,     setProfessors]     = useState<Professor[]>([]);
  const [subjects,       setSubjects]       = useState<Subject[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subjectFilter,  setSubjectFilter]  = useState('');
  const [semestreFilter, setSemestreFilter] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load subjects once
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
  }, []);

  // Fetch professors on filter change
  const fetchProfessors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfessors({
        search:   debouncedSearch || undefined,
        subject:  subjectFilter  ? parseInt(subjectFilter,  10) : undefined,
        semestre: semestreFilter ? parseInt(semestreFilter, 10) : undefined,
      });
      setProfessors(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, subjectFilter, semestreFilter]);

  useEffect(() => { fetchProfessors(); }, [fetchProfessors]);

  const hasFilters = debouncedSearch || subjectFilter || semestreFilter;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GraduationCap className="size-5 text-primary shrink-0" />
        <h1 className="text-xl font-bold">Evaluación Docente</h1>
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar profesor por nombre…"
            className={cn(
              'w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-transparent text-sm',
              'placeholder:text-muted-foreground outline-none transition-colors',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
            )}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">Todas las materias</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>

          <select
            value={semestreFilter}
            onChange={(e) => setSemestreFilter(e.target.value)}
            className={selectCls}
          >
            <option value="">Todos los semestres</option>
            {SEMESTRES.map((s) => (
              <option key={s} value={s}>{s}° Semestre</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setSubjectFilter(''); setSemestreFilter(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border animate-pulse">
              <div className="size-12 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : professors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="size-10 mx-auto opacity-30 mb-3" />
          <p className="text-sm font-medium">No se encontraron profesores</p>
          {hasFilters && (
            <p className="text-xs mt-1">Prueba con otros filtros</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            {professors.length} profesor{professors.length !== 1 ? 'es' : ''}
          </p>
          {professors.map((prof) => (
            <button
              key={prof.id}
              onClick={() => router.push(`/professors/${prof.id}`)}
              className="w-full text-left flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/40 transition-colors"
            >
              <Avatar className="size-12 shrink-0">
                <AvatarFallback className="text-base">{initials(prof.nombre)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{prof.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{prof.departamento}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRating value={prof.avgRating} size="sm" />
                  <span className="text-xs font-semibold">
                    {prof.totalEvaluations > 0 ? prof.avgRating.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({prof.totalEvaluations} evaluación{prof.totalEvaluations !== 1 ? 'es' : ''})
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfessorsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ProfessorsContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
