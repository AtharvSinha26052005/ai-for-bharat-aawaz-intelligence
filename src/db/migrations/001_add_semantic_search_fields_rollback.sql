-- Rollback Migration: Remove semantic search fields from users table
-- Date: 2024
-- Description: Removes gender, caste, and aadhar_number_encrypted fields

-- Drop indexes
DROP INDEX IF EXISTS idx_users_gender;
DROP INDEX IF EXISTS idx_users_caste;

-- Remove columns
ALTER TABLE users
DROP COLUMN IF EXISTS gender,
DROP COLUMN IF EXISTS caste,
DROP COLUMN IF EXISTS aadhar_number_encrypted;

-- Note: phone_number_encrypted is not removed as it existed before this migration
