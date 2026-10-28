import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/journey.css";
import "../app/compliance-desk.css";
import "../app/clarity.css";
import "../app/product-v13.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><Home /></StrictMode>,
);
