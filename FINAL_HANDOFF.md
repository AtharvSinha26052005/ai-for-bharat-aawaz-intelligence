# FINAL_HANDOFF: Aawaz Intelligence Deployment

The Aawaz Intelligence project has been successfully deployed to a live, scalable AWS environment. This document provides the final architectural status, endpoints, and maintenance instructions for the development team.

## 1. Architecture Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **Frontend (React)** | 🟢 GREEN | Hosted on S3 + CloudFront. Integrated with live Backend. |
| **Backend (Express)** | 🟢 GREEN | Running on AWS Lambda via serverless-http. |
| **API Gateway** | 🟢 GREEN | HTTP API configured with CORS for CloudFront origin. |
| **Database (RDS)** | 🟢 GREEN | PostgreSQL initialized with schema. SSL enabled. |
| **Cache (Redis)** | 🟡 YELLOW | Running in VPC. Accessible via public endpoint (no NAT). |

## 2. Endpoints

- **Frontend URL**: [https://d14gfq1u1sly2k.cloudfront.net](https://d14gfq1u1sly2k.cloudfront.net)
- **Backend Base URL**: `https://j75wbhovsh.execute-api.us-east-1.amazonaws.com`
- **Health Check**: `https://j75wbhovsh.execute-api.us-east-1.amazonaws.com/health`
- **Profile Endpoint**: `https://j75wbhovsh.execute-api.us-east-1.amazonaws.com/api/v1/profile`

## 3. Database Connection
- **RDS Endpoint**: `aawaz-db.c4n44emagfee.us-east-1.rds.amazonaws.com`
- **Port**: `5432`
- **Database Name**: `rural_digital_rights`
- **Default Master User**: `postgres`
- **Connection String Protocol**: `postgresql://` (SSL required)

## 4. Key Deployment Fixes

### A. CORS & Routing Resilience
The API Gateway `j75wbhovsh` and Backend have been hardened:
- **Multi-Path Support**: The backend now handles both `/api/v1/*` and the root `/*` paths for all services, ensuring frontend compatibility even if path prefixes vary.
- **CORS**: Correctly configured for the CloudFront origin.
- **Health Endpoints**: Verified at both `/health` and `/api/v1/health`.

### B. Environment Injection & Fallbacks
The React frontend now includes a **hardcoded production fallback** for `API_BASE_URL`. This ensures that even if environment variable injection is skipped during build, the app will always know to talk to the live AWS API.


### C. Lambda Networking
The backend Lambda is currently running **outside** the VPC to access the internet (needed for external AI APIs). The RDS instance has been set to **PubliclyAccessible = true** and its Security Group (`sg-066a2aec3bbfe3dcf`) allows inbound traffic on port 5432.

## 5. Deployment Guide (Maintenance)

### Redeploy Backend
```powershell
# In the root directory
npm run build
# Zip the dist and node_modules
# Update Lambda
aws lambda update-function-code --function-name aawaz-backend-api --zip-file fileb://aawaz-backend-deployment.zip
```

### Redeploy Frontend
```powershell
# In the /frontend directory
$env:REACT_APP_API_URL="https://j75wbhovsh.execute-api.us-east-1.amazonaws.com"
npm run build
aws s3 sync ./build s3://aawaz-frontend-static --delete
aws cloudfront create-invalidation --distribution-id E1BBQRVYBKABPX --paths "/*"
```

## 6. Known Limitations
- **Public RDS access**: For security hardening, once a NAT Gateway is added to the VPC, the Lambda should be moved **inside** the VPC and the RDS PublicAccess should be disabled.
- **Mock Responses**: OpenAI and Pinecone API keys are currently not set; the app is using default mock responses for AI features.
