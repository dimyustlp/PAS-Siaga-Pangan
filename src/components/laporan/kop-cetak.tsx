/* eslint-disable @next/next/no-img-element */
import { alamatKop, barisKop, type KopUpt } from "@/lib/domain/kop";

/** Kop surat UPT untuk formulir dan dokumen cetak. */
export function KopCetak({ kop }: { kop: KopUpt }) {
  const baris = barisKop(kop);
  const alamat = alamatKop(kop);
  return (
    <>
      <header className="flex items-center gap-4">
        <img src="/logo-kemenimipas.png" alt="" className="h-[64px] w-[64px] shrink-0 object-contain" />
        <div className="flex-1 text-center leading-tight">
          {baris.map((b, i) => (
            <p key={b + i} className={i === baris.length - 1 ? "text-[13pt] font-bold" : "text-[11pt] font-bold"}>{b}</p>
          ))}
          {alamat && <p className="mt-1 text-[8.5pt]">{alamat}</p>}
        </div>
        <img src="/logo-pemasyarakatan.png" alt="" className="h-[64px] w-auto shrink-0 object-contain" />
      </header>
      <div className="mt-2 border-b-[3px] border-black" />
      <div className="mb-4 mt-[2px] border-b border-black" />
    </>
  );
}
