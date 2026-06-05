import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { BrainProvider } from "./store/BrainStore";
import { SettingsProvider } from "./store/SettingsStore";
import { registerServiceWorker } from "./serviceWorker";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <BrainProvider>
          <App />
        </BrainProvider>
      </BrowserRouter>
    </SettingsProvider>
  </React.StrictMode>
);

registerServiceWorker();
