import React from "react";

import { captureFrontendError } from "../lib/sentry";
import { Button } from "./ui";
import "./ErrorBoundary.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Route error boundary caught:", error, info);
    captureFrontendError(error, {
      componentStack: info?.componentStack,
      resetKey: this.props.resetKey,
    });
  }

  componentDidUpdate(previousProps) {
    if (this.props.resetKey !== previousProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary card">
          <h2>Something went wrong</h2>
          <p>This screen hit an unexpected issue. You can retry without refreshing the entire app.</p>
          <Button onClick={() => this.setState({ hasError: false })}>Retry</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
