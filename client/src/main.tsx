import { createRoot } from "react-dom/client";

// Minimal entry point to debug loading issues
const root = createRoot(document.getElementById("root")!);
root.render(
  <div style={{ padding: 20, fontFamily: "sans-serif", background: "#f0f0f0", height: "100vh" }}>
    <h1>System Online</h1>
    <p>The application container is running.</p>
  </div>
);

