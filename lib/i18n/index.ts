import { defaultLocale, type Locale } from './types';
export { type Locale, defaultLocale } from './types';
import { settingsZhCN, settingsEnUS, settingsHiIN } from './settings';
import { commonZhCN, commonEnUS, commonHiIN } from './common';
import { stageZhCN, stageEnUS } from './stage';
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
    ...stageEnUS, // Fallback for missing major sections
    ...chatEnUS,
    ...generationEnUS,
    ...settingsHiIN,
  },
  'bn-IN': {}, 'te-IN': {}, 'mr-IN': {}, 'ta-IN': {}, 'ur-IN': {}, 
  'kn-IN': {}, 'gu-IN': {}, 'ml-IN': {}, 'or-IN': {}, 'pa-IN': {},
} as const;

export type TranslationKey = keyof (typeof translations)[typeof defaultLocale];

export function translate(locale: Locale, key: string): string {
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

  return (typeof value === 'string' ? value : undefined) ?? key;
}

export function getClientTranslation(key: string): string {
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

  return translate(locale, key);
}
