'use client';

import { useState } from 'react';

export default function Kontak() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitting(true);
      
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setSubmitting(false);
      setShowSuccessCheck(true);
      
      setTimeout(() => {
        setShowSuccessCheck(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
      }, 1000);
    }
  };

  return (
    <div className="container contact-page animate-fade-in">
      <div className="header-block text-center">
        <span className="subtitle">Hubungi Kami</span>
        <h1>Kontak & Lokasi Unit</h1>
        <p>Hubungi admin kami atau datangi salah satu unit penimbangan terdekat di wilayah Anda.</p>
      </div>

      <div className="contact-grid">
        {/* Contact Form */}
        <div className="card contact-form-card">
          <h2>Kirim Pesan</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Punya pertanyaan seputar jenis sampah, kerja sama, atau penarikan saldo? Kirim pesan Anda di bawah ini.
          </p>

          {submitted ? (
            <div className="success-banner">
              🎉 Terima kasih! Pesan Anda telah terkirim. Admin kami akan segera menghubungi Anda.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Aktif</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Isi Pesan / Pertanyaan</label>
                <textarea 
                  className="form-control" 
                  rows={5} 
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || showSuccessCheck}>
                {submitting ? (
                  <>
                    <span className="spinner-btn"></span>
                    Mengirim...
                  </>
                ) : showSuccessCheck ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <svg className="checkmark-svg" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Terkirim!
                  </span>
                ) : (
                  'Kirim Pesan'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Info Block */}
        <div className="info-block">
          <div className="card info-card">
            <h3>Kantor Pusat Unit 01</h3>
            <p>📍 Jl. Lingkungan Lestari No. 12, Kelurahan Sukamaju, Bandung</p>
            <p>📞 WhatsApp: 0812-3456-7890 (Admin)</p>
            <p>✉️ Email: info@banksampaheco.org</p>
          </div>

          <div className="card info-card">
            <h3>Jam Operasional Penimbangan</h3>
            <ul className="hours-list">
              <li><span>Senin - Kamis:</span> <strong>08:00 - 14:00 WIB</strong></li>
              <li><span>Jumat:</span> <strong>08:00 - 11:30 WIB</strong></li>
              <li><span>Sabtu:</span> <strong>09:00 - 12:00 WIB</strong></li>
              <li><span>Minggu / Hari Libur:</span> <strong style={{ color: 'var(--danger)' }}>Tutup</strong></li>
            </ul>
          </div>

          {/* Map placeholder */}
          <div className="card map-placeholder-card">
            <div className="map-art">
              🗺️ <span>[Peta Lokasi Bank Sampah Eco]</span>
            </div>
            <div style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>Lokasi Strategis</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Dekat Balai Kelurahan Sukamaju, depan taman kota.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .contact-page {
          padding-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 50px;
        }
        .header-block {
          max-width: 600px;
          margin: 0 auto;
        }
        .subtitle {
          color: var(--primary);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 1px;
        }
        .header-block h1 {
          font-size: 2.5rem;
          margin: 10px 0;
        }
        .header-block p {
          color: var(--muted);
          font-size: 1.05rem;
        }
        
        .contact-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 30px;
        }
        .card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow);
        }
        .contact-form-card h2 {
          font-size: 1.6rem;
          margin-bottom: 8px;
        }
        .success-banner {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid var(--success);
          color: #166534;
          padding: 16px;
          border-radius: 8px;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .info-block {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .info-card h3 {
          font-size: 1.2rem;
          margin-bottom: 12px;
          color: var(--primary);
        }
        .info-card p {
          margin-bottom: 10px;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .hours-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.95rem;
        }
        .hours-list li {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed var(--card-border);
          padding-bottom: 4px;
        }

        .map-placeholder-card {
          padding: 0;
          overflow: hidden;
        }
        .map-art {
          height: 150px;
          background-color: var(--muted-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--muted);
          border-bottom: 1px solid var(--card-border);
        }

        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
