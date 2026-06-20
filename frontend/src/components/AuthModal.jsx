
// Login / Register popup. Two tabs, switches between them.
// On submit, calls the REAL backend endpoints.
// Calls onSuccess(user, token) which the parent passes to useAuth's login().

import { useState } from "react";
import api from "../api.js"; 
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function AuthModal({ onClose, onSuccess }) {
  const [tab,      setTab]      = useState("login");   // "login" | "register"
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("customer"); // "customer" | "printer"
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Pick the right endpoint based on which tab is active
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";

      // Login only needs email + password.
      // Register needs name + role too.
      const body = tab === "login"
        ? { email, password }
        : { name, email, password, role };

      const { data } = await api.post(endpoint, body);
      // data = { token: "...", user: { id, name, email, role } }

      // Pass both up to the parent — App.jsx will call useAuth's login()
      onSuccess(data.user, data.token);

    } catch (err) {
      // Backend sends { message: "..." } on errors (we built this
      // in authController.js — same shape for "wrong password" and
      // "email already exists")
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "0.65rem 0.9rem 0.65rem 2.4rem",
    border: "1.5px solid var(--cream-dark)",
    background: "var(--cream)", borderRadius: 2,
    fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem",
    color: "var(--ink)", outline: "none",
  };
  const iconStyle = {
    position: "absolute", left: 10, top: "50%",
    transform: "translateY(-50%)", color: "var(--muted)",
    pointerEvents: "none",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()} // clicking inside shouldn't close it
        className="soft-card anim-up"
        style={{ width: "100%", maxWidth: 420, padding: 32, position: "relative" }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: "none", cursor: "pointer", color: "var(--muted)",
        }}>
          <X size={18} />
        </button>

        <p className="font-display" style={{ fontSize: "1.5rem", color: "var(--navy)", fontWeight: 300, marginBottom: 24 }}>
          Print<em style={{ color: "var(--gold)", fontStyle: "italic" }}>Ready</em>
        </p>

        {/* Tab switcher */}
        <div className="flex mb-6" style={{ borderBottom: "2px solid var(--cream-dark)" }}>
          {["login", "register"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "0.5rem", background: "none", border: "none",
              cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              fontWeight: tab === t ? 600 : 400,
              fontSize: "0.88rem", color: tab === t ? "var(--navy)" : "var(--muted)",
              borderBottom: tab === t ? "2px solid var(--navy)" : "2px solid transparent",
              marginBottom: "-2px", textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {tab === "register" && (
            <div style={{ position: "relative" }}>
              <span style={iconStyle}><User size={14} /></span>
              <input style={inputStyle} placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}

          <div style={{ position: "relative" }}>
            <span style={iconStyle}><Mail size={14} /></span>
            <input style={inputStyle} type="email" placeholder="Email address"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div style={{ position: "relative" }}>
            <span style={iconStyle}><Lock size={14} /></span>
            <input style={{ ...inputStyle, paddingRight: "2.4rem" }}
              type={showPw ? "text" : "password"} placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              minLength={8} />
            <button type="button" onClick={() => setShowPw((p) => !p)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "var(--muted)",
            }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {tab === "register" && (
            <div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 8, fontWeight: 500 }}>
                I am a…
              </p>
              <div className="flex gap-3">
                {["customer", "printer"].map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={{
                    flex: 1, padding: "0.55rem",
                    border: role === r ? "2px solid var(--navy)" : "1.5px solid var(--cream-dark)",
                    background: role === r ? "var(--navy)" : "var(--cream)",
                    color: role === r ? "var(--cream)" : "var(--muted)",
                    borderRadius: 2, cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: "0.82rem", fontWeight: 600, textTransform: "capitalize",
                  }}>
                    {r === "customer" ? "🎨 Customer" : "🖨 Printer"}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>
                {role === "customer"
                  ? "Upload artwork and get print-ready files."
                  : "Receive and manage incoming print jobs."}
              </p>
            </div>
          )}

          {error && (
            <p style={{ fontSize: "0.8rem", color: "var(--press)", fontWeight: 500 }}>⚠ {error}</p>
          )}

          <button type="submit" className="btn-navy" disabled={loading} style={{ opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? "Please wait…" : tab === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", marginTop: 16 }}>
          {tab === "login" ? (
            <span>No account?{" "}
              <button onClick={() => setTab("register")} style={{ color: "var(--navy)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                Sign up free
              </button>
            </span>
          ) : (
            <span>Already have one?{" "}
              <button onClick={() => setTab("login")} style={{ color: "var(--navy)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>
                Log in
              </button>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}