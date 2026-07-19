import Link from 'next/link';
import { queryOne, queryAll } from '@/lib/db';
import EcoGame from '@/components/EcoGame';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export const revalidate = 0; // Disable cache so statistics update live

export default async function Home() {
  let totalWeight = '1,284.5';
  let totalMembers = 142;
  let totalPoints = '2,568,000';
  let products: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      // 1. Fetch live metrics from Supabase
      const { data: weightData } = await supabase
        .from('waste_deposits')
        .select('weight');
      const sumWeight = weightData?.reduce((acc, curr) => acc + (curr.weight || 0), 0) || 0;
      if (sumWeight > 0) totalWeight = sumWeight.toFixed(1);

      const { count: memberCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });
      if (memberCount !== null && memberCount > 0) totalMembers = memberCount;

      const { data: pointsData } = await supabase
        .from('waste_deposits')
        .select('points');
      const sumPoints = pointsData?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
      if (sumPoints > 0) totalPoints = new Intl.NumberFormat('id-ID').format(sumPoints);

      // 2. Fetch featured products
      const { data: dbProducts } = await supabase
        .from('products')
        .select('*')
        .limit(3);
      products = dbProducts || [];
    } catch (e) {
      console.error('Failed to load stats from Supabase, falling back to SQLite', e);
    }
  } else {
    // 1. Fetch live metrics from local SQLite
    const totalWeightRow = queryOne('SELECT SUM(weight) as total FROM waste_deposits');
    totalWeight = totalWeightRow?.total ? totalWeightRow.total.toFixed(1) : '1,284.5'; // fallback if 0

    const totalMembersRow = queryOne('SELECT COUNT(*) as total FROM members');
    totalMembers = totalMembersRow?.total || 142; // fallback if 0

    const totalPointsRow = queryOne('SELECT SUM(points) as total FROM waste_deposits');
    totalPoints = totalPointsRow?.total
      ? new Intl.NumberFormat('id-ID').format(totalPointsRow.total)
      : '2,568,000'; // fallback if 0

    // 2. Fetch featured products
    products = queryAll('SELECT * FROM products LIMIT 3');
  }

  return (
    <div className="home-container">
      {/* 1. Hero Section */}
      <section className="hero">
        <div className="container hero-content animate-fade-in-up">
          <div className="hero-text-block">
            <span className="hero-tag">🌱 Inisiatif Hijau & Mandiri</span>
            <h1>Poin Sampah Menjadi Berkah Ekonomi</h1>
            <p>
              Selamat datang di <strong>Bank Sampah KGS</strong>. Kami membantu warga mengelola sampah
              rumah tangga secara bijak, mengonversinya menjadi saldo tabungan digital, dan mendaur
              ulang sampah plastik/organik menjadi produk bernilai tinggi.
            </p>
            <div className="hero-actions">
              <Link href="/katalog" className="btn btn-primary btn-lg">
                🛍️ Belanja Daur Ulang
              </Link>
              <Link href="/cara-menabung" className="btn btn-secondary btn-lg">
                📖 Cara Menabung Sampah
              </Link>
            </div>
          </div>
          <div className="hero-illustration">
            <div className="circle-bg">
              <div className="leaf-decor">♻️</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stats Dashboard (Impact Counter) */}
      <section className="stats-section">
        <div className="container">
          <h2 className="section-title text-center">Dampak Lingkungan & Sosial Kami</h2>
          <p className="section-desc text-center">
            Setiap kilogram sampah yang Anda setorkan berkontribusi langsung pada pengurangan limbah di TPA.
          </p>

          <div className="stats-grid grid-cols-3">
            <div className="stat-card">
              <div className="stat-icon">⚖️</div>
              <div className="stat-number">{totalWeight} kg</div>
              <div className="stat-label">Total Sampah Terkumpul</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-number">{totalMembers} Warga</div>
              <div className="stat-label">Nasabah Terdaftar</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🪙</div>
              <div className="stat-number">Rp {totalPoints}</div>
              <div className="stat-label">Total Nilai Poin Disalurkan</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Guide Preview */}
      <section className="how-it-works">
        <div className="container">
          <div className="grid-cols-2 align-center">
            <div className="guide-graphic">
              <div className="step-badge-flow">
                <div className="badge-step">1</div>
                <div className="badge-line"></div>
                <div className="badge-step">2</div>
                <div className="badge-line"></div>
                <div className="badge-step">3</div>
              </div>
              <div className="step-labels-flow">
                <div><strong>Pilah Sampah</strong><br /><small>Pisahkan plastik, kertas, logam di rumah</small></div>
                <div><strong>Setor & Timbang</strong><br /><small>Bawa ke unit terdekat untuk ditimbang</small></div>
                <div><strong>Dapatkan Saldo</strong><br /><small>Poin dicatat langsung ke saldo warga</small></div>
              </div>
            </div>

            <div className="guide-text">
              <h2>Mulai Menabung Sampah Hanya dengan 3 Langkah Mudah</h2>
              <p>
                Kami menerima berbagai kategori sampah anorganik bersih. Saldo yang terkumpul
                dapat ditarik tunai atau digunakan untuk berbelanja produk kerajinan daur ulang
                upcycle kami.
              </p>
              <Link href="/cara-menabung" className="btn btn-outline" style={{ marginTop: '16px' }}>
                Pelajari Selengkapnya →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3.5. KGS Craft Profile Sections */}
      <section className="kgs-craft-profile-section" style={{ backgroundColor: 'var(--muted-bg)', padding: '60px 0', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
        <div className="container">
          <div className="header-block text-center" style={{ marginBottom: '40px' }}>
            <span className="hero-tag" style={{ background: 'rgba(21, 128, 61, 0.1)', color: 'var(--primary)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>Profil KGS Craft</span>
            <h2 style={{ fontSize: '2.2rem', marginTop: '10px' }}>Menginspirasi Melalui Karya Kreatif Daur Ulang</h2>
            <p style={{ color: 'var(--muted)', maxWidth: '600px', margin: '8px auto 0 auto' }}>
              Mengenal lebih dekat perjalanan, cita-cita, dan kegiatan produktif dari komunitas KGS Craft.
            </p>
          </div>

          <div className="split-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            {/* Tentang KGS Craft */}
            <div className="card profile-info-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', boxShadow: 'var(--shadow)' }}>
              <div className="profile-card-icon" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🌟</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>TENTANG KGS CRAFT</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: '1.6', flex: 1 }}>
                <strong>KGS Craft</strong> KGS CRAFT adalah komunitas pemberdayaan ibu-ibu yang berawal dari kelompok tani pada tahun 2015. Bertransformasi menjadi bank sampah independen, komunitas ini kini mengelolah sampah menjadi produk kerajinan unik dan bernilai jual tinggi melalui kreativitas para anggotanya, sembari berkontribusi pada pelestarian lingkungan. KGS CRAFT juga aktif hingga saat ini mengikuti berbagai pameran hingga perlombaan.
              </p>
            </div>

            {/* Sejarah KGS Craft */}
            <div className="card profile-info-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', boxShadow: 'var(--shadow)' }}>
              <div className="profile-card-icon" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📜</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>SEJARAH KGS CRAFT</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: '1.6', flex: 1 }}>
                KGS CRAFT mengawali perjalanannya pada tahun 2015 sebagai sebuah kelompok tani yang berfokus pada penjualan produk tanaman. Setahun kemudian, pada tahun 2016, muncul inisiatif dari Ibu Welis untuk membentuk bank sampah di tingkat kelurahan. Seiring berjalannya waktu, muncul gagasan inovatif untuk menaikkan nilai manfaat dari gerakan tersebut dengan mengolah sampah menjadi produk kerajinan kreatif. Langkah ini akhirnya mendapat dukungan penuh dari pihak kelurahan serta PT Pusri, yang turut memfasilitasi berbagai pelatihan keterampilan bagi para ibu-ibu hingga ke luar kota.
              </p>
            </div>

            {/* Kegiatan KGS Craft */}
            <div className="card profile-info-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', boxShadow: 'var(--shadow)' }}>
              <div className="profile-card-icon" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎨</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>KEGIATAN KGS CRAFT</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: '1.6', flex: 1 }}>
                Kegiatan rutin kami meliputi penerimaan & penimbangan sampah terpilah warga setiap minggunya, workshop pelatihan pembuatan kerajinan daur ulang bagi warga & pemuda setempat, produksi produk dari sampah dan dijadikan kreatif dan inovatif, serta pemasaran produk daur ulang berkualitas secara offline dan online guna menyalurkan berkah tabungan ekonomi bagi warga penabung aktif.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Game Spell Section */}
      <section className="interactive-game-section" style={{ padding: '20px 0' }}>
        <div className="container">
          <EcoGame />
        </div>
      </section>

      {/* 4. Featured Products (Direct E-Commerce) */}
      <section className="featured-products">
        <div className="container">
          <div className="flex-between" style={{ marginBottom: '32px' }}>
            <div>
              <h2>Produk Daur Ulang Pilihan</h2>
              <p style={{ color: 'var(--muted)', marginTop: '4px' }}>Dukung sirkular ekonomi dengan membeli hasil kerajinan warga.</p>
            </div>
            <Link href="/katalog" className="btn btn-secondary">
              Lihat Semua Produk ↗
            </Link>
          </div>

          <div className="products-grid grid-cols-3">
            {products.map((prod) => (
              <div className="product-card" key={prod.id}>
                <div
                  className="product-img-placeholder"
                  style={{ backgroundImage: `url(${prod.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'})` }}
                >
                  <span className="category-badge">{prod.category}</span>
                </div>
                <div className="product-card-body">
                  <h3>{prod.name}</h3>
                  <p className="prod-desc">{prod.description}</p>
                  <div className="prod-footer flex-between">
                    <span className="prod-price">Rp {new Intl.NumberFormat('id-ID').format(prod.price)}</span>
                    <span className="prod-stock">Stok: {prod.stock}</span>
                  </div>
                  {prod.shopee_item_id && (
                    <div className="shopee-sync-badge">
                      🟧 Tersinkron ke Shopee
                    </div>
                  )}
                  <Link href="/katalog" className="btn btn-primary btn-block" style={{ marginTop: '14px', width: '100%' }}>
                    Lihat Pilihan & Beli
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
