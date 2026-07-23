'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('banksampah_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
      
      const userStr = localStorage.getItem('banksampah_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCustomer({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || ''
        });
      }
    } catch (e) {
      console.error('Failed reading cart or user profile', e);
    }
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          shippingAddress: customer.address,
          items: cart.map(i => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowSuccessCheck(true);
        setTimeout(() => {
          setShowSuccessCheck(false);
          setSuccess(true);
          setOrderId(data.orderId);
          // Clear cart
          localStorage.removeItem('banksampah_cart');
          window.dispatchEvent(new Event('cart-updated'));
        }, 1200);
      } else {
        setError(data.error || 'Terjadi kesalahan saat memproses pesanan.');
      }
    } catch (e) {
      setError('Terjadi masalah koneksi jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="container checkout-page animate-fade-in flex-center" style={{ minHeight: '60vh' }}>
        <div className="card success-card text-center">
          <div className="success-icon">🎉</div>
          <h1>Pesanan Berhasil Dibuat!</h1>
          <p className="order-number">ID Pesanan Anda: <strong>#{orderId}</strong></p>
          <p className="success-detail">
            Terima kasih telah berbelanja di Bank Sampah KGS. Pesanan Anda sedang diproses 
            dan stok telah disinkronisasikan langsung ke Meta Catalog (Facebook & Instagram Shop). Petugas kami akan menghubungi 
            Anda melalui nomor telepon yang disediakan.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
            <Link href="/" className="btn btn-secondary">Kembali ke Beranda</Link>
            <Link href="/katalog" className="btn btn-primary">Belanja Lagi</Link>
          </div>
        </div>
        
        <style jsx>{`
          .success-card {
            max-width: 550px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 40px;
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
          }
          .success-icon {
            font-size: 4rem;
            margin-bottom: 16px;
          }
          h1 {
            color: var(--primary);
            font-size: 1.8rem;
            margin-bottom: 8px;
          }
          .order-number {
            font-size: 1.1rem;
            margin-bottom: 12px;
          }
          .success-detail {
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 24px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container checkout-page animate-fade-in">
      <div className="checkout-header">
        <h1>Checkout Pesanan</h1>
        <p>Isi formulir pengiriman di bawah ini untuk memproses produk daur ulang Anda.</p>
      </div>

      {cart.length === 0 ? (
        <div className="card text-center" style={{ padding: '40px' }}>
          <h3>Keranjang belanja Anda kosong.</h3>
          <p style={{ color: 'var(--muted)', margin: '12px 0 20px 0' }}>Anda harus menambahkan produk ke keranjang terlebih dahulu.</p>
          <Link href="/katalog" className="btn btn-primary">Lihat Katalog</Link>
        </div>
      ) : (
        <div className="checkout-grid">
          {/* Billing Form */}
          <div className="card checkout-form-card">
            <h2>Informasi Pengiriman</h2>
            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Nama Penerima</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Email Aktif</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nomor Telepon (WhatsApp)</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required
                    placeholder="Contoh: 08123456789"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Lengkap Pengiriman</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  required
                  placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan, kota."
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <button type="submit" className="btn btn-primary place-order-btn" disabled={submitting || showSuccessCheck}>
                {submitting ? (
                  <>
                    <span className="spinner-btn"></span>
                    Memproses...
                  </>
                ) : showSuccessCheck ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <svg className="checkmark-svg" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Sukses!
                  </span>
                ) : (
                  `Bayar Sekarang - Rp ${new Intl.NumberFormat('id-ID').format(cartTotal)}`
                )}
              </button>
            </form>
          </div>

          {/* Cart Summary */}
          <div className="card summary-card">
            <h2>Ringkasan Pesanan</h2>
            <div className="summary-items" style={{ margin: '20px 0' }}>
              {cart.map((item, i) => (
                <div className="summary-item flex-between" key={i}>
                  <div className="item-name-variant">
                    <strong>{item.productName}</strong>
                    <span>Varian: {item.variantName}</span>
                    <small>Qty: {item.quantity} x Rp {new Intl.NumberFormat('id-ID').format(item.price)}</small>
                  </div>
                  <strong className="item-subtotal">
                    Rp {new Intl.NumberFormat('id-ID').format(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="totals-row flex-between">
                <span>Subtotal Produk:</span>
                <span>Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}</span>
              </div>
              <div className="totals-row flex-between">
                <span>Ongkos Kirim:</span>
                <span className="badge badge-success">GRATIS (Bandung Kota)</span>
              </div>
              <hr style={{ margin: '14px 0', borderColor: 'var(--card-border)' }} />
              <div className="totals-row flex-between grand-total">
                <span>Total Pembayaran:</span>
                <strong>Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .checkout-page {
          padding-top: 40px;
        }
        .checkout-header {
          margin-bottom: 30px;
        }
        .checkout-header h1 {
          font-size: 2.2rem;
          margin-bottom: 4px;
        }
        .checkout-header p {
          color: var(--muted);
        }

        .checkout-grid {
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
        .checkout-form-card h2, .summary-card h2 {
          font-size: 1.4rem;
          border-bottom: 2px solid var(--primary);
          padding-bottom: 8px;
          display: inline-block;
        }
        .error-banner {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          color: #991b1b;
          padding: 12px;
          border-radius: 6px;
          margin-top: 16px;
          font-size: 0.9rem;
        }
        .place-order-btn {
          width: 100%;
          padding: 12px;
          font-size: 1.05rem;
          margin-top: 20px;
          justify-content: center;
        }

        /* Summary */
        .summary-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .summary-item {
          border-bottom: 1px dashed var(--card-border);
          padding-bottom: 12px;
          align-items: flex-start;
        }
        .item-name-variant {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .item-name-variant span {
          font-size: 0.78rem;
          color: var(--muted);
        }
        .item-name-variant small {
          font-size: 0.82rem;
          color: var(--primary);
          margin-top: 2px;
        }
        .item-subtotal {
          font-size: 0.95rem;
        }
        .totals-row {
          font-size: 0.95rem;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .grand-total {
          font-size: 1.15rem;
          color: var(--foreground);
        }

        @media (max-width: 992px) {
          .checkout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
