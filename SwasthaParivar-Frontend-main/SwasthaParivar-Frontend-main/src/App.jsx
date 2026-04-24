import React, { Suspense, lazy, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navigation from "./components/Navigation";
import { AuthProvider } from "./components/AuthProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingAIButton from "./components/FloatingAIButton";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";
import PageSkeleton from "./components/PageSkeleton";
import UpgradePrompt from "./components/common/UpgradePrompt";
import { useAuth } from "./components/auth-context";
import { AppThemeProvider } from "./context/ThemeContext";
import { FamilyStoreProvider } from "./store/family-store";
import { UIStoreProvider } from "./store/ui-store";
import { initAnalytics, trackEvent } from "./utils/analytics";

const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/Landing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Pricing = lazy(() => import("./pages/Pricing"));
const JoinFamily = lazy(() => import("./pages/JoinFamily"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const HealthMonitor = lazy(() => import("./pages/HealthMonitor"));
const FamilyMembers = lazy(() => import("./pages/FamilyMembers"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Reports = lazy(() => import("./pages/Reports"));
const Remedies = lazy(() => import("./pages/remedies.jsx"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Settings = lazy(() => import("./pages/Settings"));
const MotionDiv = motion.div;

const RouteScreen = ({ page, componentProps }) => {
  const location = useLocation();
  const Page = page;

  useEffect(() => {
    trackEvent("page_view", {
      path: location.pathname,
    });
  }, [location.pathname]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <MotionDiv
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}
        >
          <Page {...componentProps} />
        </MotionDiv>
      </Suspense>
    </ErrorBoundary>
  );
};

const ProtectedLayout = ({ children }) => {
  const { user, loading, updateUser } = useAuth();
  const location = useLocation();
  const showOnboarding = Boolean(user && !user.onboardingComplete);

  if (loading) return <PageSkeleton />;
  if (!user) {
    const redirectTo = `/auth?mode=signin&from=${encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    )}`;
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <FamilyStoreProvider>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navigation />
        <main className="app-main-shell">{children}</main>
        <FloatingAIButton />
        <OnboardingWizard
          open={showOnboarding}
          onComplete={(updatedUser) => {
            updateUser(updatedUser || { onboardingComplete: true });
          }}
        />
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

const AuthEntryRoute = ({ children }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasExplicitIntent = Boolean(
    params.get("mode") || params.get("from") || params.get("authError")
  );

  if (!hasExplicitIntent) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RouteScreen page={Landing} />} />
      <Route path="/privacy" element={<RouteScreen page={Privacy} />} />
      <Route path="/terms" element={<RouteScreen page={Terms} />} />
      <Route path="/pricing" element={<RouteScreen page={Pricing} />} />
      <Route path="/join/:code" element={<RouteScreen page={JoinFamily} />} />
      <Route
        path="/auth"
        element={
          <GuestOnlyRoute>
            <AuthEntryRoute>
              <RouteScreen page={Auth} />
            </AuthEntryRoute>
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

const App = () => {
  const [upgradePrompt, setUpgradePrompt] = useState({
    open: false,
    feature: "",
  });

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const handleShowUpgradePrompt = (event) => {
      setUpgradePrompt({
        open: true,
        feature: event?.detail?.feature || "",
      });
    };

    window.addEventListener("show-upgrade-prompt", handleShowUpgradePrompt);
    return () => {
      window.removeEventListener("show-upgrade-prompt", handleShowUpgradePrompt);
    };
  }, []);

  return (
    <AppThemeProvider>
      <BrowserRouter>
        <UIStoreProvider>
          <AuthProvider>
            <AppRoutes />
            <UpgradePrompt
              open={upgradePrompt.open}
              featureName={upgradePrompt.feature}
              onClose={() => setUpgradePrompt({ open: false, feature: "" })}
            />
            <Toaster position="top-right" toastOptions={{ duration: 3200 }} />
          </AuthProvider>
        </UIStoreProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
};

export default App;
