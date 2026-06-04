// js/designer-image-size.js

function injectedSizerLogic() {
  if (window._icgSizerActive) return;
  window._icgSizerActive = true;

  // Force crosshair cursor
  const cursorStyle = document.createElement('style');
  cursorStyle.id = 'icg-sizer-cursor';
  cursorStyle.innerHTML = `* { cursor: crosshair !important; }`;
  document.head.appendChild(cursorStyle);

  let hoveredImg = null;

  // 1. Dynamic Hover Color (Purple = Direct, Orange = Indirect/Overlay)
  const handleMouseMove = (e) => {
    const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
    const imgUnderCursor = elementsUnderCursor.find(el => el.tagName === 'IMG');
    
    // Check if the actual element we are touching is the image, or an overlay
    const isDirectHover = e.target.tagName === 'IMG';
    const highlightColor = isDirectHover ? "#9c27b0" : "#ff9800"; // Purple vs Orange

    if (imgUnderCursor !== hoveredImg) {
      if (hoveredImg) {
        hoveredImg.style.outline = "";
        hoveredImg.style.outlineOffset = "";
      }
      if (imgUnderCursor) {
        hoveredImg = imgUnderCursor;
        hoveredImg.style.outline = `4px dashed ${highlightColor}`;
        hoveredImg.style.outlineOffset = "2px";
        hoveredImg.dataset.icgColor = highlightColor; // Save color state
      } else {
        hoveredImg = null;
      }
    } else if (imgUnderCursor) {
      // If we move from the overlay to the direct image (or vice versa), update the color live
      if (hoveredImg.dataset.icgColor !== highlightColor) {
        hoveredImg.style.outline = `4px dashed ${highlightColor}`;
        hoveredImg.dataset.icgColor = highlightColor;
      }
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    
    const cursor = document.getElementById('icg-sizer-cursor');
    if (cursor) cursor.remove();
    window._icgSizerActive = false;

    let targetImg = null;
    let isIndirect = true; // Assume indirect until proven otherwise

    const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
    const imgUnderCursor = elementsUnderCursor.find(el => el.tagName === 'IMG');

    // Determine the target and whether it was a direct click
    if (e.target.tagName === 'IMG') {
      targetImg = e.target;
      isIndirect = false; // Direct!
    } else if (imgUnderCursor) {
      targetImg = imgUnderCursor;
    } else if (hoveredImg) {
      targetImg = hoveredImg;
    } else if (e.target.querySelector('img')) {
      targetImg = e.target.querySelector('img'); 
    } else if (e.target.closest('picture')) {
      targetImg = e.target.closest('picture').querySelector('img'); 
    }

    if (targetImg) {
      if (hoveredImg) hoveredImg.style.outline = "";
      targetImg.style.outline = "";
      
      const finalColor = isIndirect ? "#ff9800" : "#9c27b0";
      runAutomatedScan(targetImg, finalColor);
    } else {
      console.warn("ICG Tools: No image found under your click.");
    }
  };

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);

  // --- AUTOMATED SCANNER LOGIC ---
  async function runAutomatedScan(imgElement, highlightColor) {
    if (window._icgCurrentObserver) window._icgCurrentObserver.disconnect();
    if (window._icgSizerUI) window._icgSizerUI.remove();

    const ui = document.createElement('div');
    window._icgSizerUI = ui;
    ui.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background: #2a2a2a; color: #fff;
      padding: 15px 20px; border-radius: 8px; font-family: system-ui, sans-serif;
      font-size: 14px; z-index: 2147483647; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border-left: 5px solid ${highlightColor}; min-width: 280px; text-align: left;
    `;
    ui.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
                      <span style="animation: pulse 1s infinite;">🤖</span> 
                      <strong>Auto-Scanning Breakpoints...</strong>
                    </div>`;
    document.body.appendChild(ui);

    let maxW = Math.round(imgElement.getBoundingClientRect().width);
    let maxH = Math.round(imgElement.getBoundingClientRect().height);
    let scanSuccess = false;

    const allImages = Array.from(document.querySelectorAll('img'));
    const imgIndex = allImages.indexOf(imgElement);

    try {
      await new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed; bottom:0; right:0; width:100vw; height:100vh; opacity:0; pointer-events:none; z-index:-9999;';
        iframe.src = window.location.href;
        
        const timeout = setTimeout(() => {
          iframe.remove();
          reject('Iframe timeout');
        }, 5000);

        iframe.onload = async () => {
          clearTimeout(timeout);
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const targetInIframe = iframeDoc.querySelectorAll('img')[imgIndex];
            
            if (!targetInIframe) throw new Error('Image sync failed via Index');
            
            targetInIframe.scrollIntoView();

            const breakpoints = [320, 480, 768, 1024, 1440, 1920];
            
            for (let bp of breakpoints) {
              iframe.style.width = bp + 'px';
              await new Promise(r => setTimeout(r, 100)); 
              
              const rect = targetInIframe.getBoundingClientRect();
              if (rect.width > maxW) maxW = Math.round(rect.width);
              if (rect.height > maxH) maxH = Math.round(rect.height);
            }
            
            scanSuccess = true;
            iframe.remove();
            resolve();
          } catch (err) {
            iframe.remove();
            reject(err);
          }
        };
        
        document.body.appendChild(iframe);
      });
    } catch (error) {
      console.warn('ICG Tools: Auto-scan blocked by site security, falling back to manual observer.', error);
    }

    // Grab the actual intrinsic size of the loaded image file
    const naturalW = imgElement.naturalWidth;
    const naturalH = imgElement.naturalHeight;

    renderFinalUI(ui, imgElement, maxW, maxH, scanSuccess, highlightColor, naturalW, naturalH);
  }

  function renderFinalUI(ui, imgElement, maxW, maxH, autoScanned, highlightColor, naturalW, naturalH) {
    const objectFit = window.getComputedStyle(imgElement).objectFit;
    let fitWarning = objectFit === 'cover' 
      ? `<div style="color: #ffb74d; font-size: 12px; margin-top: 8px;">⚠️ Uses 'object-fit: cover' (Image crops automatically)</div>` 
      : '';

    const scanBadge = autoScanned 
      ? `<span style="background:#4caf50; color:#fff; font-size:10px; padding:2px 6px; border-radius:10px; margin-left:8px;">Auto-Scanned</span>`
      : `<span style="background:#f44336; color:#fff; font-size:10px; padding:2px 6px; border-radius:10px; margin-left:8px;">Manual Drag Required</span>`;

    const indirectNotice = highlightColor === "#ff9800" 
      ? `<div style="font-size:10px; color:#ff9800; margin-bottom: 5px;">🔍 Found via X-Ray (Behind overlay)</div>` 
      : ``;

    ui.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 8px;">
        <strong style="color: ${highlightColor}; font-size: 14px; margin:0;">📏 Asset Sizer ${scanBadge}</strong>
        <button id="icg-close-sizer" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:16px; padding:0; margin:0;">✖</button>
      </div>
      ${indirectNotice}
      
      <div style="margin-bottom: 6px; font-size: 13px;">
        <span style="color: #aaa;">Current Source File:</span> <strong style="color: #64b5f6;">${naturalW}px × ${naturalH}px</strong>
      </div>

      <div style="background: #1e1e1e; padding: 12px; border-radius: 6px; margin-top: 10px; margin-bottom: 10px; border: 1px solid ${highlightColor};">
        <div style="font-size: 11px; color: #aaa; margin-bottom: 4px; letter-spacing: 0.5px;">Max Rendered Size:</div>
        <div style="font-size: 20px; font-weight: bold; color: #fff; margin:0;" id="icg-export-txt">
          ${maxW}px × ${maxH}px
        </div>
      </div>
      <div style="margin-bottom: 10px; font-size: 13px;">
        <span style="color: #aaa;">Retina export (@2x):</span> <strong style="color: #4caf50;" id="icg-max-size-txt">${maxW * 2}px × ${maxH * 2}px</strong>
      </div>
      ${fitWarning}
      <div style="font-size: 11px; color: #888; margin-top: 12px; line-height: 1.4;">
        ${autoScanned ? '✅ Breakpoints checked: Mobile through 1920px.' : '👉 Drag your browser window from mobile to desktop to calculate sizes.'}
      </div>
    `;

    document.getElementById('icg-close-sizer').onclick = () => {
      if (window._icgCurrentObserver) window._icgCurrentObserver.disconnect();
      ui.remove();
      imgElement.style.outline = ""; 
    };

    window._icgCurrentObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const currentW = Math.round(entry.contentRect.width);
        const currentH = Math.round(entry.contentRect.height);
        
        if (currentW > maxW || currentH > maxH) {
          if (currentW > maxW) maxW = currentW;
          if (currentH > maxH) maxH = currentH;
          
          document.getElementById('icg-max-size-txt').innerText = `${maxW}px × ${maxH}px`;
          document.getElementById('icg-export-txt').innerText = `${maxW * 2}px × ${maxH * 2}px`;
        }
      }
    });
    
    imgElement.style.outline = `4px solid ${highlightColor}`;
    imgElement.style.outlineOffset = "2px";
    window._icgCurrentObserver.observe(imgElement);
  }
}

export class DesignerImageSize {
  static async startInteractiveSizer() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return false;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectedSizerLogic 
      });
      return true;
    } catch (error) {
      console.error("Asset Sizer injection failed:", error);
      return false;
    }
  }
}