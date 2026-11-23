// Kode Google Apps Script "gerbang Drive" PAS-SIAGA Pangan. Ditampilkan di menu Google Drive (Administrator)
// dengan kunci yang sudah terisi, lalu ditempel ke script.google.com dan di-deploy sebagai aplikasi web.

export const VERSI_APPS_SCRIPT = "1.0";

export function kodeAppsScript(kunci: string): string {
  return `/**
 * PAS-SIAGA Pangan — Gerbang Google Drive (versi ${VERSI_APPS_SCRIPT})
 * Menyimpan foto dan berkas tahap pengawalan ke Google Drive, mencatat setiap unggahan
 * di Google Sheet "Rekap Unggahan PAS-SIAGA Pangan" (bisa diunduh sebagai Excel),
 * dan melayani pembacaan berkas untuk laporan PDF. Semua permintaan wajib membawa tiket
 * yang ditandatangani database PAS-SIAGA Pangan; tanpa tiket sah, permintaan ditolak.
 */
const KUNCI = '${kunci}';
const NAMA_FOLDER_INDUK = 'PAS-SIAGA Pangan - Lampiran Kegiatan';
const NAMA_SHEET = 'Rekap Unggahan PAS-SIAGA Pangan';
const BATAS_BYTE = 40 * 1024 * 1024;

function siapkan() {
  const f = folderInduk_();
  const s = sheet_();
  Logger.log('Folder: ' + f.getUrl());
  Logger.log('Rekap : ' + s.getParent().getUrl());
}

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    if (!p.tiket) return json_({ ok: true, layanan: 'PAS-SIAGA Pangan', versi: '${VERSI_APPS_SCRIPT}' });
    const t = periksa_(p.tiket, p.sig);
    if (t.aksi !== 'ambil') throw new Error('Aksi tidak dikenal.');
    const berkas = DriveApp.getFileById(t.id);
    const bytes = berkas.getBlob().getBytes();
    const mulai = Math.max(0, Number(p.mulai || 0));
    const panjang = Math.min(Number(p.panjang || bytes.length), 4 * 1024 * 1024);
    return json_({ ok: true, mime: berkas.getMimeType(), total: bytes.length, data: Utilities.base64Encode(bytes.slice(mulai, mulai + panjang)) });
  } catch (err) {
    return json_({ ok: false, galat: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const m = JSON.parse(e.postData.contents);
    const t = periksa_(m.tiket, m.sig);
    if (t.aksi !== 'unggah') throw new Error('Aksi tidak dikenal.');
    const bytes = Utilities.base64Decode(m.data);
    if (bytes.length > BATAS_BYTE || bytes.length > Number(t.sz) + 1024) throw new Error('Ukuran berkas tidak sesuai tiket.');
    const waktu = new Date();
    const stempel = Utilities.formatDate(waktu, 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
    const nama = stempel + '_' + t.b + '_' + t.nm;
    const folder = folderTujuan_(t);
    const berkas = folder.createFile(Utilities.newBlob(bytes, t.mime, nama));
    berkas.setDescription('PAS-SIAGA Pangan | ' + t.kode + ' | Tahap ' + t.t + ' ' + t.tn + ' | ' + t.bj + ' | ' + t.un + ' | ' + Utilities.formatDate(waktu, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss') + ' WIB');
    catat_(t, berkas, waktu, bytes.length);
    const bukti = hmac_(m.sig + '|' + berkas.getId() + '|' + bytes.length);
    return json_({ ok: true, id: berkas.getId(), url: berkas.getUrl(), ukuran: bytes.length, waktu: waktu.toISOString(), bukti: bukti });
  } catch (err) {
    return json_({ ok: false, galat: String(err && err.message ? err.message : err) });
  }
}

function periksa_(tiket, sig) {
  if (!tiket || !sig || hmac_(tiket) !== sig) throw new Error('Tiket tidak sah.');
  const t = JSON.parse(Utilities.newBlob(Utilities.base64Decode(tiket)).getDataAsString('UTF-8'));
  if (t.exp && Number(t.exp) < Date.now() / 1000) throw new Error('Tiket kedaluwarsa. Ulangi dari aplikasi.');
  return t;
}

function hmac_(teks) {
  const b = Utilities.computeHmacSha256Signature(teks, KUNCI, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function folderInduk_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_INDUK');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(NAMA_FOLDER_INDUK);
  props.setProperty('FOLDER_INDUK', f.getId());
  return f;
}

function anak_(induk, nama) {
  const it = induk.getFoldersByName(nama);
  return it.hasNext() ? it.next() : induk.createFolder(nama);
}

function bersih_(s) {
  return String(s || '-').replace(/[\\\\/:*?"<>|]+/g, ' ').trim().slice(0, 120) || '-';
}

function folderTujuan_(t) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    const kw = anak_(folderInduk_(), bersih_(t.kw));
    const upt = anak_(kw, bersih_(t.upt));
    const sesi = anak_(upt, bersih_(t.tgl + ' ' + t.kode));
    return anak_(sesi, 'Tahap ' + t.t + ' - ' + bersih_(t.tn));
  } finally {
    kunci.releaseLock();
  }
}

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_REKAP');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!ss) {
    ss = SpreadsheetApp.create(NAMA_SHEET);
    DriveApp.getFileById(ss.getId()).moveTo(folderInduk_());
    props.setProperty('SHEET_REKAP', ss.getId());
    const sh = ss.getSheets()[0];
    sh.setName('Unggahan');
    sh.appendRow(['Waktu sistem (WIB)', 'Kanwil', 'UPT', 'Kode kegiatan', 'Tanggal sesi', 'Tahap', 'Jenis lampiran', 'Foto/Berkas', 'Nama berkas', 'Ukuran (KB)', 'Diunggah oleh', 'Tautan Drive', 'ID berkas', 'ID sesi']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#13254d').setFontColor('#ffffff');
  }
  return ss.getSheetByName('Unggahan') || ss.getSheets()[0];
}

function catat_(t, berkas, waktu, ukuran) {
  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    sheet_().appendRow([
      Utilities.formatDate(waktu, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'), t.kw, t.upt, t.kode, t.tgl,
      t.t + '. ' + t.tn, t.bj, t.j === 'foto' ? 'Foto' : 'Berkas', berkas.getName(), Math.round(ukuran / 1024),
      t.un, berkas.getUrl(), berkas.getId(), t.s
    ]);
  } finally {
    kunci.releaseLock();
  }
}
`;
}
