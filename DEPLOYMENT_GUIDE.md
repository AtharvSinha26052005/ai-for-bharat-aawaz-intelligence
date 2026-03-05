# Deployment Guide

## Prerequisites

### Required Software
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Docker and Docker Compose (optional)

### Required Accounts
- OpenAI API account (for GPT-4 and embeddings)
- Pinecone account (or Weaviate for vector database)
- Google Cloud account (for Speech-to-Text and Text-to-Speech)

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd rural-digital-rights-ai
npm install
```

### 2. Environment Configuration

Copy the template and configure:
```bash
cp .env.template .env
```

Edit `.env` with your credentials:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rural_digital_rights
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-32-character-encryption-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=rural-schemes

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
```

### 3. Database Setup

Start PostgreSQL and create database:
```bash
createdb rural_digital_rights
```

Initialize schema:
```bash
npm run db:init
```

Or manually:
```bash
psql -d rural_digital_rights -f scripts/init-db.sql
```

### 4. Redis Setup

Start Redis:
```bash
redis-server
```

Or with Docker:
```bash
docker run -d -p 6379:6379 redis:6-alpine
```

### 5. Build and Run

Development mode with hot reload:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts:
- Application server (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)

### Using Docker Only

Build image:
```bash
docker build -t rural-digital-rights-ai .
```

Run container:
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name rural-ai \
  rural-digital-rights-ai
```

## Production Deployment

### AWS Deployment

#### 1. ECS Fargate Setup

Create ECS cluster:
```bash
aws ecs create-cluster --cluster-name rural-ai-cluster
```

Create task definition:
```json
{
  "family": "rural-ai-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "rural-ai",
      "image": "your-ecr-repo/rural-ai:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rural-ai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 2. RDS PostgreSQL Setup

Create RDS instance:
```bash
aws rds create-db-instance \
  --db-instance-identifier rural-ai-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password <password> \
  --allocated-storage 100 \
  --storage-encrypted \
  --backup-retention-period 7
```

#### 3. ElastiCache Redis Setup

Create Redis cluster:
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id rural-ai-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --num-cache-nodes 1
```

#### 4. Application Load Balancer

Create ALB:
```bash
aws elbv2 create-load-balancer \
  --name rural-ai-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --scheme internet-facing
```

Create target group:
```bash
aws elbv2 create-target-group \
  --name rural-ai-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health
```

#### 5. Auto Scaling

Create auto-scaling policy:
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/rural-ai-cluster/rural-ai-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/rural-ai-cluster/rural-ai-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    "TargetValue=70.0,PredefinedMetricSpecification={PredefinedMetricType=ECSServiceAverageCPUUtilization}"
```

### SSL/TLS Configuration

#### Using AWS Certificate Manager

Request certificate:
```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS
```

Add HTTPS listener to ALB:
```bash
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>
```

### Environment Variables (Production)

Store secrets in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name rural-ai/database-url \
  --secret-string "postgresql://..."

aws secretsmanager create-secret \
  --name rural-ai/jwt-secret \
  --secret-string "your-jwt-secret"

aws secretsmanager create-secret \
  --name rural-ai/openai-key \
  --secret-string "sk-..."
```

## Monitoring Setup

### CloudWatch Logs

Create log group:
```bash
aws logs create-log-group --log-group-name /ecs/rural-ai
```

### Prometheus + Grafana

Deploy Prometheus:
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'rural-ai'
    static_configs:
      - targets: ['api.yourdomain.com:3000']
    metrics_path: '/metrics'
```

Deploy Grafana and import dashboards for:
- Request latency
- Error rates
- Active sessions
- Database performance
- Cache hit rates

### Alerting

Configure alerts for:
- High error rate (> 5%)
- High latency (> 2s for text, > 4s for voice)
- Low cache hit rate (< 70%)
- Database connection issues
- High CPU/memory usage (> 80%)

## Database Migrations

For schema changes:

1. Create migration file:
```sql
-- migrations/001_add_new_field.sql
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
```

2. Apply migration:
```bash
psql -d rural_digital_rights -f migrations/001_add_new_field.sql
```

## Backup Strategy

### Database Backups

Automated RDS backups (daily):
```bash
aws rds modify-db-instance \
  --db-instance-identifier rural-ai-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"
```

Manual backup:
```bash
pg_dump -h <rds-endpoint> -U admin rural_digital_rights > backup.sql
```

### Redis Backups

Enable AOF persistence:
```bash
redis-cli CONFIG SET appendonly yes
```

## Scaling Considerations

### Horizontal Scaling
- ECS tasks: 2-10 instances based on load
- Database: Read replicas for read-heavy operations
- Redis: Redis Cluster for high availability

### Vertical Scaling
- ECS task size: 1-4 vCPU, 2-8 GB RAM
- RDS instance: db.t3.medium to db.r5.xlarge
- Redis: cache.t3.medium to cache.r5.large

## Performance Optimization

### Database
- Add indexes on frequently queried columns
- Use connection pooling (max 20 connections)
- Enable query caching

### Redis
- Set appropriate TTL for cached data
- Use Redis pipelining for batch operations
- Monitor memory usage

### Application
- Enable compression for responses
- Use CDN for static assets
- Implement request coalescing

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable encryption at rest (RDS, Redis)
- [ ] Enable encryption in transit (TLS 1.3)
- [ ] Configure security groups (least privilege)
- [ ] Enable AWS WAF on ALB
- [ ] Set up VPC with private subnets
- [ ] Enable CloudTrail for audit logging
- [ ] Configure rate limiting
- [ ] Implement IP whitelisting for admin endpoints
- [ ] Regular security updates (npm audit)

## Troubleshooting

### Application won't start
```bash
# Check logs
docker logs rural-ai

# Check environment variables
docker exec rural-ai env

# Check database connection
docker exec rural-ai npm run db:test
```

### High latency
```bash
# Check Prometheus metrics
curl http://localhost:3000/metrics

# Check database queries
# Enable slow query log in PostgreSQL

# Check Redis performance
redis-cli --latency
```

### Memory issues
```bash
# Check memory usage
docker stats rural-ai

# Check for memory leaks
node --inspect index.js
```

## Rollback Procedure

1. Identify last working version
2. Update ECS task definition to previous image
3. Update ECS service:
```bash
aws ecs update-service \
  --cluster rural-ai-cluster \
  --service rural-ai-service \
  --task-definition rural-ai-task:previous-version
```

## Support

For deployment issues:
- Check logs: `/var/log/rural-ai/`
- Review metrics: `http://localhost:3000/metrics`
- Health check: `http://localhost:3000/health`

---

**Last Updated**: 2024
