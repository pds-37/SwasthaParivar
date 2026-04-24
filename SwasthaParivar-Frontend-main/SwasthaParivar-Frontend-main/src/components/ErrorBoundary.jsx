import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./ui";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash Caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-screen">
          <div className="error-boundary-card">
            <div className="error-icon">
              <AlertCircle size={48} />
            </div>
            <h1>Something went wrong</h1>
            <p>
              We encountered an unexpected error while preparing your care space.
              Don't worry, your data is safe.
            </p>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<RotateCcw size={18} />}
              onClick={() => window.location.reload()}
            >
              Refresh Workspace
            </Button>
          </div>
          <style>{`
            .error-boundary-screen {
              height: 100vh;
              width: 100vw;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--color-bg);
              color: var(--color-text);
              padding: 2rem;
              text-align: center;
            }
            .error-boundary-card {
              max-width: 480px;
              padding: 3rem;
              background: var(--color-surface);
              border: 1px solid var(--color-border);
              border-radius: 2rem;
              box-shadow: var(--shadow-xl);
            }
            .error-icon {
              color: var(--color-error);
              margin-bottom: 1.5rem;
              display: flex;
              justify-content: center;
            }
            .error-boundary-card h1 {
              font-size: 2rem;
              margin-bottom: 1rem;
              font-weight: 700;
              background: var(--gradient-primary);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .error-boundary-card p {
              color: var(--color-text-muted);
              margin-bottom: 2rem;
              line-height: 1.6;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
