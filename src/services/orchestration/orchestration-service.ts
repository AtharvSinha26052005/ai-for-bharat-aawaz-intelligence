import { UserProfile, Language } from '../../types';
import { redisClient } from '../../db/redis';
import { voiceService } from '../voice/voice-service';
import { schemeService } from '../scheme/scheme-service';
import { profileService } from '../profile/profile-service';
import { formAssistantService } from '../form/form-assistant-service';
import { financialEducatorService } from '../education/financial-educator-service';
import { fraudDetectorService } from '../fraud/fraud-detector-service';
import { progressTrackerService } from '../tracker/progress-tracker-service';
import { simpleLanguageService } from '../accessibility/simple-language-service';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Intent types
 */
export type Intent =
  | 'ONBOARDING'
  | 'SCHEME_DISCOVERY'
  | 'SCHEME_DETAILS'
  | 'APPLICATION_HELP'
  | 'FINANCIAL_EDUCATION'
  | 'FRAUD_CHECK'
  | 'PROGRESS_CHECK'
  | 'PROFILE_UPDATE'
  | 'GENERAL_QUERY'
  | 'UNKNOWN';

/**
 * Conversation context
 */
interface ConversationContext {
  sessionId: string;
  userId: string;
  currentIntent: Intent;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  entities: Record<string, any>;
  activeResources: {
    schemeId?: string;
    applicationId?: string;
    lessonId?: string;
  };
  preferredLanguage: Language;
  preferredMode: 'voice' | 'text' | 'both';
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * Interaction request
 */
export interface InteractionRequest {
  sessionId?: string;
  userId: string;
  input: string;
  inputMode: 'voice' | 'text';
  audioData?: Buffer;
  language?: Language;
}

/**
 * Interaction response
 */
export interface InteractionResponse {
  sessionId: string;
  textResponse: string;
  audioResponse?: Buffer;
  intent: Intent;
  suggestions?: string[];
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

/**
 * Core Orchestration Service
 * Manages conversation flow and routes to specialized services
 */
export class OrchestrationService {
  private readonly SESSION_TTL = 3600; // 1 hour

  /**
   * Processes user interaction
   * @param request - Interaction request
   * @returns Interaction response
   */
  async processInteraction(request: InteractionRequest): Promise<InteractionResponse> {
    try {
      // Get or create session
      const sessionId = request.sessionId || uuidv4();
      let context = await this.getContext(sessionId);

      if (!context) {
        context = await this.createContext(sessionId, request.userId, request.language);
      }

      // Process voice input if provided
      let textInput = request.input;
      if (request.inputMode === 'voice' && request.audioData) {
        const transcription = await voiceService.transcribeAudio(
          request.audioData,
          context.preferredLanguage
        );
        textInput = transcription.text;
      }

      // Add to conversation history
      context.conversationHistory.push({
        role: 'user',
        content: textInput,
        timestamp: new Date(),
      });

      // Detect intent
      const intent = await this.detectIntent(textInput, context);
      context.currentIntent = intent;

      // Route to appropriate service
      const textResponse = await this.routeToService(intent, textInput, context);

      // Simplify response for low-literacy users
      const simplifiedResponse = this.simplifyResponse(textResponse, context.preferredLanguage);

      // Add response to history
      context.conversationHistory.push({
        role: 'assistant',
        content: simplifiedResponse,
        timestamp: new Date(),
      });

      // Generate suggestions
      const suggestions = this.generateSuggestions(intent, context);

      // Check if confirmation is needed
      const { requiresConfirmation, confirmationMessage } = this.checkConfirmationNeeded(
        intent,
        textInput
      );

      // Update context
      context.lastActiveAt = new Date();
      await this.saveContext(context);

      // Generate audio response if needed
      let audioResponse: Buffer | undefined;
      if (context.preferredMode === 'voice') {
        const ttsResult = await voiceService.synthesizeSpeech(
          simplifiedResponse,
          {
            language: context.preferredLanguage,
            voiceGender: 'female',
          }
        );
        audioResponse = ttsResult.audioContent;
      }

      logger.info('Interaction processed', {
        sessionId,
        userId: request.userId,
        intent,
        inputMode: request.inputMode,
      });

      return {
        sessionId,
        textResponse: simplifiedResponse,
        audioResponse,
        intent,
        suggestions,
        requiresConfirmation,
        confirmationMessage,
      };
    } catch (error) {
      logger.error('Interaction processing failed', { error });
      throw error;
    }
  }

