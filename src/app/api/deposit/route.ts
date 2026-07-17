import { NextResponse } from 'next/server';
import { executeSql, queryOne, queryAll } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const POINT_RATES: Record<string, number> = {
  'Plastik': 2000,
  'Kertas': 1500,
  'Logam': 5000,
  'Kaca': 1000,
  'Organik': 500,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (isSupabaseConfigured()) {
      if (memberId) {
        const { data: deposits, error } = await supabase
          .from('waste_deposits')
          .select('*')
          .eq('member_id', parseInt(memberId))
          .order('deposit_date', { ascending: false });
        if (error) throw error;
        return NextResponse.json({ success: true, data: deposits || [] });
      }

      const { data: allDeposits, error } = await supabase
        .from('waste_deposits')
        .select(`
          *,
          members (
            name
          )
        `)
        .order('deposit_date', { ascending: false });
      if (error) throw error;
      
      const mapped = allDeposits?.map((dep: any) => ({
        ...dep,
        member_name: dep.members?.name || 'Unknown'
      })) || [];

      return NextResponse.json({ success: true, data: mapped });
    }

    if (memberId) {
      const deposits = queryAll(
        'SELECT * FROM waste_deposits WHERE member_id = ? ORDER BY deposit_date DESC',
        [parseInt(memberId)]
      );
      return NextResponse.json({ success: true, data: deposits });
    }

    const allDeposits = queryAll(`
      SELECT wd.*, m.name as member_name 
      FROM waste_deposits wd
      JOIN members m ON wd.member_id = m.id
      ORDER BY wd.deposit_date DESC
    `);
    return NextResponse.json({ success: true, data: allDeposits });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, wasteType, weight, notes } = body;

    if (!memberId || !wasteType || weight === undefined) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return NextResponse.json({ success: false, error: 'Weight must be greater than 0' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // Verify member exists
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!member) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      const rate = POINT_RATES[wasteType] || 0;
      const pointsEarned = Math.round(parsedWeight * rate);

      // 1. Insert deposit record
      const { error: depositError } = await supabase
        .from('waste_deposits')
        .insert([{
          member_id: memberId,
          waste_type: wasteType,
          weight: parsedWeight,
          points: pointsEarned,
          notes: notes || ''
        }]);
      if (depositError) throw depositError;

      // 2. Update member balance
      const newBalance = (member.balance || 0) + pointsEarned;
      const { error: updateMemberError } = await supabase
        .from('members')
        .update({ balance: newBalance })
        .eq('id', memberId);
      if (updateMemberError) throw updateMemberError;

      // 3. Update raw materials stock
      const { data: rawMat, error: rawError } = await supabase
        .from('raw_materials')
        .select('stock_kg')
        .eq('waste_type', wasteType)
        .maybeSingle();
      if (rawError) throw rawError;
      
      const currentStock = rawMat?.stock_kg || 0;
      const { error: updateRawError } = await supabase
        .from('raw_materials')
        .update({ stock_kg: currentStock + parsedWeight })
        .eq('waste_type', wasteType);
      if (updateRawError) throw updateRawError;

      return NextResponse.json({
        success: true,
        data: {
          pointsEarned,
          newBalance,
        },
      });
    }

    // Verify member exists
    const member = queryOne('SELECT * FROM members WHERE id = ?', [memberId]);
    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    // Calculate points/balance earned
    const rate = POINT_RATES[wasteType] || 0;
    const pointsEarned = Math.round(parsedWeight * rate);

    // Insert deposit record
    executeSql(
      'INSERT INTO waste_deposits (member_id, waste_type, weight, points, notes) VALUES (?, ?, ?, ?, ?)',
      [memberId, wasteType, parsedWeight, pointsEarned, notes || '']
    );

    // Update member balance
    executeSql(
      'UPDATE members SET balance = balance + ? WHERE id = ?',
      [pointsEarned, memberId]
    );

    // Update raw materials stock
    executeSql(
      'UPDATE raw_materials SET stock_kg = stock_kg + ? WHERE waste_type = ?',
      [parsedWeight, wasteType]
    );

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned,
        newBalance: member.balance + pointsEarned,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
