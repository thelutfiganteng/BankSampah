import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data: logs, error } = await supabase
        .from('shopee_sync_logs')
        .select(`
          *,
          products ( name ),
          product_variants ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      
      const mapped = logs?.map((log: any) => ({
        ...log,
        product_name: log.products?.name || 'Unknown',
        variant_name: log.product_variants?.name || 'Unknown'
      })) || [];

      return NextResponse.json({ success: true, data: mapped });
    }

    // SQLite Fallback
    const logs = queryAll(`
      SELECT sl.*, p.name as product_name, pv.name as variant_name
      FROM shopee_sync_logs sl
      JOIN products p ON sl.product_id = p.id
      LEFT JOIN product_variants pv ON sl.variant_id = pv.id
      ORDER BY sl.created_at DESC
      LIMIT 100
    `);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
