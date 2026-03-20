import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navigation from "./components/Navigation";
import { AuthProvider } from "./components/AuthProvider";
import { useAuth } from "./components/auth-context";
import api from "./lib/api";

import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import HealthMonitor from "./pages/HealthMonitor";
import Remedies from "./pages/remedies.jsx";
import AIChat from "./pages/AIChat";
import Reminders from "./pages/Reminders";
import { AppThemeProvider } from "./theme/ThemeProvider";

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
};

const GuestOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const token = localStorage.getItem("token");
  const [familyData, setFamilyData] = useState([]);

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const data = await api.get("/members");
        setFamilyData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch family data", error);
        setFamilyData([]);
      }
    };

    if (token) fetchFamily();
  }, [token]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/auth"
        element={
          <GuestOnlyRoute>
            <Auth />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedLayout>
            <HealthMonitor />
          </ProtectedLayout>
        }
      />
      <Route
        path="/health/:id"
        element={
          <ProtectedLayout>
            <HealthMonitor />
          </ProtectedLayout>
        }
      />
      <Route
        path="/remedies"
        element={
          <ProtectedLayout>
            <Remedies />
          </ProtectedLayout>
        }
      />
      <Route
        path="/ai-chat"
        element={
          <ProtectedLayout>
            <AIChat userFamily={familyData} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reminders"
        element={
          <ProtectedLayout>
            <Reminders />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AppThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
};

export default App;
