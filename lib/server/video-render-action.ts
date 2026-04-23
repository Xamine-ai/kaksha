import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createLogger } from '@/lib/logger';
import { uploadToS3 } from '@/lib/server/s3';
import type { Stage, Scene } from '@/lib/types/stage';

const log = createLogger('VideoRender');

export async function renderLectureVideo(
  stage: Stage,
  scenes: Scene[],
  options: {
    aspectRatio: '16:9' | '9:16';
    classroomId: string;
  }
) {
  const { aspectRatio, classroomId } = options;
  console.log('[VideoRender] renderLectureVideo called for:', classroomId);
  log.info(`Starting video render for classroom: ${classroomId} (${aspectRatio})`);
  
  // DEBUG: Only render the first scene for speed
  const testScenes = scenes.slice(0, 1);
  log.info(`DEBUG: Rendering only the first scene (out of ${scenes.length})`);
  log.info(`DEBUG: First scene actions: ${JSON.stringify(testScenes[0].actions || [])}`);

  try {
    // 1. Bundle the Remotion project
    log.info('Bundling Remotion project...');
    const bundleLocation = await bundle({
      entryPoint: path.resolve('./remotion/Root.tsx'),
      webpackOverride: (config) => {
        const webpack = eval('require')('webpack');
        const { enableTailwind } = eval('require')('@remotion/tailwind-v4');
        const emptyModule = path.resolve('./remotion/empty.js');
        
        let newConfig = enableTailwind(config);
        
        return {
          ...newConfig,
          plugins: [
            ...(newConfig.plugins || []),
            new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
              resource.request = emptyModule;
            }),
          ],
          resolve: {
            ...newConfig.resolve,
            alias: {
              ...newConfig.resolve?.alias,
              '@': path.resolve('./'),
              // Standard mocks as a fallback
              'assert': emptyModule,
              'async_hooks': emptyModule,
              'buffer': emptyModule,
              'child_process': emptyModule,
              'crypto': emptyModule,
              'events': emptyModule,
              'fs': emptyModule,
              'http': emptyModule,
              'https': emptyModule,
              'net': emptyModule,
              'os': emptyModule,
              'path': emptyModule,
              'process': emptyModule,
              'readline': emptyModule,
              'stream': emptyModule,
              'tls': emptyModule,
              'tty': emptyModule,
              'url': emptyModule,
              'util': emptyModule,
              'zlib': emptyModule,
              'console': emptyModule,
            },
            fallback: {
              ...config.resolve?.fallback,
              crypto: false,
              fs: false,
              path: false,
              os: false,
              stream: false,
              buffer: false,
              assert: false,
              async_hooks: false,
              util: false,
              url: false,
              http: false,
              https: false,
              zlib: false,
              child_process: false,
              readline: false,
              tls: false,
              net: false,
              console: false,
            },
          },
        };
      },
    });

    if (!bundleLocation) {
      throw new Error('Bundling failed: bundleLocation is undefined');
    }
    log.info(`Bundle created at: ${bundleLocation}`);

    // 1.5 Generate TTS on the server so Remotion can access it
    log.info(`[RenderAction] Triggering server-side TTS for classroom: ${classroomId} with ${scenes.length} scenes`);
    try {
      const { generateTTSForClassroom } = await import('@/lib/server/classroom-media-generation');
      await generateTTSForClassroom(scenes, classroomId, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', []);
      log.info(`[RenderAction] Server-side TTS generation completed for: ${classroomId}`);
    } catch (ttsErr) {
      log.error(`[RenderAction] Server-side TTS generation FAILED:`, ttsErr);
      // We don't throw here to see if the render can still proceed with whatever is available, 
      // but the logs will tell us the truth.
    }

    // 2. Select the composition
    const sceneDurations = testScenes.map((s: any) => s.totalDuration || 5);
    const durationInFrames = Math.round(sceneDurations.reduce((a, b) => a + b, 0) * 30); // 30fps

    log.info(`Selecting composition: ${aspectRatio === '9:16' ? 'LectureSocial' : 'Lecture'} with duration ${durationInFrames} frames (${(durationInFrames/30).toFixed(1)}s)`);
    log.info(`Action: Selecting composition with ${testScenes.length} scenes`);
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: aspectRatio === '9:16' ? 'LectureSocial' : 'Lecture',
      inputProps: {
        scenes: testScenes,
        aspectRatio,
        classroomId,
        sceneDurations, // Pass individual durations
        baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    });

    if (!composition) {
      throw new Error('Composition selection failed: composition is undefined');
    }

    // 3. Render the video
    const exportDir = path.resolve('./public/exports');
    const filename = `video-${classroomId}-${Date.now()}.mp4`;
    const outputLocation = path.join(exportDir, filename);
    log.info(`Rendering to: ${outputLocation}`);
    
    // Ensure export dir exists
    const fs = await import('fs/promises');
    await fs.mkdir(exportDir, { recursive: true });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation,
      inputProps: {
        scenes: testScenes,
        aspectRatio,
        classroomId,
        baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    });

    log.info(`Video rendered successfully at: ${outputLocation}`);

    // 4. Return local URL (Skipping S3 upload as per user request)
    const resultUrl = `/exports/${filename}`;
    log.info(`Result URL: ${resultUrl}`);

    return {
      success: true,
      url: resultUrl,
      filename,
    };
  } catch (err) {
    log.error('Video render failed:', err);
    throw err;
  }
}
