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
    
    // Normalize extensions from mime types
    const mimeMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/aac': 'aac',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
    };
    
    const extension = mimeMap[file.type] || file.type.split('/')[1] || (prefix === 'media/audio' ? 'mp3' : 'png');
    const key = `${prefix}/${assetId}.${extension}`;
    
    await uploadToS3(key, buffer, file.type);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('S3 asset upload error:', error);
    return NextResponse.json({ error: 'Failed to upload asset to S3' }, { status: 500 });
  }
}
