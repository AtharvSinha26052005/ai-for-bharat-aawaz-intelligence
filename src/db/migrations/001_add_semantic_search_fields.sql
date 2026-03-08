-- Migration: Add semantic search fields to users table
-- Date: 2024
-- Description: Adds phone_number, aadhar_number (encrypted), gender, and caste fields
--              to support personalized scheme recommendations via semantic search

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
ADD COLUMN IF NOT EXISTS caste VARCHAR(20) CHECK (caste IN ('General', 'OBC', 'SC', 'ST', 'Other')),
ADD COLUMN IF NOT EXISTS aadhar_number_encrypted BYTEA;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_caste ON users(caste);

-- Add comments for documentation
COMMENT ON COLUMN users.gender IS 'User gender for demographic-based scheme matching';
COMMENT ON COLUMN users.caste IS 'User caste category for eligibility determination';
COMMENT ON COLUMN users.aadhar_number_encrypted IS 'Encrypted Aadhar number for identity verification';

-- Note: phone_number_encrypted already exists in the users table
-- Verify the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone_number_encrypted'
    ) THEN
        RAISE EXCEPTION 'phone_number_encrypted column does not exist in users table';
    END IF;
END $$;
