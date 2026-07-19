import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ScrollAnimate from '@/components/ScrollAnimate';
import SplashScreen from '@/components/SplashScreen';

export const metadata: Metadata = {
  title: 'Bank Sampah KGS - Poin Sampah Menjadi Berkah',
  description: 'Setor sampah warga, dapatkan poin/saldo, dan beli produk hasil daur ulang berkualitas tinggi yang tersinkronisasi langsung dengan Shopee.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <script dangerouslySetInnerHTML={{
          __html: `
          if (!sessionStorage.getItem('splash_shown')) {
            document.documentElement.classList.add('splash-loading');
          }
        `}} />
        <SplashScreen />
        <ScrollAnimate />
        <div id="layout-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', flex: 1 }}>
          <Navbar />
          <main style={{ flex: 1, paddingBottom: '80px' }}>
            {children}
          </main>
          <footer className="footer">
            <div className="container">
              <div className="footer-grid">
                <div>
                  <h3 className="footer-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Bank Sampah <br />  KGS
                  </h3>
                  <p className="footer-text">
                    Mengubah sampah masyarakat menjadi berkah ekonomi dan menjaga kelestarian lingkungan demi masa depan bumi yang hijau dan lestari.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <span>📍 Jl. Lingkungan Lestari No. 12, Bandung</span>
                  </div>
                </div>

                <div>
                  <h4 className="footer-title">Menu Utama</h4>
                  <ul className="footer-links">
                    <li><a href="/">Beranda</a></li>
                    <li><a href="/cara-menabung">Cara Menabung</a></li>
                    <li><a href="/katalog">Katalog Daur Ulang</a></li>
                    <li><a href="/kontak">Kontak & Lokasi</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="footer-title">Kategori Sampah</h4>
                  <ul className="footer-links" style={{ color: 'var(--muted)' }}>
                    <li>Plastik (Botol, Gelas, Wadah)</li>
                    <li>Kertas & Karton</li>
                    <li>Logam & Alumunium</li>
                    <li>Kaca & Botol Beling</li>
                  </ul>
                </div>

                <div>
                  <h4 className="footer-title">Integrasi Shopee</h4>
                  <p className="footer-text" style={{ fontSize: '0.9rem' }}>
                    Semua produk daur ulang kami juga dapat dibeli di Shopee Mall. Stok selalu sinkron secara real-time!
                  </p>
                  <a
                    href="/admin"
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.85rem', marginTop: '8px' }}
                  >
                    Shopee Settings
                  </a>
                </div>
              </div>

              <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Bank Sampah KGS. Hak Cipta Dilindungi.</p>
                <p>Dibuat dengan kepedulian lingkungan 💚</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
