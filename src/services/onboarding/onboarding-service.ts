import { UserProfile, Language } from '../../types';
import { profileService } from '../profile/profile-service';
import { schemeService } from '../scheme/scheme-service';
import { voiceService } from '../voice/voice-service';
import { redisClient } from '../../db/redis';
import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Onboarding state
 */
interface OnboardingState {
  userId: string;
  currentStep: number;
  totalSteps: number;
  collectedData: Partial<UserProfile>;
  language: Language;
  mode: 'voice' | 'text';
  startTime: Date;
  skipped: boolean;
}

/**
 * Onboarding step
 */
interface OnboardingStep {
  id: string;
  question: Record<Language, string>;
  field: keyof UserProfile | 'welcome' | 'tour' | 'recommendations';
  validator?: (value: any) => boolean;
  optional?: boolean;
}

/**
 * Onboarding Service
 * Manages user onboarding flow
 */
export class OnboardingService {
  private readonly ONBOARDING_TTL = 1800; // 30 minutes
  private readonly MAX_INTRO_DURATION = 120; // 2 minutes in seconds

  private readonly onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      question: {
        en: 'Welcome! I am your AI assistant for government welfare schemes. I can help you find schemes, apply for benefits, learn about finances, and protect you from fraud. This will take less than 2 minutes. Shall we begin?',
        hi: 'स्वागत है! मैं सरकारी कल्याण योजनाओं के लिए आपका AI सहायक हूं। मैं आपको योजनाएं खोजने, लाभ के लिए आवेदन करने, वित्त के बारे में सीखने और धोखाधड़ी से बचाने में मदद कर सकता हूं। इसमें 2 मिनट से कम समय लगेगा। क्या हम शुरू करें?',
        ta: 'வரவேற்கிறோம்! நான் அரசு நல திட்டங்களுக்கான உங்கள் AI உதவியாளர். திட்டங்களைக் கண்டறிய, நன்மைகளுக்கு விண்ணப்பிக்க, நிதி பற்றி கற்க மற்றும் மோசடியிலிருந்து உங்களைப் பாதுகாக்க நான் உதவ முடியும். இது 2 நிமிடங்களுக்கும் குறைவாக எடுக்கும். தொடங்கலாமா?',
        te: 'స్వాగతం! నేను ప్రభుత్వ సంక్షేమ పథకాల కోసం మీ AI సహాయకుడిని. పథకాలను కనుగొనడానికి, ప్రయోజనాల కోసం దరఖాస్తు చేసుకోవడానికి, ఆర్థిక విషయాలు నేర్చుకోవడానికి మరియు మోసం నుండి మిమ్మల్ని రక్షించడానికి నేను సహాయం చేయగలను. ఇది 2 నిమిషాల కంటే తక్కువ సమయం పడుతుంది. మనం ప్రారంభించాలా?',
        bn: 'স্বাগতম! আমি সরকারি কল্যাণ প্রকল্পের জন্য আপনার AI সহায়ক। আমি আপনাকে প্রকল্প খুঁজতে, সুবিধার জন্য আবেদন করতে, অর্থ সম্পর্কে শিখতে এবং প্রতারণা থেকে রক্ষা করতে সাহায্য করতে পারি। এটি 2 মিনিটের কম সময় নেবে। আমরা কি শুরু করব?',
        mr: 'स्वागत आहे! मी सरकारी कल्याण योजनांसाठी तुमचा AI सहाय्यक आहे। मी तुम्हाला योजना शोधण्यात, फायद्यांसाठी अर्ज करण्यात, वित्त शिकण्यात आणि फसवणुकीपासून संरक्षण करण्यात मदत करू शकतो. यास 2 मिनिटांपेक्षा कमी वेळ लागेल. आपण सुरुवात करू का?',
      },
      field: 'welcome',
    },
    {
      id: 'age',
      question: {
        en: 'Great! Let me help you find the best schemes. First, what is your age?',
        hi: 'बढ़िया! मैं आपको सर्वोत्तम योजनाएं खोजने में मदद करता हूं। पहले, आपकी उम्र क्या है?',
        ta: 'சிறப்பு! சிறந்த திட்டங்களைக் கண்டறிய நான் உங்களுக்கு உதவுகிறேன். முதலில், உங்கள் வயது என்ன?',
        te: 'గొప్ప! ఉత్తమ పథకాలను కనుగొనడంలో నేను మీకు సహాయం చేస్తాను. మొదట, మీ వయస్సు ఎంత?',
        bn: 'দুর্দান্ত! আমি আপনাকে সেরা প্রকল্প খুঁজতে সাহায্য করি। প্রথমে, আপনার বয়স কত?',
        mr: 'छान! मी तुम्हाला सर्वोत्तम योजना शोधण्यात मदत करतो. प्रथम, तुमचे वय काय आहे?',
      },
      field: 'age',
      validator: (value: any) => {
        const age = parseInt(value);
        return !isNaN(age) && age >= 1 && age <= 120;
      },
    },
    {
      id: 'income',
      question: {
        en: 'What is your approximate annual household income? (in Rupees)',
        hi: 'आपकी अनुमानित वार्षिक घरेलू आय क्या है? (रुपये में)',
        ta: 'உங்கள் தோராயமான வருடாந்திர குடும்ப வருமானம் என்ன? (ரூபாயில்)',
        te: 'మీ సుమారు వార్షిక కుటుంబ ఆదాయం ఎంత? (రూపాయల్లో)',
        bn: 'আপনার আনুমানিক বার্ষিক পরিবারের আয় কত? (টাকায়)',
        mr: 'तुमचे अंदाजे वार्षिक घरगुती उत्पन्न किती आहे? (रुपयांमध्ये)',
      },
      field: 'incomeRange',
    },
    {
      id: 'occupation',
      question: {
        en: 'What is your occupation? (e.g., farmer, laborer, self-employed, student)',
        hi: 'आपका व्यवसाय क्या है? (जैसे, किसान, मजदूर, स्व-रोजगार, छात्र)',
        ta: 'உங்கள் தொழில் என்ன? (எ.கா., விவசாயி, தொழிலாளி, சுயதொழில், மாணவர்)',
        te: 'మీ వృత్తి ఏమిటి? (ఉదా., రైతు, కూలీ, స్వయం ఉపాధి, విద్యార్థి)',
        bn: 'আপনার পেশা কি? (যেমন, কৃষক, শ্রমিক, স্ব-নিযুক্ত, ছাত্র)',
        mr: 'तुमचा व्यवसाय काय आहे? (उदा., शेतकरी, मजूर, स्वयंरोजगार, विद्यार्थी)',
      },
      field: 'occupation',
    },
    {
      id: 'location',
      question: {
        en: 'Which state and district do you live in?',
        hi: 'आप किस राज्य और जिले में रहते हैं?',
        ta: 'நீங்கள் எந்த மாநிலம் மற்றும் மாவட்டத்தில் வசிக்கிறீர்கள்?',
        te: 'మీరు ఏ రాష్ట్రం మరియు జిల్లాలో నివసిస్తున్నారు?',
        bn: 'আপনি কোন রাজ্য এবং জেলায় থাকেন?',
        mr: 'तुम्ही कोणत्या राज्यात आणि जिल्ह्यात राहता?',
      },
      field: 'location',
    },
    {
      id: 'tour',
      question: {
        en: 'Perfect! Would you like a quick tour of what I can do? (Say yes or no)',
        hi: 'बिल्कुल सही! क्या आप मेरी क्षमताओं का त्वरित दौरा चाहेंगे? (हां या नहीं कहें)',
        ta: 'சரியானது! நான் என்ன செய்ய முடியும் என்பதற்கான விரைவான சுற்றுப்பயணத்தை விரும்புகிறீர்களா? (ஆம் அல்லது இல்லை என்று சொல்லுங்கள்)',
        te: 'పర్ఫెక్ట్! నేను ఏమి చేయగలనో త్వరిత పర్యటన కావాలా? (అవును లేదా కాదు అని చెప్పండి)',
        bn: 'নিখুঁত! আমি কি করতে পারি তার একটি দ্রুত ট্যুর চান? (হ্যাঁ বা না বলুন)',
        mr: 'परिपूर्ण! मी काय करू शकतो याचा द्रुत दौरा घ्यायचा आहे का? (होय किंवा नाही म्हणा)',
      },
      field: 'tour',
      optional: true,
    },
    {
      id: 'recommendations',
      question: {
        en: 'Excellent! Let me find schemes you may be eligible for...',
        hi: 'उत्कृष्ट! मुझे उन योजनाओं को खोजने दें जिनके लिए आप पात्र हो सकते हैं...',
        ta: 'சிறப்பானது! நீங்கள் தகுதியுடையதாக இருக்கக்கூடிய திட்டங்களைக் கண்டறிய அனுமதிக்கவும்...',
        te: 'అద్భుతం! మీరు అర్హత కలిగి ఉండే పథకాలను కనుగొనడానికి నన్ను అనుమతించండి...',
        bn: 'চমৎকার! আমাকে এমন প্রকল্প খুঁজতে দিন যার জন্য আপনি যোগ্য হতে পারেন...',
        mr: 'उत्कृष्ट! मला अशा योजना शोधू द्या ज्यासाठी तुम्ही पात्र असू शकता...',
      },
      field: 'recommendations',
    },
  ];

  /**
   * Starts onboarding for a new user
   * @param userId - User ID
   * @param language - Preferred language
   * @param mode - Interaction mode
   * @returns Initial onboarding message
   */
  async startOnboarding(
    userId: string,
    language: Language,
    mode: 'voice' | 'text'
  ): Promise<{
    message: string;
    audioMessage?: Buffer;
    canSkip: boolean;
    progress: { current: number; total: number };
  }> {
    try {
      // Create onboarding state
      const state: OnboardingState = {
        userId,
        currentStep: 0,
        totalSteps: this.onboardingSteps.length,
        collectedData: {},
        language,
        mode,
        startTime: new Date(),
        skipped: false,
      };

      await this.saveState(userId, state);

      const firstStep = this.onboardingSteps[0];
      const message = firstStep.question[language];

      // Generate audio if voice mode
      let audioMessage: Buffer | undefined;
      if (mode === 'voice') {
        const ttsResult = await voiceService.synthesizeSpeech(message, { language, voiceGender: 'female' });
        audioMessage = ttsResult.audioContent;
      }

      logger.info('Onboarding started', { userId, language, mode });

      return {
        message,
        audioMessage,
        canSkip: true,
        progress: {
          current: 1,
          total: this.onboardingSteps.length,
        },
      };
    } catch (error) {
      logger.error('Failed to start onboarding', { userId, error });
      throw error;
    }
  }

  /**
   * Processes onboarding response
   * @param userId - User ID
   * @param response - User response
   * @returns Next step or completion
   */
  async processResponse(
    userId: string,
    response: string
  ): Promise<{
    completed: boolean;
    message: string;
    audioMessage?: Buffer;
    canSkip: boolean;
    progress: { current: number; total: number };
    recommendations?: any[];
  }> {
    try {
      const state = await this.getState(userId);

      if (!state) {
        throw new Error('Onboarding state not found');
      }

      // Check if user wants to skip
      if (this.isSkipResponse(response)) {
        return await this.skipOnboarding(userId, state);
      }

      const currentStep = this.onboardingSteps[state.currentStep];

      // Process response based on current step
      await this.processStepResponse(state, currentStep, response);

      // Move to next step
      state.currentStep++;

      // Check if onboarding is complete
      if (state.currentStep >= this.onboardingSteps.length) {
        return await this.completeOnboarding(userId, state);
      }

      // Get next step
      const nextStep = this.onboardingSteps[state.currentStep];
      const message = nextStep.question[state.language];

      // Save updated state
      await this.saveState(userId, state);

      // Generate audio if voice mode
      let audioMessage: Buffer | undefined;
      if (state.mode === 'voice') {
        const ttsResult = await voiceService.synthesizeSpeech(message, { language: state.language, voiceGender: 'female' });
        audioMessage = ttsResult.audioContent;
      }

      return {
        completed: false,
        message,
        audioMessage,
        canSkip: nextStep.optional || false,
        progress: {
          current: state.currentStep + 1,
          total: this.onboardingSteps.length,
        },
      };
    } catch (error) {
      logger.error('Failed to process onboarding response', { userId, error });
      throw error;
    }
  }

  /**
   * Skips onboarding
   * @param userId - User ID
   * @param state - Onboarding state
   * @returns Skip confirmation
   */
  private async skipOnboarding(
    userId: string,
    state: OnboardingState
  ): Promise<any> {
    state.skipped = true;
    await this.deleteState(userId);

    const message = {
      en: 'No problem! You can always update your profile later. How can I help you today?',
      hi: 'कोई बात नहीं! आप बाद में अपनी प्रोफ़ाइल अपडेट कर सकते हैं। आज मैं आपकी कैसे मदद कर सकता हूं?',
      ta: 'பரவாயில்லை! நீங்கள் எப்போதும் உங்கள் சுயவிவரத்தை பின்னர் புதுப்பிக்கலாம். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
      te: 'సమస్య లేదు! మీరు ఎల్లప్పుడూ మీ ప్రొఫైల్‌ను తర్వాత నవీకరించవచ్చు. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?',
      bn: 'কোন সমস্যা নেই! আপনি সবসময় পরে আপনার প্রোফাইল আপডেট করতে পারেন। আজ আমি আপনাকে কিভাবে সাহায্য করতে পারি?',
      mr: 'काही हरकत नाही! तुम्hi नंतर तुमची प्रोफाइल अपडेट करू शकता. आज मी तुम्हाला कशी मदत करू शकतो?',
    }[state.language];

    logger.info('Onboarding skipped', { userId });

    return {
      completed: true,
      message,
      canSkip: false,
      progress: { current: state.totalSteps, total: state.totalSteps },
    };
  }

  /**
   * Completes onboarding
   * @param userId - User ID
   * @param state - Onboarding state
   * @returns Completion with recommendations
   */
  private async completeOnboarding(
    userId: string,
    state: OnboardingState
  ): Promise<any> {
    try {
      // Create user profile
      await profileService.createProfile({
        userId,
        ...state.collectedData,
        preferredLanguage: state.language,
        preferredMode: state.mode,
        consentGiven: true,
        consentDate: new Date(),
      } as any);

      // Get scheme recommendations
      const recommendations = await schemeService.getEligibleSchemes(userId);

      // Generate completion message
      let message = {
        en: `Great! I found ${recommendations.length} schemes you may be eligible for. Here are the top 3:\n\n`,
        hi: `बढ़िया! मुझे ${recommendations.length} योजनाएं मिलीं जिनके लिए आप पात्र हो सकते हैं। यहां शीर्ष 3 हैं:\n\n`,
        ta: `சிறப்பு! நீங்கள் தகுதியுடையதாக இருக்கக்கூடிய ${recommendations.length} திட்டங்களைக் கண்டேன். இதோ முதல் 3:\n\n`,
        te: `గొప్ప! మీరు అర్హత కలిగి ఉండే ${recommendations.length} పథకాలను కనుగొన్నాను. ఇక్కడ టాప్ 3:\n\n`,
        bn: `দুর্দান্ত! আমি ${recommendations.length} প্রকল্প পেয়েছি যার জন্য আপনি যোগ্য হতে পারেন। এখানে শীর্ষ 3:\n\n`,
        mr: `छान! मला ${recommendations.length} योजना सापडल्या ज्यासाठी तुम्ही पात्र असू शकता. येथे शीर्ष 3 आहेत:\n\n`,
      }[state.language];

      const topRecommendations = recommendations.slice(0, 3);
      for (let i = 0; i < topRecommendations.length; i++) {
        const rec = topRecommendations[i];
        message += `${i + 1}. ${rec.scheme.officialName}\n`;
        message += `   Benefit: ₹${rec.estimatedBenefit.toLocaleString()}\n\n`;
      }

      // Clean up state
      await this.deleteState(userId);

      // Calculate onboarding duration
      const duration = (Date.now() - state.startTime.getTime()) / 1000;

      logger.info('Onboarding completed', {
        userId,
        duration,
        recommendationsCount: recommendations.length,
      });

      return {
        completed: true,
        message,
        canSkip: false,
        progress: { current: state.totalSteps, total: state.totalSteps },
        recommendations: topRecommendations,
      };
    } catch (error) {
      logger.error('Failed to complete onboarding', { userId, error });
      throw error;
    }
  }

  /**
   * Processes step response
   * @param state - Onboarding state
   * @param step - Current step
   * @param response - User response
   */
  private async processStepResponse(
    state: OnboardingState,
    step: OnboardingStep,
    response: string
  ): Promise<void> {
    // Skip processing for informational steps
    if (step.field === 'welcome' || step.field === 'recommendations') {
      return;
    }

    // Handle tour step
    if (step.field === 'tour') {
      // Just acknowledge, don't store
      return;
    }

    // Validate and store response
    if (step.validator && !step.validator(response)) {
      throw new Error(`Invalid response for ${step.field}`);
    }

    // Store in collected data
    if (step.field === 'age') {
      state.collectedData.age = parseInt(response);
    } else if (step.field === 'incomeRange') {
      // Parse income to determine range
      const income = parseFloat(response.replace(/[^\d.]/g, ''));
      if (income < 100000) {
        state.collectedData.incomeRange = 'below-1L';
      } else if (income < 300000) {
        state.collectedData.incomeRange = '1L-3L';
      } else if (income < 500000) {
        state.collectedData.incomeRange = '3L-5L';
      } else {
        state.collectedData.incomeRange = 'above-5L';
      }
    } else if (step.field === 'occupation') {
      state.collectedData.occupation = response;
    } else if (step.field === 'location') {
      // Parse location (simplified)
      const parts = response.split(',');
      state.collectedData.location = {
        state: parts[0]?.trim() || '',
        district: parts[1]?.trim() || '',
        block: '',
        village: '',
        pincode: '',
      };
    }
  }

  /**
   * Checks if response is a skip request
   * @param response - User response
   * @returns True if skip
   */
  private isSkipResponse(response: string): boolean {
    const skipKeywords = ['skip', 'later', 'not now', 'छोड़ें', 'बाद में', 'தவிர்', 'దాటవేయి', 'এড়িয়ে যান', 'वगळा'];
    const lowerResponse = response.toLowerCase();
    return skipKeywords.some((keyword) => lowerResponse.includes(keyword));
  }

  /**
   * Gets onboarding state
   * @param userId - User ID
   * @returns Onboarding state
   */
  private async getState(userId: string): Promise<OnboardingState | null> {
    try {
      const data = await redisClient.get(`onboarding:${userId}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get onboarding state', { userId, error });
      return null;
    }
  }

  /**
   * Saves onboarding state
   * @param userId - User ID
   * @param state - Onboarding state
   */
  private async saveState(userId: string, state: OnboardingState): Promise<void> {
    try {
      await redisClient.set(
        `onboarding:${userId}`,
        JSON.stringify(state),
        this.ONBOARDING_TTL
      );
    } catch (error) {
      logger.error('Failed to save onboarding state', { userId, error });
    }
  }

  /**
   * Deletes onboarding state
   * @param userId - User ID
   */
  private async deleteState(userId: string): Promise<void> {
    try {
      await redisClient.del(`onboarding:${userId}`);
    } catch (error) {
      logger.error('Failed to delete onboarding state', { userId, error });
    }
  }
}

export const onboardingService = new OnboardingService();
