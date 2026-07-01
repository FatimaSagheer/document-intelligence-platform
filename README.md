# document-intelligence-platform
to make port public on code space
gh codespace ports visibility 3000:public
gh codespace ports visibility 5000:public

# 📄 AI Document QA — RAG Pipeline

A Retrieval-Augmented Generation (RAG) system that lets users upload documents and ask natural language questions. Answers are grounded in the actual document content using local embeddings and pgvector similarity search, with Claude generating the final response.

---

## 🧠 How It Works

```
Upload File → extractor.js → chunker.js → pipeline.js → (stored in pgvector DB)

User Question → searcher.js → answerer.js → Claude API → Answer
```

1. **Extract** — Pull raw text from PDF, DOCX, or TXT files
2. **Chunk** — Split text into overlapping 500-word pieces
3. **Embed** — Convert each chunk into a 384-dimensional vector (MiniLM model, runs locally)
4. **Store** — Save vectors in Postgres via pgvector extension (Supabase hosted)
5. **Search** — On a user question, embed it the same way and find the closest chunks
6. **Answer** — Send retrieved chunks as context to Claude, which answers from them only

---

## 📁 Project Structure

```
/
├── extractor.js      # Extracts plain text from PDF / DOCX / TXT files
├── chunker.js        # Splits text into overlapping word-based chunks
├── pipeline.js       # Orchestrates extract → chunk → embed → store in DB
├── searcher.js       # Embeds question, runs pgvector similarity search
├── answerer.js       # Calls Claude API with retrieved context to generate answer
└── config/
    └── supabase.js   # Supabase client singleton
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| File Parsing | `pdf-parse`, `mammoth` |
| Embedding Model | `@xenova/transformers` — `all-MiniLM-L6-v2` (local, 384-dim) |
| Vector Database | Postgres + `pgvector` extension (Supabase) |
| LLM | Claude `claude-sonnet-4-6` via Anthropic SDK |
| File Upload | `multer` (memory storage) |

---

## 🚀 Setup & Installation

### 1. Clone the repo

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_supabase_postgres_connection_string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_or_service_key
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> ⚠️ Never commit `.env` to version control. Add it to `.gitignore`.

### 4. Set up the database

Run this SQL in your Supabase SQL editor to enable pgvector and create the required tables:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (tracks upload status)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'processing', -- 'processing' | 'ready' | 'error'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chunks table (stores embeddings)
CREATE TABLE doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(384),          -- MiniLM produces 384-dimensional vectors
  page_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast similarity search
CREATE INDEX ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 📖 File Reference

### `extractor.js`
Extracts plain text from uploaded files based on MIME type.

- **PDF** — uses `pdf-parse` (text-layer PDFs only; scanned PDFs are not supported)
- **DOCX** — uses `mammoth.extractRawText`
- **TXT** — decoded as UTF-8 directly from buffer
- Runs `cleanText()` on all output: normalizes line endings, collapses whitespace, strips non-printable ASCII characters

**Limitation:** Non-ASCII characters (accented letters, non-Latin scripts) are stripped by `cleanText()`. OCR for scanned PDFs is not yet implemented.

**Exports:** `extractText(buffer, mimetype)`, `cleanText(text)`, `getWordCount(text)`

---

### `chunker.js`
Splits text into overlapping word-based chunks using a sliding window.

- Default: **500 words per chunk**, **50 words overlap** (10%)
- Overlap prevents context loss at chunk boundaries — if an answer spans two chunks, the bridging text appears in at least one chunk fully
- Short documents (under 500 words) are returned as a single chunk

**Exports:** `chunkText(text, chunkSize, overlap)`, `chunkWithMetadata(text, chunkSize, overlap)`, `getChunkStats(chunks)`

---

### `pipeline.js`
Orchestrates the full document ingestion pipeline.

- Loads the MiniLM embedding model **once** as a singleton (expensive to load, reused for all calls)
- Embeds each chunk with `pooling: "mean"` and `normalize: true`
- Stores chunks in the `doc_chunks` table with their vector embeddings
- Updates document `status` to `"ready"` on success, `"error"` on failure

**Exports:** `processDocument(docId, buffer, mimetype, userId)`, `embedText(text)`

---

### `searcher.js`
Retrieves the most relevant chunks for a user's question.

- Embeds the question using the **same MiniLM model** (critical — mixing models produces meaningless comparisons)
- Runs a pgvector `<=>` cosine distance query directly via `pg.Pool` (Supabase JS client does not support raw vector operators)
- Always filters by `user_id` — users can only retrieve their own documents
- Optionally scoped to a single `document_id`
- Filters out chunks below similarity threshold `0.1` (tunable)

**Exports:** `similaritySearch(question, userId, documentId, topK)`, `buildContext(chunks)`

---

### `answerer.js`
Generates the final answer using Claude.

- Injects retrieved chunks into the system prompt as numbered `[Source N]` blocks
- Instructs Claude to answer **only from the provided context**, not from general knowledge
- Falls back gracefully when no relevant chunks are found (`buildContext` returns a "no context" message)
- Returns both the `answer` string and the `sources` array (chunk indices + similarity scores) for frontend citation display

**Exports:** `answerQuestion(question, userId, documentId)`

---

## 🔧 Tuning Guide

| Parameter | Location | Default | Effect |
|---|---|---|---|
| Chunk size | `pipeline.js` line: `chunkWithMetadata(text, 500, 50)` | 500 words | Larger = more context per chunk, less precise match |
| Overlap | Same call, 3rd argument | 50 words | Higher = better boundary coverage, more storage |
| Top-K results | `searcher.js` — `topK` param | 5 chunks | More chunks = more context, higher token cost |
| Similarity floor | `searcher.js` — `r.similarity > 0.1` | 0.1 | Raise to reduce noise, lower if results are too sparse |
| Max answer tokens | `answerer.js` — `max_tokens` | 1024 | Raise for longer answers |

---

## ⚠️ Known Limitations

- **Scanned PDFs** (image-based) are rejected — no OCR support yet
- **Non-ASCII characters** are stripped during text cleaning (accents, Arabic, Urdu, etc.)
- **Page number tracking** is not yet implemented (`page_number` is stored as `null`)
- **MiniLM similarity scores** run lower in absolute terms than OpenAI embeddings — the `0.1` threshold reflects this and should be re-tuned if switching models
- Switching embedding models requires **re-embedding all existing chunks** (new vectors are incompatible with old ones)

---

## 🔮 Possible Future Improvements

- OCR support for scanned PDFs using Tesseract.js
- Unicode-safe text cleaning (support non-Latin scripts)
- Page number extraction and citation by page
- Streaming Claude responses to the frontend
- Hybrid search (vector + keyword BM25) for better retrieval
- Support for additional file types: `.pptx`, `.csv`, `.xlsx`

---

## 🔐 Security Notes

- Every database query in `searcher.js` is scoped to `user_id` — cross-user data access is structurally prevented at the query level
- API keys are read from environment variables only — never hardcoded
- SSL is enforced on all Postgres connections (`rejectUnauthorized: false` is required specifically for Supabase's hosted Postgres certificate chain)

---

## 📦 Key Dependencies

```json
{
  "@anthropic-ai/sdk": "latest",
  "@xenova/transformers": "latest",
  "pdf-parse": "latest",
  "mammoth": "latest",
  "pg": "latest",
  "@supabase/supabase-js": "latest"
}
```

Install all with:
```bash
npm install @anthropic-ai/sdk @xenova/transformers pdf-parse mammoth pg @supabase/supabase-js
```