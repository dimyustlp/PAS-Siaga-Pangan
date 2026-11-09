export default function Memuat() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Memuat halaman">
      <div className="h-7 w-44 rounded bg-muted" />
      {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}
    </div>
  );
}
