# Rural Digital Rights AI Companion

A production-ready AI-powered platform providing multilingual voice-first access to government welfare schemes, financial literacy education, and fraud protection for rural and semi-urban Indian citizens.

## Features

- **Multilingual Support**: Hindi, Tamil, Telugu, Bengali, Marathi, and English
- **Voice-First Interface**: Speech-to-text and text-to-speech with low-bandwidth optimization
- **Scheme Discovery**: AI-powered eligibility evaluation and personalized recommendations
- **Application Assistance**: Step-by-step guidance for scheme applications
- **Financial Education**: Interactive micro-lessons on budgeting, loans, savings, insurance, and digital payments
- **Fraud Detection**: Pattern matching and AI-based fraud analysis
- **Progress Tracking**: Real-time application status monitoring with notifications
- **Secure & Compliant**: AES-256 encryption, JWT authentication, RBAC, and audit logging

## Tech Stack

- **Backend**: Node.js + TypeScript, Express.js
- **Database**: PostgreSQL with encryption at rest
- **Cache**: Redis for sessions and caching
- **Vector DB**: Pinecone for RAG system
- **AI/ML**: GPT-4 for LLM, OpenAI embeddings
- **Speech**: Google Speech-to-Text, Google Text-to-Speech
- **Security**: JWT, AES-256, TLS 1.3
- **Monitoring**: Winston logging, Prometheus metrics

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Pinecone account (or Weaviate)
- OpenAI API key
- Google Cloud account (for Speech APIs)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rural-digital-rights-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.template .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npm run db:init
```

5. Build the project:
```bash
npm run build
```

6. Start the server:
```bash
npm start
```

For development with hot reload:
```bash
npm run dev
```

## Environment Variables

See `.env.template` for all required environment variables:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT tokens
- `ENCRYPTION_KEY`: AES-256 encryption key
- `OPENAI_API_KEY`: OpenAI API key
- `PINECONE_API_KEY`: Pinecone API key
- `GOOGLE_CLOUD_PROJECT_ID`: Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google service account JSON

## API Documentation

### Authentication

All protected endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Core Endpoints

#### Voice Interaction
```
POST /api/v1/interact/voice
Content-Type: application/json

{
  "audio": "<base64-encoded-audio>",
  "language": "hi",
  "sessionId": "optional-session-id",
  "lowBandwidthMode": false
}
```

#### Text Interaction
```
POST /api/v1/interact/text
Content-Type: application/json

{
  "message": "मुझे योजनाओं के बारे में बताएं",
  "language": "hi",
  "sessionId": "optional-session-id"
}
```

#### Profile Management
```
POST /api/v1/profile
GET /api/v1/profile/:userId
DELETE /api/v1/profile/:userId
```

#### Scheme Discovery
```
GET /api/v1/schemes/eligible/:userId
GET /api/v1/schemes/:schemeId
POST /api/v1/schemes/search
```

#### Application Management
```
POST /api/v1/applications
GET /api/v1/applications/:applicationId
PATCH /api/v1/applications/:applicationId
GET /api/v1/applications/user/:userId
```

#### Fraud Detection
```
POST /api/v1/fraud/analyze
POST /api/v1/fraud/report
GET /api/v1/fraud/reports
```

#### Financial Education
```
GET /api/v1/education/lessons
POST /api/v1/education/lessons/:lessonId/start
POST /api/v1/education/exercises/:exerciseId/submit
GET /api/v1/education/progress
```

### Health Check
```
GET /health
```

### Metrics (Prometheus)
```
GET /metrics
```

## Architecture

### Modular Services

- **API Gateway**: Express.js with security middleware
- **Voice Interface Service**: STT, TTS, audio compression
- **Core Orchestration Service**: Intent detection and routing
- **Profile Manager**: User data management with encryption
- **Scheme Engine**: Eligibility evaluation and ranking
- **Eligibility Reasoner**: Rule-based eligibility logic
- **RAG System**: Vector search and LLM generation
- **Form Assistant**: Application guidance
- **Financial Educator**: Interactive lessons
- **Fraud Detector**: Pattern matching and AI analysis
- **Progress Tracker**: Application status monitoring
- **Translation Service**: Multilingual support with glossary

### Security Features

- JWT-based authentication with role-based access control
- AES-256 encryption for sensitive data at rest
- TLS 1.3 for data in transit
- Rate limiting per user and IP
- Input validation and sanitization
- Audit logging for sensitive operations
- Circuit breaker pattern for external services
- Retry logic with exponential backoff

### Database Schema

15+ tables including:
- `users`: User profiles with encrypted fields
- `schemes`: Government schemes with versioning
- `scheme_content`: Multilingual scheme content
- `eligibility_rules`: JSONB-based rule definitions
- `applications`: Application tracking
- `application_history`: Audit trail
- `fraud_reports`: Fraud incident tracking
- `learning_progress`: Financial education progress
- `translation_glossary`: Official term translations

## Development

### Project Structure

```
src/
├── config/           # Configuration
├── db/              # Database connections
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
│   ├── voice/
│   ├── profile/
│   ├── eligibility/
│   ├── rag/
│   ├── scheme/
│   ├── form/
│   ├── education/
│   ├── fraud/
│   ├── tracker/
│   ├── translation/
│   └── orchestration/
├── types/           # TypeScript types
├── utils/           # Utilities
└── index.ts         # Entry point
```

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests
- `npm run db:init`: Initialize database schema

## Deployment

### Docker

Build and run with Docker:

```bash
docker build -t rural-digital-rights-ai .
docker run -p 3000:3000 --env-file .env rural-digital-rights-ai
```

### Docker Compose

```bash
docker-compose up -d
```

This starts the application, PostgreSQL, and Redis.

### Production Considerations

1. Use a process manager (PM2, systemd)
2. Set up reverse proxy (Nginx)
3. Configure SSL/TLS certificates
4. Enable database backups
5. Set up monitoring and alerting
6. Configure log aggregation
7. Implement auto-scaling policies
8. Use CDN for static assets

## Monitoring

### Logs

Structured JSON logs with Winston:
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`

### Metrics

Prometheus metrics available at `/metrics`:
- Request latency
- Error rates
- Active sessions
- External service latency
- Database query performance

### Health Checks

- `/health`: Application health status
- Database connectivity
- Redis connectivity
- External service availability

## Testing

Run the test suite:

```bash
npm test
```

Property-based tests validate:
- Encryption correctness
- Age and location validation
- Eligibility logic
- Fraud detection
- Translation consistency
- Role-based access control
- Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@example.com

## Acknowledgments

Built for rural and semi-urban Indian citizens to improve access to government welfare schemes and financial literacy.
