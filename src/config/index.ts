import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
    encryptionKey: process.env.DATABASE_ENCRYPTION_KEY || '',
    pool: {
      min: 2,
      max: 10,
    },
  },
  databaseUrl: process.env.DATABASE_URL || '',
  databaseReadReplicaUrls: process.env.DATABASE_READ_REPLICA_URLS?.split(',') || [],

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },

  // Pinecone
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || '',
    indexName: process.env.PINECONE_INDEX_NAME || 'government-schemes',
  },
  pineconeApiKey: process.env.PINECONE_API_KEY || '',

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  groqApiKey: process.env.GROQ_API_KEY || '',

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
  },

  // Speech Services
  speech: {
    googleSTTApiKey: process.env.GOOGLE_STT_API_KEY || '',
    googleTTSApiKey: process.env.GOOGLE_TTS_API_KEY || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10),
  },

  // AWS
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },

  // Monitoring
  prometheus: {
    port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
  },
};

// Validate required configuration
export function validateConfig(): void {
  const required = [
    'database.url',
    'jwt.secret',
  ];

  for (const key of required) {
    const keys = key.split('.');
    let value: any = config;
    for (const k of keys) {
      value = value[k];
    }
    if (!value) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }
}
