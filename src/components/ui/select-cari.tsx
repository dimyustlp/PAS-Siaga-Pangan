"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Opsi = { value: string; label: string; disabled?: boolean; grup?: string };

/** Mengambil teks polos dari isi <option> (bisa berupa teks, angka, atau campuran). */
function teks(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(teks).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return teks(node.props.children);
  return "";
}

function kumpulkan(children: React.ReactNode, grup?: string, hasil: Opsi[] = []): Opsi[] {
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c)) return;
    const el = c as React.ReactElement<{ children?: React.ReactNode; value?: unknown; disabled?: boolean; label?: string }>;
    if (el.type === React.Fragment) kumpulkan(el.props.children, grup, hasil);
    else if (el.type === "optgroup") kumpulkan(el.props.children, el.props.label, hasil);
    else if (el.type === "option") {
      const label = teks(el.props.children);
      hasil.push({ value: el.props.value === undefined ? label : String(el.props.value), label, disabled: el.props.disabled, grup });
    }
  });
  return hasil;
}

const setelNilai = (el: HTMLSelectElement, v: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(el, v);
  el.dispatchEvent(new Event("change", { bubbles: true }));
};

/** Daftar pilihan pendek tetap memakai pilihan bawaan; yang panjang mendapat kotak pencarian. */
const AMBANG = 6;

const GAYA =
  "flex h-10 w-full items-center rounded-[9px] border border-input bg-white px-3.5 py-2 text-base transition-[border-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

/**
 * Pengganti <select> yang bisa dicari. Elemen <select> asli tetap ada (tersembunyi) sehingga
 * formulir, `name`, `required`, `onChange`, dan reset formulir tetap bekerja seperti biasa.
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    const opsi = React.useMemo(() => kumpulkan(children), [children]);
    const pakaiCari = opsi.length > AMBANG;
    const asli = React.useRef<HTMLSelectElement | null>(null);
    const kotak = React.useRef<HTMLDivElement>(null);
    const daftar = React.useRef<HTMLUListElement>(null);
    const awal = String(props.value ?? props.defaultValue ?? opsi.find((o) => !o.disabled)?.value ?? "");
    const [nilai, setNilai] = React.useState(awal);
    const [buka, setBuka] = React.useState(false);
    const [cari, setCari] = React.useState("");
    const [sorot, setSorot] = React.useState(0);

    const gabungRef = (el: HTMLSelectElement | null) => {
      asli.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = el;
    };

    React.useEffect(() => {
      if (props.value !== undefined) setNilai(String(props.value));
    }, [props.value]);

    React.useEffect(() => {
      const el = asli.current;
      if (!el || !pakaiCari) return;
      setNilai(el.value);
      const ubah = () => setNilai(el.value);
      el.addEventListener("change", ubah);
      const form = el.form;
      const reset = () => setTimeout(() => setNilai(el.value), 0);
      form?.addEventListener("reset", reset);
      return () => {
        el.removeEventListener("change", ubah);
        form?.removeEventListener("reset", reset);
      };
    }, [pakaiCari]);

    React.useEffect(() => {
      if (!buka) return;
      const tutup = (e: MouseEvent) => {
        if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false);
      };
      document.addEventListener("mousedown", tutup);
      return () => document.removeEventListener("mousedown", tutup);
    }, [buka]);

    const kata = cari.trim().toLowerCase();
    const tersaring = kata ? opsi.filter((o) => `${o.label} ${o.grup ?? ""}`.toLowerCase().includes(kata)) : opsi;

    React.useEffect(() => {
      setSorot(Math.max(0, tersaring.findIndex((o) => o.value === nilai)));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buka, cari]);

    React.useEffect(() => {
      daftar.current?.querySelector<HTMLElement>(`[data-i="${sorot}"]`)?.scrollIntoView({ block: "nearest" });
    }, [sorot]);

    if (!pakaiCari) {
      return (
        <select ref={gabungRef} className={cn(GAYA, className)} {...props}>
          {children}
        </select>
      );
    }

    function pilih(o: Opsi) {
      if (o.disabled || !asli.current) return;
      setelNilai(asli.current, o.value);
      setNilai(o.value);
      setBuka(false);
      setCari("");
    }

    function tombol(e: React.KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSorot((i) => Math.min(tersaring.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSorot((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const o = tersaring[sorot];
        if (o) pilih(o);
      } else if (e.key === "Escape") {
        setBuka(false);
      }
    }

    const terpilih = opsi.find((o) => o.value === nilai);
    const { id, disabled } = props;

    return (
      <div ref={kotak} className={cn("relative w-full", className)}>
        <select ref={gabungRef} {...props} className="sr-only" tabIndex={-1} aria-hidden>
          {children}
        </select>
        <button
          type="button"
          id={id ? `${id}-cari` : undefined}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={buka}
          onClick={() => setBuka((b) => !b)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setBuka(true);
            }
          }}
          className={cn(GAYA, "justify-between gap-2 text-left")}
        >
          <span className={cn("truncate", !terpilih?.value && "text-muted-foreground")}>{terpilih?.label || "Pilih…"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        {buka && (
          <div className="kaca absolute left-0 right-0 top-full z-50 mt-1.5 min-w-[16rem] rounded-xl p-1.5">
            <label className="mb-1 flex items-center gap-2 rounded-lg border border-input bg-white px-2.5 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                onKeyDown={tombol}
                placeholder="Ketik untuk mencari…"
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Cari pilihan"
              />
            </label>
            <ul ref={daftar} role="listbox" className="max-h-72 overflow-y-auto text-sm">
              {tersaring.map((o, i) => (
                <li
                  key={`${o.value}-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={o.value === nilai}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => setSorot(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pilih(o);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5",
                    i === sorot && "bg-secondary",
                    o.disabled && "cursor-not-allowed opacity-50",
                    o.value === nilai && "font-semibold text-primary"
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", o.value === nilai ? "opacity-100" : "opacity-0")} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{o.label || "—"}</span>
                  {o.grup && <span className="shrink-0 text-[0.6875rem] text-muted-foreground">{o.grup}</span>}
                </li>
              ))}
              {tersaring.length === 0 && <li className="px-2.5 py-3 text-muted-foreground">Tidak ditemukan.</li>}
            </ul>
            <p className="px-2.5 pt-1 text-[0.6875rem] text-muted-foreground">{tersaring.length} dari {opsi.length} pilihan</p>
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
