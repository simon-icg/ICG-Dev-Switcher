// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const devBtn = document.getElementById('devBtn');
  const customUrlInput = document.getElementById('customUrl');
  const saveBtn = document.getElementById('saveBtn');
  let currentCleanHost = "";

  // --- CONFIGURATION ---
  const PROJECT_MAPPINGS = {
     // Add manual exceptions here if needed
     // "avenuehouse.org": "stephenshouse"
  };

  // 1. Get Current Tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].url) {
      statusDiv.innerText = "Error: Cannot read tab URL.";
      return;
    }

    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    currentCleanHost = url.hostname.replace('www.', '');

    // 2. Check Storage
    try {
      chrome.storage.sync.get([currentCleanHost], (result) => {
        if (chrome.runtime.lastError) return;

        const savedUrl = result[currentCleanHost];

        if (savedUrl) {
          customUrlInput.value = savedUrl; 
          updateButton(savedUrl, "Custom Override Active");
        } else {
          runAutoDetect(currentTab, url, currentCleanHost);
        }
      });
    } catch (e) {
      runAutoDetect(currentTab, url, currentCleanHost);
    }
  });

  // 3. Save Button
  saveBtn.onclick = () => {
    const newUrl = customUrlInput.value.trim();
    if (!currentCleanHost) return;

    if (!newUrl) {
      chrome.storage.sync.remove(currentCleanHost, () => {
        statusDiv.innerText = "Override removed. Re-opening...";
        statusDiv.style.color = "orange";
        setTimeout(() => window.close(), 1000);
      });
      return;
    }

    let finalUrl = newUrl;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

    saveBtn.innerText = "Saving...";
    chrome.storage.sync.set({ [currentCleanHost]: finalUrl }, () => {
      saveBtn.innerText = "Save & Use";
      updateButton(finalUrl, "Custom URL Saved!");
    });
  };

  // --- HELPER FUNCTIONS ---

  function updateButton(targetUrl, statusMsg) {
    devBtn.classList.remove('hidden');
    devBtn.innerText = "Go to Dev Site";
    
    // Clone button to ensure no duplicate listeners
    const newBtn = devBtn.cloneNode(true);
    devBtn.parentNode.replaceChild(newBtn, devBtn);
    
    newBtn.onclick = () => { chrome.tabs.create({ url: targetUrl }); };
    
    statusDiv.innerText = statusMsg;
    statusDiv.style.color = "green";
  }

  function runAutoDetect(currentTab, url, cleanHost) {
    chrome.action.getBadgeText({ tabId: currentTab.id }, (text) => {
      statusDiv.innerText = "Searching for Dev URLs...";
      
      const projectName = cleanHost.split('.')[0];
      const potentialDevUrls = [];

      // Mappings
      if (PROJECT_MAPPINGS[cleanHost]) {
        let mappedValue = PROJECT_MAPPINGS[cleanHost];
        if (mappedValue.startsWith('http')) {
            potentialDevUrls.push(mappedValue);
        } else {
            potentialDevUrls.push(`${url.protocol}//${mappedValue}.dev.icgonline.co.uk${url.pathname}`);
        }
      }

      // Standard Patterns
      potentialDevUrls.push(`${url.protocol}//dev.${cleanHost}${url.pathname}`);
      potentialDevUrls.push(`${url.protocol}//${projectName}.dev.icgonline.co.uk${url.pathname}`);
      
      checkUrls(potentialDevUrls);
    });
  }

  async function checkUrls(urls) {
    let found = false;
    for (const testUrl of urls) {
      try {
        console.log(`Testing: ${testUrl}`); 
        
        // SWITCHED TO 'GET' to match browser behavior
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

        const response = await fetch(testUrl, { 
            method: 'GET', // Changed from HEAD
            cache: 'no-store',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`Response: ${response.status}`);
        
        // We accept almost ANY response code. 
        // If the server talks back (even with a 500 error or 401), the site exists.
        // We only fail on network timeout or DNS errors (catch block).
        if (response.ok || [401, 403, 500, 503].includes(response.status)) {
          found = true;
          updateButton(testUrl, "Dev site found!");
          break; 
        }
      } catch (error) {
        console.log(`Failed to reach ${testUrl}`, error);
      }
    }
    
    if (!found) {
      statusDiv.innerText = "No Dev site found. Set Custom URL below.";
      statusDiv.style.color = "#666";
    }
  }
});