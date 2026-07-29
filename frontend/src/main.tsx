import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "@/components/providers/app-provider";
import { AuthSessionManager } from "@/components/providers/auth-session-manager";
import { AppRouter } from "@/routes/app-router";
import "@/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("L'élément racine de l'application est introuvable.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <AuthSessionManager>
          <AppRouter />
        </AuthSessionManager>
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
);
