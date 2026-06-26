import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const STATUS_COLORS = {
  ready: { bg: "#f0fdf4", text: "#16a34a", dot: "#22c55e" },
  processing: { bg: "#fffbeb", text: "#d97706", dot: "#f59e0b" },
  error: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
};

const FILE_ICONS = { pdf: "📄", docx: "📝", doc: "📝", txt: "📃", default: "📁" };

function getFileIcon(filename) {
  if (!filename) return FILE_ICONS.default;
  const ext = filename.split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}
function getFileExt(filename) {
  if (!filename) return "FILE";
  return filename.split(".").pop().toUpperCase();
}
function formatUploadedTime(isoString) {
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

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(res.data.documents || []);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []); // eslint-disable-line

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch = doc.filename
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: docs.length,
    ready: docs.filter((d) => d.status === "ready").length,
    processing: docs.filter((d) => d.status === "processing").length,
    error: docs.filter((d) => d.status === "error").length,
  };

  return (
    <Layout>
      <div style={s.header}>
        <div>
          <h1 style={s.heading}>My Documents</h1>
          <p style={s.subheading}>
            {docs.length} document{docs.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Search + filter row */}
      <div style={s.toolbar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.searchInput}
          />
        </div>
        <div style={s.filterRow}>
          {[
            { id: "all", label: "All" },
            { id: "ready", label: "Ready" },
            { id: "processing", label: "Processing" },
            { id: "error", label: "Error" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                ...s.filterChip,
                ...(statusFilter === f.id ? s.filterChipActive : {}),
              }}
            >
              {f.label} <span style={s.filterCount}>{statusCounts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={s.emptyState}>
          <div style={s.emptyTitle}>Loading documents…</div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>⬚</div>
          <div style={s.emptyTitle}>
            {search ? "No documents match your search" : "No documents yet"}
          </div>
          <div style={s.emptySub}>
            {search
              ? "Try a different search term"
              : "Upload a document from the Dashboard to get started"}
          </div>
        </div>
      ) : (
        <div style={s.docGrid}>
          {filteredDocs.map((doc) => {
            const sc = STATUS_COLORS[doc.status] || STATUS_COLORS.ready;
            return (
              <div key={doc.id} style={s.docCard}>
                <div style={s.docCardTop}>
                  <div style={s.docIconWrap}>
                    <span style={s.docEmoji}>{getFileIcon(doc.filename)}</span>
                  </div>
                  <span style={{ ...s.statusBadge, background: sc.bg, color: sc.text }}>
                    <span style={{ ...s.statusDot, background: sc.dot }} />
                    {doc.status === "ready" ? "Ready" : doc.status === "processing" ? "Indexing…" : "Error"}
                  </span>
                </div>
                <div style={s.docCardName}>{doc.filename}</div>
                <div style={s.docCardMeta}>
                  <span style={s.extBadge}>{getFileExt(doc.filename)}</span>
                  <span>{formatUploadedTime(doc.created_at)}</span>
                </div>
                {doc.status === "ready" && (
                  <button
                    style={s.chatBtn}
                    onClick={() => navigate(`/chat/${doc.id}`)}
                  >
                    Open chat →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

const s = {
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: "#111827" },
  subheading: { fontSize: 13.5, color: "#6b7280", margin: "5px 0 0" },

  toolbar: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: 14, fontSize: 13, opacity: 0.5 },
  searchInput: {
    width: "100%", padding: "11px 14px 11px 38px", border: "1px solid #e5e7eb",
    borderRadius: 10, fontSize: 13.5, color: "#111827", background: "#ffffff",
    outline: "none", boxSizing: "border-box",
  },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  filterChip: {
    padding: "7px 14px", borderRadius: 20, border: "1px solid #e5e7eb",
    background: "#ffffff", color: "#6b7280", fontSize: 12.5, fontWeight: 500,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },
  filterChipActive: { background: "#4F7EF7", borderColor: "#4F7EF7", color: "#fff" },
  filterCount: { fontSize: 11, opacity: 0.75 },

  emptyState: { textAlign: "center", padding: "48px 24px", border: "1px dashed #e5e7eb", borderRadius: 14, background: "#ffffff" },
  emptyIcon: { fontSize: 30, color: "#d1d5db", marginBottom: 12 },
  emptyTitle: { fontSize: 14.5, fontWeight: 600, color: "#9ca3af", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#c4c9d4" },

  docGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  docCard: {
    background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 14,
    padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10,
  },
  docCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  docIconWrap: {
    width: 36, height: 36, background: "#f8faff", borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid #e0e7ff",
  },
  docEmoji: { fontSize: 17 },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 500 },
  statusDot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block" },
  docCardName: {
    fontSize: 13.5, fontWeight: 500, color: "#111827",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  docCardMeta: { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#9ca3af" },
  extBadge: {
    padding: "2px 7px", background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 5, fontSize: 10, color: "#6b7280", fontWeight: 600,
  },
  chatBtn: {
    padding: "8px", background: "#4F7EF7", border: "none", borderRadius: 8,
    color: "#fff", fontSize: 12.5, fontWeight: 500, cursor: "pointer", marginTop: 4,
  },
};