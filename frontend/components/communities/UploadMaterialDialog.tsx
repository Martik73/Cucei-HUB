'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { FileText, Video, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { uploadMaterial, extractYoutubeId } from '@/lib/communities';
import { getErrorMessage } from '@/lib/api';
import type { Material } from '@/types';

interface Props {
  communityId: number;
  open: boolean;
  onClose: () => void;
  onUploaded: (material: Material) => void;
}

const inputCls = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors placeholder:text-muted-foreground';

export default function UploadMaterialDialog({ communityId, open, onClose, onUploaded }: Props) {
  const [tipo, setTipo] = useState<'pdf' | 'youtube'>('pdf');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitulo(''); setDescripcion(''); setYoutubeUrl(''); setFile(null); setProgress(0); setTipo('pdf');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return toast.error('El título es obligatorio');
    if (tipo === 'pdf' && !file) return toast.error('Selecciona un archivo PDF');
    if (tipo === 'youtube') {
      if (!youtubeUrl.trim()) return toast.error('Ingresa la URL del video');
      if (!extractYoutubeId(youtubeUrl)) return toast.error('URL de YouTube inválida');
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('titulo', titulo.trim());
      form.append('descripcion', descripcion.trim());
      form.append('tipo', tipo);
      if (tipo === 'pdf' && file) form.append('file', file);
      if (tipo === 'youtube') form.append('youtubeUrl', youtubeUrl.trim());

      const material = await uploadMaterial(communityId, form, setProgress);
      toast.success('Material subido exitosamente');
      onUploaded(material);
      handleClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subir material</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Selector de tipo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('pdf')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${tipo === 'pdf' ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-accent'}`}
            >
              <FileText className="size-4" /> PDF
            </button>
            <button
              type="button"
              onClick={() => setTipo('youtube')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${tipo === 'youtube' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-input text-muted-foreground hover:bg-accent'}`}
            >
              <Video className="size-4" /> YouTube
            </button>
          </div>

          <div className="space-y-1">
            <Label>Título *</Label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nombre del material" className={inputCls} />
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción breve (opcional)"
              rows={2}
              className={`${inputCls} h-auto py-2 resize-none`}
            />
          </div>

          {tipo === 'pdf' ? (
            <div className="space-y-1">
              <Label>Archivo PDF *</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-input rounded-lg p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              >
                {file ? (
                  <p className="text-sm text-foreground font-medium truncate">{file.name}</p>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="size-5" />
                    <p className="text-sm">Haz clic para seleccionar un PDF</p>
                    <p className="text-xs">Máximo 10 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>URL de YouTube *</Label>
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={inputCls}
              />
              {youtubeUrl && !extractYoutubeId(youtubeUrl) && (
                <p className="text-xs text-destructive">URL de YouTube inválida</p>
              )}
            </div>
          )}

          {loading && progress > 0 && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Subiendo…' : 'Subir material'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
