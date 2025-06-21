import React, { useEffect, useState } from "react";
import "./InstallButton.css"; // Assure-toi d'importer ce fichier CSS

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        console.log("Installation acceptée");
      } else {
        console.log("Installation refusée");
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  if (!isInstallable) return null;

  return (
    <div className="install-container">
      <button className="install-button pulse" onClick={handleInstallClick}>
        📲 Installer l'application
      </button>
    </div>
  );
};

export default InstallButton;
