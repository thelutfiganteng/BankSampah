/**
 * Meta Catalog API Service
 * ────────────────────────────────────────────────────────────────
 * All credentials are read from environment variables:
 *   META_CATALOG_ID, META_SYSTEM_USER_TOKEN, META_APP_ID, META_APP_SECRET
 *
 * API Version: v25.0
 * Base URL:    https://graph.facebook.com/v25.0
 *
 * Validated endpoints:
 *   CREATE  → POST   /{CATALOG_ID}/products
 *   LIST    → GET    /{CATALOG_ID}/products
 *   GET     → GET    /{PRODUCT_ID}
 *   UPDATE  → POST   /{PRODUCT_ID}
 *   DELETE  → DELETE /{PRODUCT_ID}   (NOT /{CATALOG_ID}/products!)
 */

import { executeSql, queryOne, queryAll } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// ─── Constants ───────────────────────────────────────────────
const GRAPH_API_VERSION = 'v25.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Config from Environment ─────────────────────────────────

function getConfig() {
  const catalogId = process.env.META_CATALOG_ID;
  const accessToken = process.env.META_SYSTEM_USER_TOKEN;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!catalogId || !accessToken) {
    throw new Error(
      'Meta Catalog API is not configured. Set META_CATALOG_ID and META_SYSTEM_USER_TOKEN in .env.local'
    );
  }

  return { catalogId, accessToken, appId: appId || '', appSecret: appSecret || '' };
}

/** Check if Meta Catalog integration is configured */
export function isMetaConfigured(): boolean {
  return !!(process.env.META_CATALOG_ID && process.env.META_SYSTEM_USER_TOKEN);
}

// ─── Types ───────────────────────────────────────────────────

export interface MetaProductData {
  name: string;
  retailer_id: string;      // unique ID in our system (e.g. "prod_42")
  price: number;             // in full currency units (e.g. 35000 for IDR 35.000)
  currency?: string;         // defaults to "IDR"
  availability?: string;     // "in stock" | "out of stock"
  condition?: string;        // "new" | "used" | "refurbished"
  image_url: string;         // publicly accessible URL
  url: string;               // link to product page on our website
  description?: string;
  brand?: string;
}

export interface MetaApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ─── Required Field Validation ───────────────────────────────

const REQUIRED_CREATE_FIELDS = ['name', 'retailer_id', 'price', 'image_url', 'url'] as const;

function validateCreateFields(data: MetaProductData): string | null {
  for (const field of REQUIRED_CREATE_FIELDS) {
    if (!data[field] && data[field] !== 0) {
      return `Field wajib "${field}" tidak boleh kosong.`;
    }
  }
  if (typeof data.price !== 'number' || data.price < 0) {
    return `Field "price" harus berupa angka positif.`;
  }
  return null;
}

// ─── Low-Level Graph API Request ─────────────────────────────

async function graphRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<any> {
  const { accessToken } = getConfig();
  const url = `${GRAPH_BASE_URL}/${endpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };

  const init: RequestInit = { method, headers };

  if (body && method === 'POST') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  console.log(`[META CATALOG] ${method} ${url}`);

  const response = await fetch(url, init);
  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message
      || data.error?.error_user_msg
      || `HTTP ${response.status}: ${response.statusText}`;
    console.error(`[META CATALOG] API Error:`, data.error || data);
    throw new Error(errorMsg);
  }

  return data;
}

// ─── Sync Log Helpers ────────────────────────────────────────

export async function logMetaSync(
  productId: number,
  action: string,
  status: 'SUCCESS' | 'FAILED' | 'PENDING',
  message?: string
) {
  try {
    if (isSupabaseConfigured()) {
      await supabase.from('meta_sync_logs').insert([{
        product_id: productId,
        variant_id: null,
        action,
        status,
        message: message || null,
      }]);
      return;
    }

    executeSql(
      `INSERT INTO meta_sync_logs (product_id, variant_id, action, status, message)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, null, action, status, message || null]
    );
  } catch (e) {
    console.error('[META CATALOG] Failed to write sync log:', e);
  }
}

