'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Variant {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  shopee_model_id: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  shopee_item_id: string;
  variants: Variant[];
}

export default function Katalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [loading, setLoading] = useState(true);
  
  // Track selected variant ID per product ID
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});
  
  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        setFilteredProducts(data.data);
        
        // Extract unique categories
        const cats: string[] = ['Semua'];
        data.data.forEach((p: Product) => {
          if (!cats.includes(p.category)) {
            cats.push(p.category);
          }
        });
        setCategories(cats);

        // Pre-select first variant for each product
        const initialVars: Record<number, number> = {};
        data.data.forEach((p: Product) => {
          if (p.variants && p.variants.length > 0) {
            initialVars[p.id] = p.variants[0].id;
          }
        });
        setSelectedVariants(initialVars);
      }
    } catch (e) {
      console.error('Failed fetching products', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    try {
      const stored = localStorage.getItem('banksampah_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed reading cart', e);
    }
  };

  const saveCart = (newCart: any[]) => {
    setCart(newCart);
    localStorage.setItem('banksampah_cart', JSON.stringify(newCart));
    // Trigger navbar notification update
    window.dispatchEvent(new Event('cart-updated'));
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'Semua') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === cat));
    }
  };

  const handleVariantChange = (productId: number, variantId: number) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: variantId }));
  };

  const addToCart = (product: Product) => {
    const selectedVariantId = selectedVariants[product.id];
    const selectedVariant = product.variants.find(v => v.id === selectedVariantId);

    if (!selectedVariant) return;

    // Create unique key for item + variant
    const cartItemId = `${product.id}-${selectedVariant.id}`;
    
    const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);
    
    if (existingIndex > -1) {
      // Check if quantity exceeds stock
      if (cart[existingIndex].quantity >= selectedVariant.stock) {
        alert('Stok varian tidak mencukupi untuk ditambah lagi.');
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      saveCart(updated);
    } else {
      const newItem = {
        cartItemId,
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantName: selectedVariant.name,
        price: selectedVariant.price,
        stock: selectedVariant.stock,
        imageUrl: product.image_url,
        quantity: 1,
      };
      saveCart([...cart, newItem]);
    }
    
    setCartOpen(true); // Open cart sidebar to show user
  };

  const updateCartQty = (cartItemId: string, amount: number) => {
    const updated = cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const nextQty = item.quantity + amount;
        if (nextQty <= 0) return null;
        if (nextQty > item.stock) {
          alert('Batas stok maksimum tercapai');
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean);
    saveCart(updated);
  };

  const removeFromCart = (cartItemId: string) => {
    const updated = cart.filter(item => item.cartItemId !== cartItemId);
    saveCart(updated);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="container catalog-page animate-fade-in">
      <div className="catalog-header">
        <h1>Katalog Produk Daur Ulang</h1>
        <p>Produk kreatif berkualitas tinggi hasil olahan sampah plastik & organik daur ulang warga.</p>
        
        {/* Cart Trigger */}
        <button className="btn btn-secondary cart-toggle-float" onClick={() => setCartOpen(true)}>
          🛒 Keranjang Belanja ({cart.reduce((sum, i) => sum + i.quantity, 0)})
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="category-tabs">
        {categories.map((cat, i) => (
          <button
            key={i}
            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '300px' }}>
          <div className="spinner"></div> Loading Produk...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-catalog text-center">
          📭 <h3>Belum ada produk terdaftar di kategori ini.</h3>
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredProducts.map((product) => {
            const currentVariantId = selectedVariants[product.id];
            const currentVariant = product.variants.find(v => v.id === currentVariantId) || product.variants[0];

            return (
              <div className="product-card" key={product.id}>
                <div 
                  className="product-img" 
                  style={{ backgroundImage: `url(${product.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'})` }}
                >
                  <span className="category-badge">{product.category}</span>
                </div>
                
                <div className="product-body">
                  <h3>{product.name}</h3>
                  <p className="description">{product.description}</p>
                  
                  {/* Variant Selection */}
                  {product.variants && product.variants.length > 1 && (
                    <div className="variant-selector-wrapper">
                      <label className="variant-label">Pilih Varian:</label>
                      <select 
                        className="variant-select"
                        value={currentVariantId}
                        onChange={(e) => handleVariantChange(product.id, parseInt(e.target.value))}
                      >
                        {product.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} - Rp {new Intl.NumberFormat('id-ID').format(v.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Price & Stock Display */}
                  <div className="price-stock-row flex-between">
                    <div className="price-display">
                      Rp {new Intl.NumberFormat('id-ID').format(currentVariant ? currentVariant.price : product.price)}
                    </div>
                    <div className={`stock-display ${currentVariant?.stock === 0 ? 'out-of-stock' : ''}`}>
                      {currentVariant?.stock > 0 ? `Stok: ${currentVariant.stock} unit` : 'Habis'}
                    </div>
                  </div>

                  {product.shopee_item_id && (
                    <div className="shopee-badge">
                      <span>🟧</span> Sinkron dengan Shopee Store
                    </div>
                  )}

                  <button 
                    className="btn btn-primary cart-btn"
                    disabled={!currentVariant || currentVariant.stock === 0}
                    onClick={() => addToCart(product)}
                  >
                    {currentVariant?.stock > 0 ? '➕ Masukkan Keranjang' : '🚫 Stok Habis'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Cart Sidebar */}
      <div className={`cart-sidebar ${cartOpen ? 'open' : ''}`}>
        <div className="cart-sidebar-header flex-between">
          <h3>🛒 Keranjang Belanja</h3>
          <button className="close-cart" onClick={() => setCartOpen(false)}>×</button>
        </div>

        <div className="cart-sidebar-body">
          {cart.length === 0 ? (
            <div className="empty-cart-view flex-center">
              <div>
                <p>Keranjang Anda kosong</p>
                <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => setCartOpen(false)}>
                  Mulai Belanja
                </button>
              </div>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item, i) => (
                <div className="cart-item" key={i}>
                  <div className="cart-item-img" style={{ backgroundImage: `url(${item.imageUrl})` }}></div>
                  <div className="cart-item-details">
                    <h4>{item.productName}</h4>
                    <span className="cart-item-variant">{item.variantName}</span>
                    <span className="cart-item-price">Rp {new Intl.NumberFormat('id-ID').format(item.price)}</span>
                    
                    <div className="cart-item-qty flex-between">
                      <div className="qty-controls">
                        <button onClick={() => updateCartQty(item.cartItemId, -1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.cartItemId, 1)}>+</button>
                      </div>
                      <button className="remove-item" onClick={() => removeFromCart(item.cartItemId)}>
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-sidebar-footer">
            <div className="total-row flex-between">
              <span>Total Subtotal:</span>
              <strong>Rp {new Intl.NumberFormat('id-ID').format(cartTotal)}</strong>
            </div>
            <Link href="/checkout" className="btn btn-primary checkout-btn" onClick={() => setCartOpen(false)}>
              Proceed to Checkout 💳
            </Link>
          </div>
        )}
      </div>
      
      {/* Cart Backdrop */}
      {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)}></div>}

      <style jsx>{`
        .catalog-page {
          padding-top: 40px;
          position: relative;
        }
        .catalog-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 40px;
        }
        .catalog-header h1 {
          font-size: 2.2rem;
          margin-bottom: 4px;
        }
        .catalog-header p {
          color: var(--muted);
        }
        .cart-toggle-float {
          background-color: var(--primary);
          color: white;
          border-radius: 9999px;
          padding: 10px 20px;
          font-weight: 700;
        }
        .cart-toggle-float:hover {
          background-color: var(--primary-hover);
        }

        /* Category Filter tabs */
        .category-tabs {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 30px;
        }
        .category-tab {
          padding: 8px 18px;
          border-radius: 20px;
          border: 1px solid var(--card-border);
          background-color: var(--card-bg);
          color: var(--foreground);
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .category-tab:hover {
          border-color: var(--primary);
        }
        .category-tab.active {
          background-color: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        /* Products list */
        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        .product-card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
        }
        .product-img {
          height: 200px;
          background-size: cover;
          background-position: center;
          position: relative;
          background-color: var(--muted-bg);
        }
        .category-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background-color: var(--primary);
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .product-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .product-body h3 {
          font-size: 1.25rem;
          margin-bottom: 8px;
        }
        .description {
          font-size: 0.9rem;
          color: var(--muted);
          line-height: 1.5;
          margin-bottom: 16px;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .variant-selector-wrapper {
          margin-bottom: 16px;
        }
        .variant-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--muted);
        }
        .variant-select {
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          background-color: var(--background);
          color: var(--foreground);
          font-family: inherit;
          outline: none;
        }
        .price-stock-row {
          margin-bottom: 16px;
        }
        .price-display {
          font-family: 'Outfit', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--primary);
        }
        .stock-display {
          font-size: 0.85rem;
          color: var(--muted);
          background-color: var(--muted-bg);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .stock-display.out-of-stock {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }
        .shopee-badge {
          background-color: rgba(238, 77, 45, 0.08);
          color: #ee4d2d;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cart-btn {
          width: 100%;
        }

        /* Cart Sidebar Drawer */
        .cart-sidebar {
          position: fixed;
          top: 0;
          right: -400px;
          width: 100%;
          max-width: 400px;
          height: 100%;
          background-color: var(--card-bg);
          box-shadow: -4px 0 30px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cart-sidebar.open {
          right: 0;
        }
        .cart-sidebar-header {
          padding: 24px;
          border-bottom: 1px solid var(--card-border);
        }
        .close-cart {
          background: none;
          border: none;
          font-size: 2.2rem;
          line-height: 1;
          cursor: pointer;
          color: var(--muted);
        }
        .close-cart:hover {
          color: var(--foreground);
        }
        .cart-sidebar-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .empty-cart-view {
          height: 100%;
          text-align: center;
          color: var(--muted);
        }
        .cart-items-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .cart-item {
          display: grid;
          grid-template-columns: 70px 1fr;
          gap: 14px;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 16px;
        }
        .cart-item-img {
          width: 70px;
          height: 70px;
          border-radius: 8px;
          background-size: cover;
          background-position: center;
          background-color: var(--muted-bg);
        }
        .cart-item-details h4 {
          font-size: 0.95rem;
          margin-bottom: 2px;
        }
        .cart-item-variant {
          display: block;
          font-size: 0.78rem;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .cart-item-price {
          display: block;
          font-weight: 700;
          color: var(--primary);
          font-size: 0.95rem;
          margin-bottom: 8px;
        }
        .cart-item-qty {
          margin-top: 4px;
        }
        .qty-controls {
          display: flex;
          align-items: center;
          border: 1px solid var(--card-border);
          border-radius: 4px;
          overflow: hidden;
        }
        .qty-controls button {
          background-color: var(--muted-bg);
          border: none;
          width: 28px;
          height: 24px;
          cursor: pointer;
          font-weight: 700;
        }
        .qty-controls span {
          padding: 0 10px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .remove-item {
          background: none;
          border: none;
          color: var(--danger);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .cart-sidebar-footer {
          padding: 24px;
          border-top: 1px solid var(--card-border);
          background-color: var(--muted-bg);
        }
        .total-row {
          margin-bottom: 16px;
          font-size: 1.1rem;
        }
        .checkout-btn {
          width: 100%;
          justify-content: center;
        }

        .cart-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(2px);
          z-index: 999;
        }

        /* Spinner */
        .spinner {
          border: 3px solid rgba(21, 128, 61, 0.1);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border-left-color: var(--primary);
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }
        @media (max-width: 576px) {
          .catalog-header {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .cart-toggle-float {
            align-self: center;
            width: 100%;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
}
