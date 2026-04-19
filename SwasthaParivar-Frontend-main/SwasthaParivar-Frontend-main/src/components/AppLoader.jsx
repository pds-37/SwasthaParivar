import React, { useState, useEffect } from "react";
import "./AppLoader.css";

const AppLoader = () => {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    // If loading takes more than 3 seconds, assume the backend is waking up from sleep
    const timer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-loader-container">
      <div className="app-loader-content">
        <div className="app-loader-logo-wrapper">
          <img src="/icon-health.svg" alt="SwasthaParivar Logo" className="app-loader-logo" />
        </div>
        <h2 className="app-loader-title">SwasthaParivar</h2>
        
        <div className="app-loader-spinner-container">
          <div className="app-loader-spinner"></div>
        </div>

        <div className={`app-loader-message ${showSlowMessage ? "visible" : ""}`}>
          <p>Preparing your experience...</p>
          <span className="app-loader-submessage">
            We're warming up our secure servers for your first visit. Just a moment!
          </span>
        </div>
      </div>
    </div>
  );
};

export default AppLoader;
