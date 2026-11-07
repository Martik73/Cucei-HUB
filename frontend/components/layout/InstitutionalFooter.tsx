import Image from 'next/image';

export default function InstitutionalFooter() {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-card px-4 py-2 md:px-6">
      <span className="text-right text-[10px] leading-snug text-muted-foreground sm:text-xs">Comunidad CUCEI<br />Universidad de Guadalajara</span>
      <Image src="/brand/escudo-udeg.webp" alt="Escudo de la Universidad de Guadalajara" width={30} height={38} className="h-9 w-8 object-contain" />
    </footer>
  );
}
