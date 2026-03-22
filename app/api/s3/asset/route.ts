import { NextRequest, NextResponse } from 'next/server';
import { getFromS3 } from '@/lib/server/s3';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const { body, contentType } = await getFromS3(key);

    if (!body) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Convert readable stream to a format Next.js can return
    return new Response(body as any, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('S3 asset fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset from S3' }, { status: 500 });
  }
}