  /**
   * Gets conversation context
   * @param sessionId - Session ID
   * @returns Conversation context or null
   */
  private async getContext(sessionId: string): Promise<ConversationContext | null> {
    try {
      const data = await redisClient.get(`session:${sessionId}`);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get context', { sessionId, error });
      return null;
    }
  }

  /**
   * Creates new conversation context
   * @param sessionId - Session ID
   * @param userId - User ID
   * @param language - Preferred language
   * @returns Conversation context
   */
  private async createContext(
    sessionId: string,
    userId: string,
    language?: Language
  ): Promise<ConversationContext> {
    // Get user profile
    const profile = await profileService.getProfile(userId);

    const context: ConversationContext = {
      sessionId,
      userId,
      currentIntent: 'UNKNOWN',
      conversationHistory: [],
      entities: {},
      activeResources: {},
      preferredLanguage: language || profile.preferredLanguage,
      preferredMode: profile.preferredMode,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    await this.saveContext(context);

    return context;
  }

  /**
   * Saves conversation context
   * @param context - Conversation context
   */
  private async saveContext(context: ConversationContext): Promise<void> {
    try {
      await redisClient.set(
        `session:${context.sessionId}`,
        JSON.stringify(context),
        this.SESSION_TTL
      );
    } catch (error) {
      logger.error('Failed to save context', { sessionId: context.sessionId, error });
    }
  }

  /**
   * Detects user intent from input
   * @param input - User input
   * @param context - Conversation context
   * @returns Detected intent
   */
  private async detectIntent(input: string, context: ConversationContext): Promise<Intent> {
    const lowerInput = input.toLowerCase();

    // Keyword-based intent detection
    if (
      lowerInput.includes('scheme') ||
      lowerInput.includes('योजना') ||
      lowerInput.includes('eligible') ||
      lowerInput.includes('benefit')
    ) {
      if (lowerInput.includes('apply') || lowerInput.includes('application')) {
        return 'APPLICATION_HELP';
      }
      if (lowerInput.includes('detail') || lowerInput.includes('information')) {
        return 'SCHEME_DETAILS';
      }
      return 'SCHEME_DISCOVERY';
    }

    if (
      lowerInput.includes('fraud') ||
      lowerInput.includes('scam') ||
      lowerInput.includes('fake') ||
      lowerInput.includes('धोखाधड़ी')
    ) {
      return 'FRAUD_CHECK';
    }

    if (
      lowerInput.includes('learn') ||
      lowerInput.includes('education') ||
      lowerInput.includes('financial') ||
      lowerInput.includes('budget') ||
      lowerInput.includes('saving')
    ) {
      return 'FINANCIAL_EDUCATION';
    }

    if (
      lowerInput.includes('status') ||
      lowerInput.includes('progress') ||
      lowerInput.includes('track') ||
      lowerInput.includes('application')
    ) {
      return 'PROGRESS_CHECK';
    }

    if (
      lowerInput.includes('profile') ||
      lowerInput.includes('update') ||
      lowerInput.includes('change')
    ) {
      return 'PROFILE_UPDATE';
    }

    // Check if this is a new user (onboarding)
    if (context.conversationHistory.length === 0) {
      return 'ONBOARDING';
    }

    // Default to general query
    return 'GENERAL_QUERY';
  }

  /**
   * Routes request to appropriate service
   * @param intent - Detected intent
   * @param input - User input
   * @param context - Conversation context
   * @returns Response text
   */
  private async routeToService(
    intent: Intent,
    input: string,
    context: ConversationContext
  ): Promise<string> {
    try {
      switch (intent) {
        case 'ONBOARDING':
          return this.handleOnboarding(context);

        case 'SCHEME_DISCOVERY':
          return await this.handleSchemeDiscovery(input, context);

        case 'SCHEME_DETAILS':
          return await this.handleSchemeDetails(input, context);

        case 'APPLICATION_HELP':
          return await this.handleApplicationHelp(input, context);

        case 'FINANCIAL_EDUCATION':
          return await this.handleFinancialEducation(input, context);

        case 'FRAUD_CHECK':
          return await this.handleFraudCheck(input, context);

        case 'PROGRESS_CHECK':
          return await this.handleProgressCheck(input, context);

        case 'PROFILE_UPDATE':
          return await this.handleProfileUpdate(input, context);

        case 'GENERAL_QUERY':
        default:
          return await this.handleGeneralQuery(input, context);
      }
    } catch (error) {
      logger.error('Service routing failed', { intent, error });
      return 'I apologize, but I encountered an error. Please try again.';
    }
  }

  /**
   * Handles onboarding
   */
  private handleOnboarding(context: ConversationContext): string {
    return `Welcome! I'm your AI assistant for government welfare schemes. I can help you:
1. Find schemes you're eligible for
2. Apply for schemes
3. Learn about financial literacy
4. Check fraud alerts
5. Track your applications

What would you like to do today?`;
  }

  /**
   * Handles scheme discovery
   */
  private async handleSchemeDiscovery(
    input: string,
    context: ConversationContext
  ): Promise<string> {
    const recommendations = await schemeService.getEligibleSchemes(context.userId);

    if (recommendations.length === 0) {
      return 'I could not find any schemes you are currently eligible for. Would you like to update your profile or search for specific schemes?';
    }

    // Limit to top 3-5 recommendations
    const topRecommendations = recommendations.slice(0, 3);

    let response = `I found ${recommendations.length} schemes you may be eligible for. Here are the top 3:\n\n`;

    for (let i = 0; i < topRecommendations.length; i++) {
      const rec = topRecommendations[i];
      response += `${i + 1}. ${rec.scheme.officialName}\n`;
      response += `   Estimated Benefit: ₹${rec.estimatedBenefit.toLocaleString()}\n`;
      response += `   ${rec.personalizedExplanation.substring(0, 100)}...\n\n`;
    }

    response += 'Would you like to know more about any of these schemes?';

    return response;
  }

  /**
   * Handles scheme details
   */
  private async handleSchemeDetails(
    input: string,
    context: ConversationContext
  ): Promise<string> {
    // Extract scheme ID from context or input
    const schemeId = context.activeResources.schemeId;

    if (!schemeId) {
      return 'Which scheme would you like to know more about? Please provide the scheme name or number.';
    }

    const scheme = await schemeService.getSchemeById(schemeId, context.preferredLanguage);

    return `${scheme.officialName}\n\n${scheme.detailedDescription[context.preferredLanguage]}\n\nWould you like help applying for this scheme?`;
  }

  /**
   * Handles application help
   */
  private async handleApplicationHelp(
    input: string,
    context: ConversationContext
  ): Promise<string> {
    const schemeId = context.activeResources.schemeId;

    if (!schemeId) {
      return 'Which scheme would you like to apply for? Please provide the scheme name.';
    }

    const guide = await formAssistantService.generateApplicationGuide(
      schemeId,
      context.userId,
      context.preferredLanguage
    );

    let response = `Application Guide for ${guide.schemeName}\n\n`;
    response += `Steps:\n`;
    guide.steps.slice(0, 5).forEach((step, i) => {
      response += `${i + 1}. ${step}\n`;
    });

    response += `\nRequired Documents: ${guide.documentChecklist.length}\n`;
    response += '\nWould you like detailed information about any step?';

    return response;
  }

  /**
   * Handles financial education
   */
  private async handleFinancialEducation(
    input: string,
    context: ConversationContext
  ): Promise<string> {
    const lessons = await financialEducatorService.getLessons(context.preferredLanguage);

    let response = 'Financial Literacy Lessons:\n\n';
    lessons.slice(0, 5).forEach((lesson, i) => {
      response += `${i + 1}. ${lesson.title[context.preferredLanguage]} (${lesson.duration} min)\n`;
    });

    response += '\nWhich topic would you like to learn about?';

    return response;
  }

  /**
   * Handles fraud check
   */
  private async handleFraudCheck(input: string, context: ConversationContext): Promise<string> {
    const analysis = await fraudDetectorService.analyzeContent({
      content: input,
      contentType: 'text',
      language: context.preferredLanguage,
      userId: context.userId,
    });

    let response = `Fraud Analysis:\n`;
    response += `Risk Level: ${analysis.riskLevel.toUpperCase()}\n\n`;
    response += `${analysis.explanation}\n\n`;

    if (analysis.recommendations.length > 0) {
      response += 'Recommendations:\n';
      analysis.recommendations.forEach((rec, i) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    return response;
  }

  /**
   * Handles progress check
   */
  private async handleProgressCheck(input: string, context: ConversationContext): Promise<string> {
    const applications = await progressTrackerService.getUserApplications(context.userId);

    if (applications.length === 0) {
      return 'You have no active applications. Would you like to apply for a scheme?';
    }

    let response = `Your Applications:\n\n`;
    applications.slice(0, 5).forEach((app, i) => {
      response += `${i + 1}. ${app.schemeName}\n`;
      response += `   Status: ${app.status}\n`;
      response += `   Reference: ${app.referenceNumber}\n\n`;
    });

    return response;
  }

  /**
   * Handles profile update
   */
  private async handleProfileUpdate(
    input: string,
    context: ConversationContext
  ): Promise<string> {
    return 'What would you like to update in your profile? (age, income, occupation, location)';
  }

  /**
   * Handles general query
   */
  private async handleGeneralQuery(
    input: string,
    context: ConversationContext
  ): Promise<string> {
    return `I can help you with:
- Finding eligible schemes
- Applying for schemes
- Financial education
- Fraud detection
- Application tracking

What would you like to do?`;
  }

  /**
   * Generates suggestions based on intent
   */
  private generateSuggestions(intent: Intent, context: ConversationContext): string[] {
    const suggestions: Record<Intent, string[]> = {
      ONBOARDING: ['Find schemes', 'Learn about benefits', 'Check fraud alerts'],
      SCHEME_DISCOVERY: ['View scheme details', 'Apply for scheme', 'Find more schemes'],
      SCHEME_DETAILS: ['Apply now', 'Check eligibility', 'View similar schemes'],
      APPLICATION_HELP: ['Start application', 'View documents', 'Get help'],
      FINANCIAL_EDUCATION: ['Start lesson', 'View all topics', 'Take quiz'],
      FRAUD_CHECK: ['Report fraud', 'Learn more', 'Check another message'],
      PROGRESS_CHECK: ['View details', 'Update application', 'Track another'],
      PROFILE_UPDATE: ['Update age', 'Update income', 'Update location'],
      GENERAL_QUERY: ['Find schemes', 'Learn', 'Check status'],
      UNKNOWN: ['Find schemes', 'Get help', 'Learn more'],
    };

    return suggestions[intent] || suggestions.UNKNOWN;
  }

  /**
   * Checks if confirmation is needed
   */
  private checkConfirmationNeeded(
    intent: Intent,
    input: string
  ): { requiresConfirmation: boolean; confirmationMessage?: string } {
    const lowerInput = input.toLowerCase();

    // Check for irreversible actions
    if (lowerInput.includes('submit') || lowerInput.includes('apply')) {
      return {
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to submit this application?',
      };
    }

    if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
      return {
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to delete this? This action cannot be undone.',
      };
    }

    return { requiresConfirmation: false };
  }

  /**
   * Simplifies response text for low-literacy users
   * @param text - Original response text
   * @param language - Language code
   * @returns Simplified text
   */
  private simplifyResponse(text: string, language: Language): string {
    return simpleLanguageService.simplify(text, language);
  }
}

export const orchestrationService = new OrchestrationService();
