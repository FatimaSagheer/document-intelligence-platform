import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "https://verbose-space-capybara-55wqww79j9whp7r-5000.app.github.dev/api";

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
  const token = localStorage.getItem("token");

  // ── Scroll to bottom whenever messages or streaming text changes ────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // ── Create a chat session on mount ───────────────────────────────────────
  useEffect(() => {
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

  // ── Send a message and stream the response ───────────────────────────────
  const sendMessage = async (questionText) => {
    const question = (questionText || input).trim();
    if (!question || isStreaming || !sessionId) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setStreaming("");
    setIsStreaming(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/chat/sessions/${sessionId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question, documentId }),
        }
      );

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
        buffer = lines.pop(); // keep incomplete line for next chunk

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

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullText },
      ]);
      setStreaming("");
    } catch (err) {
      setError(err.message || "Something went wrong");
      setMessages((prev) => prev.slice(0, -1)); // remove the user message on failure
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const renderAnswerWithCitations = (text) => {
    // Highlight [Source N] citations inline
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
          <span style={s.docIcon}>📄</span>
          <span style={s.docTitle}>{docName}</span>
          <span style={s.ragBadge}>RAG enabled</span>
        </div>
        <div style={{ width: 70 }} /> {/* spacer for centering */}
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
            <div
              style={
                msg.role === "user" ? s.userBubble : s.aiBubble
              }
            >
              {msg.role === "assistant"
                ? renderAnswerWithCitations(msg.content)
                : msg.content}
            </div>
          </div>
        ))}

        {/* ── Live streaming bubble ── */}
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

        {error && (
          <div style={s.errorBanner}>
            ⚠ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* ── Input bar ── */}
      <form onSubmit={handleSubmit} style={s.inputBar}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            sessionId ? "Ask anything about this document…" : "Connecting…"
          }
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

// ── Styles ────────────────────────────────────────────────────────────────
const s = {
  shell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0A0F1A",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: "#E2E8F0",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid #1E2A3A",
    background: "#0D1424",
    flexShrink: 0,
  },
  backBtn: {
    background: "transparent",
    border: "1px solid #1E2A3A",
    borderRadius: 7,
    color: "#94A3B8",
    fontSize: 12,
    padding: "7px 12px",
    cursor: "pointer",
    width: 70,
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  docIcon: { fontSize: 15 },
  docTitle: { fontSize: 14, fontWeight: 600, color: "#F1F5F9" },
  ragBadge: {
    fontSize: 10,
    padding: "2px 8px",
    background: "#131E30",
    border: "1px solid #1E2A3A",
    borderRadius: 20,
    color: "#60A5FA",
    fontWeight: 500,
  },

  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxWidth: 760,
    width: "100%",
    margin: "0 auto",
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
  emptyIcon: { fontSize: 36, marginBottom: 14, opacity: 0.6 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#94A3B8",
    marginBottom: 18,
  },
  suggestions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxWidth: 360,
  },
  suggestionChip: {
    padding: "10px 16px",
    background: "#0D1424",
    border: "1px solid #1E2A3A",
    borderRadius: 9,
    color: "#CBD5E1",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },

  messageRow: {
    display: "flex",
    gap: 10,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366F1, #3B82F6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#fff",
    flexShrink: 0,
    marginTop: 2,
  },
  userBubble: {
    maxWidth: "75%",
    padding: "10px 16px",
    background: "linear-gradient(135deg, #3B82F6, #6366F1)",
    borderRadius: "14px 14px 4px 14px",
    fontSize: 13.5,
    lineHeight: 1.5,
    color: "#fff",
  },
  aiBubble: {
    maxWidth: "80%",
    padding: "10px 16px",
    background: "#0D1424",
    border: "1px solid #1E2A3A",
    borderRadius: "14px 14px 14px 4px",
    fontSize: 13.5,
    lineHeight: 1.6,
    color: "#E2E8F0",
  },
  citation: {
    color: "#60A5FA",
    fontWeight: 600,
    fontSize: 12,
    background: "#131E30",
    padding: "1px 5px",
    borderRadius: 4,
    margin: "0 1px",
  },
  cursor: {
    color: "#60A5FA",
    animation: "blink 1s step-start infinite",
  },
  typingDots: {
    display: "inline-flex",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#475569",
    display: "inline-block",
    animation: "bounce 1.4s infinite ease-in-out",
  },

  errorBanner: {
    padding: "10px 16px",
    background: "#2E0F0F",
    border: "1px solid #EF4444",
    borderRadius: 9,
    color: "#F87171",
    fontSize: 12,
    marginTop: 8,
  },

  inputBar: {
    display: "flex",
    gap: 10,
    padding: "16px 20px",
    borderTop: "1px solid #1E2A3A",
    background: "#0D1424",
    flexShrink: 0,
    maxWidth: 760,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    background: "#0A0F1A",
    border: "1px solid #1E2A3A",
    borderRadius: 10,
    color: "#E2E8F0",
    fontSize: 13.5,
    outline: "none",
  },
  sendBtn: {
    padding: "0 20px",
    background: "linear-gradient(135deg, #3B82F6, #6366F1)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};