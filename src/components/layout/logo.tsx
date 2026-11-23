/* eslint-disable @next/next/no-img-element */

/** Logo PAS-SIAGA Pangan (perisai, lumbung padi, dan dokumen evaluasi). */
export function Logo({ kecil = false, className = "" }: { kecil?: boolean; className?: string }) {
  const ukuran = kecil ? "h-9 w-9" : "h-11 w-11";
  return (
    <img
      src="/logo-pas-siaga.png"
      alt="Logo PAS-SIAGA Pangan"
      width={kecil ? 36 : 44}
      height={kecil ? 36 : 44}
      className={`${ukuran} shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)] ${className}`}
    />
  );
}

/** Lambang Kementerian Imigrasi dan Pemasyarakatan dan logo Pemasyarakatan, berdampingan. */
export function LogoInstansi({ kecil = false }: { kecil?: boolean }) {
  const h = kecil ? "h-8" : "h-10";
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <img src="/logo-kemenimipas.png" alt="Kementerian Imigrasi dan Pemasyarakatan" width={40} height={40} className={`${h} w-auto object-contain`} />
      <img src="/logo-pemasyarakatan.png" alt="Pemasyarakatan" width={30} height={40} className={`${h} w-auto object-contain`} />
    </span>
  );
}
