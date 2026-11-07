'use client';

import { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pencil } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
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
  initialPhoto?: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({ user, open, onOpenChange, initialPhoto }: Props) {
  const { updateUser } = useAuth();
  const [photo, setPhoto] = useState<File | null>(initialPhoto ?? null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!photo) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(photo);
    return () => { reader.onload = null; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [photo]);
  const changeOpen = (value: boolean) => {
    if (!value) { setPhoto(null); setPreview(''); setRemovePhoto(false); }
    onOpenChange(value);
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
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

  const bioValue = useWatch({ control, name: 'bio' }) ?? '';

  const onSubmit = async (data: FormData) => {
    try {
      const updated = await updateProfile(data, photo, removePhoto);
      updateUser(updated);
      toast.success('Perfil actualizado');
      changeOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-1">
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Seleccionar foto de perfil" title="Cambiar foto" disabled={isSubmitting} onClick={() => photoInput.current?.click()} className="relative shrink-0 cursor-pointer rounded-full ring-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring">
            <Avatar className="size-16">
              {(photo ? preview : !removePhoto && user.profilePicture) && <AvatarImage src={photo ? preview : user.profilePicture} alt="Vista previa de tu foto" />}
              <AvatarFallback>{user.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
              <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm"><Pencil className="size-3" /></span>
            </button>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium">Foto de perfil</p>
              <p className="text-xs text-muted-foreground">Pulsa la foto para cambiarla</p>
              <input ref={photoInput} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={isSubmitting} className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
                  toast.error('Elige una imagen JPG, PNG o WebP de hasta 1 MB');
                  event.target.value = ''; return;
                }
                setPhoto(file); setRemovePhoto(false);
              }} />
              <p className="text-xs text-muted-foreground">JPG, PNG o WebP · Máximo 1 MB</p>
              {(photo || (!removePhoto && user.profilePicture)) && <Button type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={() => { setPhoto(null); setPreview(''); setRemovePhoto(true); }}>Quitar foto</Button>}
            </div>
          </div>
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
              onClick={() => changeOpen(false)}
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
