-- 20. Notifikasi Telegram pola 2 + 1, tampilan berhierarki, tombol tautan, dan akuntabilitas petugas.
--   Wajib 1: tahap 1 selesai (WB keluar melalui P2U).
--   Wajib 2: tahap 4 selesai (WB masuk kembali, rekonsiliasi, penutupan siklus pengawalan).
--   Kondisional: Kode Merah (status naik ke MERAH atau KRITIS), disusul pesan pemulihan saat status turun dari MERAH atau KRITIS.
--   Tahap 2 dan 3 tetap tercatat di database dan ikut dirangkum pada pesan tahap 4, tanpa pesan sendiri.
--   Pesan administratif yang jarang (keputusan kesiapan, pengesahan laporan) dipertahankan dengan tampilan baru.
--   Pesan sesi baru dihentikan (rutin dan tidak mendesak).

-- ============ Kirim: tambah tombol (inline keyboard) ============
drop function if exists private.kirim_telegram(uuid, text, text, text, text);
create or replace function private.kirim_telegram(p_grup uuid, p_nama text, p_chat text, p_teks text, p_jenis text, p_markup jsonb default null)
returns void language plpgsql security definer set search_path = '' as $f$
declare
  v_set public.pengaturan_aplikasi%rowtype;
  v_tok text;
  v_req bigint;
begin
  select * into v_set from public.pengaturan_aplikasi where id;
  select decrypted_secret into v_tok from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  if v_set.telegram_aktif is not true or v_tok is null then
    insert into public.notif_log (grup_id, grup_nama, jenis, pesan, hasil) values (p_grup, p_nama, p_jenis, left(p_teks, 4000), 'Dilewati');
    return;
  end if;
  v_req := net.http_post(
    url := 'https://api.telegram.org/bot' || v_tok || '/sendMessage',
    body := jsonb_build_object('chat_id', p_chat, 'text', left(p_teks, 4000), 'parse_mode', 'HTML', 'disable_web_page_preview', true)
            || case when p_markup is null then '{}'::jsonb else jsonb_build_object('reply_markup', p_markup) end,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000);
  insert into public.notif_log (grup_id, grup_nama, jenis, pesan, request_id, hasil)
  values (p_grup, p_nama, p_jenis, left(p_teks, 4000), v_req, 'Diantrekan');
end
$f$;

drop function if exists private.notif_ke_grup(text, text, text, public.security_status, boolean);
create or replace function private.notif_ke_grup(p_upt text, p_jenis text, p_teks text, p_status public.security_status, p_latihan boolean, p_markup jsonb default null)
returns void language plpgsql security definer set search_path = '' as $f$
declare
  g record;
  v_kw uuid;
  v_pesan text;
begin
  if p_upt is not null then
    select kanwil_id into v_kw from public.master_upt where kode = private.norm_upt(p_upt);
  end if;
  v_pesan := case when p_latihan then '<b>[LATIHAN]</b> ' else '' end || p_teks;
  for g in
    select * from public.grup_telegram t
     where t.aktif
       and (not p_latihan or t.ikut_latihan)
       and (p_status is null or private.status_rank(p_status) >= private.status_rank(t.minimal_status))
       and ((t.tingkat = 'UPT' and p_upt is not null and t.kode_upt = private.norm_upt(p_upt))
         or (t.tingkat = 'Kanwil' and v_kw is not null and t.kanwil_id = v_kw)
         or t.tingkat = 'Direktorat')
  loop
    perform private.kirim_telegram(g.id, g.nama, g.chat_id, v_pesan, p_jenis, p_markup);
  end loop;
end
$f$;

-- ============ Pembantu tampilan ============
create or replace function private.app_url() returns text language sql immutable set search_path = '' as $f$
  select 'https://pas-siaga-pangan.vercel.app'::text
$f$;

create or replace function private.hari_waktu(p timestamptz) returns text language sql stable set search_path = '' as $f$
  select (array['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'])[extract(isodow from p at time zone 'Asia/Jakarta')::int]
    || ', ' || to_char(p at time zone 'Asia/Jakarta', 'DD') || ' '
    || (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(month from p at time zone 'Asia/Jakarta')::int]
    || ' ' || to_char(p at time zone 'Asia/Jakarta', 'YYYY') || ' | ' || to_char(p at time zone 'Asia/Jakarta', 'HH24.MI') || ' WIB'
