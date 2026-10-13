'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, User, GraduationCap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const STATIC_NAV = [
  { href: '/',             label: 'Feed',         icon: Home         },
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
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-background py-4">
      <nav className="flex flex-col gap-1 px-2">
        {STATIC_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-accent text-accent-foreground'
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
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isProfileActive
                ? 'bg-accent text-accent-foreground'
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
