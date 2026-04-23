import type { VideoProviderId, VideoProviderConfig } from './types';

export const VIDEO_PROVIDERS: Record<VideoProviderId, VideoProviderConfig> = {
  seedance: {
    id: 'seedance',
    name: 'Seedance',
    requiresApiKey: true,
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com',
    models: [
      { id: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro' },
      { id: 'doubao-seedance-1-0-pro-250528', name: 'Seedance 1.0 Pro' },
      {
        id: 'doubao-seedance-1-0-pro-fast-251015',
        name: 'Seedance 1.0 Pro Fast',
      },
      {
        id: 'doubao-seedance-1-0-lite-t2v-250428',
        name: 'Seedance 1.0 Lite T2V',
      },
    ],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '9:16', '3:4', '21:9'],
    supportedDurations: [5, 10],
    supportedResolutions: ['480p', '720p', '1080p'],
    maxDuration: 10,
  },
  kling: {
    id: 'kling',
    name: 'Kling',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api-beijing.klingai.com',
    models: [
      { id: 'kling-v2-6', name: 'Kling V2.6' },
      { id: 'kling-v1-6', name: 'Kling V1.6' },
    ],
    supportedAspectRatios: ['16:9', '1:1', '9:16'],
    supportedDurations: [5, 10],
    maxDuration: 10,
  },
  veo: {
    id: 'veo',
    name: 'Veo',
    requiresApiKey: true,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    models: [
      { id: 'veo-3.1-fast-generate-001', name: 'Veo 3.1 Fast' },
      { id: 'veo-3.1-generate-001', name: 'Veo 3.1' },
      { id: 'veo-3.0-fast-generate-001', name: 'Veo 3.0 Fast' },
      { id: 'veo-3.0-generate-001', name: 'Veo 3.0' },
      { id: 'veo-2.0-generate-001', name: 'Veo 2.0' },
    ],
    supportedAspectRatios: ['16:9', '1:1', '9:16'],
    supportedDurations: [8],
    supportedResolutions: ['720p'],
    maxDuration: 8,
  },
  sora: {
    id: 'sora',
    name: 'Sora',
    requiresApiKey: true,
    models: [],
    supportedAspectRatios: ['16:9', '1:1', '9:16'],
    maxDuration: 20,
  },
};