$f$;

-- Baris pembuka: warna status dan garis pemisah.
create or replace function private.kepala_status(p public.security_status) returns text language sql immutable set search_path = '' as $f$
  select case p::text
    when 'HIJAU' then '🟢 <b>STATUS KONDISI: HIJAU (AMAN)</b>'
    when 'KUNING' then '🟡 <b>STATUS KONDISI: KUNING (WASPADA)</b>'
    when 'MERAH' then '🔴 <b>STATUS KONDISI: MERAH (KODE MERAH)</b>'
    else '🚨🔴 <b>STATUS KONDISI: KRITIS (DARURAT)</b> 🔴🚨' end
  || E'\n━━━━━━━━━━━━━━━━━━'
$f$;

create or replace function private.itm(p_label text, p_isi text) returns text language sql immutable set search_path = '' as $f$
  select case when nullif(btrim(coalesce(p_isi, '')), '') is null then null
              else '<b>' || p_label || ':</b> ' || private.h(left(btrim(p_isi), 600)) end
$f$;

-- Menyusun cabang pohon: semua butir diawali ├, butir terakhir diawali └; butir kosong dilewati.
create or replace function private.pohon(p text[]) returns text language plpgsql immutable set search_path = '' as $f$
declare a text[]; i int; n int; r text := '';
begin
  select coalesce(array_agg(x order by o), '{}') into a from unnest(p) with ordinality as t(x, o) where nullif(btrim(coalesce(x, '')), '') is not null;
  n := coalesce(array_length(a, 1), 0);
  for i in 1..n loop
    r := r || case when i = n then '└ ' else '├ ' end || a[i] || case when i < n then E'\n' else '' end;
  end loop;
  return r;
end
$f$;

create or replace function private.petugas_daftar(p_session uuid, p_awalan text default '│  • ') returns text language sql stable security definer set search_path = '' as $f$
  select string_agg(p_awalan || private.h(p.nama) || coalesce(' (NIP ' || nullif(btrim(p.nip), '') || ')', '') || coalesce(' · ' || nullif(btrim(p.seksi), ''), ''), E'\n' order by p.created_at)
    from public.petugas_sesi p where p.session_id = p_session
$f$;

create or replace function private.jumlah_petugas(p_session uuid) returns int language sql stable security definer set search_path = '' as $f$
  select count(*)::int from public.petugas_sesi where session_id = p_session
$f$;

create or replace function private.url_gps(p_lokasi uuid) returns text language sql stable security definer set search_path = '' as $f$
  select 'https://www.google.com/maps?q=' || l.latitude || ',' || l.longitude from public.master_locations l where l.id = p_lokasi and l.latitude is not null and l.longitude is not null
$f$;

create or replace function private.btn(p_teks text, p_url text) returns jsonb language sql immutable set search_path = '' as $f$
  select jsonb_build_object('text', p_teks, 'url', p_url)
$f$;

-- ============ Wajib 1 dan 2: tahap 1 (keluar) dan tahap 4 (masuk) ============
create or replace function private.notif_tahap()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare
  s record; v jsonb := new.isian; v_teks text; v_wb1 int; v_alat1 int; v_p2u_keluar text; v_sel text[] := '{}';
  v_foto int; v_berkas int; v_n int; v_rasio text; v_st public.security_status; v_gps text; v_url text; v_baris jsonb; v_pet text;
  t2 record; t3 record; v_buka text; v_ringkas text[];
