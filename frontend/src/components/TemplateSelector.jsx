
// Two-step picker: choose vendor, then choose product.
// Fetches both lists from the real backend (vendorTemplates.js).
// Calls onSelect({ vendorId, productId, spec }) when both are chosen.

import { useState, useEffect } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import api from "../api.js"; 

export default function TemplateSelector({ selection, onSelect }) {
  const [vendors,         setVendors]         = useState([]);
  const [products,        setProducts]        = useState([]);
  const [selectedVendor,  setSelectedVendor]  = useState(selection?.vendorId || null);
  const [loadingVendors,  setLoadingVendors]  = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError,       setLoadError]       = useState(null);

  // Load vendor list once when the component mounts
  useEffect(() => {
    api.get("/api/jobs/vendors")
      .then((r) => setVendors(r.data.vendors))
      .catch(() => setLoadError("Could not load vendors. Is the backend running?"))
      .finally(() => setLoadingVendors(false));
  }, []);

  // Load products whenever the selected vendor changes
  useEffect(() => {
    if (!selectedVendor) return;
    setLoadingProducts(true);
    api.get(`/api/jobs/vendors/${selectedVendor}/products`)
      .then((r) => setProducts(r.data.products))
      .catch(() => setLoadError("Could not load products for this vendor."))
      .finally(() => setLoadingProducts(false));
  }, [selectedVendor]);

  function pickVendor(vendorId) {
    setSelectedVendor(vendorId);
    setProducts([]);
    onSelect(null); // clear product selection when vendor changes
  }

  function pickProduct(product) {
    onSelect({ vendorId: selectedVendor, productId: product.id, spec: product });
  }

  if (loadingVendors) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", padding: "12px 0" }}>
        <Loader2 size={14} className="spin" /> Loading vendors…
      </div>
    );
  }

  if (loadError) {
    return (
      <p style={{ color: "var(--press)", fontSize: "0.85rem", fontWeight: 500 }}>
        ⚠ {loadError}
      </p>
    );
  }

  return (
    <div>
      <p className="font-stamp" style={{ fontSize: "0.72rem", color: "var(--navy-lt)", marginBottom: 10 }}>
        Step 1 — Choose vendor
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {vendors.map((v) => {
          const active = selectedVendor === v.id;
          return (
            <button key={v.id} onClick={() => pickVendor(v.id)} style={{
              padding: "0.4rem 1rem",
              border: active ? "2px solid var(--navy)" : "1.5px solid var(--cream-dark)",
              background: active ? "var(--navy)" : "var(--card)",
              color: active ? "var(--cream)" : "var(--ink)",
              fontSize: "0.83rem", fontWeight: active ? 600 : 400,
              cursor: "pointer", transition: "all 0.12s",
              fontFamily: "'DM Sans',sans-serif",
            }}>
              {v.label}
            </button>
          );
        })}
      </div>

      {selectedVendor && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <ChevronRight size={13} color="var(--navy-lt)" />
            <p className="font-stamp" style={{ fontSize: "0.72rem", color: "var(--navy-lt)" }}>
              Step 2 — Choose product
            </p>
          </div>

          {loadingProducts ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: "0.82rem" }}>
              <Loader2 size={13} className="spin" /> Loading…
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {products.map((p) => {
                const active = selection?.productId === p.id && selection?.vendorId === selectedVendor;
                return (
                  <button key={p.id} onClick={() => pickProduct(p)}
                    className="text-left" style={{
                      padding: 12,
                      border: active ? "3px solid var(--press)" : "3px solid var(--border)",
                      boxShadow: active ? "4px 4px 0 var(--press)" : "4px 4px 0 var(--border)",
                      background: active ? "#E8421A08" : "var(--card)",
                      cursor: "pointer", transition: "all 0.1s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: "1.3rem" }}>{p.icon}</span>
                      {active && <span className="chip chip-red" style={{ fontSize: "0.58rem" }}>SELECTED</span>}
                    </div>
                    <p className="font-stamp" style={{ fontSize: "0.75rem", color: active ? "var(--press)" : "var(--ink)" }}>
                      {p.label}
                    </p>
                    <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 3 }}>
                      {p.dpi} DPI · {p.format?.toUpperCase()} · {p.pxWidth}×{p.pxHeight}px
                    </p>
                    {/* shows whether the image gets cropped or padded */}
                    <p style={{ fontSize: "0.64rem", color: "var(--navy-lt)", marginTop: 2 }}>
                      {p.fitMode === "cover" ? "Fills frame (may crop)" : "Fits within frame (no crop)"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}