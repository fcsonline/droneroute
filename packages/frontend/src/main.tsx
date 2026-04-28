import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { AppWrapper } from "./AppWrapper";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
    <Toaster theme="dark" position="bottom-center" richColors />
  </StrictMode>,
);