begin
  if new.tahap not in (1, 4) then return new; end if;   -- tahap 2 dan 3: tercatat di database, dirangkum pada pesan tahap 4

  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, a.lokasi_id, u.nama as upt, l.nama as lokasi,
         ds.tanggal_sesi, ds.status_keamanan, ds.jumlah_narapidana as wb, ds.jumlah_alat_kerja as alat, ds.rincian_alat as rincian,
         ds.bimker_penanggung_jawab as bimker, ds.petugas_blok as blok, ds.petugas_p2u as p2u_rencana
    into s
    from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;

  select count(*) filter (where b.jenis = 'foto')::int, count(*) filter (where b.jenis = 'berkas')::int into v_foto, v_berkas
    from public.lampiran_tahap x join private.butir_tahap() b on b.butir = x.butir and b.tahap = x.tahap
   where x.session_id = new.session_id and x.tahap = new.tahap;

  v_n := private.jumlah_petugas(new.session_id);
  v_rasio := case when v_n > 0 and coalesce(new.jumlah_wb, 0) > 0
                  then '1 : ' || replace(trim_scale(round(new.jumlah_wb::numeric / v_n, 2))::text, '.', ',') || ' (' || v_n || ' petugas : ' || new.jumlah_wb || ' WB)' end;
  v_pet := '<b>Petugas Pengawal:</b>' || coalesce(E'\n' || private.petugas_daftar(new.session_id), ' belum ada nama petugas yang dicatat');
  v_gps := private.url_gps(s.lokasi_id);
  v_url := private.app_url() || '/sesi/' || new.session_id;

  select t.jumlah_wb, t.jumlah_alat, t.isian->>'petugas_p2u' into v_wb1, v_alat1, v_p2u_keluar
    from public.tahap_pengawalan t where t.session_id = new.session_id and t.tahap = 1;

  if new.jumlah_wb is distinct from s.wb then
    v_sel := v_sel || ('⚠ Jumlah WB ' || new.jumlah_wb || ' berbeda dari rencana ' || s.wb);
  end if;
  if new.jumlah_alat is distinct from s.alat then
    v_sel := v_sel || ('⚠ Jumlah alat ' || coalesce(new.jumlah_alat::text, '-') || ' berbeda dari rencana ' || s.alat);
  end if;

  if new.tahap = 1 then
    v_st := s.status_keamanan;
    if array_length(v_sel, 1) > 0 and private.status_rank(v_st) < private.status_rank('MERAH') then v_st := 'MERAH'; end if;
    v_teks := private.kepala_status(v_st) || E'\n'
      || '🛡️ <b>LAPORAN PENGELUARAN WB (TAHAP 1/4)</b>' || E'\n'
      || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n\n'
      || '🕒 <b>Waktu dan Lokasi</b>' || E'\n'
      || private.pohon(array[
           private.itm('Waktu Keluar', private.hari_waktu(new.waktu_sistem)),
           private.itm('UPT', coalesce(s.upt, s.kode_upt)),
           private.itm('Kegiatan', s.jenis),
           private.itm('Lokasi Tujuan', s.lokasi)]) || E'\n\n'
      || '👥 <b>Data WB dan Kekuatan Pengamanan</b>' || E'\n'
      || private.pohon(array[
           '<b>Jumlah WB:</b> ' || new.jumlah_wb || ' orang (rencana ' || s.wb || ')',
           private.itm('Rasio Pengawalan', v_rasio),
           v_pet,
           private.itm('Pemeriksa P2U (Keluar)', v->>'petugas_p2u')]) || E'\n\n'
      || '📋 <b>Verifikasi Awal dan Inventaris</b>' || E'\n'
      || private.pohon(array[
           private.itm('Diisi oleh petugas', v->>'petugas'),
           private.itm('Alat Kerja Dibawa', coalesce(new.jumlah_alat::text, '-') || ' (rencana ' || s.alat || ')' || coalesce(' · ' || nullif(s.rincian, ''), '')),
           private.itm('Bimker penanggung jawab (rencana)', s.bimker),
           private.itm('Petugas blok (rencana)', s.blok),
           private.itm('Petugas P2U (rencana)', s.p2u_rencana),
           private.itm('Catatan', v->>'catatan'),
           '<b>Lampiran:</b> ' || v_foto || ' foto, ' || v_berkas || ' berkas']
           || coalesce((select array_agg(x) from unnest(v_sel) x), '{}')) || E'\n'
      || private.hari_waktu(new.waktu_sistem);
    v_baris := jsonb_build_array(
      jsonb_build_array(private.btn('📸 Bukti Foto dan Berita Acara', v_url || '/laporan'), private.btn('📄 Daftar Nama WB', v_url || '/laporan')));
    if v_gps is not null then v_baris := v_baris || jsonb_build_array(jsonb_build_array(private.btn('📍 Cek Titik GPS', v_gps))); end if;
  else
    -- tahap 4: rekonsiliasi dan penutupan siklus pengawalan
    if v_wb1 is not null and new.jumlah_wb is distinct from v_wb1 then
      v_sel := v_sel || ('⚠ WB kembali (' || new.jumlah_wb || ') tidak sama dengan WB keluar (' || v_wb1 || ')');
    end if;
    if v_alat1 is not null and new.jumlah_alat is distinct from v_alat1 then
      v_sel := v_sel || ('⚠ Alat kembali (' || coalesce(new.jumlah_alat::text, '-') || ') tidak sama dengan alat keluar (' || v_alat1 || ')');
    end if;
    if (v->>'penggeledahan')::boolean is not true then
      v_sel := v_sel || '⚠ Penggeledahan belum dilakukan';
    end if;
    v_st := s.status_keamanan;
    if array_length(v_sel, 1) > 0 and private.status_rank(v_st) < private.status_rank('MERAH') then v_st := 'MERAH'; end if;
    select * into t2 from public.tahap_pengawalan x where x.session_id = new.session_id and x.tahap = 2;
    select * into t3 from public.tahap_pengawalan x where x.session_id = new.session_id and x.tahap = 3;
    v_ringkas := array[
      private.itm('Kendaraan', t2.isian->>'kendaraan'),
      private.itm('Tiba di Lokasi', case when t3.waktu_sistem is not null then private.hari_waktu(t3.waktu_sistem) end),
      private.itm('WB di Lokasi', case when t3.jumlah_wb is not null then t3.jumlah_wb || ' orang' end),
      private.itm('Uraian Kegiatan', t3.isian->>'uraian'),
      private.itm('Hasil atau Capaian', t3.isian->>'hasil')];
    v_teks := private.kepala_status(v_st) || E'\n'
      || '🔒 <b>LAPORAN PEMASUKAN WB (TAHAP 4/4, PENUTUPAN)</b>' || E'\n'
      || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n'
      || '🕒 <b>Waktu Selesai:</b> ' || private.hari_waktu(new.waktu_sistem) || E'\n'
      || '📍 ' || private.h(coalesce(s.lokasi, '-')) || ' · ' || private.h(coalesce(s.upt, s.kode_upt)) || E'\n\n'
      || '📊 <b>Rekonsiliasi Keamanan</b>' || E'\n'
      || private.pohon(array[
           '<b>WB (Keluar / Kembali):</b> ' || coalesce(v_wb1::text, '-') || ' / ' || new.jumlah_wb || ' orang (<b>'
             || case when v_wb1 is not null and v_wb1 = new.jumlah_wb then 'KLOP' else 'SELISIH' end || '</b>) · rencana ' || s.wb,
           '<b>Alat Kerja (Keluar / Kembali):</b> ' || coalesce(v_alat1::text, '-') || ' / ' || coalesce(new.jumlah_alat::text, '-') || ' unit (<b>'
             || case when v_alat1 is not null and v_alat1 = new.jumlah_alat then 'UTUH' else 'SELISIH' end || '</b>) · rencana ' || s.alat,
           '<b>Geledah Badan Akhir:</b> ' || case when (v->>'penggeledahan')::boolean then 'sudah dilakukan' else 'BELUM dilakukan' end]) || E'\n\n'
      || '👮 <b>Pertanggungjawaban Petugas</b>' || E'\n'
      || private.pohon(array[
           v_pet,
           private.itm('Diisi oleh petugas', v->>'petugas'),
           private.itm('Pemeriksa P2U (Keluar)', v_p2u_keluar),
           private.itm('Pemeriksa P2U (Masuk)', v->>'petugas_p2u_terima'),
           private.itm('Petugas Blok Penerima', v->>'penerima')]) || E'\n\n'
      || '🌾 <b>Ringkasan Pelaksanaan (Tahap 2 dan 3)</b>' || E'\n'
      || coalesce(nullif(private.pohon(v_ringkas), ''), '└ belum ada catatan tahap 2 dan 3') || E'\n\n'
      || '📎 <b>Lampiran:</b> ' || v_foto || ' foto, ' || v_berkas || ' berkas' || E'\n'
      || coalesce(private.itm('Catatan', v->>'catatan') || E'\n', '')
      || coalesce((select string_agg(x || E'\n', '') from unnest(v_sel) x), '')
      || case when array_length(v_sel, 1) > 0
           then '⚠️ <b>Status Siklus:</b> ada selisih atau kekurangan. Kepala Pengamanan perlu memeriksa sebelum kegiatan ditutup.'
           else '✅ <b>Status Siklus:</b> empat tahap pengawalan selesai dan lengkap. Menunggu pengesahan Ka.UPT dan penutupan oleh Kepala Pengamanan.' end;
    v_baris := jsonb_build_array(
      jsonb_build_array(private.btn('📑 Berita Acara dan Laporan', v_url || '/laporan'), private.btn('📸 Bukti Geledah Akhir', v_url || '/laporan')),
      jsonb_build_array(private.btn('✅ Verifikasi Pimpinan', v_url || '/laporan'), private.btn('🔎 Kronologi Rinci', v_url || '/rinci')));
  end if;

  perform private.notif_ke_grup(s.kode_upt, 'Tahap pengawalan', v_teks, v_st, s.latihan, jsonb_build_object('inline_keyboard', v_baris));
  return new;
