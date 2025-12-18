// popup.js

/**
 * CONFIGURATION: KNOWN SITE MAPPINGS
 */
const PROJECT_MAPPINGS = {
  "avenuehouse.org": "stephenshouse",
};

document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements
  const ui = {
    status: document.getElementById('status'),
    btn: document.getElementById('devBtn'),
    input: document.getElementById('customUrl'),
    saveBtn: document.getElementById('saveBtn'),
    toggleBtn: document.getElementById('toggleBtn'),
    container: document.getElementById('customContainer'),
    toolsBtn: document.getElementById('openToolsBtn')
  };

  let currentCleanHost = "";

  // Toggle Logic
  ui.toggleBtn.onclick = () => {
    ui.container.classList.remove('hidden');
    ui.toggleBtn.classList.add('hidden');
  };

  ui.toolsBtn.onclick = async () => {
    // Get the current window
    const windowId = (await chrome.windows.getCurrent()).id;
    
    // Open the side panel for this window
    // Note: This requires the "sidePanel" permission
    await chrome.sidePanel.open({ windowId });
    
    // Optional: Close the popup so the user sees the side panel immediately
    window.close();
  };

  // 1. Get Current Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url) {
    setStatus(ui, "Error: Cannot read tab.", "red");
    return;
  }

  const url = new URL(tab.url);
  currentCleanHost = url.hostname.replace('www.', '');

  console.group("ICG Dev Switcher Debug");
  console.log("Current Host:", currentCleanHost);

  // 2. Check Storage for Overrides
  try {
    const result = await chrome.storage.sync.get([currentCleanHost]);
    const savedUrl = result[currentCleanHost];

    if (savedUrl) {
      console.log("Override found in storage:", savedUrl);
      
      // If override exists, auto-open the panel
      ui.container.classList.remove('hidden');
      ui.toggleBtn.classList.add('hidden');
      
      ui.input.value = savedUrl;
      showButton(ui, savedUrl, "Custom Override Active");
    } else {
      console.log("No override. Starting auto-detect...");
      await runAutoDetect(tab, url, currentCleanHost, ui);
    }
  } catch (error) {
    console.error("Initialization Error:", error);
    await runAutoDetect(tab, url, currentCleanHost, ui);
  }
  
  console.groupEnd();

  // 3. Save Button Listener
  ui.saveBtn.onclick = () => handleSave(ui, currentCleanHost);
});

// --- CORE FUNCTIONS ---

async function runAutoDetect(tab, url, cleanHost, ui) {
  setStatus(ui, 'Checking Dev URLs <div class="spinner"></div>', "#333", true);

  // Generate Potential URLs
  const potentialUrls = [];
  const projectName = cleanHost.split('.')[0]; 

  if (PROJECT_MAPPINGS[cleanHost]) {
    const map = PROJECT_MAPPINGS[cleanHost];
    if (map.startsWith('http')) {
      potentialUrls.push(map);
    } else {
      potentialUrls.push(`${url.protocol}//${map}.dev.icgonline.co.uk${url.pathname}`);
    }
  }

  potentialUrls.push(`${url.protocol}//dev.${cleanHost}${url.pathname}`);
  potentialUrls.push(`${url.protocol}//${projectName}.dev.icgonline.co.uk${url.pathname}`);

  console.log("Testing URLs:", potentialUrls);

  const validUrl = await findFirstValidUrl(potentialUrls);

  if (validUrl) {
    showButton(ui, validUrl, "Dev site found!");
  } else {
    // If we fail to find a site, update message telling them to use the link below
    setStatus(ui, "No Dev site detected.<br>Click 'Set Custom URL' below.", "#666", true);
  }
}

async function findFirstValidUrl(urls) {
  for (const testUrl of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      console.log(`Pinging: ${testUrl}`);
      
      const response = await fetch(testUrl, { 
        method: 'GET', 
        cache: 'no-store', 
        signal: controller.signal 
      });

      clearTimeout(timeoutId);

      if (response.ok || [401, 403, 500, 503].includes(response.status)) {
        console.log(`Success! Status ${response.status} at ${testUrl}`);
        return testUrl;
      }
    } catch (err) {
      console.log(`Failed: ${testUrl}`, err.name);
    }
  }
  return null;
}

function handleSave(ui, hostKey) {
  const newUrl = ui.input.value.trim();

  if (!hostKey) return;

  if (!newUrl) {
    // Delete
    chrome.storage.sync.remove(hostKey, () => {
      setStatus(ui, "Override removed. Refreshing...", "orange");
      setTimeout(() => location.reload(), 800);
    });
    return;
  }

  // Formatting
  let finalUrl = newUrl;
  if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

  ui.saveBtn.innerText = "Saving...";
  
  chrome.storage.sync.set({ [hostKey]: finalUrl }, () => {
    ui.saveBtn.innerText = "Saved!";
    setTimeout(() => ui.saveBtn.innerText = "Save Override", 1500);
    showButton(ui, finalUrl, "Custom URL Saved!");
  });
}

// --- UI HELPERS ---

function setStatus(ui, msg, color, isHTML = false) {
  if (isHTML) ui.status.innerHTML = msg;
  else ui.status.innerText = msg;
  ui.status.style.color = color || "#333";
}

function showButton(ui, url, msg) {
  ui.btn.classList.remove('hidden');
  ui.btn.innerText = `Go to ${new URL(url).hostname}`;
  ui.btn.title = url;
  
  const newBtn = ui.btn.cloneNode(true);
  ui.btn.parentNode.replaceChild(newBtn, ui.btn);
  ui.btn = newBtn; 
  
  ui.btn.onclick = () => chrome.tabs.create({ url: url });
  
  setStatus(ui, msg, "#2ecc71"); 
}