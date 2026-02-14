import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

console.log("main.tsx loaded");

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = '<div style="color: red; padding: 20px;">ERROR: Root element #root not found</div>';
} else {
  console.log("Creating React root...");
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log("React app rendered");
}
