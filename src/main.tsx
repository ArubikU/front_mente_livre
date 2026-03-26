import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LoadingFallback } from "./components/ui/loading-fallback";
import "./lib/i18n";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <Suspense fallback={<LoadingFallback />}>
    <App />
  </Suspense>
);
