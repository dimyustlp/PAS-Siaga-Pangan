-- 21. Penyelarasan dengan Pedoman Penyelenggaraan Pengamanan Kegiatan Ketahanan Pangan Pemasyarakatan (2026).
-- Isi: kolom rencana (lahan tersedia/aktif, komoditas, mitra), dokumen wajib a-m, kelompok kerja sesi,
-- syarat pengajuan ulang untuk Ditunda, perubahan rencana dan koreksi data, status per 8 variabel,
-- kontrol alat/mesin/bahan, akses pihak luar, pengembalian sebagian, penanda kualitas data,
-- dan instrumen penilaian 19 indikator beserta saran skor otomatis.

-- =====================================================================
-- 1. Kolom baru
-- =====================================================================
alter table public.activities
  add column if not exists komoditas text check (komoditas is null or char_length(komoditas) <= 200),
  add column if not exists tahap_pekerjaan text check (tahap_pekerjaan is null or char_length(tahap_pekerjaan) <= 300),
  add column if not exists mitra text check (mitra is null or char_length(mitra) <= 200),
  add column if not exists pendamping_teknis text check (pendamping_teknis is null or char_length(pendamping_teknis) <= 200),
  add column if not exists jam_kegiatan text check (jam_kegiatan is null or jam_kegiatan ~ '^\d{2}:\d{2}$'),
  add column if not exists jam_kembali text check (jam_kembali is null or jam_kembali ~ '^\d{2}:\d{2}$');

alter table public.daily_sessions
  add column if not exists lahan_aktif_ha numeric check (lahan_aktif_ha is null or lahan_aktif_ha >= 0),
  add column if not exists batas_keterlambatan_menit integer not null default 30
    check (batas_keterlambatan_menit between 1 and 1440);

alter table public.decisions
  add column if not exists syarat_pengajuan_ulang text check (syarat_pengajuan_ulang is null or char_length(syarat_pengajuan_ulang) <= 1000);

alter table public.field_logs
  add column if not exists diverifikasi_at timestamptz,
  add column if not exists diverifikasi_oleh uuid;

-- =====================================================================
-- 2. Penjaga umum: siapa boleh mencatat pada sesi
-- =====================================================================
create or replace function private.boleh_catat_sesi(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (select private.app_role())
    when 'pengawal' then private.pengawal_can_log(p_session)
    when 'operator' then private.can_view_session(p_session)
      and exists (select 1 from public.daily_sessions s where s.id = p_session and s.ditutup_at is null)
    when 'kepala_pengamanan' then private.can_view_session(p_session)
      and exists (select 1 from public.daily_sessions s where s.id = p_session and s.ditutup_at is null)
    else false end
$$;

create or replace function private.nama_variabel(p int)
returns text language sql immutable set search_path = '' as $$
  select (array[
    'Dokumen, persetujuan, dan penugasan',
    'Identitas, jumlah warga binaan, dan serah terima',
    'Lokasi, rute, dan batas area',
    'Pengawal, pengawas, dan penguasaan kegiatan',
    'Alat, mesin, bahan, dan sarana fisik',
    'Komunikasi dan pencatatan',
    'Gelang monitor warga binaan',
    'Keselamatan dan gangguan di lokasi'])[p]
$$;

-- =====================================================================
-- 3. Dokumen wajib a-m per sesi
-- =====================================================================
create table public.sesi_dokumen (
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  kode          text not null check (kode in ('a','b','c','d','e','f','g','h','i','j','k','l','m')),
  berlaku       boolean not null default true,
  tersedia      boolean not null default false,
  nomor         text check (nomor is null or char_length(nomor) <= 200),
  alasan_tb     text check (alasan_tb is null or char_length(alasan_tb) <= 500),
  diperiksa_oleh uuid,
  diperiksa_at  timestamptz,
  primary key (session_id, kode),
  constraint sesi_dokumen_tb_alasan check (berlaku or btrim(coalesce(alasan_tb, '')) <> '')
);
alter table public.sesi_dokumen enable row level security;
create policy sesi_dokumen_select on public.sesi_dokumen for select to authenticated
  using (private.can_view_session(session_id));
create policy sesi_dokumen_update on public.sesi_dokumen for update to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_session(session_id) and private.session_editable(session_id))
  with check ((select private.app_role()) = 'operator');

create or replace function private.guard_sesi_dokumen()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_luar boolean;
begin
  if new.session_id is distinct from old.session_id or new.kode is distinct from old.kode then
    raise exception 'Kolom ini tidak boleh diubah.' using errcode = '42501';
  end if;
  select coalesce(l.posisi, 'Dalam UPT') = 'Luar UPT' into v_luar
    from public.daily_sessions s join public.activities a on a.id = s.activity_id
    left join public.master_locations l on l.id = a.lokasi_id where s.id = new.session_id;
  if new.kode in ('f', 'g') and coalesce(v_luar, false) and not new.berlaku then
    raise exception 'Dokumen ini wajib untuk kegiatan di luar perimeter pengamanan utama.' using errcode = '22023';
  end if;
  if new.berlaku then new.alasan_tb := null; end if;
  new.diperiksa_oleh := (select auth.uid());
  new.diperiksa_at := now();
  return new;
end $$;
create trigger sesi_dokumen_guard before update on public.sesi_dokumen
  for each row execute function private.guard_sesi_dokumen();

create or replace function private.init_sesi_dokumen()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_luar boolean;
begin
  select coalesce(l.posisi, 'Dalam UPT') = 'Luar UPT' into v_luar
    from public.activities a left join public.master_locations l on l.id = a.lokasi_id where a.id = new.activity_id;
  insert into public.sesi_dokumen (session_id, kode, berlaku, alasan_tb)
  select new.id, k,
         case when k in ('f','g') then coalesce(v_luar, false) when k = 'j' then false else true end,
         case when k in ('f','g') and not coalesce(v_luar, false) then 'Kegiatan di dalam perimeter pengamanan utama'
              when k = 'j' then 'Belum ada perubahan rencana' else null end
    from unnest(array['a','b','c','d','e','f','g','h','i','j','k','l','m']) as k;
  return null;
end $$;
create trigger daily_sessions_dokumen after insert on public.daily_sessions
  for each row execute function private.init_sesi_dokumen();

-- Sesi yang sudah ada diberi baris dokumen dengan nilai awal "belum tersedia".
insert into public.sesi_dokumen (session_id, kode, berlaku, alasan_tb)
select s.id, k,
       case when k in ('f','g') then coalesce(l.posisi, 'Dalam UPT') = 'Luar UPT' when k = 'j' then false else true end,
       case when k in ('f','g') and coalesce(l.posisi, 'Dalam UPT') <> 'Luar UPT' then 'Kegiatan di dalam perimeter pengamanan utama'
            when k = 'j' then 'Belum ada perubahan rencana' else null end
  from public.daily_sessions s
  join public.activities a on a.id = s.activity_id
  left join public.master_locations l on l.id = a.lokasi_id
  cross join unnest(array['a','b','c','d','e','f','g','h','i','j','k','l','m']) as k
on conflict do nothing;

