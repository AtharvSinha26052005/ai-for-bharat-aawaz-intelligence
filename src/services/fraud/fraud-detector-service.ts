import { Language } from '../../types';
import { ragService } from '../rag/rag-service';
import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { config } from '../../config';

/**
 * Fraud types
 */
export type FraudType =
  | 'phishing'
  | 'fake-scheme'
  | 'impersonation'
  | 'advance-fee'
  | 'identity-theft'
  | 'fake-website'
  | 'phone-scam';

/**
 * Risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Fraud pattern
 */
interface FraudPattern {
  patternId: string;
  type: FraudType;
  keywords: string[];
  regex?: string;
  description: Record<Language, string>;
  severity: RiskLevel;
}

/**
 * Fraud analysis request
 */
export interface FraudAnalysisRequest {
  content: string;
  contentType: 'text' | 'url' | 'phone' | 'email';
  language: Language;
  userId?: string;
}

/**
 * Fraud analysis result
 */
export interface FraudAnalysisResult {
  riskLevel: RiskLevel;
  confidence: number;
  fraudTypes: FraudType[];
  indicators: string[];
  explanation: string;
  recommendations: string[];
  reportingGuidance?: string;
}

/**
 * Fraud report
 */
interface FraudReport {
  reportId: string;
  userId: string;
  content: string;
  fraudType: FraudType;
  riskLevel: RiskLevel;
  reportedAt: Date;
  status: 'pending' | 'verified' | 'false-positive';
}

/**
 * Fraud Detector Service
 * Analyzes content for fraud indicators and provides guidance
 */
export class FraudDetectorService {
  private fraudPatterns: FraudPattern[] = [];
  private maliciousDomains: Set<string> = new Set();

  constructor() {
    this.initializeFraudPatterns();
    this.loadMaliciousDomains();
  }

  /**
   * Analyzes content for fraud indicators
   * @param request - Fraud analysis request
   * @returns Fraud analysis result
   */
  async analyzeContent(request: FraudAnalysisRequest): Promise<FraudAnalysisResult> {
    try {
      const indicators: string[] = [];
      const fraudTypes: FraudType[] = [];
      let riskScore = 0;

      // Pattern matching analysis
      const patternMatches = this.matchPatterns(request.content, request.language);
      for (const match of patternMatches) {
        indicators.push(match.description[request.language]);
        if (!fraudTypes.includes(match.type)) {
          fraudTypes.push(match.type);
        }
        riskScore += this.getRiskScore(match.severity);
      }

      // URL analysis if content contains URLs
      if (request.contentType === 'url' || this.containsURL(request.content)) {
        const urlAnalysis = await this.analyzeURLs(request.content);
        indicators.push(...urlAnalysis.indicators);
        fraudTypes.push(...urlAnalysis.fraudTypes);
        riskScore += urlAnalysis.riskScore;
      }

      // LLM-based content analysis
      const llmAnalysis = await this.analyzeLLM(request.content, request.language);
      indicators.push(...llmAnalysis.indicators);
      fraudTypes.push(...llmAnalysis.fraudTypes);
      riskScore += llmAnalysis.riskScore;

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(riskScore);

      // Generate explanation
      const explanation = await this.generateExplanation(
        fraudTypes,
        indicators,
        request.language
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        riskLevel,
        fraudTypes,
        request.language
      );

      // Generate reporting guidance if high risk
      const reportingGuidance =
        riskLevel === 'high' || riskLevel === 'critical'
          ? await this.generateReportingGuidance(fraudTypes, request.language)
          : undefined;

      const result: FraudAnalysisResult = {
        riskLevel,
        confidence: Math.min(riskScore / 100, 1),
        fraudTypes: [...new Set(fraudTypes)],
        indicators,
        explanation,
        recommendations,
        reportingGuidance,
      };

      logger.info('Fraud analysis completed', {
        userId: request.userId,
        riskLevel,
        fraudTypes,
        indicatorCount: indicators.length,
      });

      return result;
    } catch (error) {
      logger.error('Fraud analysis failed', { error });
      throw error;
    }
  }

