'use client';

import { useState, useEffect } from 'react';

interface Variant {
  id?: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  shopee_item_id?: string;
  variants: Variant[];
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Kerajinan Plastik');
  const [price, setPrice] = useState(15000);
  const [stock, setStock] = useState(10);
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<Variant[]>([{ name: 'Standar', sku: '', price: 15000, stock: 10 }]);

  // Action status
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setCategory('Kerajinan Plastik');
    setPrice(15000);
    setStock(10);
    setImageUrl('');
    setVariants([{ name: 'Standar', sku: '', price: 15000, stock: 10 }]);
    setEditorOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setCategory(p.category);
    setPrice(p.price);
    setStock(p.stock);
    setImageUrl(p.image_url);
    setVariants(p.variants.length > 0 ? p.variants : [{ name: 'Standar', sku: '', price: p.price, stock: p.stock }]);
    setEditorOpen(true);
  };

  const handleAddVariantField = () => {
    setVariants([...variants, { name: '', sku: '', price: price, stock: stock }]);
  };

  const handleRemoveVariantField = (idx: number) => {
    if (variants.length === 1) return;
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleVariantFieldChange = (idx: number, field: keyof Variant, value: string | number) => {
    const updated = variants.map((v, i) => {
      if (i === idx) {
        return { ...v, [field]: value };
      }
      return v;
    });
    setVariants(updated);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    setIsError(false);

    // Sum up variant stocks and compute base price (minimum variant price)
    const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock as any) || 0), 0);
    const minPrice = Math.min(...variants.map(v => parseInt(v.price as any) || 0));

    const payload = {
      id: editingProduct?.id,
      name,
      description,
      category,
      price: minPrice,
      stock: totalStock,
      image_url: imageUrl,
      variants: variants.map(v => ({
        ...v,
        price: parseInt(v.price as any),
        stock: parseInt(v.stock as any),
      })),
    };

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg(editingProduct ? 'Produk berhasil diperbarui!' : 'Produk berhasil dibuat!');
        setEditorOpen(false);
        fetchProducts();
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Gagal menyimpan produk.');
      }
    } catch (e) {
      setIsError(true);
      setStatusMsg('Kesalahan jaringan.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini? Listing di Shopee juga akan dihapus.')) return;
    setStatusMsg('');
    setIsError(false);

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Produk berhasil dihapus!');
        fetchProducts();
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Gagal menghapus produk.');
      }
    } catch (e) {
      setIsError(true);
      setStatusMsg('Kesalahan jaringan.');
    }
  };

  const handleTriggerSync = async (id: number) => {
    setSyncingId(id);
    setStatusMsg('');
    setIsError(false);
    
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, onlyStockSync: true }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Sinkronisasi stok ke Shopee sukses!');
        fetchProducts();
      } else {
        setIsError(true);
        setStatusMsg(data.error || 'Gagal mensinkronisasikan stok.');
      }
    } catch (e) {
      setIsError(true);
      setStatusMsg('Gagal menyambung ke server.');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="product-manager animate-fade-in">
      {statusMsg && (
        <div className={`status-banner ${isError ? 'error-state' : 'success-state'}`}>
          {isError ? '❌ ' : '✅ '} {statusMsg}
        </div>
      )}

      <div className="action-bar flex-between" style={{ marginBottom: '20px' }}>
        <h3>📦 Manajemen Katalog E-Commerce</h3>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          ➕ Tambah Produk Daur Ulang
        </button>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <div className="modal-backdrop">
          <div className="modal-card animate-fade-in-up">
            <div className="modal-header flex-between">
              <h3>{editingProduct ? '✏️ Edit Produk Daur Ulang' : '➕ Tambah Produk Daur Ulang'}</h3>
              <button className="close-btn" onClick={() => setEditorOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="modal-body">
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Nama Produk</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select 
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Kerajinan Plastik">Kerajinan Plastik</option>
                    <option value="Kompos">Kompos</option>
                    <option value="Kertas Kreatif">Kertas Kreatif</option>
                    <option value="Upcycle Kaca">Upcycle Kaca</option>
                    <option value="Kerajinan Kayu/Logam">Kerajinan Kayu/Logam</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea 
                  className="form-control" 
                  rows={3} 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL Foto Produk</label>
                <input 
                  type="url" 
                  className="form-control" 
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              {/* Variants Section */}
              <div className="variants-section">
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                  <h4>🎨 Varian & Stok Produk</h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddVariantField}>
                    ➕ Tambah Varian
                  </button>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                  Produk harus memiliki minimal 1 varian (misal: "Ukuran S", "Warna Hijau").
                </p>

                <div className="variants-list">
                  {variants.map((v, i) => (
                    <div className="variant-row" key={i}>
                      <input 
                        type="text" 
                        placeholder="Nama Varian (misal: S)" 
                        className="form-control"
                        required
                        value={v.name}
                        onChange={(e) => handleVariantFieldChange(i, 'name', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="SKU Varian (misal: TAS-S)" 
                        className="form-control"
                        value={v.sku}
                        onChange={(e) => handleVariantFieldChange(i, 'sku', e.target.value)}
                      />
                      <input 
                        type="number" 
                        placeholder="Harga (Rp)" 
                        className="form-control"
                        required
                        min="1"
                        value={v.price}
                        onChange={(e) => handleVariantFieldChange(i, 'price', e.target.value)}
                      />
                      <input 
                        type="number" 
                        placeholder="Stok" 
                        className="form-control"
                        required
                        min="0"
                        value={v.stock}
                        onChange={(e) => handleVariantFieldChange(i, 'stock', e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="btn-remove"
                        onClick={() => handleRemoveVariantField(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer flex-between">
                <button type="button" className="btn btn-secondary" onClick={() => setEditorOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}>Loading...</div>
      ) : products.length === 0 ? (
        <div className="card text-center" style={{ padding: '40px', color: 'var(--muted)' }}>
          📭 Belum ada produk daur ulang. Klik "Tambah Produk" di atas.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Foto</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Harga Terendah</th>
                <th>Total Stok</th>
                <th>Shopee Sync</th>
                <th style={{ width: '220px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div 
                      className="table-img" 
                      style={{ backgroundImage: `url(${p.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'})` }}
                    ></div>
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {p.variants.length} Varian: {p.variants.map(v => `${v.name} (${v.stock})`).join(', ')}
                    </div>
                  </td>
                  <td><span className="badge badge-info">{p.category}</span></td>
                  <td><strong>Rp {new Intl.NumberFormat('id-ID').format(p.price)}</strong></td>
                  <td><strong>{p.stock} pcs</strong></td>
                  <td>
                    {p.shopee_item_id ? (
                      <span className="badge badge-success" style={{ cursor: 'help' }} title={`Item ID: ${p.shopee_item_id}`}>
                        🟧 Synced
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        Not Synced
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => handleOpenEdit(p)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        disabled={syncingId === p.id}
                        onClick={() => handleTriggerSync(p.id)}
                      >
                        {syncingId === p.id ? 'Syncing...' : '🔄 Sync Stok'}
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteProduct(p.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

        .table-img {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          background-size: cover;
          background-position: center;
          background-color: var(--muted-bg);
        }

        .actions-cell {
          display: flex;
          gap: 6px;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          width: 100%;
          max-width: 650px;
          box-shadow: var(--shadow-lg);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--card-border);
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: var(--muted);
        }
        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--card-border);
          background-color: var(--muted-bg);
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        /* Variants editor grid */
        .variants-section {
          background-color: var(--muted-bg);
          padding: 16px;
          border-radius: 12px;
          margin-top: 16px;
        }
        .variants-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .variant-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1fr 30px;
          gap: 10px;
          align-items: center;
        }
        .btn-remove {
          background: none;
          border: none;
          color: var(--danger);
          font-size: 1.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-remove:hover {
          color: var(--danger-hover);
        }
        .btn-sm {
          padding: 4px 10px;
          font-size: 0.8rem;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
