'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

function HomeContent() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">CUCEI HUB</h1>
        <p className="text-muted-foreground">Red social académica del CUCEI, UdeG</p>
      </div>

      {user && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center space-y-1.5">
          <p className="text-lg font-semibold">{user.nombre}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground">
            {user.carrera} &middot; {user.semestre}° semestre
          </p>
        </div>
      )}

      <Button variant="outline" onClick={logout}>
        Cerrar sesión
      </Button>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
