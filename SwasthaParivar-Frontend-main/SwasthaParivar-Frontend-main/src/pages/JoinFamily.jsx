import { useEffect, useState } from "react";
import { CheckCircle2, Link2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../components/auth-context";
import { Button } from "../components/ui";
import api from "../lib/api";
import { trackEvent } from "../utils/analytics";
import "./JoinFamily.css";

const JoinFamily = () => {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const shouldSignIn = !loading && !user;
  const hasInvalidCode = !code;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (shouldSignIn || hasInvalidCode) {
      return;
    }

    let cancelled = false;

    const acceptInvite = async () => {
      setStatus("loading");

      try {
        const result = await api.post("/households/invitations/accept", { code });
        if (cancelled) return;

        setStatus("success");
        setMessage(
          result?.household?.name
            ? `You have joined ${result.household.name}.`
            : "You have joined the household successfully."
        );
        trackEvent("household_join_completed", {
          invite_code: code,
          household_name: result?.household?.name || "",
        });
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error.message || "This invite could not be accepted.");
        trackEvent("household_join_failed", {
          invite_code: code,
        });
      }
    };

    acceptInvite();

    return () => {
      cancelled = true;
    };
  }, [code, hasInvalidCode, loading, shouldSignIn, user]);

  const authRedirect = `/auth?mode=signin&from=${encodeURIComponent(
    `${location.pathname}${location.search}${location.hash}`
  )}`;

  return (
    <div className="join-family-page">
      <div className="app-shell join-family-shell">
        <article className="join-family-card card">
          {status === "loading" || loading ? (
            <>
              <div className="join-family-card__icon">
                <LoaderCircle size={22} className="spin" />
              </div>
              <h1 className="text-h3">Joining household</h1>
              <p>We&apos;re validating the invite and connecting your account.</p>
            </>
          ) : null}

          {shouldSignIn ? (
            <>
              <div className="join-family-card__icon">
                <Link2 size={22} />
              </div>
              <h1 className="text-h3">Sign in to join this household</h1>
              <p>
                This invite link is valid, but we need to know which account should be connected to
                the family workspace first.
              </p>
              <div className="join-family-card__actions">
                <Button
                  onClick={() => {
                    trackEvent("household_join_requires_auth", {
                      invite_code: code,
                    });
                    navigate(authRedirect);
                  }}
                >
                  Sign in or create account
                </Button>
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Go home
                </Button>
              </div>
            </>
          ) : null}

          {status === "success" ? (
            <>
              <div className="join-family-card__icon">
                <CheckCircle2 size={22} />
              </div>
              <h1 className="text-h3">Household joined</h1>
              <p>{message}</p>
              <div className="join-family-card__actions">
                <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
                <Button variant="secondary" onClick={() => navigate("/family")}>
                  Open family
                </Button>
              </div>
            </>
          ) : null}

          {hasInvalidCode || status === "error" ? (
            <>
              <div className="join-family-card__icon">
                <TriangleAlert size={22} />
              </div>
              <h1 className="text-h3">Invite unavailable</h1>
              <p>{hasInvalidCode ? "This invite link is incomplete." : message}</p>
              <div className="join-family-card__actions">
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Go home
                </Button>
              </div>
            </>
          ) : null}
        </article>
      </div>
    </div>
  );
};

export default JoinFamily;
