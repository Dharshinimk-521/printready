// pages/LandingPage.jsx
//
// Public homepage. No auth required, no API calls needed -
// just marketing content and links into the real app.

import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Upload, Layers, Zap, FileText } from "lucide-react";

const FEATURES = [
  { icon: <Upload size={20} />,   title: "Drag-and-drop upload",  body: "Validates file type and size, shows a live preview before processing." },
  { icon: <Layers size={20} />,   title: "Vendor templates",      body: "Printify, Sticker Mule, Redbubble, Vistaprint - specs built in, nothing to configure." },
  { icon: <Zap size={20} />,      title: "Real quality scoring",  body: "Effective DPI, sharpness, aspect ratio, bleed - all calculated, not guessed." },
  { icon: <FileText size={20} />, title: "Print-ready PDF",       body: "Every job outputs a PDF at the correct size, DPI, and crop marks if needed." },
];

const STEPS = [
  { n: "01", title: "Upload artwork",        body: "Drop a PNG, JPG, or WebP - any size, any resolution." },
  { n: "02", title: "Pick vendor + product",  body: "Choose from Printify, Sticker Mule, Redbubble, and more." },
  { n: "03", title: "Auto-processed",         body: "Sharp resizes and converts. Score calculated in seconds." },
  { n: "04", title: "Download files",         body: "Print-ready PDF, processed image, and original - all ready." },
];

export default function LandingPage() {
  return (
    <main style={{ background: "var(--cream)" }}>

      {/* Hero */}
      <section style={{
        background: "var(--navy)", minHeight: "85vh",
        display: "flex", alignItems: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 60% at 65% 50%, rgba(201,151,58,0.12) 0%, transparent 70%)",
        }} />

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 2, background: "var(--gold)" }} />
            <span className="tag-soft" style={{
              display: "inline-flex", padding: "3px 12px", background: "var(--cream-mid)",
              border: "1px solid var(--cream-dark)", borderRadius: 999,
              fontSize: "0.72rem", fontWeight: 500, color: "var(--navy-mid)",
            }}>
              For print shops & vendors
            </span>
          </div>

          <h1 className="font-display" style={{
            fontSize: "clamp(2.6rem, 6vw, 4.5rem)", lineHeight: 1.08,
            color: "var(--cream)", fontWeight: 300, maxWidth: 620,
          }}>
            Artwork in.{" "}
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Print-ready</em> out.
          </h1>

          <p style={{ color: "#9BAEC4", fontSize: "1rem", maxWidth: 440, lineHeight: 1.75, marginTop: 24 }}>
            PrintReady automates the file-prep work print shops do manually every day.
            Upload artwork, pick a vendor template, download a print-ready PDF — in seconds.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 20 }}>
            {["Real DPI calculation", "Sharpness detection", "Print-ready PDF"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={14} color="var(--gold)" />
                <span style={{ color: "#9BAEC4", fontSize: "0.82rem" }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <Link to="/upload" className="btn-gold" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              Upload artwork <ArrowRight size={15} />
            </Link>
            <Link to="/history" style={{
              display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
              padding: "0.7rem 1.6rem", border: "1.5px solid rgba(255,255,255,0.25)",
              color: "var(--cream)", fontSize: "0.9rem", fontWeight: 600,
            }}>
              View history
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="font-stamp" style={{ fontSize: "0.7rem", color: "var(--navy-lt)", marginBottom: 10 }}>
            What it does
          </p>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--navy)", fontWeight: 300, marginBottom: 32 }}>
            Every step automated
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="soft-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, background: "var(--cream-mid)",
                  border: "1.5px solid var(--cream-dark)", display: "flex",
                  alignItems: "center", justifyContent: "center", color: "var(--navy)",
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--navy)", marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--cream-mid)", borderTop: "1px solid var(--cream-dark)", borderBottom: "1px solid var(--cream-dark)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="font-stamp" style={{ fontSize: "0.7rem", color: "var(--navy-lt)", marginBottom: 10 }}>
            The flow
          </p>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--navy)", fontWeight: 300, marginBottom: 32 }}>
            Four steps, zero manual work
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ padding: "0 16px", borderLeft: i === 0 ? "none" : "1px solid var(--cream-dark)" }}>
                <p className="font-display" style={{ fontSize: "2.6rem", color: "var(--navy)", opacity: 0.1, lineHeight: 1, marginBottom: 10 }}>
                  {s.n}
                </p>
                <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--navy)", marginBottom: 6 }}>{s.title}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "64px 24px", textAlign: "center" }}>
        <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "var(--navy)", fontWeight: 300, marginBottom: 16 }}>
          Ready to stop doing this manually?
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.7 }}>
          Upload a file and see your PrintReady score in seconds.
        </p>
        <Link to="/upload" className="btn-navy" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          Upload your first file <ArrowRight size={15} />
        </Link>
      </section>

    </main>
  );
}