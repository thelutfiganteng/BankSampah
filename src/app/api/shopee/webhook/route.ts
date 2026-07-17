import { NextResponse } from 'next/server';
import { executeSql, queryOne } from '@/lib/db';
import { logSync } from '@/lib/shopee';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received Shopee Webhook notification:', JSON.stringify(body, null, 2));

    // Webhook event structure for order placement
    const isOrderPush = body.code === 3 || body.event === 'order_placed' || body.event_type === 'ORDER_STATUS_CHANGED';
    
    if (isOrderPush) {
      const orderData = body.data || body;
      const orderSn = orderData.ordersn || 'MOCK-ORDER-SN-' + Math.floor(Math.random() * 1000000);
      const itemList = orderData.item_list || [];

      if (isSupabaseConfigured()) {
        for (const item of itemList) {
          const shopeeItemId = (item.item_id || '').toString();
          const shopeeModelId = item.model_id && item.model_id.toString() !== '0' ? item.model_id.toString() : null;
          const qty = item.model_quantity_purchased || item.quantity || 1;

          console.log(`Processing Webhook Item (Supabase): ShopeeItem ${shopeeItemId}, Model ${shopeeModelId}, Qty ${qty}`);

          if (shopeeModelId) {
            const { data: variant, error: varError } = await supabase
              .from('product_variants')
              .select('*')
              .eq('shopee_model_id', shopeeModelId)
              .maybeSingle();
            if (varError) throw varError;

            if (variant) {
              const newStock = Math.max(0, (variant.stock || 0) - qty);
              await supabase
                .from('product_variants')
                .update({ stock: newStock })
                .eq('id', variant.id);

              const { data: siblingVariants } = await supabase
                .from('product_variants')
                .select('stock')
                .eq('product_id', variant.product_id);
              
              const totalStock = siblingVariants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
              await supabase
                .from('products')
                .update({ stock: totalStock })
                .eq('id', variant.product_id);

              await logSync(
                variant.product_id,
                variant.id,
                'STOCK_SYNC',
                'SUCCESS',
                `Webhook: Stok berkurang ${qty} pcs karena pesanan Shopee ${orderSn}`
              );
            }
          } else {
            const { data: product, error: prodError } = await supabase
              .from('products')
              .select('*')
              .eq('shopee_item_id', shopeeItemId)
              .maybeSingle();
            if (prodError) throw prodError;

            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - qty);
              await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', product.id);

              const { data: standardVar } = await supabase
                .from('product_variants')
                .select('*')
                .eq('product_id', product.id)
                .eq('name', 'Standar')
                .maybeSingle();

              if (standardVar) {
                await supabase
                  .from('product_variants')
                  .update({ stock: Math.max(0, (standardVar.stock || 0) - qty) })
                  .eq('id', standardVar.id);
              }

              await logSync(
                product.id,
                null,
                'STOCK_SYNC',
                'SUCCESS',
                `Webhook: Stok berkurang ${qty} pcs karena pesanan Shopee ${orderSn}`
              );
            }
          }
        }
        return NextResponse.json({ success: true, message: `Processed order ${orderSn} successfully` });
      }

      // SQLite Fallback
      for (const item of itemList) {
        const shopeeItemId = (item.item_id || '').toString();
        const shopeeModelId = item.model_id && item.model_id.toString() !== '0' ? item.model_id.toString() : null;
        const qty = item.model_quantity_purchased || item.quantity || 1;

        console.log(`Processing Webhook Item: ShopeeItem ${shopeeItemId}, Model ${shopeeModelId}, Qty ${qty}`);

        if (shopeeModelId) {
          const variant = queryOne('SELECT * FROM product_variants WHERE shopee_model_id = ?', [shopeeModelId]);
          if (variant) {
            executeSql('UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE id = ?', [qty, variant.id]);
            const aggStock = queryOne('SELECT SUM(stock) as total FROM product_variants WHERE product_id = ?', [variant.product_id]);
            executeSql('UPDATE products SET stock = ? WHERE id = ?', [aggStock.total || 0, variant.product_id]);
            
            await logSync(
              variant.product_id, 
              variant.id, 
              'STOCK_SYNC', 
              'SUCCESS', 
              `Webhook: Stok berkurang ${qty} pcs karena pesanan Shopee ${orderSn}`
            );
          }
        } else {
          const product = queryOne('SELECT * FROM products WHERE shopee_item_id = ?', [shopeeItemId]);
          if (product) {
            executeSql('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [qty, product.id]);
            executeSql('UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE product_id = ? AND name = ?', [qty, product.id, 'Standar']);
            
            await logSync(
              product.id, 
              null, 
              'STOCK_SYNC', 
              'SUCCESS', 
              `Webhook: Stok berkurang ${qty} pcs karena pesanan Shopee ${orderSn}`
            );
          }
        }
      }

      return NextResponse.json({ success: true, message: `Processed order ${orderSn} successfully` });
    }

    return NextResponse.json({ success: true, message: 'Notification ignored (not a stock/order event)' });
  } catch (error: any) {
    console.error('Webhook processing failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
