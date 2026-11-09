"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TitikTren = { minggu: string; sesi: number; ditutup: number; merah_kritis: number; gangguan: number };

export function TrenChart({ data }: { data: TitikTren[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Grafik tren mingguan: jumlah sesi, sesi ditutup, sesi merah atau kritis, dan gangguan">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="minggu" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sesi" name="Sesi" fill="hsl(214 52% 22%)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="ditutup" name="Ditutup" fill="hsl(142 55% 32%)" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="merah_kritis" name="Merah/Kritis" stroke="hsl(0 70% 46%)" strokeWidth={2} dot />
          <Line type="monotone" dataKey="gangguan" name="Gangguan" stroke="hsl(42 92% 44%)" strokeWidth={2} dot />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
