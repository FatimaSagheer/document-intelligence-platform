import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const diffMs = new Date() - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

const FILE_ICONS = { pdf: "📄", docx: "📝", doc: "📝", txt: "📃", default: "📁" };
function getFileIcon(filename) {
  if (!filename) return FILE_ICONS.default;
  const ext = filename.split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

export default function ChatHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get(`${API_URL}/chat/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessions(res.data.sessions || []);
      } catch (err) {
        console.error("Failed to load chat history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [token]);

  // Group sessions by document for a cleaner view
  const groupedByDoc = sessions.reduce((acc, session) => {
    const docName = session.documents?.filename || "Unknown document";
    if (!acc[docName]) acc[docName] = { sessions: [], documentId: session.document_id };
    acc[docName].sessions.push(session);
    return acc;
  }, {});

  return (
    <Layout>
      <div style={s.header}>
        <div>
          <h1 style={s.heading}>Chat History</h1>
          <p style={s.subheading}>
            {sessions.length} conversation{sessions.length !== 1 ? "s" : ""} across{" "}
            {Object.keys(groupedByDoc).length} document{Object.keys(groupedByDoc).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={s.emptyState}>
          <div style={s.emptyTitle}>Loading chat history…</div>
        </div>
      ) : sessions.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>◷</div>
          <div style={s.emptyTitle}>No conversations yet</div>
          <div style={s.emptySub}>
            Open a document and start chatting to see your history here
          </div>
        </div>
      ) : (
        <div style={s.groupList}>
          {Object.entries(groupedByDoc).map(([docName, group]) => (
            <div key={docName} style={s.docGroup}>
              <div style={s.docGroupHeader}>
                <span style={s.docGroupIcon}>{getFileIcon(docName)}</span>
                <span style={s.docGroupName}>{docName}</span>
                <span style={s.docGroupCount}>{group.sessions.length}</span>
              </div>
              <div style={s.sessionList}>
                {group.sessions.map((session) => (
                  <button
                    key={session.id}
                    style={s.sessionRow}
                    onClick={() => navigate(`/chat/${group.documentId}`)}
                  >
                    <div style={s.sessionIcon}>💬</div>
                    <div style={s.sessionInfo}>
                      <div style={s.sessionTitle}>{session.title || "Untitled chat"}</div>
                      <div style={s.sessionDate}>{formatDate(session.created_at)}</div>
                    </div>
                    <span style={s.sessionArrow}>→</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

const s = {
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: "#111827" },
  subheading: { fontSize: 13.5, color: "#6b7280", margin: "5px 0 0" },

  emptyState: { textAlign: "center", padding: "48px 24px", border: "1px dashed #e5e7eb", borderRadius: 14, background: "#ffffff" },
  emptyIcon: { fontSize: 30, color: "#d1d5db", marginBottom: 12 },
  emptyTitle: { fontSize: 14.5, fontWeight: 600, color: "#9ca3af", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#c4c9d4" },

  groupList: { display: "flex", flexDirection: "column", gap: 16 },
  docGroup: { background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden" },
  docGroupHeader: {
    display: "flex", alignItems: "center", gap: 10, padding: "14px 18px",
    background: "#f8faff", borderBottom: "0.5px solid #e5e7eb",
  },
  docGroupIcon: { fontSize: 16 },
  docGroupName: { fontSize: 13.5, fontWeight: 600, color: "#111827", flex: 1 },
  docGroupCount: {
    fontSize: 11, color: "#4F7EF7", background: "#eef2ff",
    padding: "2px 8px", borderRadius: 20, fontWeight: 600,
  },
  sessionList: { display: "flex", flexDirection: "column" },
  sessionRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
    border: "none", borderBottom: "0.5px solid #f3f4f6", background: "transparent",
    cursor: "pointer", textAlign: "left", width: "100%",
  },
  sessionIcon: { fontSize: 15, opacity: 0.6 },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionTitle: { fontSize: 13, fontWeight: 500, color: "#111827" },
  sessionDate: { fontSize: 11.5, color: "#9ca3af", marginTop: 2 },
  sessionArrow: { color: "#c7d2fe", fontSize: 14 },
};