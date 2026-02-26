"""
AWS Service Used:
- Amazon Bedrock Runtime
Access Method:
- boto3.client('bedrock-runtime')
- Requires IAM permission: bedrock:InvokeModel
"""

import boto3
import json
from config import AWS_REGION, MODEL_ID, MAX_TOKENS, TEMPERATURE

bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION
)

def generate_response(user_query: str, user_context: dict = None) -> str:
    """
    Invoke Amazon Bedrock LLM with contextual grounding.
    """

    system_prompt = """
    You are an intelligent rural digital assistant.
    Provide clear, concise, and grounded responses.
    """

    full_prompt = f"""
    System Instructions:
    {system_prompt}

    User Context:
    {user_context}

    User Query:
    {user_query}

    Response:
    """

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
        "messages": [
            {
                "role": "user",
                "content": full_prompt
            }
        ]
    })

    response = bedrock.invoke_model(
        body=body,
        modelId=MODEL_ID,
        accept="application/json",
        contentType="application/json"
    )

    result = json.loads(response["body"].read())
    return result["content"][0]["text"]
