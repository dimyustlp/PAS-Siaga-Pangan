/**
 * Alamat berkas di Supabase Storage wajib berada di folder sesi yang bersangkutan: {session_id}/{nama}.
 * Mencegah pengguna menautkan berkas milik sesi lain atau menyisipkan alamat aneh (../).
 */
export function isSafeStoragePath(path: string, sessionId: string): boolean {
  if (typeof path !== "string" || path.length === 0 || path.length > 300) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  if (!path.startsWith(sessionId + "/")) return false;
  if (path.length === sessionId.length + 1) return false;
  return /^[\w\-./ ()]+$/.test(path);
}
