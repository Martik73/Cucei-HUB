'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, User, GraduationCap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const STATIC_NAV = [
  { href: '/',             label: 'Inicio',         icon: Home         },
  { href: '/messages',     label: 'Mensajes',     icon: MessageSquare },
  { href: '/communities',  label: 'Comunidades',  icon: BookOpen     },
  { href: '/professors',   label: 'Profesores',   icon: GraduationCap },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const profileHref = user?.id ? `/profile/${user.id}` : null;
  const isProfileActive    = pathname.startsWith('/profile');

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card p-2 md:w-60 md:border-b-0 md:border-r md:p-4">
      <div className="mb-4 hidden border-l-2 border-primary/30 pl-3 pt-1 md:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Tu espacio universitario</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Conecta. Comparte.<br />Crece en comunidad.</p>
      </div>
      <nav aria-label="Navegación principal" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {STATIC_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}

        {profileHref && (
          <Link
            href={profileHref}
            className={cn(
              'flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              isProfileActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <User className="size-4 shrink-0" />
            Perfil
          </Link>
        )}
      </nav>

    </aside>
  );
}
