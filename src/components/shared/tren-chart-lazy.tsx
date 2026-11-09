"use client";

import dynamic from "next/dynamic";
import type { TitikTren } from "./tren-chart";

const TrenChart = dynamic(() => import("./tren-chart").then((m) => m.TrenChart), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-muted" aria-hidden />,
});

export function TrenChartLazy({ data }: { data: TitikTren[] }) {
  return <TrenChart data={data} />;
}
