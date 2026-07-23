import { NextResponse } from 'next/server';
import { testConnection, isMetaConfigured } from '@/lib/metaCatalog';

/**
 * GET /api/meta-catalog/test
 *
 * Health check endpoint — tests connectivity to Meta Graph API
 * by fetching catalog metadata.
 *
 * Returns:
 *   - Catalog name & product count if successful
 *   - Error message if connection fails
 *   - 503 if Meta is not configured
 */
export async function GET() {
  try {
    if (!isMetaConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Meta Catalog API belum dikonfigurasi. Set META_CATALOG_ID dan META_SYSTEM_USER_TOKEN di .env.local',
      }, { status: 503 });
    }

    const result = await testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Koneksi ke Meta Catalog berhasil!`,
        data: result.data,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 502 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
