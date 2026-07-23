import { NextResponse } from 'next/server';
import { executeSql, queryOne, queryAll } from '@/lib/db';
import {
  syncLocalProductToMeta,
  deleteLocalProductFromMeta,
  isMetaConfigured,
} from '@/lib/metaCatalog';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// ─── GET: List all products or single product ────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (isSupabaseConfigured()) {
      if (id) {
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', parseInt(id))
          .maybeSingle();
        if (error) throw error;
        if (!product) {
          return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }

        const { data: variants, error: varError } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', parseInt(id));
        if (varError) throw varError;

        return NextResponse.json({ success: true, data: { ...product, variants: variants || [] } });
      }

      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result = [];
      for (const product of products || []) {
        const { data: variants } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', product.id);
        result.push({ ...product, variants: variants || [] });
      }
      return NextResponse.json({ success: true, data: result });
    }

    // SQLite Fallback
    if (id) {
      const product = queryOne('SELECT * FROM products WHERE id = ?', [parseInt(id)]);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      const variants = queryAll('SELECT * FROM product_variants WHERE product_id = ?', [parseInt(id)]);
      return NextResponse.json({ success: true, data: { ...product, variants } });
    }

    const products = queryAll('SELECT * FROM products ORDER BY created_at DESC');
    const result = products.map(p => {
      const variants = queryAll('SELECT * FROM product_variants WHERE product_id = ?', [p.id]);
      return { ...p, variants };
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST: Create new product ────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, category, price, stock, variants } = body;
    const imgUrl = body.imageUrl || body.image_url || null;

    if (!name || !category || price == null || stock == null) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let productId: number;

    if (isSupabaseConfigured()) {
      const { data: newProd, error } = await supabase
        .from('products')
        .insert([{
          name,
          description: description || '',
          category,
          price: parseInt(price),
          stock: parseInt(stock),
          image_url: imgUrl,
        }])
        .select()
        .single();
      if (error) throw error;
      productId = newProd.id;

      if (variants && Array.isArray(variants) && variants.length > 0) {
        const varRows = variants.map((v: any) => ({
          product_id: productId,
          name: v.name,
          sku: v.sku || null,
          price: parseInt(v.price),
          stock: parseInt(v.stock),
        }));
        const { error: varError } = await supabase
          .from('product_variants')
          .insert(varRows);
        if (varError) throw varError;
      }
    } else {
      executeSql(
        `INSERT INTO products (name, description, category, price, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description || '', category, parseInt(price), parseInt(stock), imgUrl]
      );
      const lastRow = queryOne('SELECT last_insert_rowid() as id');
      productId = lastRow.id;

      if (variants && Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
          executeSql(
            `INSERT INTO product_variants (product_id, name, sku, price, stock)
             VALUES (?, ?, ?, ?, ?)`,
            [productId, v.name, v.sku || null, parseInt(v.price), parseInt(v.stock)]
          );
        }
      }
    }

    // ─── Non-blocking sync: fire-and-forget ────────
    if (isMetaConfigured()) {
      syncLocalProductToMeta(productId).catch(e => console.error('[META SYNC]', e));
    }

    return NextResponse.json({ success: true, productId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PUT: Update existing product ────────────────────────────
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, category, price, stock, variants, onlyStockSync } = body;
    const imgUrl = body.imageUrl || body.image_url || null;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // ─── If only triggering Meta Catalog sync ──────
    if (onlyStockSync) {
      if (isMetaConfigured()) {
        const syncResult = await syncLocalProductToMeta(id);
        if (!syncResult.success) {
          return NextResponse.json({ success: false, error: syncResult.error || 'Gagal mensinkronisasikan ke Meta Catalog' }, { status: 400 });
        }
      }
      return NextResponse.json({ success: true, message: 'Meta sync completed' });
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('products')
        .update({
          name,
          description: description || '',
          category,
          price: parseInt(price),
          stock: parseInt(stock),
          image_url: imgUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      // Replace variants: delete old ones, insert new ones
      if (variants && Array.isArray(variants)) {
        await supabase.from('product_variants').delete().eq('product_id', id);
        if (variants.length > 0) {
          const varRows = variants.map((v: any) => ({
            product_id: id,
            name: v.name,
            sku: v.sku || null,
            price: parseInt(v.price),
            stock: parseInt(v.stock),
          }));
          const { error: varError } = await supabase
            .from('product_variants')
            .insert(varRows);
          if (varError) throw varError;
        }
      }
    } else {
      executeSql(
        `UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description || '', category, parseInt(price), parseInt(stock), imgUrl, id]
      );

      if (variants && Array.isArray(variants)) {
        executeSql('DELETE FROM product_variants WHERE product_id = ?', [id]);
        for (const v of variants) {
          executeSql(
            `INSERT INTO product_variants (product_id, name, sku, price, stock)
             VALUES (?, ?, ?, ?, ?)`,
            [id, v.name, v.sku || null, parseInt(v.price), parseInt(v.stock)]
          );
        }
      }
    }

    // ─── Non-blocking sync ────────────────────────
    if (isMetaConfigured()) {
      syncLocalProductToMeta(id).catch(e => console.error('[META SYNC]', e));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── DELETE: Remove product ──────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const productId = parseInt(id);

    // ─── Non-blocking: delete from Meta BEFORE deleting locally ────
    // (because deleteLocalProductFromMeta needs to read meta_product_id)
    if (isMetaConfigured()) {
      deleteLocalProductFromMeta(productId).catch(e => console.error('[META DELETE]', e));
    }

    // Delete locally
    if (isSupabaseConfigured()) {
      await supabase.from('product_variants').delete().eq('product_id', productId);
      await supabase.from('products').delete().eq('id', productId);
    } else {
      executeSql('DELETE FROM product_variants WHERE product_id = ?', [productId]);
      executeSql('DELETE FROM products WHERE id = ?', [productId]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
