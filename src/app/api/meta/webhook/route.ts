import { NextResponse } from 'next/server';
import { executeSql, queryOne } from '@/lib/db';
import { logMetaSync, isMetaConfigured } from '@/lib/metaCatalog';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// ─── GET: Webhook Verification Handshake ─────────────────────
// Meta sends GET with hub.mode, hub.verify_token, hub.challenge
// We must respond with hub.challenge if verify_token matches.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe') {
      const expectedToken = process.env.META_APP_SECRET || '';

      if (token === expectedToken) {
        console.log('[META WEBHOOK] Verification handshake successful');
        return new Response(challenge || '', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      } else {
        console.warn('[META WEBHOOK] Verification token mismatch');
        return new Response('Forbidden', { status: 403 });
      }
    }

    return NextResponse.json({ status: 'Meta Webhook endpoint is active' });
  } catch (error: any) {
    console.error('[META WEBHOOK] GET error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// ─── POST: Incoming Webhook Notifications ────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[META WEBHOOK] Received:', JSON.stringify(body, null, 2));

    // Standard Meta webhook: { object, entry: [{ changes: [{ field, value }] }] }
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const field = change.field;
        const value = change.value || {};

        if (field === 'orders' || field === 'order_status_change' || value.event === 'order_placed') {
          await handleOrderEvent(value);
        } else {
          console.log(`[META WEBHOOK] Unhandled field: ${field}`);
        }
      }
    }

    // Also handle flat simulated payloads (from our admin panel)
    if (body.event === 'order_placed' && body.items) {
      await handleSimulatedOrder(body);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('[META WEBHOOK] POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── Handle order event ──────────────────────────────────────
async function handleOrderEvent(orderData: any) {
  const orderId = orderData.id || orderData.order_id || 'META-' + Date.now();
  const items = orderData.items || orderData.line_items || [];

  console.log(`[META WEBHOOK] Processing order ${orderId} with ${items.length} items`);

  for (const item of items) {
    const retailerId = item.retailer_id || '';
    const qty = item.quantity || 1;
    if (retailerId) await deductStockByRetailerId(retailerId, qty, orderId);
  }
}

// ─── Handle simulated order ──────────────────────────────────
async function handleSimulatedOrder(body: any) {
  const orderId = body.order_id || 'META-SIM-' + Date.now();
  const items = body.items || [];

  console.log(`[META WEBHOOK] Simulated order ${orderId}`);

  for (const item of items) {
    const retailerId = item.retailer_id || '';
    const qty = item.quantity || 1;
    if (retailerId) await deductStockByRetailerId(retailerId, qty, orderId);
  }
}

// ─── Stock deduction by retailer_id ──────────────────────────
async function deductStockByRetailerId(retailerId: string, qty: number, orderId: string) {
  try {
    // Pattern: "prod_123" → products.id = 123
    if (retailerId.startsWith('prod_')) {
      const productId = parseInt(retailerId.replace('prod_', ''));
      if (isNaN(productId)) return;

      if (isSupabaseConfigured()) {
        const { data: product } = await supabase
          .from('products').select('*').eq('id', productId).maybeSingle();
        if (product) {
          const newStock = Math.max(0, (product.stock || 0) - qty);
          await supabase.from('products').update({ stock: newStock }).eq('id', productId);
          await logMetaSync(productId, 'WEBHOOK_ORDER', 'SUCCESS',
            `Order ${orderId}: stok berkurang ${qty} (${product.stock} → ${newStock})`);
        }
      } else {
        const product = queryOne('SELECT * FROM products WHERE id = ?', [productId]);
        if (product) {
          executeSql('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [qty, productId]);
          await logMetaSync(productId, 'WEBHOOK_ORDER', 'SUCCESS',
            `Order ${orderId}: stok berkurang ${qty}`);
        }
      }
    } else {
      // Try matching by SKU in product_variants
      if (isSupabaseConfigured()) {
        const { data: variant } = await supabase
          .from('product_variants').select('*').eq('sku', retailerId).maybeSingle();
        if (variant) {
          const newStock = Math.max(0, (variant.stock || 0) - qty);
          await supabase.from('product_variants').update({ stock: newStock }).eq('id', variant.id);

          const { data: siblings } = await supabase
            .from('product_variants').select('stock').eq('product_id', variant.product_id);
          const totalStock = siblings?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
          await supabase.from('products').update({ stock: totalStock }).eq('id', variant.product_id);

          await logMetaSync(variant.product_id, 'WEBHOOK_ORDER', 'SUCCESS',
            `Order ${orderId}: varian ${retailerId} berkurang ${qty}`);
        }
      } else {
        const variant = queryOne('SELECT * FROM product_variants WHERE sku = ?', [retailerId]);
        if (variant) {
          executeSql('UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE id = ?', [qty, variant.id]);
          const aggStock = queryOne('SELECT SUM(stock) as total FROM product_variants WHERE product_id = ?', [variant.product_id]);
          executeSql('UPDATE products SET stock = ? WHERE id = ?', [aggStock?.total || 0, variant.product_id]);
          await logMetaSync(variant.product_id, 'WEBHOOK_ORDER', 'SUCCESS',
            `Order ${orderId}: varian ${retailerId} berkurang ${qty}`);
        }
      }
    }
  } catch (e: any) {
    console.error(`[META WEBHOOK] Deduct stock error for ${retailerId}:`, e);
    await logMetaSync(0, 'WEBHOOK_ORDER', 'FAILED', `${retailerId}: ${e.message}`);
  }
}
