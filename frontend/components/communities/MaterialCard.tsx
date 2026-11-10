'use client';

import { useState } from 'react';
import { FileText, Trash2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { deleteMaterial, extractYoutubeId, getMaterialFile } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
import ReportModal from '@/components/ui/ReportModal';
import type { Material } from '@/types';

interface Props {
  material: Material;
  currentUserId: string;
  onDeleted: (id: string) => void;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function MaterialCard({ material, currentUserId, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [reporting, setReporting] = useState(false);
  const isOwner = material.uploaderId === currentUserId;
  const materialId = material.id || (material as any)._id;
  const date = format(new Date(material.createdAt), 'd MMM yyyy', { locale: es });

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este material?')) return;
    setDeleting(true);
    try {
      await deleteMaterial(materialId);
      toast.success('Material eliminado');
      onDeleted(materialId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleFile = async (download: boolean) => {
    // Open immediately on the user gesture so preview is not blocked as a popup.
    const preview = download ? null : window.open('about:blank', '_blank');
    if (preview) preview.opener = null;
    setLoadingFile(true);
    try {
      const file = await getMaterialFile(materialId);
      const url = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }));
      if (!download && preview) {
        preview.location.replace(url);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${material.titulo.replace(/[\\/:*?"<>|]/g, '_') || 'material'}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      // Give the browser time to consume the blob before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      preview?.close();
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingFile(false);
    }
  };

  const videoId = material.tipo === 'youtube' && material.youtubeUrl
    ? extractYoutubeId(material.youtubeUrl)
    : null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden relative group">
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

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón de reportar que aparece al pasar el cursor */}
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="text-[11px] text-zinc-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 font-medium"
              title="Reportar material"
            >
              Reportar
            </button>

            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                title="Eliminar"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
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
              <button
                type="button"
                onClick={() => handleFile(false)}
                disabled={loadingFile}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <ExternalLink className="size-3" /> Ver
              </button>
              <button
                type="button"
                onClick={() => handleFile(true)}
                disabled={loadingFile}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Download className="size-3" /> Descargar
              </button>
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

      {/* Modal de Reporte */}
      {reporting && (
        <ReportModal
          targetType="material"
          targetId={materialId}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}