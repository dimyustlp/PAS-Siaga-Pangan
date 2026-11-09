"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TitikTren = { minggu: string; sesi: number; ditutup: number; merah_kritis: number; gangguan: number };

const SUMBU = { fontSize: 12, fill: "hsl(222 20% 40%)" };

export function TrenChart({ data }: { data: TitikTren[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Grafik tren mingguan: jumlah sesi, sesi ditutup, sesi merah atau kritis, dan gangguan">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="isiSesi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(224 86% 55%)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="hsl(262 80% 66%)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(216 40% 86%)" />
          <XAxis dataKey="minggu" tick={SUMBU} axisLine={{ stroke: "hsl(216 36% 80%)" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={SUMBU} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(224 86% 55% / 0.06)" }}
            contentStyle={{ background: "#fff", border: "1px solid hsl(216 50% 86%)", borderRadius: 12, color: "hsl(226 44% 16%)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "hsl(222 20% 40%)" }} />
          <Bar dataKey="sesi" name="Sesi" fill="url(#isiSesi)" radius={[6, 6, 0, 0]} animationDuration={900} />
          <Bar dataKey="ditutup" name="Ditutup" fill="hsl(216 30% 68%)" radius={[6, 6, 0, 0]} animationDuration={900} />
          <Line type="monotone" dataKey="merah_kritis" name="Merah/Kritis" stroke="hsl(0 82% 61%)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="gangguan" name="Gangguan" stroke="hsl(42 96% 56%)" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
