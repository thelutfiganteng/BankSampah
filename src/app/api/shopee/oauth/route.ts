import { NextResponse } from 'next/server';
import { executeSql, queryOne } from '@/lib/db';
import { generateSignature, getShopeeSettings } from '@/lib/shopee';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const SANDBOX_BASE_URL = 'https://partner.test-stable.shopeemobile.com';
const PRODUCTION_BASE_URL = 'https://partner.shopeemobile.com';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');
    const isMock = searchParams.get('mock') === 'true';

    console.log(`Received Shopee OAuth Callback. Code: ${code}, ShopID: ${shopId}, Mock: ${isMock}`);

    if (!code || !shopId) {
      return NextResponse.redirect(new URL('/admin?tab=shopee&error=Missing+auth+code+or+shop+id', request.url));
    }

    const settings = await getShopeeSettings();
    if (!settings) {
      return NextResponse.redirect(new URL('/admin?tab=shopee&error=Shopee+settings+not+initialized', request.url));
    }

    const now = Math.floor(Date.now() / 1000);

    // If it's a simulated OAuth or settings have isSimulated enabled
    if (isMock || settings.isSimulated) {
      console.log('[SIMULATOR] Exchanging code for simulated token...');
      
      const mockAccessToken = 'MOCK_ACCESS_TOKEN_' + Math.floor(Math.random() * 100000);
      const mockRefreshToken = 'MOCK_REFRESH_TOKEN_' + Math.floor(Math.random() * 100000);
      const mockExpiresAt = now + 14400; // 4 hours
      
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('shopee_settings')
          .update({
            access_token: mockAccessToken,
            refresh_token: mockRefreshToken,
            token_expires_at: mockExpiresAt,
            shop_id: shopId,
            is_active: 1
          })
          .eq('id', 1);
        if (error) throw error;
      } else {
        executeSql(`
          UPDATE shopee_settings 
          SET access_token = ?, refresh_token = ?, token_expires_at = ?, shop_id = ?, is_active = 1
          WHERE id = 1
        `, [mockAccessToken, mockRefreshToken, mockExpiresAt, shopId]);
      }

      console.log('[SIMULATOR] Simulated token storage successful.');
      return NextResponse.redirect(new URL('/admin?tab=shopee&oauth_success=true', request.url));
    }

    // --- REAL SHOPEE AUTH TOKEN EXCHANGE ---
    console.log('[REAL API] Exchanging code for real tokens...');
    const host = settings.isSandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
    const path = '/api/v2/public/get_token';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const sign = generateSignature(settings.partnerId, settings.partnerKey, path, timestamp);
    const url = `${host}${path}?partner_id=${settings.partnerId}&timestamp=${timestamp}&sign=${sign}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        partner_id: parseInt(settings.partnerId),
        shop_id: parseInt(shopId),
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error('Shopee real OAuth error:', data);
      return NextResponse.redirect(new URL(`/admin?tab=shopee&error=${encodeURIComponent(data.message || data.error)}`, request.url));
    }

    const accessToken = data.response.access_token;
    const refreshToken = data.response.refresh_token;
    const expiresAt = now + data.response.expire_in; // expire_in is in seconds

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('shopee_settings')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          shop_id: shopId,
          is_active: 1
        })
        .eq('id', 1);
      if (error) throw error;
    } else {
      executeSql(`
        UPDATE shopee_settings 
        SET access_token = ?, refresh_token = ?, token_expires_at = ?, shop_id = ?, is_active = 1
        WHERE id = 1
      `, [accessToken, refreshToken, expiresAt, shopId]);
    }

    console.log('[REAL API] Store authentication completed successfully.');
    return NextResponse.redirect(new URL('/admin?tab=shopee&oauth_success=true', request.url));
  } catch (error: any) {
    console.error('OAuth Callback failure:', error);
    return NextResponse.redirect(new URL(`/admin?tab=shopee&error=${encodeURIComponent(error.message)}`, request.url));
  }
}
