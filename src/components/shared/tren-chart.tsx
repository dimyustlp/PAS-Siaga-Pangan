"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TitikTren = { minggu: string; sesi: number; ditutup: number; merah_kritis: number; gangguan: number };

const SUMBU = { fontSize: 12, fill: "hsl(224 10% 62%)" };

export function TrenChart({ data }: { data: TitikTren[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Grafik tren mingguan: jumlah sesi, sesi ditutup, sesi merah atau kritis, dan gangguan">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="isiSesi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(214 96% 63%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(214 96% 63%)" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(228 12% 20%)" />
          <XAxis dataKey="minggu" tick={SUMBU} axisLine={{ stroke: "hsl(228 12% 22%)" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={SUMBU} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(0 0% 100% / 0.04)" }}
            contentStyle={{ background: "hsl(228 16% 10%)", border: "1px solid hsl(0 0% 100% / 0.08)", borderRadius: 12, color: "hsl(220 20% 94%)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "hsl(224 10% 70%)" }} />
          <Bar dataKey="sesi" name="Sesi" fill="url(#isiSesi)" radius={[6, 6, 0, 0]} animationDuration={900} />
          <Bar dataKey="ditutup" name="Ditutup" fill="hsl(228 10% 55%)" radius={[6, 6, 0, 0]} animationDuration={900} />
          <Line type="monotone" dataKey="merah_kritis" name="Merah/Kritis" stroke="hsl(0 82% 61%)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="gangguan" name="Gangguan" stroke="hsl(42 96% 56%)" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
