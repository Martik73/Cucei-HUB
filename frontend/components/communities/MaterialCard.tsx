'use client';

import { useState } from 'react';
import { FileText, Trash2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { deleteMaterial, extractYoutubeId } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
import type { Material } from '@/types';

interface Props {
  material: Material;
  currentUserId: number;
  onDeleted: (id: number) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function MaterialCard({ material, currentUserId, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const isOwner = material.uploaderId === currentUserId;
  const date = format(new Date(material.createdAt), 'd MMM yyyy', { locale: es });

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este material?')) return;
    setDeleting(true);
    try {
      await deleteMaterial(material.id);
      toast.success('Material eliminado');
      onDeleted(material.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const videoId = material.tipo === 'youtube' && material.youtubeUrl
    ? extractYoutubeId(material.youtubeUrl)
    : null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Video embed */}
      {material.tipo === 'youtube' && videoId && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={material.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {material.tipo === 'pdf' ? (
            <div className="size-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <FileText className="size-5 text-destructive" />
            </div>
          ) : (
            <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <span className="text-red-500 font-bold text-xs">YT</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{material.titulo}</p>
            {material.descripcion && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{material.descripcion}</p>
            )}
          </div>

          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 rounded"
              title="Eliminar"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-xs">{initials(material.uploaderNombre)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-medium">{material.uploaderNombre}</p>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
          </div>

          {material.tipo === 'pdf' && material.fileUrl && (
            <div className="flex gap-2">
              <a
                href={`${API_BASE}${material.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="size-3" /> Ver
              </a>
              <a
                href={`${API_BASE}${material.fileUrl}`}
                download
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="size-3" /> Descargar
              </a>
            </div>
          )}

          {material.tipo === 'youtube' && material.youtubeUrl && (
            <a
              href={material.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> Abrir en YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
