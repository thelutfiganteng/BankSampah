import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('meta_sync_logs')
        .select('*, products:product_id(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const mapped = (data || []).map((log: any) => ({
        ...log,
        product_name: log.products?.name || 'Unknown',
      }));
      return NextResponse.json({ success: true, data: mapped });
    }

    const logs = queryAll(`
      SELECT l.*, p.name as product_name
      FROM meta_sync_logs l
      LEFT JOIN products p ON l.product_id = p.id
      ORDER BY l.created_at DESC LIMIT 50
    `);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
