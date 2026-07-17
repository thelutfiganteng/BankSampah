import { NextResponse } from 'next/server';
import { executeSql, queryOne } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('shopee_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    const settings = queryOne('SELECT * FROM shopee_settings LIMIT 1');
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partnerId, partnerKey, isSandbox, isSimulated, isActive, shopId } = body;

    if (isSupabaseConfigured()) {
      const { data: existing, error: existError } = await supabase
        .from('shopee_settings')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (existError) throw existError;

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('shopee_settings')
          .update({
            partner_id: partnerId || '',
            partner_key: partnerKey || '',
            is_sandbox: isSandbox ? 1 : 0,
            is_simulated: isSimulated ? 1 : 0,
            is_active: isActive ? 1 : 0,
            shop_id: shopId || ''
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return NextResponse.json({ success: true, data: updated });
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('shopee_settings')
          .insert([{
            partner_id: partnerId || '',
            partner_key: partnerKey || '',
            is_sandbox: isSandbox ? 1 : 0,
            is_simulated: isSimulated ? 1 : 0,
            is_active: isActive ? 1 : 0,
            shop_id: shopId || '',
            access_token: '',
            refresh_token: '',
            token_expires_at: 0
          }])
          .select()
          .single();
        if (insertError) throw insertError;
        return NextResponse.json({ success: true, data: inserted });
      }
    }

    // SQLite Fallback
    const existing = queryOne('SELECT id FROM shopee_settings LIMIT 1');
    
    if (existing) {
      executeSql(`
        UPDATE shopee_settings 
        SET partner_id = ?, partner_key = ?, is_sandbox = ?, is_simulated = ?, is_active = ?, shop_id = ?
        WHERE id = ?
      `, [
        partnerId || '', 
        partnerKey || '', 
        isSandbox ? 1 : 0, 
        isSimulated ? 1 : 0, 
        isActive ? 1 : 0, 
        shopId || '',
        existing.id
      ]);
    } else {
      executeSql(`
        INSERT INTO shopee_settings (partner_id, partner_key, is_sandbox, is_simulated, is_active, shop_id, access_token, refresh_token, token_expires_at)
        VALUES (?, ?, ?, ?, ?, ?, '', '', 0)
      `, [
        partnerId || '', 
        partnerKey || '', 
        isSandbox ? 1 : 0, 
        isSimulated ? 1 : 0, 
        isActive ? 1 : 0,
        shopId || ''
      ]);
    }

    const updated = queryOne('SELECT * FROM shopee_settings LIMIT 1');
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
