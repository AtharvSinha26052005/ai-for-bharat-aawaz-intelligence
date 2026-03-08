# Government Schemes Embedding Upload Guide

This guide explains how to generate vector embeddings for government schemes and upload them to Pinecone for semantic search.

## Overview

The `upload_embeddings.py` script:
1. Reads scheme data from `myscheme_full_1000.json`
2. Generates 384-dimensional embeddings using `all-MiniLM-L6-v2` model
3. Uploads vectors to Pinecone index with metadata
4. Verifies successful upload

## Prerequisites

### 1. Python Environment

Ensure you have Python 3.8+ installed:
```bash
python --version
```

### 2. Pinecone Account

1. Sign up at [https://www.pinecone.io/](https://www.pinecone.io/)
2. Create a new project
3. Get your API key from the dashboard

### 3. Create Pinecone Index

**Option A: Using Pinecone Dashboard**
1. Go to Pinecone dashboard
2. Click "Create Index"
3. Configure:
   - **Name**: `scheme-index` (or your preferred name)
   - **Dimensions**: `384`
   - **Metric**: `cosine`
   - **Cloud**: AWS
   - **Region**: us-east-1 (or your preferred region)

**Option B: Let the script create it**
The script will automatically create the index if it doesn't exist.

## Installation

### Step 1: Install Python Dependencies

From the repository root:

```bash
pip install -r requirements.txt
```

This installs:
- `sentence-transformers` - For generating embeddings
- `pinecone-client` - For vector database operations
- `tqdm` - For progress bars

### Step 2: Set Environment Variables

**Linux/Mac:**
```bash
export PINECONE_API_KEY="your-pinecone-api-key-here"
export PINECONE_INDEX_NAME="scheme-index"  # Optional, defaults to "scheme-index"
```

**Windows (PowerShell):**
```powershell
$env:PINECONE_API_KEY="your-pinecone-api-key-here"
$env:PINECONE_INDEX_NAME="scheme-index"  # Optional
```

**Windows (CMD):**
```cmd
set PINECONE_API_KEY=your-pinecone-api-key-here
set PINECONE_INDEX_NAME=scheme-index
```

### Step 3: Verify Data File

Ensure `myscheme_full_1000.json` exists in the repository root:
```bash
ls myscheme_full_1000.json
```

## Running the Script

From the repository root:

```bash
python scripts/upload_embeddings.py
```

### Expected Output

```
============================================================
Government Schemes Embedding Upload Script
============================================================

Loading schemes from myscheme_full_1000.json...
✓ Loaded 1000 schemes
Loading embedding model: all-MiniLM-L6-v2...
✓ Model loaded (dimension: 384)
Connecting to Pinecone...
✓ Using existing index: scheme-index
✓ Connected to Pinecone (current vectors: 0)

Generating embeddings for 1000 schemes...
Generating embeddings: 100%|████████████| 1000/1000 [00:45<00:00, 22.15it/s]
✓ Generated 1000 embeddings

Uploading vectors to Pinecone (batch size: 50)...
Uploading batches: 100%|████████████| 20/20 [00:12<00:00,  1.62it/s]
✓ Upload complete!

Verifying upload...
Expected vectors: 1000
Actual vectors: 1000
✓ Verification successful!

============================================================
✓ All done! Your embeddings are ready for semantic search.
============================================================
```

### Processing Time

- **Embedding generation**: ~45-60 seconds (1000 schemes)
- **Upload to Pinecone**: ~10-15 seconds (batches of 50)
- **Total time**: ~1-2 minutes

## Troubleshooting

### Error: PINECONE_API_KEY not set

**Solution**: Set the environment variable before running:
```bash
export PINECONE_API_KEY="your-api-key"
```

### Error: Data file not found

**Solution**: Run the script from the repository root where `myscheme_full_1000.json` is located:
```bash
cd /path/to/ai-for-bharat-aawaz-intelligence
python scripts/upload_embeddings.py
```

### Error: Index dimension mismatch

**Solution**: Delete the existing index in Pinecone dashboard and let the script create a new one with dimension 384.

### Slow embedding generation

**Solution**: The first run downloads the model (~80MB). Subsequent runs will be faster as the model is cached locally.

## Data Structure

### Input (myscheme_full_1000.json)

Each scheme contains:
```json
{
  "name": "Scheme Name",
  "slug": "scheme-slug",
  "ministry": "Ministry Name",
  "description": "...",
  "eligibility_summary": "...",
  "benefits_summary": {...},
  "embedding_text": "Combined text for embedding",
  "apply_link": "https://..."
}
```

### Output (Pinecone Vectors)

Each vector stored in Pinecone:
```python
{
  "id": "scheme-slug",
  "values": [0.123, -0.456, ...],  # 384 dimensions
  "metadata": {
    "name": "Scheme Name",
    "slug": "scheme-slug",
    "ministry": "Ministry Name",
    "apply_link": "https://..."
  }
}
```

## Verification

### Check Index Stats

After upload, verify in Pinecone dashboard:
1. Go to your index
2. Check "Total Vectors" count
3. Should show 1000 vectors

### Test Query

You can test the index using Pinecone's query interface or the Python client:

```python
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Initialize
pc = Pinecone(api_key="your-api-key")
index = pc.Index("scheme-index")
model = SentenceTransformer("all-MiniLM-L6-v2")

# Test query
query = "scholarship for students with disabilities"
query_embedding = model.encode(query).tolist()

# Search
results = index.query(
    vector=query_embedding,
    top_k=5,
    include_metadata=True
)

# Print results
for match in results['matches']:
    print(f"Score: {match['score']:.4f}")
    print(f"Name: {match['metadata']['name']}")
    print(f"Ministry: {match['metadata']['ministry']}")
    print()
```

## Re-running the Script

The script uses **upsert** operations, so:
- Running it multiple times is safe
- Existing vectors will be updated
- No duplicates will be created
- Use this to update embeddings after data changes

## Next Steps

After successful upload:

1. **Implement Backend API** - Create `/api/schemes/semantic-search` endpoint
2. **Integrate with Frontend** - Connect Schemes page to semantic search
3. **Add LLM Reasoning** - Use Groq API for eligibility analysis
4. **Test Search Quality** - Verify semantic search returns relevant results

## Cost Considerations

### Pinecone
- **Free tier**: 1 index, 100K vectors, 100 queries/day
- **Serverless**: Pay per usage (~$0.10/1M queries)
- **1000 vectors**: Well within free tier limits

### Sentence Transformers
- **Free**: Open-source model, runs locally
- **No API costs**: All processing done on your machine

## Support

For issues or questions:
1. Check Pinecone documentation: https://docs.pinecone.io/
2. Check sentence-transformers docs: https://www.sbert.net/
3. Review script logs for error messages
