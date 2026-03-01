import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { initSpatial } from "@webspatial/react-sdk"
import App from "./App.jsx"
import "./index.css"

initSpatial()

/* global __XR_ENV_BASE__ */
const getBasename = () => {
  if (typeof __XR_ENV_BASE__ === 'undefined') return "";
  // Only use the basename if the current URL actually starts with it.
  // This prevents React Router from failing to render when at the root path.
  if (window.location.pathname.startsWith(__XR_ENV_BASE__)) {
    return __XR_ENV_BASE__;
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
