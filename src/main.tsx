import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    // Suppress benign cross-origin "Script error." or Google Maps errors to prevent app-wide crash indicators
    const isGoogleMapsError =
      event.message?.includes("maps.googleapis") ||
      event.filename?.includes("maps.googleapis") ||
      event.message === "Script error.";
    if (isGoogleMapsError) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Gracefully suppressed external script error:", event.message);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.message?.includes("maps.googleapis") ||
        reason.message === "Script error.")
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Gracefully suppressed external unhandled rejection:", reason.message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
