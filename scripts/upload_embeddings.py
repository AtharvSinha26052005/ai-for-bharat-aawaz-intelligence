#!/usr/bin/env python3
"""
Embedding Upload Script for Government Schemes
Generates vector embeddings using sentence-transformers and uploads to Pinecone
"""

import json
import os
import sys
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from tqdm import tqdm
import time

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "scheme-index")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # 384 dimensions
BATCH_SIZE = 50
DATA_FILE = "myscheme_full_1000.json"

def validate_environment():
    """Validate required environment variables"""
    if not PINECONE_API_KEY:
        print("ERROR: PINECONE_API_KEY environment variable not set")
        print("Please set it using: export PINECONE_API_KEY='your-api-key'")
        sys.exit(1)
    
    if not os.path.exists(DATA_FILE):
        print(f"ERROR: Data file '{DATA_FILE}' not found")
        print(f"Please ensure {DATA_FILE} exists in the current directory")
        sys.exit(1)

def load_schemes() -> List[Dict[str, Any]]:
    """Load schemes from JSON file"""
    print(f"Loading schemes from {DATA_FILE}...")
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"✓ Loaded {len(data)} schemes")
    return data

def initialize_embedding_model() -> SentenceTransformer:
    """Initialize the sentence transformer model"""
    print(f"Loading embedding model: {EMBEDDING_MODEL}...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    print(f"✓ Model loaded (dimension: {model.get_sentence_embedding_dimension()})")
    return model

def initialize_pinecone() -> Any:
    """Initialize Pinecone client and index"""
    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Check if index exists
    existing_indexes = pc.list_indexes().names()
    
    if PINECONE_INDEX_NAME not in existing_indexes:
        print(f"Creating new index: {PINECONE_INDEX_NAME}...")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=384,  # all-MiniLM-L6-v2 dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        # Wait for index to be ready
        print("Waiting for index to be ready...")
        time.sleep(10)
    else:
        print(f"✓ Using existing index: {PINECONE_INDEX_NAME}")
    
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # Get index stats
    stats = index.describe_index_stats()
    print(f"✓ Connected to Pinecone (current vectors: {stats.get('total_vector_count', 0)})")
    
    return index

def prepare_embedding_text(scheme: Dict[str, Any]) -> str:
    """
    Prepare text for embedding from scheme data
    Uses the embedding_text field if available, otherwise constructs from components
    """
    if "embedding_text" in scheme and scheme["embedding_text"]:
        return scheme["embedding_text"].strip()
    
    # Fallback: construct from components
    parts = [
        scheme.get("name", ""),
        scheme.get("description", ""),
        scheme.get("eligibility_summary", ""),
        str(scheme.get("benefits_summary", ""))
    ]
    return " ".join(filter(None, parts))

def generate_embeddings(
    model: SentenceTransformer,
    schemes: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Generate embeddings for all schemes"""
    print(f"\nGenerating embeddings for {len(schemes)} schemes...")
    
    vectors = []
    
    for scheme in tqdm(schemes, desc="Generating embeddings"):
        # Prepare text
        text = prepare_embedding_text(scheme)
        
        # Generate embedding
        embedding = model.encode(text).tolist()
        
        # Prepare vector record
        vector = {
            "id": scheme["slug"],
            "values": embedding,
            "metadata": {
                "name": scheme["name"],
                "slug": scheme["slug"],
                "ministry": scheme.get("ministry", ""),
                "apply_link": scheme.get("apply_link", "")
            }
        }
        vectors.append(vector)
    
    print(f"✓ Generated {len(vectors)} embeddings")
    return vectors

def upload_to_pinecone(
    index: Any,
    vectors: List[Dict[str, Any]]
) -> None:
    """Upload vectors to Pinecone in batches"""
    print(f"\nUploading vectors to Pinecone (batch size: {BATCH_SIZE})...")
    
    total_batches = (len(vectors) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in tqdm(range(0, len(vectors), BATCH_SIZE), desc="Uploading batches", total=total_batches):
        batch = vectors[i:i + BATCH_SIZE]
        index.upsert(vectors=batch)
        time.sleep(0.1)  # Small delay to avoid rate limits
    
    print(f"✓ Upload complete!")

def verify_upload(index: Any, expected_count: int) -> None:
    """Verify that vectors were uploaded successfully"""
    print("\nVerifying upload...")
    time.sleep(2)  # Wait for index to update
    
    stats = index.describe_index_stats()
    actual_count = stats.get('total_vector_count', 0)
    
    print(f"Expected vectors: {expected_count}")
    print(f"Actual vectors: {actual_count}")
    
    if actual_count >= expected_count:
        print("✓ Verification successful!")
    else:
        print(f"⚠ Warning: Expected {expected_count} vectors but found {actual_count}")

def main():
    """Main execution function"""
    print("=" * 60)
    print("Government Schemes Embedding Upload Script")
    print("=" * 60)
    print()
    
    # Validate environment
    validate_environment()
    
    # Load data
    schemes = load_schemes()
    
    # Initialize model
    model = initialize_embedding_model()
    
    # Initialize Pinecone
    index = initialize_pinecone()
    
    # Generate embeddings
    vectors = generate_embeddings(model, schemes)
    
    # Upload to Pinecone
    upload_to_pinecone(index, vectors)
    
    # Verify upload
    verify_upload(index, len(vectors))
    
    print()
    print("=" * 60)
    print("✓ All done! Your embeddings are ready for semantic search.")
    print("=" * 60)

if __name__ == "__main__":
    main()
