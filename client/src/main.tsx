import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Mounting App...");

try {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
} catch (e: any) {
  console.error("Mount error:", e);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Application Error</h1><pre>${e.message}</pre></div>`;
}


