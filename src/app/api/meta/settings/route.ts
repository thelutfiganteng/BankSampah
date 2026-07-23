import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const catalogId = process.env.META_CATALOG_ID || '';
    const accessToken = process.env.META_SYSTEM_USER_TOKEN || '';
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';

    return NextResponse.json({
      success: true,
      data: {
        app_id: appId,
        catalog_id: catalogId,
        is_active: catalogId && accessToken ? 1 : 0,
        access_token_preview: accessToken ? `${accessToken.slice(0, 12)}...${accessToken.slice(-6)}` : '',
        app_secret_set: !!appSecret,
        source: 'environment_variables',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
