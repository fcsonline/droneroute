import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppWrapper } from "./AppWrapper";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
);
