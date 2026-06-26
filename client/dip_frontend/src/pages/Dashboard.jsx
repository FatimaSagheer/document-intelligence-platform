import { useState, useRef, useEffect } from "react";
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

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(res.data.documents || []);
    } catch (err) {
      showNotification(err?.response?.data?.error || "Failed to load documents", "error");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => { fetchDocuments(); // eslint-disable-line
  }, []);

  useEffect(() => {
    const hasProcessing = docs.some((d) => d.status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [docs]);

  const handleRealUpload = async (file) => {
    setUploadingFile(file.name);
    setUploading(true);
    setUploadProgress(30);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (e) =>
          setUploadProgress(Math.round((e.loaded / e.total) * 90)),
      });
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadingFile(null);
        setUploadProgress(0);
        fetchDocuments();
        showNotification(`"${file.name}" uploaded successfully`);
      }, 400);
    } catch (err) {
      setUploading(false);
      setUploadProgress(0);
      showNotification(err?.response?.data?.error || "Upload failed", "error");
    }
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;
    const allowed = ["pdf", "docx", "doc", "txt"];
    const ext = file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showNotification("Only PDF, DOCX, DOC, TXT files allowed", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showNotification("File too large — max 20MB", "error");
      return;
    }
    handleRealUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <Layout>
      {notification && (
        <div style={{
          ...s.notification,
          background: notification.type === "error" ? "#fef2f2" : "#f0fdf4",
          borderColor: notification.type === "error" ? "#fecaca" : "#bbf7d0",
          color: notification.type === "error" ? "#dc2626" : "#16a34a",
        }}>
          {notification.type === "error" ? "✕" : "✓"}&nbsp;&nbsp;{notification.msg}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.heading}>Dashboard</h1>
          <p style={s.subheading}>
            {docs.length} document{docs.length !== 1 ? "s" : ""} ·{" "}
            {docs.filter((d) => d.status === "ready").length} ready to chat
          </p>
        </div>
        <button style={s.uploadBtn} onClick={() => fileInputRef.current.click()}>
          + Upload Document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div style={s.statsRow}>
        {[
          { label: "Total documents", value: docs.length, accent: "#4F7EF7" },
          { label: "Ready to chat", value: docs.filter(d => d.status === "ready").length, accent: "#16a34a" },
          { label: "Processing", value: docs.filter(d => d.status === "processing").length, accent: "#d97706" },
          { label: "Chat sessions", value: 0, accent: "#9333ea" },
        ].map((stat) => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ ...s.statValue, color: stat.accent }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current.click()}
        style={{
          ...s.dropZone,
          ...(dragOver ? s.dropZoneActive : {}),
          cursor: uploading ? "default" : "pointer",
        }}
      >
        {uploading ? (
          <div style={s.uploadingState}>
            <div style={s.uploadingIcon}>⟳</div>
            <div style={s.uploadingName}>Uploading {uploadingFile}</div>
            <div style={s.progressBarWrap}>
              <div style={{ ...s.progressBar, width: `${uploadProgress}%` }} />
            </div>
            <div style={s.progressText}>{Math.min(Math.round(uploadProgress), 100)}%</div>
          </div>
        ) : (
          <div style={s.dropContent}>
            <div style={s.dropIcon}>↑</div>
            <div style={s.dropTitle}>
              {dragOver ? "Drop to upload" : "Drag & drop your document here"}
            </div>
            <div style={s.dropSub}>or click to browse — PDF, DOCX, TXT up to 20MB</div>
            <div style={s.dropFormats}>
              {["PDF", "DOCX", "DOC", "TXT"].map(f => (
                <span key={f} style={s.formatBadge}>{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Recent documents</span>
          <span style={s.sectionCount}>{docs.length} total</span>
        </div>

        {loadingDocs ? (
          <div style={s.emptyState}><div style={s.emptyTitle}>Loading documents…</div></div>
        ) : docs.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>⬚</div>
            <div style={s.emptyTitle}>No documents yet</div>
            <div style={s.emptySub}>Upload a document above to get started</div>
          </div>
        ) : (
          <div style={s.docList}>
            {docs.slice(0, 5).map((doc) => {
              const sc = STATUS_COLORS[doc.status] || STATUS_COLORS.ready;
              return (
                <div key={doc.id} style={s.docRow}>
                  <div style={s.docLeft}>
                    <div style={s.docIconWrap}>
                      <span style={s.docEmoji}>{getFileIcon(doc.filename)}</span>
                    </div>
                    <div style={s.docInfo}>
                      <div style={s.docName}>{doc.filename}</div>
                      <div style={s.docMeta}>{formatUploadedTime(doc.created_at)}</div>
                    </div>
                  </div>
                  <div style={s.docRight}>
                    <span style={{ ...s.statusBadge, background: sc.bg, color: sc.text }}>
                      <span style={{ ...s.statusDot, background: sc.dot }} />
                      {doc.status === "ready" ? "Ready" : doc.status === "processing" ? "Indexing…" : "Error"}
                    </span>
                    <span style={s.extBadge}>{getFileExt(doc.filename)}</span>
                    {doc.status === "ready" && (
                      <button style={s.chatBtn} onClick={() => navigate(`/chat/${doc.id}`)}>
                        Chat →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {docs.length > 5 && (
              <button style={s.viewAllBtn} onClick={() => navigate("/documents")}>
                View all {docs.length} documents →
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  notification: {
    position: "fixed", top: 20, right: 20, zIndex: 999,
    padding: "12px 20px", borderRadius: 10, border: "1px solid",
    fontSize: 13, fontWeight: 500,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: "#111827" },
  subheading: { fontSize: 13.5, color: "#6b7280", margin: "5px 0 0" },
  uploadBtn: {
    padding: "11px 20px", background: "#4F7EF7",
    border: "none", borderRadius: 9, color: "#fff",
    fontSize: 13.5, fontWeight: 500, cursor: "pointer",
  },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 26 },
  statCard: { background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "18px 20px" },
  statValue: { fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 5 },
  statLabel: { fontSize: 11.5, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" },

  dropZone: {
    border: "1.5px dashed #c7d2fe", borderRadius: 14, padding: "38px 24px",
    textAlign: "center", marginBottom: 28, background: "#f8faff",
    transition: "all 0.2s",
  },
  dropZoneActive: { borderColor: "#4F7EF7", background: "#eef2ff" },
  dropContent: {},
  dropIcon: { fontSize: 30, color: "#4F7EF7", marginBottom: 10, display: "block" },
  dropTitle: { fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 },
  dropSub: { fontSize: 12.5, color: "#9ca3af", marginBottom: 14 },
  dropFormats: { display: "flex", gap: 8, justifyContent: "center" },
  formatBadge: {
    padding: "3px 11px", background: "#ffffff", border: "1px solid #e0e7ff",
    borderRadius: 20, fontSize: 11, color: "#4F7EF7", fontWeight: 500,
  },

  uploadingState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  uploadingIcon: { fontSize: 26, color: "#4F7EF7" },
  uploadingName: { fontSize: 13, color: "#374151", fontWeight: 500 },
  progressBarWrap: { width: "60%", height: 5, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  progressBar: { height: "100%", background: "#4F7EF7", borderRadius: 4, transition: "width 0.15s ease" },
  progressText: { fontSize: 12, color: "#9ca3af" },

  section: {},
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 12.5, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  sectionCount: { fontSize: 12, color: "#9ca3af" },

  emptyState: { textAlign: "center", padding: "48px 24px", border: "1px dashed #e5e7eb", borderRadius: 14, background: "#ffffff" },
  emptyIcon: { fontSize: 30, color: "#d1d5db", marginBottom: 12 },
  emptyTitle: { fontSize: 14.5, fontWeight: 600, color: "#9ca3af", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#c4c9d4" },

  docList: { display: "flex", flexDirection: "column", gap: 8 },
  docRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "13px 18px", background: "#ffffff", border: "0.5px solid #e5e7eb",
    borderRadius: 12, gap: 12,
  },
  docLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 },
  docIconWrap: {
    width: 38, height: 38, background: "#f8faff", borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, border: "1px solid #e0e7ff",
  },
  docEmoji: { fontSize: 18 },
  docInfo: { minWidth: 0 },
  docName: {
    fontSize: 13.5, fontWeight: 500, color: "#111827",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320,
  },
  docMeta: { fontSize: 11.5, color: "#9ca3af", marginTop: 2 },
  docRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
  statusDot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block" },
  extBadge: {
    padding: "3px 8px", background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 5, fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em",
  },
  chatBtn: {
    padding: "6px 14px", background: "#4F7EF7",
    border: "none", borderRadius: 7, color: "#fff",
    fontSize: 12, fontWeight: 500, cursor: "pointer",
  },
  viewAllBtn: {
    padding: "11px", background: "#f8faff", border: "1px dashed #c7d2fe",
    borderRadius: 12, color: "#4F7EF7", fontSize: 12.5, fontWeight: 500,
    cursor: "pointer", marginTop: 4,
  },
};