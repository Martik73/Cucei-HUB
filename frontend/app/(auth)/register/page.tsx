'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { getRegistrationOptions } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const schema = z
  .object({
    nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'El correo es requerido')
      .email('Correo inválido')
      .endsWith('@alumnos.udg.mx', 'Debe ser un correo @alumnos.udg.mx'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
    carrera: z.string().min(1, 'Selecciona una carrera'),
    semestre: z.number({ message: 'Selecciona un semestre' }).int().min(1, 'Selecciona un semestre').max(12),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const selectCls = cn(
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base',
  'transition-colors outline-none',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
  'md:text-sm dark:bg-input/30'
);

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<{ carreras: string[]; maxSemestre: number } | null>(null);
  const [optionsError, setOptionsError] = useState(false);
  const loadOptions = useCallback(async () => {
    setOptionsError(false);
    try {
      setOptions(await getRegistrationOptions());
    } catch {
      setOptionsError(true);
    }
  }, []);
  useEffect(() => { void loadOptions(); }, [loadOptions]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ nombre, email, password, carrera, semestre }: FormData) => {
    if (!options) return;
    const data = { nombre, email, password, carrera, semestre };
    setSubmitting(true);
    try {
      await authRegister(data);
      router.replace('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          toast.error('Este correo ya está registrado');
        } else if (!err.response) {
          toast.error('No se pudo conectar al servidor');
        } else {
          toast.error(getErrorMessage(err));
        }
      } else {
        toast.error('Error inesperado');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>Regístrate con tu correo @alumnos.udg.mx</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Juan Pérez"
                aria-invalid={!!errors.nombre || undefined}
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo institucional</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@alumnos.udg.mx"
                aria-invalid={!!errors.email || undefined}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                aria-invalid={!!errors.password || undefined}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                aria-invalid={!!errors.confirmPassword || undefined}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="carrera">Carrera</Label>
              <select
                id="carrera"
                className={selectCls}
                {...register('carrera')}
              >
                <option value="">Selecciona tu carrera</option>
                {options?.carreras.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.carrera && (
                <p className="text-xs text-destructive">{errors.carrera.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="semestre">Semestre</Label>
              <select
                id="semestre"
                className={selectCls}
                {...register('semestre', { valueAsNumber: true })}
              >
                <option value="">Selecciona tu semestre</option>
                {Array.from({ length: options?.maxSemestre ?? 0 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    {s}° semestre
                  </option>
                ))}
              </select>
              {errors.semestre && (
                <p className="text-xs text-destructive">{errors.semestre.message}</p>
              )}
            </div>
          </form>
          {!options && (
            <p className="mt-3 text-sm" role="status">
              {optionsError ? 'No se pudieron cargar las opciones de registro. Comprueba que el backend esté iniciado.' : 'Cargando opciones de registro…'}
              {optionsError && <button type="button" onClick={loadOptions} className="ml-1 underline">Reintentar</button>}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            form="register-form"
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || !options}
          >
            {submitting ? 'Registrando...' : 'Crear cuenta'}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