-- Daftar dokumen wajib yang belum tersedia. b, d, e dinilai otomatis dari nominatif dan unggahan.
create or replace function private.dokumen_kurang(p_session uuid)
returns text language sql stable security definer set search_path = '' as $$
  select string_agg(upper(d.kode) || ' (' || (array['rencana kegiatan','daftar nominatif','persetujuan kegiatan','rencana pengamanan',
      'surat perintah penugasan','dasar pengeluaran','rencana perjalanan dan pengembalian','inventaris alat dan sarana',
      'izin atau kerja sama lahan mitra','dokumen perubahan rencana','denah pengamanan','daftar pihak luar dan kendaraan',
      'catatan kelayakan teknis, APD, dan P3K'])[ascii(d.kode) - 96] || ')', ', ' order by d.kode)
    from public.sesi_dokumen d
   where d.session_id = p_session and d.berlaku and not d.tersedia and d.kode not in ('b','d','e')
$$;

-- =====================================================================
-- 4. Kelompok kerja pada sesi (Formulir 1)
-- =====================================================================
create table public.sesi_kelompok (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  nama          text not null check (btrim(nama) <> '' and char_length(nama) <= 150),
  jumlah_wb     integer not null default 0 check (jumlah_wb between 0 and 10000),
  area_aktif    text check (area_aktif is null or char_length(area_aktif) <= 300),
  pengawas      text check (pengawas is null or char_length(pengawas) <= 200),
  pengganti     text check (pengganti is null or char_length(pengganti) <= 200),
  jalur_serah_terima text check (jalur_serah_terima is null or char_length(jalur_serah_terima) <= 300),
  created_at    timestamptz not null default now()
);
create index sesi_kelompok_sesi_idx on public.sesi_kelompok (session_id);
alter table public.sesi_kelompok enable row level security;
create policy sesi_kelompok_select on public.sesi_kelompok for select to authenticated using (private.can_view_session(session_id));
create policy sesi_kelompok_write on public.sesi_kelompok for all to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_session(session_id) and private.session_editable(session_id))
  with check ((select private.app_role()) = 'operator' and private.can_view_session(session_id) and private.session_editable(session_id));

-- =====================================================================
-- 5. Perubahan rencana dan koreksi data (tidak dapat diubah setelah dicatat)
-- =====================================================================
create table public.perubahan_rencana (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  jenis         text not null check (jenis in ('Perubahan rencana', 'Koreksi data')),
  bagian        text not null check (btrim(bagian) <> '' and char_length(bagian) <= 200),
  nilai_awal    text not null check (char_length(nilai_awal) <= 1000),
  nilai_baru    text not null check (btrim(nilai_baru) <> '' and char_length(nilai_baru) <= 1000),
  alasan        text not null check (btrim(alasan) <> '' and char_length(alasan) <= 1000),
  pejabat       text check (pejabat is null or char_length(pejabat) <= 200),
  bukti_url     text check (bukti_url is null or char_length(bukti_url) <= 500),
  waktu_dicatat timestamptz not null default now(),
  dicatat_oleh  uuid not null default auth.uid(),
  constraint perubahan_rencana_pejabat check (jenis = 'Koreksi data' or btrim(coalesce(pejabat, '')) <> '')
);
create index perubahan_rencana_sesi_idx on public.perubahan_rencana (session_id, waktu_dicatat);
alter table public.perubahan_rencana enable row level security;
create policy perubahan_rencana_select on public.perubahan_rencana for select to authenticated using (private.can_view_session(session_id));
create policy perubahan_rencana_insert on public.perubahan_rencana for insert to authenticated
  with check ((select private.app_role()) in ('operator', 'kepala_pengamanan')
              and private.boleh_catat_sesi(session_id) and dicatat_oleh = (select auth.uid()));

create or replace function private.perubahan_rencana_efek()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.jenis = 'Perubahan rencana' then
    update public.sesi_dokumen
       set berlaku = true, alasan_tb = null,
           tersedia = tersedia or btrim(coalesce(new.bukti_url, '')) <> ''
     where session_id = new.session_id and kode = 'j';
  end if;
  return null;
end $$;
create trigger perubahan_rencana_efek after insert on public.perubahan_rencana
  for each row execute function private.perubahan_rencana_efek();

-- =====================================================================
-- 6. Status per variabel (Lampiran instrumen status)
-- =====================================================================
create table public.status_variabel (
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  no            smallint not null check (no between 1 and 8),
  status        public.security_status,
  alasan_tb     text check (alasan_tb is null or char_length(alasan_tb) <= 500),
  bukti         text check (bukti is null or char_length(bukti) <= 1000),
  tindak_lanjut text check (tindak_lanjut is null or char_length(tindak_lanjut) <= 1000),
  diperbarui_oleh uuid,
  diperbarui_at timestamptz not null default now(),
  primary key (session_id, no),
  constraint status_variabel_tb check (status is not null or btrim(coalesce(alasan_tb, '')) <> '')
);
alter table public.status_variabel enable row level security;
create policy status_variabel_select on public.status_variabel for select to authenticated using (private.can_view_session(session_id));

create table public.status_variabel_riwayat (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  no            smallint not null,
  dari          public.security_status,
  ke            public.security_status,
  tb            boolean not null default false,
  alasan        text,
  oleh          uuid,
  waktu         timestamptz not null default now()
);
create index status_variabel_riwayat_idx on public.status_variabel_riwayat (session_id, waktu);
alter table public.status_variabel_riwayat enable row level security;
create policy status_variabel_riwayat_select on public.status_variabel_riwayat for select to authenticated using (private.can_view_session(session_id));

-- Variabel dengan status tertinggi yang masih berlaku. Dipakai sebagai batas bawah status keseluruhan.
create or replace function private.status_variabel_tertinggi(p_session uuid)
returns public.security_status language sql stable security definer set search_path = '' as $$
  select v.status from public.status_variabel v
   where v.session_id = p_session and v.status is not null
   order by private.status_rank(v.status) desc limit 1
$$;

