-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number_encrypted BYTEA,
    age INTEGER CHECK (age BETWEEN 1 AND 120),
    income_range VARCHAR(20) CHECK (income_range IN ('below-1L', '1L-3L', '3L-5L', 'above-5L')),
    occupation VARCHAR(100),
    family_adults INTEGER DEFAULT 0 CHECK (family_adults >= 0),
    family_children INTEGER DEFAULT 0 CHECK (family_children >= 0),
    family_seniors INTEGER DEFAULT 0 CHECK (family_seniors >= 0),
    location_state VARCHAR(100),
    location_district VARCHAR(100),
    location_block VARCHAR(100),
    location_village VARCHAR(100),
    location_pincode VARCHAR(10),
    primary_needs TEXT[],
    preferred_language VARCHAR(2) CHECK (preferred_language IN ('hi', 'ta', 'te', 'bn', 'mr', 'en')),
    preferred_mode VARCHAR(10) CHECK (preferred_mode IN ('voice', 'text', 'both')),
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_location ON users(location_state, location_district);
CREATE INDEX idx_users_income ON users(income_range);
CREATE INDEX idx_users_age ON users(age);
CREATE INDEX idx_users_language ON users(preferred_language);

-- Schemes table
CREATE TABLE IF NOT EXISTS schemes (
    scheme_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    official_name VARCHAR(500) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('agriculture', 'education', 'health', 'housing', 'employment', 'pension', 'women_welfare', 'child_welfare', 'disability', 'financial_inclusion', 'other')),
    level VARCHAR(10) CHECK (level IN ('central', 'state')),
    state VARCHAR(100),
    launch_date DATE,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    official_website TEXT,
    helpline_number VARCHAR(20),
    last_updated TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    verification_status VARCHAR(20) CHECK (verification_status IN ('verified', 'pending', 'outdated'))
);

CREATE INDEX idx_schemes_category ON schemes(category);
CREATE INDEX idx_schemes_level_state ON schemes(level, state);
CREATE INDEX idx_schemes_active ON schemes(active);

-- Scheme localized content
CREATE TABLE IF NOT EXISTS scheme_content (
    content_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    language VARCHAR(2) CHECK (language IN ('hi', 'ta', 'te', 'bn', 'mr', 'en')),
    localized_name VARCHAR(500),
    short_description TEXT,
    detailed_description TEXT,
    UNIQUE(scheme_id, language)
);

CREATE INDEX idx_scheme_content_scheme ON scheme_content(scheme_id);
CREATE INDEX idx_scheme_content_language ON scheme_content(language);

-- Eligibility rules
CREATE TABLE IF NOT EXISTS eligibility_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    rule_type VARCHAR(50) CHECK (rule_type IN ('age_range', 'income_threshold', 'location', 'occupation', 'family_composition', 'gender', 'disability', 'land_ownership', 'custom')),
    operator VARCHAR(10) CHECK (operator IN ('AND', 'OR', 'NOT')),
    parameters JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    description JSONB
);

CREATE INDEX idx_rules_scheme ON eligibility_rules(scheme_id);
CREATE INDEX idx_rules_type ON eligibility_rules(rule_type);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
    application_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES schemes(scheme_id),
    status VARCHAR(50) CHECK (status IN ('draft', 'submitted', 'under_review', 'additional_info_required', 'approved', 'rejected', 'benefits_disbursed')),
    reference_number VARCHAR(100) UNIQUE,
    current_stage VARCHAR(100),
    submission_date TIMESTAMP,
    estimated_completion_date DATE,
    form_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_reference ON applications(reference_number);

-- Application status history
CREATE TABLE IF NOT EXISTS application_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    updated_by VARCHAR(50) CHECK (updated_by IN ('system', 'user', 'admin')),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_application_history_app ON application_history(application_id);
CREATE INDEX idx_application_history_timestamp ON application_history(timestamp);

-- Fraud reports
CREATE TABLE IF NOT EXISTS fraud_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    fraud_type VARCHAR(100),
    content TEXT,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
    indicators JSONB,
    reported_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_risk ON fraud_reports(risk_level);
