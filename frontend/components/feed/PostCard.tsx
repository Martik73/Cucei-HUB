'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { reactToPost, updatePost, deletePost } from '@/lib/posts';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Post, ReactionType } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Comments from './Comments';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like',      emoji: '👍', label: 'Me gusta'  },
  { type: 'love',      emoji: '❤️', label: 'Me encanta' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrar'   },
];

const CATEGORY_BADGE: Record<string, string> = {
  duda:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  evento:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  trabajo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  general: '',
};

const CATEGORY_LABEL: Record<string, string> = {
  duda: 'Duda', evento: 'Evento', trabajo: 'Trabajo', general: 'General',
};

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

interface Props {
  post: Post;
  onDelete: (postId: number) => void;
  onUpdate: (post: Post) => void;
}

export default function PostCard({ post, onDelete, onUpdate }: Props) {
  const { user } = useAuth();

  // Local reaction state for optimistic updates
  const [reactionCount, setReactionCount] = useState(post.reactionCount ?? 0);
  const [userReaction, setUserReaction]   = useState<ReactionType | null>(post.userReaction ?? null);
  const [commentCount, setCommentCount]   = useState(post.commentCount ?? 0);

  const [showComments, setShowComments] = useState(false);
  const [isEditing,    setIsEditing]    = useState(false);
  const [editContent,  setEditContent]  = useState(post.content);
  const [savingEdit,   setSavingEdit]   = useState(false);

  const isAuthor = user?.id === post.authorId;

  const handleReact = async (type: ReactionType) => {
    const prevCount    = reactionCount;
    const prevReaction = userReaction;

    // Optimistic update
    if (userReaction === type) {
      setUserReaction(null);
      setReactionCount((c) => Math.max(0, c - 1));
    } else if (userReaction === null) {
      setUserReaction(type);
      setReactionCount((c) => c + 1);
    } else {
      setUserReaction(type); // count stays the same (changed type)
    }

    try {
      await reactToPost(post.id, type);
    } catch (err) {
      setUserReaction(prevReaction);
      setReactionCount(prevCount);
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(post.id);
      onDelete(post.id);
      toast.success('Publicación eliminada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed) { setIsEditing(false); return; }
    if (trimmed === post.content) { setIsEditing(false); return; }
    setSavingEdit(true);
    try {
      const updated = await updatePost(post.id, { content: trimmed });
      onUpdate({ ...post, content: updated.content, updatedAt: updated.updatedAt });
      setIsEditing(false);
      toast.success('Publicación editada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  return (
    <article className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="shrink-0">
              <AvatarFallback>{initials(post.authorNombre ?? 'U')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium">{post.authorNombre}</span>
                {post.type === 'carrera' ? (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md shrink-0">
                    {post.carrera}
                  </span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md shrink-0">
                    General
                  </span>
                )}
                {post.category !== 'general' && CATEGORY_BADGE[post.category] && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-md shrink-0', CATEGORY_BADGE[post.category])}>
                    {CATEGORY_LABEL[post.category]}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {post.authorCarrera}
                {post.authorCarrera && ' · '}
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>

          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              className={cn(
                'w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
                'placeholder:text-muted-foreground outline-none transition-colors',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'dark:bg-input/30'
              )}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingEdit}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
        )}
      </div>

      {/* Action bar */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-1">
        {/* Reaction buttons */}
        {REACTIONS.map(({ type, emoji, label }) => (
          <button
            key={type}
            onClick={() => handleReact(type)}
            title={label}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors',
              userReaction === type
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {emoji}
          </button>
        ))}

        {reactionCount > 0 && (
          <span className="text-xs text-muted-foreground ml-0.5 tabular-nums">{reactionCount}</span>
        )}

        <div className="flex-1" />

        {/* Comments toggle */}
        <button
          onClick={() => setShowComments((s) => !s)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
            showComments
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <MessageCircle className="size-3.5" />
          {commentCount > 0 ? `${commentCount} comentario${commentCount !== 1 ? 's' : ''}` : 'Comentar'}
        </button>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="px-4 py-3 border-t border-border">
          <Comments
            postId={post.id}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
          />
        </div>
      )}
    </article>
  );
}
