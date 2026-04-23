import { NextRequest, NextResponse } from 'next/server';
import { renderLectureVideo } from '@/lib/server/video-render-action';
import { createLogger } from '@/lib/logger';

const log = createLogger('VideoApi');

export async function POST(req: NextRequest) {
  try {
    const { stage, scenes, aspectRatio, classroomId } = await req.json();

    if (!stage || !scenes || !classroomId) {
      log.error(`Missing required fields: stage=${!!stage}, scenes=${!!scenes}, classroomId=${!!classroomId}`);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    log.info(`API: Starting render for classroom ${classroomId} with ${scenes.length} scenes`);

    // This might take a while, so in production we'd use a background job
    // For now, we'll run it and return the result
    const result = await renderLectureVideo(stage, scenes, {
      aspectRatio: aspectRatio || '16:9',
      classroomId,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Video render API error:', error);
    return NextResponse.json({ 
      error: 'Failed to render video', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
