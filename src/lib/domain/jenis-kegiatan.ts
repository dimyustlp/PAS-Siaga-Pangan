/** Teks jenis kegiatan untuk tampilan: "Peternakan · ayam petelur", atau hanya detailnya bila jenisnya Lainnya. */
export function labelJenis(jenis: string | null | undefined, detail?: string | null): string {
  const j = jenis ?? "-";
  const d = detail?.trim();
  if (!d) return j;
  return j === "Lainnya" ? d : `${j} · ${d}`;
}
