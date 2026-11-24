"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as React from "react";
import maplibregl, { type LngLatBoundsLike, type StyleSpecification } from "maplibre-gl";
import { angka, kapital, rupiahRingkas, WARNA_KOMODITAS, WARNA_LAIN, type RekapTitik } from "@/lib/domain/pangan-sdp";

const INDONESIA: LngLatBoundsLike = [[94.2, -11.6], [141.6, 6.6]];
const GAYA_TERANG = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const GAYA_CADANGAN: StyleSpecification = {
  version: 8,
  sources: { dasar: { type: "raster", tiles: ["a", "b", "c", "d"].map((s) => `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`), tileSize: 256, attribution: "© OpenStreetMap · © CARTO" } },
  layers: [{ id: "dasar", type: "raster", source: "dasar" }],
};

function batasDari(t: RekapTitik[]): LngLatBoundsLike {
  if (t.length === 0) return INDONESIA;
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const x of t) { a = Math.min(a, x.lng); b = Math.min(b, x.lat); c = Math.max(c, x.lng); d = Math.max(d, x.lat); }
  if (c - a < 0.3) [a, c] = [a - 0.3, c + 0.3];
  if (d - b < 0.3) [b, d] = [b - 0.3, d + 0.3];
  return [[a, b], [c, d]];
}

/** Peta persebaran komoditas tertinggi per UPT. Warna titik mengikuti komoditas teratas UPT tersebut. */
export function PetaKomoditas({ titik, teratas }: { titik: RekapTitik[]; teratas: string[] }) {
  const wadah = React.useRef<HTMLDivElement>(null);
  const warna = React.useMemo(() => new Map(teratas.map((k, i) => [k, WARNA_KOMODITAS[i % WARNA_KOMODITAS.length]])), [teratas]);

  React.useEffect(() => {
    if (!wadah.current) return;
    const peta = new maplibregl.Map({
      container: wadah.current,
      style: GAYA_TERANG,
      bounds: batasDari(titik),
      fitBoundsOptions: { padding: 36, maxZoom: 9 },
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    let dasarMuat = false;
    peta.on("load", () => { dasarMuat = true; });
    peta.on("error", () => {
      if (!dasarMuat) { dasarMuat = true; peta.setStyle(GAYA_CADANGAN); }
    });
    peta.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const penanda = titik.map((t) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${t.nama}: ${kapital(t.kom)}`);
      const w = warna.get(t.kom) ?? WARNA_LAIN;
      el.style.cssText = `width:18px;height:18px;border-radius:9999px;border:2.5px solid #fff;background:${w};box-shadow:0 2px 6px rgba(15,30,60,.35);cursor:pointer;padding:0`;
      const isi = document.createElement("div");
      isi.style.cssText = "font:12.5px/1.4 system-ui,sans-serif;color:#14301f;max-width:220px";
      const j = document.createElement("strong"); j.textContent = t.nama; j.style.display = "block";
      const k = document.createElement("span"); k.textContent = `${kapital(t.kom)} (${t.jenis})`; k.style.display = "block";
      const v = document.createElement("span"); v.textContent = `${angka(t.ton)} ton · ${rupiahRingkas(t.nilai)}`; v.style.cssText = "display:block;color:#51607f";
      isi.append(j, k, v);
      return new maplibregl.Marker({ element: el }).setLngLat([t.lng, t.lat]).setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setDOMContent(isi)).addTo(peta);
    });
    return () => { penanda.forEach((m) => m.remove()); peta.remove(); };
  }, [titik, warna]);

  return (
    <div>
      <div ref={wadah} className="h-[22rem] w-full overflow-hidden rounded-xl border bg-secondary/40 sm:h-[26rem]" role="region" aria-label="Peta persebaran produksi komoditas UPT" />
      <div className="mt-3 rounded-xl border bg-primary/5 p-3 text-xs">
        <p className="mb-2 font-semibold text-ink">Keterangan komoditas tertinggi</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {teratas.map((k, i) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ background: WARNA_KOMODITAS[i % WARNA_KOMODITAS.length] }} aria-hidden />
              {kapital(k)}
            </li>
          ))}
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ background: WARNA_LAIN }} aria-hidden />Komoditas lain</li>
        </ul>
      </div>
    </div>
  );
}
