import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  HeartPulse,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "../components/auth-context";
import { Button, Input } from "../components/ui";
import { buildApiUrl } from "../lib/api";
import { useThemeMode } from "../theme/theme-context";
import "../Auth.css";

const trustPoints = [
  {
    icon: Sparkles,
    title: "AI-guided care",
    text: "Get grounded family wellness guidance shaped by reminders, reports, and household memory.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Health data stays inside authenticated family workspaces with safer defaults and clear controls.",
  },
  {
    icon: Users,
    title: "Built for families",
    text: "Track multiple members, organize care by person, and keep the whole household in sync.",
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GOOGLE_AUTH_ERRORS = {
  google_not_configured: "Google sign-in is not configured yet. Please add the Google OAuth credentials first.",
  google_cancelled: "Google sign-in was cancelled. Please try again.",
  google_state_invalid: "Google sign-in session expired. Please try again.",
  google_code_missing: "Google sign-in could not be completed. Please try again.",
  google_profile_invalid: "Your Google account did not return a valid verified email.",
  google_auth_not_configured: "Google sign-in is not configured yet. Please add the Google OAuth credentials first.",
};

const getPasswordStrength = (value) => {
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  if (score <= 2) return { label: "Weak", className: "is-weak" };
  if (score <= 4) return { label: "Good", className: "is-medium" };
  return { label: "Strong", className: "is-strong" };
};

const getAuthFieldErrors = ({ isLogin, formData }) => {
  const nextErrors = {};

  if (!isLogin) {
    const fullName = formData.fullName.trim();
    if (!fullName) {
      nextErrors.fullName = "Full name is required";
    } else if (fullName.length < 2) {
      nextErrors.fullName = "Full name must be at least 2 characters";
    }
  }

  const email = formData.email.trim();
  if (!email) {
    nextErrors.email = "Email is required";
  } else if (!emailPattern.test(email)) {
    nextErrors.email = "Please enter a valid email address";
  }

  if (!formData.password) {
    nextErrors.password = "Password is required";
  } else if (!isLogin) {
    if (formData.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.password)) {
      nextErrors.password = "Password must include an uppercase letter";
    } else if (!/[a-z]/.test(formData.password)) {
      nextErrors.password = "Password must include a lowercase letter";
    } else if (!/\d/.test(formData.password)) {
      nextErrors.password = "Password must include a number";
    }
  }

  return nextErrors;
};

const Auth = () => {
  const { login, signup } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const strength = useMemo(
    () => getPasswordStrength(formData.password || ""),
    [formData.password]
  );

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (!modeParam) return;
    setIsLogin(modeParam !== "signup");
  }, [searchParams]);

  useEffect(() => {
    const authError = searchParams.get("authError");
    if (!authError) return;
    setError(GOOGLE_AUTH_ERRORS[authError] || "Google sign-in failed. Please try again.");
    setIsLogin(true);
  }, [searchParams]);

  const handleChange = (key, value) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => ({ ...previous, [key]: "" }));
    if (error) setError("");
  };

  const handleModeChange = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setError("");
    setFieldErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const nextErrors = getAuthFieldErrors({ isLogin, formData });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login({
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        await signup({
          ...formData,
          email: formData.email.trim(),
          fullName: formData.fullName.trim(),
        });
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleContinue = () => {
    setError("");
    setGoogleLoading(true);
    const currentOrigin = window.location.origin;
    window.location.assign(
      `${buildApiUrl("/auth/google/start")}?returnTo=${encodeURIComponent(currentOrigin)}`
    );
  };

  return (
    <div className={`auth-page auth-page--${mode}`}>
      <div className="auth-shell">
        <button
          type="button"
          className="auth-theme-toggle icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {mode === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
        </button>

        <section className="auth-brand-panel">
          <div className="auth-brand-mark">
            <HeartPulse size={22} />
          </div>

          <span className="auth-eyebrow">Family Health OS</span>

          <h1 className="text-h1">
            Keep your family&apos;s care beautifully organized.
          </h1>

          <p className="text-body-lg">
            SwasthaParivar brings reminders, reports, remedies, and personalized
            AI care together in one calm, premium workspace for modern Indian
            families.
          </p>

          <div className="auth-brand-visual" aria-hidden="true">
            <div className="auth-brand-visual__panel">
              <span>Today&apos;s care pulse</span>
              <strong>2 reminders due</strong>
              <small>1 report ready for review</small>
            </div>
            <div className="auth-brand-visual__chip">AI guided</div>
            <div className="auth-brand-visual__chip">Household-safe</div>
            <div className="auth-brand-visual__chip">Always on track</div>
          </div>

          <div className="auth-trust-grid">
            {trustPoints.map((point) => (
              <article key={point.title} className="auth-trust-card">
                <div className="auth-trust-icon">
                  <point.icon size={18} />
                </div>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-top">
            <div>
              <p className="auth-card-label">Welcome</p>
              <h2 className="text-h3">
                {isLogin ? "Sign in to continue" : "Create your family account"}
              </h2>
            </div>

            <div className="auth-tabs">
              <button
                className={`tab-btn ${isLogin ? "active" : ""}`}
                onClick={() => handleModeChange(true)}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`tab-btn ${!isLogin ? "active" : ""}`}
                onClick={() => handleModeChange(false)}
                type="button"
              >
                Sign Up
              </button>
            </div>
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin ? (
              <Input
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={(event) => handleChange("fullName", event.target.value)}
                placeholder="Enter your full name"
                leftIcon={<UserRound size={18} />}
                autoComplete="name"
                error={fieldErrors.fullName}
              />
            ) : null}

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(event) => handleChange("email", event.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail size={18} />}
              autoComplete="email"
              error={fieldErrors.email}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder="Enter your password"
              leftIcon={<Lock size={18} />}
              autoComplete={isLogin ? "current-password" : "new-password"}
              helperText={
                isLogin
                  ? "Use the same credentials you used during signup."
                  : "Use at least 8 characters with uppercase, lowercase, and a number."
              }
              error={fieldErrors.password}
            />

            {!isLogin ? (
              <div className="auth-strength">
                <div className="auth-strength__bar">
                  <span className={`auth-strength__fill ${strength.className}`} />
                </div>
                <span>{strength.label} password</span>
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              rightIcon={<ArrowRight size={18} />}
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <Button variant="secondary" size="lg" fullWidth loading={googleLoading} onClick={handleGoogleContinue}>
            Continue with Google
          </Button>

          <p className="policy-text">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Auth;
