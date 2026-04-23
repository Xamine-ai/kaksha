import { Composition, Sequence, Audio, useVideoConfig } from 'remotion';
import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import type { Scene } from '@/lib/types/stage';
import type { SlideContent } from '@/lib/types/stage';

export interface LectureVideoProps {
  scenes: Scene[];
  aspectRatio: '16:9' | '9:16';
  baseUrl?: string;
  classroomId?: string;
}

const DEFAULT_SCENE_DURATION = 5; // 5 seconds

const resolveUrl = (url: string, baseUrl?: string) => {
  if (!url || !baseUrl) return url;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const LectureVideo: React.FC<LectureVideoProps> = ({ 
  scenes = [], 
  aspectRatio = '16:9',
  baseUrl,
  classroomId,
  sceneDurations = []
}) => {
  const { width, height } = useVideoConfig();
  console.log(`[Remotion] LectureVideo (Content) rendering with ${scenes.length} scenes. BaseUrl: ${baseUrl}, ClassroomId: ${classroomId}`);
  
  const durations = sceneDurations.length > 0 ? sceneDurations.map(d => Math.round(d * 30)) : scenes.map(() => DEFAULT_SCENE_DURATION * 30);
  
  let currentFrame = 0;

  return (
    <div style={{ flex: 1, backgroundColor: 'black', width, height }}>
      {scenes.map((scene, index) => {
        const duration = durations[index];
        const startFrame = currentFrame;
        currentFrame += duration;

        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={duration}>
            <SceneRenderer 
              scene={scene} 
              width={width} 
              height={height} 
              aspectRatio={aspectRatio} 
              baseUrl={baseUrl}
              classroomId={classroomId}
              index={index}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

const SceneRenderer: React.FC<{
  scene: Scene;
  width: number;
  height: number;
  aspectRatio: '16:9' | '9:16';
  baseUrl?: string;
  classroomId?: string;
  index: number;
}> = ({ scene, width, height, aspectRatio, baseUrl, classroomId, index }) => {
  console.log(`[Remotion] SceneRenderer index ${index} type ${scene.type} id ${scene.id}`);
  console.log(`[Remotion] Scene actions:`, JSON.stringify(scene.actions || []));
  
  if (scene.type === 'slide') {
    const slideContent = scene.content as SlideContent;
    
    // Create a copy of the slide with resolved URLs for Remotion
    const resolvedSlide = {
        ...slideContent.canvas,
        background: {
            ...slideContent.canvas.background,
            image: slideContent.canvas.background?.image ? resolveUrl(slideContent.canvas.background.image, baseUrl) : undefined
        },
        elements: (slideContent.canvas.elements || []).map(el => {
            if (el.type === 'image' && (el as any).src) {
                return { ...el, src: resolveUrl((el as any).src, baseUrl) };
            }
            return el;
        })
    };

    return (
      <div style={{ 
          width, 
          height, 
          position: 'relative', 
          backgroundColor: 'white',
          display: 'grid',
          placeItems: 'center'
      }}>
         <div style={{ 
           position: 'absolute', 
           top: 20, 
           left: 20, 
           zIndex: 100, 
           backgroundColor: 'rgba(0,0,0,0.7)', 
           color: 'white', 
           padding: '10px 20px', 
           borderRadius: 10,
           fontSize: 24,
           fontFamily: 'sans-serif'
         }}>
           Scene {index + 1}: {scene.title} ({scene.type})
         </div>
          <div style={{ 
            width: width, 
            height: height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white'
          }}>
             <ThumbnailSlide 
                 slide={resolvedSlide as any}
                 size={width}
                 viewportSize={1000}
                 viewportRatio={9/16} // Standard landscape slide ratio
             />
          </div>
          {/* Audio playback - Sequenced */}
          {(() => {
             let audioOffsetSec = 0;
             return scene.actions?.map(action => {
                if (action.type === 'speech') {
                   const audioUrl = action.audioUrl;
                   const durationSec = (action as any).duration || 5; // Fallback to 5s
                   
                   if (audioUrl) {
                      const resolvedAudioUrl = resolveUrl(audioUrl, baseUrl);
                      const startFromFrame = Math.round(audioOffsetSec * 30); // 30fps
                      
                      console.log(`[Remotion] Rendering Audio at ${audioOffsetSec}s: ${resolvedAudioUrl}`);
                      
                      audioOffsetSec += durationSec + 0.5; // Add 0.5s pause between speeches
                      
                      return (
                        <Sequence key={action.id} from={startFromFrame} durationInFrames={Infinity}>
                          <Audio 
                            src={resolvedAudioUrl} 
                          />
                        </Sequence>
                      );
                   }
                }
                return null;
             });
          })()}
      </div>
    );
  }
  
  // Placeholder for Quiz/Interactive
  return (
    <div style={{ 
      width, 
      height, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'sans-serif',
      position: 'relative'
    }}>
      <div style={{ 
           position: 'absolute', 
           top: 20, 
           left: 20, 
           zIndex: 100, 
           backgroundColor: 'rgba(0,0,0,0.7)', 
           color: 'white', 
           padding: '10px 20px', 
           borderRadius: 10,
           fontSize: 24
         }}>
           Scene {index + 1}: {scene.title} ({scene.type})
         </div>
      <h1 style={{ fontSize: 60 }}>{scene.title}</h1>
      <p style={{ fontSize: 30 }}>{scene.type.toUpperCase()} CONTENT</p>
      <div style={{ marginTop: 40, padding: 20, border: '2px dashed #444' }}>
         Interactive content - Visit full lecture to interact
      </div>
    </div>
  );
};
