-- 19. Notifikasi Telegram lengkap (nama petugas asli, P2U, semua isian) dan pemisahan peran pengesahan.
-- Catatan: token bot tetap di Vault; berkas ini tidak menyentuh token.

-- ============ Pembantu pesan ============
create or replace function private.daftar_petugas(p_session uuid)
returns text language sql stable security definer set search_path = '' as $f$
  select coalesce(string_agg(
           private.h(p.nama) || coalesce(' (NIP ' || nullif(btrim(p.nip), '') || ')', '') || coalesce(', ' || nullif(btrim(p.seksi), ''), ''),
           '; ' order by p.created_at), 'belum ada nama petugas yang dicatat')
    from public.petugas_sesi p where p.session_id = p_session
$f$;

create or replace function private.baris(p_label text, p_isi text)
returns text language sql immutable set search_path = '' as $f$
  select case when nullif(btrim(coalesce(p_isi, '')), '') is null then '' else p_label || ': ' || private.h(left(btrim(p_isi), 600)) || E'\n' end
$f$;

-- ============ Notifikasi tahap pengawalan (menggantikan pesan singkat lama) ============
create or replace function private.notif_tahap()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare
  s record; v jsonb := new.isian; v_lamp text; v_teks text; v_wb1 int; v_sel text := ''; v_rinci text := '';
begin
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi,
         ds.tanggal_sesi, ds.status_keamanan, ds.jumlah_narapidana as wb, ds.jumlah_alat_kerja as alat, ds.interval_pemeriksaan as ivl,
         ds.bimker_penanggung_jawab as bimker, ds.petugas_blok as blok, ds.petugas_p2u as p2u_rencana
    into s
    from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;

  select string_agg(b.judul || ' (' || x.n || ' berkas)', '; ' order by b.butir) into v_lamp
    from (select butir, count(*) as n from public.lampiran_tahap where session_id = new.session_id and tahap = new.tahap group by butir) x
    join private.butir_tahap() b on b.butir = x.butir and b.tahap = new.tahap;

  if new.jumlah_wb is distinct from s.wb then
    v_sel := v_sel || '⚠ Jumlah WB ' || new.jumlah_wb || ' berbeda dari rencana ' || s.wb || E'\n';
  end if;
  if new.tahap in (1, 4) and new.jumlah_alat is distinct from s.alat then
    v_sel := v_sel || '⚠ Jumlah alat ' || coalesce(new.jumlah_alat::text, '-') || ' berbeda dari rencana ' || s.alat || E'\n';
  end if;

  if new.tahap = 1 then
    v_rinci := private.baris('Petugas P2U yang mengeluarkan', v->>'petugas_p2u')
            || 'WB keluar: ' || new.jumlah_wb || ' orang (rencana ' || s.wb || E')\n'
            || 'Alat kerja dibawa: ' || coalesce(new.jumlah_alat::text, '-') || ' (rencana ' || s.alat || E')\n'
            || private.baris('Bimker penanggung jawab (rencana)', s.bimker)
            || private.baris('Petugas blok (rencana)', s.blok)
            || private.baris('Petugas P2U (rencana)', s.p2u_rencana);
  elsif new.tahap = 2 then
    v_rinci := 'WB dalam pengawalan: ' || new.jumlah_wb || ' orang (rencana ' || s.wb || E')\n'
            || private.baris('Kendaraan / nomor polisi', v->>'kendaraan');
  elsif new.tahap = 3 then
    v_rinci := 'WB di lokasi: ' || new.jumlah_wb || ' orang (rencana ' || s.wb || E')\n'
            || private.baris('Uraian kegiatan', v->>'uraian')
            || private.baris('Hasil atau capaian', v->>'hasil');
  else
    select t.jumlah_wb into v_wb1 from public.tahap_pengawalan t where t.session_id = new.session_id and t.tahap = 1;
    v_rinci := 'WB kembali: ' || new.jumlah_wb || ' orang (keluar ' || coalesce(v_wb1::text, '-') || ', rencana ' || s.wb || E')\n'
            || 'Alat kerja kembali: ' || coalesce(new.jumlah_alat::text, '-') || ' (rencana ' || s.alat || E')\n'
            || 'Penggeledahan: ' || case when (v->>'penggeledahan')::boolean then 'sudah dilakukan' else 'BELUM dilakukan' end || E'\n'
            || private.baris('Petugas P2U yang menerima', v->>'petugas_p2u_terima')
            || private.baris('Petugas blok yang menerima', v->>'penerima');
    if v_wb1 is not null and new.jumlah_wb is distinct from v_wb1 then
      v_sel := v_sel || '⚠ WB kembali (' || new.jumlah_wb || ') tidak sama dengan WB keluar (' || v_wb1 || E')\n';
    end if;
    if (v->>'penggeledahan')::boolean is not true then
      v_sel := v_sel || E'⚠ Penggeledahan belum dilakukan\n';
    end if;
  end if;

  v_teks := '<b>Tahap ' || new.tahap || '/4 selesai: ' || private.nama_tahap(new.tahap) || '</b>' || E'\n'
    || private.h(s.kode_kegiatan) || ' · ' || private.h(s.jenis) || E'\n'
    || private.h(coalesce(s.upt, s.kode_upt)) || ' · ' || private.h(coalesce(s.lokasi, '-')) || E'\n'
    || 'Sesi tanggal ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || ' · pemeriksaan tiap ' || s.ivl || E' menit\n'
    || E'\n'
    || 'Pengawal bertugas: ' || private.daftar_petugas(new.session_id) || E'\n'
    || private.baris('Diisi oleh petugas', v->>'petugas')
    || v_rinci
    || private.baris('Catatan', v->>'catatan')
    || coalesce('Lampiran: ' || v_lamp || E'\n', '')
    || v_sel
    || 'Status keamanan: ' || s.status_keamanan || E'\n'
    || private.waktu_wib(new.waktu_sistem);
  perform private.notif_ke_grup(s.kode_upt, 'Tahap pengawalan', v_teks, s.status_keamanan, s.latihan);
  return new;
