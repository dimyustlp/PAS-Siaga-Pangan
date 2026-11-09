"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as React from "react";
import Link from "next/link";
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type StyleSpecification } from "maplibre-gl";
import { Bell, Crosshair, ExternalLink, Globe2, Layers, Minus, Plus, Search, X } from "lucide-react";
import { LABEL_KONDISI, URUTAN_KONDISI, type Kondisi, type Letak, type Penanda, type UptPeta } from "@/lib/domain/peta";
import { cn } from "@/lib/utils";

export type PetaProps = {
  upt: UptPeta[];
  penanda: Penanda[];
  kanwil: { id: string; nama: string }[];
  fokus: { kanwilId?: string | null; kodeUpt?: string | null };
};

export const WARNA_KONDISI: Record<Kondisi, string> = {
  KRITIS: "hsl(322 80% 46%)",
  MERAH: "hsl(0 78% 54%)",
  KUNING: "hsl(40 96% 48%)",
  HIJAU: "hsl(152 66% 36%)",
  MENUNGGU: "hsl(226 34% 38%)",
  TANPA_SESI: "hsl(218 14% 55%)",
};
const BERWARNA = (k: Kondisi) => k !== "MENUNGGU" && k !== "TANPA_SESI";

/** Sabang sampai Merauke, Miangas sampai Rote, dengan sisa ruang tipis. Dipakai sebagai tampilan awal. */
const INDONESIA: LngLatBoundsLike = [
  [94.2, -11.6],
  [141.6, 6.6],
];
const BINGKAI_AWAL = { top: 28, bottom: 28, left: 28, right: 60 };

const GAYA_TERANG = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const GAYA_CADANGAN: StyleSpecification = {
  version: 8,
  sources: {
    dasar: {
      type: "raster",
      tiles: ["a", "b", "c", "d"].map((s) => `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`),
      tileSize: 256,
      attribution: "© OpenStreetMap · © CARTO",
    },
  },
  layers: [{ id: "dasar", type: "raster", source: "dasar" }],
};

/** Bentuk penanda untuk legenda dan daftar (SVG kecil). */
export function Bentuk({ letak, kondisi, ukuran = 14 }: { letak: Letak; kondisi: Kondisi; ukuran?: number }) {
  const warna = WARNA_KONDISI[kondisi];
  const isi = BERWARNA(kondisi) ? warna : "transparent";
  const garis = BERWARNA(kondisi) ? "#fff" : warna;
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      {letak === "Dalam UPT" ? (
        <circle cx="8" cy="8" r="6" fill={isi} stroke={garis} strokeWidth="1.6" strokeDasharray={kondisi === "TANPA_SESI" ? "2 2" : undefined} />
      ) : (
        <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.2" transform="rotate(45 8 8)" fill={isi} stroke={garis} strokeWidth="1.6" strokeDasharray={kondisi === "TANPA_SESI" ? "2 2" : undefined} />
      )}
    </svg>
  );
}

function batasDari(titik: { lat: number; lng: number }[]): LngLatBoundsLike | null {
  if (titik.length === 0) return null;
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const t of titik) {
    a = Math.min(a, t.lng);
    b = Math.min(b, t.lat);
    c = Math.max(c, t.lng);
    d = Math.max(d, t.lat);
  }
  if (c - a < 0.2) [a, c] = [a - 0.15, c + 0.15];
  if (d - b < 0.2) [b, d] = [b - 0.15, d + 0.15];
  return [
    [a, b],
    [c, d],
  ];
}

function elemenPenanda(p: Penanda, onPilih: (p: Penanda) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "peta-penanda";
  el.dataset.bentuk = p.letak === "Dalam UPT" ? "lingkaran" : "ketupat";
  el.dataset.kondisi = p.kondisi;
  el.style.setProperty("--warna", WARNA_KONDISI[p.kondisi]);
  el.setAttribute("aria-label", `${p.kegiatan.length} kegiatan ${p.letak.toLowerCase()}, kondisi ${LABEL_KONDISI[p.kondisi]}`);
  const inti = document.createElement("span");
  inti.className = "inti";
  el.appendChild(inti);
  if (p.kegiatan.length > 1) {
    const j = document.createElement("span");
    j.className = "jumlah";
    j.textContent = String(p.kegiatan.length);
    el.appendChild(j);
  }
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onPilih(p);
  });
  return el;
}

