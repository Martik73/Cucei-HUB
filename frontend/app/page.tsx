'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import CreatePost from '@/components/feed/CreatePost';
import PostCard from '@/components/feed/PostCard';
import PostSkeleton from '@/components/feed/PostSkeleton';
import { getPosts } from '@/lib/posts';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Post, PostType, PostCategory } from '@/types';
import { Button } from '@/components/ui/button';

const TABS: { value: PostType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'carrera', label: 'Mi Carrera' },
];

const CATEGORIES: { value: PostCategory | ''; label: string }[] = [
  { value: '',        label: 'Todas'    },
  { value: 'duda',    label: 'Dudas'    },
  { value: 'evento',  label: 'Eventos'  },
  { value: 'trabajo', label: 'Trabajo'  },
  { value: 'general', label: 'General'  },
];

const LIMIT = 10;

function FeedContent() {
  const [tab,         setTab]         = useState<PostType>('general');
  const [category,    setCategory]    = useState<PostCategory | ''>('');
  const [posts,       setPosts]       = useState<Post[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);

  const fetchPosts = useCallback(
    async (type: PostType, cat: PostCategory | '', p: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await getPosts({
          type,
          category: (cat || undefined) as PostCategory | undefined,
          page: p,
          limit: LIMIT,
        });
        setPosts((prev) => (replace ? data.posts : [...prev, ...data.posts]));
        setHasMore(p < data.totalPages);
        setPage(p);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Reload when tab or category changes
  useEffect(() => {
    fetchPosts(tab, category, 1, true);
  }, [tab, category, fetchPosts]);

  const handleTabChange = (newTab: PostType) => {
    setTab(newTab);
    setCategory('');
  };

  const handlePostCreated = (post: Post) => {
    // Only prepend if it matches the current view
    const matchesType = post.type === tab;
    const matchesCat  = !category || post.category === category;
    if (matchesType && matchesCat) {
      setPosts((prev) => [post, ...prev]);
    }
  };

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      {/* Create post */}
      <CreatePost onPostCreated={handlePostCreated} />

      {/* Tabs + category */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                category === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Post list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">No hay publicaciones aún</p>
          <p className="text-xs mt-1">¡Sé el primero en publicar algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handlePostDeleted}
              onUpdate={handlePostUpdated}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => fetchPosts(tab, category, page + 1, false)}
              >
                {loadingMore ? 'Cargando…' : 'Cargar más publicaciones'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <FeedContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