  /**
   * Reports fraud
   * @param userId - User ID
   * @param content - Fraud content
   * @param fraudType - Type of fraud
   * @param riskLevel - Risk level
   * @returns Report ID
   */
  async reportFraud(
    userId: string,
    content: string,
    fraudType: FraudType,
    riskLevel: RiskLevel
  ): Promise<string> {
    try {
      const query = `
        INSERT INTO fraud_reports (user_id, content, fraud_type, risk_level, reported_at, status)
        VALUES ($1, $2, $3, $4, NOW(), 'pending')
        RETURNING report_id
      `;

      const result = await db.query(query, [userId, content, fraudType, riskLevel]);
      const reportId = result.rows[0].report_id;

      logger.info('Fraud reported', { userId, reportId, fraudType, riskLevel });

      return reportId;
    } catch (error) {
      logger.error('Failed to report fraud', { userId, error });
      throw error;
    }
  }

  /**
   * Matches content against fraud patterns
   * @param content - Content to analyze
   * @param language - Language
   * @returns Matched patterns
   */
  private matchPatterns(content: string, language: Language): FraudPattern[] {
    const matches: FraudPattern[] = [];
    const lowerContent = content.toLowerCase();

    for (const pattern of this.fraudPatterns) {
      // Check keywords
      const keywordMatch = pattern.keywords.some((keyword) =>
        lowerContent.includes(keyword.toLowerCase())
      );

      // Check regex if available
      let regexMatch = false;
      if (pattern.regex) {
        try {
          const regex = new RegExp(pattern.regex, 'i');
          regexMatch = regex.test(content);
        } catch (e) {
          logger.warn('Invalid regex pattern', { patternId: pattern.patternId });
        }
      }

      if (keywordMatch || regexMatch) {
        matches.push(pattern);
      }
    }

    return matches;
  }

  /**
   * Analyzes URLs in content
   * @param content - Content containing URLs
   * @returns URL analysis result
   */
  private async analyzeURLs(
    content: string
  ): Promise<{ indicators: string[]; fraudTypes: FraudType[]; riskScore: number }> {
    const indicators: string[] = [];
    const fraudTypes: FraudType[] = [];
    let riskScore = 0;

    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);

        // Check against malicious domains
        if (this.maliciousDomains.has(urlObj.hostname)) {
          indicators.push(`Malicious domain detected: ${urlObj.hostname}`);
          fraudTypes.push('fake-website');
          riskScore += 40;
        }

        // Check for suspicious URL patterns
        if (this.isSuspiciousURL(url)) {
          indicators.push('Suspicious URL structure detected');
          fraudTypes.push('phishing');
          riskScore += 20;
        }

