// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "icg_site_detected" && sender.tab) {
    // Enable the badge
    chrome.action.setBadgeText({ text: "✓", tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#2ecc71", tabId: sender.tab.id }); // Brand Green
  }
});