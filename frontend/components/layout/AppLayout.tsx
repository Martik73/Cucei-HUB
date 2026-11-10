'use client';

import Header from './Header';
import Sidebar from './Sidebar';
import InstitutionalFooter from './InstitutionalFooter';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <InstitutionalFooter />
    </div>
  );
}
