'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCommunity } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
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
  '',
];

const schema = z.object({
  nombre:      z.string().min(3, 'Mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  materia:     z.string().optional(),
  tema:        z.string().optional(),
  carrera:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (community: Community) => void;  // community returned from API (memberCount/materialCount may be undefined)
}

const selectCls = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors';
const inputCls  = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors placeholder:text-muted-foreground';

export default function CreateCommunityDialog({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const community = await createCommunity(data);
      toast.success('¡Comunidad creada!');
      reset();
      onCreated(community);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva comunidad</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <input {...register('nombre')} placeholder="Ej: Cálculo III — Grupo A" className={inputCls} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <textarea
              {...register('descripcion')}
              placeholder="¿De qué trata esta comunidad?"
              rows={3}
              className={`${inputCls} h-auto py-2 resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Materia</Label>
              <input {...register('materia')} placeholder="Cálculo III" className={inputCls} />
            </div>
            <div className="space-y-1">
              <Label>Tema</Label>
              <input {...register('tema')} placeholder="Integrales dobles" className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Carrera</Label>
            <select {...register('carrera')} className={selectCls}>
              <option value="">Todas las carreras</option>
              {CARRERAS.filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear comunidad'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
