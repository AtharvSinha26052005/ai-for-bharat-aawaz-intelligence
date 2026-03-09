// Language types
export type Language = 'hi' | 'ta' | 'bn' | 'mr' | 'en';

// User Profile
export interface UserProfile {
  userId: string;
  phoneNumber?: string;
  aadharNumber?: string; // Encrypted
  age: number;
  incomeRange: string;
  occupation: string;
  gender?: 'Male' | 'Female' | 'Other';
  caste?: 'General' | 'OBC' | 'SC' | 'ST' | 'Other';
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

// Semantic search profile for AI-powered scheme recommendations
export interface SemanticSearchProfile {
  age: number;
  income: number;
  gender: 'Male' | 'Female' | 'Other';
  caste: 'General' | 'OBC' | 'SC' | 'ST' | 'Other';
  state: string;
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

// Interested Scheme Request
export interface InterestedSchemeCreateRequest {
  profile_id: string;
  scheme_name: string;
  scheme_slug?: string;
  scheme_description?: string;
  scheme_benefits?: string;
  scheme_ministry?: string;
  scheme_apply_link?: string;
}