exception when others then
  return new;
end
$f$;

drop trigger if exists tahap_pengawalan_notif on public.tahap_pengawalan;
create trigger tahap_pengawalan_notif after insert on public.tahap_pengawalan
  for each row execute function private.notif_tahap();

-- ============ selesaikan_tahap: nama P2U wajib, pesan Telegram pindah ke pemicu ============
create or replace function public.selesaikan_tahap(p_session uuid, p_tahap integer, p_isian jsonb)
returns uuid language plpgsql security definer set search_path = '' as $f$
declare
  v_id uuid; v_uid uuid := (select auth.uid()); v_wb int; v_alat int; v_geledah boolean; b record;
  v_kurang text[] := '{}'; v_isian jsonb := coalesce(p_isian, '{}'::jsonb);
begin
  if not private.pengawal_can_log(p_session) then
    raise exception 'Ditolak: sesi belum diizinkan mulai, sudah ditutup, atau Anda bukan pengawal sesi ini.' using errcode = '42501';
  end if;
  if p_tahap not between 1 and 4 then raise exception 'Tahap tidak dikenal.' using errcode = '22023'; end if;
  if exists (select 1 from public.tahap_pengawalan t where t.session_id = p_session and t.tahap = p_tahap) then
    raise exception 'Tahap ini sudah diselesaikan.' using errcode = '22023';
  end if;
  if p_tahap > 1 and not exists (select 1 from public.tahap_pengawalan t where t.session_id = p_session and t.tahap = p_tahap - 1) then
    raise exception 'Selesaikan tahap sebelumnya lebih dulu.' using errcode = '22023';
  end if;
  for b in select * from private.butir_tahap() x where x.tahap = p_tahap and x.wajib loop
    if not exists (select 1 from public.lampiran_tahap l where l.session_id = p_session and l.tahap = p_tahap and l.butir = b.butir) then
      v_kurang := v_kurang || b.judul;
    end if;
  end loop;
  if cardinality(v_kurang) > 0 then
    raise exception 'Lampiran wajib belum diunggah: %.', array_to_string(v_kurang, '; ') using errcode = '22023';
  end if;

  if btrim(coalesce(v_isian->>'petugas', '')) = '' then
    raise exception 'Pilih petugas yang mengisi tahap ini.' using errcode = '22023';
  end if;
  if coalesce(v_isian->>'jumlah_wb', '') !~ '^\d{1,6}$' then raise exception 'Jumlah WB wajib diisi angka.' using errcode = '22023'; end if;
  v_wb := (v_isian->>'jumlah_wb')::int;
  if p_tahap in (1, 4) then
    if coalesce(v_isian->>'jumlah_alat', '') !~ '^\d{1,6}$' then raise exception 'Jumlah alat kerja wajib diisi angka.' using errcode = '22023'; end if;
    v_alat := (v_isian->>'jumlah_alat')::int;
  end if;
  if p_tahap = 1 and btrim(coalesce(v_isian->>'petugas_p2u', '')) = '' then
    raise exception 'Nama petugas P2U yang mengeluarkan WB wajib diisi.' using errcode = '22023';
  end if;
  if p_tahap = 3 and btrim(coalesce(v_isian->>'uraian', '')) = '' then
    raise exception 'Uraian kegiatan pangan wajib diisi.' using errcode = '22023';
  end if;
  if p_tahap = 4 then
    if jsonb_typeof(v_isian->'penggeledahan') is distinct from 'boolean' then
      raise exception 'Isi apakah penggeledahan sudah dilakukan.' using errcode = '22023';
    end if;
    v_geledah := (v_isian->>'penggeledahan')::boolean;
    if btrim(coalesce(v_isian->>'petugas_p2u_terima', '')) = '' then
      raise exception 'Nama petugas P2U yang menerima WB kembali wajib diisi.' using errcode = '22023';
    end if;
    if btrim(coalesce(v_isian->>'penerima', '')) = '' then
      raise exception 'Nama petugas blok yang menerima WB wajib diisi.' using errcode = '22023';
    end if;
  end if;

  insert into public.tahap_pengawalan (session_id, tahap, jumlah_wb, jumlah_alat, isian, pengawal_id)
  values (p_session, p_tahap, v_wb, v_alat, v_isian, v_uid) returning id into v_id;

  if p_tahap = 1 then
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'Serah terima di blok', jsonb_build_object('tahap', 'keluar', 'jumlah_wbp', v_wb, 'jumlah_alat', v_alat)),
      (gen_random_uuid(), p_session, v_uid, now(), 'P2U keluar atau masuk', jsonb_build_object('arah', 'keluar', 'jumlah', v_wb, 'catatan', nullif(btrim(coalesce(v_isian->>'catatan', '')), '')));
  elsif p_tahap = 2 then
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'Pindah area atau ganti pengawal',
       jsonb_build_object('jumlah_wbp', v_wb, 'area_baru', 'Perjalanan menuju lokasi kegiatan',
                          'catatan', nullif(btrim(concat_ws(' · ', v_isian->>'kendaraan', v_isian->>'catatan')), '')));
  elsif p_tahap = 3 then
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'Tiba di lokasi', jsonb_build_object('jumlah_wbp', v_wb, 'catatan', left(btrim(v_isian->>'uraian'), 500)));
  else
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'P2U keluar atau masuk', jsonb_build_object('arah', 'masuk', 'jumlah', v_wb)),
      (gen_random_uuid(), p_session, v_uid, now() + interval '1 second', 'Serah terima di blok',
       jsonb_build_object('tahap', 'kembali', 'jumlah_wbp', v_wb, 'jumlah_alat', v_alat, 'penggeledahan', v_geledah));
  end if;
  return v_id;
