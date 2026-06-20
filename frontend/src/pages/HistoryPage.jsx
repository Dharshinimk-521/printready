
// Shows past jobs for the logged-in user.
// /api/jobs/history is a PROTECTED route - requires a valid JWT.
// If not logged in, shows a prompt instead of attempting the fetch.

import { useState, useEffect } from "react";
import api from "../api.js";
import { Clock, FileText } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

function ScoreBadge({ score }) {
  const color = score >= 80 ? "#16A34A" : score >= 55 ? "#D97706" : "#DC2626";
  const bg    = score >= 80 ? "#D4F5E3" : score >= 55 ? "#FEF3C7" : "#FEE2E2";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 9px", background: bg, color }}>
      {score}/100
    </span>
  );
}

export default function HistoryPage({ onLoginClick }) {
  const { isLoggedIn, getToken } = useAuth();
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    // Don't even attempt the fetch if not logged in - it would just fail with 401 anyway since this route is protected
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    const token = getToken();

    api.get("/api/jobs/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => setJobs(r.data.jobs))
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load history");
      })
      .finally(() => setLoading(false));

  }, [isLoggedIn, getToken]);

  // ── Not logged in 
  if (!isLoggedIn) {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
        <div className="soft-card" style={{ padding: 48 }}>
          <Clock size={36} color="var(--navy-lt)" style={{ margin: "0 auto 16px" }} />
          <p className="font-display" style={{ fontSize: "1.6rem", color: "var(--navy)", fontWeight: 300, marginBottom: 8 }}>
            Log in to see your history
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 24 }}>
            Your past jobs are saved to your account once you log in.
          </p>
          <button onClick={onLoginClick} className="btn-navy">
            Log in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>

      <div style={{ marginBottom: 28 }}>
        <p className="font-stamp" style={{ fontSize: "0.72rem", color: "var(--navy-lt)", marginBottom: 6 }}>
          Account
        </p>
        <h1 className="font-display" style={{ fontSize: "2.6rem", color: "var(--navy)", fontWeight: 300 }}>
          Processing history
        </h1>
      </div>

      {loading && <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Loading…</p>}

      {error && (
        <div style={{ padding: 14, border: "2px solid var(--press)", background: "#FFF1EE" }}>
          <p style={{ color: "var(--press)", fontSize: "0.83rem", fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="soft-card" style={{ padding: 48, textAlign: "center" }}>
          <FileText size={36} color="var(--navy-lt)" style={{ margin: "0 auto 16px" }} />
          <p className="font-display" style={{ fontSize: "1.6rem", color: "var(--navy)", fontWeight: 300, marginBottom: 8 }}>
            No jobs yet
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Upload a file to get started — it'll show up here.
          </p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="soft-card" style={{ overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 130px 100px 80px",
            gap: 12, padding: "10px 20px", background: "var(--navy)", color: "var(--cream)",
          }}>
            {["File", "Product", "Score", "Date"].map((h) => (
              <span key={h} className="font-stamp" style={{ fontSize: "0.65rem" }}>{h}</span>
            ))}
          </div>

          {jobs.map((job, i) => (//remove border for last row + alternate row clr
            <div key={job.id} style={{
              display: "grid", gridTemplateColumns: "1fr 130px 100px 80px",
              gap: 12, padding: "14px 20px", alignItems: "center",
              borderBottom: i < jobs.length - 1 ? "1px solid var(--cream-dark)" : "none",
              background: i % 2 === 0 ? "var(--card)" : "var(--cream)",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--navy)" }}>
                  {job.original_name}
                </p>
                {job.status === "rejected" && job.rejection_reason && (
                  <p style={{ fontSize: "0.72rem", color: "var(--press)", marginTop: 4, fontStyle: "italic" }}>
                    Rejected: {job.rejection_reason}
                  </p>
                )}
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
                  {job.width}×{job.height}px · {job.file_size_kb} KB
                </p>
              </div>

              <p style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--ink)" }}>
                {job.vendor_id} / {job.product_id}
              </p>

              <div>
                {job.score != null ? <ScoreBadge score={job.score} /> : <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>}
              </div>

              <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {new Date(job.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}