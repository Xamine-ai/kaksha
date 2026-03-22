import { NextRequest, NextResponse } from 'next/server';
import { listFromS3, getFromS3, getS3Url } from '@/lib/server/s3';

export async function GET() {
  try {
    const list = await listFromS3('projects/');
    const projects = await Promise.all(
      list.map(async (item) => {
        if (!item.Key) return null;
        try {
          const result = await getFromS3(item.Key);
          if (!result || !result.body) return null;
          const content = await (result.body as any).transformToString();
          const data = JSON.parse(content);
          return {
            id: data.id || data.stage?.id,
            name: data.stage?.name || item.Key.replace('projects/', '').replace('.json', ''),
            description: data.stage?.description,
            sceneCount: data.scenes?.length || 0,
            createdAt: data.stage?.createdAt || item.LastModified?.getTime(),
            updatedAt: data.stage?.updatedAt || item.LastModified?.getTime(),
            url: getS3Url(item.Key),
          };
        } catch (e) {
          console.error(`Failed to parse S3 item ${item.Key}:`, e);
          return null;
        }
      })
    );

    return NextResponse.json({ projects: projects.filter(Boolean) });
  } catch (error) {
    console.error('S3 list error:', error);
    return NextResponse.json({ error: 'Failed to list from S3' }, { status: 500 });
  }
}
