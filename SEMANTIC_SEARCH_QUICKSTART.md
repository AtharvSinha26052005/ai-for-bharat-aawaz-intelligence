# Semantic Search Quick Start Guide

This guide will help you set up the semantic search system for government schemes in under 10 minutes.

## 🎯 What You'll Build

A semantic search system that:
- Loads 1000 government schemes
- Creates vector embeddings for intelligent search
- Stores embeddings in Pinecone vector database
- Enables natural language search queries
- Provides personalized scheme recommendations

## 📋 Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed (for backend API)
- Pinecone account (free tier works)
- Groq API key (optional, for LLM reasoning)

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `sentence-transformers` - Embedding generation
- `pinecone-client` - Vector database
- `tqdm` - Progress tracking

### Step 2: Set Up Pinecone

1. Sign up at [pinecone.io](https://www.pinecone.io/)
2. Create a new project
3. Copy your API key
4. Set environment variable:

```bash
# Linux/Mac
export PINECONE_API_KEY="your-api-key-here"

# Windows PowerShell
$env:PINECONE_API_KEY="your-api-key-here"
```

### Step 3: Upload Embeddings

```bash
python scripts/upload_embeddings.py
```

**Expected time**: 1-2 minutes for 1000 schemes

**Output**:
```
✓ Loaded 1000 schemes
✓ Model loaded (dimension: 384)
✓ Connected to Pinecone
✓ Generated 1000 embeddings
✓ Upload complete!
✓ Verification successful!
```

### Step 4: Verify Upload

Check your Pinecone dashboard:
- Index name: `scheme-index`
- Total vectors: 1000
- Dimension: 384
- Metric: cosine

### Step 5: Test Search (Optional)

Create a test script `test_search.py`:

```python
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
import os

# Initialize
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("scheme-index")
model = SentenceTransformer("all-MiniLM-L6-v2")

# Test query
query = "scholarship for women entrepreneurs"
embedding = model.encode(query).tolist()

# Search
results = index.query(
    vector=embedding,
    top_k=5,
    include_metadata=True
)

# Display results
print(f"\nTop 5 schemes for: '{query}'\n")
for i, match in enumerate(results['matches'], 1):
    print(f"{i}. {match['metadata']['name']}")
    print(f"   Ministry: {match['metadata']['ministry']}")
    print(f"   Relevance: {match['score']:.2%}\n")
```

Run it:
```bash
python test_search.py
```

## 🎨 Frontend Integration

### Current State
Your Schemes page shows "No schemes found" because it's calling an API that doesn't return data.

### Solution: Load from JSON First

Update `frontend/src/pages/Schemes.tsx`:

```typescript
import schemesData from '../../../myscheme_full_1000.json';

// In the component
useEffect(() => {
  // Load schemes from local JSON
  const loadedSchemes = schemesData.map(scheme => ({
    scheme: {
      schemeId: scheme.slug,
      officialName: scheme.name,
      localizedName: scheme.name,
      shortDescription: scheme.description,
      category: 'general', // You can map this from ministry
      level: 'central' as const,
    },
    eligibility: {
      eligible: true,
      confidence: 1.0,
      explanation: scheme.eligibility_summary,
    },
    estimatedBenefit: 0,
    priority: 1,
    personalizedExplanation: scheme.benefits_summary,
  }));
  
  setSchemes(loadedSchemes);
}, []);
```

This will immediately show all 1000 schemes on your Schemes page!

## 🔄 Architecture Flow

```
User Profile Input
    ↓
Generate Profile Embedding (sentence-transformers)
    ↓
Query Pinecone (top 50 similar schemes)
    ↓
LLM Reasoning with Groq (eligibility analysis)
    ↓
Ranked Results (top 10 eligible schemes)
    ↓
Display in UI
```

## 📊 Data Structure

### Scheme Record
```json
{
  "name": "Scheme Name",
  "slug": "scheme-slug",
  "ministry": "Ministry Name",
  "description": "Full description...",
  "eligibility_summary": "Who can apply...",
  "benefits_summary": "What you get...",
  "embedding_text": "Combined text for search",
  "apply_link": "https://..."
}
```

### Pinecone Vector
```python
{
  "id": "scheme-slug",
  "values": [0.123, -0.456, ...],  # 384 dimensions
  "metadata": {
    "name": "Scheme Name",
    "ministry": "Ministry Name",
    "apply_link": "https://..."
  }
}
```

## 🎯 Next Steps

### Immediate (Show Schemes Now)
1. ✅ Upload embeddings to Pinecone (done above)
2. Load schemes from JSON in frontend (code above)
3. Test search and filter functionality

### Short-term (Add Semantic Search)
1. Create backend API endpoint `/api/schemes/semantic-search`
2. Implement profile-to-embedding conversion
3. Query Pinecone for similar schemes
4. Return top results to frontend

### Medium-term (Add LLM Reasoning)
1. Get Groq API key
2. Implement eligibility analysis with LLM
3. Add confidence scores and explanations
4. Rank schemes by eligibility

## 🐛 Troubleshooting

### "No schemes found" in UI
**Solution**: Load from JSON first (see Frontend Integration above)

### "PINECONE_API_KEY not set"
**Solution**: 
```bash
export PINECONE_API_KEY="your-key"
python scripts/upload_embeddings.py
```

### "Data file not found"
**Solution**: Run from repository root where `myscheme_full_1000.json` exists

### Slow embedding generation
**Solution**: First run downloads model (~80MB). Subsequent runs are faster.

## 💡 Pro Tips

### 1. Improve Search Quality
Combine multiple fields in `embedding_text`:
```python
embedding_text = f"{name}\n{description}\n{eligibility_summary}\n{benefits_summary}"
```

### 2. Cache Embeddings
Store user profile embeddings in Redis to avoid regenerating:
```python
cache_key = f"profile:{user_id}"
redis.setex(cache_key, 3600, embedding)  # 1 hour TTL
```

### 3. Batch Processing
Process multiple user queries in parallel:
```python
embeddings = model.encode(queries, batch_size=32)
```

### 4. Filter by Metadata
Combine semantic search with filters:
```python
results = index.query(
    vector=embedding,
    top_k=50,
    filter={"ministry": "Ministry of Education"}
)
```

## 📈 Performance Metrics

### Expected Performance
- **Embedding generation**: 22 schemes/second
- **Pinecone upload**: 50 schemes/batch, ~3 batches/second
- **Search query**: <100ms for top 50 results
- **Total search time**: <2 seconds (with LLM reasoning)

### Optimization Tips
- Use batch operations (50-100 vectors per batch)
- Cache frequently accessed embeddings
- Implement connection pooling for Pinecone
- Use async/await for parallel LLM calls

## 🎓 Learning Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [Sentence Transformers](https://www.sbert.net/)
- [Groq API Docs](https://console.groq.com/docs)
- [Vector Search Basics](https://www.pinecone.io/learn/vector-search/)

## ✅ Success Checklist

- [ ] Python dependencies installed
- [ ] Pinecone account created
- [ ] API key configured
- [ ] Embeddings uploaded (1000 vectors)
- [ ] Index verified in dashboard
- [ ] Test search working
- [ ] Frontend showing schemes
- [ ] Search and filter functional

## 🎉 You're Done!

Your semantic search system is now ready. Users can:
- Browse all 1000 government schemes
- Search using natural language
- Filter by category, ministry, level
- Get personalized recommendations (when you add LLM reasoning)

**Next**: Implement the backend API to connect frontend search to Pinecone!
