export function mapDatabaseError(error: any): string {
  const msg = error?.message || '';
  if (
    msg.includes("Could not find the table") || 
    msg.includes("schema cache") || 
    (msg.includes("relation") && msg.includes("does not exist"))
  ) {
    return "Tabel database belum dibuat di Supabase Anda. Silakan buka file 'supabase_schema.sql' di folder proyek, salin seluruh isinya, lalu masuk ke dashboard Supabase proyek 'bzfyakbdihvedyatvzwg' Anda, buka menu 'SQL Editor', tempelkan kode tersebut dan klik 'Run' untuk membuat semua tabel database.";
  }
  return msg || 'Terjadi kesalahan sistem';
}
