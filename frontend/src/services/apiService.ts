import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';
import { SchemeRecommendation } from '../types';

// Type definitions for validation
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiService {
  private api: AxiosInstance;
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: this.REQUEST_TIMEOUT, // Validates Requirement 15.3: 10-second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling errors
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // Validates Requirement 15.7: Authentication expiry handling
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          console.warn('Authentication failed: 401 Unauthorized');
          // Note: Not redirecting to login as this app uses userId-based identification
          // If you implement JWT authentication in the future, uncomment the line below:
          // window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  /**
   * Validates userId format
   * Validates Requirement 15.6: Validate userId before API calls
   */
  private validateUserId(userId: string): boolean {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid userId: userId must be a non-empty string');
    }
    // Additional validation: userId should not contain special characters that could be used for injection
    const validUserIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validUserIdPattern.test(userId)) {
      throw new Error('Invalid userId: userId contains invalid characters');
    }
    return true;
  }

  /**
   * Validates API response structure
   * Validates Requirement 15.2: Validate API response structure before rendering
   */
  private validateApiResponse<T>(response: any, expectedFields: string[]): response is ApiResponse<T> {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // Check for required fields
    if (!('success' in response)) {
      return false;
    }
    
    // If success is true, data should be present
    if (response.success && !('data' in response)) {
      return false;
    }
    
    // If success is false, error should be present
    if (!response.success && !('error' in response)) {
      return false;
    }
    
    // Validate expected fields in data if provided
    if (response.data && expectedFields.length > 0) {
      for (const field of expectedFields) {
        if (!(field in response.data)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Validates scheme recommendation structure
   * Validates Requirement 15.2: Validate API response structure before rendering
   */
  private validateSchemeRecommendation(scheme: any): scheme is SchemeRecommendation {
    if (!scheme || typeof scheme !== 'object') {
      return false;
    }
    
    // Validate scheme object
    if (!scheme.scheme || typeof scheme.scheme !== 'object') {
      return false;
    }
    
    const requiredSchemeFields = ['schemeId', 'officialName', 'localizedName', 'shortDescription', 'category', 'level'];
    for (const field of requiredSchemeFields) {
      if (!(field in scheme.scheme)) {
        return false;
      }
    }
    
    // Validate eligibility object
    if (!scheme.eligibility || typeof scheme.eligibility !== 'object') {
      return false;
    }
    
    const requiredEligibilityFields = ['eligible', 'confidence', 'explanation'];
    for (const field of requiredEligibilityFields) {
      if (!(field in scheme.eligibility)) {
        return false;
      }
    }
    
    // Validate data types
    if (typeof scheme.eligibility.eligible !== 'boolean') {
      return false;
    }
    
    if (typeof scheme.eligibility.confidence !== 'number' || 
        scheme.eligibility.confidence < 0 || 
        scheme.eligibility.confidence > 1) {
      return false;
    }
    
    // Validate estimatedBenefit
    if (!('estimatedBenefit' in scheme) || typeof scheme.estimatedBenefit !== 'number') {
      return false;
    }
    
    // Validate priority
    if (!('priority' in scheme) || typeof scheme.priority !== 'number') {
      return false;
    }
    
    // Validate personalizedExplanation
    if (!('personalizedExplanation' in scheme) || typeof scheme.personalizedExplanation !== 'string') {
      return false;
    }
    
    return true;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.api.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.api.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.api.put(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.api.patch(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.api.delete(url, config);
  }

  // Specific API methods
  async checkEligibility(userId: string, language: string): Promise<any> {
    // Validates Requirement 15.6: Validate userId before API calls
    this.validateUserId(userId);
    return this.post(`/eligibility/check/${userId}`, { language });
  }

  async trackProgress(userId: string, language: string): Promise<any> {
    // Validates Requirement 15.6: Validate userId before API calls
    this.validateUserId(userId);
    return this.get(`/tracker/progress/${userId}?language=${language}`);
  }

  async detectFraud(data: any, language: string): Promise<any> {
    return this.post('/fraud/analyze', { ...data, language });
  }

  async educateUser(query: string, language: string): Promise<any> {
    return this.post('/education/query', { query, language });
  }

  /**
   * Fetches eligible schemes for a user with validation
   * Validates Requirements 15.2, 15.6: API response validation and userId validation
   */
  async getEligibleSchemes(userId: string): Promise<SchemeRecommendation[]> {
    // Validate userId before making API call
    this.validateUserId(userId);
    
    const response = await this.get<any>(`/schemes/eligible/${userId}`);
    
    // Validate response structure
    if (!this.validateApiResponse(response, [])) {
      throw new Error('Invalid API response structure: missing required fields');
    }
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch schemes');
    }
    
    const recommendations = (response.data as any)?.recommendations || [];
    
    // Validate each scheme recommendation
    const validSchemes = recommendations.filter((scheme: any) => {
      const isValid = this.validateSchemeRecommendation(scheme);
      if (!isValid) {
        console.warn('Invalid scheme recommendation detected and filtered out');
      }
      return isValid;
    });
    
    return validSchemes;
  }

  /**
   * Performs semantic search for personalized scheme recommendations
   * Validates Requirements: User Story 3, User Story 5
   */
  async semanticSearch(profile: any): Promise<any> {
    const response = await this.post<any>('/schemes/semantic-search', profile);
    
    // Validate response structure
    if (!this.validateApiResponse(response, [])) {
      throw new Error('Invalid API response structure: missing required fields');
    }
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to perform semantic search');
    }
    
    return response.data;
  }
}

export const apiService = new ApiService();
