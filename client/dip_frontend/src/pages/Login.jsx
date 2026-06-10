import { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setLoading(false);
      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      setError(err?.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div style={styles.container}>

      {/* Logo */}
      <div style={styles.logoWrapper}>
        <img src={logo} alt="DocAI Logo" style={styles.mainLogo} />
      </div>

      <form onSubmit={handleLogin} style={styles.card}>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Email field */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Email address</label>
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>
        </div>

        {/* Password field */}
        <div style={styles.fieldGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>Password</label>
            <a href="#" style={styles.forgotLink}>Forgot password?</a>
          </div>
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
        </div>

        {/* Login button */}
        <button type="submit" style={styles.primaryButton} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* Sign up link */}
        <p style={styles.bottomText}>
          Don't have an account?{" "}
          <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </form>

      {/* Terms */}
      <p style={styles.terms}>
        By signing in, you agree to our{" "}
        <a href="#" style={styles.termsLink}>Terms</a> &{" "}
        <a href="#" style={styles.termsLink}>Privacy Policy</a>
      </p>

    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#f0f2f7",
    fontFamily: "'Arial', sans-serif",
    padding: "2rem 1rem",
  },
  logoWrapper: {
    marginBottom: "1.5rem",
    textAlign: "center",
  },
  mainLogo: {
    width: "200px",
    objectFit: "contain",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "2rem 2.5rem",
    background: "white",
    borderRadius: "16px",
    border: "0.5px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "20px",
    fontWeight: "500",
    color: "#111827",
  },
  subtitle: {
    margin: "0 0 4px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "13px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
  },
  forgotLink: {
    fontSize: "12px",
    color: "#4F7EF7",
    textDecoration: "none",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    width: "16px",
    height: "16px",
    color: "#9ca3af",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "10px 12px 10px 38px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#111827",
    background: "#fafafa",
    outline: "none",
    boxSizing: "border-box",
  },
  primaryButton: {
    padding: "11px",
    background: "#4F7EF7",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
  },
  bottomText: {
    textAlign: "center",
    fontSize: "13px",
    color: "#6b7280",
    margin: "4px 0 0",
  },
  link: {
    color: "#4F7EF7",
    textDecoration: "none",
    fontWeight: "500",
  },
  terms: {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "1.25rem",
    textAlign: "center",
  },
  termsLink: {
    color: "#6b7280",
    textDecoration: "none",
  },
};