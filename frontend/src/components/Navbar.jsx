
// Top navigation. Shows "Login" button when logged out,
// or the user's name + "Logout" button when logged in.

import { Link, useLocation } from "react-router-dom";
import { Printer } from "lucide-react";

export default function Navbar({ user, isLoggedIn, onLoginClick, onLogout }) {
  const { pathname } = useLocation();
  const links = [
    { to: "/upload",  label: "Upload" },
    { to: "/history", label: "History" },
    ...(user?.role === "printer" ? [{to: "/printer-dashboard", label: "Dashboard"}]:[]),
  ];

  return (
    <header className="sticky top-0 z-50" style={{
      background: pathname === "/" ? "rgba(27,45,79,0.97)" : "var(--ink)",
      borderBottom: pathname === "/" ? "1px solid rgba(255,255,255,0.1)" : "3px solid var(--press)",
      backdropFilter: "blur(8px)",
    }}>
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">

        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Printer size={16} color="white" />
          </div>
          <span className="font-display" style={{ color: "var(--cream)", fontSize: "1.3rem", fontWeight: 300 }}>
            Print<em style={{ color: "var(--gold)", fontStyle: "italic" }}>Ready</em>
          </span>
        </Link>

        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              color: pathname === to ? "var(--navy)" : "rgba(255,255,255,0.75)",
              background: pathname === to ? "var(--gold-lt)" : "transparent",
              padding: "0.3rem 0.85rem",
              fontSize: "0.85rem",
              fontWeight: pathname === to ? 600 : 400,
              textDecoration: "none",
              transition: "all 0.15s",
            }}>
              {label}
            </Link>
          ))}

          {/* swap between Login button
              and "Hi, Name" + Logout based on real auth state */}
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.82rem" }}>
                Hi, {user?.name?.split(" ")[0]}
              </span>
              <button onClick={onLogout} style={{
                background: "transparent", border: "1.5px solid rgba(255,255,255,0.3)",
                color: "rgba(255,255,255,0.85)", padding: "0.3rem 0.85rem",
                fontSize: "0.8rem", cursor: "pointer", borderRadius: 2,
              }}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={onLoginClick} style={{
              background: "var(--gold)", border: "none", color: "white",
              padding: "0.35rem 1rem", fontSize: "0.82rem", cursor: "pointer",
              borderRadius: 2, fontWeight: 600,
            }}>
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}