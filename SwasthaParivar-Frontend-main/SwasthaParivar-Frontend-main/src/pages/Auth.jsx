import React, { useState } from "react";
import { ShieldCheck, Users, Sparkles, HeartPulse, Mail, Lock, UserRound } from "lucide-react";
import { useAuth } from "../components/auth-context";
import "../Auth.css";

const trustPoints = [
  {
    icon: Sparkles,
    title: "AI-guided wellness",
    text: "Personalized guidance for remedies, reminders, and family care routines.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Your family health data stays behind authenticated, protected workflows.",
  },
  {
    icon: Users,
    title: "Built for households",
    text: "Track multiple members, compare records, and keep care tasks organized.",
  },
];

const Auth = () => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await signup(formData);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <div className="auth-brand-mark">
            <HeartPulse size={22} />
          </div>

          <span className="auth-eyebrow">Ayurvedic AI Wellness</span>

          <h1>
            Your family's health,
            <span> guided in one place.</span>
          </h1>

          <p>
            SwasthaParivar brings records, reminders, remedies, and
            personalized AI care together so every family member gets smarter,
            more organized health support.
          </p>

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
              <h2>{isLogin ? "Sign in to continue" : "Create your account"}</h2>
            </div>

            <div className="auth-tabs">
              <button
                className={`tab-btn ${isLogin ? "active" : ""}`}
                onClick={() => setIsLogin(true)}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`tab-btn ${!isLogin ? "active" : ""}`}
                onClick={() => setIsLogin(false)}
                type="button"
              >
                Sign Up
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <label className="input-group">
                <span className="input-label">Full Name</span>
                <div className="input-shell">
                  <UserRound size={18} />
                  <input
                    name="fullName"
                    type="text"
                    required
                    className="input-field"
                    onChange={handleChange}
                    value={formData.fullName}
                    placeholder="Enter your full name"
                  />
                </div>
              </label>
            )}

            <label className="input-group">
              <span className="input-label">Email</span>
              <div className="input-shell">
                <Mail size={18} />
                <input
                  name="email"
                  type="email"
                  required
                  className="input-field"
                  onChange={handleChange}
                  value={formData.email}
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="input-group">
              <span className="input-label">Password</span>
              <div className="input-shell">
                <Lock size={18} />
                <input
                  name="password"
                  type="password"
                  required
                  className="input-field"
                  onChange={handleChange}
                  value={formData.password}
                  placeholder="Enter your password"
                />
              </div>
            </label>

            {isLogin && <p className="auth-helper">Use the same credentials you used during signup.</p>}

            <button className="auth-btn" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="policy-text">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Auth;
