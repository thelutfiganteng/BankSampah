import { NextResponse } from 'next/server';
import { retryPendingSyncs, isMetaConfigured } from '@/lib/metaCatalog';

/**
 * POST /api/meta-catalog/retry
 *
 * Retry all products with meta_sync_status = 'pending_sync'.
 * Designed to be called by:
 *   1. A scheduled cron job (e.g., every 5 minutes)
 *   2. The admin panel's manual "Retry" button
 *
 * Security: This endpoint should ideally be protected by an API key
 * or admin session check in production. For now it only runs server-side logic.
 */
export async function POST() {
  try {
    if (!isMetaConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Meta Catalog API belum dikonfigurasi.',
      }, { status: 503 });
    }

    const result = await retryPendingSyncs();

    return NextResponse.json({
      success: true,
      message: `Retry selesai: ${result.retried} produk dicoba, ${result.succeeded} berhasil, ${result.failed} gagal.`,
      data: result,
    });
  } catch (error: any) {
    console.error('[META CATALOG RETRY] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/meta-catalog/retry
 *
 * Returns the count of products pending Meta sync.
 */
export async function GET() {
  try {
    // Dynamic import to avoid issues if db is not initialized
    const { queryAll } = await import('@/lib/db');
    const { isSupabaseConfigured, supabase } = await import('@/lib/supabaseClient');

    let count = 0;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('meta_sync_status', 'pending_sync');
      if (!error) count = data?.length || 0;
    } else {
      try {
        const rows = queryAll("SELECT COUNT(*) as count FROM products WHERE meta_sync_status = 'pending_sync'");
        count = rows[0]?.count || 0;
      } catch {
        // Column may not exist
      }
    }

    return NextResponse.json({
      success: true,
      pending_count: count,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
