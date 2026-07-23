'use client';

import { useState, useEffect } from 'react';

interface MetaSettings {
  app_id: string;
  catalog_id: string;
  is_active: number;
  access_token_preview: string;
  app_secret_set: boolean;
  source: string;
}

interface SyncLog {
  id: number;
  product_id: number;
  action: string;
  status: string;
  message: string;
  created_at: string;
  product_name?: string;
}

interface Product {
  id: number;
  name: string;
  stock: number;
  meta_product_id?: string;
  meta_sync_status?: string;
}

export default function AdminMeta() {
  const [settings, setSettings] = useState<MetaSettings | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [connectionResult, setConnectionResult] = useState<null | { ok: boolean; msg: string; data?: any }>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Simulator state
  const [simProductId, setSimProductId] = useState<number | null>(null);
  const [simQuantity, setSimQuantity] = useState('1');

  useEffect(() => {
    Promise.all([fetchSettings(), fetchLogs(), fetchProducts(), fetchPendingCount()])
      .finally(() => setLoading(false));
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/meta/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/meta/logs');
      const data = await res.json();
      if (data.success) setLogs(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setProducts(data.data);
        setSimProductId(data.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/meta-catalog/retry');
      const data = await res.json();
      if (data.success) setPendingCount(data.pending_count || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setConnectionResult(null);

    try {
      const res = await fetch('/api/meta-catalog/test');
      const data = await res.json();

      if (data.success) {
        setConnectionResult({
          ok: true,
          msg: `✅ Terhubung ke katalog "${data.data.catalog_name}" — ${data.data.product_count} produk di Meta.`,
          data: data.data,
        });
      } else {
        setConnectionResult({ ok: false, msg: `❌ ${data.error}` });
      }
    } catch (e: any) {
      setConnectionResult({ ok: false, msg: `❌ Gagal: ${e.message}` });
    } finally {
      setTestLoading(false);
    }
  };

  const handleRetryPending = async () => {
    setRetryLoading(true);
    setStatusMsg('');
    setIsError(false);

    try {
      const res = await fetch('/api/meta-catalog/retry', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setStatusMsg(`✅ ${data.message}`);
        fetchLogs();
        fetchProducts();
        fetchPendingCount();
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Retry gagal.');
      }
    } catch {
      setIsError(true);
      setStatusMsg('Koneksi gagal.');
    } finally {
      setRetryLoading(false);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simProductId) return;

    setSimLoading(true);
    setStatusMsg('');
    setIsError(false);

    try {
      const payload = {
        event: 'order_placed',
        order_id: `META-SIM-${Date.now()}`,
        items: [{ retailer_id: `prod_${simProductId}`, quantity: parseInt(simQuantity) || 1 }],
      };

      const res = await fetch('/api/meta/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        const prod = products.find(p => p.id === simProductId);
        setStatusMsg(`✅ Simulasi berhasil! Stok "${prod?.name}" berkurang ${simQuantity} unit.`);
        fetchLogs();
        fetchProducts();
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Simulasi gagal.');
      }
    } catch {
      setIsError(true);
      setStatusMsg('Gagal mengirim webhook.');
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center" style={{ padding: '40px' }}>
        <div className="spinner-btn" style={{ borderColor: 'var(--primary)', borderLeftColor: 'transparent', width: '24px', height: '24px' }}></div>
        <p style={{ marginTop: '12px', color: 'var(--muted)' }}>Memuat Meta Commerce...</p>
      </div>
    );
  }

  const isConfigured = settings && settings.is_active === 1;

  return (
    <div className="meta-console animate-fade-in">
      {statusMsg && (
        <div className={`mc-banner ${isError ? 'mc-banner-error' : 'mc-banner-success'}`}>
          {statusMsg}
        </div>
      )}

      {/* Architecture Flow */}
      <div className="mc-card mc-flow-card">
        <h3 className="mc-card-title">
          <span style={{ fontSize: '1.3rem' }}>🔗</span> Alur Integrasi Meta Catalog API
        </h3>
        <div className="mc-flow">
          <div className="mc-flow-step">
            <span className="mc-flow-icon">🌐</span>
            <strong>Website KGS</strong>
            <small>CRUD Produk</small>
          </div>
          <span className="mc-flow-arrow">→</span>
          <div className="mc-flow-step">
            <span className="mc-flow-icon">📡</span>
            <strong>Graph API v25.0</strong>
            <small>POST/GET/DELETE</small>
          </div>
          <span className="mc-flow-arrow">→</span>
          <div className="mc-flow-step">
            <span className="mc-flow-icon">📘</span>
            <strong>Facebook Shop</strong>
            <small>Halaman Toko</small>
          </div>
          <span className="mc-flow-arrow">+</span>
          <div className="mc-flow-step">
            <span className="mc-flow-icon">📸</span>
            <strong>Instagram Shopping</strong>
            <small>Tag Produk</small>
          </div>
        </div>
      </div>

      <div className="mc-grid">
        {/* Left Column */}
        <div>
          {/* Status Card */}
          <div className="mc-card">
            <h3 className="mc-card-title">📡 Status Koneksi</h3>

            <div className="mc-status-grid">
              <div className="mc-status-row">
                <span>Status</span>
                {isConfigured ? (
                  <span className="badge badge-success">🟢 AKTIF</span>
                ) : (
                  <span className="badge badge-danger">⚫ TIDAK DIKONFIGURASI</span>
                )}
              </div>
              <div className="mc-status-row">
                <span>Credential Source</span>
                <span className="mc-mono">.env.local</span>
              </div>
              <div className="mc-status-row">
                <span>App ID</span>
                <span className="mc-mono">{settings?.app_id || '—'}</span>
              </div>
              <div className="mc-status-row">
                <span>Catalog ID</span>
                <span className="mc-mono">{settings?.catalog_id || '—'}</span>
              </div>
              <div className="mc-status-row">
                <span>Access Token</span>
                <span className="mc-mono">{settings?.access_token_preview || 'Tidak ada'}</span>
              </div>
              <div className="mc-status-row">
                <span>App Secret</span>
                <span className="mc-mono">{settings?.app_secret_set ? '✅ Set' : '❌ Tidak ada'}</span>
              </div>
              <div className="mc-status-row">
                <span>Webhook URL</span>
                <span className="mc-mono" style={{ fontSize: '0.72rem' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/meta/webhook` : '/api/meta/webhook'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={handleTestConnection}
                disabled={testLoading || !isConfigured}
              >
                {testLoading ? 'Menguji...' : '🧪 Test Koneksi'}
              </button>
            </div>

            {connectionResult && (
              <div className={`mc-banner ${connectionResult.ok ? 'mc-banner-success' : 'mc-banner-error'}`} style={{ marginTop: '16px' }}>
                {connectionResult.msg}
                {connectionResult.data && connectionResult.ok && (
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', opacity: 0.85 }}>
                    API Version: {connectionResult.data.api_version} &nbsp;|&nbsp;
                    Token: {connectionResult.data.token_preview}
                  </div>
                )}
              </div>
            )}

            {!isConfigured && (
              <div className="mc-banner mc-banner-error" style={{ marginTop: '16px' }}>
                <strong>⚠️ Meta Catalog belum dikonfigurasi.</strong><br />
                Set variabel berikut di file <code>.env.local</code>:
                <pre style={{ marginTop: '8px', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
{`META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_CATALOG_ID=your_catalog_id
META_SYSTEM_USER_TOKEN=your_access_token`}
                </pre>
                Lalu restart server: <code>npm run dev</code>
              </div>
            )}
          </div>

          {/* Pending Sync Retry */}
          <div className="mc-card" style={{ marginTop: '20px' }}>
            <h3 className="mc-card-title">🔄 Retry Sinkronisasi Gagal</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Produk yang gagal sync akan ditandai <code>pending_sync</code> dan bisa di-retry.
            </p>

            <div className="mc-status-row" style={{ marginTop: '16px' }}>
              <span>Produk Pending Sync:</span>
              <span className={`badge ${pendingCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                {pendingCount}
              </span>
            </div>

            <button
              className="btn btn-secondary"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={handleRetryPending}
              disabled={retryLoading || pendingCount === 0}
            >
              {retryLoading ? 'Menjalankan retry...' : `🔁 Retry ${pendingCount} Produk Pending`}
            </button>

            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '8px' }}>
              💡 Tip: Panggil <code>POST /api/meta-catalog/retry</code> dari cron job untuk auto-retry setiap 5 menit.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Webhook Simulator */}
          <div className="mc-card">
            <h3 className="mc-card-title">⚡ Webhook Simulator</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Simulasi pembelian dari Facebook/Instagram Shop untuk test alur webhook.
            </p>

            {products.length === 0 ? (
              <div className="mc-empty">📭 Belum ada produk. Buat produk di tab Katalog Produk.</div>
            ) : (
              <form onSubmit={handleSimulate} style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Pilih Produk</label>
                  <select
                    className="form-control"
                    value={simProductId || ''}
                    onChange={(e) => setSimProductId(parseInt(e.target.value))}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stok: {p.stock})
                        {p.meta_sync_status === 'synced' ? ' ✅' : p.meta_sync_status === 'pending_sync' ? ' ⏳' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={simLoading}>
                  {simLoading ? 'Mengirim...' : '🛒 Simulasi Pembelian Meta'}
                </button>
              </form>
            )}
          </div>

          {/* Sync Logs */}
          <div className="mc-card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="mc-card-title">📋 Log Sinkronisasi</h3>
              <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={fetchLogs}>
                🔄 Refresh
              </button>
            </div>

            <div className="mc-logs" style={{ marginTop: '12px' }}>
              {logs.length === 0 ? (
                <p className="text-center" style={{ color: 'var(--muted)', padding: '20px' }}>
                  Belum ada log sinkronisasi Meta.
                </p>
              ) : (
                logs.map((log) => (
                  <div className="mc-log-item" key={log.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {log.action} — <strong>{log.product_name || `#${log.product_id}`}</strong>
                      </span>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0', wordBreak: 'break-all' }}>
                      {log.message}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
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
        .mc-banner {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 600;
          font-size: 0.92rem;
        }
        .mc-banner-success {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #166534;
        }
        .mc-banner-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #991b1b;
        }
        .mc-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow);
        }
        .mc-card-title {
          font-size: 1.15rem;
          color: var(--foreground);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mc-flow-card {
          margin-bottom: 24px;
          background: linear-gradient(135deg, rgba(66,103,178,0.06) 0%, rgba(138,43,226,0.04) 100%);
        }
        .mc-flow {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .mc-flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 10px 16px;
          min-width: 110px;
          text-align: center;
        }
        .mc-flow-step strong { font-size: 0.82rem; }
        .mc-flow-step small { font-size: 0.68rem; color: var(--muted); }
        .mc-flow-icon { font-size: 1.4rem; }
        .mc-flow-arrow { font-size: 1.4rem; font-weight: 800; color: var(--primary); }
        .mc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .mc-grid { grid-template-columns: 1fr; }
        }
        .mc-status-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }
        .mc-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px dashed var(--card-border);
          padding-bottom: 8px;
          font-size: 0.9rem;
        }
        .mc-status-row span:first-child { color: var(--muted); }
        .mc-mono {
          font-family: monospace;
          background: var(--muted-bg);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .mc-empty {
          background: var(--muted-bg);
          border: 1px dashed var(--card-border);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: var(--muted);
          margin-top: 16px;
        }
        .mc-logs {
          max-height: 380px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mc-log-item {
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 10px;
        }
        .mc-log-item:last-child { border-bottom: none; }
        .badge-warning {
          background: rgba(234, 179, 8, 0.15);
          color: #92400e;
        }
        code {
          background: var(--muted-bg);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 0.82rem;
        }
        pre {
          background: var(--muted-bg);
          padding: 10px;
          border-radius: 6px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