CREATE INDEX idx_fraud_user ON fraud_reports(user_id);
CREATE INDEX idx_fraud_timestamp ON fraud_reports(reported_at);

-- Learning progress
CREATE TABLE IF NOT EXISTS learning_progress (
    progress_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    lesson_id VARCHAR(100),
    topic VARCHAR(50) CHECK (topic IN ('budgeting', 'loans', 'savings', 'insurance', 'digital_payments')),
    status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    completed_at TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_learning_user ON learning_progress(user_id);
CREATE INDEX idx_learning_topic ON learning_progress(topic);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Conversation sessions
CREATE TABLE IF NOT EXISTS conversation_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    language VARCHAR(2),
    mode VARCHAR(10) CHECK (mode IN ('voice', 'text')),
    current_intent VARCHAR(50),
    conversation_history JSONB,
    entities JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    last_interaction_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON conversation_sessions(user_id);
CREATE INDEX idx_sessions_last_interaction ON conversation_sessions(last_interaction_at);

-- Fraud patterns database
CREATE TABLE IF NOT EXISTS fraud_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type VARCHAR(50) CHECK (pattern_type IN ('phishing', 'impersonation', 'fake_scheme', 'urgency_tactic', 'suspicious_url')),
    pattern_text TEXT,
    language VARCHAR(2),
    severity INTEGER CHECK (severity BETWEEN 0 AND 10),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_patterns_type ON fraud_patterns(pattern_type);
CREATE INDEX idx_fraud_patterns_language ON fraud_patterns(language);
CREATE INDEX idx_fraud_patterns_active ON fraud_patterns(active);

-- Malicious domains
CREATE TABLE IF NOT EXISTS malicious_domains (
    domain_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) UNIQUE NOT NULL,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    reported_count INTEGER DEFAULT 1,
    first_reported TIMESTAMP DEFAULT NOW(),
    last_reported TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_malicious_domains_domain ON malicious_domains(domain);
CREATE INDEX idx_malicious_domains_active ON malicious_domains(active);

-- Translation glossary
CREATE TABLE IF NOT EXISTS translation_glossary (
    term_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_en VARCHAR(200) NOT NULL,
    term_hi VARCHAR(200),
    term_ta VARCHAR(200),
    term_te VARCHAR(200),
    term_bn VARCHAR(200),
    term_mr VARCHAR(200),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_glossary_term_en ON translation_glossary(term_en);
CREATE INDEX idx_glossary_category ON translation_glossary(category);

-- Data deletion requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_deletion_date TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT
);

CREATE INDEX idx_deletion_requests_user ON data_deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_deletion_requests_scheduled ON data_deletion_requests(scheduled_deletion_date);

-- Data sharing consents
CREATE TABLE IF NOT EXISTS data_sharing_consents (
    consent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    third_party VARCHAR(200) NOT NULL,
    purpose VARCHAR(500) NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,
    UNIQUE(user_id, third_party, purpose)
);

CREATE INDEX idx_sharing_consents_user ON data_sharing_consents(user_id);
CREATE INDEX idx_sharing_consents_third_party ON data_sharing_consents(third_party);

-- Scheme versions
CREATE TABLE IF NOT EXISTS scheme_versions (
    version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    changes TEXT NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    data JSONB NOT NULL
);

CREATE INDEX idx_scheme_versions_scheme ON scheme_versions(scheme_id);
CREATE INDEX idx_scheme_versions_version ON scheme_versions(scheme_id, version);

-- User recommendations (for flagging on scheme updates)
CREATE TABLE IF NOT EXISTS user_recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    recommended_at TIMESTAMP DEFAULT NOW(),
    needs_review BOOLEAN DEFAULT FALSE,
    flagged_at TIMESTAMP,
    UNIQUE(user_id, scheme_id)
);

CREATE INDEX idx_user_recommendations_user ON user_recommendations(user_id);
CREATE INDEX idx_user_recommendations_scheme ON user_recommendations(scheme_id);
CREATE INDEX idx_user_recommendations_review ON user_recommendations(needs_review);
