
// Displays the full result after processing:
//   - Score ring with 0-100 and quality label
//   - ✓ ⚠ ✗ checks panel (the main value of the scoring engine)
//   - Issues list
//   - AI suggestions
//   - Download buttons (PDF, processed image, original)

import { CheckCircle2, AlertTriangle, XCircle, FileText, Image, Download, RotateCcw } from "lucide-react";

// SVG circle that animates to show the score
function ScoreRing({ score }) {
  const r     = 40;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  const color = score >= 80 ? "#16A34A" : score >= 55 ? "#D97706" : "#DC2626";

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      <svg width="100" height="100" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="square"
          style={{ transition:"stroke-dasharray 1.2s ease" }} />
      </svg>
      <div style={{ position:"absolute", textAlign:"center" }}>
        <span className="font-display" style={{ fontSize:"1.9rem", color, lineHeight:1 }}>{score}</span>
        <p style={{ fontSize:"0.55rem", color:"var(--muted)", fontWeight:600, letterSpacing:"0.1em" }}>/100</p>
      </div>
    </div>
  );
}

// One row in the checks panel
function CheckRow({ check }) {
  const styles = {
    pass: { icon:<CheckCircle2 size={14} color="#16A34A"/>, bg:"#F0FDF4", border:"#86EFAC", label:"#14532D" },
    warn: { icon:<AlertTriangle size={14} color="#D97706"/>, bg:"#FFFBEB", border:"#FCD34D", label:"#92400E" },
    fail: { icon:<XCircle size={14} color="#DC2626"/>,       bg:"#FEF2F2", border:"#FCA5A5", label:"#991B1B" },
  };
  const s = styles[check.status] || styles.warn;

  return (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:10,
      padding:"10px 14px", marginBottom:4,
      background:s.bg, borderLeft:`3px solid ${s.border}`,
    }}>
      <span style={{ marginTop:1, flexShrink:0 }}>{s.icon}</span>
      <div>
        <p style={{ fontSize:"0.8rem", fontWeight:600, color:s.label }}>{check.label}</p>
        <p style={{ fontSize:"0.72rem", color:"var(--muted)", marginTop:2, lineHeight:1.5 }}>{check.detail}</p>
      </div>
    </div>
  );
}

export default function ResultCard({ result, onReset }) {
  const { score, qualityLabel, checks, issues, suggestions, meta, outputs } = result;
  const passed = score >= 75;

  return (
    <div className="anim-up">

      {/* Status header */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"12px 20px",
        border:"3px solid var(--ink)", borderBottom:"none",
        background: passed ? "#D4F5E3" : "var(--gold-lt)",
      }}>
        {passed
          ? <CheckCircle2 size={17} color="#14532D" />
          : <AlertTriangle size={17} color="var(--navy)" />}
        <span className="font-stamp" style={{ fontSize:"0.8rem", color: passed ? "#14532D" : "var(--navy)" }}>
          {passed ? "Print Ready" : "Needs Attention"}
        </span>
        <span className="chip chip-navy" style={{ marginLeft:"auto", fontSize:"0.6rem" }}>
          {result.jobId?.slice(-8).toUpperCase()}
        </span>
      </div>

      {/* Main card */}
      <div className="stamp-border" style={{ background:"var(--card)", borderTop:"none" }}>

        {/* Score + Meta grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"2px solid var(--border)" }}>

          {/* Score ring */}
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", padding:"28px 16px", gap:8,
            borderRight:"2px solid var(--border)",
          }}>
            <ScoreRing score={score} />
            <p className="font-stamp" style={{ fontSize:"0.65rem", color:"var(--muted)" }}>PrintReady Score</p>
            {qualityLabel && (
              <p style={{
                fontSize:"0.72rem", fontWeight:600, textAlign:"center", padding:"0 8px",
                color: passed ? "#16A34A" : score >= 55 ? "#D97706" : "#DC2626",
              }}>
                {qualityLabel}
              </p>
            )}
          </div>

          {/* File meta */}
          <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:8 }}>
            <p className="font-stamp" style={{ fontSize:"0.65rem", color:"var(--muted)", marginBottom:4 }}>
              File Specs
            </p>
            {meta && Object.entries(meta).map(([k, v]) => (
              <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:"0.72rem", color:"var(--muted)", textTransform:"capitalize" }}>
                  {k.replace(/([A-Z])/g, " $1")}
                </span>
                <span className="chip chip-gray" style={{ fontSize:"0.62rem" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Checks panel - the ✓ ⚠ ✗ list */}
        {checks && checks.length > 0 && (
          <div style={{ padding:"16px 20px", borderBottom:"2px solid var(--border)" }}>
            <p className="font-stamp" style={{ fontSize:"0.65rem", color:"var(--navy-lt)", marginBottom:10 }}>
              Print Readiness: {score}/100
            </p>
            {checks.map((c, i) => <CheckRow key={i} check={c} />)}
          </div>
        )}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div style={{ padding:"16px 20px", background:"#F0FDF4", borderBottom:"2px solid var(--border)" }}>
            <p className="font-stamp" style={{ fontSize:"0.65rem", color:"#14532D", marginBottom:10 }}>
              Suggestions
            </p>
            {suggestions.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                <CheckCircle2 size={12} color="#16A34A" style={{ marginTop:3, flexShrink:0 }} />
                <p style={{ fontSize:"0.78rem", color:"var(--ink)", lineHeight:1.55 }}>{s}</p>
              </div>
            ))}
          </div>
        )}

        {/* Download buttons */}
        <div style={{ padding:"20px" }}>
          <p className="font-stamp" style={{ fontSize:"0.65rem", color:"var(--muted)", marginBottom:12 }}>
            Download Files
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            <a href={outputs?.pdf} target="_blank" rel="noreferrer"
              className="btn-press" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.8rem" }}>
              <FileText size={13} /> Print-Ready PDF
            </a>
            <a href={outputs?.processed} target="_blank" rel="noreferrer"
              className="btn-ghost" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.8rem" }}>
              <Image size={13} /> Processed Image
            </a>
            <a href={outputs?.original} target="_blank" rel="noreferrer"
              className="btn-ghost" style={{
                display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.8rem",
                borderColor:"var(--border)", boxShadow:"4px 4px 0 var(--border)", color:"var(--muted)",
              }}>
              <Download size={13} /> Original
            </a>
          </div>
          <button onClick={onReset} style={{
            marginTop:16, background:"none", border:"none", cursor:"pointer",
            color:"var(--muted)", fontSize:"0.78rem", display:"flex", alignItems:"center", gap:6,
          }}>
            <RotateCcw size={12} /> Process another file
          </button>
        </div>
      </div>
    </div>
  );
}