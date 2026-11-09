"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form";
import type { ActionResult } from "@/lib/actions/_shared";
import { cn } from "@/lib/utils";

type Props<T> = {
  action: (input: unknown) => Promise<ActionResult<T>>;
  /** Mengubah isian formulir menjadi masukan aksi server. */
  build: (fd: FormData) => unknown;
  submit: string;
  children: React.ReactNode;
  className?: string;
  /** Pesan setelah berhasil. */
  success?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (data: T) => void;
  variant?: "default" | "outline" | "destructive";
  /** Konfirmasi sebelum kirim, untuk tindakan yang tidak bisa dibatalkan. */
  confirm?: string;
  disabled?: boolean;
};

/** Formulir generik: kirim ke server action, tampilkan galat atau pesan sukses, lalu segarkan halaman. */
export function ActionForm<T>({
  action,
  build,
  submit,
  children,
  className,
  success = "Tersimpan.",
  resetOnSuccess = true,
  onSuccess,
  variant = "default",
  confirm,
  disabled,
}: Props<T>) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [galat, setGalat] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(form);
    setGalat(null);
    setOk(false);
    start(async () => {
      const res = await action(build(fd));
      if (!res.ok) {
        setGalat(res.error);
        return;
      }
      setOk(true);
      if (resetOnSuccess) form.reset();
      onSuccess?.(res.data);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
      {children}
      {galat && <Alert tone="bahaya">{galat}</Alert>}
      {ok && !galat && <Alert tone="sukses">{success}</Alert>}
      <Button type="submit" variant={variant} disabled={pending || disabled}>
        {pending ? "Memproses…" : submit}
      </Button>
    </form>
  );
}

/** Tombol tunggal untuk tindakan tanpa isian (mis. ajukan ulang). */
export function ActionButton<T>({
  action,
  input,
  label,
  confirm,
  variant = "outline",
  size = "sm",
}: {
  action: (input: unknown) => Promise<ActionResult<T>>;
  input: unknown;
  label: string;
  confirm?: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [galat, setGalat] = React.useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setGalat(null);
          start(async () => {
            const res = await action(input);
            if (!res.ok) setGalat(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Memproses…" : label}
      </Button>
      {galat && <Alert tone="bahaya">{galat}</Alert>}
    </div>
  );
}
