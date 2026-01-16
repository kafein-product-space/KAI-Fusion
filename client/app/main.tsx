import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router";

const basePath = import.meta.env.VITE_BASE_PATH || '/kai';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
