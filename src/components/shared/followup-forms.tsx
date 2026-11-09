import { ActionForm } from "@/components/shared/action-form";
import { UploadField } from "@/components/shared/upload-field";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createFollowUp, progressFollowUp, verifyFollowUp } from "@/lib/actions/followups";
import { keInputWib } from "@/lib/form";
import { SUMBER_TINDAK_LANJUT } from "@/lib/validations/followup";
import type { Tables } from "@/lib/supabase/database.types";

type Pelaksana = { id: string; full_name: string; role: string };

export function FormTindakLanjutBaru({
  sessionId,
  gangguan,
  pelaksana,
}: {
  sessionId: string;
  gangguan: Tables<"incidents">[];
  pelaksana: Pelaksana[];
}) {
  const besok = keInputWib(new Date(Date.now() + 24 * 3600_000));
  return (
    <ActionForm
      action={createFollowUp}
      submit="Tugaskan tindak lanjut"
      fields={{
        session_id: { v: sessionId },
        sumber: { s: "sumber" },
        incident_id: { s: "gangguan" },
        uraian: { s: "uraian" },
        penanggung_jawab_id: { s: "pj" },
        penanggung_jawab_nama: { s: "pjnama" },
        tenggat: { w: "tenggat" },
        pemeriksaan_ulang_at: { w: "ulang" },
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sumber" htmlFor="tl-sumber">
          <Select id="tl-sumber" name="sumber" required defaultValue="Gangguan">
            {SUMBER_TINDAK_LANJUT.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Terkait gangguan (opsional)" htmlFor="tl-gangguan">
          <Select id="tl-gangguan" name="gangguan" defaultValue="">
            <option value="">Tidak terkait gangguan tertentu</option>
            {gangguan.map((g) => <option key={g.id} value={g.id}>{g.kategori_gangguan}</option>)}
          </Select>
        </Field>
        <Field label="Uraian tindak lanjut" htmlFor="tl-uraian" className="sm:col-span-2">
          <Textarea id="tl-uraian" name="uraian" rows={2} required />
        </Field>
        <Field label="Penanggung jawab (akun)" htmlFor="tl-pj" hint="Pilih akun, atau tulis nama bila bukan pengguna aplikasi.">
          <Select id="tl-pj" name="pj" defaultValue="">
            <option value="">— tulis nama di kolom sebelah —</option>
            {pelaksana.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.role === "operator" ? "Operator" : "Pengawal"})</option>)}
          </Select>
        </Field>
        <Field label="Atau nama penanggung jawab" htmlFor="tl-pjnama"><Input id="tl-pjnama" name="pjnama" /></Field>
        <Field label="Tenggat (WIB)" htmlFor="tl-tenggat"><Input id="tl-tenggat" name="tenggat" type="datetime-local" required defaultValue={besok} /></Field>
        <Field label="Pemeriksaan ulang (opsional)" htmlFor="tl-ulang"><Input id="tl-ulang" name="ulang" type="datetime-local" /></Field>
      </div>
    </ActionForm>
  );
}

/** Aksi sesuai peran: pelaksana mengerjakan/menyelesaikan, Kepala memverifikasi yang sudah selesai. */
export function AksiTindakLanjut({ f, peran }: { f: Tables<"follow_ups">; peran: "kepala" | "pelaksana" }) {
  if (f.status === "Terverifikasi") return null;

  if (peran === "kepala") {
    if (f.status !== "Selesai") return <p className="text-xs text-muted-foreground">Menunggu pelaksana menyelesaikan.</p>;
    return (
      <ActionForm
        action={verifyFollowUp}
        submit="Verifikasi"
        fields={{ id: { v: f.id }, hasil: { s: "hasil" } }}
        className="space-y-2"
      >
        <Field label="Hasil pemeriksaan Anda" htmlFor={`v-${f.id}`}>
          <Input id={`v-${f.id}`} name="hasil" required placeholder="Mis. sudah dicek di lokasi, pagar terpasang" />
        </Field>
      </ActionForm>
    );
  }

  if (f.status === "Selesai") return <p className="text-xs text-muted-foreground">Menunggu verifikasi Kepala Pengamanan.</p>;
  return (
    <ActionForm
      action={progressFollowUp}
      submit="Perbarui"
      fields={{ id: { v: f.id }, status: { s: "status" }, catatan_selesai: { s: "catatan" }, bukti_path: { s: "bukti" } }}
      className="space-y-2"
    >
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <Select name="status" defaultValue="Dikerjakan" aria-label="Status baru">
          <option value="Dikerjakan">Sedang dikerjakan</option>
          <option value="Selesai">Selesai</option>
        </Select>
        <Input name="catatan" placeholder="Catatan (wajib bila selesai)" aria-label="Catatan" />
      </div>
      <UploadField bucket="pas-siaga-evidence" sessionId={f.session_id} name="bukti" accept="image/jpeg,image/png,image/webp" />
    </ActionForm>
  );
}
