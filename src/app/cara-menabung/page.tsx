export default function CaraMenabung() {
  const rates = [
    { type: 'Plastik', rate: 'Rp 2.000 / kg', description: 'Botol plastik bersih, gelas plastik, wadah plastik, kantong tebal.' },
    { type: 'Kertas', rate: 'Rp 1.500 / kg', description: 'Koran, kardus bekas, buku, kertas HVS (tidak basah).' },
    { type: 'Logam', rate: 'Rp 5.000 / kg', description: 'Kaleng alumunium, besi tua, kuningan, tembaga.' },
    { type: 'Kaca', rate: 'Rp 1.000 / kg', description: 'Botol kaca utuh, toples beling (tidak pecah berantakan).' },
    { type: 'Organik', rate: 'Rp 500 / kg', description: 'Sisa sayuran, kulit buah, daun kering (untuk kompos).' },
  ];

  return (
    <div className="container guide-page animate-fade-in">
      <div className="header-block text-center">
        <span className="subtitle">Edukasi Lingkungan</span>
        <h1>Panduan Menabung Sampah</h1>
        <p>Jadikan sampah rumah tangga Anda tabungan digital bernilai ekonomi dengan mengikuti langkah berikut.</p>
      </div>

      {/* Steps Section */}
      <section className="steps-section">
        <h2>4 Langkah Mudah Menabung</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>Pilah di Rumah</h3>
            <p>Pisahkan sampah anorganik (plastik, kertas, logam, kaca) dan sampah organik. Pastikan sampah dalam keadaan kering dan bersih dari sisa makanan.</p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <h3>Bawa ke Bank Sampah</h3>
            <p>Kunjungi lokasi Bank Sampah KGS terdekat selama jam operasional. Bawa kartu anggota nasabah Anda (atau daftar baru dengan nomor handphone).</p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <h3>Timbang & Catat</h3>
            <p>Petugas kami akan memilah kembali, menimbang sampah Anda berdasarkan kategorinya, dan menghitung poin/saldo yang didapatkan.</p>
          </div>

          <div className="step-card">
            <div className="step-number">04</div>
            <h3>Cairkan atau Belanja</h3>
            <p>Saldo poin yang terkumpul akan langsung masuk ke rekening nasabah. Saldo bisa ditarik tunai atau dibelanjakan langsung untuk produk daur ulang.</p>
          </div>
        </div>
      </section>

      {/* Pricing / Rates Section */}
      <section className="rates-section">
        <h2>Daftar Harga & Nilai Konversi Sampah</h2>
        <p className="rates-sub">Harga dapat berubah sewaktu-waktu sesuai harga pasar bahan baku daur ulang industri.</p>
        
        <div className="table-responsive" style={{ marginTop: '24px' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Kategori Sampah</th>
                <th style={{ width: '25%' }}>Nilai Poin (per kg)</th>
                <th>Syarat & Kondisi</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.type}</strong></td>
                  <td><span className="price-tag">{r.rate}</span></td>
                  <td style={{ color: 'var(--muted)' }}>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Banner */}
      <section className="faq-banner">
        <h3>Kenapa harus dalam keadaan bersih dan kering?</h3>
        <p>
          Sampah yang kotor atau basah dapat menimbulkan bakteri, jamur, bau tidak sedap, serta merusak kualitas 
          bahan baku industri daur ulang. Dengan membersihkan sampah sebelum menyetor, Anda turut menjaga kesehatan 
          petugas kami dan meningkatkan nilai jual bahan baku daur ulang!
        </p>
      </section>


    </div>
  );
}
