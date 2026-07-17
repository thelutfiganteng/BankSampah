import { NextResponse } from 'next/server';
import { executeSql, queryOne, queryAll } from '@/lib/db';
import { syncProductToShopee, deleteProductFromShopee, syncStockToShopee } from '@/lib/shopee';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (isSupabaseConfigured()) {
      if (id) {
        const { data: product, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('id', parseInt(id))
          .maybeSingle();
        if (prodError) throw prodError;
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

      // Fetch all products with variants
      const { data: prods, error: prodError } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (
            *
          )
        `)
        .order('created_at', { ascending: false });
      if (prodError) throw prodError;

      const mapped = prods?.map((p: any) => ({
        ...p,
        variants: p.product_variants || []
      })) || [];

      return NextResponse.json({ success: true, data: mapped });
    }

    if (id) {
      const product = queryOne('SELECT * FROM products WHERE id = ?', [parseInt(id)]);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      const variants = queryAll('SELECT * FROM product_variants WHERE product_id = ?', [parseInt(id)]);
      return NextResponse.json({ success: true, data: { ...product, variants } });
    }

    // Fetch all products from SQLite
    const products = queryAll('SELECT * FROM products ORDER BY created_at DESC');
    const result = products.map(product => {
      const variants = queryAll('SELECT * FROM product_variants WHERE product_id = ?', [product.id]);
      return { ...product, variants };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, category, price, stock, image_url, variants } = body;

    if (!name || !category || price === undefined || stock === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // Insert product
      const { data: newProd, error: prodError } = await supabase
        .from('products')
        .insert([{
          name,
          description: description || '',
          category,
          price,
          stock,
          image_url: image_url || ''
        }])
        .select()
        .single();
      if (prodError) throw prodError;
      
      const productId = newProd.id;

      // Insert variants
      if (variants && Array.isArray(variants) && variants.length > 0) {
        const varRows = variants.map(v => ({
          product_id: productId,
          name: v.name,
          sku: v.sku || null,
          price: v.price,
          stock: v.stock
        }));
        const { error: varError } = await supabase
          .from('product_variants')
          .insert(varRows);
        if (varError) throw varError;
      } else {
        const { error: varError } = await supabase
          .from('product_variants')
          .insert([{
            product_id: productId,
            name: 'Standar',
            sku: `SKU-${productId}`,
            price,
            stock
          }]);
        if (varError) throw varError;
      }

      // Sync to Shopee
      await syncProductToShopee(productId);

      return NextResponse.json({ success: true, id: productId });
    }

    // Insert main product record in SQLite
    executeSql(`
      INSERT INTO products (name, description, category, price, stock, image_url) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, description || '', category, price, stock, image_url || '']);

    const rowidRes = queryOne('SELECT last_insert_rowid() as id');
    const productId = rowidRes.id;

    // Add variants
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const variant of variants) {
        executeSql(`
          INSERT INTO product_variants (product_id, name, sku, price, stock) 
          VALUES (?, ?, ?, ?, ?)
        `, [productId, variant.name, variant.sku || null, variant.price, variant.stock]);
      }
    } else {
      executeSql(`
        INSERT INTO product_variants (product_id, name, sku, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `, [productId, 'Standar', `SKU-${productId}`, price, stock]);
    }

    // Sync to Shopee
    await syncProductToShopee(productId);

    return NextResponse.json({ success: true, id: productId });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, category, price, stock, image_url, variants, onlyStockSync } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      if (onlyStockSync) {
        if (variants && Array.isArray(variants)) {
          for (const v of variants) {
            const { error: vError } = await supabase
              .from('product_variants')
              .update({ stock: v.stock, price: v.price })
              .eq('id', v.id);
            if (vError) throw vError;
            await syncStockToShopee(id, v.id);
          }

          // Fetch updated variants
          const { data: updatedVariants, error: selectError } = await supabase
            .from('product_variants')
            .select('stock, price')
            .eq('product_id', id);
          if (selectError) throw selectError;

          const totalStock = updatedVariants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
          const minPrice = updatedVariants && updatedVariants.length > 0
            ? Math.min(...updatedVariants.map(v => v.price))
            : price;

          const { error: pError } = await supabase
            .from('products')
            .update({ stock: totalStock, price: minPrice })
            .eq('id', id);
          if (pError) throw pError;
        } else {
          const { error: pError } = await supabase
            .from('products')
            .update({ stock, price })
            .eq('id', id);
          if (pError) throw pError;
          await syncStockToShopee(id, null);
        }
        return NextResponse.json({ success: true });
      }

      // Full Product Update
      const { error: pUpdateError } = await supabase
        .from('products')
        .update({
          name,
          description: description || '',
          category,
          price,
          stock,
          image_url: image_url || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (pUpdateError) throw pUpdateError;

      // Smart Upsert Variants
      if (variants && Array.isArray(variants)) {
        const { data: currentVariants, error: currentError } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', id);
        if (currentError) throw currentError;
        
        const currentIds = currentVariants?.map(cv => cv.id) || [];
        const incomingIds = variants.map(v => v.id).filter(Boolean);

        // 1. Delete removed variants
        const toDelete = currentIds.filter(cid => !incomingIds.includes(cid));
        if (toDelete.length > 0) {
          const { error: delError } = await supabase
            .from('product_variants')
            .delete()
            .in('id', toDelete);
          if (delError) throw delError;
        }

        // 2. Insert or update incoming variants
        for (const v of variants) {
          if (v.id) {
            const { error: upVarError } = await supabase
              .from('product_variants')
              .update({
                name: v.name,
                sku: v.sku || null,
                price: v.price,
                stock: v.stock
              })
              .eq('id', v.id);
            if (upVarError) throw upVarError;
            await syncStockToShopee(id, v.id);
          } else {
            const { error: inVarError } = await supabase
              .from('product_variants')
              .insert([{
                product_id: id,
                name: v.name,
                sku: v.sku || null,
                price: v.price,
                stock: v.stock
              }]);
            if (inVarError) throw inVarError;
          }
        }
      }

      // Trigger full Shopee sync
      await syncProductToShopee(id);
      return NextResponse.json({ success: true });
    }

    // SQLite Fallback Update
    if (onlyStockSync) {
      if (variants && Array.isArray(variants)) {
        for (const v of variants) {
          executeSql('UPDATE product_variants SET stock = ?, price = ? WHERE id = ?', [v.stock, v.price, v.id]);
          await syncStockToShopee(id, v.id);
        }
        const updatedVariants = queryAll('SELECT stock, price FROM product_variants WHERE product_id = ?', [id]);
        const totalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
        const minPrice = updatedVariants.length > 0 ? Math.min(...updatedVariants.map(v => v.price)) : price;
        executeSql('UPDATE products SET stock = ?, price = ? WHERE id = ?', [totalStock, minPrice, id]);
      } else {
        executeSql('UPDATE products SET stock = ?, price = ? WHERE id = ?', [stock, price, id]);
        await syncStockToShopee(id, null);
      }
      return NextResponse.json({ success: true });
    }

    // Full Product Update in SQLite
    if (!name || !category || price === undefined || stock === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    executeSql(`
      UPDATE products 
      SET name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description || '', category, price, stock, image_url || '', id]);

    if (variants && Array.isArray(variants)) {
      const currentVariants = queryAll('SELECT id FROM product_variants WHERE product_id = ?', [id]);
      const incomingIds = variants.map(v => v.id).filter(Boolean);

      // 1. Delete removed
      for (const cur of currentVariants) {
        if (!incomingIds.includes(cur.id)) {
          executeSql('DELETE FROM product_variants WHERE id = ?', [cur.id]);
        }
      }

      // 2. Upsert
      for (const v of variants) {
        if (v.id) {
          executeSql(`
            UPDATE product_variants 
            SET name = ?, sku = ?, price = ?, stock = ?
            WHERE id = ?
          `, [v.name, v.sku || null, v.price, v.stock, v.id]);
          await syncStockToShopee(id, v.id);
        } else {
          executeSql(`
            INSERT INTO product_variants (product_id, name, sku, price, stock) 
            VALUES (?, ?, ?, ?, ?)
          `, [id, v.name, v.sku || null, v.price, v.stock]);
        }
      }
    }

    await syncProductToShopee(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const productId = parseInt(id);

    if (isSupabaseConfigured()) {
      const { data: product, error: selectError } = await supabase
        .from('products')
        .select('shopee_item_id')
        .eq('id', productId)
        .maybeSingle();
      if (selectError) throw selectError;

      if (product && product.shopee_item_id) {
        await deleteProductFromShopee(productId, product.shopee_item_id);
      }

      const { error: delError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (delError) throw delError;

      return NextResponse.json({ success: true });
    }

    // SQLite
    const product = queryOne('SELECT shopee_item_id FROM products WHERE id = ?', [productId]);
    if (product && product.shopee_item_id) {
      await deleteProductFromShopee(productId, product.shopee_item_id);
    }

    executeSql('DELETE FROM products WHERE id = ?', [productId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
