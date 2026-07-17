import crypto from 'crypto';
import { queryOne, executeSql, queryAll } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Shopee v2 API Endpoint URLs
const SANDBOX_BASE_URL = 'https://partner.test-stable.shopeemobile.com';
const PRODUCTION_BASE_URL = 'https://partner.shopeemobile.com';

interface ShopeeKeys {
  partnerId: string;
  partnerKey: string;
  accessToken: string;
  refreshToken: string;
  shopId: string;
  isSandbox: boolean;
  isSimulated: boolean;
  isActive: boolean;
}

// Retrieve Shopee Settings from database
export async function getShopeeSettings(): Promise<ShopeeKeys | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('shopee_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      partnerId: data.partner_id || '',
      partnerKey: data.partner_key || '',
      accessToken: data.access_token || '',
      refreshToken: data.refresh_token || '',
      shopId: data.shop_id || '',
      isSandbox: data.is_sandbox === 1,
      isSimulated: data.is_simulated === 1,
      isActive: data.is_active === 1,
    };
  }

  const row = queryOne('SELECT * FROM shopee_settings LIMIT 1');
  if (!row) return null;
  return {
    partnerId: row.partner_id || '',
    partnerKey: row.partner_key || '',
    accessToken: row.access_token || '',
    refreshToken: row.refresh_token || '',
    shopId: row.shop_id || '',
    isSandbox: row.is_sandbox === 1,
    isSimulated: row.is_simulated === 1,
    isActive: row.is_active === 1,
  };
}

// Generate Signature for Shopee API v2
export function generateSignature(
  partnerId: string,
  partnerKey: string,
  path: string,
  timestamp: number,
  accessToken?: string,
  shopId?: string
): string {
  let baseStr = '';
  if (accessToken && shopId) {
    baseStr = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  } else {
    baseStr = `${partnerId}${path}${timestamp}`;
  }
  
  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseStr)
    .digest('hex');
}

// Write a sync log entry
export async function logSync(productId: number, variantId: number | null, action: string, status: 'SUCCESS' | 'FAILED', message: string) {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('shopee_sync_logs')
        .insert([{
          product_id: productId,
          variant_id: variantId,
          action,
          status,
          message
        }]);
    } catch (e) {
      console.error('Failed to log sync to Supabase:', e);
    }
    return;
  }

  executeSql(
    'INSERT INTO shopee_sync_logs (product_id, variant_id, action, status, message) VALUES (?, ?, ?, ?, ?)',
    [productId, variantId, action, status, message]
  );
}

// Helper to make signed requests to Shopee
async function shopeeRequest(
  path: string,
  method: 'GET' | 'POST',
  body: any = null,
  requireAuth = true
): Promise<any> {
  const settings = await getShopeeSettings();
  if (!settings || !settings.isActive) {
    throw new Error('Shopee integration is not active or configured');
  }

  const host = settings.isSandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
  const timestamp = Math.floor(Date.now() / 1000);
  const partnerId = settings.partnerId;
  const partnerKey = settings.partnerKey;

  let url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}`;

  if (requireAuth) {
    // Auto-refresh token if it's expired or about to expire (within 5 minutes)
    await checkAndRefreshToken();
    
    // Retrieve settings again to get the fresh token
    const freshSettings = await getShopeeSettings();
    if (!freshSettings) throw new Error('Settings lost during token refresh');
    
    const sign = generateSignature(partnerId, partnerKey, path, timestamp, freshSettings.accessToken, freshSettings.shopId);
    url += `&access_token=${freshSettings.accessToken}&shop_id=${freshSettings.shopId}&sign=${sign}`;
  } else {
    const sign = generateSignature(partnerId, partnerKey, path, timestamp);
    url += `&sign=${sign}`;
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Shopee API Error: ${data.message || data.error}`);
  }

  return data;
}

