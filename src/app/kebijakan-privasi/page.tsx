'use client';

import Link from 'next/link';

export default function KebijakanPrivasi() {
  return (
    <div className="container page-wrapper animate-fade-in" style={{ paddingTop: '40px', maxWidth: '800px' }}>
      <div className="page-header" style={{ marginBottom: '30px', borderBottom: '1px solid var(--card-border)', paddingBottom: '20px' }}>
        <span style={{ color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
          Dokumen Legal
        </span>
        <h1 style={{ fontSize: '2.5rem', marginTop: '10px', marginBottom: '8px', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>
          Kebijakan Privasi KGS Craft
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Terakhir diperbarui: 20 Juli 2026</p>
      </div>

      <div className="policy-content" style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--foreground)', lineHeight: '1.7' }}>
        <section className="card" style={{ padding: '28px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '1rem', margin: 0 }}>
            Selamat datang di <strong>KGS Craft</strong> (selanjutnya disebut "Kami" atau "Website KGS"). Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi yang Anda bagikan selama menggunakan layanan kami, baik melalui penimbangan sampah lokal di Unit Bank Sampah KGS maupun transaksi e-commerce daur ulang yang terintegrasi dengan Meta Commerce (Facebook & Instagram Shop).
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            1. Informasi Yang Kami Kumpulkan
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '10px' }}>
            Kami mengumpulkan beberapa jenis informasi untuk kebutuhan penyediaan layanan operasional penimbangan dan penjualan produk:
          </p>
          <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Data Profil Nasabah / Pembeli:</strong> Nama lengkap, alamat email aktif, nomor telepon (WhatsApp), dan alamat fisik pengiriman untuk keperluan pengantaran barang atau verifikasi penimbangan sampah.</li>
            <li><strong>Data Saldo & Transaksi:</strong> Catatan berat setoran sampah, poin/saldo tabungan sampah yang diperoleh, riwayat penukaran barang daur ulang, serta metode checkout transaksi.</li>
            <li><strong>Data Integrasi Pihak Ketiga:</strong> ID unik dari integrasi Meta Commerce untuk menyinkronkan data pemesanan, ketersediaan stok, dan status pesanan.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            2. Penggunaan Informasi Anda
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '10px' }}>
            Informasi yang dikumpulkan digunakan semata-mata untuk tujuan operasional dan pengembangan layanan:
          </p>
          <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Memproses dan memverifikasi setoran estimasi sampah warga secara akurat di lokasi unit.</li>
            <li>Mengelola saldo tabungan digital warga dan memproses klaim penukaran kerajinan.</li>
            <li>Memproses pemesanan barang daur ulang upcycle secara online dan melakukan sinkronisasi stok real-time ke saluran pemasaran eksternal (Meta Commerce - Facebook Shop & Instagram Shopping).</li>
            <li>Mempermudah koordinasi penjemputan sampah atau pengantaran paket pesanan via WhatsApp.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            3. Perlindungan & Keamanan Data
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang ketat untuk mencegah akses yang tidak sah, pengungkapan, perubahan, atau penghancuran data pribadi Anda. Data Anda disimpan secara terenkripsi dalam infrastruktur database awan kami (Supabase Cloud) yang dikonfigurasi dengan kebijakan keamanan Row Level Security (RLS) berstandar tinggi.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            4. Berbagi Informasi dengan Pihak Ketiga
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Kami tidak akan pernah menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak lain. Kami hanya membagikan informasi terbatas dengan platform partner terintegrasi (seperti Meta Graph API) untuk keperluan sinkronisasi stok inventaris produk dan pembaharuan status pengiriman pesanan secara otomatis demi kelancaran proses transaksi belanja Anda.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            5. Hak-Hak Anda
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Sebagai pemilik data yang sah, Anda memiliki hak penuh untuk mengakses informasi profil Anda di halaman "Profil Saya", memperbarui alamat rumah Anda, melihat laporan saldo penimbangan sampah, atau mengajukan penghapusan akun Anda secara permanen dari database kami dengan menghubungi kami melalui saluran admin yang tersedia.
          </p>
        </section>

        <section className="card" style={{ padding: '28px', backgroundColor: 'var(--muted-bg)', border: '1px dashed var(--card-border)', borderRadius: '16px', marginTop: '10px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)' }}>Hubungi Admin KGS Craft</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
            Jika Anda memiliki pertanyaan, saran, atau keluhan terkait dengan kebijakan privasi ini atau pengelolaan data pribadi Anda, Anda dapat menghubungi kami secara langsung melalui:
          </p>
          <div style={{ marginTop: '14px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>📍 <strong>Alamat Kantor:</strong> Jln . Sersan Zaini, RT. 27 No. 2819 Kelurahan 2 ilir, Kota Palembang</span>
            <span>📞 <strong>WhatsApp Admin:</strong> +62 823-2201-3726</span>
          </div>
          <div style={{ marginTop: '18px' }}>
            <Link href="/" className="btn btn-primary btn-sm">
              Kembali ke Beranda
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
