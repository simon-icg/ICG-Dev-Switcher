// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "icg_site_detected") {
    // Set a badge text to alert the user
    chrome.action.setBadgeText({ 
      text: "ICG", 
      tabId: sender.tab.id 
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: "#00FF00", // Green background
      tabId: sender.tab.id 
    });
  }
});