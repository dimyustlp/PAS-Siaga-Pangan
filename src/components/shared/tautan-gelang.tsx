import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GELANG_URL } from "@/lib/config";

/** Membuka sistem pemantauan gelang di tab baru. Masuk memakai akun milik sistem gelang itu sendiri. */
export function TautanGelang({ kecil = true, className }: { kecil?: boolean; className?: string }) {
  return (
    <Button asChild size={kecil ? "sm" : "default"} variant="outline" className={className}>
      <a href={GELANG_URL} target="_blank" rel="noopener noreferrer">
        <Radio className="h-4 w-4" aria-hidden />
        Pantau gelang
      </a>
    </Button>
  );
}
