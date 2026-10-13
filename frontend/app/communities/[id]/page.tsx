'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, BookOpen, ArrowLeft, Plus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import MaterialCard from '@/components/communities/MaterialCard';
import UploadMaterialDialog from '@/components/communities/UploadMaterialDialog';
import DiscussionChannel from '@/components/communities/DiscussionChannel';
import { getCommunity, getMaterials, joinCommunity, leaveCommunity } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Community, Material } from '@/types';

type Tab = 'materiales' | 'discusion';

function CommunityDetailContent() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab, setTab]             = useState<Tab>('materiales');
  const [joining, setJoining]     = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [comm, mats] = await Promise.all([getCommunity(id), getMaterials(id)]);
      setCommunity(comm);
      setMaterials(mats);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoin = async () => {
    if (!community) return;
    setJoining(true);
    try {
      if (community.isMember) {
        await leaveCommunity(id);
        setCommunity((c) => c ? { ...c, isMember: false, memberCount: c.memberCount - 1 } : c);
        toast.success('Saliste de la comunidad');
      } else {
        await joinCommunity(id);
        setCommunity((c) => c ? { ...c, isMember: true, memberCount: c.memberCount + 1 } : c);
        toast.success('¡Te uniste a la comunidad!');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-center text-muted-foreground">
        <p>Comunidad no encontrada</p>
        <Link href="/communities" className="text-primary text-sm hover:underline mt-2 inline-block">
          Volver a comunidades
        </Link>
      </div>
    );
  }

  const tabCls = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <Link href="/communities" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="size-4" /> Comunidades
      </Link>

      {/* Header */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">{community.nombre}</h1>
            {community.materia && (
              <p className="text-sm text-primary font-medium mt-0.5">{community.materia}</p>
            )}
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              community.isMember
                ? 'border border-input text-muted-foreground hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {joining ? '…' : community.isMember ? 'Salir' : 'Unirse'}
          </button>
        </div>

        {community.descripcion && (
          <p className="text-sm text-muted-foreground">{community.descripcion}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="size-3.5" />{community.memberCount} miembros</span>
          <span className="flex items-center gap-1"><BookOpen className="size-3.5" />{community.materialCount} materiales</span>
          {community.carrera && (
            <span className="bg-muted rounded-full px-2 py-0.5">{community.carrera}</span>
          )}
          {community.tema && (
            <span className="bg-muted rounded-full px-2 py-0.5">{community.tema}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button className={tabCls(tab === 'materiales')} onClick={() => setTab('materiales')}>
          <span className="flex items-center justify-center gap-1.5">
            <BookOpen className="size-4" /> Materiales
          </span>
        </button>
        <button className={tabCls(tab === 'discusion')} onClick={() => setTab('discusion')}>
          <span className="flex items-center justify-center gap-1.5">
            <MessageSquare className="size-4" /> Discusión
          </span>
        </button>
      </div>

      {/* Tab content */}
      {tab === 'materiales' && (
        <div className="space-y-4">
          {community.isMember && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-input text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus className="size-4" /> Subir material
            </button>
          )}

          {materials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="size-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">No hay materiales aún</p>
              {community.isMember && <p className="text-xs mt-1">¡Sube el primero!</p>}
            </div>
          ) : (
            <div className="grid gap-4">
              {materials.map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  currentUserId={user?.id ?? 0}
                  onDeleted={(deletedId) => {
                    setMaterials((prev) => prev.filter((mat) => mat.id !== deletedId));
                    setCommunity((c) => c ? { ...c, materialCount: c.materialCount - 1 } : c);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'discusion' && user && (
        <DiscussionChannel
          communityId={id}
          isMember={community.isMember}
          currentUserId={user.id}
        />
      )}

      <UploadMaterialDialog
        communityId={id}
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={(material) => {
          setMaterials((prev) => [material, ...prev]);
          setCommunity((c) => c ? { ...c, materialCount: c.materialCount + 1 } : c);
        }}
      />
    </div>
  );
}

export default function CommunityDetailPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CommunityDetailContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
