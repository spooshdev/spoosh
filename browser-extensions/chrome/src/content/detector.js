(function detectSpoosh() {
  const SOURCE = "spoosh-devtools-page";

  function checkForSpoosh() {
    const hasHook = !!window.__SPOOSH_DEVTOOLS_HOOK__;

    if (hasHook) {
      window.postMessage(
        {
          source: SOURCE,
          type: "SPOOSH_DETECTED",
          payload: {
            version: window.__SPOOSH_DEVTOOLS_HOOK__.version,
          },
        },
        "*"
      );
      return true;
    }

    return false;
  }

  if (!checkForSpoosh()) {
    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      attempts++;

      if (checkForSpoosh() || attempts >= maxAttempts) {
        clearInterval(interval);

        if (attempts >= maxAttempts && !window.__SPOOSH_DEVTOOLS_HOOK__) {
          window.postMessage(
            {
              source: SOURCE,
              type: "SPOOSH_NOT_DETECTED",
            },
            "*"
          );
        }
      }
    }, 100);
  }
})();
