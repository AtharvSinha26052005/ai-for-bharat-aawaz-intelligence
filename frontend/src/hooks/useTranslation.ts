import { Language } from '../types';
import { translations, TranslationKeys } from '../translations';

export const useTranslation = (language: Language) => {
  const t = translations[language] || translations.en;
  
  return { t };
};

// Helper function to get nested translation value
export const getNestedTranslation = (
  obj: any,
  path: string
): string => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
};
