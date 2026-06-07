'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import ConversationList, { type ChatPartner } from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';
import { MessageSquare } from 'lucide-react';

function MessagesContent() {
  const [activePartner, setActivePartner] = useState<ChatPartner | null>(null);
  const [showList,      setShowList]      = useState(true); // mobile: toggle list ↔ chat

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

// cn helper inline (avoids extra import at page level)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <MessagesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
