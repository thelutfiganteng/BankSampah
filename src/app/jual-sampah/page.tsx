'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Deposit {
  id: number;
  waste_type: string;
  weight: number;
  points: number;
  deposit_date: string;
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface User {
  id: number;
  name: string;
  role: string;
  balance: number;
}

const POINT_RATES: Record<string, number> = {
  'Plastik': 2000,
  'Kertas': 1500,
  'Logam': 5000,
  'Kaca': 1000,
  'Organik': 500,
};

export default function JualSampah() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form states
  const [wasteType, setWasteType] = useState('Plastik');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI feedback states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // History states
  const [history, setHistory] = useState<Deposit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    try {
      const stored = localStorage.getItem('banksampah_user');
      if (stored) {
        const user = JSON.parse(stored) as User;
        setCurrentUser(user);
        fetchHistory(user.id);
      }
    } catch (e) {
      console.error('Failed reading user session', e);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchHistory = async (userId: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/deposit?memberId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (e) {
      console.error('Failed fetching deposit history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setErrorMessage('');
    setSuccess(false);

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMessage('Berat sampah harus berupa angka lebih besar dari 0');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: currentUser.id,
          wasteType,
          weight: parsedWeight,
          notes,
          status: 'PENDING', // User deposits are PENDING by default
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setWeight('');
        setNotes('');
        
        // Refresh history
        await fetchHistory(currentUser.id);
        
        // Success animation auto-dismiss
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setErrorMessage(data.error || 'Terjadi kesalahan saat mengajukan setoran.');
      }
    } catch (error) {
      setErrorMessage('Koneksi terputus. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const getEstPoints = () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return 0;
    const rate = POINT_RATES[wasteType] || 0;
    return Math.round(w * rate);
  };

  if (authLoading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div> Loading Sesi Pengguna...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container" style={{ paddingTop: '60px', maxWidth: '600px', textAlign: 'center' }}>
        <div className="card shadow-lg animate-fade-in-up" style={{ padding: '40px' }}>
          <span style={{ fontSize: '4rem' }}>🔒</span>
          <h2 style={{ marginTop: '20px', marginBottom: '10px' }}>Akses Dibatasi</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '30px' }}>
            Anda harus masuk terlebih dahulu untuk mengajukan penjualan/penyetoran sampah.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/login" className="btn btn-primary">Masuk Akun</Link>
            <Link href="/register" className="btn btn-secondary">Daftar Baru</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-wrapper animate-fade-in">
      <div className="page-header">
        <h1>Jual / Setor Sampah</h1>
        <p>Kirimkan data estimasi sampah daur ulang Anda untuk kami jemput atau antarkan langsung ke gudang unit.</p>
      </div>

      <div className="split-grid">
        {/* Left Side: Form */}
        <div className="card form-card">
          <h2>Formulir Penyetoran Sampah</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '24px' }}>
            Isi jenis dan perkiraan berat sampah. Setelah diverifikasi admin di lokasi, saldo Anda akan otomatis bertambah.
          </p>

          <form onSubmit={handleSubmit} className="sell-form">
            <div className="form-group">
              <label className="form-label">Kategori Sampah</label>
              <select 
                className="form-control" 
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
              >
                {Object.keys(POINT_RATES).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimasi Berat (Kg)</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="Contoh: 4.5"
                className="form-control" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan / Catatan Tambahan (Opsional)</label>
              <textarea 
                placeholder="Contoh: 1 karung botol PET bersih, kardus mi instan 5 lembar"
                className="form-control text-area"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Price Rate Sheet */}
            <div className="rate-sheet">
              <div className="sheet-row">
                <span>Nilai per kg untuk <strong>{wasteType}</strong>:</span>
                <strong>Rp {new Intl.NumberFormat('id-ID').format(POINT_RATES[wasteType])}</strong>
              </div>
              <div className="sheet-row total-est-row">
                <span>Estimasi Saldo Diterima:</span>
                <span className="est-points">Rp {new Intl.NumberFormat('id-ID').format(getEstPoints())}</span>
              </div>
            </div>

            {errorMessage && <div className="error-banner">{errorMessage}</div>}

            <button 
              type="submit" 
              className={`btn btn-primary submit-btn ${success ? 'btn-success' : ''}`}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-btn"></span> Mengirim Pengajuan...
                </>
              ) : success ? (
                <>
                  <svg className="checkmark-svg" viewBox="0 0 52 52">
                    <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                  </svg>
                  Berhasil Diajukan!
                </>
              ) : (
                '🚀 Ajukan Setoran Sampah'
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Rates & Rules */}
        <div className="right-panel">
          <div className="card rates-card">
            <h3>Daftar Harga Beli Sampah</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Nilai per Kilogram yang berlaku saat ini:
            </p>
            <div className="rates-list">
              {Object.entries(POINT_RATES).map(([type, rate]) => (
                <div className="rate-item flex-between" key={type}>
                  <span className="rate-name">🌱 {type}</span>
                  <span className="rate-value">Rp {new Intl.NumberFormat('id-ID').format(rate)}/kg</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card rules-card">
            <h3>Syarat & Ketentuan Setoran</h3>
            <ul className="rules-list">
              <li>Pilah sampah sesuai kategorinya sebelum disetorkan.</li>
              <li>Pastikan sampah wadah plastik (botol/gelas) dikosongkan dan dibilas ringan.</li>
              <li>Berat aktual akan diukur dan dicatat ulang oleh Admin saat verifikasi fisik.</li>
              <li>Keputusan tim penimbang Bank Sampah Eco bersifat mutlak.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* History section */}
      <div className="card history-card" style={{ marginTop: '40px' }}>
        <h2>Riwayat Setoran Sampah Anda</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
          Pantau status penimbangan dan saldo yang masuk dari pengajuan setoran Anda.
        </p>

        {historyLoading ? (
          <div className="flex-center" style={{ padding: '40px 0' }}>
            <div className="spinner"></div> Memuat Riwayat...
          </div>
        ) : history.length === 0 ? (
          <div className="empty-history text-center">
            📭 <p>Anda belum pernah mengajukan penyetoran sampah.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Berat Estimasi ( verified )</th>
                  <th>Poin/Saldo</th>
                  <th>Catatan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.deposit_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className="category-label">{item.waste_type}</span></td>
                    <td>{item.weight} kg</td>
                    <td><strong>Rp {new Intl.NumberFormat('id-ID').format(item.points)}</strong></td>
                    <td><span className="notes-text">{item.notes || '-'}</span></td>
                    <td>
                      <span className={`badge status-badge badge-${item.status.toLowerCase()}`}>
                        {item.status === 'PENDING' ? '⏳ Menunggu Verifikasi' : item.status === 'APPROVED' ? '✅ Disetujui' : '❌ Ditolak'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .page-wrapper {
          padding-top: 40px;
        }
        .page-header {
          margin-bottom: 30px;
        }
        .page-header h1 {
          font-size: 2.2rem;
          margin-bottom: 6px;
        }
        .page-header p {
          color: var(--muted);
          font-size: 1.05rem;
        }

        .split-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 30px;
        }

        .card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow);
        }
        
        .card h2, .card h3 {
          margin-bottom: 8px;
        }

        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .text-area {
          height: 100px;
          resize: none;
        }

        .rate-sheet {
          background-color: var(--muted-bg);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .sheet-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.92rem;
          margin-bottom: 8px;
        }

        .total-est-row {
          border-top: 1px dashed var(--card-border);
          padding-top: 8px;
          margin-bottom: 0;
          font-weight: 700;
          font-size: 1rem;
        }

        .est-points {
          color: var(--primary);
          font-size: 1.15rem;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          font-size: 1.05rem;
          justify-content: center;
        }

        .rates-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rate-item {
          padding: 8px 12px;
          border-radius: 8px;
          background-color: var(--muted-bg);
          font-size: 0.95rem;
          font-weight: 600;
        }
        .rate-name {
          color: var(--foreground);
        }
        .rate-value {
          color: var(--primary);
        }

        .rules-list {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.88rem;
          color: var(--muted);
          line-height: 1.5;
        }

        .empty-history {
          padding: 40px;
          color: var(--muted);
        }

        .category-label {
          background-color: rgba(21, 128, 61, 0.08);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .notes-text {
          font-size: 0.85rem;
          color: var(--muted);
        }

        .status-badge {
          font-size: 0.82rem;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 700;
        }
        
        .badge-pending {
          background-color: rgba(234, 179, 8, 0.15);
          color: #854d0e;
        }
        .badge-approved {
          background-color: rgba(34, 197, 94, 0.15);
          color: #166534;
        }
        .badge-rejected {
          background-color: rgba(239, 68, 68, 0.15);
          color: #991b1b;
        }

        /* Checkmark check-draw animation */
        .checkmark-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          stroke-width: 2;
          stroke-miterlimit: 10;
          stroke: white;
          fill: none;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .checkmark-check {
          transform-origin: 50% 50%;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          stroke-width: 3;
          stroke: white;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
        }

        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }

        @media (max-width: 992px) {
          .split-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
