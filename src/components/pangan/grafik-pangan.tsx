"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { labelBulan, type RekapBulan } from "@/lib/domain/pangan-sdp";

const SUMBU = { fontSize: 12, fill: "hsl(215 16% 47%)" };
const KOTAK = { background: "#fff", border: "1px solid hsl(214 32% 91%)", borderRadius: 12, color: "hsl(222 47% 11%)", fontSize: 12 };
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Dua grafik bulanan seperti di SDP: omset (miliar rupiah) serta WBP terlibat dan premi (juta rupiah). */
export function GrafikOmset({ data }: { data: RekapBulan[] }) {
  const d = data.map((b) => ({ bulan: labelBulan(b.bulan), omset: b.nilai / 1e9 }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Grafik omset per bulan dalam miliar rupiah">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={d} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(216 40% 86%)" />
          <XAxis dataKey="bulan" tick={SUMBU} axisLine={{ stroke: "hsl(216 36% 80%)" }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={SUMBU} axisLine={false} tickLine={false} tickFormatter={(v) => nf.format(v as number)} />
          <Tooltip contentStyle={KOTAK} formatter={(v) => [`Rp ${nf.format(Number(v))} miliar`, "Omset"]} />
          <Line type="monotone" dataKey="omset" name="Omset (miliar)" stroke="hsl(42 92% 50%)" strokeWidth={2.4} dot={{ r: 3 }} animationDuration={800} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrafikWbp({ data }: { data: RekapBulan[] }) {
  const d = data.map((b) => ({ bulan: labelBulan(b.bulan), wbp: b.wbp, premi: b.premi / 1e6 }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Grafik jumlah WBP terlibat dan premi per bulan">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={d} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="isiPremi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(214 78% 56%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(214 78% 56%)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(216 40% 86%)" />
          <XAxis dataKey="bulan" tick={SUMBU} axisLine={{ stroke: "hsl(216 36% 80%)" }} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="w" tick={SUMBU} axisLine={false} tickLine={false} tickFormatter={(v) => nf0.format(v as number)} />
          <YAxis yAxisId="p" orientation="right" tick={SUMBU} axisLine={false} tickLine={false} tickFormatter={(v) => nf.format(v as number)} />
          <Tooltip contentStyle={KOTAK} formatter={(v, nama) => (nama === "Premi (juta)" ? [`Rp ${nf.format(Number(v))} juta`, "Premi"] : [`${nf0.format(Number(v))} orang`, "WBP terlibat"])} />
          <Legend wrapperStyle={{ fontSize: 12, color: "hsl(215 16% 47%)" }} />
          <Area yAxisId="p" type="monotone" dataKey="premi" name="Premi (juta)" stroke="hsl(214 70% 68%)" strokeWidth={2} fill="url(#isiPremi)" animationDuration={800} />
          <Line yAxisId="w" type="monotone" dataKey="wbp" name="WBP terlibat" stroke="hsl(214 82% 46%)" strokeWidth={2.4} dot={{ r: 3 }} animationDuration={800} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
