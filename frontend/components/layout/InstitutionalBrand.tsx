import Image from 'next/image';

export default function InstitutionalBrand() {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 sm:gap-3">
      <Image src="/brand/escudo-cucei.svg" alt="Escudo de CUCEI" width={44} height={48} className="h-10 w-9 shrink-0 object-contain sm:h-11 sm:w-10" />
      <span aria-hidden="true" className="h-8 w-px shrink-0 bg-border" />
      <Image
        src="/brand/cucei-hub-logo.jpg"
        alt="CUCEI HUB"
        width={1444}
        height={428}
        priority
        className="h-auto w-40 rounded-md sm:w-48"
      />
    </span>
  );
}
