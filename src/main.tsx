import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDatabase } from "./lib/db/initDb";

// Initialize database on app start
initDatabase().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
