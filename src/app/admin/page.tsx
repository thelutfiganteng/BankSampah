'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminWaste from '@/components/AdminWaste';
import AdminProducts from '@/components/AdminProducts';
import AdminMeta from '@/components/AdminMeta';

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'waste' | 'products' | 'meta'>('waste');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Authentication & Role verification guard
  useEffect(() => {
    const userStr = localStorage.getItem('banksampah_user');
    if (!userStr) {
      setAuthorized(false);
      router.push('/login?error=Silakan+masuk+sebagai+admin+terlebih+dahulu');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN') {
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
    } catch (e) {
      setAuthorized(false);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (authorized === true) {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'products') {
        setActiveTab('products');
      } else if (tabParam === 'meta') {
        setActiveTab('meta');
      }
    }
  }, [searchParams, authorized]);

  if (authorized === null) {
    return (
      <div className="container text-center" style={{ paddingTop: '100px', minHeight: '60vh' }}>
        <div className="spinner-btn" style={{ borderColor: 'var(--primary)', borderLeftColor: 'transparent', width: '24px', height: '24px' }}></div>
        <p style={{ marginTop: '12px', color: 'var(--muted)' }}>Memverifikasi hak akses administrasi...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="container flex-center" style={{ minHeight: '65vh', paddingTop: '60px' }}>
        <div className="card text-center" style={{ maxWidth: '460px', padding: '40px', margin: '0 auto', border: '1px solid var(--card-border)' }}>
          <span style={{ fontSize: '3.5rem' }}>🚫</span>
          <h2 style={{ color: 'var(--danger)', marginTop: '16px', fontSize: '1.6rem' }}>Akses Ditolak</h2>
          <p style={{ color: 'var(--muted)', margin: '14px 0 24px 0', lineHeight: '1.6', fontSize: '0.95rem' }}>
            Halaman ini hanya dapat diakses oleh Administrator Unit Bank Sampah KGS. Anda saat ini masuk sebagai Nasabah biasa.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/" className="btn btn-secondary">Kembali ke Beranda</Link>
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.removeItem('banksampah_user');
                window.dispatchEvent(new Event('user-login'));
                router.push('/login');
              }}
            >
              Masuk Akun Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container admin-dashboard animate-fade-in" style={{ paddingTop: '30px' }}>
      <div className="dashboard-header">
        <h1>Dashboard Administrasi Internal</h1>
        <p>Kelola nasabah, setoran sampah, stok produk daur ulang, dan integrasi Meta Commerce (Facebook & Instagram Shop).</p>
      </div>

      {/* Tabs Menu */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'waste' ? 'active' : ''}`}
          onClick={() => setActiveTab('waste')}
        >
          ♻️ Sistem Bank Sampah
        </button>
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 Katalog Produk & Varian
        </button>
        <button
          className={`tab-btn ${activeTab === 'meta' ? 'active' : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          📘 Meta Commerce
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="tab-content" style={{ marginTop: '24px' }}>
        {activeTab === 'waste' && <AdminWaste />}
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'meta' && <AdminMeta />}
      </div>

      <style jsx>{`
        .dashboard-header {
          margin-bottom: 24px;
        }
        .dashboard-header h1 {
          font-size: 2.2rem;
          color: var(--foreground);
        }
        .dashboard-header p {
          color: var(--muted);
          margin-top: 4px;
        }

        .alert-success-dashboard {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid var(--success);
          color: #166534;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.95rem;
        }
        .alert-error-dashboard {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          color: #991b1b;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.95rem;
        }

        .tabs-container {
          display: flex;
          border-bottom: 2px solid var(--card-border);
          gap: 8px;
        }
        .tab-btn {
          padding: 12px 24px;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 600;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          color: var(--primary);
        }
        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
      `}</style>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '50px' }}>Loading Dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