create or replace function public.catat_status_variabel(
  p_session uuid, p_no integer, p_status text, p_alasan_tb text, p_bukti text, p_tindak_lanjut text, p_kondisi text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role := (select private.app_role());
  v_target public.security_status;
  v_lama public.status_variabel%rowtype;
  v_ada boolean;
  v_alasan text;
  v_tb boolean := false;
begin
  if not private.boleh_catat_sesi(p_session) then
    raise exception 'Ditolak: sesi sudah ditutup, belum diizinkan mulai untuk Pengawal, atau di luar UPT Anda.' using errcode = '42501';
  end if;
  if p_no not between 1 and 8 then raise exception 'Variabel tidak dikenal.' using errcode = '22023'; end if;
  select * into v_lama from public.status_variabel where session_id = p_session and no = p_no;
  v_ada := found;

  if p_status is null or btrim(p_status) = '' then
    v_tb := true;
    if btrim(coalesce(p_alasan_tb, '')) = '' then
      raise exception 'Alasan wajib diisi bila variabel ini ditandai tidak berlaku.' using errcode = '22023';
    end if;
    if p_no <> 7 then
      raise exception 'Hanya variabel gelang monitor yang boleh ditandai tidak berlaku, yaitu bila gelang tidak ditetapkan.' using errcode = '22023';
    end if;
    if v_ada and v_lama.status is not null and private.status_rank(v_lama.status) > 0 and v_role <> 'kepala_pengamanan' then
      raise exception 'Variabel yang sudah punya temuan tidak boleh diubah menjadi tidak berlaku.' using errcode = '22023';
    end if;
    v_target := null;
  else
    v_target := p_status::public.security_status;
  end if;

  -- Keberadaan WB yang belum pasti sekurang-kurangnya MERAH; tidak ditemukan setelah pemeriksaan langsung KRITIS.
  if v_target is not null and p_no = 2 then
    if p_kondisi = 'belum_pasti' and private.status_rank(v_target) < 2 then v_target := 'MERAH'; end if;
    if p_kondisi = 'tidak_ditemukan' then v_target := 'KRITIS'; end if;
  end if;

  if v_target is not null and v_ada and v_lama.status is not null
     and private.status_rank(v_target) < private.status_rank(v_lama.status) then
    if v_role <> 'kepala_pengamanan' then
      raise exception 'Status variabel hanya dapat diturunkan oleh Kepala Pengamanan setelah pemulihan diverifikasi.' using errcode = '42501';
    end if;
    if btrim(coalesce(p_bukti, '')) = '' or btrim(coalesce(p_tindak_lanjut, '')) = '' then
      raise exception 'Penurunan status wajib disertai bukti pemulihan dan hasil pemeriksaan.' using errcode = '22023';
    end if;
  end if;

  insert into public.status_variabel (session_id, no, status, alasan_tb, bukti, tindak_lanjut, diperbarui_oleh, diperbarui_at)
  values (p_session, p_no, v_target, case when v_tb then btrim(p_alasan_tb) end,
          nullif(btrim(coalesce(p_bukti, '')), ''), nullif(btrim(coalesce(p_tindak_lanjut, '')), ''), v_uid, now())
  on conflict (session_id, no) do update
    set status = excluded.status, alasan_tb = excluded.alasan_tb, bukti = excluded.bukti,
        tindak_lanjut = excluded.tindak_lanjut, diperbarui_oleh = excluded.diperbarui_oleh, diperbarui_at = excluded.diperbarui_at;

  v_alasan := coalesce(nullif(btrim(coalesce(p_tindak_lanjut, '')), ''), nullif(btrim(coalesce(p_bukti, '')), ''), p_alasan_tb, '-');
  insert into public.status_variabel_riwayat (session_id, no, dari, ke, tb, alasan, oleh)
  values (p_session, p_no, v_lama.status, v_target, v_tb, v_alasan, v_uid);

  -- Status keseluruhan mengikuti temuan terberat. Kenaikan otomatis; penurunan hanya lewat keputusan Kepala.
  if v_target is not null then
    perform private.naikkan_status(p_session, v_target, 'Entri lapangan',
      'Variabel ' || p_no || ' (' || private.nama_variabel(p_no) || '): ' || v_alasan, null, null, v_uid);
  end if;
end $$;

-- =====================================================================
-- 7. Kontrol alat, mesin, bahan, APD (Formulir 9)
-- =====================================================================
create table public.kontrol_alat (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  jenis         text not null check (jenis in ('Alat', 'Mesin', 'Bahan', 'APD', 'Sarana', 'Gelang')),
  nama          text not null check (btrim(nama) <> '' and char_length(nama) <= 200),
  satuan        text check (satuan is null or char_length(satuan) <= 30),
  diserahkan    numeric not null default 0 check (diserahkan >= 0),
  digunakan     numeric not null default 0 check (digunakan >= 0),
  kembali       numeric not null default 0 check (kembali >= 0),
  selisih       numeric generated always as (case when jenis = 'Bahan' then diserahkan - digunakan - kembali else diserahkan - kembali end) stored,
  tindakan      text check (tindakan is null or char_length(tindakan) <= 1000),
  petugas       text check (petugas is null or char_length(petugas) <= 150),
  dicatat_oleh  uuid not null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index kontrol_alat_sesi_idx on public.kontrol_alat (session_id);
alter table public.kontrol_alat enable row level security;
create policy kontrol_alat_select on public.kontrol_alat for select to authenticated using (private.can_view_session(session_id));
create policy kontrol_alat_insert on public.kontrol_alat for insert to authenticated
  with check (private.boleh_catat_sesi(session_id) and dicatat_oleh = (select auth.uid()));
create policy kontrol_alat_update on public.kontrol_alat for update to authenticated
  using (private.boleh_catat_sesi(session_id)) with check (private.boleh_catat_sesi(session_id));
create policy kontrol_alat_delete on public.kontrol_alat for delete to authenticated
  using (private.boleh_catat_sesi(session_id) and dicatat_oleh = (select auth.uid()));
create trigger kontrol_alat_touch before update on public.kontrol_alat
  for each row execute function private.touch_updated_at();

-- =====================================================================
-- 8. Akses pihak luar dan serah terima hasil (Formulir 10)
-- =====================================================================
create table public.akses_pihak_luar (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  identitas     text not null check (btrim(identitas) <> '' and char_length(identitas) <= 300),
  kendaraan     text check (kendaraan is null or char_length(kendaraan) <= 100),
  tujuan        text check (tujuan is null or char_length(tujuan) <= 300),
  waktu_masuk   timestamptz,
  waktu_keluar  timestamptz,
  barang_hasil  text check (barang_hasil is null or char_length(barang_hasil) <= 300),
  satuan        text check (satuan is null or char_length(satuan) <= 30),
  jumlah        numeric check (jumlah is null or jumlah >= 0),
  asal_tujuan   text check (asal_tujuan is null or char_length(asal_tujuan) <= 300),
  pemeriksaan   text check (pemeriksaan is null or char_length(pemeriksaan) <= 500),
  serah_terima  text check (serah_terima is null or char_length(serah_terima) <= 500),
  dicatat_oleh  uuid not null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index akses_pihak_luar_sesi_idx on public.akses_pihak_luar (session_id);
alter table public.akses_pihak_luar enable row level security;
create policy akses_luar_select on public.akses_pihak_luar for select to authenticated using (private.can_view_session(session_id));
create policy akses_luar_insert on public.akses_pihak_luar for insert to authenticated
  with check (private.boleh_catat_sesi(session_id) and dicatat_oleh = (select auth.uid()));
create policy akses_luar_update on public.akses_pihak_luar for update to authenticated
  using (private.boleh_catat_sesi(session_id)) with check (private.boleh_catat_sesi(session_id));
create policy akses_luar_delete on public.akses_pihak_luar for delete to authenticated
  using (private.boleh_catat_sesi(session_id) and dicatat_oleh = (select auth.uid()));

-- =====================================================================
-- 9. Pengembalian sebagian: dicatat per penyerahan, dijumlahkan tanpa hitung ganda
-- =====================================================================
create table public.pengembalian_sebagian (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.daily_sessions (id) on delete cascade,
  jumlah_wb     integer not null check (jumlah_wb between 0 and 10000),
  jumlah_alat   integer not null default 0 check (jumlah_alat between 0 and 10000),
  waktu_serah   timestamptz not null default now(),
  penyerah      text check (penyerah is null or char_length(penyerah) <= 150),
  penerima      text not null check (btrim(penerima) <> '' and char_length(penerima) <= 150),
  catatan       text check (catatan is null or char_length(catatan) <= 500),
  dicatat_oleh  uuid not null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index pengembalian_sebagian_sesi_idx on public.pengembalian_sebagian (session_id);
alter table public.pengembalian_sebagian enable row level security;
create policy pengembalian_sebagian_select on public.pengembalian_sebagian for select to authenticated using (private.can_view_session(session_id));
create policy pengembalian_sebagian_insert on public.pengembalian_sebagian for insert to authenticated
  with check (private.boleh_catat_sesi(session_id) and dicatat_oleh = (select auth.uid()));

-- =====================================================================
-- 10. Rekonsiliasi: jumlah pengembalian = serah terima akhir + pengembalian sebagian
-- =====================================================================
create or replace function private.hitung_rekonsiliasi(p_session uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_keluar jsonb; v_kembali jsonb; v_alasan text[] := '{}'; v_terbuka int;
  v_sb_wb int; v_sb_alat int; v_tot_wb int; v_tot_alat int; v_selisih_alat int; v_var_berat int;
begin
  select l.payload into v_keluar from public.field_logs l
   where l.session_id = p_session and l.jenis_entri = 'Serah terima di blok' and l.payload->>'tahap' = 'keluar'
   order by l.waktu_kejadian desc, l.dikirim_at desc limit 1;
  select l.payload into v_kembali from public.field_logs l
   where l.session_id = p_session and l.jenis_entri = 'Serah terima di blok' and l.payload->>'tahap' = 'kembali'
   order by l.waktu_kejadian desc, l.dikirim_at desc limit 1;
  select count(*) into v_terbuka from public.incidents i where i.session_id = p_session and not i.status_penyelesaian;
  select coalesce(sum(jumlah_wb), 0), coalesce(sum(jumlah_alat), 0) into v_sb_wb, v_sb_alat
    from public.pengembalian_sebagian where session_id = p_session;
  select count(*) into v_selisih_alat from public.kontrol_alat k
   where k.session_id = p_session and k.selisih <> 0 and btrim(coalesce(k.tindakan, '')) = '';
  select count(*) into v_var_berat from public.status_variabel v
   where v.session_id = p_session and v.status in ('MERAH', 'KRITIS');

  if v_keluar is null then v_alasan := array_append(v_alasan, 'belum ada serah terima keluar dari blok'); end if;
  if v_kembali is null then v_alasan := array_append(v_alasan, 'belum ada serah terima kembali ke blok'); end if;
  if v_keluar is not null and v_kembali is not null then
    v_tot_wb := (v_kembali->>'jumlah_wbp')::int + v_sb_wb;
    v_tot_alat := (v_kembali->>'jumlah_alat')::int + v_sb_alat;
    if v_tot_wb <> (v_keluar->>'jumlah_wbp')::int then
      v_alasan := array_append(v_alasan, 'jumlah WBP kembali tidak sama dengan jumlah saat keluar');
    end if;
    if v_tot_alat <> (v_keluar->>'jumlah_alat')::int then
      v_alasan := array_append(v_alasan, 'jumlah alat kerja kembali tidak sama dengan jumlah awal');
    end if;
    if coalesce((v_kembali->>'penggeledahan')::boolean, false) is not true then
      v_alasan := array_append(v_alasan, 'penggeledahan saat masuk blok belum dicentang Ya');
    end if;
  end if;
  if v_terbuka > 0 then v_alasan := array_append(v_alasan, v_terbuka::text || ' gangguan belum diverifikasi'); end if;
  if v_selisih_alat > 0 then v_alasan := array_append(v_alasan, v_selisih_alat::text || ' selisih alat atau bahan belum ditindaklanjuti'); end if;
  if v_var_berat > 0 then v_alasan := array_append(v_alasan, v_var_berat::text || ' variabel status masih MERAH atau KRITIS'); end if;

  return jsonb_build_object(
    'siap_tutup', cardinality(v_alasan) = 0,
    'alasan', to_jsonb(v_alasan),
    'wbp_keluar', v_keluar->>'jumlah_wbp',
    'wbp_kembali', case when v_kembali is null then null else v_tot_wb::text end,
    'wbp_sebagian', v_sb_wb::text,
    'alat_keluar', v_keluar->>'jumlah_alat',
    'alat_kembali', case when v_kembali is null then null else v_tot_alat::text end,
    'penggeledahan', v_kembali->>'penggeledahan',
    'gangguan_belum_diverifikasi', v_terbuka
  );
end $$;

-- =====================================================================
-- 11. Keputusan: dokumen wajib, syarat pengajuan ulang, dan batas penurunan status
-- =====================================================================
create or replace function private.apply_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s public.daily_sessions%rowtype; rek jsonb; v_target public.security_status; v_kurang text; v_nominatif int; v_dok text; v_var public.security_status;
begin
  if (select private.app_role()) is distinct from 'kepala_pengamanan' then
    raise exception 'Hanya Kepala Pengamanan yang boleh membuat keputusan.' using errcode = '42501';
  end if;
  select * into s from public.daily_sessions where id = new.session_id for update;
  if not found then raise exception 'Sesi tidak ditemukan.' using errcode = '22023'; end if;
  if not private.can_view_upt(private.session_upt(s.id)) then
    raise exception 'Sesi ini berada di luar UPT Anda.' using errcode = '42501';
  end if;
  if s.ditutup_at is not null then raise exception 'Sesi sudah ditutup.' using errcode = '22023'; end if;

  case new.jenis_keputusan
    when 'Dapat Dimulai', 'Perbaiki Dulu', 'Ditunda' then
      if s.status_kesiapan <> 'Menunggu' then
        raise exception 'Keputusan kesiapan hanya bisa diberikan saat status Menunggu.' using errcode = '22023';
      end if;
      if new.jenis_keputusan = 'Dapat Dimulai' then
        if s.dokumen_surat_perintah is null or s.dokumen_rencana_pengamanan is null then
          raise exception 'Surat perintah dan rencana pengamanan belum diunggah Operator.' using errcode = '22023';
        end if;
        select count(*) into v_nominatif from public.session_inmates i where i.session_id = s.id;
        if v_nominatif = 0 or v_nominatif <> s.jumlah_narapidana then
          raise exception 'Daftar nominatif belum lengkap atau jumlahnya tidak sama dengan jumlah WB pada rencana.' using errcode = '22023';
        end if;
        select string_agg(r.kode, ', ' order by r.kode) into v_kurang from public.session_readiness r
         where r.session_id = s.id and not r.terpenuhi and (r.kode <> 'f' or s.pakai_gelang_monitor);
        if v_kurang is not null then
          raise exception 'Aspek kesiapan belum terpenuhi: %.', upper(v_kurang) using errcode = '22023';
        end if;
        v_dok := private.dokumen_kurang(s.id);
        if v_dok is not null then
          raise exception 'Dokumen wajib belum tersedia: %.', v_dok using errcode = '22023';
        end if;
      end if;
      if new.jenis_keputusan in ('Perbaiki Dulu', 'Ditunda') and btrim(coalesce(new.catatan_keputusan, '')) = '' then
        raise exception 'Catatan wajib diisi untuk keputusan Perbaiki Dulu atau Ditunda.' using errcode = '22023';
      end if;
      if new.jenis_keputusan = 'Ditunda' and btrim(coalesce(new.syarat_pengajuan_ulang, '')) = '' then
        raise exception 'Syarat pengajuan kembali wajib dicatat untuk keputusan Ditunda.' using errcode = '22023';
      end if;
      update public.daily_sessions set status_kesiapan = new.jenis_keputusan::public.readiness_status where id = s.id;

    when 'Verifikasi Gangguan' then
      if new.incident_id is null then raise exception 'Pilih gangguan yang diverifikasi.' using errcode = '22023'; end if;
      if btrim(coalesce(new.catatan_keputusan, '')) = '' then raise exception 'Catatan verifikasi wajib diisi.' using errcode = '22023'; end if;
      update public.incidents set status_penyelesaian = true, diverifikasi_at = now(), diverifikasi_oleh = new.pejabat_id
       where id = new.incident_id and session_id = s.id and not status_penyelesaian;
      if not found then raise exception 'Gangguan tidak ditemukan pada sesi ini atau sudah diverifikasi.' using errcode = '22023'; end if;

    when 'Penurunan Status' then
      v_target := coalesce(new.status_baru, 'HIJAU'::public.security_status);
      if s.status_keamanan = 'HIJAU' then raise exception 'Status sudah HIJAU.' using errcode = '22023'; end if;
      if private.status_rank(v_target) >= private.status_rank(s.status_keamanan) then
        raise exception 'Status baru harus lebih rendah dari status sekarang (%).', s.status_keamanan using errcode = '22023';
      end if;
      if btrim(coalesce(new.catatan_keputusan, '')) = '' then raise exception 'Alasan penurunan status wajib dicatat.' using errcode = '22023'; end if;
      if btrim(coalesce(new.bukti_url, '')) = '' then raise exception 'Foto bukti pemulihan keadaan wajib diunggah.' using errcode = '22023'; end if;
      if v_target = 'HIJAU' and exists (select 1 from public.incidents i where i.session_id = s.id and not i.status_penyelesaian) then
        raise exception 'Masih ada gangguan yang belum diverifikasi.' using errcode = '22023';
      end if;
      v_var := private.status_variabel_tertinggi(s.id);
      if v_var is not null and private.status_rank(v_target) < private.status_rank(v_var) then
        raise exception 'Status keseluruhan mengikuti temuan terberat. Masih ada variabel berstatus %; pulihkan dan verifikasi variabel itu lebih dulu.', v_var using errcode = '22023';
      end if;
      new.status_baru := v_target;
      update public.daily_sessions set status_keamanan = v_target where id = s.id;
      insert into public.status_history (session_id, dari, ke, sumber, alasan, decision_id, oleh)
      values (s.id, s.status_keamanan, v_target, 'Keputusan Kepala', btrim(new.catatan_keputusan), new.id, new.pejabat_id);

    when 'Arahan Tindakan' then
      if s.status_kesiapan <> 'Dapat Dimulai' or s.status_keamanan = 'HIJAU' then
        raise exception 'Arahan tindakan dicatat saat kegiatan berjalan dengan status KUNING, MERAH, atau KRITIS.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.catatan_keputusan, '')) = '' then raise exception 'Isi arahan tindakan wajib dicatat.' using errcode = '22023'; end if;

    when 'Tutup Kegiatan' then
      if s.status_kesiapan <> 'Dapat Dimulai' then raise exception 'Kegiatan yang belum dimulai tidak bisa ditutup.' using errcode = '22023'; end if;
      rek := private.hitung_rekonsiliasi(s.id);
      if not (rek->>'siap_tutup')::boolean then
        raise exception 'Kegiatan belum bisa ditutup: %', array_to_string(array(select jsonb_array_elements_text(rek->'alasan')), '; ') using errcode = '22023';
      end if;
      update public.daily_sessions set ditutup_at = now(), ditutup_oleh = new.pejabat_id where id = s.id;
    else
      raise exception 'Jenis keputusan tidak dikenal.' using errcode = '22023';
  end case;
  return new;
end $$;

-- =====================================================================
-- 12. Kualitas data: verifikasi entri dan ringkasan per sesi
-- =====================================================================
create or replace function public.verifikasi_entri(p_session uuid, p_log uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if (select private.app_role()) is distinct from 'kepala_pengamanan' or not private.can_view_session(p_session) then
    raise exception 'Hanya Kepala Pengamanan UPT ini yang dapat memverifikasi entri.' using errcode = '42501';
  end if;
  update public.field_logs l
     set diverifikasi_at = now(), diverifikasi_oleh = (select auth.uid())
   where l.session_id = p_session and l.diverifikasi_at is null and (p_log is null or l.id = p_log);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace view public.v_kualitas_data with (security_invoker = true) as
select s.id as session_id,
       count(l.id)::int as entri_total,
       max(l.waktu_kejadian) as cek_terakhir_at,
       max(l.dikirim_at) as diterima_terakhir_at,
       (count(*) filter (where l.susulan))::int as entri_susulan,
       (count(*) filter (where l.dikirim_at - l.waktu_kejadian > make_interval(mins => s.batas_keterlambatan_menit)))::int as entri_terlambat,
       (count(*) filter (where l.diverifikasi_at is null
                           and (l.susulan or l.dikirim_at - l.waktu_kejadian > make_interval(mins => s.batas_keterlambatan_menit))))::int as entri_belum_verifikasi
  from public.daily_sessions s
  left join public.field_logs l on l.session_id = s.id
 group by s.id, s.batas_keterlambatan_menit;
grant select on public.v_kualitas_data to authenticated;

-- =====================================================================
-- 13. Instrumen penilaian 19 indikator
-- =====================================================================
create table public.penilaian_evaluasi (
  id              uuid primary key default gen_random_uuid(),
  kode_upt        text not null,
  activity_id     uuid references public.activities (id) on delete set null,
  kegiatan_lokasi text not null check (btrim(kegiatan_lokasi) <> '' and char_length(kegiatan_lokasi) <= 300),
  periode_dari    date not null,
  periode_sampai  date not null check (periode_sampai >= periode_dari),
  tanggal_penilaian date not null default current_date,
  penilai_nama    text not null check (btrim(penilai_nama) <> '' and char_length(penilai_nama) <= 200),
  penilai_jabatan text not null check (btrim(penilai_jabatan) <> '' and char_length(penilai_jabatan) <= 200),
  penanggung_jawab text check (penanggung_jawab is null or char_length(penanggung_jawab) <= 200),
  jumlah_sesi_diperiksa integer not null default 0 check (jumlah_sesi_diperiksa between 0 and 100000),
  sertakan_latihan boolean not null default false,
  tindakan_segera text check (tindakan_segera is null or char_length(tindakan_segera) <= 2000),
  tindakan_dilaksanakan text check (tindakan_dilaksanakan is null or char_length(tindakan_dilaksanakan) <= 2000),
  status          text not null default 'Draf' check (status in ('Draf', 'Final', 'Disahkan')),
  dibuat_oleh     uuid not null default auth.uid(),
  disahkan_oleh   uuid,
  disahkan_at     timestamptz,
  catatan_pengesahan text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index penilaian_evaluasi_upt_idx on public.penilaian_evaluasi (kode_upt, tanggal_penilaian desc);
alter table public.penilaian_evaluasi enable row level security;
create policy penilaian_select on public.penilaian_evaluasi for select to authenticated using (private.can_view_upt(kode_upt));
create policy penilaian_insert on public.penilaian_evaluasi for insert to authenticated
  with check ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
              and private.can_view_upt(kode_upt) and dibuat_oleh = (select auth.uid()) and status = 'Draf');
create policy penilaian_update on public.penilaian_evaluasi for update to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan') and private.can_view_upt(kode_upt) and status = 'Draf')
  with check ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan') and private.can_view_upt(kode_upt) and status = 'Draf');
create policy penilaian_delete on public.penilaian_evaluasi for delete to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan') and private.can_view_upt(kode_upt) and status = 'Draf');
create trigger penilaian_touch before update on public.penilaian_evaluasi
  for each row execute function private.touch_updated_at();

create table public.penilaian_skor (
  penilaian_id  uuid not null references public.penilaian_evaluasi (id) on delete cascade,
  no            smallint not null check (no between 1 and 19),
  skor          smallint check (skor in (0, 1, 2)),
  tb            boolean not null default false,
  alasan_tb     text check (alasan_tb is null or char_length(alasan_tb) <= 500),
  bukti         text check (bukti is null or char_length(bukti) <= 2000),
  saran_skor    smallint check (saran_skor in (0, 1, 2)),
  saran_tb      boolean not null default false,
  saran_dasar   text,
  primary key (penilaian_id, no),
  constraint penilaian_skor_tb check (not tb or skor is null)
);
alter table public.penilaian_skor enable row level security;
create policy penilaian_skor_select on public.penilaian_skor for select to authenticated
  using (exists (select 1 from public.penilaian_evaluasi p where p.id = penilaian_id and private.can_view_upt(p.kode_upt)));
create policy penilaian_skor_update on public.penilaian_skor for update to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         and exists (select 1 from public.penilaian_evaluasi p where p.id = penilaian_id and p.status = 'Draf' and private.can_view_upt(p.kode_upt)))
  with check ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan'));

create or replace function private.init_penilaian_skor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.penilaian_skor (penilaian_id, no) select new.id, g from generate_series(1, 19) g;
  return null;
end $$;
create trigger penilaian_init after insert on public.penilaian_evaluasi
  for each row execute function private.init_penilaian_skor();

create table public.penilaian_tindak_lanjut (
  id            uuid primary key default gen_random_uuid(),
  penilaian_id  uuid not null references public.penilaian_evaluasi (id) on delete cascade,
  no_indikator  smallint check (no_indikator between 1 and 19),
  temuan        text not null check (btrim(temuan) <> '' and char_length(temuan) <= 2000),
  tindakan      text check (tindakan is null or char_length(tindakan) <= 2000),
  penanggung_jawab text check (penanggung_jawab is null or char_length(penanggung_jawab) <= 200),
  batas_waktu   date,
  bukti_penyelesaian text check (bukti_penyelesaian is null or char_length(bukti_penyelesaian) <= 2000),
  hasil_verifikasi text check (hasil_verifikasi is null or char_length(hasil_verifikasi) <= 2000),
  tanggal_verifikasi date,
  selesai       boolean not null default false,
  selesai_oleh  uuid,
  selesai_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index penilaian_tl_idx on public.penilaian_tindak_lanjut (penilaian_id);
alter table public.penilaian_tindak_lanjut enable row level security;
create policy penilaian_tl_select on public.penilaian_tindak_lanjut for select to authenticated
  using (exists (select 1 from public.penilaian_evaluasi p where p.id = penilaian_id and private.can_view_upt(p.kode_upt)));
create policy penilaian_tl_insert on public.penilaian_tindak_lanjut for insert to authenticated
  with check ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
              and exists (select 1 from public.penilaian_evaluasi p where p.id = penilaian_id and private.can_view_upt(p.kode_upt)));
create policy penilaian_tl_update on public.penilaian_tindak_lanjut for update to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'ka_upt')
         and exists (select 1 from public.penilaian_evaluasi p where p.id = penilaian_id and private.can_view_upt(p.kode_upt)))
  with check ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'ka_upt'));

-- Penyelesaian hanya dinyatakan oleh pejabat berwenang (Kepala Pengamanan atau Ka.UPT).
create or replace function private.guard_penilaian_tl()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.penilaian_id is distinct from old.penilaian_id or new.no_indikator is distinct from old.no_indikator then
    raise exception 'Kolom ini tidak boleh diubah.' using errcode = '42501';
  end if;
  if new.selesai is distinct from old.selesai or new.selesai_oleh is distinct from old.selesai_oleh then
    if (select private.app_role()) not in ('kepala_pengamanan', 'ka_upt') then
      raise exception 'Penyelesaian tindak lanjut hanya dinyatakan oleh Kepala Pengamanan atau Ka.UPT.' using errcode = '42501';
    end if;
    if new.selesai then
      if btrim(coalesce(new.bukti_penyelesaian, '')) = '' or btrim(coalesce(new.hasil_verifikasi, '')) = '' then
        raise exception 'Bukti penyelesaian dan hasil verifikasi wajib diisi sebelum dinyatakan selesai.' using errcode = '22023';
      end if;
      new.selesai_oleh := (select auth.uid());
      new.selesai_at := now();
      new.tanggal_verifikasi := coalesce(new.tanggal_verifikasi, current_date);
    else
      new.selesai_oleh := null; new.selesai_at := null;
    end if;
  elsif (select private.app_role()) = 'ka_upt' and (
        new.temuan is distinct from old.temuan or new.tindakan is distinct from old.tindakan
        or new.penanggung_jawab is distinct from old.penanggung_jawab or new.batas_waktu is distinct from old.batas_waktu) then
    raise exception 'Ka.UPT hanya menyatakan penyelesaian tindak lanjut.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger penilaian_tl_guard before update on public.penilaian_tindak_lanjut
  for each row execute function private.guard_penilaian_tl();

-- Mengunci penilaian: semua indikator harus berskor atau TB beralasan; tindak lanjut dibuat untuk skor 0 dan 1.
create or replace function public.kunci_penilaian(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.penilaian_evaluasi%rowtype; v_kosong text; v_tb_tanpa text; r record;
begin
  select * into p from public.penilaian_evaluasi where id = p_id for update;
  if not found or not private.can_view_upt(p.kode_upt) then raise exception 'Penilaian tidak ditemukan.' using errcode = '22023'; end if;
  if (select private.app_role()) not in ('administrator', 'operator', 'kepala_pengamanan') then
    raise exception 'Peran Anda tidak dapat mengunci penilaian.' using errcode = '42501';
  end if;
  if p.status <> 'Draf' then raise exception 'Penilaian ini sudah dikunci.' using errcode = '22023'; end if;
  select string_agg(no::text, ', ' order by no) into v_kosong from public.penilaian_skor where penilaian_id = p_id and skor is null and not tb;
  if v_kosong is not null then raise exception 'Indikator belum dinilai: %.', v_kosong using errcode = '22023'; end if;
  select string_agg(no::text, ', ' order by no) into v_tb_tanpa from public.penilaian_skor
   where penilaian_id = p_id and tb and btrim(coalesce(alasan_tb, '')) = '';
  if v_tb_tanpa is not null then raise exception 'Alasan TB wajib diisi untuk indikator: %.', v_tb_tanpa using errcode = '22023'; end if;
  for r in select * from public.penilaian_skor where penilaian_id = p_id and skor in (0, 1) loop
    insert into public.penilaian_tindak_lanjut (penilaian_id, no_indikator, temuan)
    select p_id, r.no, 'Indikator ' || r.no || ' berskor ' || r.skor || coalesce(': ' || nullif(btrim(r.bukti), ''), '')
     where not exists (select 1 from public.penilaian_tindak_lanjut t where t.penilaian_id = p_id and t.no_indikator = r.no);
  end loop;
  update public.penilaian_evaluasi set status = 'Final' where id = p_id;
end $$;

create or replace function public.sahkan_penilaian(p_id uuid, p_catatan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.penilaian_evaluasi%rowtype;
begin
  select * into p from public.penilaian_evaluasi where id = p_id for update;
  if not found or not private.can_view_upt(p.kode_upt) then raise exception 'Penilaian tidak ditemukan.' using errcode = '22023'; end if;
  if (select private.app_role()) is distinct from 'ka_upt' then
    raise exception 'Hanya Ka.UPT yang mengesahkan hasil penilaian.' using errcode = '42501';
  end if;
  if p.status <> 'Final' then raise exception 'Penilaian harus dikunci oleh penilai sebelum disahkan.' using errcode = '22023'; end if;
  update public.penilaian_evaluasi
     set status = 'Disahkan', disahkan_oleh = (select auth.uid()), disahkan_at = now(), catatan_pengesahan = nullif(btrim(coalesce(p_catatan, '')), '')
   where id = p_id;
end $$;

-- Saran skor otomatis dari data aplikasi. Penilai tetap menentukan skor akhir.
create or replace function private.skor_saran(p_ok bigint, p_total bigint)
returns smallint language sql immutable set search_path = '' as $$
  select case when p_total = 0 then null when p_ok = p_total then 2 when p_ok = 0 then 0 else 1 end::smallint
$$;

create or replace function public.saran_penilaian(p_upt text, p_dari date, p_sampai date, p_activity uuid default null, p_latihan boolean default false)
returns jsonb language sql stable set search_path = '' as $$
with s as (
  select ds.*, a.nomor_persetujuan, a.nomor_surat_perintah, a.batas_area, a.titik_komunikasi, a.akses_warga,
         coalesce(l.posisi, 'Dalam UPT') as posisi,
         (ds.status_kesiapan = 'Dapat Dimulai') as jalan,
         (ds.ditutup_at is not null or ds.tanggal_sesi < (now() at time zone 'Asia/Jakarta')::date) as selesai
    from public.daily_sessions ds
    join public.activities a on a.id = ds.activity_id
    left join public.master_locations l on l.id = a.lokasi_id
   where private.norm_upt(a.kode_upt) = private.norm_upt(p_upt)
     and ds.tanggal_sesi between p_dari and p_sampai
     and (p_latihan or not a.latihan)
     and (p_activity is null or a.id = p_activity)
),
f as (
  select s.id,
    case when s.status_kesiapan <> 'Menunggu' then
      btrim(coalesce(s.nomor_persetujuan, '')) <> '' and coalesce((select d.tersedia from public.sesi_dokumen d where d.session_id = s.id and d.kode = 'c'), false) end as i1,
    case when s.status_kesiapan <> 'Menunggu' then
      case when s.posisi = 'Luar UPT' then coalesce((select d.tersedia from public.sesi_dokumen d where d.session_id = s.id and d.kode = 'f'), false)
           else s.jumlah_narapidana > 0 and exists (select 1 from public.session_inmates i where i.session_id = s.id) end end as i2,
    case when s.status_kesiapan <> 'Menunggu' then
      s.dokumen_surat_perintah is not null and btrim(coalesce(s.nomor_surat_perintah, '')) <> '' and cardinality(s.petugas_ids) > 0 end as i3,
    case when s.status_kesiapan <> 'Menunggu' then
      s.dokumen_rencana_pengamanan is not null and btrim(coalesce(s.batas_area, '')) <> '' end as i4,
    case when s.status_kesiapan <> 'Menunggu' then
      s.jalan and not exists (select 1 from public.session_readiness r where r.session_id = s.id and not r.terpenuhi and (r.kode <> 'f' or s.pakai_gelang_monitor)) end as i5,
    case when s.status_kesiapan <> 'Menunggu' then
      btrim(coalesce(s.batas_area, '')) <> '' and btrim(coalesce(s.titik_komunikasi, '')) <> '' and btrim(coalesce(s.akses_warga, '')) <> '' and s.lahan_aktif_ha is not null end as i6,
    case when s.jalan and s.selesai then
      exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 1 and t.jumlah_wb = s.jumlah_narapidana) end as i7,
    case when s.jalan and s.selesai then
      exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 1 and btrim(coalesce(t.isian->>'petugas_p2u', '')) <> '')
      and (not exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 4)
           or exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 4 and btrim(coalesce(t.isian->>'petugas_p2u_terima', '')) <> '')) end as i8,
    case when s.jalan and s.selesai and s.posisi = 'Luar UPT' then
      exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 2) end as i9,
    case when s.jalan and s.selesai then
      exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 3)
      and exists (select 1 from public.field_logs x where x.session_id = s.id and x.jenis_entri = 'Pemeriksaan berkala') end as i10,
    case when s.jalan and s.selesai then
      coalesce((select t1.jumlah_alat = t4.jumlah_alat + coalesce((select sum(p.jumlah_alat) from public.pengembalian_sebagian p where p.session_id = s.id), 0)
                  from public.tahap_pengawalan t1 join public.tahap_pengawalan t4 on t4.session_id = t1.session_id and t4.tahap = 4
                 where t1.session_id = s.id and t1.tahap = 1), false)
      and not exists (select 1 from public.kontrol_alat k where k.session_id = s.id and k.selisih <> 0 and btrim(coalesce(k.tindakan, '')) = '') end as i11,
    case when s.jalan and s.selesai and s.pakai_gelang_monitor then
      coalesce((select r.terpenuhi from public.session_readiness r where r.session_id = s.id and r.kode = 'f'), false)
      and not exists (select 1 from public.gelang_alarm g where g.session_id = s.id and g.status = 'Menunggu') end as i12,
    case when s.jalan and s.selesai and exists (select 1 from public.incidents i where i.session_id = s.id) then
      not exists (select 1 from public.incidents i where i.session_id = s.id and (not i.status_penyelesaian or btrim(coalesce(i.tindakan_awal, '')) = '')) end as i13,
    case when s.jalan and s.selesai then exists (select 1 from public.tahap_pengawalan t where t.session_id = s.id and t.tahap = 4) end as i14,
    case when s.jalan and s.selesai then s.ditutup_at is not null end as i15,
    case when s.jalan and s.selesai then
      exists (select 1 from public.field_logs x where x.session_id = s.id)
      and not exists (select 1 from public.field_logs x where x.session_id = s.id and x.diverifikasi_at is null
                        and x.dikirim_at - x.waktu_kejadian > make_interval(mins => s.batas_keterlambatan_menit)) end as i16,
    case when s.jalan and s.selesai and exists (select 1 from public.field_logs x where x.session_id = s.id and x.susulan) then
      not exists (select 1 from public.field_logs x where x.session_id = s.id and x.susulan and x.diverifikasi_at is null) end as i17,
    case when s.jalan and s.selesai then s.ditutup_at is not null and s.disahkan_at is not null end as i18
  from s
),
fu as (
  select count(*) as tot, count(*) filter (where status in ('Selesai', 'Terverifikasi')) as ok
    from public.follow_ups where session_id in (select id from s)
),
a as (
  select
    count(i1) t1, count(*) filter (where i1) o1, count(i2) t2, count(*) filter (where i2) o2,
    count(i3) t3, count(*) filter (where i3) o3, count(i4) t4, count(*) filter (where i4) o4,
    count(i5) t5, count(*) filter (where i5) o5, count(i6) t6, count(*) filter (where i6) o6,
    count(i7) t7, count(*) filter (where i7) o7, count(i8) t8, count(*) filter (where i8) o8,
    count(i9) t9, count(*) filter (where i9) o9, count(i10) t10, count(*) filter (where i10) o10,
    count(i11) t11, count(*) filter (where i11) o11, count(i12) t12, count(*) filter (where i12) o12,
    count(i13) t13, count(*) filter (where i13) o13, count(i14) t14, count(*) filter (where i14) o14,
    count(i15) t15, count(*) filter (where i15) o15, count(i16) t16, count(*) filter (where i16) o16,
    count(i17) t17, count(*) filter (where i17) o17, count(i18) t18, count(*) filter (where i18) o18,
    (select count(*) from s) as n_sesi
  from f
)
select jsonb_build_object(
  'jumlah_sesi', (select n_sesi from a),
  'indikator', jsonb_build_array(
    jsonb_build_object('no', 1, 'ok', o1, 'total', t1), jsonb_build_object('no', 2, 'ok', o2, 'total', t2),
    jsonb_build_object('no', 3, 'ok', o3, 'total', t3), jsonb_build_object('no', 4, 'ok', o4, 'total', t4),
    jsonb_build_object('no', 5, 'ok', o5, 'total', t5), jsonb_build_object('no', 6, 'ok', o6, 'total', t6),
    jsonb_build_object('no', 7, 'ok', o7, 'total', t7), jsonb_build_object('no', 8, 'ok', o8, 'total', t8),
    jsonb_build_object('no', 9, 'ok', o9, 'total', t9), jsonb_build_object('no', 10, 'ok', o10, 'total', t10),
    jsonb_build_object('no', 11, 'ok', o11, 'total', t11), jsonb_build_object('no', 12, 'ok', o12, 'total', t12),
    jsonb_build_object('no', 13, 'ok', o13, 'total', t13), jsonb_build_object('no', 14, 'ok', o14, 'total', t14),
    jsonb_build_object('no', 15, 'ok', o15, 'total', t15), jsonb_build_object('no', 16, 'ok', o16, 'total', t16),
    jsonb_build_object('no', 17, 'ok', o17, 'total', t17), jsonb_build_object('no', 18, 'ok', o18, 'total', t18),
    jsonb_build_object('no', 19, 'ok', (select ok from fu), 'total', (select tot from fu))
  )
) from a
$$;

