export function mapDatabaseError(error: any): string {
  const msg = error?.message || '';
  
  if (msg.includes("status") && msg.includes("waste_deposits")) {
    return "Upgrade Database Diperlukan: Kolom 'status' belum ditambahkan ke tabel 'waste_deposits' di database Supabase Anda. Silakan masuk ke dashboard Supabase proyek 'bzfyakbdihvedyatvzwg' Anda, buka menu 'SQL Editor', jalankan query berikut:\n\nALTER TABLE waste_deposits ADD COLUMN status TEXT DEFAULT 'APPROVED';";
  }
  
  if (
    msg.includes("Could not find the table") || 
    (msg.includes("relation") && msg.includes("does not exist"))
  ) {
    return "Tabel database belum dibuat di Supabase Anda. Silakan buka file 'supabase_schema.sql' di folder proyek, salin seluruh isinya, lalu masuk ke dashboard Supabase proyek 'bzfyakbdihvedyatvzwg' Anda, buka menu 'SQL Editor', tempelkan kode tersebut dan klik 'Run' untuk membuat semua tabel database.";
  }
  
  if (msg.includes("schema cache")) {
    return "Struktur database berubah. Silakan buka dashboard Supabase Anda, lalu reload schema cache pada pengaturan database API untuk memperbarui cache skema.";
  }
  
  return msg || 'Terjadi kesalahan sistem';
}
