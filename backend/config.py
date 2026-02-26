"""
AWS Services Used:
- Amazon Bedrock (LLM + Embeddings)
- Requires: AWS credentials configured via `aws configure`
- Access via boto3 using bedrock-runtime client

Ensure:
1. AWS CLI installed
2. IAM user/role has Bedrock access
3. Region supports Bedrock
"""

AWS_REGION = "us-east-1"

# Claude 3 Sonnet model ID
MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"

# Titan Embedding model ID
EMBED_MODEL_ID = "amazon.titan-embed-text-v1"

MAX_TOKENS = 500
TEMPERATURE = 0.3
