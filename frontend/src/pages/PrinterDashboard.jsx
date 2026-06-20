
// Printer-only view. Shows ALL jobs in the system with filtering
// by status, and lets the printer mark jobs Completed or Rejected.
//
// Backend enforces role="printer" via restrictTo middleware -this page also checks on the frontend as a UX nicety (so a
// customer doesn't even see a broken attempt at this page).

import { useState, useEffect, useCallback } from "react";
import api from "../api.js";
import { CheckCircle2, XCircle, Clock, Loader2, FileText, Download, Filter } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

const STATUS_FILTERS = ["all", "queued", "processing", "completed", "rejected"];

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>;
  const color = score >= 80 ? "#16A34A" : score >= 55 ? "#D97706" : "#DC2626";
  const bg    = score >= 80 ? "#D4F5E3" : score >= 55 ? "#FEF3C7" : "#FEE2E2";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 9px", background: bg, color }}>
      {score}/100
    </span>
  );
}

function StatusBadge({ status }) {
  const config = {
    queued:     { color: "#6B6560", bg: "#F0EBE1", icon: <Clock size={11} /> },
    processing: { color: "#1B2D4F", bg: "#E0E8F5", icon: <Loader2 size={11} className="spin" /> },
    completed:  { color: "#14532D", bg: "#D4F5E3", icon: <CheckCircle2 size={11} /> },
    rejected:   { color: "#991B1B", bg: "#FEE2E2", icon: <XCircle size={11} /> },
  };
  const c = config[status] || config.queued;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: "0.7rem", fontWeight: 600, padding: "2px 9px",
      background: c.bg, color: c.color, textTransform: "capitalize",
    }}>
      {c.icon} {status}
    </span>
  );
}

export default function PrinterDashboard() {
  const { user, isLoggedIn, getToken } = useAuth();
  const [jobs,       setJobs]       = useState([]);
  const [filter,     setFilter]     = useState("all");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [actionJobId, setActionJobId] = useState(null); // tracks which row is mid-action

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const token = getToken();
    const url = filter === "all" ? "/api/printer/jobs" : `/api/printer/jobs?status=${filter}`;

    api.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setJobs(r.data.jobs))
      .catch((err) => setError(err.response?.data?.message || "Could not load jobs"))
      .finally(() => setLoading(false));
  }, [filter, getToken]);

  useEffect(() => {
    if (isLoggedIn && user?.role === "printer") {
      fetchJobs();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, user, fetchJobs]);

  async function handleMarkStatus(jobId, status) {
    let rejectionReason = null;

    if (status === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this job:");
      if (!rejectionReason) return; // cancelled or empty - don't proceed
    }

    setActionJobId(jobId);
    try {
      const token = getToken();
      await api.patch(
        `/api/printer/jobs/${jobId}/status`,
        { status, rejectionReason },//body
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh the list to reflect the change
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update job status");
    } finally {
      setActionJobId(null);
    }
  }

  // ── Access control on the frontend 
  if (!isLoggedIn) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
        <div className="soft-card" style={{ padding: 40 }}>
          <p className="font-display" style={{ fontSize: "1.5rem", color: "var(--navy)", fontWeight: 300, marginBottom: 8 }}>
            Printer login required
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Log in with a printer account to access this dashboard.
          </p>
        </div>
      </main>
    );
  }

  if (user?.role !== "printer") {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
        <div className="soft-card" style={{ padding: 40 }}>
          <p className="font-display" style={{ fontSize: "1.5rem", color: "var(--navy)", fontWeight: 300, marginBottom: 8 }}>
            Printer access only
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Your account doesn't have printer permissions.
          </p>
        </div>
      </main>
    );
  }

  // ── Stats for the summary row 
  const stats = {
    total:     jobs.length,
    queued:    jobs.filter((j) => j.status === "queued").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    rejected:  jobs.filter((j) => j.status === "rejected").length,
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>

      <div style={{ marginBottom: 24 }}>
        <p className="font-stamp" style={{ fontSize: "0.72rem", color: "var(--navy-lt)", marginBottom: 6 }}>
          Printer Dashboard
        </p>
        <h1 className="font-display" style={{ fontSize: "2.4rem", color: "var(--navy)", fontWeight: 300 }}>
          Incoming jobs
        </h1>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total",     value: stats.total },
          { label: "Queued",    value: stats.queued },
          { label: "Completed", value: stats.completed },
          { label: "Rejected",  value: stats.rejected },
        ].map((s) => (
          <div key={s.label} className="soft-card" style={{ padding: 16, textAlign: "center" }}>
            <p className="font-display" style={{ fontSize: "1.8rem", color: "var(--navy)", fontWeight: 300 }}>{s.value}</p>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <Filter size={14} color="var(--muted)" />
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "0.35rem 0.9rem",
            border: filter === f ? "2px solid var(--navy)" : "1.5px solid var(--cream-dark)",
            background: filter === f ? "var(--navy)" : "transparent",
            color: filter === f ? "var(--cream)" : "var(--muted)",
            fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
            textTransform: "capitalize",
          }}>
            {f}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading jobs…</p>}
      {error && (
        <div style={{ padding: 14, border: "2px solid var(--press)", background: "#FFF1EE" }}>
          <p style={{ color: "var(--press)", fontSize: "0.83rem" }}>{error}</p>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="soft-card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No jobs match this filter.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="soft-card" style={{ overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 90px 110px 160px",
            gap: 12, padding: "10px 18px", background: "var(--navy)", color: "var(--cream)",
          }}>
            {["Customer / File", "Product", "Score", "Status", "Actions"].map((h) => (
              <span key={h} className="font-stamp" style={{ fontSize: "0.62rem" }}>{h}</span>
            ))}
          </div>

          {jobs.map((job, i) => (
            <div key={job.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 90px 110px 160px",
              gap: 12, padding: "12px 18px", alignItems: "center",
              borderBottom: i < jobs.length - 1 ? "1px solid var(--cream-dark)" : "none",
              background: i % 2 === 0 ? "var(--card)" : "var(--cream)",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--navy)" }}>
                  {job.customer_name || "Guest"}
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{job.original_name}</p>
              </div>

              <p style={{ fontSize: "0.78rem", color: "var(--ink)" }}>
                {job.vendor_id} / {job.product_id}
              </p>

              <ScoreBadge score={job.score} />
              <StatusBadge status={job.status} />

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {job.status === "completed" || job.status === "queued" || job.status === "processing" ? (
                  <button onClick={() => handleMarkStatus(job.id, "completed")}
                    disabled={actionJobId === job.id || job.status === "completed"}
                    style={{
                      fontSize: "0.68rem", padding: "3px 8px", border: "1.5px solid #16A34A",
                      background: job.status === "completed" ? "#D4F5E3" : "transparent",
                      color: "#16A34A", cursor: job.status === "completed" ? "default" : "pointer",
                    }}>
                    {job.status === "completed" ? "✓ Done" : "Complete"}
                  </button>
                ) : null}

                {job.status !== "rejected" && (
                  <button onClick={() => handleMarkStatus(job.id, "rejected")}
                    disabled={actionJobId === job.id}
                    style={{
                      fontSize: "0.68rem", padding: "3px 8px", border: "1.5px solid var(--press)",
                      background: "transparent", color: "var(--press)", cursor: "pointer",
                    }}>
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}