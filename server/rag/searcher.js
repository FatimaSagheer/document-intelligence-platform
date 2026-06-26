const { Pool } = require("pg");
const { embedText } = require("./pipeline");

// pg Pool — direct Postgres connection for pgvector queries
// Supabase JS client doesn't support raw vector operators (<=>)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase hosted Postgres
});

/**
 * similaritySearch
 * Embeds the user's question and finds the top-k most similar
 * chunks in pgvector — filtered strictly by userId so users
 * can never retrieve each other's documents.
 *
 * @param {string} question   - user's natural language question
 * @param {string} userId     - authenticated user's UUID
 * @param {string} documentId - optional: scope to one document
 * @param {number} topK       - number of chunks to return (default 5)
 * @returns {Promise<{ chunk_text: string, chunk_index: number, similarity: number }[]>}
 */
async function similaritySearch(question, userId, documentId = null, topK = 5) {
  // Step 1: embed the question using the same local model
  const questionVector = await embedText(question);
  const vectorString = JSON.stringify(questionVector);

  // Step 2: build query — filter by userId always, documentId optionally
  let query;
  let params;

  if (documentId) {
    // Scope to one specific document
    query = `
      SELECT
        chunk_text,
        chunk_index,
        page_number,
        1 - (embedding <=> $1::vector) AS similarity
      FROM doc_chunks
      WHERE user_id = $2
        AND document_id = $3
      ORDER BY embedding <=> $1::vector
      LIMIT $4
    `;
    params = [vectorString, userId, documentId, topK];
  } else {
    // Search across ALL user's documents
    query = `
      SELECT
        chunk_text,
        chunk_index,
        page_number,
        document_id,
        1 - (embedding <=> $1::vector) AS similarity
      FROM doc_chunks
      WHERE user_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;
    params = [vectorString, userId, topK];
  }

  const { rows } = await pool.query(query, params);

  // Filter out very low similarity results (below 0.3 = probably irrelevant)
  // MiniLM (local model) produces lower absolute similarity scores than
  // OpenAI embeddings — 0.1 is a reasonable floor for this model.
  // Tune this number based on real testing: too high = empty results,
  // too low = irrelevant chunks get sent to Claude.
  return rows.filter((r) => r.similarity > 0.1);
}

/**
 * buildContext
 * Formats retrieved chunks into a context string for the Claude prompt.
 * Each chunk is labeled with its source number so Claude can cite it.
 *
 * @param {object[]} chunks - results from similaritySearch
 * @returns {string}        - formatted context string
 */
function buildContext(chunks) {
  if (chunks.length === 0) {
    return "No relevant context found in the document.";
  }

  return chunks
    .map((chunk, i) =>
      `[Source ${i + 1}]:\n${chunk.chunk_text}`
    )
    .join("\n\n---\n\n");
}

module.exports = { similaritySearch, buildContext };