exception when others then
  return new;
end
$f$;

-- ============ Kondisional: Kode Merah dan pemulihan ============
create or replace function private.notif_status()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare
  s record; v_log record; v_oleh text; v_naik boolean; v_last record; v_teks text; v_baris jsonb; v_gps text; v_url text; v_posisi text;
begin
  v_naik := private.status_rank(new.ke) > private.status_rank(new.dari);
  if v_naik and private.status_rank(new.ke) < private.status_rank('MERAH') then return new; end if;        -- naik ke KUNING: tidak dikirim
  if not v_naik and private.status_rank(new.dari) < private.status_rank('MERAH') then return new; end if;  -- turun dari KUNING: tidak dikirim

  select a.kode_kegiatan, a.kode_upt, a.latihan, a.lokasi_id, u.nama as upt, l.nama as lokasi, ds.tanggal_sesi, ds.jumlah_narapidana as wb
    into s
    from public.daily_sessions ds
    join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  select l.payload, l.jenis_entri into v_log from public.field_logs l where l.id = new.log_id;
  select full_name into v_oleh from public.profiles where id = new.oleh;
  v_gps := private.url_gps(s.lokasi_id);
  v_url := private.app_url() || '/sesi/' || new.session_id;

  if v_naik then
    select t.tahap, t.jumlah_wb into v_last from public.tahap_pengawalan t where t.session_id = new.session_id order by t.tahap desc limit 1;
    v_posisi := case when v_last.tahap is null then 'Belum ada tahap pengawalan yang selesai'
                     else 'Tahap terakhir selesai: ' || v_last.tahap || '. ' || private.nama_tahap(v_last.tahap::smallint) || ' (WB terhitung ' || v_last.jumlah_wb || ' dari rencana ' || s.wb || ')' end;
    v_teks := case when new.ke::text = 'KRITIS' then '🚨🔴 <b>PERINGATAN DINI: KODE MERAH (KRITIS)</b> 🔴🚨' else '🔴 <b>PERINGATAN DINI: KODE MERAH</b>' end || E'\n'
      || '━━━━━━━━━━━━━━━━━━' || E'\n'
      || '⚠️ <b>INSIDEN LAPANGAN PROGRAM KETAHANAN PANGAN</b>' || E'\n'
      || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n'
      || '🕒 <b>Waktu Kejadian:</b> ' || private.hari_waktu(new.waktu) || E'\n'
      || '📍 <b>Lokasi:</b> ' || private.h(coalesce(s.lokasi, '-')) || ' · ' || private.h(coalesce(s.upt, s.kode_upt)) || E'\n\n'
      || '🔍 <b>Detail Anomali dan Bukti Risiko</b>' || E'\n'
      || private.pohon(array[
           '<b>Perubahan Status:</b> ' || new.dari || ' ke ' || new.ke,
           private.itm('Kategori', v_log.payload->>'kategori'),
           private.itm('Keterangan', left(new.alasan, 400)),
           private.itm('Sumber', new.sumber),
           private.itm('Posisi Kegiatan', v_posisi),
           private.itm('Dilaporkan oleh akun', v_oleh),
           '<b>Petugas Pengawal:</b>' || coalesce(E'\n' || private.petugas_daftar(new.session_id, '   • '), ' belum ada nama petugas yang dicatat')]) || E'\n\n'
      || '🛡️ <b>Tindakan Mitigasi Berjalan</b>' || E'\n'
      || private.pohon(array[
           private.itm('Penanggung jawab tindak lanjut', v_log.payload->>'penanggung_jawab'),
           coalesce(private.itm('Tindakan awal petugas', v_log.payload->>'tindakan_awal'), 'Belum dicatat. Kepala Pengamanan diminta segera memberi arahan.')]);
    v_baris := jsonb_build_array(
      jsonb_build_array(private.btn('🚨 PANTAU LIVE DASHBOARD', v_url), private.btn('📋 Arahan Kepala Pengamanan', private.app_url() || '/keputusan/' || new.session_id)));
    if v_gps is not null then v_baris := v_baris || jsonb_build_array(jsonb_build_array(private.btn('📍 Titik GPS Lokasi', v_gps))); end if;
    perform private.notif_ke_grup(s.kode_upt, 'Kode Merah', v_teks, new.ke, s.latihan, jsonb_build_object('inline_keyboard', v_baris));
  else
    v_teks := private.kepala_status(new.ke) || E'\n'
      || '✅ <b>PEMULIHAN STATUS KEAMANAN</b>' || E'\n'
      || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n'
      || '📍 ' || private.h(coalesce(s.lokasi, '-')) || ' · ' || private.h(coalesce(s.upt, s.kode_upt)) || E'\n\n'
      || private.pohon(array[
           '<b>Perubahan Status:</b> ' || new.dari || ' ke ' || new.ke,
           private.itm('Alasan pemulihan', left(new.alasan, 400)),
           private.itm('Diturunkan oleh', v_oleh),
           private.itm('Waktu', private.hari_waktu(new.waktu))]);
    v_baris := jsonb_build_array(jsonb_build_array(private.btn('📊 Buka Dashboard Sesi', v_url)));
    perform private.notif_ke_grup(s.kode_upt, 'Pemulihan status', v_teks, new.dari, s.latihan, jsonb_build_object('inline_keyboard', v_baris));
  end if;
  return new;
