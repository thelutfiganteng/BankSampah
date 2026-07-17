'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopeeMockAuth() {
  const router = useRouter();
  const [shopId, setShopId] = useState('SHOP_MOCK_ID_888');
  const [partnerId, setPartnerId] = useState('PARTNER_MOCK_123');
  const [error, setError] = useState('');

  const handleAuthorize = () => {
    if (!shopId.trim() || !partnerId.trim()) {
      setError('Partner ID dan Shop ID harus diisi!');
      return;
    }
    // Redirect to local OAuth callback endpoint
    const mockCode = 'mock_auth_code_' + Math.floor(Math.random() * 1000000);
    router.push(`/api/shopee/oauth?code=${mockCode}&shop_id=${shopId}&mock=true`);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="shopee-header">
          <span className="shopee-logo-text">shopee</span>
          <span className="partner-badge">Partner Sandbox</span>
        </div>
        
        <div className="auth-body">
          <h2>Permintaan Otorisasi Aplikasi</h2>
          <p className="app-request">
            Aplikasi <strong>Bank Sampah EcoSync</strong> meminta izin untuk mengakses dan mengelola toko Shopee Anda.
          </p>

          <div className="permission-list">
            <h4>Izin yang diminta:</h4>
            <ul>
              <li>📋 Membaca & Mengubah Listing Produk</li>
              <li>📦 Mengubah Stok & Harga Varian Produk</li>
              <li>🔔 Menerima Notifikasi Stok & Penjualan (Webhook)</li>
            </ul>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="form-group-auth">
            <label>Partner ID (Developer)</label>
            <input 
              type="text" 
              className="form-input-auth" 
              value={partnerId} 
              onChange={(e) => setPartnerId(e.target.value)} 
            />
          </div>

          <div className="form-group-auth">
            <label>Shop ID Toko Anda (Seller)</label>
            <input 
              type="text" 
              className="form-input-auth" 
              value={shopId} 
              onChange={(e) => setShopId(e.target.value)} 
            />
          </div>

          <div className="action-buttons">
            <button className="btn-cancel" onClick={() => router.push('/admin?tab=shopee')}>
              Batal
            </button>
            <button className="btn-authorize" onClick={handleAuthorize}>
              Izinkan & Otorisasi
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          padding: 20px;
          color: #333;
        }
        .auth-card {
          width: 100%;
          max-width: 500px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .shopee-header {
          background-color: #ee4d2d; /* Shopee Orange */
          color: white;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .shopee-logo-text {
          font-size: 2.2rem;
          font-weight: 800;
          font-style: italic;
          letter-spacing: -1.5px;
        }
        .partner-badge {
          background-color: rgba(255, 255, 255, 0.2);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .auth-body {
          padding: 30px 24px;
        }
        h2 {
          font-size: 1.4rem;
          margin-bottom: 12px;
          color: #222;
        }
        .app-request {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #666;
          margin-bottom: 24px;
        }
        .permission-list {
          background-color: #fafafa;
          border: 1px solid #eee;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }
        .permission-list h4 {
          margin-bottom: 10px;
          font-size: 0.9rem;
          color: #444;
        }
        .permission-list ul {
          list-style: none;
          padding-left: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .permission-list li {
          font-size: 0.9rem;
          color: #555;
        }
        .form-group-auth {
          margin-bottom: 16px;
        }
        .form-group-auth label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 6px;
          color: #555;
        }
        .form-input-auth {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.95rem;
          outline: none;
        }
        .form-input-auth:focus {
          border-color: #ee4d2d;
        }
        .error-box {
          background-color: #fff2f0;
          border: 1px solid #ffccc7;
          color: #ff4d4f;
          padding: 10px;
          border-radius: 4px;
          font-size: 0.88rem;
          margin-bottom: 16px;
        }
        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 30px;
        }
        .btn-cancel {
          background: #f5f5f5;
          border: 1px solid #d9d9d9;
          color: #595959;
          padding: 10px 18px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-cancel:hover {
          background: #e8e8e8;
        }
        .btn-authorize {
          background: #ee4d2d;
          border: none;
          color: white;
          padding: 10px 22px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-authorize:hover {
          background: #d73d1f;
        }
      `}</style>
    </div>
  );
}
