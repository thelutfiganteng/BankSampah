'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sync scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update user profile session and cart count
  useEffect(() => {
    const checkUser = () => {
      try {
        const stored = localStorage.getItem('banksampah_user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        setCurrentUser(null);
      }
    };

    const updateCartCount = () => {
      try {
        const cartData = localStorage.getItem('banksampah_cart');
        if (cartData) {
          const cart = JSON.parse(cartData);
          const total = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        console.error('Error reading cart count', e);
      }
    };

    checkUser();
    updateCartCount();

    // Listen for custom login/logout/cart events
    window.addEventListener('user-login', checkUser);
    window.addEventListener('cart-updated', updateCartCount);
    window.addEventListener('storage', () => {
      checkUser();
      updateCartCount();
    });

    return () => {
      window.removeEventListener('user-login', checkUser);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('banksampah_user');
    setCurrentUser(null);
    setMobileMenuOpen(false);
    // Notify all components of auth change
    window.dispatchEvent(new Event('user-login'));
    router.push('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <Link href="/" className="logo" onClick={() => setMobileMenuOpen(false)}>
          <span></span> Bank Sampah <span>KGS</span>
        </Link>

        {/* Mobile menu toggle */}
        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          ☰
        </button>

        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <li>
            <Link
              href="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Beranda
            </Link>
          </li>
          <li>
            <Link
              href="/cara-menabung"
              className={`nav-link ${isActive('/cara-menabung') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Cara Menabung
            </Link>
          </li>
          <li>
            <Link
              href="/jual-sampah"
              className={`nav-link ${isActive('/jual-sampah') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Jual Sampah
            </Link>
          </li>
          <li>
            <Link
              href="/katalog"
              className={`nav-link ${isActive('/katalog') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Katalog Daur Ulang
            </Link>
          </li>
          <li>
            <Link
              href="/kontak"
              className={`nav-link ${isActive('/kontak') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Kontak & Lokasi
            </Link>
          </li>

          {/* Conditional Admin Link */}
          {currentUser && (
            <li>
              <Link
                href="/profil"
                className={`nav-link ${isActive('/profil') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profil Saya
              </Link>
            </li>
          )}

          {currentUser && currentUser.role === 'ADMIN' && (
            <li>
              <Link
                href="/admin"
                className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard Admin
              </Link>
            </li>
          )}

          {cartCount > 0 && (
            <li className="cart-badge-container">
              <Link href="/profil?tab=cart" className="cart-nav-link" onClick={() => setMobileMenuOpen(false)}>
                🛒 <span className="cart-count-pill">{cartCount}</span>
              </Link>
            </li>
          )}

          {/* Auth State Conditional Rendering */}
          {currentUser ? (
            <li className="user-profile-menu">
              <Link href="/profil" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setMobileMenuOpen(false)}>
                <span className="user-info-text" style={{ cursor: 'pointer' }}>
                  👤 {currentUser.name} ({currentUser.role === 'ADMIN' ? 'Admin' : `Rp ${new Intl.NumberFormat('id-ID').format(currentUser.balance || 0)}`})
                </span>
              </Link>
              <button onClick={handleLogout} className="btn btn-outline btn-sm logout-btn">
                Keluar
              </button>
            </li>
          ) : (
            <li>
              <Link href="/login" className="nav-btn-login" onClick={() => setMobileMenuOpen(false)}>
                Masuk / Daftar
              </Link>
            </li>
          )}
        </ul>
      </div>

      <style jsx>{`
        .mobile-toggle-btn {
          display: none;
          background: none;
          border: none;
          font-size: 1.8rem;
          cursor: pointer;
          color: var(--foreground);
        }
        .cart-nav-link {
          display: flex;
          align-items: center;
          background: var(--muted-bg);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.95rem;
          color: var(--foreground);
        }
        .cart-count-pill {
          background-color: var(--primary);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 6px;
        }

        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .user-info-text {
          background-color: rgba(21, 128, 61, 0.08);
          color: var(--primary);
          padding: 6px 14px;
          border-radius: 20px;
          white-space: nowrap;
          border: 1px solid rgba(21, 128, 61, 0.1);
        }
        .logout-btn {
          padding: 6px 12px !important;
          font-size: 0.82rem !important;
          border-radius: 20px !important;
        }
        .nav-btn-login {
          display: inline-flex;
          align-items: center;
          padding: 8px 18px;
          border-radius: 20px;
          background-color: var(--primary);
          color: white !important;
          font-weight: 700;
          font-size: 0.9rem;
          transition: transform 200ms ease;
          box-shadow: 0 4px 6px -1px rgba(21, 128, 61, 0.2);
        }
        .nav-btn-login:hover {
          transform: scale(1.05);
        }

        @media (max-width: 1200px) {
          :global(.navbar-container) {
            flex-wrap: wrap;
          }
          .mobile-toggle-btn {
            display: block;
          }
          .nav-links {
            display: none;
            width: 100%;
            flex-direction: column;
            gap: 16px;
            margin-top: 16px;
            padding: 16px 0;
            border-top: 1px solid var(--card-border);
          }
          .nav-links.mobile-open {
            display: flex;
          }
          .cart-badge-container {
            align-self: flex-start;
          }
          .user-profile-menu {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            width: 100%;
          }
          .user-info-text {
            width: 100%;
          }
        }
      `}</style>
    </nav>
  );
}