// ─── Public API Functions ────────────────────────────────────

/**
 * 1. CREATE PRODUCT
 * POST /{CATALOG_ID}/products
 */
export async function createProduct(data: MetaProductData): Promise<MetaApiResponse> {
  // Validate required fields
  const validationError = validateCreateFields(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const { catalogId } = getConfig();

    const body = {
      name: data.name,
      retailer_id: data.retailer_id,
      price: data.price,
      currency: data.currency || 'IDR',
      availability: data.availability || 'in stock',
      condition: data.condition || 'new',
      image_url: data.image_url,
      url: data.url,
      description: data.description || '',
      brand: data.brand || 'KGS Craft',
    };

    const result = await graphRequest(`${catalogId}/products`, 'POST', body);

    console.log(`[META CATALOG] Product created: ${data.name} → Meta ID: ${result.id}`);
    return { success: true, data: result };
  } catch (e: any) {
    console.error(`[META CATALOG] Create failed for "${data.name}":`, e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 2. UPDATE PRODUCT / STOCK
 * POST /{PRODUCT_ID}
 * Only send the fields that need to change.
 */
export async function updateProduct(
  metaProductId: string,
  updateData: Partial<MetaProductData>
): Promise<MetaApiResponse> {
  if (!metaProductId) {
    return { success: false, error: 'Meta Product ID is required for update.' };
  }

  try {
    const result = await graphRequest(metaProductId, 'POST', updateData);

    console.log(`[META CATALOG] Product updated: ${metaProductId}`);
    return { success: true, data: result };
  } catch (e: any) {
    console.error(`[META CATALOG] Update failed for ${metaProductId}:`, e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 3. DELETE PRODUCT
 * DELETE /{PRODUCT_ID}
 * IMPORTANT: target the specific Product ID, NOT /{CATALOG_ID}/products
 */
export async function deleteProduct(metaProductId: string): Promise<MetaApiResponse> {
  if (!metaProductId) {
    return { success: false, error: 'Meta Product ID is required for delete.' };
  }

  try {
    const result = await graphRequest(metaProductId, 'DELETE');

    console.log(`[META CATALOG] Product deleted: ${metaProductId}`);
    return { success: true, data: result };
  } catch (e: any) {
    console.error(`[META CATALOG] Delete failed for ${metaProductId}:`, e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 4. LIST ALL PRODUCTS in Catalog
 * GET /{CATALOG_ID}/products
 */
export async function listProducts(): Promise<MetaApiResponse> {
  try {
    const { catalogId } = getConfig();
    const result = await graphRequest(
      `${catalogId}/products?fields=id,name,retailer_id,price,currency,availability,image_url,url`
    );

    return { success: true, data: result.data || [] };
  } catch (e: any) {
    console.error('[META CATALOG] List products failed:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 5. GET SINGLE PRODUCT detail
 * GET /{PRODUCT_ID}
 */
export async function getProduct(metaProductId: string): Promise<MetaApiResponse> {
  if (!metaProductId) {
    return { success: false, error: 'Meta Product ID is required.' };
  }

  try {
    const result = await graphRequest(
      `${metaProductId}?fields=id,name,retailer_id,price,currency,availability,image_url,url,description`
    );

    return { success: true, data: result };
  } catch (e: any) {
    console.error(`[META CATALOG] Get product failed for ${metaProductId}:`, e.message);
    return { success: false, error: e.message };
  }
}

// ─── Integration Helpers (Website ↔ Meta) ────────────────────

/**
 * Sync a local product to Meta Catalog.
 * - If product has no meta_product_id → CREATE
 * - If product has meta_product_id   → UPDATE
 * Non-blocking: if Meta API fails, sets status to 'pending_sync' and logs error.
 */
export async function syncLocalProductToMeta(localProductId: number): Promise<MetaApiResponse> {
  if (!isMetaConfigured()) {
    return { success: false, error: 'Meta Catalog not configured' };
  }

  try {
    // Fetch local product
    let product: any = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('products').select('*').eq('id', localProductId).maybeSingle();
      product = data;
    } else {
      product = queryOne('SELECT * FROM products WHERE id = ?', [localProductId]);
    }

    if (!product) {
      return { success: false, error: 'Produk tidak ditemukan di database lokal.' };
    }

    const retailerId = `prod_${product.id}`;
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://banksampah-kgs.com'}/katalog`;
    const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600';

    const metaProductId = product.meta_product_id || null;

    if (metaProductId) {
      // ─── UPDATE existing product on Meta ─────────
      const result = await updateProduct(metaProductId, {
        name: product.name,
        price: product.price,
        currency: 'IDR',
        availability: product.stock > 0 ? 'in stock' : 'out of stock',
        image_url: imageUrl,
        url: productUrl,
        description: product.description || `Produk daur ulang dari Bank Sampah KGS.`,
      });

      if (result.success) {
        await setMetaSyncStatus(localProductId, 'synced');
        await logMetaSync(localProductId, 'UPDATE', 'SUCCESS',
          `Produk "${product.name}" berhasil diperbarui di Meta Catalog.`);
      } else {
        await setMetaSyncStatus(localProductId, 'pending_sync');
        await logMetaSync(localProductId, 'UPDATE', 'FAILED', result.error || 'Unknown error');
      }
      return result;

    } else {
      // ─── CREATE new product on Meta ──────────────
      const result = await createProduct({
        name: product.name,
        retailer_id: retailerId,
        price: product.price,
        currency: 'IDR',
        availability: product.stock > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        image_url: imageUrl,
        url: productUrl,
        description: product.description || `Produk daur ulang dari Bank Sampah KGS.`,
        brand: 'KGS Craft',
      });

      if (result.success && result.data?.id) {
        // Store the Meta product ID returned by the API
        await saveMetaProductId(localProductId, result.data.id);
        await setMetaSyncStatus(localProductId, 'synced');
        await logMetaSync(localProductId, 'CREATE', 'SUCCESS',
          `Produk "${product.name}" berhasil dipublikasi ke Meta Catalog. Meta ID: ${result.data.id}`);
      } else {
        await setMetaSyncStatus(localProductId, 'pending_sync');
        await logMetaSync(localProductId, 'CREATE', 'FAILED', result.error || 'Unknown error');
      }
      return result;
    }
  } catch (e: any) {
    console.error(`[META CATALOG] syncLocalProductToMeta error for #${localProductId}:`, e);
    await setMetaSyncStatus(localProductId, 'pending_sync');
    await logMetaSync(localProductId, 'SYNC', 'FAILED', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Delete a local product from Meta Catalog.
 */
export async function deleteLocalProductFromMeta(localProductId: number): Promise<MetaApiResponse> {
  if (!isMetaConfigured()) {
    return { success: false, error: 'Meta Catalog not configured' };
  }

  try {
    let metaProductId: string | null = null;

    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('products').select('meta_product_id').eq('id', localProductId).maybeSingle();
      metaProductId = data?.meta_product_id || null;
    } else {
      try {
        const row = queryOne('SELECT meta_product_id FROM products WHERE id = ?', [localProductId]);
        metaProductId = row?.meta_product_id || null;
      } catch {
        // Column may not exist yet
      }
    }

    if (!metaProductId) {
      // Product was never synced to Meta — nothing to delete
      return { success: true, data: { message: 'Product was not on Meta Catalog.' } };
    }

    const result = await deleteProduct(metaProductId);

    if (result.success) {
      await logMetaSync(localProductId, 'DELETE', 'SUCCESS',
        `Produk (Meta ID: ${metaProductId}) berhasil dihapus dari Meta Catalog.`);
    } else {
      await logMetaSync(localProductId, 'DELETE', 'FAILED', result.error || 'Unknown error');
    }

    return result;
  } catch (e: any) {
    console.error(`[META CATALOG] deleteLocalProductFromMeta error for #${localProductId}:`, e);
    await logMetaSync(localProductId, 'DELETE', 'FAILED', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Sync stock/availability to Meta for a specific product.
 */
export async function syncStockToMeta(localProductId: number): Promise<MetaApiResponse> {
  if (!isMetaConfigured()) {
    return { success: false, error: 'Meta Catalog not configured' };
  }

  try {
    let product: any = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('products').select('id, stock, name, meta_product_id').eq('id', localProductId).maybeSingle();
      product = data;
    } else {
      try {
        product = queryOne('SELECT id, stock, name, meta_product_id FROM products WHERE id = ?', [localProductId]);
      } catch {
        product = queryOne('SELECT id, stock, name FROM products WHERE id = ?', [localProductId]);
      }
    }

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    const metaProductId = product.meta_product_id;
    if (!metaProductId) {
      // Never synced — do a full sync instead
      return syncLocalProductToMeta(localProductId);
    }

    const result = await updateProduct(metaProductId, {
      availability: product.stock > 0 ? 'in stock' : 'out of stock',
      price: product.price,
    });

    if (result.success) {
      await logMetaSync(localProductId, 'STOCK_SYNC', 'SUCCESS',
        `Stok "${product.name}" → ${product.stock > 0 ? 'in stock' : 'out of stock'}`);
    } else {
      await logMetaSync(localProductId, 'STOCK_SYNC', 'FAILED', result.error || 'Unknown');
    }

    return result;
  } catch (e: any) {
    console.error(`[META CATALOG] syncStockToMeta error for #${localProductId}:`, e);
    await logMetaSync(localProductId, 'STOCK_SYNC', 'FAILED', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Retry all products with meta_sync_status = 'pending_sync'.
 */
export async function retryPendingSyncs(): Promise<{ retried: number; succeeded: number; failed: number }> {
  let pendingProducts: any[] = [];

  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('meta_sync_status', 'pending_sync');
    pendingProducts = data || [];
  } else {
    try {
      pendingProducts = queryAll(
        "SELECT id, name FROM products WHERE meta_sync_status = 'pending_sync'"
      );
    } catch {
      // Column may not exist
      return { retried: 0, succeeded: 0, failed: 0 };
    }
  }

  let succeeded = 0;
  let failed = 0;

  for (const product of pendingProducts) {
    console.log(`[META CATALOG] Retrying sync for product #${product.id}: ${product.name}`);
    const result = await syncLocalProductToMeta(product.id);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  console.log(`[META CATALOG] Retry complete: ${pendingProducts.length} retried, ${succeeded} succeeded, ${failed} failed`);

  return { retried: pendingProducts.length, succeeded, failed };
}

/**
 * Health check — test connection by listing catalog products.
 */
export async function testConnection(): Promise<MetaApiResponse> {
  try {
    const { catalogId, accessToken } = getConfig();

    // Fetch catalog metadata
    const catalogInfo = await graphRequest(`${catalogId}?fields=name,product_count`);

    return {
      success: true,
      data: {
        catalog_id: catalogId,
        catalog_name: catalogInfo.name,
        product_count: catalogInfo.product_count || 0,
        token_preview: `${accessToken.slice(0, 12)}...${accessToken.slice(-6)}`,
        api_version: GRAPH_API_VERSION,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Database Helpers (meta_product_id & sync status) ────────

async function saveMetaProductId(localProductId: number, metaProductId: string) {
  try {
    if (isSupabaseConfigured()) {
      await supabase.from('products').update({ meta_product_id: metaProductId }).eq('id', localProductId);
    } else {
      executeSql('UPDATE products SET meta_product_id = ? WHERE id = ?', [metaProductId, localProductId]);
    }
  } catch (e) {
    console.error(`[META CATALOG] Failed to save meta_product_id for #${localProductId}:`, e);
  }
}

async function setMetaSyncStatus(localProductId: number, status: 'synced' | 'pending_sync' | 'not_synced') {
  try {
    if (isSupabaseConfigured()) {
      await supabase.from('products').update({ meta_sync_status: status }).eq('id', localProductId);
    } else {
      executeSql('UPDATE products SET meta_sync_status = ? WHERE id = ?', [status, localProductId]);
    }
  } catch (e) {
    // Column may not exist yet — non-fatal
    console.warn(`[META CATALOG] Could not set sync status for #${localProductId}:`, e);
  }
}