exception when others then
  return new;
end
$f$;

-- Gangguan: tidak lagi mengirim pesan sendiri. Gangguan yang menaikkan status sudah menghasilkan pesan Kode Merah lewat perubahan status.
-- Gangguan tambahan saat status sudah MERAH atau KRITIS (status tidak naik lagi) tetap dikirim agar pimpinan mengetahuinya.
create or replace function private.notif_gangguan()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record; v_teks text; v_gps text; v_url text; v_baris jsonb;
begin
  select a.kode_kegiatan, a.kode_upt, a.latihan, a.lokasi_id, u.nama as upt, l.nama as lokasi, ds.tanggal_sesi, ds.status_keamanan
    into s from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  if private.status_rank(s.status_keamanan) < private.status_rank('MERAH') then return new; end if;
  if exists (select 1 from public.status_history h where h.log_id = new.log_id) then return new; end if;   -- sudah dikabarkan sebagai Kode Merah
  v_gps := private.url_gps(s.lokasi_id);
  v_url := private.app_url() || '/sesi/' || new.session_id;
  v_teks := '🔴 <b>GANGGUAN TAMBAHAN SAAT KODE MERAH</b>' || E'\n━━━━━━━━━━━━━━━━━━' || E'\n'
    || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n'
    || '📍 ' || private.h(coalesce(s.lokasi, '-')) || ' · ' || private.h(coalesce(s.upt, s.kode_upt)) || E'\n\n'
    || private.pohon(array[
         private.itm('Kategori', new.kategori_gangguan),
         private.itm('Tindakan awal', new.tindakan_awal),
         private.itm('Penanggung jawab tindak lanjut', new.penanggung_jawab_tindak_lanjut),
         '<b>Status Keamanan:</b> ' || s.status_keamanan,
         private.itm('Waktu', private.hari_waktu(new.created_at))]);
  v_baris := jsonb_build_array(jsonb_build_array(private.btn('🚨 PANTAU LIVE DASHBOARD', v_url)));
  if v_gps is not null then v_baris := v_baris || jsonb_build_array(jsonb_build_array(private.btn('📍 Titik GPS Lokasi', v_gps))); end if;
  perform private.notif_ke_grup(s.kode_upt, 'Kode Merah', v_teks, s.status_keamanan, s.latihan, jsonb_build_object('inline_keyboard', v_baris));
  return new;
