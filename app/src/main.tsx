import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App.tsx";
import "./index.css";
import { initDatabase } from "./lib/db/initDb";

// Initialize database on app start
initDatabase().catch(console.error);

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn(
    "Missing VITE_CLERK_PUBLISHABLE_KEY — Clerk auth will not work. " +
    "Add it to your .env file."
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY || ""}
    afterSignOutUrl="/"
  >
    <App />
  </ClerkProvider>
);
