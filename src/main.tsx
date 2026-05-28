import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapDemo } from "./demo/bootstrap";

// --- PWA registration guard: never register the SW in Lovable preview/iframes. ---
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app") &&
    window.location.hostname.startsWith("id-preview--");

if (isPreviewHost || isInIframe) {
  // Clean up any previously-registered service workers in preview contexts.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

// Hide splash once React mounts.
const hideSplash = () => {
  const el = document.getElementById("obol-splash");
  if (el) {
    el.classList.add("splash-hidden");
    setTimeout(() => el.remove(), 350);
  }
};

bootstrapDemo();
createRoot(document.getElementById("root")!).render(<App />);
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
