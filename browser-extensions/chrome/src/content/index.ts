import {
  PAGE_MESSAGE_SOURCE,
  EXTENSION_MESSAGE_SOURCE,
  type PageMessage,
  type ExtensionCommand,
} from "../shared/protocol";

function injectDetectorScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/content/detector.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

injectDetectorScript();

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const data = event.data as PageMessage;

  if (data?.source !== PAGE_MESSAGE_SOURCE) return;

  chrome.runtime
    .sendMessage({
      ...data,
      tabId: undefined,
    })
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((message: ExtensionCommand) => {
  if (message?.source !== EXTENSION_MESSAGE_SOURCE) return;

  if (message.type === "REQUEST_DETECTION") {
    injectDetectorScript();
    return;
  }

  window.postMessage(message, "*");
});
