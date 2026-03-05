// Language types
export type Language = 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'en';

// Income range types
export type IncomeRange = 'below-1L' | '1L-3L' | '3L-5L' | 'above-5L';

// User profile types
export interface UserProfile {
  userId: string;
  phoneNumber?: string;
  age: number;
  incomeRange: IncomeRange;
  occupation: string;
  familyComposition: FamilyComposition;
  location: Location;
  primaryNeeds: string[];
  preferredLanguage: Language;
  preferredMode: 'voice' | 'text' | 'both';
  consentGiven: boolean;
  consentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface FamilyComposition {
  adults: number;
  children: number;
  seniors: number;
  dependents?: number;
}

export interface Location {
  state: string;
  district: string;
  block?: string;
  village?: string;
  pincode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Scheme types
export type SchemeCategory = 
  | 'agriculture'
  | 'education'
  | 'health'
  | 'housing'
  | 'employment'
  | 'pension'
  | 'women_welfare'
  | 'child_welfare'
  | 'disability'
  | 'financial_inclusion'
  | 'other';

export type SchemeLevel = 'central' | 'state';

export interface GovernmentScheme {
  schemeId: string;
  officialName: string;
  localizedNames: Record<Language, string>;
  shortDescription: Record<Language, string>;
  detailedDescription: Record<Language, string>;
  category: SchemeCategory;
  level: SchemeLevel;
  state?: string;
  launchDate: Date;
  endDate?: Date;
  active: boolean;
  benefits: Benefit[];
  eligibilityRules: EligibilityRule[];
  applicationProcess?: ApplicationProcess;
  requiredDocuments: DocumentRequirement[];
  officialWebsite?: string;
  helplineNumber?: string;
  officialSources: string[];
  metadata: SchemeMetadata;
}

export interface SchemeMetadata {
  lastUpdated: Date;
  version: number;
  updatedBy: string;
  verificationStatus: 'verified' | 'pending' | 'outdated';
}

export interface Benefit {
  type: 'monetary' | 'subsidy' | 'service' | 'asset';
  description: Record<Language, string>;
  amount?: number;
  frequency?: 'one-time' | 'monthly' | 'annual';
  duration?: string;
}

// Eligibility rule types
export type RuleType =
  | 'age_range'
  | 'income_threshold'
  | 'location'
  | 'occupation'
  | 'family_composition'
  | 'gender'
  | 'disability'
  | 'land_ownership'
  | 'custom';

export type RuleOperator = 'AND' | 'OR' | 'NOT';

export interface EligibilityRule {
  ruleId: string;
  schemeId?: string;
  type: RuleType;
  operator: RuleOperator;
  parameters: RuleParameters;
  description: Record<Language, string>;
  priority: number;
}

export type RuleParameters =
  | AgeRangeParams
  | IncomeThresholdParams
  | LocationParams
  | OccupationParams
  | FamilyCompositionParams
  | CustomParams;

export interface AgeRangeParams {
  minAge?: number;
  maxAge?: number;
}

export interface IncomeThresholdParams {
  maxIncome: number;
  includeRange?: IncomeRange[];
}

export interface LocationParams {
  eligibleStates?: string[];
  eligibleDistricts?: string[];
  ruralOnly?: boolean;
  urbanOnly?: boolean;
}

export interface OccupationParams {
  eligibleOccupations?: string[];
  excludedOccupations?: string[];
}

export interface FamilyCompositionParams {
  minChildren?: number;
  maxChildren?: number;
  minSeniors?: number;
  requiresDependent?: boolean;
}

export interface CustomParams {
  expression: string;
  variables: Record<string, any>;
}

export interface EligibilityResult {
  eligible: boolean;
  confidence: number;
  explanation: string;
  missingCriteria: string[];
  ruleResults: RuleResult[];
}

export interface RuleResult {
  rule: string;
  passed: boolean;
  reason: string;
}

// Application types
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'additional_info_required'
  | 'approved'
  | 'rejected'
  | 'benefits_disbursed';

export interface Application {
  applicationId: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  status: ApplicationStatus;
  referenceNumber?: string;
  currentStage: string;
  submissionDate?: Date;
  estimatedCompletionDate?: Date;
  formData?: Record<string, any>;
  history: StatusUpdate[];
  requiredActions: Action[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusUpdate {
  timestamp: Date;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  notes?: string;
  updatedBy: 'system' | 'user' | 'admin';
}

export interface Action {
  actionType: 'submit_document' | 'verify_information' | 'visit_office';
  description: string;
  deadline?: Date;
  completed: boolean;
}

export interface ApplicationProcess {
  steps: FormStep[];
  estimatedDuration?: string;
  submissionMethods: SubmissionMethod[];
}

export interface FormStep {
  stepNumber: number;
  title: string;
  description: string;
  fields: FormField[];
  commonMistakes: string[];
}

export interface FormField {
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'file';
  required: boolean;
  validation: ValidationRule[];
  helpText: string;
  examples: string[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface SubmissionMethod {
  method: 'online' | 'offline' | 'post';
  location?: string;
  instructions: string;
}

export interface DocumentRequirement {
  documentName: string;
  purpose: string;
  whereToObtain: string;
  alternatives: string[];
  format: 'original' | 'photocopy' | 'digital';
}

// Conversation types
export type Intent =
  | 'onboarding'
  | 'scheme_discovery'
  | 'scheme_details'
  | 'application_help'
  | 'financial_education'
  | 'fraud_check'
  | 'progress_check'
  | 'profile_update'
  | 'general_query';

export interface ConversationContext {
  sessionId: string;
  userId: string;
  language: Language;
  mode: 'voice' | 'text';
  lowBandwidthMode: boolean;
  currentIntent: Intent;
  conversationHistory: Message[];
  entities: Record<string, any>;
  activeScheme?: string;
  activeApplication?: string;
  activeLesson?: string;
  metadata: ConversationMetadata;
}

export interface ConversationMetadata {
  startTime: Date;
  lastInteractionTime: Date;
  turnCount: number;
  userSatisfaction?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  audioUrl?: string;
  confidence?: number;
  language?: Language;
}

// Fraud detection types
export type FraudContentType = 'message' | 'call_transcript' | 'url';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FraudIndicatorType =
  | 'phishing'
  | 'impersonation'
  | 'fake_scheme'
  | 'urgency_tactic'
  | 'suspicious_url';

export interface FraudAnalysisRequest {
  userId: string;
  contentType: FraudContentType;
  content: string;
  metadata?: {
    senderNumber?: string;
    timestamp?: Date;
    platform?: string;
  };
}

export interface FraudAnalysisResult {
  riskLevel: RiskLevel;
  confidence: number;
  indicators: FraudIndicator[];
  explanation: string;
  recommendations: string[];
  reportingGuidance?: string;
}

export interface FraudIndicator {
  type: FraudIndicatorType;
  description: string;
  severity: number;
}

// Financial education types
export type FinancialTopic = 'budgeting' | 'loans' | 'savings' | 'insurance' | 'digital_payments';
export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface FinancialLesson {
  lessonId: string;
  topic: FinancialTopic;
  difficulty: LessonDifficulty;
  duration: number;
  prerequisites: string[];
  content: LessonContent[];
  exercises: Exercise[];
}

export interface LessonContent {
  type: 'explanation' | 'example' | 'scenario' | 'tip';
  text: string;
  audioUrl?: string;
  visualAid?: string;
}

export interface Exercise {
  exerciseId: string;
  question: string;
  type: 'multiple_choice' | 'scenario' | 'calculation';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LearningProgress {
  progressId: string;
  userId: string;
  lessonId: string;
  topic: FinancialTopic;
  status: LessonStatus;
  score?: number;
  completedAt?: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  processingTime: number;
}

// RAG System types
export interface RAGResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  language: Language;
}

export interface Source {
  documentId: string;
  content: string;
  metadata: SourceMetadata;
}

export interface SourceMetadata {
  schemeId?: string;
  schemeName?: string;
  officialSource?: string;
  lastUpdated?: Date;
}

// Scheme recommendation types
export interface SchemeRecommendation {
  scheme: GovernmentScheme;
  eligibilityResult: EligibilityResult;
  estimatedBenefit: number;
  priority: number;
  personalizedExplanation: string;
}
