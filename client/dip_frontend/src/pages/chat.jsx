import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const FILE_ICONS = { pdf: "📄", docx: "📝", doc: "📝", txt: "📃", default: "📁" };
function getFileIcon(filename) {
  if (!filename) return FILE_ICONS.default;
  const ext = filename.split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

export default function Chat() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(null);
  const [docName, setDocName] = useState("Document");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [suggestedQuestions] = useState([
    "Summarize the key points",
    "What are the main risks mentioned?",
    "What actions are recommended?",
  ]);

  const messagesEndRef = useRef(null);
  const sessionCreated = useRef(false); // prevents double session creation on re-render
  const token = localStorage.getItem("token");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // ── Fetch document name for the header ───────────────────────────────────
  useEffect(() => {
    const fetchDocName = async () => {
      try {
        const res = await axios.get(`${API_URL}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const doc = res.data.documents?.find((d) => d.id === documentId);
        if (doc) setDocName(doc.filename);
      } catch {
        // non-critical — keep default "Document" title
      }
    };
    if (documentId) fetchDocName();
  }, [documentId, token]);

  // ── Create a chat session on mount (guarded against double-fire) ────────
  useEffect(() => {
    if (sessionCreated.current) return;
    sessionCreated.current = true;

    const createSession = async () => {
      try {
        const res = await fetch(`${API_URL}/chat/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ documentId, title: "Chat session" }),
        });
        const data = await res.json();
        if (data.session) {
          setSessionId(data.session.id);
        } else {
          setError("Could not start chat session");
        }
      } catch (err) {
        setError("Failed to connect to server");
      }
    };
    if (documentId) createSession();
  }, [documentId, token]);

  const sendMessage = async (questionText) => {
    const question = (questionText || input).trim();
    if (!question || isStreaming || !sessionId) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setStreaming("");
    setIsStreaming(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/chat/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question, documentId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.replace("data:", "").trim();
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setError(parsed.error);
              continue;
            }
            if (parsed.text) {
              fullText += parsed.text;
              setStreaming(fullText);
            }
          } catch {
            // ignore malformed JSON fragments mid-stream
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
      setStreaming("");
    } catch (err) {
      setError(err.message || "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const renderAnswerWithCitations = (text) => {
    const parts = text.split(/(\[Source \d+\])/g);
    return parts.map((part, i) =>
      /\[Source \d+\]/.test(part) ? (
        <span key={i} style={s.citation}>{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div style={s.shell}>
      {/* ── Header ── */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
        <div style={s.headerInfo}>
          <span style={s.docIcon}>{getFileIcon(docName)}</span>
          <span style={s.docTitle}>{docName}</span>
          <span style={s.ragBadge}>RAG enabled</span>
        </div>
        <div style={{ width: 70 }} />
      </header>

      {/* ── Messages area ── */}
      <main style={s.messagesArea}>
        {messages.length === 0 && !isStreaming && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>💬</div>
            <div style={s.emptyTitle}>Ask anything about this document</div>
            <div style={s.suggestions}>
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  style={s.suggestionChip}
                  onClick={() => sendMessage(q)}
                  disabled={!sessionId}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...s.messageRow,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && <div style={s.aiAvatar}>✦</div>}
            <div style={msg.role === "user" ? s.userBubble : s.aiBubble}>
              {msg.role === "assistant"
                ? renderAnswerWithCitations(msg.content)
                : msg.content}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div style={{ ...s.messageRow, justifyContent: "flex-start" }}>
            <div style={s.aiAvatar}>✦</div>
            <div style={s.aiBubble}>
              {streaming ? (
                renderAnswerWithCitations(streaming)
              ) : (
                <span style={s.typingDots}>
                  <span style={s.dot}></span>
                  <span style={s.dot}></span>
                  <span style={s.dot}></span>
                </span>
              )}
              {streaming && <span style={s.cursor}>▍</span>}
            </div>
          </div>
        )}

        {error && <div style={s.errorBanner}>⚠ {error}</div>}

        <div ref={messagesEndRef} />
      </main>

      {/* ── Input bar ── */}
      <form onSubmit={handleSubmit} style={s.inputBar}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sessionId ? "Ask anything about this document…" : "Connecting…"}
          style={s.input}
          disabled={isStreaming || !sessionId}
        />
        <button
          type="submit"
          style={{
            ...s.sendBtn,
            opacity: isStreaming || !input.trim() ? 0.5 : 1,
          }}
          disabled={isStreaming || !input.trim() || !sessionId}
        >
          {isStreaming ? "..." : "Send →"}
        </button>
      </form>
    </div>
  );
}

// ── Styles — light theme matching Login.jsx / Dashboard.jsx ────────────────
const s = {
  shell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f0f2f7",
    fontFamily: "'Arial', sans-serif",
    color: "#111827",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    borderBottom: "0.5px solid #e5e7eb",
    background: "#ffffff",
    flexShrink: 0,
  },
  backBtn: {
    background: "#fafafa",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    color: "#6b7280",
    fontSize: 12.5,
    padding: "8px 12px",
    cursor: "pointer",
    width: 70,
  },
  headerInfo: { display: "flex", alignItems: "center", gap: 8 },
  docIcon: { fontSize: 16 },
  docTitle: { fontSize: 14.5, fontWeight: 600, color: "#111827" },
  ragBadge: {
    fontSize: 10.5,
    padding: "3px 9px",
    background: "#eef2ff",
    border: "1px solid #e0e7ff",
    borderRadius: 20,
    color: "#4F7EF7",
    fontWeight: 500,
  },

  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxWidth: 760,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 20px",
  },
  emptyIcon: { fontSize: 36, marginBottom: 14, opacity: 0.55 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: "#6b7280", marginBottom: 18 },
  suggestions: { display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 380 },
  suggestionChip: {
    padding: "11px 16px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    color: "#374151",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },

  messageRow: { display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  aiAvatar: {
    width: 26, height: 26, borderRadius: "50%",
    background: "#4F7EF7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, color: "#fff", flexShrink: 0, marginTop: 2,
  },
  userBubble: {
    maxWidth: "75%",
    padding: "11px 16px",
    background: "#4F7EF7",
    borderRadius: "16px 16px 4px 16px",
    fontSize: 13.5,
    lineHeight: 1.55,
    color: "#fff",
  },
  aiBubble: {
    maxWidth: "80%",
    padding: "11px 16px",
    background: "#ffffff",
    border: "0.5px solid #e5e7eb",
    borderRadius: "16px 16px 16px 4px",
    fontSize: 13.5,
    lineHeight: 1.6,
    color: "#111827",
  },
  citation: {
    color: "#4F7EF7",
    fontWeight: 600,
    fontSize: 12,
    background: "#eef2ff",
    padding: "1px 6px",
    borderRadius: 5,
    margin: "0 1px",
  },
  cursor: { color: "#4F7EF7" },
  typingDots: { display: "inline-flex", gap: 4 },
  dot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#c7d2fe", display: "inline-block",
  },

  errorBanner: {
    padding: "11px 16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    color: "#dc2626",
    fontSize: 12.5,
    marginTop: 8,
  },

  inputBar: {
    display: "flex",
    gap: 10,
    padding: "18px 24px",
    borderTop: "0.5px solid #e5e7eb",
    background: "#ffffff",
    flexShrink: 0,
    maxWidth: 760,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    background: "#fafafa",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    color: "#111827",
    fontSize: 13.5,
    outline: "none",
  },
  sendBtn: {
    padding: "0 22px",
    background: "#4F7EF7",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};