// API Configuration
// Supports AWS production endpoint and local development
const getApiBaseUrl = (): string => {
  const envUrl = process.env.REACT_APP_API_URL;
  const prodUrl = 'https://j75wbhovsh.execute-api.us-east-1.amazonaws.com/api/v1';

  const url =
    envUrl && envUrl !== 'undefined'
      ? envUrl
      : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/api/v1'
      : prodUrl;

  // Ensure HTTPS in production
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    console.error('Security Warning: API URL must use HTTPS in production');
    return url.replace('http://', 'https://');
  }

  return url.endsWith('/') ? url : `${url}/`;
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Interaction
  VOICE_INTERACT: 'interact/voice',
  TEXT_INTERACT: 'interact/text',

  // Profile
  PROFILE: 'profile',
  PROFILE_BY_ID: (userId: string) => `profile/${userId}`,

  // Schemes
  ELIGIBLE_SCHEMES: (userId: string) => `schemes/eligible/${userId}`,
  SCHEME_DETAILS: (schemeId: string) => `schemes/${schemeId}`,
  SEARCH_SCHEMES: 'schemes/search',

  // Applications
  APPLICATIONS: 'applications',
  APPLICATION_BY_ID: (appId: string) => `applications/${appId}`,
  APPLICATION_SUBMIT: (appId: string) => `applications/${appId}/submit`,
  APPLICATION_TIMELINE: (appId: string) => `applications/${appId}/timeline`,
  USER_APPLICATIONS: (userId: string) => `applications/user/${userId}`,

  // Fraud
  FRAUD_ANALYZE: 'fraud/analyze',
  FRAUD_REPORT: 'fraud/report',
  FRAUD_REPORTS: 'fraud/reports',

  // Education
  LESSONS: 'education/lessons',
  LESSON_DETAILS: (lessonId: string) => `education/lessons/${lessonId}`,
  START_LESSON: (lessonId: string) => `education/lessons/${lessonId}/start`,
  SUBMIT_EXERCISE: (exerciseId: string) =>
    `education/exercises/${exerciseId}/submit`,
  LEARNING_PROGRESS: 'education/progress',

  // System
  HEALTH: 'health',
};

export const LANGUAGES = {
  en: 'English',
  hi: 'हिंदी',
  bn: 'বাংলা',
  mr: 'मराठी',
  ta: 'தமிழ்',
};

export type Language = keyof typeof LANGUAGES;