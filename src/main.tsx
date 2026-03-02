import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// SuperAdmin domain: aggressively clear stale service workers/caches to avoid old bundle lockups
if (window.location.hostname === "superadmin.siparis.co") {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => void registration.unregister());
    });
  }

  if ("caches" in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key.includes("workbox") || key.includes("siparis") || key.includes("precache")) {
          void caches.delete(key);
        }
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);

