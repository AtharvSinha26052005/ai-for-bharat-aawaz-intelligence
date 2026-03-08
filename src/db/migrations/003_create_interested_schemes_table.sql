-- Migration: Create interested_schemes table
-- This table stores schemes that users have marked as interested

CREATE TABLE IF NOT EXISTS interested_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  scheme_name VARCHAR(500) NOT NULL,
  scheme_slug VARCHAR(255),
  scheme_description TEXT,
  scheme_benefits TEXT,
  scheme_ministry VARCHAR(255),
  scheme_apply_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure a user doesn't mark the same scheme as interested multiple times
  UNIQUE(profile_id, scheme_slug)
);

-- Index for faster lookups by profile_id
CREATE INDEX IF NOT EXISTS idx_interested_schemes_profile_id ON interested_schemes(profile_id);

-- Index for faster lookups by created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_interested_schemes_created_at ON interested_schemes(created_at DESC);

COMMENT ON TABLE interested_schemes IS 'Stores schemes that users have marked as interested for financial advice';
COMMENT ON COLUMN interested_schemes.profile_id IS 'Reference to the user profile';
COMMENT ON COLUMN interested_schemes.scheme_name IS 'Name of the scheme';
COMMENT ON COLUMN interested_schemes.scheme_slug IS 'Unique slug identifier for the scheme';
COMMENT ON COLUMN interested_schemes.created_at IS 'Timestamp when the scheme was marked as interested';
