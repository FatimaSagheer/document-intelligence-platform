const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * extractText
 * Extracts plain text from a file buffer based on its MIME type.
 *
 * @param {Buffer} buffer   - raw file bytes (from multer memoryStorage)
 * @param {string} mimetype - file MIME type
 * @returns {Promise<string>} - extracted plain text
 */
async function extractText(buffer, mimetype) {
  try {
    // ── PDF ──────────────────────────────────────────────────────────────
    if (mimetype === "application/pdf") {
      const data = await pdfParse(buffer);
      if (!data.text || data.text.trim().length === 0) {
        throw new Error(
          "PDF appears to be scanned/image-based — no extractable text found."
        );
      }
      return cleanText(data.text);
    }

    // ── DOCX ─────────────────────────────────────────────────────────────
    if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword"
    ) {

// Extract the raw text of the document. This will ignore all formatting in the document. Each paragraph is followed by two newlines.

// input: an object describing the source document. On node.js, the following inputs are supported:

// {path: path}, where path is the path to the .docx file.
// {buffer: buffer}, where buffer is a node.js Buffer containing a .docx file.
// In the browser, the following inputs are supported:

// {arrayBuffer: arrayBuffer}, where arrayBuffer is an array buffer containing a .docx file.
// Returns a promise containing a result. This result has the following properties:

// value: the raw text

// messages: any messages, such as errors and warnings

      const { value } = await mammoth.extractRawText({ buffer });
      if (!value || value.trim().length === 0) {
        throw new Error("DOCX file appears to be empty.");
      }
      return cleanText(value);
    }

    // ── Plain text ────────────────────────────────────────────────────────
    if (mimetype === "text/plain") {
      const text = buffer.toString("utf-8");
      if (!text || text.trim().length === 0) {
        throw new Error("Text file is empty.");
      }
      return cleanText(text);
    }

    // ── Unsupported ───────────────────────────────────────────────────────
    throw new Error(`Unsupported file type: ${mimetype}`);

  } catch (error) {
    // Re-throw with context so the caller can handle it properly
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

/**
 * cleanText
 * Removes excessive whitespace, blank lines, and non-printable characters
 * that would pollute chunks and waste embedding tokens.
 *
 * @param {string} text - raw extracted text
 * @returns {string}    - cleaned text
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")          // normalize line endings
    .replace(/\r/g, "\n")             // normalize old Mac line endings
    .replace(/\t/g, " ")              // tabs to spaces
    .replace(/[^\S\n]+/g, " ")        // collapse multiple spaces (not newlines)
    .replace(/\n{3,}/g, "\n\n")       // max 2 consecutive blank lines
    .replace(/[^\x20-\x7E\n]/g, "")  // remove non-printable ASCII chars
    .trim();
}

/**
 * getWordCount
 * Quick helper to estimate token count before chunking.
 * Rough rule: 1 token ≈ 0.75 words (OpenAI approximation)
 *
 * @param {string} text
 * @returns {{ words: number, estimatedTokens: number }}
 */
function getWordCount(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    words,
    estimatedTokens: Math.round(words / 0.75),
  };
}

module.exports = { extractText, cleanText, getWordCount };