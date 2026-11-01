import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import { AppProvider } from "@/components/providers/app-provider";
import { AuthSessionManager } from "@/components/providers/auth-session-manager";
import { ConsentBanner } from "@/features/consent/consent-banner";
import { MetaPixelTracker } from "@/features/consent/meta-pixel-tracker";
import { AppRouter } from "@/routes/app-router";
import "@fontsource-variable/inter/wght.css";
import "@/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("L'élément racine de l'application est introuvable.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <ConsentBanner />
        <AuthSessionManager>
          <AppRouter />
        </AuthSessionManager>
        <MetaPixelTracker />
      </BrowserRouter>
      <Analytics />
    </AppProvider>
  </StrictMode>,
);
