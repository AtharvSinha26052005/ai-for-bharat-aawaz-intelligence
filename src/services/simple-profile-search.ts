import { ProfileStorageService } from './profile-storage-service';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class SimpleProfileSearchService {
  private profileService: ProfileStorageService;
  private schemes: any[] = [];

  constructor() {
    this.profileService = new ProfileStorageService();
    this.loadSchemes();
  }

  private loadSchemes() {
    try {
      const schemesPath = path.join(__dirname, '../../myscheme_full_1000.json');
      const data = fs.readFileSync(schemesPath, 'utf-8');
      this.schemes = JSON.parse(data);
      logger.info('Loaded schemes for simple search', { count: this.schemes.length });
    } catch (error) {
      logger.error('Failed to load schemes', { error });
      this.schemes = [];
    }
  }

  async searchSchemesByProfile(profileId: string): Promise<any[]> {
    try {
      // Get profile data
      const profile = await this.profileService.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      logger.info('Searching schemes for profile', {
        age: profile.age,
        gender: profile.gender,
        caste: profile.caste,
        occupation: profile.occupation,
      });

      // Simple keyword-based matching with proper filtering
      const scoredSchemes = this.schemes.map((scheme) => {
        let score = 0;
        const text = `${scheme.name} ${scheme.description} ${scheme.eligibility} ${scheme.benefits}`.toLowerCase();
        const name = scheme.name.toLowerCase();

        // CRITICAL: Gender-based exclusions (must be 0% for opposite gender)
        const isMale = profile.gender.toLowerCase() === 'male';
        const isFemale = profile.gender.toLowerCase() === 'female';
        
        // Exclude women-only schemes for males
        if (isMale && (
          text.includes('women') || 
          text.includes('girl') || 
          text.includes('widow') || 
          text.includes('female') ||
          name.includes('women') ||
          name.includes('girl')
        )) {
          return { ...scheme, score: 0 };
        }

        // Exclude men-only schemes for females (if any)
        if (isFemale && text.includes('men only')) {
          return { ...scheme, score: 0 };
        }

        // Base score for all schemes
        score = 10;

        // Age-based matching (strong signal)
        if (profile.age < 18) {
          if (text.includes('child') || text.includes('minor')) score += 20;
        } else if (profile.age >= 18 && profile.age < 30) {
          if (text.includes('youth') || text.includes('young')) score += 15;
        } else if (profile.age >= 60) {
          if (text.includes('senior') || text.includes('pension') || text.includes('elderly')) score += 20;
        }

        // Gender matching (positive signals only, exclusions handled above)
        if (isFemale && (text.includes('women') || text.includes('girl'))) {
          score += 15;
        }

        // Caste matching (strong signal for reserved categories)
        const caste = profile.caste.toLowerCase();
        if (caste === 'sc' && text.includes('sc')) score += 25;
        if (caste === 'st' && text.includes('st')) score += 25;
        if (caste === 'obc' && text.includes('obc')) score += 25;

        // Occupation matching (very strong signal)
        const occupation = profile.occupation.toLowerCase();
        
        // Student matching
        if (occupation.includes('student')) {
          if (text.includes('student') || text.includes('scholarship') || text.includes('education')) {
            score += 30;
          }
          if (text.includes('post matric') || text.includes('pre matric')) {
            score += 20;
          }
        }

        // Farmer matching
        if (occupation.includes('farm')) {
          if (text.includes('farm') || text.includes('agriculture') || text.includes('crop') || text.includes('kisan')) {
            score += 30;
          }
        }

        // Business/entrepreneur matching
        if (occupation.includes('business') || occupation.includes('entrepreneur')) {
          if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup') || text.includes('msme')) {
            score += 30;
          }
        }

        // State matching (moderate signal)
        if (profile.state && text.includes(profile.state.toLowerCase())) {
          score += 10;
        }

        // Income matching
        if (profile.income_range === 'below-1L') {
          if (text.includes('bpl') || text.includes('poor') || text.includes('low income')) {
            score += 15;
          }
        }

        // Normalize score to 0-1 range (max possible score is ~100)
        return {
          ...scheme,
          score: Math.min(score / 100, 1.0), // Cap at 1.0 (100%)
        };
      });

      // Sort by score and return top 10
      const topSchemes = scoredSchemes
        .filter((s) => s.score > 0.1) // Only schemes with at least 10% match
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      logger.info('Found matching schemes', { 
        count: topSchemes.length,
        topScore: topSchemes[0]?.score,
        avgScore: topSchemes.reduce((sum, s) => sum + s.score, 0) / topSchemes.length
      });

      return topSchemes;
    } catch (error: any) {
      logger.error('Error in simple profile search', { error });
      throw error;
    }
  }
}
