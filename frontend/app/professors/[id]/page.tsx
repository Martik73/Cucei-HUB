'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import StarRating from '@/components/professors/StarRating';
import EvaluationDialog from '@/components/professors/EvaluationDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getProfessor, getEvaluations } from '@/lib/professors';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Professor, Evaluation, Subject } from '@/types';

const SEMESTRES = Array.from({ length: 12 }, (_, i) => i + 1);

function initials(nombre: string) {
  return nombre.split(' ').filter(w => !/^(Dr|Dra|M\.C|Mtro|Mtra)\.?$/i.test(w)).slice(0, 2).map(n => n[0]).join('').toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

const selectCls = cn(
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs',
  'outline-none transition-colors',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
);

interface EvalState {
  list: Evaluation[];
  total: number;
  page: number;
  totalPages: number;
}

function ProfessorDetailContent() {
  const params = useParams();
  const router = useRouter();
  const profId = Number(params.id);

  const [professor,    setProfessor]    = useState<Professor | null>(null);
  const [evalState,    setEvalState]    = useState<EvalState>({ list: [], total: 0, page: 1, totalPages: 1 });
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [evalOpen,     setEvalOpen]     = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [semestreFilter, setSemestreFilter] = useState('');

  const loadEvaluations = useCallback(async (page: number, subj: string, sem: string, replace = true) => {
    if (page > 1) setLoadingMore(true);
    try {
      const data = await getEvaluations(profId, {
        subject:  subj ? parseInt(subj,  10) : undefined,
        semestre: sem  ? parseInt(sem,   10) : undefined,
        page,
      });
      setEvalState((prev) => ({
        list: replace ? data.evaluations : [...prev.list, ...data.evaluations],
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
      }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [profId]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getProfessor(profId),
      getEvaluations(profId, { page: 1 }),
    ])
      .then(([prof, evals]) => {
        setProfessor(prof);
        setEvalState({ list: evals.evaluations, total: evals.total, page: 1, totalPages: evals.totalPages });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [profId]);

  // Re-fetch evaluations when filters change (skip initial load)
  const [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    if (!filtersReady) { setFiltersReady(true); return; }
    loadEvaluations(1, subjectFilter, semestreFilter, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, semestreFilter]);

  const handleEvalSuccess = (
    newEval: Evaluation,
    stats: { avgRating: number; totalEvaluations: number }
  ) => {
    setProfessor((prev) => prev ? { ...prev, ...stats } : prev);
    setEvalState((prev) => ({ ...prev, list: [newEval, ...prev.list], total: prev.total + 1 }));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="flex gap-4 items-start">
          <div className="size-16 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
            <div className="h-5 w-28 bg-muted rounded mt-2" />
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Profesor no encontrado
      </div>
    );
  }

  const subjects: Subject[] = professor.subjects ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/professors')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Volver a profesores
      </button>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex gap-4 items-start">
          <Avatar className="size-16 text-xl shrink-0">
            <AvatarFallback>{initials(professor.nombre)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">{professor.nombre}</h1>
            <p className="text-sm text-muted-foreground">{professor.departamento}</p>

            <div className="flex items-center gap-2 mt-2">
              <StarRating value={professor.avgRating} size="md" />
              <span className="text-base font-bold">
                {professor.totalEvaluations > 0 ? professor.avgRating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-muted-foreground">
                / 5 · {professor.totalEvaluations} evaluación{professor.totalEvaluations !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Subject badges */}
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {subjects.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {s.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button
            onClick={() => setEvalOpen(true)}
            className="w-full sm:w-auto"
          >
            <MessageSquare className="size-4 mr-1.5" />
            Evaluar a este profesor
          </Button>
        </div>
      </div>

      {/* Evaluations section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold">
            Evaluaciones ({evalState.total})
          </h2>

          {/* Filters */}
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
                <option key={s} value={s}>{s}° Sem.</option>
              ))}
            </select>
          </div>
        </div>

        {evalState.list.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {subjectFilter || semestreFilter
              ? 'Sin evaluaciones para estos filtros'
              : 'Sé el primero en evaluar a este profesor'}
          </div>
        ) : (
          <>
            {evalState.list.map((ev) => (
              <EvaluationCard key={ev.id} evaluation={ev} />
            ))}

            {evalState.page < evalState.totalPages && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => loadEvaluations(evalState.page + 1, subjectFilter, semestreFilter, false)}
                >
                  {loadingMore ? 'Cargando…' : 'Ver más evaluaciones'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <EvaluationDialog
        professorId={professor.id}
        professorNombre={professor.nombre}
        subjects={subjects}
        open={evalOpen}
        onOpenChange={setEvalOpen}
        onSuccess={handleEvalSuccess}
      />
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  function evalInitials(nombre: string) {
    return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs">{evalInitials(evaluation.studentNombre)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{evaluation.studentNombre}</p>
            <p className="text-xs text-muted-foreground truncate">
              {evaluation.subjectNombre} · Semestre {evaluation.semestre} ·{' '}
              {format(new Date(evaluation.createdAt), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <StarRating value={evaluation.rating} size="sm" className="shrink-0" />
      </div>

      {evaluation.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed pl-10">
          &ldquo;{evaluation.comment}&rdquo;
        </p>
      )}
    </div>
  );
}

export default function ProfessorDetailPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ProfessorDetailContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
