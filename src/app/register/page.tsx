'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });
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
    const { name, email, phone, address, password } = formData;
    if (!name || !email || !phone || !password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name,
          email,
          phone,
          address,
          password
        })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Automatically log user in
        localStorage.setItem('banksampah_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('user-login'));
        
        setTimeout(() => {
          setSuccess(false);
          router.push('/');
        }, 1200);
      } else {
        setError(data.error || 'Terjadi kesalahan saat pendaftaran.');
        setLoading(false);
      }
    } catch (e) {
      setError('Terjadi kesalahan jaringan.');
      setLoading(false);
    }
  };

  return (
    <div className="container auth-page animate-fade-in flex-center" style={{ minHeight: '80vh', paddingTop: '40px' }}>
      <div className="card auth-card">
        <div className="text-center" style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '2.5rem' }}>🌱</span>
          <h1 style={{ fontSize: '1.8rem', marginTop: '10px' }}>Daftar Nasabah Baru</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Gabung bersama kami, setor sampah warga, dan tukarkan dengan tabungan saldo digital.
          </p>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Contoh: Budi Santoso"
              required 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading || success}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Email</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="nama@email.com"
              required 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading || success}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Telepon (WhatsApp)</label>
            <input 
              type="tel" 
              className="form-control" 
              placeholder="Contoh: 081234567890"
              required 
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading || success}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Rumah (Opsional)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="RT/RW, Komplek, Kelurahan, Kecamatan"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading || success}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password Akun</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Minimal 6 karakter"
              required 
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={loading || success}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading || success}>
            {loading ? (
              <>
                <span className="spinner-btn"></span>
                Mendaftarkan...
              </>
            ) : success ? (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <svg className="checkmark-svg" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Pendaftaran Sukses!
              </span>
            ) : (
              'Daftar Akun'
            )}
          </button>
        </form>

        <div className="auth-footer text-center" style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          Sudah punya akun? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Masuk Di Sini</Link>
        </div>
      </div>

      <style jsx>{`
        .auth-card {
          width: 100%;
          max-width: 450px;
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
