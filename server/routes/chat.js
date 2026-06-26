const router = require("express").Router();
const Groq = require("groq-sdk");
const supabase = require("../config/supabase");
const requireAuth = require("../middleware/auth");
const { similaritySearch, buildContext } = require("../rag/searcher");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * POST /api/chat/sessions/:sessionId/chat
 * Streams an LLM answer grounded in the user's documents via RAG.
 *
 * Flow:
 * 1. Validate the session belongs to this user
 * 2. Save the user's message to chat_messages
 * 3. Run similarity search to find relevant chunks
 * 4. Build context + system prompt
 * 5. Stream the LLM's response via SSE
 * 6. Save the assistant's full response once streaming completes
 */
router.post("/sessions/:sessionId/chat", requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  const { question, documentId } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // ── Step 1: Verify session belongs to this user ────────────────────
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", req.user.id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // ── Step 2: Save user's message ─────────────────────────────────────
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: question,
    });

    // ── Step 3: Retrieve relevant chunks ─────────────────────────────────
    const chunks = await similaritySearch(question, req.user.id, documentId);
    const context = buildContext(chunks);

    // ── Step 4: Build the system prompt ──────────────────────────────────
    const systemPrompt = `You are a helpful document assistant. Answer the user's question using ONLY the context provided below.

Rules:
- Always cite your source using the format [Source N] when you use information from it.
- If the context does not contain enough information to answer, say so clearly — do not make up an answer.
- Be concise and direct.

Context from the document:
${context}`;

    // ── Step 5: Set up SSE headers ───────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullAnswer = "";

    // ── Step 6: Stream from Groq (Llama model, OpenAI-compatible API) ────
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // free tier, fast, high quality
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      stream: true,
      max_tokens: 1024,
    });

    for await (const chunk of stream) {
      const textDelta = chunk.choices[0]?.delta?.content || "";
      if (textDelta) {
        fullAnswer += textDelta;
        res.write(`data: ${JSON.stringify({ text: textDelta })}\n\n`);
      }
    }

    // ── Step 7: Save the complete assistant response ──────────────────────
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: fullAnswer,
      sources: chunks.map((c, i) => ({
        source: i + 1,
        chunk_index: c.chunk_index,
        page_number: c.page_number,
        similarity: c.similarity,
      })),
    });

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("[Chat] Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/chat/sessions
 * Creates a new chat session for a document.
 */
router.post("/sessions", requireAuth, async (req, res) => {
  const { documentId, title } = req.body;

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: req.user.id,
      document_id: documentId,
      title: title || "New chat",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ session: data });
});
/**
 * GET /api/chat/sessions
 * Lists ALL chat sessions for the authenticated user, across all documents.
 * Joins with documents table to get the filename for display.
 */
router.get("/sessions", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select(`
      id,
      title,
      created_at,
      document_id,
      documents ( filename )
    `)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sessions: data });
});

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Returns all messages in a session, for loading chat history.
 */
router.get("/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  const { sessionId } = req.params;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages: data });
});

module.exports = router;