export function PetaKegiatan({ upt, penanda, kanwil, fokus }: PetaProps) {
  const wadah = React.useRef<HTMLDivElement>(null);
  const peta = React.useRef<maplibregl.Map | null>(null);
  const daftarPenanda = React.useRef<maplibregl.Marker[]>([]);
  const [siap, setSiap] = React.useState(false);
  const [gagalDasar, setGagalDasar] = React.useState(false);

  const [kanwilId, setKanwilId] = React.useState<string>(fokus.kanwilId ?? "");
  const [letak, setLetak] = React.useState<"Semua" | Letak>("Semua");
  const [kondisiAktif, setKondisiAktif] = React.useState<Set<Kondisi>>(() => new Set(URUTAN_KONDISI));
  const [cari, setCari] = React.useState("");
  const [tampilSemuaUpt, setTampilSemuaUpt] = React.useState(true);
  const [pilihUpt, setPilihUpt] = React.useState<string | null>(fokus.kodeUpt ?? null);
  const [legenda, setLegenda] = React.useState(true);
  React.useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setLegenda(false);
  }, []);

  const uptMap = React.useMemo(() => new Map(upt.map((u) => [u.kode, u])), [upt]);
  const namaKanwil = React.useMemo(() => new Map(kanwil.map((k) => [k.id, k.nama])), [kanwil]);

  const penandaTampil = React.useMemo(
    () =>
      penanda.filter((p) => {
        const u = uptMap.get(p.kodeUpt);
        if (!u) return false;
        if (kanwilId && u.kanwilId !== kanwilId) return false;
        if (letak !== "Semua" && p.letak !== letak) return false;
        return kondisiAktif.has(p.kondisi);
      }),
    [penanda, uptMap, kanwilId, letak, kondisiAktif]
  );

  const uptBerkegiatan = React.useMemo(() => {
    const kode = new Set(penandaTampil.map((p) => p.kodeUpt));
    const kata = cari.trim().toLowerCase();
    return upt
      .filter((u) => kode.has(u.kode) && (!kata || `${u.nama} ${u.kab ?? ""}`.toLowerCase().includes(kata)))
      .sort((a, b) => URUTAN_KONDISI.indexOf(a.kondisi ?? "TANPA_SESI") - URUTAN_KONDISI.indexOf(b.kondisi ?? "TANPA_SESI") || a.nama.localeCompare(b.nama));
  }, [upt, penandaTampil, cari]);

  const ringkas = React.useMemo(() => {
    const keg = penandaTampil.flatMap((p) => p.kegiatan);
    const per = Object.fromEntries(URUTAN_KONDISI.map((k) => [k, 0])) as Record<Kondisi, number>;
    for (const k of keg) per[k.kondisi]++;
    return {
      upt: new Set(penandaTampil.map((p) => p.kodeUpt)).size,
      dalam: keg.filter((k) => k.letak === "Dalam UPT").length,
      luar: keg.filter((k) => k.letak === "Luar UPT").length,
      per,
    };
  }, [penandaTampil]);

  // 1. Peta dibuat sekali.
  React.useEffect(() => {
    if (!wadah.current || peta.current) return;
    const m = new maplibregl.Map({
      container: wadah.current,
      style: GAYA_TERANG,
      bounds: INDONESIA,
      fitBoundsOptions: { padding: BINGKAI_AWAL },
      minZoom: 1.8,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    peta.current = m;
    // Tampilan awal selalu seluruh Indonesia. Ukuran wadah bisa berubah saat tata letak selesai,
    // jadi dipasang ulang sampai pengguna sendiri menggeser atau memperbesar.
    let disentuh = false;
    const tandaiSentuh = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) disentuh = true;
    };
    m.on("dragstart", tandaiSentuh);
    m.on("zoomstart", tandaiSentuh);
    const pasUlang = () => {
      if (disentuh) return;
      m.resize();
      m.fitBounds(INDONESIA, { padding: BINGKAI_AWAL, duration: 0 });
    };
    const pengamat = new ResizeObserver(pasUlang);
    pengamat.observe(wadah.current);
    m.once("load", pasUlang);
    let dasarSiap = false;
    m.on("error", (e) => {
      // Bila gaya vektor tidak bisa diambil, pakai ubin raster supaya peta tetap tampil.
      if (!dasarSiap && /style|fetch|Failed/i.test(String(e?.error?.message ?? ""))) {
        dasarSiap = true;
        setGagalDasar(true);
        m.setStyle(GAYA_CADANGAN);
      }
    });
    m.on("style.load", () => {
      dasarSiap = true;
      if (!m.getSource("upt")) {
        m.addSource("upt", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("garis", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({
          id: "garis-luar",
          type: "line",
          source: "garis",
          paint: { "line-color": "hsl(226, 50%, 28%)", "line-opacity": 0.55, "line-width": 1.4, "line-dasharray": [2, 2] },
        });
        m.addLayer({
          id: "upt-titik",
          type: "circle",
          source: "upt",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.8, 6, 2.8, 10, 4.5],
            "circle-color": "hsl(224, 45%, 48%)",
            "circle-opacity": 0.7,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 0.8,
          },
        });
        if (m.getStyle().glyphs) {
          m.addLayer({
            id: "upt-nama",
            type: "symbol",
            source: "upt",
            minzoom: 8.5,
            layout: { "text-field": ["get", "nama"], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", "text-max-width": 10 },
            paint: { "text-color": "hsl(226, 44%, 22%)", "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
          });
        }
        const sembul = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "peta-sembul" });
        m.on("mouseenter", "upt-titik", (e) => {
          m.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (f && f.geometry.type === "Point") sembul.setLngLat(f.geometry.coordinates as [number, number]).setText(String(f.properties?.nama ?? "")).addTo(m);
        });
        m.on("mouseleave", "upt-titik", () => {
          m.getCanvas().style.cursor = "";
          sembul.remove();
        });
        m.on("click", "upt-titik", (e) => {
          const kode = e.features?.[0]?.properties?.kode;
          if (kode) setPilihUpt(String(kode));
        });
      }
      setSiap(true);
    });
    return () => {
      pengamat.disconnect();
      daftarPenanda.current.forEach((x) => x.remove());
      m.remove();
      peta.current = null;
    };
  }, []);

  // 2. Titik semua UPT dan garis ke lokasi di luar UPT.
  React.useEffect(() => {
    const m = peta.current;
    if (!m || !siap) return;
    const titik = upt.filter((u) => (!kanwilId || u.kanwilId === kanwilId) && (tampilSemuaUpt || u.kondisi));
    (m.getSource("upt") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: titik.map((u) => ({ type: "Feature", properties: { kode: u.kode, nama: u.nama }, geometry: { type: "Point", coordinates: [u.lng, u.lat] } })),
    });
    (m.getSource("garis") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: penandaTampil
        .filter((p) => p.letak === "Luar UPT" && p.titikSendiri)
        .flatMap((p) => {
          const u = uptMap.get(p.kodeUpt);
          return u ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [[u.lng, u.lat], [p.lng, p.lat]] } }] : [];
        }),
    });
  }, [siap, upt, uptMap, penandaTampil, kanwilId, tampilSemuaUpt]);

  // 3. Penanda kegiatan (DOM supaya bisa berbentuk dan berdenyut). Yang paling genting digambar terakhir (di atas).
  React.useEffect(() => {
    const m = peta.current;
    if (!m || !siap) return;
    daftarPenanda.current.forEach((x) => x.remove());
    daftarPenanda.current = [...penandaTampil].reverse().map((p) => {
      const el = elemenPenanda(p, (x) => setPilihUpt(x.kodeUpt));
      if (p.kodeUpt === pilihUpt) el.dataset.pilih = "1";
      return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
    });
  }, [siap, penandaTampil, pilihUpt]);

  // 4. Arahkan kamera: ke Kanwil terpilih, atau ke UPT terpilih.
  const arahkanKanwil = React.useCallback(
    (id: string) => {
      const m = peta.current;
      if (!m) return;
      const b = id ? batasDari(upt.filter((u) => u.kanwilId === id)) : null;
      if (b) m.fitBounds(b, { padding: 48, duration: 1200, maxZoom: 9 });
      else m.fitBounds(INDONESIA, { padding: BINGKAI_AWAL, duration: 1200 });
    },
    [upt]
  );
  const pilihDanTerbang = (kode: string) => {
    setPilihUpt(kode);
    const u = uptMap.get(kode);
    if (u) peta.current?.flyTo({ center: [u.lng, u.lat], zoom: Math.max(peta.current.getZoom(), 9), duration: 1100, essential: true });
  };

  const terpilih = pilihUpt ? uptMap.get(pilihUpt) : undefined;
  const penandaTerpilih = pilihUpt ? penanda.filter((p) => p.kodeUpt === pilihUpt) : [];

  const ubahKondisi = (k: Kondisi) =>
    setKondisiAktif((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n.size === 0 ? new Set(URUTAN_KONDISI) : n;
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      {/* Panel kiri: ringkasan, saringan, daftar */}
      <aside className="kaca order-2 flex min-h-0 flex-col rounded-[1.6rem] lg:order-1 lg:h-[calc(100dvh-12rem)] lg:min-h-[34rem]">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-t-[1.6rem] border-b border-border bg-border">
          {[
            { n: ringkas.upt, l: "UPT berkegiatan" },
            { n: ringkas.dalam, l: "Dalam UPT", b: "Dalam UPT" as Letak },
            { n: ringkas.luar, l: "Luar UPT", b: "Luar UPT" as Letak },
          ].map((x) => (
            <div key={x.l} className="bg-white px-3 py-3.5">
              <p className="font-mono text-2xl font-medium leading-none tabular-nums">{x.n}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {x.b && <Bentuk letak={x.b} kondisi="MENUNGGU" ukuran={11} />}
                {x.l}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-b border-ink/[0.06] p-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Kanwil</span>
            <select
              value={kanwilId}
              onChange={(e) => {
                setKanwilId(e.target.value);
                arahkanKanwil(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              <option value="">Seluruh Indonesia</option>
              {kanwil.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 rounded-full border border-border bg-white/80 p-1 text-xs" role="radiogroup" aria-label="Letak kegiatan">
            {(["Semua", "Dalam UPT", "Luar UPT"] as const).map((x) => (
              <button
                key={x}
                type="button"
                role="radio"
                aria-checked={letak === x}
                onClick={() => setLetak(x)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-full py-1.5 font-medium transition-colors duration-300",
                  letak === x ? "bg-white text-primary shadow-[0_1px_3px_hsl(224_60%_40%/0.25)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {x !== "Semua" && <Bentuk letak={x} kondisi="MENUNGGU" ukuran={10} />}
                {x === "Semua" ? "Semua" : x.replace(" UPT", "")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Saring kondisi">
            {URUTAN_KONDISI.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kondisiAktif.has(k)}
                onClick={() => ubahKondisi(k)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-[opacity,background-color] duration-300",
                  kondisiAktif.has(k) ? "border-border bg-white shadow-sm" : "border-transparent bg-ink/[0.04] opacity-50"
                )}
              >
                <Bentuk letak="Dalam UPT" kondisi={k} ukuran={10} />
                {k === "TANPA_SESI" ? "Tanpa sesi" : k === "MENUNGGU" ? "Menunggu" : LABEL_KONDISI[k]}
                <span className="font-mono text-muted-foreground">{ringkas.per[k]}</span>
              </button>
            ))}
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari UPT atau kota"
              aria-label="Cari UPT"
              className="h-10 w-full rounded-xl border border-input bg-white pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </label>
        </div>

        <ul className="muncul min-h-[12rem] flex-1 divide-y divide-ink/[0.05] overflow-y-auto">
          {uptBerkegiatan.length === 0 && (
            <li className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-primary/30">
                <Bentuk letak="Dalam UPT" kondisi="TANPA_SESI" ukuran={18} />
              </span>
              <span className="text-sm font-medium">Belum ada kegiatan pangan aktif</span>
              <span className="max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
                Kegiatan tampil di sini setelah Operator UPT mencatat rencana kegiatan dan lokasinya di menu Kegiatan.
              </span>
            </li>
          )}
          {uptBerkegiatan.map((u) => (
            <li key={u.kode}>
              <button
                type="button"
                onClick={() => pilihDanTerbang(u.kode)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-300 hover:bg-ink/[0.04]",
                  pilihUpt === u.kode && "bg-primary/[0.08]"
                )}
              >
                <span className="mt-1 flex flex-col gap-1">
                  {u.jumlahDalam > 0 && <Bentuk letak="Dalam UPT" kondisi={u.kondisi ?? "TANPA_SESI"} />}
                  {u.jumlahLuar > 0 && <Bentuk letak="Luar UPT" kondisi={u.kondisi ?? "TANPA_SESI"} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.nama}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {u.kanwilId ? namaKanwil.get(u.kanwilId) : "-"} · {u.jumlahDalam} dalam · {u.jumlahLuar} luar
                  </span>
                </span>
                {u.alarm > 0 && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 font-mono text-[10px] text-foreground ring-1 ring-ink/10" title="Alarm gelang menunggu konfirmasi">
                    <Bell className="h-3 w-3" aria-hidden />
                    {u.alarm}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Peta */}
      <section className="relative order-1 h-[62dvh] min-h-[26rem] overflow-hidden rounded-[1.6rem] border border-ink/[0.07] bg-[hsl(205_60%_90%)] shadow-[0_24px_50px_-30px_hsl(224_70%_40%/0.4)] lg:order-2 lg:h-[calc(100dvh-12rem)] lg:min-h-[34rem]">
        <div ref={wadah} className="!absolute inset-0" aria-label="Peta sebaran kegiatan pangan UPT" role="region" />
        {!siap && <div className="kilau absolute inset-0" aria-hidden />}

        {/* Kendali */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          {[
            { ikon: Plus, label: "Perbesar", aksi: () => peta.current?.zoomIn() },
            { ikon: Minus, label: "Perkecil", aksi: () => peta.current?.zoomOut() },
            { ikon: Globe2, label: "Seluruh Indonesia", aksi: () => arahkanKanwil("") },
            ...(fokus.kodeUpt || fokus.kanwilId
              ? [{ ikon: Crosshair, label: "Wilayah saya", aksi: () => (fokus.kodeUpt && uptMap.get(fokus.kodeUpt) ? pilihDanTerbang(fokus.kodeUpt) : arahkanKanwil(fokus.kanwilId ?? "")) }]
              : []),
          ].map(({ ikon: Ikon, label, aksi }) => (
            <button
              key={label}
              type="button"
              onClick={aksi}
              aria-label={label}
              title={label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/95 text-foreground shadow-[0_6px_14px_-8px_hsl(224_60%_30%/0.5)] backdrop-blur-md transition-[transform,background-color] duration-300 hover:bg-accent active:scale-95"
            >
              <Ikon className="h-4 w-4" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTampilSemuaUpt((v) => !v)}
            aria-pressed={tampilSemuaUpt}
            title={tampilSemuaUpt ? "Sembunyikan UPT tanpa kegiatan" : "Tampilkan semua UPT"}
            aria-label="Tampilkan semua UPT"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-300",
              tampilSemuaUpt ? "border-primary/40 bg-primary text-primary-foreground shadow-[0_6px_14px_-8px_hsl(224_60%_30%/0.5)]" : "border-border bg-white/95 text-muted-foreground"
            )}
          >
            <Layers className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Legenda */}
        <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-2xl border border-border bg-white/92 p-3 text-[11px] shadow-[0_14px_30px_-16px_hsl(224_60%_30%/0.45)] backdrop-blur-md">
          <button type="button" onClick={() => setLegenda((v) => !v)} aria-expanded={legenda} className="mb-2 flex w-full items-center justify-between gap-4 font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Legenda <span className="font-mono normal-case tracking-normal">{legenda ? "−" : "+"}</span>
          </button>
          {legenda && (<>
          <p className="mb-2 font-medium uppercase tracking-[0.16em] text-muted-foreground">Bentuk · letak</p>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1.5"><Bentuk letak="Dalam UPT" kondisi="MENUNGGU" />Dalam UPT</span>
            <span className="flex items-center gap-1.5"><Bentuk letak="Luar UPT" kondisi="MENUNGGU" />Luar UPT</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(224_45%_48%)]" />UPT lain</span>
          </div>
          <p className="mb-2 font-medium uppercase tracking-[0.16em] text-muted-foreground">Warna · kondisi lapangan</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {URUTAN_KONDISI.map((k) => (
              <span key={k} className="flex items-center gap-1.5"><Bentuk letak="Dalam UPT" kondisi={k} />{k === "TANPA_SESI" ? "Tanpa sesi" : k === "MENUNGGU" ? "Menunggu izin" : LABEL_KONDISI[k]}</span>
            ))}
          </div>
          {gagalDasar && <p className="mt-2 text-muted-foreground">Peta dasar cadangan dipakai.</p>}
          </>)}
        </div>

        {/* Rincian UPT terpilih */}
        <div
          className={cn(
            "absolute inset-y-3 right-14 w-[min(22rem,calc(100%-4.5rem))] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
            terpilih ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0"
          )}
          aria-hidden={!terpilih}
        >
          {terpilih && (
            <div className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-border bg-white/96 shadow-[0_30px_60px_-30px_hsl(224_60%_30%/0.55)] backdrop-blur-xl">
              <div className="flex items-start gap-3 border-b border-ink/[0.06] p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{terpilih.kanwilId ? namaKanwil.get(terpilih.kanwilId) : "Tanpa Kanwil"}</p>
                  <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight">{terpilih.nama}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{[terpilih.jenis, terpilih.kab].filter(Boolean).join(" · ")}</p>
                </div>
                <button type="button" onClick={() => setPilihUpt(null)} aria-label="Tutup rincian" className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:text-foreground">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {terpilih.perkiraan && (
                  <p className="rounded-xl border border-border bg-white/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    Titik UPT ini masih perkiraan (pusat kabupaten/kota). Administrator dapat memperbaikinya di menu UPT &amp; Kanwil.
                  </p>
                )}
                {terpilih.alarm > 0 && (
                  <Link href="/gelang" className="flex items-center gap-2 rounded-xl border border-border bg-accent/60 px-3 py-2 text-xs transition-colors hover:bg-accent">
                    <Bell className="h-4 w-4" aria-hidden />
                    {terpilih.alarm} alarm gelang menunggu konfirmasi
                    <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </Link>
                )}
                {penandaTerpilih.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada kegiatan pangan aktif di UPT ini.</p>}
                {penandaTerpilih.flatMap((p) => p.kegiatan).map((k) => (
                  <article key={k.id} className="rounded-2xl border border-border bg-white p-3.5 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5"><Bentuk letak={k.letak} kondisi={k.kondisi} ukuran={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-muted-foreground">{k.kode}</p>
                        <p className="text-sm font-medium">{k.jenis} · {k.lokasi}</p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div><dt className="text-muted-foreground">Letak</dt><dd>{k.letak}</dd></div>
                      <div><dt className="text-muted-foreground">Kondisi</dt><dd style={{ color: BERWARNA(k.kondisi) ? WARNA_KONDISI[k.kondisi] : undefined }}>{LABEL_KONDISI[k.kondisi]}</dd></div>
                      <div><dt className="text-muted-foreground">Tahap</dt><dd>{k.fase ?? "-"}</dd></div>
                      <div><dt className="text-muted-foreground">WB / luas</dt><dd className="font-mono">{k.wb ?? "-"} · {k.luas != null ? `${k.luas} ha` : "-"}</dd></div>
                      {k.gangguan > 0 && <div className="col-span-2"><dt className="text-muted-foreground">Gangguan terbuka</dt><dd className="font-mono">{k.gangguan}</dd></div>}
                    </dl>
                    {k.sesiId && (
                      <Link href={`/sesi/${k.sesiId}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                        Buka sesi <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
