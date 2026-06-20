
// Drag-and-drop file upload area.
// Two modes: empty (shows drop target) and filled (shows image preview).
// Validates file type and size before passing to parent.

import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_MB   = 50;

export default function DropZone({ file, onFile }) {
  const [dragging, setDragging] = useState(false);
  const [error,    setError]    = useState(null);
  const inputRef = useRef();

  const validate = useCallback((f) => {
    if (!ACCEPTED.includes(f.type)) {
      setError("Only PNG, JPG, or WebP files allowed.");
      return false;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB}MB limit.`);
      return false;
    }
    setError(null);
    return true;
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && validate(dropped)) onFile(dropped);
  }, [onFile, validate]);

  const handleChange = useCallback((e) => {
    const picked = e.target.files[0];
    if (picked && validate(picked)) onFile(picked);
  }, [onFile, validate]);

  // Preview mode - file already selected
  if (file) {
    const previewUrl = URL.createObjectURL(file);
    return (
      <div className="stamp-border anim-up" style={{ background:"var(--card)", position:"relative" }}>
        <img src={previewUrl} alt="preview" style={{ width:"100%", maxHeight:320, objectFit:"contain", display:"block" }} />
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          background:"var(--ink)", display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"8px 16px",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <ImageIcon size={13} color="var(--cream)" />
            <span style={{ color:"var(--cream)", fontSize:"0.78rem" }}>{file.name}</span>
            <span className="chip chip-gray" style={{ fontSize:"0.62rem" }}>
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
          <button onClick={() => onFile(null)} style={{
            background:"none", border:"none", cursor:"pointer",
            color:"var(--press2)", fontSize:"0.78rem", fontWeight:600,
            display:"flex", alignItems:"center", gap:4,
          }}>
            <X size={12} /> Remove
          </button>
        </div>
      </div>
    );
  }

  // Empty drop zone
  return (
    <div>
      <div
        className={`stamp-border halftone ${dragging ? "drop-active" : ""}`}
        style={{
          background:"var(--card)", minHeight:260,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap:16, padding:"40px 24px", cursor:"pointer",
          transition:"all 0.15s",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <div style={{
          width:72, height:72,
          background: dragging ? "var(--press)" : "var(--gold-lt)",
          border:"3px solid var(--ink)", boxShadow:"4px 4px 0 var(--ink)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"background 0.15s",
        }}>
          <Upload size={28} color="var(--ink)" />
        </div>
        <div style={{ textAlign:"center" }}>
          <p className="font-display" style={{ fontSize:"1.8rem", color:"var(--navy)", letterSpacing:"0.02em" }}>
            {dragging ? "Drop it here" : "Drag & drop"}
          </p>
          <p style={{ color:"var(--muted)", fontSize:"0.83rem", marginTop:6 }}>
            or click to browse — PNG, JPG, WebP · max {MAX_MB}MB
          </p>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPTED.join(",")}
          onChange={handleChange} style={{ display:"none" }} />
      </div>
      {error && (
        <p style={{ color:"var(--press)", fontSize:"0.8rem", marginTop:8, fontWeight:500 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}