exception when others then
  return new;
end
$f$;

-- Alarm gelang: hanya yang tergolong Kode Merah (keluar zona, perangkat dilepas atau dirusak).
create or replace function private.notif_alarm_gelang()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare v_upt text; v_latihan boolean := false; v_teks text; v_wb text; v_lok uuid; v_gps text; v_url text; v_baris jsonb;
begin
  if new.jenis not in ('Keluar zona', 'Perangkat dilepas atau dirusak') then return new; end if;
  select nama into v_upt from public.master_upt where kode = new.kode_upt;
  if new.session_id is not null then
    select a.latihan, a.lokasi_id into v_latihan, v_lok from public.daily_sessions ds join public.activities a on a.id = ds.activity_id where ds.id = new.session_id;
  end if;
  select i.nama into v_wb from public.master_inmates i where i.id = new.inmate_id;
  v_gps := private.url_gps(v_lok);
  v_url := private.app_url() || coalesce('/sesi/' || new.session_id, '/gelang');
  v_teks := '🚨🔴 <b>PERINGATAN DINI: ALARM GELANG (KODE MERAH)</b> 🔴🚨' || E'\n━━━━━━━━━━━━━━━━━━' || E'\n'
    || private.pohon(array[
         private.itm('Jenis alarm', new.jenis),
         private.itm('Unit gelang', new.unit_nama),
         private.itm('WB pemakai', v_wb),
         private.itm('UPT', coalesce(v_upt, 'UPT belum terpetakan')),
         private.itm('Lokasi alarm', new.lokasi),
         private.itm('Baterai', new.baterai::text),
         private.itm('Waktu', private.hari_waktu(new.waktu))]);
  v_baris := jsonb_build_array(jsonb_build_array(private.btn('🚨 PANTAU LIVE DASHBOARD', v_url)));
  if v_gps is not null then v_baris := v_baris || jsonb_build_array(jsonb_build_array(private.btn('📍 Titik GPS Lokasi', v_gps))); end if;
  perform private.notif_ke_grup(new.kode_upt, 'Alarm gelang', v_teks, 'MERAH'::public.security_status, coalesce(v_latihan, false), jsonb_build_object('inline_keyboard', v_baris));
  return new;
