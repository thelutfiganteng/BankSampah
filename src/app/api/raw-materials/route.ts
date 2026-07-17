import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('waste_type', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    const materials = queryAll('SELECT * FROM raw_materials ORDER BY waste_type ASC');
    return NextResponse.json({ success: true, data: materials });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