// Check and refresh access token if close to expiry
export async function checkAndRefreshToken() {
  let row: any = null;
  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('shopee_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    row = data;
  } else {
    row = queryOne('SELECT * FROM shopee_settings LIMIT 1');
  }

  if (!row || !row.refresh_token) return;

  const now = Math.floor(Date.now() / 1000);
  if (row.token_expires_at < now + 300) {
    console.log('Shopee token is expiring soon, refreshing...');
    if (row.is_simulated === 1) {
      const mockAccessToken = 'MOCK_ACCESS_TOKEN_' + Math.floor(Math.random() * 100000);
      const mockRefreshToken = 'MOCK_REFRESH_TOKEN_' + Math.floor(Math.random() * 100000);
      const mockExpiresAt = now + 14400; // 4 hours
      
      if (isSupabaseConfigured()) {
        await supabase
          .from('shopee_settings')
          .update({
            access_token: mockAccessToken,
            refresh_token: mockRefreshToken,
            token_expires_at: mockExpiresAt
          })
          .eq('id', row.id);
      } else {
        executeSql(
          'UPDATE shopee_settings SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?',
          [mockAccessToken, mockRefreshToken, mockExpiresAt, row.id]
        );
      }
      console.log('Simulated Shopee token refresh successful');
      return;
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/public/refresh_token';
      const sign = generateSignature(row.partner_id, row.partner_key, path, timestamp);
      
      const url = `${row.is_sandbox === 1 ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL}${path}?partner_id=${row.partner_id}&timestamp=${timestamp}&sign=${sign}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: row.refresh_token,
          partner_id: parseInt(row.partner_id),
          shop_id: parseInt(row.shop_id),
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      const newAccessToken = data.response.access_token;
      const newRefreshToken = data.response.refresh_token;
      const expiresAt = now + data.response.expire_in;

      if (isSupabaseConfigured()) {
        await supabase
          .from('shopee_settings')
          .update({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token_expires_at: expiresAt
          })
          .eq('id', row.id);
      } else {
        executeSql(
          'UPDATE shopee_settings SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?',
          [newAccessToken, newRefreshToken, expiresAt, row.id]
        );
      }
      console.log('Real Shopee token refresh successful');
    } catch (e: any) {
      console.error('Failed to auto-refresh Shopee token:', e);
      await logSync(0, null, 'REFRESH_TOKEN', 'FAILED', `Auto-refresh failed: ${e.message}`);
    }
  }
}

// 1. Sync Product Listing (Add / Update / Delete)
export async function syncProductToShopee(productId: number): Promise<boolean> {
  const settings = await getShopeeSettings();
  if (!settings || !settings.isActive) return false;

  let product: any = null;
  let variants: any[] = [];

  if (isSupabaseConfigured()) {
    const { data: p } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
    const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', productId);
    product = p;
    variants = v || [];
  } else {
    product = queryOne('SELECT * FROM products WHERE id = ?', [productId]);
    variants = queryAll('SELECT * FROM product_variants WHERE product_id = ?', [productId]);
  }

  if (!product) return false;

  if (settings.isSimulated) {
    try {
      console.log(`[SIMULATOR] Syncing product: ${product.name} (ID: ${productId}) to Shopee...`);
      
      let shopeeItemId = product.shopee_item_id;
      if (!shopeeItemId) {
        shopeeItemId = 'shopee-' + Math.floor(100000000 + Math.random() * 900000000);
        if (isSupabaseConfigured()) {
          await supabase.from('products').update({ shopee_item_id: shopeeItemId }).eq('id', productId);
        } else {
          executeSql('UPDATE products SET shopee_item_id = ? WHERE id = ?', [shopeeItemId, productId]);
        }
      }

      for (const variant of variants) {
        if (!variant.shopee_model_id) {
          const shopeeModelId = 'model-' + Math.floor(1000000 + Math.random() * 9000000);
          if (isSupabaseConfigured()) {
            await supabase.from('product_variants').update({ shopee_model_id: shopeeModelId }).eq('id', variant.id);
          } else {
            executeSql('UPDATE product_variants SET shopee_model_id = ? WHERE id = ?', [shopeeModelId, variant.id]);
          }
        }
      }

      await logSync(
        productId, 
        null, 
        product.shopee_item_id ? 'UPDATE' : 'CREATE', 
        'SUCCESS', 
        `[SIMULATOR] Berhasil mensinkronisasi produk '${product.name}' dan ${variants.length} varian ke Shopee.`
      );
      return true;
    } catch (e: any) {
      await logSync(productId, null, 'CREATE', 'FAILED', `[SIMULATOR] Error: ${e.message}`);
      return false;
    }
  } else {
    try {
      if (!product.shopee_item_id) {
        console.log(`[REAL API] Adding product: ${product.name} to Shopee...`);
        
        const payload: any = {
          original_price: product.price,
          description: product.description || product.name,
          item_name: product.name,
          normal_stock: product.stock,
          category_id: 100019,
          brand: {
            brand_id: 0,
            original_brand_name: 'NoBrand',
          },
          images: {
            image_id_list: [],
          },
        };

        if (variants.length > 0) {
          payload.tier_variation = [
            {
              name: 'Varian',
              option_list: variants.map(v => ({ option: v.name })),
            }
          ];
          payload.model = variants.map(v => ({
            tier_index: [variants.indexOf(v)],
            normal_stock: v.stock,
            original_price: v.price,
            model_sku: v.sku || `SKU-${v.id}`,
          }));
        }

        const res = await shopeeRequest('/api/v2/product/add_item', 'POST', payload);
        const shopeeItemId = res.response.item_id.toString();
        
        if (isSupabaseConfigured()) {
          await supabase.from('products').update({ shopee_item_id: shopeeItemId }).eq('id', productId);
        } else {
          executeSql('UPDATE products SET shopee_item_id = ? WHERE id = ?', [shopeeItemId, productId]);
        }

        if (res.response.model && res.response.model.length > 0) {
          for (let i = 0; i < variants.length; i++) {
            const shopeeModelId = res.response.model[i].model_id.toString();
            if (isSupabaseConfigured()) {
              await supabase.from('product_variants').update({ shopee_model_id: shopeeModelId }).eq('id', variants[i].id);
            } else {
              executeSql('UPDATE product_variants SET shopee_model_id = ? WHERE id = ?', [shopeeModelId, variants[i].id]);
            }
          }
        }

        await logSync(productId, null, 'CREATE', 'SUCCESS', `Berhasil mempublikasi ke Shopee. Item ID: ${shopeeItemId}`);
      } else {
        console.log(`[REAL API] Updating product: ${product.name} (Shopee Item: ${product.shopee_item_id})`);
        
        await shopeeRequest('/api/v2/product/update_item', 'POST', {
          item_id: parseInt(product.shopee_item_id),
          item_name: product.name,
          description: product.description || product.name,
        });

        for (const variant of variants) {
          if (variant.shopee_model_id) {
            await shopeeRequest('/api/v2/product/update_price', 'POST', {
              item_id: parseInt(product.shopee_item_id),
              price_list: [
                {
                  model_id: parseInt(variant.shopee_model_id),
                  original_price: variant.price,
                }
              ]
            });
          }
        }

        await logSync(productId, null, 'UPDATE', 'SUCCESS', `Berhasil memperbarui info produk di Shopee.`);
      }
      return true;
    } catch (e: any) {
      console.error('Shopee product sync error:', e);
      await logSync(productId, null, product.shopee_item_id ? 'UPDATE' : 'CREATE', 'FAILED', e.message || 'Unknown network error');
      return false;
    }
  }
}

// 2. Real-time Stock Synchronization (Website -> Shopee)
export async function syncStockToShopee(productId: number, variantId: number | null): Promise<boolean> {
  const settings = await getShopeeSettings();
  if (!settings || !settings.isActive) return false;

  let product: any = null;
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
    product = data;
  } else {
    product = queryOne('SELECT * FROM products WHERE id = ?', [productId]);
  }

  if (!product || !product.shopee_item_id) return false;

  if (settings.isSimulated) {
    try {
      let syncMsg = '';
      if (variantId) {
        let variant: any = null;
        if (isSupabaseConfigured()) {
          const { data } = await supabase.from('product_variants').select('*').eq('id', variantId).maybeSingle();
          variant = data;
        } else {
          variant = queryOne('SELECT * FROM product_variants WHERE id = ?', [variantId]);
        }
        syncMsg = `[SIMULATOR] Sync stok varian '${variant?.name}' ke ${variant?.stock}`;
      } else {
        syncMsg = `[SIMULATOR] Sync stok produk ke ${product.stock}`;
      }

      console.log(syncMsg);
      await logSync(productId, variantId, 'STOCK_SYNC', 'SUCCESS', syncMsg);
      return true;
    } catch (e: any) {
      await logSync(productId, variantId, 'STOCK_SYNC', 'FAILED', `[SIMULATOR] Error: ${e.message}`);
      return false;
    }
  } else {
    try {
      console.log(`[REAL API] Syncing stock for product ID: ${productId}, variant ID: ${variantId}`);
      
      const payload: any = {
        item_id: parseInt(product.shopee_item_id),
      };

      if (variantId) {
        let variant: any = null;
        if (isSupabaseConfigured()) {
          const { data } = await supabase.from('product_variants').select('*').eq('id', variantId).maybeSingle();
          variant = data;
        } else {
          variant = queryOne('SELECT * FROM product_variants WHERE id = ?', [variantId]);
        }
        if (!variant || !variant.shopee_model_id) return false;
        
        payload.stock_list = [
          {
            model_id: parseInt(variant.shopee_model_id),
            normal_stock: variant.stock,
          }
        ];
      } else {
        payload.stock_list = [
          {
            normal_stock: product.stock,
          }
        ];
      }

      await shopeeRequest('/api/v2/product/update_stock', 'POST', payload);
      await logSync(productId, variantId, 'STOCK_SYNC', 'SUCCESS', `Stok Shopee sinkron. Stok saat ini: ${variantId ? 'Varian' : 'Utama'}`);
      return true;
    } catch (e: any) {
      console.error('Shopee stock sync error:', e);
      await logSync(productId, variantId, 'STOCK_SYNC', 'FAILED', e.message || 'Stock sync network failure');
      return false;
    }
  }
}

// 3. Delete Product from Shopee
export async function deleteProductFromShopee(productId: number, shopeeItemId: string): Promise<boolean> {
  const settings = await getShopeeSettings();
  if (!settings || !settings.isActive) return false;

  if (settings.isSimulated) {
    console.log(`[SIMULATOR] Deleting Shopee listing ID: ${shopeeItemId}`);
    await logSync(productId, null, 'DELETE', 'SUCCESS', `[SIMULATOR] Berhasil menghapus listing Shopee.`);
    return true;
  } else {
    try {
      console.log(`[REAL API] Deleting Shopee listing ID: ${shopeeItemId}`);
      await shopeeRequest('/api/v2/product/delete_item', 'POST', {
        item_id: parseInt(shopeeItemId),
      });
      await logSync(productId, null, 'DELETE', 'SUCCESS', `Berhasil menghapus listing Shopee.`);
      return true;
    } catch (e: any) {
      console.error('Shopee delete error:', e);
      await logSync(productId, null, 'DELETE', 'FAILED', e.message || 'Delete operation failed');
      return false;
    }
  }
}