exception when others then
  return new;
end
$f$;

-- ============ Administratif: keputusan kesiapan ============
create or replace function private.notif_keputusan()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record; v_pejabat text; v_url text; v_teks text;
begin
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi,
         ds.status_keamanan, ds.jumlah_narapidana as wb, ds.jumlah_alat_kerja as alat, ds.tanggal_sesi, ds.interval_pemeriksaan as ivl,
         ds.bimker_penanggung_jawab as bimker, ds.petugas_blok as blok, ds.petugas_p2u as p2u
    into s from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  select full_name into v_pejabat from public.profiles where id = new.pejabat_id;
  v_url := private.app_url() || '/sesi/' || new.session_id;
  v_teks := private.kepala_status(coalesce(new.status_baru, s.status_keamanan)) || E'\n'
    || '📌 <b>KEPUTUSAN KEPALA PENGAMANAN: ' || private.h(upper(new.jenis_keputusan::text)) || '</b>' || E'\n'
    || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(s.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n'
    || '🕒 <b>Waktu Keputusan:</b> ' || private.hari_waktu(new.created_at) || E'\n\n'
    || '📅 <b>Rencana Sesi</b>' || E'\n'
    || private.pohon(array[
         private.itm('UPT', coalesce(s.upt, s.kode_upt)),
         private.itm('Kegiatan', s.jenis),
         private.itm('Lokasi', s.lokasi),
         '<b>Rencana:</b> ' || s.wb || ' WB · ' || s.alat || ' alat kerja · pemeriksaan tiap ' || s.ivl || ' menit',
         private.itm('Bimker penanggung jawab', s.bimker),
         private.itm('Petugas blok', s.blok),
         private.itm('Petugas P2U', s.p2u)]) || E'\n\n'
    || '👮 <b>Pertanggungjawaban</b>' || E'\n'
    || private.pohon(array[
         private.itm('Diputuskan oleh', v_pejabat),
         private.itm('Catatan keputusan', new.catatan_keputusan),
         '<b>Petugas Pengawal:</b>' || coalesce(E'\n' || private.petugas_daftar(new.session_id, '   • '), ' belum ada nama petugas yang dicatat')]);
  perform private.notif_ke_grup(s.kode_upt, 'Keputusan', v_teks, s.status_keamanan, s.latihan,
    jsonb_build_object('inline_keyboard', jsonb_build_array(jsonb_build_array(private.btn('📊 Buka Sesi', v_url), private.btn('📋 Halaman Keputusan', private.app_url() || '/keputusan/' || new.session_id)))));
  return new;
exception when others then return new;
end
$f$;

-- ============ Administratif: pengesahan laporan ============
create or replace function private.notif_pengesahan()
returns trigger language plpgsql security definer set search_path = '' as $f$
declare s record; t record; v_ring text[] := '{}'; v_oleh text; v_url text;
begin
  if old.disahkan_at is not null or new.disahkan_at is null then return new; end if;
  select a.kode_kegiatan, a.jenis_kegiatan::text as jenis, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi
    into s from public.activities a left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id where a.id = new.activity_id;
  select full_name into v_oleh from public.profiles where id = new.disahkan_oleh;
  v_url := private.app_url() || '/sesi/' || new.id;
  for t in select * from public.tahap_pengawalan x where x.session_id = new.id order by x.tahap loop
    v_ring := v_ring || (
      '<b>' || t.tahap || '. ' || private.nama_tahap(t.tahap::smallint) || ':</b> ' || private.hari_waktu(t.waktu_sistem)
      || ' · ' || t.jumlah_wb || ' WB' || coalesce(' · ' || t.jumlah_alat || ' alat', '')
      || coalesce(' · petugas ' || private.h(t.isian->>'petugas'), '')
      || case t.tahap when 1 then coalesce(' · P2U keluar ' || nullif(btrim(private.h(t.isian->>'petugas_p2u')), ''), '')
                      when 4 then coalesce(' · P2U masuk ' || nullif(btrim(private.h(t.isian->>'petugas_p2u_terima')), ''), '') || coalesce(' · blok ' || nullif(btrim(private.h(t.isian->>'penerima')), ''), '')
                      else '' end);
  end loop;
  perform private.notif_ke_grup(s.kode_upt, 'Pengesahan laporan',
    private.kepala_status(new.status_keamanan) || E'\n'
    || '📑 <b>LAPORAN KEGIATAN DISAHKAN</b>' || E'\n'
    || '<code>ID Siklus: ' || private.h(s.kode_kegiatan) || ' · Sesi ' || to_char(new.tanggal_sesi, 'DD/MM/YYYY') || '</code>' || E'\n'
    || '🕒 <b>Waktu Pengesahan:</b> ' || private.hari_waktu(new.disahkan_at) || E'\n'
    || '📍 ' || private.h(coalesce(s.lokasi, '-')) || ' · ' || private.h(coalesce(s.upt, s.kode_upt)) || E'\n\n'
    || '📊 <b>Ringkasan Pelaksanaan</b>' || E'\n'
    || coalesce(nullif(private.pohon(v_ring), ''), '└ tidak ada tahap tercatat') || E'\n\n'
    || '👮 <b>Pertanggungjawaban</b>' || E'\n'
    || private.pohon(array[
         '<b>Rencana:</b> ' || new.jumlah_narapidana || ' WB · ' || new.jumlah_alat_kerja || ' alat',
         private.itm('Disahkan oleh (Ka.UPT)', v_oleh),
         private.itm('Catatan pengesahan', new.catatan_pengesahan),
         '<b>Petugas Pengawal:</b>' || coalesce(E'\n' || private.petugas_daftar(new.id, '   • '), ' belum ada nama petugas yang dicatat')]),
    new.status_keamanan, s.latihan,
    jsonb_build_object('inline_keyboard', jsonb_build_array(jsonb_build_array(private.btn('📑 Unduh Laporan Resmi (PDF)', v_url || '/laporan'), private.btn('🔎 Kronologi Rinci', v_url || '/rinci')))));
  return new;
exception when others then
  return new;
end
$f$;

-- Sesi baru: tidak lagi dikirim ke Telegram (pesan rutin).
drop trigger if exists daily_sessions_notif_baru on public.daily_sessions;
