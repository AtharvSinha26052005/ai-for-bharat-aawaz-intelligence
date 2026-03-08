// Type definitions for interested schemes

export interface InterestedSchemeCreateRequest {
  profile_id: string;
  scheme_name: string;
  scheme_slug?: string;
  scheme_description?: string;
  scheme_benefits?: string;
  scheme_ministry?: string;
  scheme_apply_link?: string;
}

export interface InterestedSchemeData {
  id: string;
  profile_id: string;
  scheme_name: string;
  scheme_slug: string | null;
  scheme_description: string | null;
  scheme_benefits: string | null;
  scheme_ministry: string | null;
  scheme_apply_link: string | null;
  created_at: Date;
}

export interface FinancialAdviceRequest {
  scheme_name: string;
  scheme_description?: string;
  scheme_benefits?: string;
  user_profile?: {
    age?: number;
    occupation?: string;
    income_range?: string;
  };
}

export interface FinancialAdviceResponse {
  advice: string;
  key_points: string[];
  utilization_tips: string[];
  potential_impact: string;
}
