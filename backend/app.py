"""
Entry Point for Backend Execution

Can be:
- Converted into AWS Lambda handler
- Wrapped inside FastAPI
- Integrated into API Gateway

Run locally:
python app.py
"""

from bedrock_client import generate_response
from rag_retriever import generate_embedding, semantic_search

def main():
    user_query = input("Enter user query: ")

    user_context = {
        "location": "Karnataka",
        "income_level": "Low",
        "occupation": "Farmer"
    }

    # Generate embedding for retrieval
    embedding = generate_embedding(user_query)

    # Retrieve contextual knowledge
    retrieved_context = semantic_search(embedding)

    # Combine retrieved knowledge
    enriched_context = {
        "profile": user_context,
        "retrieved_data": retrieved_context
    }

    response = generate_response(user_query, enriched_context)

    print("\nAI Response:\n")
    print(response)

if __name__ == "__main__":
    main()
