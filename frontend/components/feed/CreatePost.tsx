'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { createPost } from '@/lib/posts';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Post, PostType, PostCategory } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'duda', label: 'Duda' },
  { value: 'evento', label: 'Evento' },
  { value: 'trabajo', label: 'Trabajo' },
];

const selectCls = cn(
  'h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none',
  'focus-visible:border-ring transition-colors text-muted-foreground',
  'dark:bg-input/30'
);

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

interface Props {
  onPostCreated: (post: Post) => void;
}

export default function CreatePost({ onPostCreated }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('general');
  const [category, setCategory] = useState<PostCategory>('general');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const post = await createPost({ content: trimmed, type, category });
      // Enrich with current user data (API only returns basic post)
      onPostCreated({
        ...post,
        authorNombre: user!.nombre,
        authorCarrera: user!.carrera,
        reactionCount: 0,
        commentCount: 0,
        userReaction: null,
      });
      setContent('');
      toast.success('Publicación creada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5">
          <AvatarFallback>{initials(user.nombre)}</AvatarFallback>
        </Avatar>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder={`¿Qué quieres compartir, ${user.nombre.split(' ')[0]}?`}
          rows={3}
          className={cn(
            'flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
            'placeholder:text-muted-foreground outline-none transition-colors',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'dark:bg-input/30'
          )}
        />
      </div>

      <div className="flex items-center gap-2 pl-11 flex-wrap">
        {/* Type selector */}
        <div className="flex items-center gap-0.5 rounded-lg border border-input p-0.5">
          {(['general', 'carrera'] as PostType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                type === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'general' ? 'General' : 'Mi Carrera'}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PostCategory)}
          className={selectCls}
        >
          {CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="ml-auto"
        >
          {submitting ? 'Publicando…' : 'Publicar'}
        </Button>
      </div>
    </div>
  );
}
