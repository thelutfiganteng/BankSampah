import { NextResponse } from 'next/server';
import { executeSql, queryOne, queryAll } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { mapDatabaseError } from '@/lib/friendlyError';

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
    return NextResponse.json({ success: false, error: mapDatabaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, wasteType, weight, notes, status } = body;

    if (!memberId || !wasteType || weight === undefined) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return NextResponse.json({ success: false, error: 'Weight must be greater than 0' }, { status: 400 });
    }

    const depositStatus = status || 'APPROVED'; // PENDING, APPROVED, REJECTED
    const rate = POINT_RATES[wasteType] || 0;
    const pointsEarned = Math.round(parsedWeight * rate);

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

      // 1. Insert deposit record
      const { error: depositError } = await supabase
        .from('waste_deposits')
        .insert([{
          member_id: memberId,
          waste_type: wasteType,
          weight: parsedWeight,
          points: pointsEarned,
          notes: notes || '',
          status: depositStatus
        }]);
      if (depositError) throw depositError;

      // Only update balance and stock if it is immediately approved (admin workflow)
      let newBalance = member.balance || 0;
      if (depositStatus === 'APPROVED') {
        // 2. Update member balance
        newBalance = (member.balance || 0) + pointsEarned;
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
      }

      return NextResponse.json({
        success: true,
        data: {
          pointsEarned,
          newBalance,
        },
      });
    }

    // SQLite Mode
    const member = queryOne('SELECT * FROM members WHERE id = ?', [memberId]);
    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    // Insert deposit record
    executeSql(
      'INSERT INTO waste_deposits (member_id, waste_type, weight, points, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
      [memberId, wasteType, parsedWeight, pointsEarned, notes || '', depositStatus]
    );

    let newBalance = member.balance;
    if (depositStatus === 'APPROVED') {
      newBalance = member.balance + pointsEarned;
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
    }

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned,
        newBalance,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: mapDatabaseError(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { depositId, status, actualWeight, notes } = body;

    if (!depositId || !status) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // 1. Get current deposit details
      const { data: deposit, error: depError } = await supabase
        .from('waste_deposits')
        .select('*')
        .eq('id', depositId)
        .maybeSingle();

      if (depError) throw depError;
      if (!deposit) {
        return NextResponse.json({ success: false, error: 'Deposit not found' }, { status: 404 });
      }

      if (deposit.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: 'Deposit is already processed' }, { status: 400 });
      }

      // If approved, we need to apply balance and stock changes
      if (status === 'APPROVED') {
        const parsedWeight = parseFloat(actualWeight || deposit.weight);
        if (isNaN(parsedWeight) || parsedWeight <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid weight' }, { status: 400 });
        }

        const rate = POINT_RATES[deposit.waste_type] || 0;
        const pointsEarned = Math.round(parsedWeight * rate);

        // Fetch member
        const { data: member, error: memError } = await supabase
          .from('members')
          .select('*')
          .eq('id', deposit.member_id)
          .maybeSingle();
        if (memError) throw memError;
        if (!member) {
          return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }

        // Update deposit status, verified weight, and points
        const { error: updError } = await supabase
          .from('waste_deposits')
          .update({
            status: 'APPROVED',
            weight: parsedWeight,
            points: pointsEarned,
            notes: notes || deposit.notes
          })
          .eq('id', depositId);
        if (updError) throw updError;

        // Update member balance
        const newBalance = (member.balance || 0) + pointsEarned;
        const { error: memUpdError } = await supabase
          .from('members')
          .update({ balance: newBalance })
          .eq('id', deposit.member_id);
        if (memUpdError) throw memUpdError;

        // Update raw materials stock
        const { data: rawMat, error: rawError } = await supabase
          .from('raw_materials')
          .select('stock_kg')
          .eq('waste_type', deposit.waste_type)
          .maybeSingle();
        if (rawError) throw rawError;

        const currentStock = rawMat?.stock_kg || 0;
        const { error: rawUpdError } = await supabase
          .from('raw_materials')
          .update({ stock_kg: currentStock + parsedWeight })
          .eq('waste_type', deposit.waste_type);
        if (rawUpdError) throw rawUpdError;

        return NextResponse.json({ success: true, data: { pointsEarned, newBalance } });
      } else {
        // REJECTED
        const { error: updError } = await supabase
          .from('waste_deposits')
          .update({
            status: 'REJECTED',
            notes: notes || deposit.notes
          })
          .eq('id', depositId);
        if (updError) throw updError;

        return NextResponse.json({ success: true, data: { status: 'REJECTED' } });
      }
    }

    // SQLite Mode
    const deposit = queryOne('SELECT * FROM waste_deposits WHERE id = ?', [depositId]);
    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit not found' }, { status: 404 });
    }

    if (deposit.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Deposit is already processed' }, { status: 400 });
    }

    if (status === 'APPROVED') {
      const parsedWeight = parseFloat(actualWeight || deposit.weight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid weight' }, { status: 400 });
      }

      const rate = POINT_RATES[deposit.waste_type] || 0;
      const pointsEarned = Math.round(parsedWeight * rate);

      const member = queryOne('SELECT * FROM members WHERE id = ?', [deposit.member_id]);
      if (!member) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      // Update deposit
      executeSql(
        'UPDATE waste_deposits SET status = ?, weight = ?, points = ?, notes = ? WHERE id = ?',
        ['APPROVED', parsedWeight, pointsEarned, notes || deposit.notes, depositId]
      );

      // Update member balance
      executeSql('UPDATE members SET balance = balance + ? WHERE id = ?', [pointsEarned, deposit.member_id]);

      // Update stock
      executeSql('UPDATE raw_materials SET stock_kg = stock_kg + ? WHERE waste_type = ?', [parsedWeight, deposit.waste_type]);

      return NextResponse.json({ success: true, data: { pointsEarned, newBalance: member.balance + pointsEarned } });
    } else {
      // REJECTED
      executeSql(
        'UPDATE waste_deposits SET status = ?, notes = ? WHERE id = ?',
        ['REJECTED', notes || deposit.notes, depositId]
      );
      return NextResponse.json({ success: true, data: { status: 'REJECTED' } });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: mapDatabaseError(error) }, { status: 500 });
  }
}
