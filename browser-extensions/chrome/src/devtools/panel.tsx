import { render } from "solid-js/web";
import { StoreProvider } from "../panel/store";
import { App } from "../panel/App";
import "../panel/index.css";

const root = document.getElementById("app");

if (root) {
  render(
    () => (
      <StoreProvider>
        <App />
      </StoreProvider>
    ),
    root
  );
}
