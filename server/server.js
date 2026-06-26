require("dotenv").config();

const express = require("express");
const cors = require("cors");
const supabase = require("./config/supabase");
// const documentRoutes = require("./routes/documentRoutes");
const app = express();

// Connect Database
// connectDB();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('count');
  if (error) return res.json({ status: 'error', error: error.message });
  res.json({ status: 'connected ✓' });
});
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));

app.get('/test-search', async (req, res) => {
  const { similaritySearch } = require('./rag/searcher');
  // Replace with your actual test user's UUID from Supabase Auth
  const results = await similaritySearch('What is RAG?', 'df2d835c-5e0e-45f8-9c72-990ce7e8b628');
  res.json({ results });
});

app.get('/test-chunk', (req, res) => {
  const { chunkWithMetadata, getChunkStats } = require('./rag/chunker');

  // simulate a longer document
  const text = Array(600).fill('word').join(' ');
  const chunks = chunkWithMetadata(text, 500, 50);
  const stats = getChunkStats(chunks.map(c => c.text));

  res.json({ stats, firstChunk: chunks[0], lastChunk: chunks[chunks.length - 1] });
});
app.use('/api/chat', require('./routes/chat'));
// app.get('/test-extract', async (req, res) => {
//   const { extractText, getWordCount } = require('./rag/extractor');
//   const fs = require('fs');
//   // create a test buffer from any text
//   const buf = Buffer.from('Hello world. This is a test document. It has three sentences.');
//   const text = await extractText(buf, 'text/plain');
//   res.json({ text, ...getWordCount(text) });
// });
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});