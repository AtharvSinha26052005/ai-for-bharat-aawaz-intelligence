import json
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

# init embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# init pinecone
pc = Pinecone(api_key="pcsk_QDLKj_Q69QDwnmo11n9eB8bmTXQJtZdiUHyWHQKYMFxqTpRdaag8zYTEkhxdhrvGpU6zK")
index = pc.Index("scheme-index")

# load dataset
with open("myscheme_full_1000.json") as f:
    data = json.load(f)

batch = []

for scheme in data:

    text = scheme["embedding_text"]
    embedding = model.encode(text).tolist()

    vector = {
        "id": scheme["slug"],
        "values": embedding,
        "metadata": {
            "name": scheme["name"],
            "ministry": scheme["ministry"],
            "apply_link": scheme["apply_link"]
        }
    }

    batch.append(vector)

    if len(batch) == 50:
        index.upsert(vectors=batch)
        batch = []

if batch:
    index.upsert(vectors=batch)

print("Upload complete")