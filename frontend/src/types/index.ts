// Language types
export type Language = 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'en';

// User Profile
export interface UserProfile {
  userId: string;
  age: number;
  incomeRange: string;
  occupation: string;
  location: {
    state: string;
    district: string;
    block?: string;
    village?: string;
    pincode?: string;
  };
  preferredLanguage: Language;
  preferredMode: 'voice' | 'text' | 'both';
}

// Government Scheme
export interface GovernmentScheme {
  schemeId: string;
  officialName: string;
  localizedName: string;
  shortDescription: string;
  category: string;
  level: 'central' | 'state';
  estimatedBenefit?: number;
  officialWebsite?: string;
  helplineNumber?: string;
}

// Scheme Recommendation
export interface SchemeRecommendation {
  scheme: GovernmentScheme;
  eligibility: {
    eligible: boolean;
    confidence: number;
    explanation: string;
  };
  estimatedBenefit: number;
  priority: number;
  personalizedExplanation: string;
}

// Application
export interface Application {
  applicationId: string;
  schemeId: string;
  schemeName: string;
  referenceNumber?: string;
  status: string;
  currentStage: string;
  submissionDate?: string;
  estimatedCompletionDate?: string;
}

// Fraud Analysis
export interface FraudAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  fraudTypes: string[];
  indicators: string[];
  explanation: string;
  recommendations: string[];
}

// Financial Lesson
export interface FinancialLesson {
  lessonId: string;
  topic: string;
  title: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
