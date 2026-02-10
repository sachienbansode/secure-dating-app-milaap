import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Mounting App...");

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (e: any) {
  console.error("Mount error:", e);
  document.body.innerHTML += `<div style="color:red; padding: 20px;"><h1>Startup Error</h1><pre>${e.message}</pre></div>`;
}
