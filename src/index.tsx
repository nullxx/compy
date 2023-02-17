import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import "primereact/resources/themes/lara-light-indigo/theme.css"; //theme
import "primereact/resources/primereact.min.css"; //core
import "primeicons/primeicons.css"; //icons

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
