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

      const text = `Halo Bank Sampah KGS, saya ingin bertanya:\n\n` +
        `*Nama:* ${formData.name}\n` +
        `*Email:* ${formData.email}\n` +
        `*Pesan:* ${formData.message}`;

      const waUrl = `https://wa.me/6282322013726?text=${encodeURIComponent(text)}`;

      await new Promise((resolve) => setTimeout(resolve, 600));

      setSubmitting(false);
      setShowSuccessCheck(true);

      setTimeout(() => {
        setShowSuccessCheck(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
        window.open(waUrl, '_blank');
      }, 800);
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
              🎉 Terima kasih! Pesan Anda telah dialihkan ke WhatsApp. Admin kami akan segera menanggapi chat Anda.
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
                    Menghubungkan ke WhatsApp...
                  </>
                ) : showSuccessCheck ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <svg className="checkmark-svg" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Terhubung!
                  </span>
                ) : (
                  '💬 Kirim ke WhatsApp'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Info Block */}
        <div className="info-block">
          <div className="card info-card">
            <h3>Kantor Pusat Unit 01</h3>
            <p>📍 Jln . Sersan Zaini, RT. 27 No. 2819 Kelurahan 2 ilir</p>
            <p>📞 WhatsApp: +62 823-2201-3726 (Admin)</p>
            {/* <p>✉️ Email: info@banksampaheco.org</p> */}
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
          <div className="card map-placeholder-card" style={{ padding: 0, overflow: 'hidden' }}>
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3984.4566367375253!2d104.77977!3d-2.9431057!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b764ee711124d%3A0xe54d249f7e52b210!2sJl.%20Sersan%20Zaini%20No.2819%2C%202%20Ilir%2C%20Kec.%20Ilir%20Tim.%20II%2C%20Kota%20Palembang%2C%20Sumatera%20Selatan%2030111!5e0!3m2!1sid!2sid!4v1710000000000!5m2!1sid!2sid"
              width="100%" 
              height="250" 
              style={{ border: 0 }} 
              allowFullScreen={true}
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Lokasi Strategis KGS Craft 📍
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Jln . Sersan Zaini, RT. 27 No. 2819 Kelurahan 2 ilir, Kota Palembang
              </p>
              <a 
                href="https://maps.app.goo.gl/9UxuUjSLRumVVmXW6"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{ marginTop: '10px', display: 'inline-flex', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Buka di Google Maps Aplikasi ↗
              </a>
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
