'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import ConversationList, { type ChatPartner } from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';
import { getUserProfile } from '@/lib/users';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function MessagesContent() {
  const [activePartner, setActivePartner] = useState<ChatPartner | null>(null);
  const [showList,      setShowList]      = useState(true);

  const searchParams    = useSearchParams();
  const initialWithId   = useRef(Number(searchParams.get('with')) || null);

  // Open conversation directly when arriving via ?with=<userId>
  useEffect(() => {
    const id = initialWithId.current;
    if (!id) return;

    getUserProfile(id)
      .then((profile) => {
        setActivePartner({ id: profile.id, nombre: profile.nombre, carrera: profile.carrera, email: profile.email });
        setShowList(false);
      })
      .catch(() => {/* silently ignore — user may not exist */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (partner: ChatPartner) => {
    setActivePartner(partner);
    setShowList(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — conversation list */}
      <div
        className={cn(
          'w-full md:w-80 shrink-0 border-r border-border flex flex-col',
          showList ? 'flex' : 'hidden md:flex'
        )}
      >
        <ConversationList
          activeUserId={activePartner?.id ?? null}
          onSelect={handleSelect}
        />
      </div>

      {/* Right panel — chat */}
      <div
        className={cn(
          'flex-1 flex flex-col',
          !showList ? 'flex' : 'hidden md:flex'
        )}
      >
        {activePartner ? (
          <ChatWindow
            partner={activePartner}
            onBack={() => setShowList(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <MessageSquare className="size-10 mx-auto opacity-30" />
              <div>
                <p className="text-sm font-medium">Selecciona una conversación</p>
                <p className="text-xs mt-1 opacity-70">o busca a alguien para empezar</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense fallback={<div className="flex-1" />}>
          <MessagesContent />
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}
