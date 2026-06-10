const supabase = require("../config/supabase");
const { extractText } = require("./extractor");
const { chunkWithMetadata, getChunkStats } = require("./chunker");

// Singleton — model loads once, reused for every embedding call
let embedder = null;

/**
 * getEmbedder
 * Lazy-loads the local embedding model on first call.
 * Uses all-MiniLM-L6-v2 — runs entirely in Node.js, no API needed.
 * Produces 384-dimensional vectors.
 */
async function getEmbedder() {
  if (!embedder) {
    console.log("[RAG] Loading local embedding model (first time only)...");
    const { pipeline } = await import("@xenova/transformers");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("[RAG] Embedding model loaded ✓");
  }
  return embedder;
}

/**
 * embedText
 * Embeds a single string locally.
 * Returns a 384-dimensional float array.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedText(text) {
  const embed = await getEmbedder();
  const output = await embed(text, { pooling: "mean", normalize: true });
  return Array.from(output.data); // convert Float32Array to plain array
}

/**
 * processDocument
 * Full RAG pipeline — extract → chunk → embed → store in pgvector
 *
 * @param {string} docId
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} userId
 */
async function processDocument(docId, buffer, mimetype, userId) {
  console.log(`[RAG] Starting pipeline for doc ${docId}`);

  try {
    // Step 1: Extract text
    console.log(`[RAG] Extracting text...`);
    const text = await extractText(buffer, mimetype);
    console.log(`[RAG] Extracted ${text.length} characters`);

    // Step 2: Chunk
    console.log(`[RAG] Chunking...`);
    const chunks = chunkWithMetadata(text, 500, 50);
    const stats = getChunkStats(chunks.map((c) => c.text));
    console.log(`[RAG] ${stats.total} chunks (avg ${stats.avgWords} words)`);

    // Step 3+4: Embed each chunk + store in pgvector
    console.log(`[RAG] Embedding and storing...`);

    for (const chunk of chunks) {
      const vector = await embedText(chunk.text);

      const { error } = await supabase.from("doc_chunks").insert({
        document_id: docId,
        user_id: userId,
        chunk_index: chunk.index,
        chunk_text: chunk.text,
        embedding: JSON.stringify(vector),
        page_number: null,
      });

      if (error) {
        throw new Error(`Chunk ${chunk.index} store failed: ${error.message}`);
      }

      console.log(`[RAG] Chunk ${chunk.index + 1}/${chunks.length} stored`);
    }

    // Step 5: Mark document ready
    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", docId);

    console.log(`[RAG] Pipeline complete — ${chunks.length} chunks stored ✓`);

  } catch (error) {
    console.error(`[RAG] Pipeline failed:`, error.message);
    await supabase
      .from("documents")
      .update({ status: "error" })
      .eq("id", docId);
  }
}

module.exports = { processDocument, embedText };