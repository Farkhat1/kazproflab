import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import { App } from "./App.jsx";
import "./styles.css";

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
const root = document.getElementById("root");
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
