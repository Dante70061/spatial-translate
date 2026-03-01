import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import "./index.css"
import {initPolyfill} from "@webspatial/react-sdk"

initPolyfill()

/* global __XR_ENV_BASE__ */
const getBasename = () => {
  /* global __XR_ENV_BASE__ */
  if (typeof __XR_ENV_BASE__ === 'undefined' || !__XR_ENV_BASE__) return "";
  
  // Normalize base by removing trailing slash if present
  const base = __XR_ENV_BASE__.endsWith('/') ? __XR_ENV_BASE__.slice(0, -1) : __XR_ENV_BASE__;
  
  // Check if current path starts with normalized base
  if (window.location.pathname.startsWith(base)) {
    console.log("[ROUTER] Using basename:", base);
    return base;
  }
  return "";
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={getBasename()}>
      <App />
    </BrowserRouter>
  </StrictMode>
)
