// content.js

// 1. Search for the specific link in the footer/body
// We look for an anchor tag <a> where the href contains "icg.agency"
const icgLink = document.querySelector('a[href*="icg.agency"]');

if (icgLink) {
  // 2. If found, log it for debugging
  console.log("ICG Signature detected!");

  // 3. Send a message to the background script to highlight the icon
  chrome.runtime.sendMessage({ action: "icg_site_detected" });
}