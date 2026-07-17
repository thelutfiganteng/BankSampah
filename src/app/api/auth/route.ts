import { NextResponse } from 'next/server';
import { executeSql, queryOne } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import crypto from 'crypto';
import { mapDatabaseError } from '@/lib/friendlyError';

const hash = (pass: string) => crypto.createHash('sha256').update(pass).digest('hex');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, name, phone, address } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
      }

      const hashedPassword = hash(password);

      if (isSupabaseConfigured()) {
        const { data: user, error: loginErr } = await supabase
          .from('members')
          .select('*')
          .eq('email', email)
          .eq('password', hashedPassword)
          .maybeSingle();
        if (loginErr) throw loginErr;
        
        if (!user) {
          return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 });
        }

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            role: user.role,
            balance: user.balance
          }
        });
      }

      // SQLite Fallback
      const user = queryOne('SELECT * FROM members WHERE email = ? AND password = ?', [email, hashedPassword]);
      if (!user) {
        return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          balance: user.balance
        }
      });
    }

    if (action === 'register') {
      if (!name || !email || !phone || !password) {
        return NextResponse.json({ success: false, error: 'Semua kolom wajib diisi' }, { status: 400 });
      }

      const hashedPassword = hash(password);

      if (isSupabaseConfigured()) {
        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('members')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (existingEmail) {
          return NextResponse.json({ success: false, error: 'Email sudah terdaftar' }, { status: 409 });
        }

        // Check if phone already exists
        const { data: existingPhone } = await supabase
          .from('members')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();
        if (existingPhone) {
          return NextResponse.json({ success: false, error: 'Nomor telepon sudah terdaftar' }, { status: 409 });
        }

        // Insert new member
        const { data: newUser, error: registerErr } = await supabase
          .from('members')
          .insert([{
            name,
            email,
            phone,
            address: address || '',
            password: hashedPassword,
            role: 'USER',
            balance: 0
          }])
          .select()
          .single();
        if (registerErr) throw registerErr;

        return NextResponse.json({
          success: true,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            address: newUser.address,
            role: newUser.role,
            balance: newUser.balance
          }
        });
      }

      // SQLite Fallback
      const existingEmail = queryOne('SELECT id FROM members WHERE email = ?', [email]);
      if (existingEmail) {
        return NextResponse.json({ success: false, error: 'Email sudah terdaftar' }, { status: 409 });
      }

      const existingPhone = queryOne('SELECT id FROM members WHERE phone = ?', [phone]);
      if (existingPhone) {
        return NextResponse.json({ success: false, error: 'Nomor telepon sudah terdaftar' }, { status: 409 });
      }

      executeSql(
        'INSERT INTO members (name, email, phone, address, password, role, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone, address || '', hashedPassword, 'USER', 0]
      );

      const newUser = queryOne('SELECT * FROM members WHERE email = ?', [email]);
      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          address: newUser.address,
          role: newUser.role,
          balance: newUser.balance
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth handler error:', error);
    return NextResponse.json({ success: false, error: mapDatabaseError(error) }, { status: 500 });
  }
}
