"use client";

import dynamic from "next/dynamic";
import type { PetaProps } from "./peta-kegiatan";

/** Pustaka peta (MapLibre) hanya dimuat di halaman ini dan hanya di peramban. */
const PetaKegiatan = dynamic(() => import("./peta-kegiatan").then((m) => m.PetaKegiatan), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]" role="status" aria-label="Memuat peta">
      <div className="kilau h-[32rem] rounded-[1.6rem]" />
      <div className="kilau h-[32rem] rounded-[1.6rem] lg:h-[calc(100dvh-12rem)]" />
    </div>
  ),
});

export function PetaMuat(props: PetaProps) {
  return <PetaKegiatan {...props} />;
}
