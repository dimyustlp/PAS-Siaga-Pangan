"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TABEL_BAWAAN = ["daily_sessions", "field_logs", "incidents", "decisions", "follow_ups", "status_history"];

/**
 * Memperbarui halaman begitu ada perubahan data (Supabase Realtime), dengan polling cadangan
 * supaya hitung mundur dan peringatan "tanpa data" tetap bergerak walau koneksi realtime putus.
 * Hak akses tetap dijaga RLS: perubahan di luar wewenang pengguna tidak sampai ke sini.
 */
export function RealtimeRefresh({ tabel = TABEL_BAWAAN, intervalDetik = 60 }: { tabel?: string[]; intervalDetik?: number }) {
  const router = useRouter();
  const [langsung, setLangsung] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const kunci = tabel.join(",");

  React.useEffect(() => {
    const refreshTertunda = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 700);
    };
    const supabase = createClient();
    const kanal = supabase.channel(`refresh-${kunci}-${Math.random().toString(36).slice(2, 8)}`);
    for (const t of kunci.split(",")) {
      kanal.on("postgres_changes", { event: "*", schema: "public", table: t }, refreshTertunda);
    }
    kanal.subscribe((status) => setLangsung(status === "SUBSCRIBED"));

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalDetik * 1000);
    const saatKembali = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", saatKembali);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", saatKembali);
      supabase.removeChannel(kanal);
    };
  }, [kunci, intervalDetik, router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      <span className={cn("h-2 w-2 rounded-full", langsung ? "bg-status-hijau" : "bg-status-kuning")} aria-hidden />
      {langsung ? "Pembaruan langsung aktif" : "Memuat ulang berkala"}
    </span>
  );
}