        // Check for typosquatting
        if (this.isTyposquatting(urlObj.hostname)) {
          indicators.push('Possible typosquatting domain');
          fraudTypes.push('phishing');
          riskScore += 30;
        }
      } catch (e) {
        indicators.push('Invalid or malformed URL');
        riskScore += 10;
      }
    }

    return { indicators, fraudTypes, riskScore };
  }

  /**
   * Analyzes content using LLM
   * @param content - Content to analyze
   * @param language - Language
   * @returns LLM analysis result
   */
  private async analyzeLLM(
    content: string,
    language: Language
  ): Promise<{ indicators: string[]; fraudTypes: FraudType[]; riskScore: number }> {
    try {
      const query = `Analyze this content for fraud indicators such as urgency tactics, impersonation, social engineering, or requests for money/personal information: "${content}"`;

      const response = await ragService.retrieveAndGenerate(query, language);

      // Parse response for indicators
      const indicators = this.parseIndicators(response.answer);
      const fraudTypes = this.inferFraudTypes(response.answer);
      const riskScore = indicators.length * 15;

      return { indicators, fraudTypes, riskScore };
    } catch (error) {
      logger.error('LLM fraud analysis failed', { error });
      return { indicators: [], fraudTypes: [], riskScore: 0 };
    }
  }

  /**
   * Generates explanation for fraud detection
   * @param fraudTypes - Detected fraud types
   * @param indicators - Fraud indicators
   * @param language - Language
   * @returns Explanation
   */
  private async generateExplanation(
    fraudTypes: FraudType[],
    indicators: string[],
    language: Language
  ): Promise<string> {
    if (fraudTypes.length === 0) {
      return language === 'en'
        ? 'No significant fraud indicators detected.'
        : 'कोई महत्वपूर्ण धोखाधड़ी संकेतक नहीं मिला।';
    }

    const query = `Explain in simple language why this content might be fraudulent. Fraud types: ${fraudTypes.join(', ')}. Indicators: ${indicators.join(', ')}`;

    const response = await ragService.retrieveAndGenerate(query, language);
    return response.answer;
  }

  /**
   * Generates recommendations
   * @param riskLevel - Risk level
   * @param fraudTypes - Fraud types
   * @param language - Language
   * @returns Recommendations
   */
  private async generateRecommendations(
    riskLevel: RiskLevel,
    fraudTypes: FraudType[],
    language: Language
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (riskLevel === 'low') {
      recommendations.push('Stay vigilant and verify information from official sources');
    } else if (riskLevel === 'medium') {
      recommendations.push('Do not share personal information');
      recommendations.push('Verify the source through official channels');
    } else {
      recommendations.push('DO NOT respond or engage with this content');
      recommendations.push('DO NOT share any personal or financial information');
      recommendations.push('Report this to authorities immediately');
      recommendations.push('Block the sender/number');
    }

    return recommendations;
  }

  /**
   * Generates reporting guidance
   * @param fraudTypes - Fraud types
   * @param language - Language
   * @returns Reporting guidance
   */
  private async generateReportingGuidance(
    fraudTypes: FraudType[],
    language: Language
  ): Promise<string> {
    const query = `Provide step-by-step guidance on how to report ${fraudTypes.join(', ')} fraud to authorities in India`;

    const response = await ragService.retrieveAndGenerate(query, language);

    return response.answer;
  }

  /**
   * Calculates risk level from score
   * @param riskScore - Risk score
   * @returns Risk level
   */
  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Gets risk score for severity
   * @param severity - Severity level
   * @returns Risk score
   */
  private getRiskScore(severity: RiskLevel): number {
    const scores: Record<RiskLevel, number> = {
      low: 10,
      medium: 20,
      high: 35,
      critical: 50,
    };
    return scores[severity];
  }

  /**
   * Checks if content contains URLs
   * @param content - Content to check
   * @returns True if contains URLs
   */
  private containsURL(content: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/;
    return urlRegex.test(content);
  }

  /**
   * Checks if URL is suspicious
   * @param url - URL to check
   * @returns True if suspicious
   */
  private isSuspiciousURL(url: string): boolean {
    // Check for IP addresses instead of domains
    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
      return true;
    }

    // Check for excessive subdomains
    const urlObj = new URL(url);
    const parts = urlObj.hostname.split('.');
    if (parts.length > 4) {
      return true;
    }

    // Check for suspicious TLDs
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    if (suspiciousTLDs.some((tld) => url.endsWith(tld))) {
      return true;
    }

    return false;
  }

  /**
   * Checks for typosquatting
   * @param hostname - Hostname to check
   * @returns True if likely typosquatting
   */
  private isTyposquatting(hostname: string): boolean {
    const legitimateDomains = [
      'gov.in',
      'nic.in',
      'india.gov.in',
      'pmjdy.gov.in',
      'nrega.nic.in',
    ];

    for (const domain of legitimateDomains) {
      // Check for similar but not exact match
      if (this.levenshteinDistance(hostname, domain) <= 2 && hostname !== domain) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates Levenshtein distance
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Parses indicators from text
   * @param text - Text to parse
   * @returns Indicators
   */
  private parseIndicators(text: string): string[] {
    const lines = text.split('\n');
    const indicators: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        indicators.push(trimmed.replace(/^[-•]\s*/, ''));
      }
    }

    return indicators;
  }

  /**
   * Infers fraud types from text
   * @param text - Text to analyze
   * @returns Fraud types
   */
  private inferFraudTypes(text: string): FraudType[] {
    const types: FraudType[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('phishing') || lowerText.includes('fake link')) {
      types.push('phishing');
    }
    if (lowerText.includes('impersonation') || lowerText.includes('pretending')) {
      types.push('impersonation');
    }
    if (lowerText.includes('advance fee') || lowerText.includes('upfront payment')) {
      types.push('advance-fee');
    }
    if (lowerText.includes('fake scheme') || lowerText.includes('bogus program')) {
      types.push('fake-scheme');
    }

    return types;
  }

  /**
   * Initializes fraud patterns
   */
  private initializeFraudPatterns(): void {
    this.fraudPatterns = [
      {
        patternId: 'urgent-action',
        type: 'phishing',
        keywords: ['urgent', 'immediate action', 'act now', 'limited time', 'expire'],
        severity: 'high',
        description: {
          en: 'Urgency tactics to pressure quick action',
          hi: 'जल्दी कार्रवाई के लिए दबाव',
          ta: 'விரைவான நடவடிக்கைக்கான அழுத்தம்',
          te: 'త్వరిత చర్య కోసం ఒత్తిడి',
          bn: 'দ্রুত পদক্ষেপের জন্য চাপ',
          mr: 'त्वरित कृतीसाठी दबाव',
        },
      },
      {
        patternId: 'money-request',
        type: 'advance-fee',
        keywords: ['send money', 'transfer', 'payment required', 'processing fee', 'deposit'],
        severity: 'critical',
        description: {
          en: 'Request for money or payment',
          hi: 'पैसे या भुगतान की मांग',
          ta: 'பணம் அல்லது கட்டணம் கோரிக்கை',
          te: 'డబ్బు లేదా చెల్లింపు అభ్యర్థన',
          bn: 'টাকা বা পেমেন্টের অনুরোধ',
          mr: 'पैसे किंवा पेमेंटची विनंती',
        },
      },
      {
        patternId: 'personal-info',
        type: 'identity-theft',
        keywords: ['aadhaar', 'pan card', 'bank account', 'otp', 'password', 'pin'],
        severity: 'critical',
        description: {
          en: 'Request for sensitive personal information',
          hi: 'संवेदनशील व्यक्तिगत जानकारी की मांग',
          ta: 'முக்கியமான தனிப்பட்ட தகவல் கோரிக்கை',
          te: 'సున్నితమైన వ్యక్తిగత సమాచారం అభ్యర్థన',
          bn: 'সংবেদনশীল ব্যক্তিগত তথ্যের অনুরোধ',
          mr: 'संवेदनशील वैयक्तिक माहितीची विनंती',
        },
      },
      {
        patternId: 'government-impersonation',
        type: 'impersonation',
        keywords: ['government official', 'ministry', 'officer', 'department'],
        severity: 'high',
        description: {
          en: 'Impersonation of government officials',
          hi: 'सरकारी अधिकारियों का प्रतिरूपण',
          ta: 'அரசு அதிகாரிகளின் போலி',
          te: 'ప్రభుత్వ అధికారుల నకిలీ',
          bn: 'সরকারি কর্মকর্তাদের ছদ্মবেশ',
          mr: 'सरकारी अधिकाऱ्यांचे प्रतिरूपण',
        },
      },
    ];
  }

  /**
   * Loads malicious domains
   */
  private async loadMaliciousDomains(): Promise<void> {
    // In production, this would load from a database or external service
    this.maliciousDomains = new Set([
      'fake-pmjdy.com',
      'india-gov-schemes.tk',
      'nrega-apply.ml',
    ]);
  }
}

export const fraudDetectorService = new FraudDetectorService();
