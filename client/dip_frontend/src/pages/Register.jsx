import { useState } from "react";
import { supabase } from "../supabaseClient";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.svg";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await API.post("/auth/register", { email, password });
      setLoading(false);
      setSuccess("Account created successfully! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setLoading(false);
      setError(err?.response?.data?.message || "Signup failed. Try again.");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) console.log(error.message);
  };

  return (
    <div style={styles.container}>

      {/* Logo */}
      <div style={styles.logoWrapper}>
        <img src={logo} alt="DocAI Logo" style={styles.mainLogo} />
      </div>

      <form onSubmit={handleRegister} style={styles.card}>
        <h2 style={styles.title}>Create your account</h2>
        <p style={styles.subtitle}>Start working smarter with your documents</p>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}
        {success && (
          <div style={styles.successBox}>
            <span style={styles.successText}>{success}</span>
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
          <label style={styles.label}>Password</label>
          <div style={styles.inputWrapper}>
            <svg style={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
        </div>

        {/* Primary button */}
        <button type="submit" style={styles.primaryButton} disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Google button */}
        <button type="button" onClick={handleGoogleLogin} style={styles.googleButton}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* Login link */}
        <p style={styles.bottomText}>
          Already have an account?{" "}
          <Link to="/" style={styles.link}>Sign in</Link>
        </p>
      </form>

      {/* Terms */}
      <p style={styles.terms}>
        By signing up, you agree to our{" "}
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
  successBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  successText: {
    color: "#16a34a",
    fontSize: "13px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
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
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e5e7eb",
  },
  dividerText: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  googleButton: {
    width: "100%",
    padding: "10px",
    background: "white",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxSizing: "border-box",
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