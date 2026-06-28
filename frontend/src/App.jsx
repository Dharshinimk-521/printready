
// Root component. Owns auth state and the login modal's visibility.
// Both live here because multiple pages need to trigger the same modal.

import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar      from "./components/Navbar.jsx";
import AuthModal   from "./components/AuthModal.jsx";
import { useAuth } from "./hooks/useAuth.js";

import LandingPage  from "./pages/LandingPage.jsx";
import UploadPage   from "./pages/UploadPage.jsx";
import HistoryPage  from "./pages/HistoryPage.jsx";
import PrinterDashboard from "./pages/PrinterDashboard.jsx";

export default function App() {
  const { user, isLoggedIn, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Called by AuthModal after a successful login/register.
  // Saves the user+token via useAuth, then closes the popup.
  function handleAuthSuccess(userData, token) {
    login(userData, token);
    setShowAuthModal(false);
  }

  return (
    <BrowserRouter>
      <Navbar
        user={user}
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={logout}
      />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      <Routes>
        <Route path="/"        element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage onLoginClick={() => setShowAuthModal(true)} />} />
        <Route
          path="/history"
          element={<HistoryPage onLoginClick={() => setShowAuthModal(true)} />}
        />
        <Route path="/printer-dashboard" element={<PrinterDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}