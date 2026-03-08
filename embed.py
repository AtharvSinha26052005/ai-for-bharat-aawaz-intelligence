import json
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# -----------------------
# CONFIG
# -----------------------

PINECONE_API_KEY = "pcsk_QDLKj_Q69QDwnmo11n9eB8bmTXQJtZdiUHyWHQKYMFxqTpRdaag8zYTEkhxdhrvGpU6zK"
INDEX_NAME = "scheme-index"

DATA_FILE = "myscheme_full_1000.json"

BATCH_SIZE = 50


# -----------------------
# HELPERS
# -----------------------

def safe_metadata(value):
    """
    Pinecone metadata only supports:
    string, number, boolean, list[str]
    Convert dict/list objects safely.
    """
    if value is None:
        return ""

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, list):
        # ensure list of strings
        return [str(v) for v in value]

    if isinstance(value, dict):
        return json.dumps(value)

    return str(value)


def build_embedding_text(scheme):
    """
    Build better semantic embedding text.
    """
    parts = [
        f"Scheme Name: {scheme.get('name','')}",
        f"Ministry: {scheme.get('ministry','')}",
        f"Description: {scheme.get('description','')}",
        f"Eligibility: {scheme.get('eligibility_summary','')}",
        f"Benefits: {scheme.get('benefits_summary','')}",
    ]

    return "\n".join(parts)


# -----------------------
# INIT
# -----------------------

print("Loading embedding model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

print("Connecting to Pinecone...")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)


# -----------------------
# LOAD DATA
# -----------------------

print("Loading schemes...")

with open(DATA_FILE, "r", encoding="utf-8") as f:
    schemes = json.load(f)

print("Total schemes:", len(schemes))


# -----------------------
# BUILD VECTORS
# -----------------------

vectors = []

for scheme in schemes:

    text = scheme.get("embedding_text")

    if not text:
        text = build_embedding_text(scheme)

    embedding = model.encode(text).tolist()

    vector = {
        "id": scheme.get("slug"),
        "values": embedding,
        "metadata": {
            "name": safe_metadata(scheme.get("name")),
            "slug": safe_metadata(scheme.get("slug")),
            "ministry": safe_metadata(scheme.get("ministry")),
            "description": safe_metadata(scheme.get("description")),
            "eligibility": safe_metadata(scheme.get("eligibility")),
            "benefits": safe_metadata(scheme.get("benefits")),
            "eligibility_summary": safe_metadata(scheme.get("eligibility_summary")),
            "benefits_summary": safe_metadata(scheme.get("benefits_summary")),
            "application_process": safe_metadata(scheme.get("application_process")),
            "apply_link": safe_metadata(scheme.get("apply_link")),
        }
    }

    vectors.append(vector)


# -----------------------
# UPLOAD TO PINECONE
# -----------------------

print("Uploading to Pinecone...")

for i in range(0, len(vectors), BATCH_SIZE):

    batch = vectors[i:i + BATCH_SIZE]

    index.upsert(vectors=batch)

    print(f"Uploaded {i + len(batch)} / {len(vectors)}")


print("DONE ✅")