-- Mengisi saran skor pada lembar penilaian. Skor penilai yang sudah ada tidak diubah.
create or replace function public.isi_saran_penilaian(p_id uuid, p_terapkan boolean default false)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  p public.penilaian_evaluasi%rowtype; v jsonb; e jsonb; v_ok bigint; v_tot bigint; v_no int; v_saran smallint; v_tb boolean; v_n int := 0;
  v_dasar text;
begin
  select * into p from public.penilaian_evaluasi where id = p_id;
  if not found or not private.can_view_upt(p.kode_upt) then raise exception 'Penilaian tidak ditemukan.' using errcode = '22023'; end if;
  if p.status <> 'Draf' then raise exception 'Penilaian sudah dikunci.' using errcode = '22023'; end if;
  if (select private.app_role()) not in ('administrator', 'operator', 'kepala_pengamanan') then
    raise exception 'Peran Anda tidak dapat mengisi saran penilaian.' using errcode = '42501';
  end if;
  v := public.saran_penilaian(p.kode_upt, p.periode_dari, p.periode_sampai, p.activity_id, p.sertakan_latihan);
  update public.penilaian_evaluasi set jumlah_sesi_diperiksa = coalesce((v->>'jumlah_sesi')::int, 0) where id = p_id and jumlah_sesi_diperiksa = 0;
  for e in select * from jsonb_array_elements(v->'indikator') loop
    v_no := (e->>'no')::int; v_ok := (e->>'ok')::bigint; v_tot := (e->>'total')::bigint;
    v_saran := private.skor_saran(v_ok, v_tot);
    v_tb := v_tot = 0 and v_no in (12, 13, 17, 19);
    v_dasar := case when v_tot = 0 then 'Belum ada data pada periode ini untuk menilai indikator ini.'
                    when v_no = 19 then v_ok || ' dari ' || v_tot || ' tindak lanjut sudah selesai atau terverifikasi.'
                    else v_ok || ' dari ' || v_tot || ' pelaksanaan harian memenuhi ketentuan menurut data aplikasi.' end;
    update public.penilaian_skor
       set saran_skor = v_saran, saran_tb = v_tb, saran_dasar = v_dasar,
           skor = case when p_terapkan and skor is null and not tb then v_saran else skor end,
           tb = case when p_terapkan and skor is null and not tb and v_saran is null and v_tb then true else tb end,
           alasan_tb = case when p_terapkan and skor is null and not tb and v_saran is null and v_tb then 'Tidak ada data yang relevan pada periode yang diperiksa.' else alasan_tb end
     where penilaian_id = p_id and no = v_no;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Hak akses fungsi: hanya pengguna masuk.
revoke all on function public.catat_status_variabel(uuid, integer, text, text, text, text, text) from public, anon;
grant execute on function public.catat_status_variabel(uuid, integer, text, text, text, text, text) to authenticated;
revoke all on function public.verifikasi_entri(uuid, uuid) from public, anon;
grant execute on function public.verifikasi_entri(uuid, uuid) to authenticated;
revoke all on function public.kunci_penilaian(uuid) from public, anon;
grant execute on function public.kunci_penilaian(uuid) to authenticated;
revoke all on function public.sahkan_penilaian(uuid, text) from public, anon;
grant execute on function public.sahkan_penilaian(uuid, text) to authenticated;
revoke all on function public.isi_saran_penilaian(uuid, boolean) from public, anon;
grant execute on function public.isi_saran_penilaian(uuid, boolean) to authenticated;
revoke all on function public.saran_penilaian(text, date, date, uuid, boolean) from public, anon;
grant execute on function public.saran_penilaian(text, date, date, uuid, boolean) to authenticated;
