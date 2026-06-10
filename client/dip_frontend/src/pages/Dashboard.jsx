import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// ── mock recent docs (replace with real API call) ─────────────────────────
const MOCK_DOCS = [
  { id: 1, name: "Q3 Financial Report.pdf", pages: 14, status: "ready", uploaded: "2h ago", size: "2.4 MB" },
  { id: 2, name: "Product Roadmap 2026.docx", pages: 8, status: "ready", uploaded: "Yesterday", size: "1.1 MB" },
  { id: 3, name: "Legal Agreement v2.txt", pages: 3, status: "processing", uploaded: "3 days ago", size: "0.3 MB" },
];

const STATUS_COLORS = {
  ready: { bg: "#0F2E1E", text: "#4ADE80", dot: "#22C55E" },
  processing: { bg: "#1E1A0F", text: "#FBBF24", dot: "#F59E0B" },
  error: { bg: "#2E0F0F", text: "#F87171", dot: "#EF4444" },
};

const FILE_ICONS = {
  pdf: "📄",
  docx: "📝",
  doc: "📝",
  txt: "📃",
  default: "📁",
};

function getFileIcon(filename) {
  if (!filename) return FILE_ICONS.default;

  const ext = filename.split(".").pop().toLowerCase();

  return FILE_ICONS[ext] || FILE_ICONS.default;
}
function getFileExt(filename) {
    if (!filename) return FILE_ICONS.default;
  return filename.split(".").pop().toUpperCase();
}

