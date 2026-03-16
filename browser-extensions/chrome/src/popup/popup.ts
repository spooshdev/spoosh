async function init() {
  const statusEl = document.getElementById("status");
  const statusTextEl = document.getElementById("status-text");

  if (!statusEl || !statusTextEl) return;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      statusTextEl.textContent = "No active tab";
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "GET_DETECTION_STATUS",
      tabId: tab.id,
    });

    if (response?.detected) {
      statusEl.classList.remove("not-detected");
      statusEl.classList.add("detected");
      statusTextEl.textContent = "Spoosh detected on this page";
    } else {
      statusTextEl.textContent = "Spoosh not detected";
    }
  } catch {
    statusTextEl.textContent = "Unable to check status";
  }
}

init();
