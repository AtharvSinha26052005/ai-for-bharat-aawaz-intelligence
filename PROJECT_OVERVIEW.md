# Rural Digital Rights AI Companion - Complete Project Overview

## Table of Contents
1. [Project Introduction](#project-introduction)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Backend Implementation](#backend-implementation)
5. [Frontend (Not Yet Implemented)](#frontend-not-yet-implemented)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Deployment](#deployment)
9. [Development Setup](#development-setup)
10. [Future Roadmap](#future-roadmap)

---

## Project Introduction

### What is this project?

The **Rural Digital Rights AI Companion** is an AI-powered platform designed to empower rural and semi-urban Indian citizens by providing:

- **Multilingual Voice-First Access** to government welfare schemes
- **Financial Literacy Education** through interactive lessons
- **Fraud Detection and Protection** against digital scams
- **Application Assistance** for government scheme applications
- **Progress Tracking** for submitted applications

### Target Users

- Rural and semi-urban Indian citizens
- Low-literacy populations
- Users with limited internet connectivity (2G/3G)
- People seeking government welfare benefits

### Key Features

1. **6 Language Support**: Hindi, Tamil, Telugu, Bengali, Marathi, English
2. **Voice-First Interface**: Complete functionality through voice (no reading required)
3. **AI-Powered Eligibility**: Intelligent scheme recommendations based on user profile
4. **Low-Bandwidth Optimization**: Works on 2G connections
5. **Fraud Protection**: Real-time analysis of suspicious messages and links
6. **Financial Education**: Interactive micro-lessons on money management


---

## Technology Stack

### Backend Technologies

#### Core Framework
- **Node.js 18+**: JavaScript runtime
- **TypeScript 5.x**: Type-safe JavaScript
- **Express.js 5.x**: Web application framework

#### Databases
- **PostgreSQL 14+**: Primary relational database
  - Stores user profiles, applications, schemes, fraud reports
  - Encrypted at rest with AES-256
  - Read replicas for scalability
  
- **Redis 6+**: In-memory cache and session store
  - Session management
  - Frequently accessed data caching
  - Rate limiting counters
  
- **Pinecone**: Vector database for RAG system
  - Stores scheme document embeddings
  - Semantic search for scheme discovery
  - Alternative: Weaviate

#### AI/ML Services
- **OpenAI GPT-4**: Large Language Model
  - Natural language understanding
  - Response generation
  - Intent recognition
  
- **OpenAI Embeddings**: Text embeddings
  - Document vectorization
  - Semantic search
  
- **Google Speech-to-Text**: Voice recognition
  - Supports Indic languages
  - Real-time transcription
  
- **Google Text-to-Speech**: Voice synthesis
  - Natural-sounding Indic voices
  - Multiple voice options per language

#### Security & Authentication
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcrypt**: Password hashing
- **Helmet**: Security headers
- **express-rate-limit**: Rate limiting
- **AES-256**: Data encryption at rest

#### Utilities & Libraries
- **Winston**: Structured logging
- **Joi**: Input validation
- **Prometheus (prom-client)**: Metrics collection
- **uuid**: Unique ID generation
- **dotenv**: Environment configuration
- **cors**: Cross-origin resource sharing


### DevOps & Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **AWS/GCP**: Cloud hosting (production)
- **ECS Fargate**: Container orchestration
- **RDS**: Managed PostgreSQL
- **ElastiCache**: Managed Redis
- **CloudWatch**: Monitoring and logging
- **Grafana**: Metrics visualization

### Development Tools
- **nodemon**: Development server with hot reload
- **ts-node**: TypeScript execution
- **TypeScript Compiler**: Type checking and compilation

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────┐
│   User      │ (Voice/Text Input)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      API Gateway + Load Balancer    │
│  (Authentication, Rate Limiting)    │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────────┐  ┌──────────────────┐
│Voice Service │  │ Core Orchestration│
│  (STT/TTS)   │  │  (Agentic AI)    │
└──────────────┘  └────────┬──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Profile Mgr   │  │Scheme Engine │  │Fraud Detector│
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL Database                  │
│  (Users, Schemes, Applications, Fraud Reports)   │
└──────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │ Redis Cache  │
                  └──────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │Pinecone VectorDB│
                  │  (RAG System)   │
                  └──────────────┘
```

### Key Architectural Principles

1. **Agentic AI Orchestration**: Central AI controller manages conversation flow and routes requests
2. **Context-Aware RAG**: Retrieval-augmented generation with user profile context
3. **Microservices Pattern**: Modular services for different functionalities
4. **Stateless API**: Session state stored in Redis for horizontal scaling
5. **Event-Driven**: Asynchronous processing for notifications and updates


---

## Backend Implementation

### Project Structure

```
rural-digital-rights-ai/
├── src/
│   ├── config/              # Configuration management
│   │   └── index.ts         # Environment variables, app config
│   │
│   ├── db/                  # Database connections
│   │   ├── connection.ts    # PostgreSQL connection pool
│   │   ├── read-replica.ts  # Read replica for queries
│   │   └── redis.ts         # Redis client
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT authentication
│   │   ├── errorHandler.ts # Global error handling
│   │   ├── rateLimiter.ts  # Rate limiting
│   │   └── requestLogger.ts# Request logging
│   │
│   ├── routes/              # API route handlers
│   │   ├── interaction.ts   # Voice/text interaction
│   │   ├── profile.ts       # User profile management
│   │   ├── schemes.ts       # Scheme discovery
│   │   ├── applications.ts  # Application management
│   │   ├── fraud.ts         # Fraud detection
│   │   ├── education.ts     # Financial education
│   │   ├── admin.ts         # Admin operations
│   │   └── compliance.ts    # Privacy & compliance
│   │
│   ├── services/            # Business logic services
│   │   ├── voice/
│   │   │   ├── voice-service.ts      # Main voice interface
│   │   │   ├── stt-adapter.ts        # Speech-to-text
│   │   │   ├── tts-adapter.ts        # Text-to-speech
│   │   │   └── audio-compression.ts  # Low-bandwidth optimization
│   │   │
│   │   ├── orchestration/
│   │   │   └── orchestration-service.ts  # Agentic AI controller
│   │   │
│   │   ├── profile/
│   │   │   └── profile-service.ts    # User profile management
│   │   │
│   │   ├── scheme/
│   │   │   └── scheme-service.ts     # Scheme discovery & ranking
│   │   │
│   │   ├── eligibility/
│   │   │   ├── eligibility-service.ts    # Eligibility evaluation
│   │   │   └── rule-evaluator.ts         # Rule-based engine
│   │   │
│   │   ├── rag/
│   │   │   ├── rag-service.ts        # RAG system
│   │   │   ├── vector-db.ts          # Pinecone integration
│   │   │   └── embedding-service.ts  # OpenAI embeddings
│   │   │
│   │   ├── form/
│   │   │   └── form-assistant-service.ts # Application guidance
│   │   │
│   │   ├── education/
│   │   │   └── financial-educator-service.ts # Financial lessons
│   │   │
│   │   ├── fraud/
│   │   │   └── fraud-detector-service.ts # Fraud detection
│   │   │
│   │   ├── tracker/
│   │   │   └── progress-tracker-service.ts # Application tracking
│   │   │
│   │   ├── translation/
│   │   │   └── translation-service.ts # Multilingual support
│   │   │
│   │   ├── admin/
│   │   │   └── knowledge-base-service.ts # Scheme management
│   │   │
│   │   ├── compliance/
│   │   │   └── compliance-service.ts # Privacy & data protection
│   │   │
│   │   ├── bandwidth/
│   │   │   └── bandwidth-service.ts  # Network optimization
│   │   │
│   │   └── accessibility/
│   │       └── simple-language-service.ts # Content simplification
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # All interfaces and types
│   │
│   ├── utils/               # Utility functions
│   │   ├── logger.ts        # Winston logger
│   │   ├── errors.ts        # Custom error classes
│   │   ├── validation.ts    # Input validation
│   │   ├── encryption.ts    # AES-256 encryption
│   │   ├── metrics.ts       # Prometheus metrics
│   │   ├── circuit-breaker.ts # Circuit breaker pattern
│   │   ├── retry.ts         # Retry logic
│   │   └── tracing.ts       # Distributed tracing
│   │
│   ├── app.ts               # Express app setup
│   └── index.ts             # Server entry point
│
├── scripts/
│   └── init-db.sql          # Database initialization
│
├── logs/                    # Application logs
│   ├── combined.log
│   └── error.log
│
├── dist/                    # Compiled JavaScript (build output)
│
├── .env                     # Environment variables (not in git)
├── .env.template            # Environment template
├── .gitignore
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── Dockerfile               # Docker image
├── docker-compose.yml       # Multi-container setup
├── README.md                # Project readme
├── requirements.md          # Detailed requirements
├── design.md                # System design document
├── DEPLOYMENT_GUIDE.md      # Deployment instructions
└── API_DOCUMENTATION.md     # API reference
```


### Core Services Explained

#### 1. Voice Service (`src/services/voice/`)
Handles all voice interactions:
- **Speech-to-Text**: Converts user voice to text using Google Speech API
- **Text-to-Speech**: Converts system responses to natural speech
- **Audio Compression**: Optimizes audio for 2G/3G networks
- **Language Detection**: Automatically detects user's language

#### 2. Orchestration Service (`src/services/orchestration/`)
The "brain" of the system:
- **Intent Recognition**: Understands what user wants (scheme discovery, fraud check, etc.)
- **Conversation Management**: Maintains context across multiple turns
- **Service Routing**: Directs requests to appropriate services
- **Response Aggregation**: Combines responses from multiple services

#### 3. Profile Service (`src/services/profile/`)
Manages user data:
- **Profile Creation**: Collects age, income, occupation, location, family details
- **Data Encryption**: Encrypts sensitive information (phone numbers)
- **Profile Updates**: Allows users to modify their information
- **Consent Management**: Tracks user consent for data usage

#### 4. Scheme Service (`src/services/scheme/`)
Discovers and recommends government schemes:
- **Eligibility Evaluation**: Checks if user qualifies for schemes
- **Scheme Ranking**: Prioritizes schemes by benefit value
- **Personalized Recommendations**: Tailors suggestions to user profile
- **Scheme Search**: Semantic search across all schemes

#### 5. Eligibility Service (`src/services/eligibility/`)
Rule-based eligibility engine:
- **Rule Evaluation**: Checks age, income, location, occupation criteria
- **Confidence Scoring**: Provides confidence level for eligibility
- **Explanation Generation**: Explains why user is/isn't eligible
- **Missing Criteria**: Identifies what user needs to qualify

#### 6. RAG Service (`src/services/rag/`)
Retrieval-Augmented Generation system:
- **Vector Search**: Finds relevant scheme documents using embeddings
- **Context Integration**: Incorporates user profile into search
- **LLM Generation**: Generates responses grounded in official documents
- **Source Citation**: Provides references to official sources

#### 7. Form Assistant Service (`src/services/form/`)
Guides users through applications:
- **Step-by-Step Guidance**: Breaks down application process
- **Document Checklist**: Lists required documents
- **Field Explanations**: Explains each form field in simple language
- **Common Mistakes**: Warns about typical errors

#### 8. Financial Educator Service (`src/services/education/`)
Teaches financial literacy:
- **Interactive Lessons**: Micro-lessons on budgeting, loans, savings, etc.
- **Knowledge Assessment**: Tests understanding
- **Progress Tracking**: Monitors learning journey
- **Practical Exercises**: Real-world scenarios

#### 9. Fraud Detector Service (`src/services/fraud/`)
Protects against scams:
- **Pattern Matching**: Compares against known fraud signatures
- **URL Analysis**: Checks links against blacklists
- **Content Analysis**: Uses AI to detect fraud indicators
- **Risk Assessment**: Provides risk level (low/medium/high/critical)

#### 10. Progress Tracker Service (`src/services/tracker/`)
Monitors application status:
- **Status Tracking**: Records application progress
- **Timeline Estimates**: Predicts completion dates
- **Notifications**: Alerts users of status changes
- **Action Items**: Lists required user actions


---

## Frontend (Not Yet Implemented)

### Planned Frontend Architecture

The frontend is **NOT YET BUILT**. Here's the planned implementation:

#### Technology Stack (Proposed)

**Option 1: React Native (Recommended)**
- **Framework**: React Native
- **State Management**: Redux Toolkit or Zustand
- **UI Library**: React Native Paper or NativeBase
- **Navigation**: React Navigation
- **Voice**: react-native-voice
- **Audio**: react-native-sound
- **HTTP Client**: Axios
- **Offline Storage**: AsyncStorage or SQLite

**Why React Native?**
- Single codebase for iOS and Android
- Native performance
- Large community and ecosystem
- Easy integration with voice APIs
- Good offline support

**Option 2: Progressive Web App (PWA)**
- **Framework**: React or Vue.js
- **UI Library**: Material-UI or Chakra UI
- **State Management**: Redux or Vuex
- **Voice**: Web Speech API
- **Service Worker**: For offline functionality
- **PWA Features**: Install to home screen, push notifications

**Why PWA?**
- No app store approval needed
- Works on any device with browser
- Easier updates
- Lower development cost
- Good for low-end devices

#### Proposed Frontend Features

##### 1. Voice Interface Screen
```
┌─────────────────────────────┐
│  🎤 Tap to Speak            │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   [Microphone Icon]   │  │
│  │                       │  │
│  │   "Listening..."      │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Transcription:             │
│  "मुझे योजनाओं के बारे में  │
│   बताएं"                    │
│                             │
│  [Switch to Text Mode]      │
└─────────────────────────────┘
```

##### 2. Scheme Discovery Screen
```
┌─────────────────────────────┐
│  ← Back    Eligible Schemes │
│                             │
│  You qualify for 5 schemes  │
│                             │
│  ┌───────────────────────┐  │
│  │ PM Kisan              │  │
│  │ ₹6,000/year           │  │
│  │ [View Details]        │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Ayushman Bharat       │  │
│  │ ₹5 Lakh coverage      │  │
│  │ [View Details]        │  │
│  └───────────────────────┘  │
│                             │
│  [Load More]                │
└─────────────────────────────┘
```

##### 3. Application Tracking Screen
```
┌─────────────────────────────┐
│  ← Back    My Applications  │
│                             │
│  ┌───────────────────────┐  │
│  │ PM Kisan              │  │
│  │ Ref: APP-ABC123       │  │
│  │                       │  │
│  │ Status: Under Review  │  │
│  │                       │  │
│  │ ●━━━○━━━○━━━○         │  │
│  │ Submitted  Review     │  │
│  │           Approval    │  │
│  │                       │  │
│  │ Est. Completion:      │  │
│  │ Feb 1, 2024           │  │
│  │                       │  │
│  │ [View Timeline]       │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

##### 4. Fraud Check Screen
```
┌─────────────────────────────┐
│  ← Back    Fraud Detector   │
│                             │
│  Paste suspicious message:  │
│  ┌───────────────────────┐  │
│  │ "Urgent! Send money   │  │
│  │  to claim benefit..." │  │
│  └───────────────────────┘  │
│                             │
│  [Analyze]                  │
│                             │
│  ⚠️ HIGH RISK DETECTED      │
│                             │
│  This message shows signs   │
│  of fraud:                  │
│  • Urgency tactics          │
│  • Requests money           │
│  • Suspicious language      │
│                             │
│  [Report Fraud]             │
└─────────────────────────────┘
```

##### 5. Financial Education Screen
```
┌─────────────────────────────┐
│  ← Back    Learn Finance    │
│                             │
│  Your Progress: 40%         │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░         │
│                             │
│  Available Lessons:         │
│                             │
│  ✓ Budgeting Basics         │
│  ✓ Understanding Loans      │
│  → Savings Strategies       │
│  ○ Insurance Explained      │
│  ○ Digital Payments         │
│                             │
│  [Continue Learning]        │
└─────────────────────────────┘
```

#### Frontend Implementation Plan

**Phase 1: MVP (Months 1-3)**
- Voice interface with basic STT/TTS
- Profile creation and management
- Scheme discovery and details
- Simple text-based chat interface
- Basic navigation

**Phase 2: Enhanced Features (Months 4-6)**
- Application tracking
- Fraud detection interface
- Financial education modules
- Offline mode
- Push notifications

**Phase 3: Polish & Optimization (Months 7-9)**
- Low-bandwidth optimization
- Advanced voice features
- Improved UI/UX
- Accessibility enhancements
- Performance optimization

#### Frontend-Backend Integration

**API Communication**
```javascript
// Example: Fetch eligible schemes
const fetchEligibleSchemes = async (userId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/schemes/eligible/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data.recommendations;
  } catch (error) {
    console.error('Failed to fetch schemes:', error);
    throw error;
  }
};

// Example: Voice interaction
const sendVoiceMessage = async (audioBase64, language) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/interact/voice`,
      {
        audio: audioBase64,
        language: language,
        sessionId: currentSessionId,
        lowBandwidthMode: isLowBandwidth
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Voice interaction failed:', error);
    throw error;
  }
};
```

**State Management Example**
```javascript
// Redux slice for schemes
const schemesSlice = createSlice({
  name: 'schemes',
  initialState: {
    eligible: [],
    loading: false,
    error: null
  },
  reducers: {
    fetchSchemesStart: (state) => {
      state.loading = true;
    },
    fetchSchemesSuccess: (state, action) => {
      state.eligible = action.payload;
      state.loading = false;
    },
    fetchSchemesFailure: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});
```


---

## Database Schema

### PostgreSQL Tables

#### 1. users
Stores user profiles with encrypted sensitive data.
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  phone_number_encrypted BYTEA,
  age INTEGER NOT NULL,
  income_range VARCHAR(20) NOT NULL,
  occupation VARCHAR(100) NOT NULL,
  family_adults INTEGER,
  family_children INTEGER,
  family_seniors INTEGER,
  location_state VARCHAR(100) NOT NULL,
  location_district VARCHAR(100) NOT NULL,
  location_block VARCHAR(100),
  location_village VARCHAR(100),
  location_pincode VARCHAR(10),
  primary_needs TEXT[],
  preferred_language VARCHAR(5) NOT NULL,
  preferred_mode VARCHAR(10) NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. schemes
Government scheme information.
```sql
CREATE TABLE schemes (
  scheme_id UUID PRIMARY KEY,
  official_name VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,
  level VARCHAR(20) NOT NULL,
  state VARCHAR(100),
  launch_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  official_website VARCHAR(500),
  helpline_number VARCHAR(20),
  version INTEGER DEFAULT 1,
  verification_status VARCHAR(20) DEFAULT 'verified',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. scheme_content
Multilingual scheme content.
```sql
CREATE TABLE scheme_content (
  content_id UUID PRIMARY KEY,
  scheme_id UUID REFERENCES schemes(scheme_id),
  language VARCHAR(5) NOT NULL,
  localized_name VARCHAR(500),
  short_description TEXT,
  detailed_description TEXT,
  UNIQUE(scheme_id, language)
);
```

#### 4. eligibility_rules
Scheme eligibility criteria.
```sql
CREATE TABLE eligibility_rules (
  rule_id UUID PRIMARY KEY,
  scheme_id UUID REFERENCES schemes(scheme_id),
  rule_type VARCHAR(50) NOT NULL,
  operator VARCHAR(10) NOT NULL,
  parameters JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. applications
User applications for schemes.
```sql
CREATE TABLE applications (
  application_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  scheme_id UUID REFERENCES schemes(scheme_id),
  scheme_name VARCHAR(500),
  reference_number VARCHAR(50) UNIQUE,
  status VARCHAR(50) NOT NULL,
  current_stage VARCHAR(100),
  form_data JSONB,
  submission_date TIMESTAMP,
  estimated_completion_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. application_history
Audit trail for applications.
```sql
CREATE TABLE application_history (
  history_id UUID PRIMARY KEY,
  application_id UUID REFERENCES applications(application_id),
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  notes TEXT,
  updated_by VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 7. fraud_reports
Fraud incident tracking.
```sql
CREATE TABLE fraud_reports (
  report_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  content TEXT NOT NULL,
  fraud_type VARCHAR(50) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  reported_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending'
);
```

#### 8. learning_progress
Financial education progress.
```sql
CREATE TABLE learning_progress (
  progress_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  lesson_id VARCHAR(50) NOT NULL,
  topic VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  score INTEGER,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 9. translation_glossary
Official term translations.
```sql
CREATE TABLE translation_glossary (
  term_id UUID PRIMARY KEY,
  english_term VARCHAR(200) NOT NULL,
  hindi_term VARCHAR(200),
  tamil_term VARCHAR(200),
  telugu_term VARCHAR(200),
  bengali_term VARCHAR(200),
  marathi_term VARCHAR(200),
  domain VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 10. audit_logs
Security and compliance audit trail.
```sql
CREATE TABLE audit_logs (
  log_id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Redis Data Structures

#### Session Storage
```
Key: session:{sessionId}
Type: Hash
TTL: 30 minutes
Fields:
  - userId
  - language
  - conversationHistory (JSON)
  - lastInteraction (timestamp)
```

#### Rate Limiting
```
Key: ratelimit:{userId}:{endpoint}
Type: String (counter)
TTL: 1 hour
```

#### Cache
```
Key: cache:scheme:{schemeId}
Type: String (JSON)
TTL: 24 hours

Key: cache:user:{userId}:eligible
Type: String (JSON)
TTL: 1 hour
```

### Pinecone Vector Database

#### Index Structure
```
Index Name: rural-schemes
Dimension: 1536 (OpenAI embeddings)
Metric: cosine similarity

Metadata:
  - schemeId
  - schemeName
  - category
  - level
  - state
  - content (text chunk)
  - language
```


---

## API Endpoints

### Complete API Reference

#### Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <jwt-token>
```

#### Base URL
```
http://localhost:3000/api/v1
```

### Endpoint Categories

#### 1. Interaction Endpoints
- `POST /interact/voice` - Process voice input
- `POST /interact/text` - Process text input

#### 2. Profile Endpoints
- `POST /profile` - Create/update profile
- `GET /profile/:userId` - Get profile
- `DELETE /profile/:userId` - Delete profile

#### 3. Scheme Endpoints
- `GET /schemes/eligible/:userId` - Get eligible schemes
- `GET /schemes/:schemeId` - Get scheme details
- `POST /schemes/search` - Search schemes

#### 4. Application Endpoints
- `POST /applications` - Create application
- `GET /applications/:applicationId` - Get application
- `PATCH /applications/:applicationId` - Update application
- `POST /applications/:applicationId/submit` - Submit application
- `GET /applications/user/:userId` - List user applications
- `GET /applications/:applicationId/history` - Get history
- `GET /applications/:applicationId/timeline` - Get timeline

#### 5. Fraud Detection Endpoints
- `POST /fraud/analyze` - Analyze content for fraud
- `POST /fraud/report` - Report fraud
- `GET /fraud/reports` - Get user's fraud reports

#### 6. Education Endpoints
- `GET /education/lessons` - List lessons
- `GET /education/lessons/:lessonId` - Get lesson details
- `POST /education/lessons/:lessonId/start` - Start lesson
- `POST /education/exercises/:exerciseId/submit` - Submit answer
- `GET /education/progress` - Get learning progress
- `GET /education/terms/:term` - Explain financial term

#### 7. Admin Endpoints (Protected)
- `POST /admin/schemes` - Create scheme
- `PUT /admin/schemes/:schemeId` - Update scheme
- `DELETE /admin/schemes/:schemeId` - Delete scheme
- `GET /admin/users` - List users
- `GET /admin/analytics` - Get analytics

#### 8. Compliance Endpoints
- `GET /compliance/privacy-notice` - Get privacy notice
- `POST /compliance/data-deletion` - Request data deletion
- `GET /compliance/data-export/:userId` - Export user data

#### 9. System Endpoints
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Example API Calls

#### Voice Interaction
```bash
curl -X POST http://localhost:3000/api/v1/interact/voice \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "base64-encoded-audio",
    "language": "hi",
    "lowBandwidthMode": false
  }'
```

#### Get Eligible Schemes
```bash
curl -X GET http://localhost:3000/api/v1/schemes/eligible/user-123 \
  -H "Authorization: Bearer <token>"
```

#### Analyze Fraud
```bash
curl -X POST http://localhost:3000/api/v1/fraud/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Urgent! Send money to claim benefit",
    "contentType": "text",
    "language": "en"
  }'
```

---

## Deployment

### Local Development

1. **Install Dependencies**
```bash
npm install
```

2. **Setup Environment**
```bash
cp .env.template .env
# Edit .env with your credentials
```

3. **Initialize Database**
```bash
createdb rural_digital_rights
npm run db:init
```

4. **Start Redis**
```bash
redis-server
```

5. **Run Development Server**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Docker Deployment

```bash
docker-compose up -d
```

This starts:
- Application (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)

### Production Deployment (AWS)

#### Infrastructure Components
- **ECS Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed cache
- **Application Load Balancer**: Traffic distribution
- **CloudWatch**: Monitoring and logging
- **Secrets Manager**: Secure credential storage
- **S3**: Static asset storage
- **CloudFront**: CDN for global distribution

#### Deployment Steps
1. Build Docker image
2. Push to ECR (Elastic Container Registry)
3. Create ECS task definition
4. Deploy to ECS cluster
5. Configure ALB with HTTPS
6. Setup auto-scaling policies
7. Configure monitoring and alerts

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key
- Pinecone account
- Google Cloud account (for Speech APIs)

### Environment Variables

Required in `.env`:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/rural_digital_rights
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-32-char-key

# AI Services
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=rural-schemes

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

### Development Commands

```bash
# Install dependencies
npm install

# Run development server (hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production server
npm start

# Initialize database
npm run db:init

# Run tests (when implemented)
npm test

# Lint code (when configured)
npm run lint
```

### Testing the API

Use the provided PowerShell script:
```powershell
.\test-apis.ps1
```

Or use curl/Postman to test individual endpoints.

### Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
```

View logs:
```bash
tail -f logs/combined.log
tail -f logs/error.log
```


---

## Future Roadmap

### Phase 1: MVP (Current - Completed)
✅ Core backend API
✅ Voice interface (STT/TTS)
✅ User profile management
✅ Scheme discovery and eligibility
✅ Fraud detection
✅ Financial education
✅ Application tracking
✅ Multilingual support (6 languages)
✅ Security and authentication
✅ Database schema
✅ API documentation

### Phase 2: Frontend Development (Next 3-6 months)
🔲 React Native mobile app
🔲 Voice-first UI
🔲 Offline mode
🔲 Push notifications
🔲 Low-bandwidth optimization
🔲 Accessibility features
🔲 User testing with target demographic

### Phase 3: Enhanced Features (6-9 months)
🔲 Real-time application status integration with government APIs
🔲 SMS/WhatsApp notifications
🔲 Advanced fraud detection with behavioral analysis
🔲 Personalized financial advice
🔲 Community features (user forums, success stories)
🔲 Video tutorials in regional languages
🔲 Integration with digital payment systems

### Phase 4: Scale & Optimize (9-12 months)
🔲 State-specific scheme expansion (all 28 states)
🔲 Advanced analytics and reporting
🔲 Machine learning for better recommendations
🔲 Chatbot for instant support
🔲 Integration with Aadhaar for verification
🔲 Partnership with government departments
🔲 NGO and community organization partnerships

### Phase 5: Advanced Features (12+ months)
🔲 Blockchain for application tracking
🔲 AI-powered document verification
🔲 Automated form filling
🔲 Voice biometric authentication
🔲 Augmented reality for document scanning
🔲 Predictive analytics for scheme eligibility
🔲 Multi-modal interaction (voice + gesture + text)

---

## Key Metrics & Success Criteria

### User Adoption
- Target: 10 million users within 2 years
- Active monthly users: 60% retention rate
- Geographic coverage: 500+ districts

### Impact Metrics
- Scheme discovery rate: 80% of users find 3+ eligible schemes
- Application completion: 60% completion rate
- Benefit realization: Track successful benefit disbursement
- Fraud prevention: 100,000+ users protected annually

### Technical Metrics
- System uptime: 99.9%
- Response time: <2s for text, <4s for voice
- Concurrent users: 1 million+
- Error rate: <0.1%

### Social Impact
- Financial literacy improvement: 40% increase in assessment scores
- Digital payment adoption: 30% increase among users
- Fraud awareness: 80% can identify 3+ fraud tactics

---

## Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests** (when test framework is set up)
5. **Commit with clear messages**
   ```bash
   git commit -m "Add: Feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Submit a pull request**

### Code Style Guidelines
- Use TypeScript for type safety
- Follow existing code structure
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused
- Handle errors gracefully

### Areas Needing Contribution
- Frontend development (React Native/PWA)
- Test coverage (unit, integration, e2e)
- Documentation improvements
- Translation quality improvements
- Performance optimization
- Security enhancements
- Accessibility features

---

## License

[To be determined - likely MIT or Apache 2.0]

---

## Support & Contact

### For Issues
- GitHub Issues: [repository-url]/issues
- Email: support@example.com

### For Partnerships
- NGOs and community organizations
- Government departments
- Technology partners
- Funding organizations

### Documentation
- README.md - Quick start guide
- requirements.md - Detailed requirements
- design.md - System design
- DEPLOYMENT_GUIDE.md - Deployment instructions
- API_DOCUMENTATION.md - API reference
- PROJECT_OVERVIEW.md - This document

---

## Acknowledgments

This project is built to empower rural and semi-urban Indian citizens by improving access to:
- Government welfare schemes
- Financial literacy education
- Protection against digital fraud
- Application assistance and tracking

**Target Impact**: Helping millions of citizens access benefits they're entitled to, improving financial literacy, and protecting against scams.

---

## Technical Highlights

### What Makes This Project Unique

1. **Voice-First Design**: Complete functionality through voice, no reading required
2. **Multilingual AI**: Natural conversations in 6 Indian languages
3. **Context-Aware RAG**: Personalized responses based on user profile
4. **Low-Bandwidth Optimization**: Works on 2G connections
5. **Agentic AI**: Intelligent orchestration and multi-turn conversations
6. **Security-First**: End-to-end encryption, DPDPA compliance
7. **Scalable Architecture**: Designed for millions of concurrent users
8. **Social Impact**: Measurable impact on financial inclusion

### Technology Innovations

- **Hybrid AI Approach**: Combines rule-based logic with LLM intelligence
- **Adaptive Language**: Adjusts complexity based on user literacy
- **Fraud Detection**: Multi-layered approach (patterns + AI + crowdsourcing)
- **Offline-First**: Critical features work without internet
- **Progressive Enhancement**: Graceful degradation for low-end devices

---

**Last Updated**: March 2026
**Version**: 1.0.0
**Status**: Backend Complete, Frontend Pending

---

## Quick Reference

### Start Development
```bash
npm install
cp .env.template .env
# Edit .env
npm run db:init
npm run dev
```

### Test API
```bash
curl http://localhost:3000/health
```

### View Logs
```bash
tail -f logs/combined.log
```

### Build for Production
```bash
npm run build
npm start
```

---

**End of Project Overview**
