import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/server/s3';

export async function POST(req: NextRequest) {
  try {
    const { id, data } = await req.json();

    if (!id || !data) {
      return NextResponse.json({ error: 'ID and data are required' }, { status: 400 });
    }

    const key = `projects/${id}.json`;
    await uploadToS3(key, JSON.stringify(data));

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('S3 upload error:', error);
    return NextResponse.json({ error: 'Failed to upload to S3' }, { status: 500 });
  }
}
