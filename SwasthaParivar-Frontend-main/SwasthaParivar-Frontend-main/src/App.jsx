import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navigation from "./components/Navigation";
import { AuthProvider } from "./components/AuthProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import PageSkeleton from "./components/PageSkeleton";
import { useAuth } from "./components/auth-context";
import { FamilyStoreProvider } from "./store/family-store";
import { UIStoreProvider } from "./store/ui-store";
import { AppThemeProvider } from "./theme/ThemeProvider";

const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const HealthMonitor = lazy(() => import("./pages/HealthMonitor"));
const FamilyMembers = lazy(() => import("./pages/FamilyMembers"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Reports = lazy(() => import("./pages/Reports"));
const Remedies = lazy(() => import("./pages/remedies.jsx"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Settings = lazy(() => import("./pages/Settings"));

const RouteScreen = ({ page, componentProps }) => {
  const location = useLocation();
  const Page = page;

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <Page {...componentProps} />
      </Suspense>
    </ErrorBoundary>
  );
};

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FamilyStoreProvider>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navigation />
        <main className="app-main-shell">{children}</main>
      </div>
    </FamilyStoreProvider>
  );
};

const GuestOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageSkeleton />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RouteScreen page={Landing} />} />
      <Route
        path="/auth"
        element={
          <GuestOnlyRoute>
            <RouteScreen page={Auth} />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <RouteScreen page={Dashboard} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/family"
        element={
          <ProtectedLayout>
            <RouteScreen page={FamilyMembers} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/family/:id"
        element={
          <ProtectedLayout>
            <RouteScreen page={MemberProfile} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedLayout>
            <RouteScreen page={HealthMonitor} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/health/:id"
        element={
          <ProtectedLayout>
            <RouteScreen page={HealthMonitor} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <RouteScreen page={Reports} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/remedies"
        element={
          <ProtectedLayout>
            <RouteScreen page={Remedies} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/ai-chat"
        element={
          <ProtectedLayout>
            <RouteScreen page={AIChat} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <RouteScreen page={Settings} />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reminders"
        element={
          <ProtectedLayout>
            <RouteScreen page={Reminders} />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <AppThemeProvider>
    <BrowserRouter>
      <UIStoreProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 3200 }} />
        </AuthProvider>
      </UIStoreProvider>
    </BrowserRouter>
  </AppThemeProvider>
);

export default App;
