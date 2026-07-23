import { NextResponse } from 'next/server';
import { executeSql, queryOne, queryAll } from '@/lib/db';
import { syncStockToMeta, isMetaConfigured } from '@/lib/metaCatalog';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (isSupabaseConfigured()) {
      if (id) {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', parseInt(id))
          .maybeSingle();
        if (orderError) throw orderError;
        if (!order) {
          return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', parseInt(id));
        if (itemsError) throw itemsError;

        const productIds = Array.from(new Set(items?.map((item: any) => item.product_id).filter(Boolean) || []));
        const variantIds = Array.from(new Set(items?.map((item: any) => item.variant_id).filter(Boolean) || []));

        const { data: productsData } = productIds.length > 0
          ? await supabase.from('products').select('id, name').in('id', productIds)
          : { data: [] };

        const { data: variantsData } = variantIds.length > 0
          ? await supabase.from('product_variants').select('id, name').in('id', variantIds)
          : { data: [] };

        const productMap = new Map(productsData?.map((p: any) => [p.id, p.name]) || []);
        const variantMap = new Map(variantsData?.map((v: any) => [v.id, v.name]) || []);

        const mappedItems = items?.map((item: any) => ({
          ...item,
          product_name: productMap.get(item.product_id) || 'Unknown',
          variant_name: variantMap.get(item.variant_id) || 'Unknown'
        })) || [];

        return NextResponse.json({ success: true, data: { ...order, items: mappedItems } });
      }

      let query = supabase.from('orders').select('*');
      if (email) {
        query = query.eq('customer_email', email);
      }
      const { data: orders, error: ordersError } = await query.order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const result = [];
      for (const order of orders || []) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        if (itemsError) throw itemsError;

        const productIds = Array.from(new Set(items?.map((item: any) => item.product_id).filter(Boolean) || []));
        const variantIds = Array.from(new Set(items?.map((item: any) => item.variant_id).filter(Boolean) || []));

        const { data: productsData } = productIds.length > 0
          ? await supabase.from('products').select('id, name').in('id', productIds)
          : { data: [] };

        const { data: variantsData } = variantIds.length > 0
          ? await supabase.from('product_variants').select('id, name').in('id', variantIds)
          : { data: [] };

        const productMap = new Map(productsData?.map((p: any) => [p.id, p.name]) || []);
        const variantMap = new Map(variantsData?.map((v: any) => [v.id, v.name]) || []);

        const mappedItems = items?.map((item: any) => ({
          ...item,
          product_name: productMap.get(item.product_id) || 'Unknown',
          variant_name: variantMap.get(item.variant_id) || 'Unknown'
        })) || [];

        result.push({ ...order, items: mappedItems });
      }

      return NextResponse.json({ success: true, data: result });
    }

    // SQLite Fallback
    if (id) {
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [parseInt(id)]);
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      const items = queryAll(`
        SELECT oi.*, p.name as product_name, pv.name as variant_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = ?
      `, [parseInt(id)]);
      return NextResponse.json({ success: true, data: { ...order, items } });
    }

    const orders = email
      ? queryAll('SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC', [email])
      : queryAll('SELECT * FROM orders ORDER BY created_at DESC');

    const result = orders.map(order => {
      const items = queryAll(`
        SELECT oi.*, p.name as product_name, pv.name as variant_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = ?
      `, [order.id]);
      return { ...order, items };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, customerEmail, customerPhone, shippingAddress, items } = body;

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Informasi pesanan tidak lengkap' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // 1. Validate stock availability
      for (const item of items) {
        if (item.variantId) {
          const { data: variant, error: varError } = await supabase
            .from('product_variants')
            .select('stock, name')
            .eq('id', item.variantId)
            .maybeSingle();
          if (varError) throw varError;
          if (!variant || (variant.stock || 0) < item.quantity) {
            return NextResponse.json({
              success: false,
              error: `Stok tidak mencukupi untuk varian: ${variant?.name || 'Varian tidak ditemukan'}`
            }, { status: 400 });
          }
        } else {
          const { data: product, error: prodError } = await supabase
            .from('products')
            .select('stock, name')
            .eq('id', item.productId)
            .maybeSingle();
          if (prodError) throw prodError;
          if (!product || (product.stock || 0) < item.quantity) {
            return NextResponse.json({
              success: false,
              error: `Stok tidak mencukupi untuk produk: ${product?.name || 'Produk tidak ditemukan'}`
            }, { status: 400 });
          }
        }
      }

      // 2. Calculate Total Price
      let totalPrice = 0;
      const validatedItems = [];

      for (const item of items) {
        let price = 0;
        if (item.variantId) {
          const { data: variant, error: varError } = await supabase
            .from('product_variants')
            .select('price')
            .eq('id', item.variantId)
            .maybeSingle();
          if (varError) throw varError;
          price = variant?.price || 0;
        } else {
          const { data: product, error: prodError } = await supabase
            .from('products')
            .select('price')
            .eq('id', item.productId)
            .maybeSingle();
          if (prodError) throw prodError;
          price = product?.price || 0;
        }
        totalPrice += price * item.quantity;
        validatedItems.push({ ...item, price });
      }

      // 3. Insert main Order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          total_price: totalPrice,
          status: 'PENDING'
        }])
        .select()
        .single();
      if (orderError) throw orderError;

      const orderId = newOrder.id;

      // 4. Insert items, deduct stock, and sync
      for (const item of validatedItems) {
        const { error: itemInsertError } = await supabase
          .from('order_items')
          .insert([{
            order_id: orderId,
            product_id: item.productId,
            variant_id: item.variantId || null,
            quantity: item.quantity,
            price: item.price
          }]);
        if (itemInsertError) throw itemInsertError;

        if (item.variantId) {
          // Deduct variant stock
          const { data: variant, error: selectVarError } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.variantId)
            .maybeSingle();
          if (selectVarError) throw selectVarError;

          const newStock = (variant?.stock || 0) - item.quantity;
          const { error: updateVarError } = await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', item.variantId);
          if (updateVarError) throw updateVarError;

          // Sync product stock
          const { data: siblingVariants, error: selectSiblingsError } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('product_id', item.productId);
          if (selectSiblingsError) throw selectSiblingsError;

          const totalStock = siblingVariants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
          const { error: updateProdError } = await supabase
            .from('products')
            .update({ stock: totalStock })
            .eq('id', item.productId);
          if (updateProdError) throw updateProdError;

          // Sync to Meta (non-blocking)
          if (isMetaConfigured()) syncStockToMeta(item.productId).catch(e => console.error('[META]', e));
        } else {
          // Deduct main product stock
          const { data: product, error: selectProdError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .maybeSingle();
          if (selectProdError) throw selectProdError;

          const newStock = (product?.stock || 0) - item.quantity;
          const { error: updateProdError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.productId);
          if (updateProdError) throw updateProdError;

          // Sync to Meta (non-blocking)
          if (isMetaConfigured()) syncStockToMeta(item.productId).catch(e => console.error('[META]', e));
        }
      }

      return NextResponse.json({ success: true, orderId });
    }

    // 1. Validate stock availability in SQLite
    for (const item of items) {
      if (item.variantId) {
        const variant = queryOne('SELECT stock, name FROM product_variants WHERE id = ?', [item.variantId]);
        if (!variant || variant.stock < item.quantity) {
          return NextResponse.json({
            success: false,
            error: `Stok tidak mencukupi untuk varian: ${variant?.name || 'Varian tidak ditemukan'}`
          }, { status: 400 });
        }
      } else {
        const product = queryOne('SELECT stock, name FROM products WHERE id = ?', [item.productId]);
        if (!product || product.stock < item.quantity) {
          return NextResponse.json({
            success: false,
            error: `Stok tidak mencukupi untuk produk: ${product?.name || 'Produk tidak ditemukan'}`
          }, { status: 400 });
        }
      }
    }

    // 2. Calculate Total Price in SQLite
    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      let price = 0;
      if (item.variantId) {
        const variant = queryOne('SELECT price FROM product_variants WHERE id = ?', [item.variantId]);
        price = variant.price;
      } else {
        const product = queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
        price = product.price;
      }
      totalPrice += price * item.quantity;
      validatedItems.push({ ...item, price });
    }

    // 3. Insert main Order in SQLite
    executeSql(`
      INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_price, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `, [customerName, customerEmail, customerPhone, shippingAddress, totalPrice]);

    const orderIdRow = queryOne('SELECT last_insert_rowid() as id');
    const orderId = orderIdRow.id;

    // 4. Insert items, deduct stock, and sync
    for (const item of validatedItems) {
      executeSql(`
        INSERT INTO order_items (order_id, product_id, variant_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.productId, item.variantId || null, item.quantity, item.price]);

      if (item.variantId) {
        executeSql('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variantId]);
        const totalStockRow = queryOne('SELECT SUM(stock) as total FROM product_variants WHERE product_id = ?', [item.productId]);
        executeSql('UPDATE products SET stock = ? WHERE id = ?', [totalStockRow.total || 0, item.productId]);
        if (isMetaConfigured()) syncStockToMeta(item.productId).catch(e => console.error('[META]', e));
      } else {
        executeSql('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
        if (isMetaConfigured()) syncStockToMeta(item.productId).catch(e => console.error('[META]', e));
      }
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
