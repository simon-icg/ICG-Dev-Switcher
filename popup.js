// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const devBtn = document.getElementById('devBtn');
  const customUrlInput = document.getElementById('customUrl');
  const saveBtn = document.getElementById('saveBtn');

  // We need to store the hostname globally so the Save button can access it
  let currentCleanHost = "";

  // 1. Get the current Tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].url) {
      statusDiv.innerText = "Error: Cannot read tab URL.";
      return;
    }

    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    
    // Create the clean host key (e.g. "londondesigneroutlet.com")
    currentCleanHost = url.hostname.replace('www.', '');

    // 2. Check Storage for existing override
    // We check for runtime errors to ensure 'storage' permission is active
    try {
      chrome.storage.sync.get([currentCleanHost], (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          statusDiv.innerText = "Storage Error. Try removing extension.";
          statusDiv.style.color = "red";
          return;
        }

        const savedUrl = result[currentCleanHost];

        if (savedUrl) {
          // A. Saved Custom URL found
          customUrlInput.value = savedUrl; 
          updateButton(savedUrl, "Custom Override Active");
        } else {
          // B. No custom URL, run auto-detect
          runAutoDetect(currentTab, url, currentCleanHost);
        }
      });
    } catch (e) {
      statusDiv.innerText = "Permission Error. Reload Extension.";
      statusDiv.style.color = "red";
    }
  });

  // 3. Save Button Logic
  saveBtn.onclick = () => {
    const newUrl = customUrlInput.value.trim();
    
    if (!currentCleanHost) {
      statusDiv.innerText = "Error: No hostname identified.";
      return;
    }

    // IF EMPTY: Delete the setting
    if (!newUrl) {
      chrome.storage.sync.remove(currentCleanHost, () => {
        statusDiv.innerText = "Override removed. Re-opening...";
        statusDiv.style.color = "orange";
        setTimeout(() => window.close(), 1000);
      });
      return;
    }

    // IF URL ENTERED: Save the setting
    let finalUrl = newUrl;
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }

    saveBtn.innerText = "Saving...";

    chrome.storage.sync.set({ [currentCleanHost]: finalUrl }, () => {
      saveBtn.innerText = "Save & Use";
      
      // INSTANT UPDATE:
      // This function call updates the button immediately without refresh
      updateButton(finalUrl, "Custom URL Saved!");
    });
  };

  // --- HELPER FUNCTIONS ---

  function updateButton(targetUrl, statusMsg) {
    // 1. Make button visible
    devBtn.classList.remove('hidden');
    devBtn.innerText = "Go to Dev Site";
    
    // 2. Overwrite the onclick handler directly
    devBtn.onclick = () => {
      chrome.tabs.create({ url: targetUrl });
    };

    // 3. Update status text
    statusDiv.innerText = statusMsg;
    statusDiv.style.color = "green";
  }

  function runAutoDetect(currentTab, url, cleanHost) {
    chrome.action.getBadgeText({ tabId: currentTab.id }, (text) => {
      statusDiv.innerText = "Searching for Dev URLs...";
      
      const projectName = cleanHost.split('.')[0];
      const potentialDevUrls = [
        `${url.protocol}//dev.${cleanHost}${url.pathname}`,
        `${url.protocol}//${projectName}.dev.icgonline.co.uk${url.pathname}`
      ];
      
      checkUrls(potentialDevUrls);
    });
  }

  async function checkUrls(urls) {
    let found = false;
    for (const testUrl of urls) {
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          found = true;
          updateButton(testUrl, "Dev site found!");
          break; 
        }
      } catch (error) {
        console.log(`Skipping ${testUrl}`);
      }
    }
    if (!found) {
      statusDiv.innerText = "No Dev site found. Set Custom URL below.";
      statusDiv.style.color = "#666";
    }
  }
});