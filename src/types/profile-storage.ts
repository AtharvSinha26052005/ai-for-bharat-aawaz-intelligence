// Type definitions for user profile storage

export interface ProfileCreateRequest {
  age: number;
  income_range: string;
  phone_number: string;
  aadhar_number: string;
  gender: string;
  caste: string;
  occupation: string;
  state: string;
  district: string;
  block?: string;
  village?: string;
  pincode?: string;
  preferred_mode: string;
}

export interface ProfileCreateResponse {
  profile_id: string;
}

export interface ProfileData {
  id: string;
  age: number;
  income_range: string;
  phone_number: string;
  aadhar_number: string;
  gender: string;
  caste: string;
  occupation: string;
  state: string;
  district: string;
  block: string | null;
  village: string | null;
  pincode: string | null;
  preferred_mode: string;
  created_at: Date;
}

export interface SuccessResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: string;
}
