import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { BrainProvider } from "./store/BrainStore";
import { registerServiceWorker } from "./serviceWorker";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrainProvider>
        <App />
      </BrainProvider>
    </BrowserRouter>
  </React.StrictMode>
);

registerServiceWorker();
