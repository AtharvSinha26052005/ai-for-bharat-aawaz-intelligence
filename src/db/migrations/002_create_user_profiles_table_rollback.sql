-- Rollback Migration: Drop user_profiles table
-- Date: 2024
-- Description: Rolls back the user_profiles table creation

-- Drop indexes
DROP INDEX IF EXISTS idx_user_profiles_state_district;
DROP INDEX IF EXISTS idx_user_profiles_created_at;

-- Drop table
DROP TABLE IF EXISTS user_profiles;
