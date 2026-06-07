'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { createEvaluation } from '@/lib/professors';
import { getErrorMessage } from '@/lib/api';
import type { Subject, Evaluation } from '@/types';
import StarRating from './StarRating';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const inputCls = cn(
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
  'placeholder:text-muted-foreground outline-none transition-colors',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
);

interface Props {
  professorId: number;
  professorNombre: string;
  subjects: Subject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (
    evaluation: Evaluation,
    stats: { avgRating: number; totalEvaluations: number }
  ) => void;
}

const SEMESTRES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function EvaluationDialog({
  professorId,
  professorNombre,
  subjects,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { user } = useAuth();

  const [rating,     setRating]     = useState(0);
  const [subjectId,  setSubjectId]  = useState('');
  const [semestre,   setSemestre]   = useState(String(user?.semestre ?? ''));
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setSubjectId('');
    setSemestre(String(user?.semestre ?? ''));
    setComment('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating)     { toast.error('Selecciona una calificación (1-5 estrellas)'); return; }
    if (!subjectId)  { toast.error('Selecciona la materia que cursaste'); return; }
    if (!semestre)   { toast.error('Selecciona tu semestre actual'); return; }

    setSubmitting(true);
    try {
      const result = await createEvaluation(professorId, {
        subjectId: parseInt(subjectId, 10),
        rating,
        comment: comment.trim(),
        semestre: parseInt(semestre, 10),
      });
      onSuccess(result.evaluation, result.professorStats);
      toast.success('¡Evaluación enviada!');
      handleOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Evaluar a {professorNombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Materia */}
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Materia <span className="text-destructive">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={inputCls}
            >
              <option value="">Selecciona la materia…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Calificación */}
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Calificación <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-3 py-1">
              <StarRating value={rating} onChange={setRating} size="lg" />
              {rating > 0 && (
                <span className="text-sm font-semibold text-amber-500">{rating}/5</span>
              )}
            </div>
          </div>

          {/* Semestre */}
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Tu semestre actual <span className="text-destructive">*</span>
            </label>
            <select
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
              className={inputCls}
            >
              <option value="">Selecciona…</option>
              {SEMESTRES.map((s) => (
                <option key={s} value={s}>{s}° Semestre</option>
              ))}
            </select>
          </div>

          {/* Comentario */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Comentario</label>
              <span className="text-xs text-muted-foreground">{comment.length}/500</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Comparte tu experiencia con este profesor…"
              className={cn(inputCls, 'resize-none')}
            />
          </div>

          {/* Tu nombre será visible */}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Tu nombre (<strong>{user?.nombre}</strong>) será visible en la evaluación.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar evaluación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
