// content.js
(() => {
  // Config: What signature are we looking for?
  // We use contains (*=) to match "icg.agency" even inside longer URLs
  const SIGNATURE_SELECTOR = 'a[href*="icg.agency"]';

  function checkForSignature() {
    const link = document.querySelector(SIGNATURE_SELECTOR);
    
    if (link) {
      // Send message to background to light up the icon
      // We wrap this in a try-catch to prevent errors if the extension context is invalidated (e.g. after an update)
      try {
        chrome.runtime.sendMessage({ action: "icg_site_detected" });
      } catch (e) {
        // Extension likely reloaded, silent fail is acceptable here
      }
    }
  }

  // Run immediately
  checkForSignature();
})();