export default function Memuat() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" role="status" aria-label="Memuat halaman">
      <div className="h-28 rounded-2xl kilau" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl kilau" />)}
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 rounded kilau" />
        <div className="h-64 rounded-2xl kilau" />
      </div>
    </div>
  );
}
