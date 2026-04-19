import React, { useState, useEffect } from "react";
import "./AppLoader.css";

const quotes = [
  "Preparing a healthier experience for you...",
  "Your wellness space is getting ready...",
  "Care is on its way...",
  "Setting up something good for your health...",
  "A moment for your well-being...",
  "Getting everything ready for you and your family...",
  "Bringing you closer to better health...",
  "Almost ready to care for you...",
  "Your journey to wellness begins in a moment...",
  "Loading a better, healthier experience..."
];

const AppLoader = () => {
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);

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
          <img src="/Swastha%20Parivar%20logo.png" alt="SwasthaParivar Logo" className="app-loader-logo" />
        </div>
        <h2 className="app-loader-title">SwasthaParivar</h2>
        
        <div className="app-loader-spinner-container">
          <div className="app-loader-spinner"></div>
        </div>

        <div className={`app-loader-message ${showSlowMessage ? "visible" : ""}`}>
          <p>{quote}</p>
          <span className="app-loader-submessage">
            We're warming up our secure servers for your first visit. Just a moment!
          </span>
        </div>
      </div>
    </div>
  );
};

export default AppLoader;
