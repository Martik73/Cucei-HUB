'use client';

import Link from 'next/link';
import InstitutionalBrand from './InstitutionalBrand';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex h-18 shrink-0 items-center border-b border-border bg-card px-4 md:px-6">
      <Link href="/" className="flex items-center gap-2 font-bold text-xl mr-3 shrink-0">
        <InstitutionalBrand />
      </Link>

      <div className="flex flex-1 items-center justify-end">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Menú de usuario" className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
              <span className="hidden text-right sm:block"><span className="block text-sm font-semibold">{user.nombre}</span><span className="block text-xs text-muted-foreground">Mi espacio</span></span>
              <Avatar>
                {user.profilePicture && <AvatarImage src={user.profilePicture} alt={user.nombre} />}
                <AvatarFallback>{getInitials(user.nombre)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal py-2">
                  <p className="text-sm font-medium leading-none">{user.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
                  <UserIcon className="size-4" />
                  Perfil
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={logout}>
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