end $f$;

-- ============ Pengesahan: hanya Ka.UPT; pesan Telegram lengkap lewat pemicu ============
create or replace function public.sahkan_laporan(p_session uuid, p_catatan text)
returns void language plpgsql security definer set search_path = '' as $f$
declare v_role public.user_role := (select private.app_role());
begin
  if v_role <> 'ka_upt' or not private.can_view_session(p_session) then
    raise exception 'Hanya Ka.UPT dari UPT ini yang dapat mengesahkan laporan.' using errcode = '42501';
  end if;
  if (select count(*) from public.tahap_pengawalan t where t.session_id = p_session) < 4 then
    raise exception 'Keempat tahap pengawalan belum lengkap.' using errcode = '22023';
  end if;
  if exists (select 1 from public.daily_sessions where id = p_session and disahkan_at is not null) then
    raise exception 'Laporan sudah disahkan.' using errcode = '22023';
  end if;
  update public.daily_sessions set disahkan_oleh = (select auth.uid()), disahkan_at = now(),
         catatan_pengesahan = nullif(btrim(coalesce(p_catatan, '')), '') where id = p_session;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Laporan kegiatan disahkan',
          jsonb_build_object('session_id', p_session));
end $f$;

create or replace function private.notif_pengesahan()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record; t record; v_rinci text := ''; v_oleh text;
begin
  if old.disahkan_at is not null or new.disahkan_at is null then return new; end if;
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi
    into s from public.activities a left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id where a.id = new.activity_id;
  select full_name into v_oleh from public.profiles where id = new.disahkan_oleh;
  for t in select * from public.tahap_pengawalan x where x.session_id = new.id order by x.tahap loop
    v_rinci := v_rinci || t.tahap || '. ' || private.nama_tahap(t.tahap::smallint) || ' · ' || private.waktu_wib(t.waktu_sistem)
      || ' · ' || t.jumlah_wb || ' WB' || coalesce(' · ' || t.jumlah_alat || ' alat', '')
      || coalesce(' · petugas ' || private.h(t.isian->>'petugas'), '')
      || case t.tahap when 1 then coalesce(' · P2U mengeluarkan ' || private.h(t.isian->>'petugas_p2u'), '')
                      when 4 then coalesce(' · P2U menerima ' || private.h(t.isian->>'petugas_p2u_terima'), '') || coalesce(' · blok menerima ' || private.h(t.isian->>'penerima'), '')
                      else '' end
      || E'\n';
  end loop;
  perform private.notif_ke_grup(s.kode_upt, 'Pengesahan laporan',
    '<b>Laporan kegiatan disahkan</b>' || E'\n'
    || private.h(s.kode_kegiatan) || ' · ' || private.h(s.jenis) || E'\n'
    || private.h(coalesce(s.upt, s.kode_upt)) || ' · ' || private.h(coalesce(s.lokasi, '-')) || E'\n'
    || 'Sesi tanggal ' || to_char(new.tanggal_sesi, 'DD/MM/YYYY') || ' · ' || new.jumlah_narapidana || ' WB · ' || new.jumlah_alat_kerja || E' alat\n'
    || 'Pengawal bertugas: ' || private.daftar_petugas(new.id) || E'\n\n'
    || v_rinci || E'\n'
    || 'Disahkan oleh: ' || private.h(coalesce(v_oleh, '-')) || ' (Ka.UPT)' || E'\n'
    || private.baris('Catatan pengesahan', new.catatan_pengesahan)
    || 'Status keamanan: ' || new.status_keamanan || E'\n'
    || private.waktu_wib(new.disahkan_at),
    new.status_keamanan, s.latihan);
  return new;
