"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Kotak kode dengan tombol salin. */
export function SalinKode({ kode, label = "Salin kode" }: { kode: string; label?: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(kode);
          setOk(true);
          setTimeout(() => setOk(false), 2500);
        }}
      >
        {ok ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {ok ? "Tersalin" : label}
      </Button>
      <pre className="max-h-72 overflow-auto rounded-xl border bg-[hsl(222_47%_12%)] p-3 text-[11px] leading-relaxed text-[hsl(44_60%_88%)]">{kode}</pre>
    </div>
  );
}
