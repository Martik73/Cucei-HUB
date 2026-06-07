'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/users';
import { getErrorMessage } from '@/lib/api';
import type { User } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const schema = z.object({
  nombre:   z.string({ message: 'El nombre es requerido' }).trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  bio:      z.string().max(300, 'Máximo 300 caracteres'),
  semestre: z.number({ message: 'Selecciona un semestre' }).int().min(1).max(12),
});

type FormData = z.infer<typeof schema>;

const inputCls = cn(
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
  'placeholder:text-muted-foreground outline-none transition-colors',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:opacity-50 disabled:cursor-not-allowed'
);

interface Props {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({ user, open, onOpenChange }: Props) {
  const { updateUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:   user.nombre,
      bio:      user.bio || '',
      semestre: user.semestre,
    },
  });

  useEffect(() => {
    reset({
      nombre:   user.nombre,
      bio:      user.bio || '',
      semestre: user.semestre,
    });
  }, [user, reset]);

  const bioValue = watch('bio') ?? '';

  const onSubmit = async (data: FormData) => {
    try {
      const updated = await updateProfile(data);
      updateUser(updated);
      toast.success('Perfil actualizado');
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-1">
          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Nombre completo</label>
            <input
              {...register('nombre')}
              placeholder="Tu nombre completo"
              className={inputCls}
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Bio</label>
              <span className="text-xs text-muted-foreground">{bioValue.length}/300</span>
            </div>
            <textarea
              {...register('bio')}
              rows={3}
              placeholder="Cuéntanos un poco sobre ti…"
              className={cn(inputCls, 'resize-none')}
            />
            {errors.bio && (
              <p className="text-xs text-destructive">{errors.bio.message}</p>
            )}
          </div>

          {/* Semestre */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Semestre</label>
            <select
              {...register('semestre', { valueAsNumber: true })}
              className={inputCls}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>{s}° Semestre</option>
              ))}
            </select>
            {errors.semestre && (
              <p className="text-xs text-destructive">{errors.semestre.message}</p>
            )}
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Carrera</label>
              <input value={user.carrera} disabled className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Correo</label>
              <input value={user.email} disabled className={cn(inputCls, 'truncate')} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