export default function Dashboard() {
  const [docs, setDocs] = useState(MOCK_DOCS);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

 const handleRealUpload = async (file) => {
  setUploadingFile(file.name);
  setUploading(true);
  setUploadProgress(30);


  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post(
     'https://verbose-space-capybara-55wqww79j9whp7r-5000.app.github.dev/api/documents/upload',
      formData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 90));
        },
      }
    );

    setUploadProgress(100);
    setTimeout(() => {
      setUploading(false);
      setUploadingFile(null);
      setUploadProgress(0);
      setDocs(prev => [res.data.document, ...prev]);
      showNotification(`"${file.name}" uploaded successfully`);
    }, 400);

  } catch (err) {
    setUploading(false);
    setUploadProgress(0);
    showNotification(
      err?.response?.data?.error || 'Upload failed', 'error'
    );
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "documents", icon: "⬚", label: "My Documents" },
    { id: "history", icon: "◷", label: "Chat History" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  return (
    <div style={s.shell}>

      {/* ── Notification ── */}
      {notification && (
        <div style={{
          ...s.notification,
          background: notification.type === "error" ? "#2E0F0F" : "#0F2E1E",
          borderColor: notification.type === "error" ? "#EF4444" : "#22C55E",
          color: notification.type === "error" ? "#F87171" : "#4ADE80",
        }}>
          {notification.type === "error" ? "✕" : "✓"}&nbsp;&nbsp;{notification.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoIcon}>D</div>
          <span style={s.logoText}>DocQA</span>
        </div>

        <nav style={s.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                ...s.navItem,
                ...(activeNav === item.id ? s.navItemActive : {}),
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.userRow}>
            <div style={s.avatar}>FS</div>
            <div style={s.userInfo}>
              <div style={s.userName}>Fatima Sagheer</div>
              <div style={s.userEmail}>fatima@email.com</div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>
            ⎋ Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Dashboard</h1>
            <p style={s.subheading}>{docs.length} document{docs.length !== 1 ? "s" : ""} · {docs.filter(d => d.status === "ready").length} ready to chat</p>
          </div>
          <button
            style={s.uploadBtn}
            onClick={() => fileInputRef.current.click()}
          >
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

        {/* Stats row */}
        <div style={s.statsRow}>
          {[
            { label: "Total documents", value: docs.length, accent: "#60A5FA" },
            { label: "Ready to chat", value: docs.filter(d => d.status === "ready").length, accent: "#4ADE80" },
            { label: "Processing", value: docs.filter(d => d.status === "processing").length, accent: "#FBBF24" },
            { label: "Chat sessions", value: 0, accent: "#A78BFA" },
          ].map((stat) => (
            <div key={stat.label} style={s.statCard}>
              <div style={{ ...s.statValue, color: stat.accent }}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Upload zone */}
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

        {/* Documents list */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>Recent documents</span>
            <span style={s.sectionCount}>{docs.length} total</span>
          </div>

          {docs.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>⬚</div>
              <div style={s.emptyTitle}>No documents yet</div>
              <div style={s.emptySub}>Upload a document above to get started</div>
            </div>
          ) : (
            <div style={s.docList}>
              {docs.map((doc) => {
                const sc = STATUS_COLORS[doc.status] || STATUS_COLORS.ready;
                return (
                  <div key={doc.id} style={s.docRow}>
                    <div style={s.docLeft}>
                      <div style={s.docIconWrap}>
                        <span style={s.docEmoji}>{getFileIcon(doc.name)}</span>
                      </div>
                      <div style={s.docInfo}>
                        <div style={s.docName}>{doc.name}</div>
                        <div style={s.docMeta}>
                          {doc.pages} pages · {doc.size} · {doc.uploaded}
                        </div>
                      </div>
                    </div>
                    <div style={s.docRight}>
                      <span style={{
                        ...s.statusBadge,
                        background: sc.bg,
                        color: sc.text,
                      }}>
                        <span style={{ ...s.statusDot, background: sc.dot }} />
                        {doc.status === "ready" ? "Ready" : doc.status === "processing" ? "Indexing…" : "Error"}
                      </span>
                      <span style={s.extBadge}>{getFileExt(doc.name)}</span>
                      {doc.status === "ready" && (
                        <button
                          style={s.chatBtn}
                          onClick={() => navigate(`/chat/${doc.id}`)}
                        >
                          Chat →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#0A0F1A",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: "#E2E8F0",
  },
  notification: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 999,
    padding: "12px 20px",
    borderRadius: 8,
    border: "1px solid",
    fontSize: 13,
    fontWeight: 500,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    animation: "fadeIn 0.2s ease",
  },

  // Sidebar
  sidebar: {
    width: 220,
    minHeight: "100vh",
    background: "#0D1424",
    borderRight: "1px solid #1E2A3A",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    flexShrink: 0,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "24px 20px 20px",
    borderBottom: "1px solid #1E2A3A",
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, #3B82F6, #6366F1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
    color: "#fff",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#F1F5F9",
    letterSpacing: "-0.3px",
  },
  nav: {
    flex: 1,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 7,
    border: "none",
    background: "transparent",
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s",
  },
  navItemActive: {
    background: "#1E2D4A",
    color: "#60A5FA",
  },
  navIcon: {
    fontSize: 15,
    width: 18,
    textAlign: "center",
  },
  sidebarBottom: {
    padding: "16px",
    borderTop: "1px solid #1E2A3A",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366F1, #3B82F6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  userInfo: { minWidth: 0 },
  userName: { fontSize: 12, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userEmail: { fontSize: 10, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn: {
    width: "100%",
    padding: "8px",
    background: "transparent",
    border: "1px solid #1E2A3A",
    borderRadius: 7,
    color: "#64748B",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "center",
  },

  // Main
  main: {
    flex: 1,
    padding: "32px 36px",
    overflowY: "auto",
    maxWidth: 900,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: "#F1F5F9",
    letterSpacing: "-0.5px",
  },
  subheading: {
    fontSize: 13,
    color: "#64748B",
    margin: "4px 0 0",
  },
  uploadBtn: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #3B82F6, #6366F1)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "-0.2px",
  },

  // Stats
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: "#0D1424",
    border: "1px solid #1E2A3A",
    borderRadius: 10,
    padding: "16px 18px",
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-1px",
    lineHeight: 1,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  // Drop zone
  dropZone: {
    border: "1.5px dashed #1E3A5F",
    borderRadius: 12,
    padding: "36px 24px",
    textAlign: "center",
    marginBottom: 28,
    background: "#0D1A2E",
    transition: "all 0.2s",
    position: "relative",
    overflow: "hidden",
  },
  dropZoneActive: {
    borderColor: "#3B82F6",
    background: "#0D1E3A",
    boxShadow: "0 0 0 4px rgba(59,130,246,0.1)",
  },
  dropContent: {},
  dropIcon: {
    fontSize: 32,
    color: "#3B82F6",
    marginBottom: 10,
    display: "block",
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#CBD5E1",
    marginBottom: 6,
  },
  dropSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
  },
  dropFormats: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
  },
  formatBadge: {
    padding: "3px 10px",
    background: "#1E2A3A",
    border: "1px solid #2A3A4A",
    borderRadius: 20,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: 500,
  },

  // Upload progress
  uploadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  uploadingIcon: {
    fontSize: 28,
    color: "#3B82F6",
    animation: "spin 1s linear infinite",
  },
  uploadingName: {
    fontSize: 13,
    color: "#CBD5E1",
    fontWeight: 500,
  },
  progressBarWrap: {
    width: "60%",
    height: 4,
    background: "#1E2A3A",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #3B82F6, #6366F1)",
    borderRadius: 4,
    transition: "width 0.15s ease",
  },
  progressText: {
    fontSize: 12,
    color: "#64748B",
  },

  // Section
  section: {},
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  sectionCount: {
    fontSize: 12,
    color: "#475569",
  },

  // Empty state
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    border: "1px dashed #1E2A3A",
    borderRadius: 12,
  },
  emptyIcon: { fontSize: 32, color: "#2A3A4A", marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: "#475569", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#334155" },

  // Doc list
  docList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  docRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#0D1424",
    border: "1px solid #1E2A3A",
    borderRadius: 9,
    gap: 12,
    transition: "border-color 0.15s",
  },
  docLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  docIconWrap: {
    width: 38,
    height: 38,
    background: "#131E30",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid #1E2A3A",
  },
  docEmoji: { fontSize: 18 },
  docInfo: { minWidth: 0 },
  docName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#E2E8F0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 320,
  },
  docMeta: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
  },
  docRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "inline-block",
  },
  extBadge: {
    padding: "2px 7px",
    background: "#131E30",
    border: "1px solid #1E2A3A",
    borderRadius: 4,
    fontSize: 10,
    color: "#64748B",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  chatBtn: {
    padding: "5px 12px",
    background: "linear-gradient(135deg, #1E3A5F, #1E2D4A)",
    border: "1px solid #2A4A6A",
    borderRadius: 6,
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};