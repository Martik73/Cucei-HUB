'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, MessageSquare, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import PostCard from '@/components/feed/PostCard';
import EditProfileDialog from '@/components/profile/EditProfileDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, getUserPosts } from '@/lib/users';
import { getErrorMessage } from '@/lib/api';
import type { PublicUser, Post } from '@/types';

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function ProfileContent() {
  const params = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();

  const profileId = Number(params.id);
  const isOwnProfile = authUser?.id === profileId;

  const [profile,     setProfile]     = useState<PublicUser | null>(null);
  const [posts,       setPosts]       = useState<Post[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [editOpen,    setEditOpen]    = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, postsData] = await Promise.all([
        getUserProfile(profileId),
        getUserPosts(profileId, 1),
      ]);
      setProfile(profileData);
      setPosts(postsData.posts);
      setHasMore(postsData.page < postsData.totalPages);
      setPage(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getUserPosts(profileId, next);
      setPosts((prev) => [...prev, ...data.posts]);
      setPage(next);
      setHasMore(next < data.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePostDelete = (id: number) =>
    setPosts((prev) => prev.filter((p) => p.id !== id));

  const handlePostUpdate = (updated: Post) =>
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="flex gap-4 items-start">
          <div className="size-20 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="flex gap-1.5">
              <div className="h-5 w-24 bg-muted rounded-full" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
            <div className="h-3 w-64 bg-muted rounded mt-1" />
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Usuario no encontrado
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="flex gap-4 items-start">
        <Avatar className="size-20 text-2xl shrink-0">
          <AvatarFallback>{initials(profile.nombre)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{profile.nombre}</h1>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {profile.carrera}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  Semestre {profile.semestre}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              {isOwnProfile ? (
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5 mr-1.5" />
                  Editar perfil
                </Button>
              ) : (
                <Button size="sm" onClick={() => router.push(`/messages?with=${profile.id}`)}>
                  <MessageSquare className="size-3.5 mr-1.5" />
                  Enviar mensaje
                </Button>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3 shrink-0" />
            <span>
              Miembro desde {format(new Date(profile.createdAt), 'MMMM yyyy', { locale: es })}
            </span>
          </div>
        </div>
      </div>

      {/* Posts section */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Publicaciones
        </h2>

        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin publicaciones aún</p>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handlePostDelete}
                onUpdate={handlePostUpdate}
              />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Cargando…' : 'Ver más publicaciones'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {isOwnProfile && authUser && (
        <EditProfileDialog
          user={authUser}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ProfileContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