exception when others then
  return new;
end
$f$;

drop trigger if exists daily_sessions_notif_pengesahan on public.daily_sessions;
create trigger daily_sessions_notif_pengesahan after update of disahkan_at on public.daily_sessions
  for each row execute function private.notif_pengesahan();

-- ============ Sesi baru disiapkan Operator ============
create or replace function private.notif_sesi_baru()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record; v_oleh text;
begin
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi,
         a.tanggal_mulai, a.rencana_berakhir, a.luas_lahan_ha, a.nomor_surat_perintah, a.nomor_persetujuan
    into s from public.activities a left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id where a.id = new.activity_id;
  if not found then return new; end if;
  select full_name into v_oleh from public.profiles where id = new.created_by;
  perform private.notif_ke_grup(s.kode_upt, 'Sesi baru',
    '<b>Sesi pengawalan baru disiapkan</b>' || E'\n'
    || private.h(s.kode_kegiatan) || ' · ' || private.h(s.jenis) || E'\n'
    || private.h(coalesce(s.upt, s.kode_upt)) || ' · ' || private.h(coalesce(s.lokasi, '-')) || E'\n'
    || 'Periode kegiatan ' || to_char(s.tanggal_mulai, 'DD/MM/YYYY') || coalesce(' s.d. ' || to_char(s.rencana_berakhir, 'DD/MM/YYYY'), '')
    || coalesce(' · ' || s.luas_lahan_ha || ' ha', '') || E'\n'
    || private.baris('Nomor surat perintah', s.nomor_surat_perintah)
    || private.baris('Nomor persetujuan', s.nomor_persetujuan)
    || E'\n'
    || 'Sesi tanggal ' || to_char(new.tanggal_sesi, 'DD/MM/YYYY') || ' · pemeriksaan tiap ' || new.interval_pemeriksaan || E' menit\n'
    || 'Rencana ' || new.jumlah_narapidana || ' WB · ' || new.jumlah_alat_kerja || E' alat kerja\n'
    || private.baris('Rincian alat', new.rincian_alat)
    || private.baris('Bimker penanggung jawab', new.bimker_penanggung_jawab)
    || private.baris('Petugas blok', new.petugas_blok)
    || private.baris('Petugas P2U', new.petugas_p2u)
    || 'Gelang monitor: ' || case when new.pakai_gelang_monitor then 'dipakai' else 'tidak dipakai' end || E'\n'
    || 'Pengawal ditugaskan: ' || coalesce(array_length(new.petugas_ids, 1), 0) || E' akun (nama petugas dicatat saat bertugas)\n'
    || 'Disiapkan oleh Operator: ' || private.h(coalesce(v_oleh, '-')) || E'\n'
    || private.waktu_wib(new.created_at),
    'HIJAU'::public.security_status, s.latihan);
  return new;
