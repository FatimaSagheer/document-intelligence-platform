import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function Settings() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ── Decode the JWT locally to show the user's email (no extra API call) ──
  useEffect(() => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setEmail(payload.email || "");
    } catch {
      setEmail("");
    }
  }, [token]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: "success", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error || "Failed to update password",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <Layout>
      <div style={s.header}>
        <h1 style={s.heading}>Settings</h1>
        <p style={s.subheading}>Manage your account</p>
      </div>

      {/* Account info card */}
      <div style={s.card}>
        <div style={s.cardTitle}>Account</div>
        <div style={s.row}>
          <div style={s.avatar}>
            {email ? email[0].toUpperCase() : "U"}
          </div>
          <div>
            <div style={s.rowLabel}>Email address</div>
            <div style={s.rowValue}>{email || "Loading…"}</div>
          </div>
        </div>
      </div>

      {/* Change password card */}
      <div style={s.card}>
        <div style={s.cardTitle}>Change password</div>

        {message && (
          <div
            style={{
              ...s.messageBox,
              background: message.type === "error" ? "#fef2f2" : "#f0fdf4",
              borderColor: message.type === "error" ? "#fecaca" : "#bbf7d0",
              color: message.type === "error" ? "#dc2626" : "#16a34a",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={s.input}
              required
            />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={s.input}
              required
            />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={s.input}
              required
            />
          </div>
          <button type="submit" style={s.saveBtn} disabled={saving}>
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div style={{ ...s.card, borderColor: "#fecaca" }}>
        <div style={{ ...s.cardTitle, color: "#dc2626" }}>Account actions</div>
        <p style={s.dangerText}>
          Signing out will end your current session on this device.
        </p>
        <button onClick={handleLogout} style={s.logoutBtn}>
          ⎋ Sign out
        </button>
      </div>
    </Layout>
  );
}

const s = {
  header: { marginBottom: 24 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: "#111827" },
  subheading: { fontSize: 13.5, color: "#6b7280", margin: "5px 0 0" },

  card: {
    background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 14,
    padding: "20px 22px", marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 },

  row: { display: "flex", alignItems: "center", gap: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: "50%", background: "#4F7EF7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  rowLabel: { fontSize: 11.5, color: "#9ca3af", marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: 500, color: "#111827" },

  messageBox: {
    padding: "10px 14px", borderRadius: 8, border: "1px solid",
    fontSize: 12.5, marginBottom: 14,
  },

  form: { display: "flex", flexDirection: "column", gap: 14 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12.5, fontWeight: 500, color: "#374151" },
  input: {
    padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8,
    fontSize: 13.5, color: "#111827", background: "#fafafa", outline: "none",
  },
  saveBtn: {
    padding: "10px", background: "#4F7EF7", border: "none", borderRadius: 8,
    color: "#fff", fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginTop: 4,
  },

  dangerText: { fontSize: 12.5, color: "#6b7280", marginBottom: 12 },
  logoutBtn: {
    padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
};