'use client';

import { useEffect, useState, useCallback } from 'react';

interface Report {
  _id: string;
  targetType: 'post' | 'comment' | 'material';
  targetId: string;
  reason: string;
  description?: string;
  status: 'Pendiente' | 'En revisión' | 'Resuelto';
  targetDetails?: {
    content?: string;
    title?: string;
    titulo?: string;
    description?: string;
    descripcion?: string;
    [key: string]: any;
  };
  resolution?: {
    decision?: 'Descartado' | 'Contenido retirado';
    resolvedBy?: { name: string; email: string; nombre?: string };
    resolvedAt?: string;
  };
  createdAt: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('cucei_token') || localStorage.getItem('token');

      if (!token) {
        throw new Error('No se encontró sesión activa. Por favor, inicia sesión de nuevo.');
      }

      const url = statusFilter 
        ? `http://localhost:5000/api/reports/admin?status=${statusFilter}`
        : 'http://localhost:5000/api/reports/admin';

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al cargar los reportes');

      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (reportId: string, decision: 'Descartado' | 'Contenido retirado', status: string) => {
    try {
      const token = localStorage.getItem('cucei_token') || localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/reports/admin/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision, status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el reporte');

      setReports(reports.map(rep => rep._id === reportId ? { ...data.report, targetDetails: rep.targetDetails } : rep));
      alert('Reporte actualizado correctamente.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Panel de Administración - Reportes</h1>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En revisión">En revisión</option>
          <option value="Resuelto">Resuelto</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando reportes...</p>
      ) : reports.length === 0 ? (
        <p className="text-zinc-500">No hay reportes registrados o bajo este filtro.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const adminName = report.resolution?.resolvedBy?.email || report.resolution?.resolvedBy?.name || report.resolution?.resolvedBy?.nombre;

            return (
              <div key={report._id} className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-5 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                      {report.targetType}
                    </span>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Motivo: <span className="font-bold text-red-600">{report.reason}</span>
                    </p>
                    {report.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Nota del reportador: {report.description}</p>
                    )}
                  </div>

                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    report.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    report.status === 'En revisión' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {report.status}
                  </span>
                </div>

                {/* Caja de contenido reportado */}
                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-lg border dark:border-zinc-700/50 space-y-1">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Contenido reportado ({report.targetType}):
                  </p>
                  
                  {report.targetType === 'material' && report.targetDetails && (report.targetDetails.title || report.targetDetails.titulo) ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        📌 Título: "{report.targetDetails.title || report.targetDetails.titulo}"
                      </p>
                      {(report.targetDetails.description || report.targetDetails.descripcion) && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                          Descripción: "{report.targetDetails.description || report.targetDetails.descripcion}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium italic">
                      {report.targetDetails?.content || report.targetDetails?.title || report.targetDetails?.titulo ? (
                        `"${report.targetDetails.content || report.targetDetails.title || report.targetDetails.titulo}"`
                      ) : (
                        <span className="text-red-500 not-italic">Contenido no disponible o eliminado</span>
                      )}
                    </p>
                  )}
                </div>

                {report.resolution?.decision && (
                  <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border dark:border-zinc-800 space-y-0.5">
                    <p><strong>Decisión:</strong> {report.resolution.decision}</p>
                    {adminName && (
                      <p><strong>Resuelto por Admin:</strong> {adminName}</p>
                    )}
                    {report.resolution.resolvedAt && (
                      <p><strong>Fecha:</strong> {new Date(report.resolution.resolvedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => handleResolve(report._id, 'Descartado', 'Resuelto')}
                    className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    Descartar reporte
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if(confirm('¿Estás seguro de retirar este contenido?')) {
                        handleResolve(report._id, 'Contenido retirado', 'Resuelto');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Retirar contenido
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}