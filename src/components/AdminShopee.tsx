'use client';

import { useState, useEffect } from 'react';

export default function AdminShopee() {
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Configuration fields
  const [partnerId, setPartnerId] = useState('');
  const [partnerKey, setPartnerKey] = useState('');
  const [shopId, setShopId] = useState('');
  const [isSandbox, setIsSandbox] = useState(true);
  const [isSimulated, setIsSimulated] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Webhook simulator state
  const [simProduct, setSimProduct] = useState<any>(null);
  const [simVariantId, setSimVariantId] = useState('');
  const [simQuantity, setSimQuantity] = useState('1');

  // Status flags
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
    fetchSyncedProducts();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/shopee/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        setPartnerId(data.data.partner_id || '');
        setPartnerKey(data.data.partner_key || '');
        setShopId(data.data.shop_id || '');
        setIsSandbox(data.data.is_sandbox === 1);
        setIsSimulated(data.data.is_simulated === 1);
        setIsActive(data.data.is_active === 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/shopee/logs');
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSyncedProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        // Only keep products that are synced (have shopee_item_id)
        const synced = data.data.filter((p: any) => p.shopee_item_id);
        setProducts(synced);
        if (synced.length > 0) {
          setSimProduct(synced[0]);
          if (synced[0].variants && synced[0].variants.length > 0) {
            setSimVariantId(synced[0].variants[0].id.toString());
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProductSelect = (prodId: number) => {
    const prod = products.find(p => p.id === prodId);
    setSimProduct(prod || null);
    if (prod && prod.variants && prod.variants.length > 0) {
      setSimVariantId(prod.variants[0].id.toString());
    } else {
      setSimVariantId('');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMsg('');
    setIsError(false);

    try {
      const res = await fetch('/api/shopee/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          partnerKey,
          shopId,
          isSandbox,
          isSimulated,
          isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Pengaturan Shopee berhasil disimpan!');
        setSettings(data.data);
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Gagal menyimpan pengaturan.');
      }
    } catch (e) {
      setIsError(true);
      setStatusMsg('Kesalahan jaringan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectShopee = () => {
    if (isSimulated) {
      // Direct mock oauth authorization UI
      window.location.href = '/shopee-mock-auth';
    } else {
      // Real Shopee OAuth URL Calculation
      if (!partnerId || !partnerKey) {
        alert('Partner ID dan Partner Key wajib diisi untuk OAuth!');
        return;
      }
      
      const host = isSandbox 
        ? 'https://partner.test-stable.shopeemobile.com' 
        : 'https://partner.shopeemobile.com';
      
      const path = '/api/v2/public/get_token'; // redirect path
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Compute sign
      const crypto = require('crypto');
      const baseStr = `${partnerId}${path}${timestamp}`;
      const sign = crypto.createHmac('sha256', partnerKey).update(baseStr).digest('hex');
      
      const redirectUri = `${window.location.origin}/api/shopee/oauth`;
      const authUrl = `${host}/api/v1/oauth/authorize?partner_id=${partnerId}&redirect=${encodeURIComponent(redirectUri)}&timestamp=${timestamp}&sign=${sign}`;
      
      window.location.href = authUrl;
    }
  };

  const handleFireSimulatedWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simProduct) return;

    setSimLoading(true);
    setStatusMsg('');
    setIsError(false);

    const selectedVar = simProduct.variants.find((v: any) => v.id.toString() === simVariantId);

    try {
      const res = await fetch('/api/shopee/mock-shopee-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopeeItemId: simProduct.shopee_item_id,
          shopeeModelId: selectedVar ? selectedVar.shopee_model_id : null,
          quantity: parseInt(simQuantity),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(`[WEBHOOK SIMULATOR] Berhasil mensimulasikan order Shopee (${data.orderSn}). Stok lokal berkurang!`);
        fetchLogs();
        fetchSyncedProducts();
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Simulasi webhook gagal.');
      }
    } catch (e) {
      setIsError(true);
      setStatusMsg('Gagal menyambung ke simulator.');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="shopee-console animate-fade-in">
      {statusMsg && (
        <div className={`status-banner ${isError ? 'error-state' : 'success-state'}`}>
          {isError ? '❌ ' : '✅ '} {statusMsg}
        </div>
      )}

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Left column: Shopee Settings */}
        <div className="settings-column">
          <div className="card">
            <h3>⚙️ Konfigurasi Shopee Open Platform</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Masukkan Partner credentials Anda dari Shopee Console.
            </p>

            <form onSubmit={handleSaveSettings} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Partner ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={partnerId} 
                  onChange={(e) => setPartnerId(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Partner Key (Client Secret)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={partnerKey} 
                  onChange={(e) => setPartnerKey(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shop ID (Terisi otomatis saat OAuth)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={shopId} 
                  placeholder="Belum terhubung"
                  onChange={(e) => setShopId(e.target.value)} 
                />
              </div>

              {/* Toggles */}
              <div className="toggles-grid">
                <label className="toggle-label flex-between">
                  <span>Simulasi Shopee Sandbox (Offline Testing)</span>
                  <input 
                    type="checkbox" 
                    checked={isSimulated} 
                    onChange={(e) => setIsSimulated(e.target.checked)} 
                  />
                </label>
                
                <label className="toggle-label flex-between">
                  <span>Gunakan Shopee Sandbox URL (Bukan Production)</span>
                  <input 
                    type="checkbox" 
                    checked={isSandbox} 
                    onChange={(e) => setIsSandbox(e.target.checked)} 
                  />
                </label>

                <label className="toggle-label flex-between">
                  <span>Aktifkan Sinkronisasi Shopee</span>
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={(e) => setIsActive(e.target.checked)} 
                  />
                </label>
              </div>

              <div className="action-buttons-settings">
                <button type="submit" className="btn btn-secondary" disabled={actionLoading}>
                  {actionLoading ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleConnectShopee}
                >
                  🔗 Hubungkan Toko Shopee
                </button>
              </div>
            </form>
          </div>

          {/* Connection Status Card */}
          <div className="card" style={{ marginTop: '24px' }}>
            <h3>📡 Status Koneksi Toko</h3>
            
            <div className="status-grid-details" style={{ marginTop: '16px' }}>
              <div className="status-row flex-between">
                <span>Status Integrasi:</span>
                {settings?.is_active === 1 ? (
                  <span className="badge badge-success">AKTIF</span>
                ) : (
                  <span className="badge badge-danger">NON-AKTIF</span>
                )}
              </div>
              <div className="status-row flex-between">
                <span>Tipe Sandbox:</span>
                {settings?.is_simulated === 1 ? (
                  <span className="badge badge-warning">MOCK SIMULATOR</span>
                ) : (
                  <span className="badge badge-info">REAL SANDBOX API</span>
                )}
              </div>
              <div className="status-row flex-between">
                <span>Access Token Shopee:</span>
                <span className="token-text" title={settings?.access_token || 'Tidak ada'}>
                  {settings?.access_token ? `${settings.access_token.slice(0, 15)}...` : 'Belum Login'}
                </span>
              </div>
              {settings?.token_expires_at > 0 && (
                <div className="status-row flex-between">
                  <span>Token Kedaluwarsa:</span>
                  <strong>
                    {new Date(settings.token_expires_at * 1000).toLocaleString('id-ID')}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Webhook simulator & Sync logs */}
        <div className="logs-column">
          {/* Order Webhook Simulator */}
          <div className="card">
            <h3>⚡ Webhook & Order Simulator</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Mensimulasikan order barang yang dibeli pelanggan di Shopee untuk menguji respon webhook (arah sinkronisasi Shopee → Website).
            </p>

            {products.length === 0 ? (
              <div className="sim-empty-banner text-center" style={{ marginTop: '16px', padding: '20px' }}>
                📭 Belum ada produk lokal yang disinkronisasi ke Shopee. Buat produk lalu sync terlebih dahulu.
              </div>
            ) : (
              <form onSubmit={handleFireSimulatedWebhook} style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Pilih Produk (Tersinkron)</label>
                  <select 
                    className="form-control" 
                    required
                    value={simProduct?.id || ''}
                    onChange={(e) => handleProductSelect(parseInt(e.target.value))}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {simProduct && simProduct.variants && simProduct.variants.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Pilih Varian Shopee</label>
                    <select 
                      className="form-control"
                      value={simVariantId}
                      onChange={(e) => setSimVariantId(e.target.value)}
                    >
                      {simProduct.variants.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.name} (Stok Lokal: {v.stock}) (Shopee Model: {v.shopee_model_id || 'Belum Sync'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Jumlah Pembelian di Shopee</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-control"
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={simLoading}>
                  {simLoading ? 'Mengirim Webhook...' : '🛒 Simulasikan Pembelian Shopee'}
                </button>
              </form>
            )}
          </div>

          {/* Sync logs */}
          <div className="card" style={{ marginTop: '24px' }}>
            <h3>📋 Log Sinkronisasi Shopee</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Memantau aktivitas sinkronisasi produk dan stok serta kesalahan API Shopee.
            </p>

            <div className="logs-list" style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <p className="text-center" style={{ color: 'var(--muted)', padding: '20px' }}>
                  Tidak ada aktivitas log sinkronisasi.
                </p>
              ) : (
                logs.map((log) => (
                  <div className="log-item" key={log.id}>
                    <div className="log-meta flex-between">
                      <span className="log-action">
                        {log.action} for <strong>{log.product_name}</strong>
                        {log.variant_name && <small> ({log.variant_name})</small>}
                      </span>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="log-msg">{log.message}</p>
                    <span className="log-time">
                      {new Date(log.created_at || '').toLocaleString('id-ID')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .status-banner {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .status-banner.success-state {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid var(--success);
          color: #166534;
        }
        .status-banner.error-state {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          color: #991b1b;
        }

        .card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow);
        }
        .card h3 {
          font-size: 1.25rem;
          color: var(--foreground);
        }

        .toggles-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
          background-color: var(--muted-bg);
          padding: 16px;
          border-radius: 12px;
        }
        .toggle-label {
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
        }
        .toggle-label input {
          width: 18px;
          height: 18px;
          accent-color: var(--primary);
        }

        .action-buttons-settings {
          display: flex;
          gap: 12px;
        }

        .status-grid-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.95rem;
        }
        .status-row {
          border-bottom: 1px dashed var(--card-border);
          padding-bottom: 8px;
        }
        .status-row span {
          color: var(--muted);
        }
        .token-text {
          font-family: monospace;
          background-color: var(--muted-bg);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .sim-empty-banner {
          background-color: var(--muted-bg);
          border: 1px dashed var(--card-border);
          border-radius: 8px;
          color: var(--muted);
        }

        /* Logs list styles */
        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .log-item {
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 10px;
        }
        .log-item:last-child {
          border-bottom: none;
        }
        .log-meta {
          font-size: 0.88rem;
          margin-bottom: 4px;
        }
        .log-action {
          color: var(--foreground);
        }
        .log-msg {
          font-size: 0.85rem;
          color: var(--muted);
          margin-bottom: 4px;
          word-break: break-all;
        }
        .log-time {
          font-size: 0.72rem;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
