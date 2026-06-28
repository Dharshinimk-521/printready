
// The core customer flow, now wired to the backend:
//   1. Drop a file
//   2. Pick vendor + product
//   3. Click Process -> real Sharp/scoring/PDF pipeline runs on backend
//   4. See the real score panel + real download links

import { useState } from "react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import DropZone          from "../components/DropZone.jsx";
import TemplateSelector  from "../components/TemplateSelector.jsx";
import ResultCard        from "../components/ResultCard.jsx";
import { useAuth }       from "../hooks/useAuth.js";
import { useUpload }     from "../hooks/useUpload.js";


export default function UploadPage({onLoginClick}) {
  const [file,      setFile]      = useState(null);
  const [selection, setSelection] = useState(null); // { vendorId, productId, spec }

  // getToken lets useUpload attach the JWT automatically if logged in.
  // If not logged in, getToken() returns null and the upload still works - just won't be linked to an account (optionalAuth on backend).
  const { getToken, isLoggedIn } = useAuth();
  const { state, progress, result, error, submit, reset } = useUpload(getToken);

  const canSubmit = file && selection && state === "idle";

  function handleProcess() {
    if (!canSubmit) return;
    submit(file, selection);
  }

  function handleReset() {
    setFile(null);
    setSelection(null);
    reset();
  }

  if (!isLoggedIn) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
        <div className="soft-card" style={{ padding: 40 }}>
          <p className="font-display" style={{ fontSize: "1.6rem", color: "var(--navy)", fontWeight: 300, marginBottom: 8 }}>
            Log in to upload artwork
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 24 }}>
            Creating a free account takes a few seconds and keeps your job history saved.
          </p>
          <button onClick={onLoginClick} className="btn-navy">
            Log in or sign up
          </button>
        </div>
      </main>
    );
  }
  // ── Processing state 
  // Covers both "uploading" (file transmitting) and "processing"
  // (backend running Sharp/scoring/PDF - this is the slow part,
  // can take 5-20 seconds depending on image size and vendor spec)
  if (state === "uploading" || state === "processing") {
    return (
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
        <div className="stamp-border anim-up" style={{ background: "var(--card)", padding: "48px 32px" }}>
          <div style={{
            width: 72, height: 72, background: "var(--gold-lt)", border: "3px solid var(--ink)",
            boxShadow: "4px 4px 0 var(--ink)", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 24px",
          }}>
            <Loader2 size={30} color="var(--ink)" className="spin" />
          </div>
          <p className="font-display" style={{ fontSize: "1.8rem", color: "var(--navy)", marginBottom: 8 }}>
            {state === "uploading" ? "Uploading…" : "Processing…"}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 24 }}>
            {state === "uploading"
              ? "Sending your file to the server"
              : "Analysing · scoring · resizing · generating PDF"}
          </p>

          {state === "uploading" && (
            <>
              <div style={{ width: "100%", height: 8, background: "var(--cream-mid)", border: "2px solid var(--ink)" }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: "var(--press)", transition: "width 0.2s",
                }} />
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 8 }}>{progress}%</p>
            </>
          )}

          {state === "processing" && (
            <p style={{ color: "var(--navy-lt)", fontSize: "0.78rem", fontStyle: "italic" }}>
              This can take up to 20 seconds for high-resolution images
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── Done state 
  if (state === "done" && result) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <p className="font-stamp" style={{ fontSize: "0.72rem", color: "var(--navy-lt)", marginBottom: 6 }}>
            Job Complete
          </p>
          <h1 className="font-display" style={{ fontSize: "2.4rem", color: "var(--navy)", fontWeight: 300 }}>
            Your file is ready
          </h1>
          {!isLoggedIn && (
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 8 }}>
              Want to find this job later?{" "}
              <span style={{ color: "var(--navy)", fontWeight: 600 }}>Create an account</span> to save your history.
            </p>
          )}
        </div>
        <ResultCard result={result} onReset={handleReset} />
      </main>
    );
  }

  // ── Main upload form 
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 2, background: "var(--press)" }} />
          <span className="chip chip-red">Customer Upload</span>
        </div>
        <h1 className="font-display" style={{ fontSize: "2.8rem", color: "var(--navy)", fontWeight: 300 }}>
          Upload artwork
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 6, fontSize: "0.88rem" }}>
          Upload your design, pick a product — we'll make it print-ready instantly.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DropZone file={file} onFile={setFile} />

          {file && selection && (
            <div className="anim-up" style={{
              padding: "10px 14px", border: "2px solid var(--navy-lt)",
              background: "#EFF6FF", display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <div style={{ fontSize: "0.78rem" }}>
                <p style={{ fontWeight: 600, color: "var(--navy)" }}>Ready to process</p>
                <p style={{ color: "var(--muted)", marginTop: 2 }}>
                  Will be resized to {selection.spec?.pxWidth}×{selection.spec?.pxHeight}px at {selection.spec?.dpi} DPI
                </p>
              </div>
            </div>
          )}

          <button className="btn-press" onClick={handleProcess} disabled={!canSubmit}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", fontSize: "0.92rem" }}>
            Process file <ArrowRight size={16} />
          </button>

          {!file && (
            <p style={{ fontSize: "0.76rem", color: "var(--muted)", textAlign: "center" }}>
              Step 1 of 2 — Upload a file first
            </p>
          )}
          {file && !selection && (
            <p style={{ fontSize: "0.76rem", color: "var(--press)", textAlign: "center", fontWeight: 500 }}>
              Step 2 of 2 — Pick a product template →
            </p>
          )}

          {state === "error" && error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              border: "2px solid var(--press)", background: "#FFF1EE",
            }}>
              <AlertCircle size={14} color="var(--press)" />
              <p style={{ color: "var(--press)", fontSize: "0.8rem", fontWeight: 500 }}>{error}</p>
            </div>
          )}
        </div>

        <div>
          <TemplateSelector selection={selection} onSelect={setSelection} />

          {selection && (
            <div className="soft-card anim-up" style={{ marginTop: 16, padding: "16px 18px" }}>
              <p className="font-stamp" style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: 12 }}>
                Template Spec — {selection.spec?.label}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Output size",  `${selection.spec?.pxWidth}×${selection.spec?.pxHeight}px`],
                  ["DPI",          `${selection.spec?.dpi} DPI`],
                  ["Format",       selection.spec?.format?.toUpperCase()],
                  ["Colour mode",  selection.spec?.colorMode],
                  ["Bleed",        selection.spec?.bleed ? "Required" : "Not required"],
                  ["Fit mode",     selection.spec?.fitMode === "cover" ? "Fill (may crop)" : "Fit (no crop)"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: "0.67rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {label}
                    </p>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginTop: 2 }}>{value}</p>
                  </div>
                ))}
              </div>
              {selection.spec?.notes && (
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 12, lineHeight: 1.55 }}>
                  {selection.spec.notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}