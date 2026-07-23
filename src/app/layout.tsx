import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ScrollAnimate from '@/components/ScrollAnimate';
import SplashScreen from '@/components/SplashScreen';

export const metadata: Metadata = {
  title: 'Bank Sampah KGS - Poin Sampah Menjadi Berkah',
  description: 'Setor sampah warga, dapatkan poin/saldo, dan beli produk hasil daur ulang berkualitas tinggi yang tersinkronisasi langsung dengan Facebook Shop dan Instagram Shopping.',
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
                  <h4 className="footer-title">Integrasi Marketplace</h4>
                  <p className="footer-text" style={{ fontSize: '0.9rem' }}>
                    Produk daur ulang kami tersinkronisasi ke Facebook Shop dan Instagram Shopping secara real-time!
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <a
                      href="/admin?tab=meta"
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      📘 Meta Commerce Console
                    </a>
                  </div>
                </div>
              </div>

              <div className="footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <p>&copy; {new Date().getFullYear()} Bank Sampah KGS. Hak Cipta Dilindungi.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <a href="/kebijakan-privasi" style={{ color: 'var(--muted)', fontSize: '0.85rem', textDecoration: 'none' }}>Kebijakan Privasi</a>
                </div>
                <p>Dibuat dengan kepedulian lingkungan 💚</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
