import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/server/s3';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const assetId = formData.get('assetId') as string;
    const prefix = (formData.get('prefix') as string) || 'media/audio';

    if (!file || !assetId) {
      return NextResponse.json({ error: 'File and assetId are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Key: ${prefix}/${assetId}.${extension}
    const key = `${prefix}/${assetId}.${file.type.split('/')[1] || 'mp3'}`;
    
    await uploadToS3(key, buffer, file.type);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('S3 asset upload error:', error);
    return NextResponse.json({ error: 'Failed to upload asset to S3' }, { status: 500 });
  }
}
