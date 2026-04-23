import { Composition, registerRoot } from 'remotion';
import { LectureVideo } from './LectureVideo';
import '../app/globals.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Lecture"
        component={LectureVideo}
        durationInFrames={300} // Default to 10s, will be overridden by render settings
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          aspectRatio: '16:9' as const,
        }}
      />
      <Composition
        id="LectureSocial"
        component={LectureVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          aspectRatio: '9:16' as const,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
