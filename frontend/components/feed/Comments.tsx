'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getComments, addComment } from '@/lib/posts';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

interface Props {
  postId: number;
  onCommentAdded: () => void;
}

export default function Comments({ postId, onCommentAdded }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (p: number, append = false) => {
      if (p > 1) setLoadingMore(true);
      try {
        const data = await getComments(postId, p);
        setComments((prev) => (append ? [...prev, ...data.comments] : data.comments));
        setHasMore(p < data.totalPages);
        setPage(p);
      } catch {
        toast.error('No se pudieron cargar los comentarios');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const comment = await addComment(postId, trimmed);
      // Enrich with current user data
      const enriched: Comment = {
        ...comment,
        authorNombre: user?.nombre ?? 'Tú',
      };
      setComments((prev) => [enriched, ...prev]);
      setContent('');
      onCommentAdded();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = cn(
    'flex-1 h-8 min-w-0 rounded-lg border border-input bg-transparent px-3 text-sm',
    'placeholder:text-muted-foreground outline-none transition-colors',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    'dark:bg-input/30'
  );

  return (
    <div className="space-y-3">
      {/* Input */}
      {user && (
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{initials(user.nombre)}</AvatarFallback>
          </Avatar>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Escribe un comentario…"
            className={inputCls}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            {submitting ? '…' : 'Comentar'}
          </Button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="size-6 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1 pt-0.5">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Sin comentarios aún. ¡Sé el primero!
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Avatar size="sm">
                <AvatarFallback>{initials(c.authorNombre ?? 'U')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-medium">{c.authorNombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          onClick={() => load(page + 1, true)}
          disabled={loadingMore}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 text-center disabled:opacity-50"
        >
          {loadingMore ? 'Cargando…' : 'Ver más comentarios'}
        </button>
      )}
    </div>
  );
}
