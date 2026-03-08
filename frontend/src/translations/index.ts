import { Language } from '../types';
import { en } from './en';
import { hi } from './hi';
import { bn } from './bn';
import { mr } from './mr';
import { ta } from './ta';

export type TranslationKeys = typeof en;

export const translations: Record<Language, TranslationKeys> = {
  en,
  hi,
  bn,
  mr,
  ta,
};
