import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Mounting App...");

// Visual check to ensure script is running
const loadingDiv = document.createElement("div");
loadingDiv.innerHTML = "JS Loaded";
loadingDiv.style.position = "absolute";
loadingDiv.style.top = "0";
loadingDiv.style.left = "0";
loadingDiv.style.zIndex = "9999";
document.body.appendChild(loadingDiv);

createRoot(document.getElementById("root")!).render(<App />);
