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

  // --- NEW LOGIC: Image Highlighting ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlight_images") {
      runLiveImageAudit();
    }
  });

  function runLiveImageAudit() {
    const images = document.querySelectorAll('img');
    let firstErrorFound = false;
    let countRed = 0;
    let countYellow = 0;

    // Reset styles first
    images.forEach(img => {
      img.style.outline = '';
      img.style.boxShadow = '';
      img.removeAttribute('title');
    });

    images.forEach(img => {
      // Ignore invisible tracking pixels (1x1)
      if (img.width <= 1 || img.height <= 1) return;

      const alt = img.getAttribute('alt');
      const width = img.getAttribute('width');
      const height = img.getAttribute('height');
      
      // 1. CRITICAL: Missing ALT Attribute (Red)
      if (alt === null) {
        // Use setProperty to add !important
        img.style.setProperty('outline', '5px solid #e74c3c', 'important');
        img.style.setProperty('box-shadow', '0 0 15px rgba(231, 76, 60, 0.6)', 'important');
        
        img.setAttribute('title', '❌ SEO CRITICAL: Missing ALT Text');
        countRed++;
        
        if (!firstErrorFound) {
          img.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorFound = true;
        }
      } 
      // 2. WARNING: Missing Dimensions (Yellow)
      else if (!width || !height) {
        // Use setProperty to add !important
        img.style.setProperty('outline', '5px solid #f1c40f', 'important');
        
        img.setAttribute('title', '⚠️ PERFORMANCE: Missing Width/Height Attributes');
        countYellow++;
      }
    });

    console.log(`ICG Tools: Highlighted ${countRed} missing ALTs and ${countYellow} missing dimensions.`);
  }
})();