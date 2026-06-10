/**
 * chunker.js
 * Splits extracted text into overlapping chunks for embedding.
 *
 * Why overlap? If an answer spans the boundary between two chunks,
 * overlap ensures the context is not lost — both chunks contain
 * the bridging sentences.
 */

/**
 * chunkText
 * Splits text into word-based chunks with overlap.
 *
 * @param {string} text        - cleaned extracted text
 * @param {number} chunkSize   - words per chunk (default 500)
 * @param {number} overlap     - words shared between chunks (default 50)
 * @returns {string[]}         - array of chunk strings
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot chunk empty text.");
  }

  if (overlap >= chunkSize) {
    throw new Error("Overlap must be smaller than chunkSize.");
  }

  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    throw new Error("No words found in text.");
  }

  // If the entire document is smaller than one chunk — return as single chunk
  if (words.length <= chunkSize) {
    return [words.join(" ")];
  }

  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);

    // If the next step would go past the end — stop
    // This prevents a tiny leftover chunk at the end
    if (i + chunkSize >= words.length) break;

    i += chunkSize - overlap; // slide forward by (chunkSize - overlap)
  }

  return chunks;
}

/**
 * chunkWithMetadata
 * Same as chunkText but returns objects with index and word count.
 * Used by pipeline.js when storing chunks in the database.
 *
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {{ index: number, text: string, wordCount: number }[]}
 */
function chunkWithMetadata(text, chunkSize = 500, overlap = 50) {
  const chunks = chunkText(text, chunkSize, overlap);

  return chunks.map((chunk, index) => ({
    index,
    text: chunk,
    wordCount: chunk.split(/\s+/).filter(Boolean).length,
  }));
}

/**
 * getChunkStats
 * Returns stats about the chunks — useful for logging and debugging.
 *
 * @param {string[]} chunks
 * @returns {{ total: number, avgWords: number, minWords: number, maxWords: number }}
 */
function getChunkStats(chunks) {
  const wordCounts = chunks.map(
    (c) => c.split(/\s+/).filter(Boolean).length
  );
  return {
    total: chunks.length,
    avgWords: Math.round(wordCounts.reduce((a, b) => a + b, 0) / chunks.length),
    minWords: Math.min(...wordCounts),
    maxWords: Math.max(...wordCounts),
  };
}

module.exports = { chunkText, chunkWithMetadata, getChunkStats };