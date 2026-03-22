import { NextRequest, NextResponse } from 'next/server';
import { getFromS3 } from '@/lib/server/s3';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const key = `projects/${id}.json`;
    const result = await getFromS3(key);

    if (!result || !result.body) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const content = await result.body.transformToString();
    const data = JSON.parse(content);
    return NextResponse.json({ project: data });
  } catch (error) {
    console.error('S3 get error:', error);
    return NextResponse.json({ error: 'Failed to fetch from S3' }, { status: 500 });
  }
}
