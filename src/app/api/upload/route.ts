import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File yang diunggah harus berupa gambar (JPG, PNG, WEBP).' }, { status: 400 });
    }

    // Max 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Ukuran file gambar maksimal 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extension deduction
    const ext = file.type.split('/')[1] || 'jpg';
    const filename = `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

    // ─── 1. If Supabase Storage is configured ─────────────────────
    if (isSupabaseConfigured()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      // Use service role key if available for elevated storage privileges (bypassing RLS policies)
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      const supabaseStorageClient = createClient(supabaseUrl, supabaseKey);
      const bucketName = 'product-images';

      // Attempt upload
      let { data, error } = await supabaseStorageClient.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: true,
        });

      // If bucket doesn't exist, create public bucket and retry
      if (error && (error.message?.includes('not found') || error.message?.includes('Bucket'))) {
        console.log(`[STORAGE] Creating bucket "${bucketName}"...`);
        try {
          await supabaseStorageClient.storage.createBucket(bucketName, { public: true });
          const retry = await supabaseStorageClient.storage
            .from(bucketName)
            .upload(filename, buffer, {
              contentType: file.type,
              upsert: true,
            });
          data = retry.data;
          error = retry.error;
        } catch (bucketErr) {
          console.error('[STORAGE] Bucket creation failed:', bucketErr);
        }
      }

      if (error) {
        console.error('[STORAGE] Supabase Storage upload error:', error);
        throw new Error(`Gagal upload ke Supabase Storage: ${error.message}`);
      }

      const { data: publicUrlData } = supabaseStorageClient.storage
        .from(bucketName)
        .getPublicUrl(filename);

      console.log(`[STORAGE] Uploaded to Supabase Storage: ${publicUrlData.publicUrl}`);

      return NextResponse.json({
        success: true,
        url: publicUrlData.publicUrl,
        filename,
        source: 'supabase_storage',
      });
    }

    // ─── 2. Local Fallback (for SQLite / offline dev mode) ────────
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const localUrl = `${protocol}://${host}/uploads/${filename}`;

    console.log(`[STORAGE] Uploaded to local disk: ${localUrl}`);

    return NextResponse.json({
      success: true,
      url: localUrl,
      filename,
      source: 'local_disk',
    });
  } catch (error: any) {
    console.error('[UPLOAD API] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
