import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";

/**
 * Shared sidebar layout used by Dashboard, Documents, ChatHistory, Settings.
 * Wraps page content and provides consistent navigation.
 */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard", path: "/dashboard" },
    { id: "documents", icon: "⬚", label: "My Documents", path: "/documents" },
    { id: "history", icon: "◷", label: "Chat History", path: "/history" },
    { id: "settings", icon: "⚙", label: "Settings", path: "/settings" },
  ];

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <img src={logo} alt="DocAI Logo" style={s.logoImg} />
        </div>

        <nav style={s.nav}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.userRow}>
            <div style={s.avatar}>FS</div>
            <div style={s.userInfo}>
              <div style={s.userName}>Fatima Sagheer</div>
              <div style={s.userEmail}>fatima@email.com</div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>⎋ Logout</button>
        </div>
      </aside>

      <main style={s.main}>{children}</main>
    </div>
  );
}

const s = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#f0f2f7",
    fontFamily: "'Arial', sans-serif",
    color: "#111827",
  },
  sidebar: {
    width: 230, minHeight: "100vh", background: "#ffffff",
    borderRight: "0.5px solid #e5e7eb",
    display: "flex", flexDirection: "column", flexShrink: 0,
  },
  logo: { padding: "24px 24px 16px", borderBottom: "0.5px solid #e5e7eb" },
  logoImg: { width: 130, objectFit: "contain" },
  nav: { flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 2 },
  navItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
    borderRadius: 8, border: "none", background: "transparent",
    color: "#6b7280", fontSize: 13.5, fontWeight: 500, cursor: "pointer", textAlign: "left",
  },
  navItemActive: { background: "#eef2ff", color: "#4F7EF7" },
  navIcon: { fontSize: 15, width: 18, textAlign: "center" },
  sidebarBottom: { padding: "16px", borderTop: "0.5px solid #e5e7eb" },
  userRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%", background: "#4F7EF7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  userInfo: { minWidth: 0 },
  userName: { fontSize: 12.5, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userEmail: { fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn: {
    width: "100%", padding: "9px", background: "#fafafa",
    border: "1px solid #e5e7eb", borderRadius: 8, color: "#6b7280",
    fontSize: 12.5, cursor: "pointer", textAlign: "center",
  },
  main: { flex: 1, padding: "36px 40px", overflowY: "auto", maxWidth: 920 },
};