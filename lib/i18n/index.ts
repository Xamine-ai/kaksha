import { defaultLocale, type Locale } from './types';
export { type Locale, defaultLocale } from './types';
import { settingsZhCN, settingsEnUS, settingsHiIN } from './settings';
import { commonZhCN, commonEnUS, commonHiIN } from './common';
import { stageZhCN, stageEnUS, stageHiIN } from './stage';
import { chatZhCN, chatEnUS } from './chat';
import { generationZhCN, generationEnUS } from './generation';

export const translations: Record<Locale, any> = {
  'zh-CN': {
    ...commonZhCN,
    ...stageZhCN,
    ...chatZhCN,
    ...generationZhCN,
    ...settingsZhCN,
  },
  'en-US': {
    ...commonEnUS,
    ...stageEnUS,
    ...chatEnUS,
    ...generationEnUS,
    ...settingsEnUS,
  },
  'hi-IN': {
    ...commonHiIN,
    ...stageHiIN,
    ...chatEnUS,
    ...generationEnUS,
    ...settingsHiIN,
  },
  'bn-IN': {}, 'te-IN': {}, 'mr-IN': {}, 'ta-IN': {}, 'ur-IN': {}, 
  'kn-IN': {}, 'gu-IN': {}, 'ml-IN': {}, 'or-IN': {}, 'pa-IN': {},
} as const;

export type TranslationKey = keyof (typeof translations)[typeof defaultLocale];

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  
  // Try selected locale first
  let value: any = translations[locale];
  for (const k of keys) {
    value = value?.[k];
  }

  // Fallback to en-US if missing
  if (typeof value !== 'string' && locale !== 'en-US') {
    value = translations['en-US'];
    for (const k of keys) {
      value = value?.[k];
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Handle simple interpolation {key}
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      value = (value as string).replace(`{${k}}`, String(v));
    });
  }

  return value;
}

export function getClientTranslation(key: string, params?: Record<string, string | number>): string {
  let locale: Locale = defaultLocale;

  if (typeof window !== 'undefined') {
    try {
      const storedLocale = localStorage.getItem('locale') as Locale;
      if (storedLocale && translations[storedLocale]) {
        locale = storedLocale;
      }
    } catch {
      // localStorage unavailable, keep default locale
    }
  }

  return translate(locale, key, params);
}
