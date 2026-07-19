'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface CartItem {
  productId: number;
  variantId: number | null;
  name: string;
  variantName: string | null;
  price: number;
  quantity: number;
  image_url: string;
}

interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  variant_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  total_price: number;
  status: string;
  created_at: string;
  items?: OrderItem[];
}

function ProfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'profile' | 'cart' | 'orders'>('profile');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Status message
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isError, setIsError] = useState(false);

  // Check login on mount
  useEffect(() => {
    const userStr = localStorage.getItem('banksampah_user');
    if (!userStr) {
      router.replace('/login');
    } else {
      const parsedUser = JSON.parse(userStr);
      setCurrentUser(parsedUser);
      fetchUserBalance(parsedUser.id);
    }
    setLoadingUser(false);

    // Initial cart load
    const storedCart = localStorage.getItem('banksampah_cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error(e);
      }
    }

    // Set tab from query param if available
    const tabParam = searchParams.get('tab');
    if (tabParam === 'cart') setActiveTab('cart');
    else if (tabParam === 'orders') setActiveTab('orders');
  }, [router, searchParams]);

  // Fetch updated user profile data directly from database
  const fetchUserBalance = async (memberId: number) => {
    try {
      const res = await fetch(`/api/members?id=${memberId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const updatedUser = { 
            ...currentUser, 
            name: data.data.name,
            email: data.data.email,
            phone: data.data.phone,
            address: data.data.address,
            role: data.data.role,
            balance: data.data.balance 
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('banksampah_user', JSON.stringify(updatedUser));
          window.dispatchEvent(new Event('user-login')); // sync navbar details
        }
      }
    } catch (e) {
      console.error('Failed updating user profile from DB', e);
    }
  };

  // Fetch orders when tab is orders and user is loaded
  useEffect(() => {
    if (activeTab === 'orders' && currentUser?.email) {
      fetchOrders();
    }
  }, [activeTab, currentUser]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrderError('');
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        setOrderError(data.error || 'Gagal memuat riwayat belanja.');
      }
    } catch (e) {
      setOrderError('Masalah jaringan saat memuat riwayat pesanan.');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Cart operations
  const updateCartQty = (idx: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...cart];
    updated[idx].quantity = newQty;
    setCart(updated);
    localStorage.setItem('banksampah_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-change'));
  };

  const removeCartItem = (idx: number) => {
    const updated = cart.filter((_, i) => i !== idx);
    setCart(updated);
    localStorage.setItem('banksampah_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-change'));
    
    setFeedbackMsg('Produk berhasil dihapus dari keranjang.');
    setIsError(false);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p style={{ color: 'var(--muted)' }}>Memuat data profil...</p>
      </div>
    );
  }

  return (
    <div className="profile-container container">
      {/* Welcome Banner */}
      <div className="profile-header card">
        <div className="profile-hero-content">
          <div className="profile-avatar">
            {(currentUser?.name || 'User').charAt(0).toUpperCase()}
          </div>
          <div className="profile-header-text">
            <h2>Halo, {currentUser?.name || 'Pengguna'}!</h2>
            <p className="subtitle">
              {currentUser?.role === 'ADMIN' 
                ? 'Administrator Bank Sampah KGS' 
                : `Nasabah Setia • Saldo: Rp ${new Intl.NumberFormat('id-ID').format(currentUser?.balance || 0)}`
              }
            </p>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`status-banner ${isError ? 'error-state' : 'success-state'}`} style={{ marginTop: '20px' }}>
          {isError ? '❌ ' : '✅ '} {feedbackMsg}
        </div>
      )}

      {/* Tabs Controller */}
      <div className="tabs-navigation" style={{ marginTop: '24px' }}>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profil Saya
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          🛒 Keranjang ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          🛍️ Riwayat Belanja ({orders.length})
        </button>
      </div>

      <div className="tab-content" style={{ marginTop: '20px' }}>
        {/* TAB 1: Profile Details */}
        {activeTab === 'profile' && (
          <div className="card animate-fade-in-up" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ℹ️ Detail Informasi Akun
            </h3>
            
            <div className="profile-grid">
              <div className="info-box">
                <span className="info-label">Nama Lengkap</span>
                <span className="info-value">{currentUser?.name || '-'}</span>
              </div>
              <div className="info-box">
                <span className="info-label">Nomor Telepon</span>
                <span className="info-value">{currentUser?.phone || '-'}</span>
              </div>
              <div className="info-box">
                <span className="info-label">Alamat Email</span>
                <span className="info-value">{currentUser?.email || '-'}</span>
              </div>
              <div className="info-box">
                <span className="info-label">Saldo Tabungan Sampah</span>
                <span className="info-value" style={{ color: 'var(--primary)', fontWeight: '700' }}>
                  Rp {new Intl.NumberFormat('id-ID').format(currentUser?.balance || 0)}
                </span>
              </div>
              <div className="info-box" style={{ gridColumn: 'span 2' }}>
                <span className="info-label">Alamat Pengiriman Default</span>
                <span className="info-value">{currentUser?.address || 'Belum mengisi alamat'}</span>
              </div>
            </div>

            <div className="action-buttons-group" style={{ marginTop: '30px', borderTop: '1px solid var(--card-border)', paddingTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/jual-sampah" className="btn btn-primary">
                💰 Jual/Setor Sampah Warga
              </Link>
              <Link href="/katalog" className="btn btn-secondary">
                🛍️ Jelajahi Produk Kreatif Daur Ulang
              </Link>
            </div>
          </div>
        )}

        {/* TAB 2: Shopping Cart */}
        {activeTab === 'cart' && (
          <div className="card animate-fade-in-up" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>
              🛒 Keranjang Belanja Aktif Anda
            </h3>

            {cart.length === 0 ? (
              <div className="text-center" style={{ padding: '40px 20px', color: 'var(--muted)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🛍️</span>
                <p style={{ fontWeight: '500', marginBottom: '16px' }}>Keranjang belanja Anda masih kosong.</p>
                <Link href="/katalog" className="btn btn-primary btn-sm">
                  Belanja Sekarang
                </Link>
              </div>
            ) : (
              <div className="cart-content-wrapper">
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Harga</th>
                        <th style={{ width: '130px' }}>Jumlah</th>
                        <th>Subtotal</th>
                        <th style={{ width: '50px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="cart-product-cell" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <div 
                                className="cart-img" 
                                style={{ 
                                  width: '50px', 
                                  height: '50px', 
                                  borderRadius: '8px', 
                                  backgroundImage: `url(${item.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  flexShrink: 0
                                }}
                              ></div>
                              <div>
                                <strong>{item.name}</strong>
                                {item.variantName && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '2px' }}>
                                    Varian: {item.variantName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>Rp {new Intl.NumberFormat('id-ID').format(item.price)}</td>
                          <td>
                            <div className="qty-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button 
                                className="qty-btn" 
                                onClick={() => updateCartQty(idx, item.quantity - 1)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer' }}
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button 
                                className="qty-btn" 
                                onClick={() => updateCartQty(idx, item.quantity + 1)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer' }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <strong>Rp {new Intl.NumberFormat('id-ID').format(item.price * item.quantity)}</strong>
                          </td>
                          <td>
                            <button 
                              className="btn-remove" 
                              onClick={() => removeCartItem(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '1.4rem', cursor: 'pointer' }}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="cart-summary-checkout" style={{ marginTop: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', marginRight: '8px' }}>Total Belanja:</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>
                      Rp {new Intl.NumberFormat('id-ID').format(calculateCartTotal())}
                    </strong>
                  </div>
                  <Link href="/checkout" className="btn btn-primary" style={{ padding: '12px 28px' }}>
                    💳 Lanjut ke Checkout / Pembayaran
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Order History */}
        {activeTab === 'orders' && (
          <div className="card animate-fade-in-up" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>
              🛍️ Riwayat Belanja & Checkout Produk
            </h3>

            {loadingOrders ? (
              <div className="text-center" style={{ padding: '30px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
                <p style={{ color: 'var(--muted)' }}>Memuat riwayat belanja...</p>
              </div>
            ) : orderError ? (
              <div className="status-banner error-state">{orderError}</div>
            ) : orders.length === 0 ? (
              <div className="text-center" style={{ padding: '40px 20px', color: 'var(--muted)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📦</span>
                <p style={{ fontWeight: '500', marginBottom: '12px' }}>Anda belum pernah melakukan checkout pesanan.</p>
                <Link href="/katalog" className="btn btn-secondary btn-sm">
                  Lihat Produk Daur Ulang
                </Link>
              </div>
            ) : (
              <div className="orders-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="order-card" 
                    style={{ 
                      border: '1px solid var(--card-border)', 
                      borderRadius: '12px', 
                      padding: '20px', 
                      backgroundColor: 'var(--muted-bg)' 
                    }}
                  >
                    <div className="order-header flex-between" style={{ borderBottom: '1px dashed var(--card-border)', paddingBottom: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No. Pesanan:</span>
                        <strong style={{ marginLeft: '4px', color: 'var(--foreground)' }}>#ORD-{order.id}</strong>
                        <span style={{ margin: '0 8px', color: 'var(--card-border)' }}>|</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="badge badge-success" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                          ✅ Stok Sinkron ke Shopee
                        </span>
                        <span className={`status-badge-admin status-${order.status.toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px' }}>
                          {order.status === 'PENDING' ? '⏳ Diproses' : order.status === 'SHIPPED' ? '🚚 Dikirim' : '✅ Selesai'}
                        </span>
                      </div>
                    </div>

                    <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {order.items?.map((item) => (
                        <div key={item.id} className="order-item-row flex-between" style={{ fontSize: '0.95rem' }}>
                          <div>
                            <strong>{item.product_name}</strong>
                            {item.variant_name && item.variant_name !== 'Unknown' && (
                              <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginLeft: '6px' }}>
                                ({item.variant_name})
                              </span>
                            )}
                            <span style={{ color: 'var(--muted)', marginLeft: '10px' }}>
                              x {item.quantity}
                            </span>
                          </div>
                          <span>Rp {new Intl.NumberFormat('id-ID').format(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer flex-between" style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '12px', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        📍 Alamat: <span style={{ color: 'var(--foreground)' }}>{order.shipping_address}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted)', marginRight: '8px' }}>Total Pembayaran:</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>
                          Rp {new Intl.NumberFormat('id-ID').format(order.total_price)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-container {
          padding-top: 30px;
          padding-bottom: 50px;
          max-width: 900px;
        }

        .profile-header {
          padding: 28px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.03) 100%);
          border: 1px solid var(--card-border);
        }

        .profile-hero-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .profile-avatar {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background-color: var(--primary);
          color: white;
          font-size: 2rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
        }

        .profile-header-text h2 {
          font-size: 1.5rem;
          color: var(--foreground);
        }

        .profile-header-text .subtitle {
          color: var(--muted);
          font-size: 0.95rem;
          margin-top: 4px;
        }

        /* Tabs Navigation */
        .tabs-navigation {
          display: flex;
          border-bottom: 2px solid var(--card-border);
          gap: 12px;
        }

        .tab-btn {
          padding: 12px 20px;
          background: none;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn:hover {
          color: var(--foreground);
        }

        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        /* Profile Details Grid */
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .info-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--muted-bg);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--card-border);
        }

        .info-label {
          font-size: 0.8rem;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--foreground);
        }

        .status-banner {
          padding: 12px;
          border-radius: 8px;
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

        /* Responsive */
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .info-box {
            grid-column: span 1 !important;
          }
          .tabs-navigation {
            flex-direction: column;
            border-bottom: none;
            gap: 6px;
          }
          .tab-btn {
            border-bottom: none;
            border-left: 3px solid transparent;
            padding: 10px 16px;
            width: 100%;
            background-color: var(--muted-bg);
            border-radius: 8px;
          }
          .tab-btn.active {
            border-left-color: var(--primary);
            background-color: rgba(34, 197, 94, 0.08);
          }
        }
      `}</style>
    </div>
  );
}

export default function ProfilPage() {
  return (
    <Suspense fallback={
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p style={{ color: 'var(--muted)' }}>Memuat data profil...</p>
      </div>
    }>
      <ProfilContent />
    </Suspense>
  );
}
