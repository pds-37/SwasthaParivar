import React, { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import "./InstallPrompt.css";

const InstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Do not show if already in standalone mode (installed)
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      return;
    }

    // Check if dismissed before
    const isDismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (isDismissed) {
      return;
    }

    // Check for iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show for iOS after a delay if not dismissed
    if (isIosDevice) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 8000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt__content">
        <div className="install-prompt__info">
          <div className="install-prompt__icon-wrap">
            <Download className="install-prompt__icon" size={20} />
          </div>
          <div className="install-prompt__text">
            <strong>Install SwasthaParivar app</strong>
            <p>Get a faster experience and real-time health notifications.</p>
          </div>
        </div>
        
        <div className="install-prompt__actions">
          {isIOS ? (
            <div className="install-prompt__ios-guide">
              Tap <Share size={14} /> then <strong>"Add to Home Screen"</strong>
            </div>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={handleInstall}>
              Install
            </button>
          )}
          <button className="install-prompt__close" onClick={handleDismiss} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
