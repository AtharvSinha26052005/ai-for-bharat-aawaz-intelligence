-- Migration: Create user_profiles table
-- Date: 2024
-- Description: Creates a new user_profiles table to store demographic and contact information
--              for scheme eligibility analysis. This table is separate from the users table
--              to allow unauthenticated profile submission.

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    age INTEGER NOT NULL CHECK (age > 0),
    income_range TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    aadhar_number TEXT NOT NULL,
    gender TEXT NOT NULL,
    caste TEXT NOT NULL,
    occupation TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    block TEXT,
    village TEXT,
    pincode TEXT,
    preferred_mode TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_state_district ON user_profiles(state, district);

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Stores user profile data for scheme eligibility analysis';
COMMENT ON COLUMN user_profiles.id IS 'Unique UUID identifier for the profile';
COMMENT ON COLUMN user_profiles.age IS 'User age in years (must be positive)';
COMMENT ON COLUMN user_profiles.income_range IS 'Income range category (e.g., below-1L, 1L-3L)';
COMMENT ON COLUMN user_profiles.phone_number IS 'Contact phone number';
COMMENT ON COLUMN user_profiles.aadhar_number IS 'Aadhar identification number';
COMMENT ON COLUMN user_profiles.gender IS 'User gender for demographic matching';
COMMENT ON COLUMN user_profiles.caste IS 'Caste category for eligibility determination';
COMMENT ON COLUMN user_profiles.occupation IS 'User occupation/profession';
COMMENT ON COLUMN user_profiles.state IS 'State of residence';
COMMENT ON COLUMN user_profiles.district IS 'District of residence';
COMMENT ON COLUMN user_profiles.block IS 'Block/Taluk (optional)';
COMMENT ON COLUMN user_profiles.village IS 'Village name (optional)';
COMMENT ON COLUMN user_profiles.pincode IS 'Postal code (optional)';
COMMENT ON COLUMN user_profiles.preferred_mode IS 'Preferred communication mode (voice, text, both)';
COMMENT ON COLUMN user_profiles.created_at IS 'Timestamp when profile was created';
