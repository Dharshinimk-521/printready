
// Manages login state across the whole app.
// Reads/writes localStorage so the user stays logged in
// across page refreshes and browser restarts.
//
// Any component that needs to know "is the user logged in?"
// just calls useAuth() — no prop drilling needed.

import { useState, useCallback } from "react";

export function useAuth() {
  // On first load, try to restore the user from localStorage.
  // This runs once when the hook is first used (e.g. App.jsx mounts).
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("pr_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      // If localStorage has corrupted JSON for any reason,
      // fail safely instead of crashing the whole app
      return null;
    }
  });

  // Called after a successful login or register.
  // Saves both the user object and the JWT token.
  const login = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem("pr_user", JSON.stringify(userData));
    if (token) {
      localStorage.setItem("pr_token", token);
    }
  }, []);

  // Clears everything — used by the Logout button
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("pr_user");
    localStorage.removeItem("pr_token");
  }, []);

  // Helper used by API calls to attach the JWT automatically.
  // Returns null if not logged in - axios calls just send no
  // Authorization header in that case (backend treats it as a guest).
  const getToken = useCallback(() => {
    return localStorage.getItem("pr_token");
  }, []);

  return {
    user,
    isLoggedIn: !!user,
    login,
    logout,
    getToken,
  };
}