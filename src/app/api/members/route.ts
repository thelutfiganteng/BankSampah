import { NextResponse } from 'next/server';
import { executeSql, queryOne, queryAll } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { mapDatabaseError } from '@/lib/friendlyError';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    const members = queryAll('SELECT * FROM members ORDER BY name ASC');
    return NextResponse.json({ success: true, data: members });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: mapDatabaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, address } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone are required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // Check if phone number already registered
      const { data: existing, error: existError } = await supabase
        .from('members')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      if (existError) throw existError;
      if (existing) {
        return NextResponse.json({ success: false, error: 'Nomor telepon sudah terdaftar' }, { status: 409 });
      }

      // Insert new member
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert([{ name, phone, address: address || '', balance: 0 }])
        .select()
        .single();
      if (insertError) throw insertError;
      return NextResponse.json({ success: true, data: newMember });
    }

    // Check if phone number already registered
    const existing = queryOne('SELECT * FROM members WHERE phone = ?', [phone]);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Nomor telepon sudah terdaftar' }, { status: 409 });
    }

    executeSql(
      'INSERT INTO members (name, phone, address, balance) VALUES (?, ?, ?, 0)',
      [name, phone, address || '']
    );

    const newMember = queryOne('SELECT * FROM members WHERE phone = ?', [phone]);
    return NextResponse.json({ success: true, data: newMember });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: mapDatabaseError(error) }, { status: 500 });
  }
}
