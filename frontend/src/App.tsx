import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AIWidget from "./components/AIWidget";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import RegisterDonorPage from "./pages/RegisterDonorPage";
import RequestBloodPage from "./pages/RequestBloodPage";
import CampsPage from "./pages/CampsPage";
import AIChatPage from "./pages/AIChatPage";
import DonorPortal from "./pages/DonorPortal";
import RecipientPortal from "./pages/RecipientPortal";
import HospitalPortal from "./pages/HospitalPortal";
import AdminPortal from "./pages/AdminPortal";
import BookSlotPage from "./pages/BookSlotPage";

// Protected Route Wrapper Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Body */}
      <div className="flex flex-1 relative">
        
        {/* Render Sidebar only for Authenticated Users */}
        {isAuthenticated && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* Content Pane */}
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-64px)]">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
            <Route path="/home" element={<LandingPage />} />
            <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
            
            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/donor-portal"
              element={
                <ProtectedRoute>
                  <DonorPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipient-portal"
              element={
                <ProtectedRoute>
                  <RecipientPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospital-portal"
              element={
                <ProtectedRoute>
                  <HospitalPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-portal"
              element={
                <ProtectedRoute>
                  <AdminPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/book-slot/:campId"
              element={
                <ProtectedRoute>
                  <BookSlotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-donor"
              element={
                <ProtectedRoute>
                  <RegisterDonorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/request-blood"
              element={
                <ProtectedRoute>
                  <RequestBloodPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/camps"
              element={
                <ProtectedRoute>
                  <CampsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <AIChatPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating AI Support Assistant Bubble */}
      <AIWidget />
    </div>
  );
}

export default App;