exception when others then
  return new;
end
$f$;

drop trigger if exists daily_sessions_notif_baru on public.daily_sessions;
create trigger daily_sessions_notif_baru after insert on public.daily_sessions
  for each row execute function private.notif_sesi_baru();

-- ============ Keputusan Kepala Pengamanan: lebih lengkap ============
create or replace function private.notif_keputusan()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record; v_pejabat text;
begin
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi,
         ds.status_keamanan, ds.jumlah_narapidana as wb, ds.jumlah_alat_kerja as alat, ds.tanggal_sesi, ds.interval_pemeriksaan as ivl,
         ds.bimker_penanggung_jawab as bimker, ds.petugas_blok as blok, ds.petugas_p2u as p2u
    into s from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  select full_name into v_pejabat from public.profiles where id = new.pejabat_id;
  perform private.notif_ke_grup(s.kode_upt, 'Keputusan',
    '<b>Keputusan: ' || private.h(new.jenis_keputusan::text) || '</b>' || E'\n'
    || private.h(s.kode_kegiatan) || ' · ' || private.h(s.jenis) || E'\n'
    || private.h(coalesce(s.upt, s.kode_upt)) || ' · ' || private.h(coalesce(s.lokasi, '-')) || E'\n'
    || 'Sesi tanggal ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || ' · rencana ' || s.wb || ' WB · ' || s.alat || ' alat · pemeriksaan tiap ' || s.ivl || E' menit\n'
    || private.baris('Bimker penanggung jawab', s.bimker)
    || private.baris('Petugas blok', s.blok)
    || private.baris('Petugas P2U', s.p2u)
    || 'Pengawal bertugas: ' || private.daftar_petugas(new.session_id) || E'\n'
    || 'Status keamanan: ' || coalesce(new.status_baru::text, s.status_keamanan::text) || E'\n'
    || private.baris('Catatan keputusan', new.catatan_keputusan)
    || 'Diputuskan oleh Kepala Pengamanan: ' || private.h(coalesce(v_pejabat, '-')) || E'\n'
    || private.waktu_wib(new.created_at),
    s.status_keamanan, s.latihan);
  return new;
exception when others then return new;
end $f$;

-- ============ Gangguan: lengkap ============
create or replace function private.notif_gangguan()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record;
begin
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi, ds.tanggal_sesi, ds.status_keamanan
    into s from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  perform private.notif_ke_grup(s.kode_upt, 'Gangguan',
    '<b>Gangguan baru: ' || private.h(new.kategori_gangguan) || '</b>' || E'\n'
    || private.h(s.kode_kegiatan) || ' · ' || private.h(s.jenis) || E'\n'
    || private.h(coalesce(s.upt, s.kode_upt)) || ' · ' || private.h(coalesce(s.lokasi, '-')) || E'\n'
    || 'Sesi tanggal ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || E'\n'
    || 'Pengawal bertugas: ' || private.daftar_petugas(new.session_id) || E'\n'
    || private.baris('Tindakan awal', new.tindakan_awal)
    || private.baris('Penanggung jawab tindak lanjut', new.penanggung_jawab_tindak_lanjut)
    || 'Status keamanan: ' || s.status_keamanan || E'\n'
    || private.waktu_wib(new.created_at),
    'KUNING'::public.security_status, s.latihan);
  return new;
exception when others then
  return new;
end
$f$;
