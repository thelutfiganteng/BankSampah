'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const userStr = localStorage.getItem('banksampah_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'ADMIN') {
          router.replace('/admin');
        } else {
          router.replace('/');
        }
      } catch (e) {}
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        localStorage.setItem('banksampah_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('user-login'));
        
        setTimeout(() => {
          setSuccess(false);
          if (data.user.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }, 1000);
      } else {
        setError(data.error || 'Email atau password salah');
        setLoading(false);
      }
    } catch (e) {
      setError('Terjadi kesalahan jaringan.');
      setLoading(false);
    }
  };

  return (
    <div className="container auth-page animate-fade-in flex-center" style={{ minHeight: '70vh', paddingTop: '40px' }}>
      <div className="card auth-card">
        <div className="text-center" style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '2.5rem' }}>🌱</span>
          <h1 style={{ fontSize: '1.8rem', marginTop: '10px' }}>Masuk Akun</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Masuk untuk menyetor sampah, cek saldo, dan menukar poin daur ulang.
          </p>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Alamat Email</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="nama@email.com"
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || success}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading || success}>
            {loading ? (
              <>
                <span className="spinner-btn"></span>
                Memverifikasi...
              </>
            ) : success ? (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <svg className="checkmark-svg" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Masuk Berhasil!
              </span>
            ) : (
              'Masuk Akun'
            )}
          </button>
        </form>

        <div className="auth-footer text-center" style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          Belum punya akun? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>Daftar Sekarang</Link>
        </div>

        <div className="card demo-creds-card" style={{ marginTop: '24px', backgroundColor: 'var(--muted-bg)', border: '1px dashed var(--card-border)' }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--primary)' }}>🔑 Akun Demo Pengujian:</h4>
          <ul style={{ fontSize: '0.8rem', paddingLeft: '16px', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li><strong>Admin</strong>: <code>admin@banksampaheco.org</code> / password: <code>admin123</code></li>
            <li><strong>Nasabah (Budi)</strong>: <code>budi@gmail.com</code> / password: <code>budi123</code></li>
            <li><strong>Nasabah (Siti)</strong>: <code>siti@gmail.com</code> / password: <code>siti123</code></li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .auth-card {
          width: 100%;
          max-width: 420px;
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 30px;
          box-shadow: var(--shadow-lg);
        }
        .error-banner {
          background-color: rgba(239, 68, 68, 0.08);
          border: 1px solid var(--danger);
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.88rem;
        }
      `}</style>
    </div>
  );
}
