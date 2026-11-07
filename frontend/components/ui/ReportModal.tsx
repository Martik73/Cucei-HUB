'use client';

import { useState } from 'react';

interface ReportModalProps {
  targetType: 'post' | 'comment' | 'material';
  targetId: string;
  onClose: () => void;
}

export default function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('Contenido ofensivo');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('cucei_token') || localStorage.getItem('token');

      const res = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          targetType, // 👈 Se envía dinámicamente según lo que reciba el modal ('comment' o 'post')
          targetId,
          reason,
          description
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al enviar el reporte');
        setLoading(false);
        return;
      }

      alert('Reporte enviado exitosamente.');
      onClose();
    } catch (err: any) {
      console.error("❌ Error de red:", err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl max-w-md w-full shadow-lg space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Reportar {targetType === 'comment' ? 'comentario' : targetType === 'material' ? 'material' : 'publicación'}
        </h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Motivo</label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            >
              <option value="Contenido ofensivo">Contenido ofensivo</option>
              <option value="Spam">Spam</option>
              <option value="Acoso">Acoso</option>
              <option value="Información falsa">Información falsa</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descripción opcional</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3} 
              maxLength={500}
              className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 resize-none" 
              placeholder="Proporciona más detalles..." 
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}