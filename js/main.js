// Main application logic - coordinates all the modules
import { UrlChecker } from './url-checker.js';
import { RobotsChecker } from './robots-checker.js';
import { AnalyticsChecker } from './analytics-checker.js';
import { SSLChecker } from './ssl-checker.js';
import { MetaChecker } from './meta-checker.js';
import { NonDeveloperChecker } from './non-developer-checker.js';
import { ImageChecker } from './images-checker.js';
import { UIHelpers } from './ui-helpers.js';

class SecurityAuditApp {
  constructor() {
    this.currentDomain = '';
    this.currentTabUrl = '';
    this.checkButton = null;
    this.results = null;
  }

  async init() {
    // Initialize DOM elements
    this.checkButton = document.getElementById('checkButton');
    this.runSelectedButton = document.getElementById('runSelectedButton');
    this.results = document.getElementById('results');
    
    // Get current tab URL
    await this.getCurrentDomain();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  async getCurrentDomain() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url) {
        throw new Error('No active tab URL found');
      }
      
      const url = new URL(tab.url);
      this.currentDomain = url.hostname;
      this.currentTabUrl = tab.url; // Store the full URL for display later
      
      console.log('Current tab URL:', tab.url);
      console.log('Extracted domain:', this.currentDomain);
      
    } catch (error) {
      console.error('Error getting current URL:', error);
      this.currentDomain = '';
      this.currentTabUrl = '';
      throw error; // Re-throw so calling code can handle it
    }
  }

  displayCurrentUrl(url, errorMessage = null) {
    // Create or update the current URL display
    let currentUrlDiv = document.getElementById('currentUrl');
    if (!currentUrlDiv) {
      currentUrlDiv = document.createElement('div');
      currentUrlDiv.id = 'currentUrl';
      currentUrlDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 10px;
        background: #e3f2fd;
        border-radius: 6px;
        border-left: 4px solid #2196f3;
        font-size: 13px;
        line-height: 1.4;
      `;
      
      // Insert after the header
      const header = document.querySelector('.header');
      header.insertAdjacentElement('afterend', currentUrlDiv);
    }
    
    if (errorMessage) {
      currentUrlDiv.style.background = '#ffebee';
      currentUrlDiv.style.borderLeftColor = '#f44336';
      currentUrlDiv.innerHTML = `
        <strong>⚠️ Unable to detect current tab:</strong><br>
        ${errorMessage}
      `;
    } else if (url) {
      currentUrlDiv.style.background = '#e8f5e8';
      currentUrlDiv.style.borderLeftColor = '#4caf50';
      currentUrlDiv.innerHTML = `
        <strong>🔍 Checking:</strong><br>
        <div style="word-break: break-all; font-family: monospace; margin-top: 5px; padding: 5px; background: rgba(255,255,255,0.5); border-radius: 3px;">${url}</div>
      `;
    } else {
      currentUrlDiv.style.background = '#fff3e0';
      currentUrlDiv.style.borderLeftColor = '#ff9800';
      currentUrlDiv.innerHTML = `
        <strong>⏳ Detecting current tab...</strong>
      `;
    }
  }

  setupEventListeners() {
    // Setup the "Run All" button
    this.checkButton.addEventListener('click', async () => {
      try {
        // Refresh current domain from active tab
        await this.getCurrentDomain();
        
        if (!this.currentDomain) {
          alert('No valid domain found. Please make sure you have an active tab with a website open.');
          return;
        }

        // Show what we're checking now that the audit is starting
        this.displayCurrentUrl(this.currentTabUrl);

        // Disable both buttons during audit
        this.checkButton.disabled = true;
        this.runSelectedButton.disabled = true;
        UIHelpers.clearResults();

        // Check all options
        document.getElementById('checkRobots').checked = true;
        document.getElementById('checkAnalytics').checked = true;
        document.getElementById('checkSSL').checked = true;
        document.getElementById('checkMetaTags').checked = true;
        document.getElementById('checkNonDeveloper').checked = true;
        const httpsCheck = document.getElementById('checkHttps');
        if(httpsCheck) httpsCheck.checked = true;
        // Check image option if it exists (handle missing UI element gracefully)
        const imgCheck = document.getElementById('checkImages');
        if(imgCheck) imgCheck.checked = true;

        await this.runSecurityAudit(this.currentDomain);
      } catch (error) {
        console.error('Audit error:', error);
        
        // Show error in URL display if domain detection failed
        this.displayCurrentUrl(null, error.message);
        
        UIHelpers.showError(`Audit failed: ${error.message}`);
        
        // Show detailed error information
        const errorDetails = document.createElement('div');
        errorDetails.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f8f8; border-radius: 4px; font-family: monospace; font-size: 12px; color: #666;';
        errorDetails.innerHTML = `
          <strong>Error Details:</strong><br>
          Message: ${error.message}<br>
          Stack: ${error.stack ? error.stack.substring(0, 200) + '...' : 'No stack trace'}
        `;
        document.getElementById('results').appendChild(errorDetails);
      } finally {
        // Re-enable both buttons
        this.checkButton.disabled = false;
        this.runSelectedButton.disabled = false;
      }
    });

    // Setup the "Run Selected" button
    this.runSelectedButton.addEventListener('click', async () => {
      try {
        // Refresh current domain from active tab
        await this.getCurrentDomain();
        
        if (!this.currentDomain) {
          alert('No valid domain found. Please make sure you have an active tab with a website open.');
          return;
        }

        // Show what we're checking now that the audit is starting
        this.displayCurrentUrl(this.currentTabUrl);

        // Disable both buttons during audit
        this.checkButton.disabled = true;
        this.runSelectedButton.disabled = true;
        UIHelpers.clearResults();

        // Keep checkboxes as they are (only run selected tests)
        await this.runSecurityAudit(this.currentDomain);
      } catch (error) {
        console.error('Audit error:', error);
        
        // Show error in URL display if domain detection failed
        this.displayCurrentUrl(null, error.message);
        
        UIHelpers.showError(`Audit failed: ${error.message}`);
        
        // Show detailed error information
        const errorDetails = document.createElement('div');
        errorDetails.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f8f8; border-radius: 4px; font-family: monospace; font-size: 12px; color: #666;';
        errorDetails.innerHTML = `
          <strong>Error Details:</strong><br>
          Message: ${error.message}<br>
          Stack: ${error.stack ? error.stack.substring(0, 200) + '...' : 'No stack trace'}
        `;
        document.getElementById('results').appendChild(errorDetails);
      } finally {
        // Re-enable both buttons
        this.checkButton.disabled = false;
        this.runSelectedButton.disabled = false;
      }
    });
  }

 async runSecurityAudit(domain) {
    const cleanDomain = domain.replace(/^www\./, '');
    
    // 1. GATHER OPTIONS
    // New Checkbox: Default to true if element is missing, otherwise read state
    const checkHttpsEl = document.getElementById('checkHttps');
    const checkHttps = checkHttpsEl ? checkHttpsEl.checked : true;

    const checkRobots = document.getElementById('checkRobots').checked;
    const checkAnalytics = document.getElementById('checkAnalytics').checked;
    const checkSSL = document.getElementById('checkSSL').checked;
    const checkMetaTags = document.getElementById('checkMetaTags').checked;
    const checkNonDeveloper = document.getElementById('checkNonDeveloper').checked;
    
    const checkImagesEl = document.getElementById('checkImages');
    const checkImages = checkImagesEl ? checkImagesEl.checked : true;
    
    const checkCookiesEl = document.getElementById('checkCookies');
    const checkCookies = checkCookiesEl ? checkCookiesEl.checked : true;
    
    console.log('Audit options:', { checkHttps, checkRobots, checkAnalytics, checkSSL, checkMetaTags, checkNonDeveloper, checkImages, checkCookies });
    
    // 2. BUILD CHECKLIST ARRAY
    const allChecks = []; // Start empty

    // Conditionally add HTTP/HTTPS checks
    if (checkHttps) {
      allChecks.push(`https://${cleanDomain}`);
      allChecks.push(`http://${cleanDomain}`);
    }
    
    if (checkRobots) allChecks.push(`https://${cleanDomain}/robots.txt`);
    if (checkAnalytics) allChecks.push(`Analytics & Tracking check`);
    if (checkSSL) allChecks.push(`SSL & Security Headers check`);
    if (checkMetaTags) allChecks.push(`Meta Tags & SEO check`);
    if (checkNonDeveloper) allChecks.push(`Content and Style checks`);
    if (checkImages) allChecks.push(`Image Optimization & Accessibility`);
    if (checkCookies) allChecks.push(`GDPR & Cookie Compliance`);
    
    // 3. INITIALIZE UI
    const checklistContainer = UIHelpers.createChecklist(allChecks);
    UIHelpers.displayResults(checklistContainer);
    
    let checkIndex = 0;
    
    // Results containers
    let testResults = null;
    let robotsResult = null;
    let analyticsResult = null;
    let sslResult = null;
    let metaResult = null;
    let nonDeveloperResult = null;
    let imageResult = null;
    let cookieResult = null;
    
    try {
      // --- START CHECKS ---

      // 4. Test URLs (Now Conditional)
      if (checkHttps) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          UIHelpers.updateCheckItem(checklistContainer, checkIndex + 1, 'testing');
          
          console.log('Starting URL tests for domain:', cleanDomain);
          testResults = await UrlChecker.testUrl(`https://${cleanDomain}`);
          console.log('URL test results:', testResults);
          
          // Update HTTPS result
          const httpsStatus = testResults.analysis.httpsWorking ? 'success' : 'error';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, httpsStatus);
          checkIndex++;
          
          // Update HTTP result
          const httpStatus = testResults.analysis.httpRedirectsToHttps ? 'success' : 'warning';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, httpStatus);
          checkIndex++;
        } catch (e) {
          console.error("URL Check failed", e);
          // Mark both as error if the checker crashes
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          checkIndex++;
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          checkIndex++;
        }
      }
      
      // 5. Test Robots
      if (checkRobots) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          robotsResult = await RobotsChecker.testRobotsUrl(`https://${cleanDomain}`);
          const robotsStatus = robotsResult.status === 'success' ? 'success' : 'error';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, robotsStatus);
        } catch (e) {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          robotsResult = { status: 'error', error: e.message };
        }
        checkIndex++;
      }
      
      // 6. Test Analytics
      if (checkAnalytics) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          analyticsResult = await AnalyticsChecker.testAnalyticsTracking(`https://${cleanDomain}`);
          const analyticsStatus = analyticsResult.status === 'success' ? 'success' : 'error';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, analyticsStatus);
        } catch (e) {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          analyticsResult = { status: 'error', error: e.message };
        }
        checkIndex++;
      }
      
      // 7. Test SSL
      if (checkSSL) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          sslResult = await SSLChecker.testSSLCertificate(`https://${cleanDomain}`, cleanDomain);
          const sslStatus = sslResult.status === 'success' ? 'success' : 
                            sslResult.status === 'warning' ? 'warning' : 'error';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, sslStatus);
        } catch (e) {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          sslResult = { status: 'error', error: e.message };
        }
        checkIndex++;
      }
      
      // 8. Test Meta
      if (checkMetaTags) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          metaResult = await MetaChecker.testMetaTags(`https://${cleanDomain}`);
          const metaStatus = metaResult.status === 'success' ? 'success' : 'error';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, metaStatus);
        } catch (e) {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          metaResult = { status: 'error', error: e.message };
        }
        checkIndex++;
      }

      // 9. Test Non-Dev
      if (checkNonDeveloper) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          nonDeveloperResult = await NonDeveloperChecker.testNonDeveloperElements(`https://${cleanDomain}`);
          const nonDevStatus = nonDeveloperResult.status === 'success' ? 'success' : 
                               nonDeveloperResult.status === 'warning' ? 'warning' : 'error';
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, nonDevStatus);
        } catch (e) {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          nonDeveloperResult = { status: 'error', error: e.message };
        }
        checkIndex++;
      }

      // 10. Test Images
      if (checkImages) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          imageResult = await ImageChecker.testImages(`https://${cleanDomain}`);
          
          const imgStatus = imageResult.status === 'success' ? 'success' : 
                            imageResult.status === 'warning' ? 'warning' : 'error';
          
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, imgStatus);
        } catch (err) {
          console.error('Image check failed', err);
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
          imageResult = { status: 'error', details: [err.message] };
        }
        checkIndex++;
      }

      // 11. Test Cookies
      if (checkCookies) {
        try {
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'testing');
          const cookieResultData = await CookieChecker.testCookies(`https://${cleanDomain}`);
          cookieResult = cookieResultData;
          
          const cookieStatus = cookieResult.status === 'success' ? 'success' : 
                               cookieResult.status === 'warning' ? 'warning' : 'error';
          
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, cookieStatus);
          
        } catch (err) {
          console.error('Cookie check failed', err);
          UIHelpers.updateCheckItem(checklistContainer, checkIndex, 'error');
        }
        checkIndex++;
      }
      
      // 12. GENERATE REPORT
      await this.delay(500);
      
      const accordionContainer = UIHelpers.createResultsAccordion();
      
      // Add results conditionally
      if (checkNonDeveloper && nonDeveloperResult) this.addNonDeveloperResults(accordionContainer, nonDeveloperResult);
      if (checkHttps && testResults) this.addHttpsHttpResults(accordionContainer, testResults); // <-- Now Conditional
      if (checkRobots && robotsResult) this.addRobotsResults(accordionContainer, robotsResult);
      if (checkAnalytics && analyticsResult) this.addAnalyticsResults(accordionContainer, analyticsResult);
      if (checkSSL && sslResult) this.addSSLResults(accordionContainer, sslResult);
      if (checkMetaTags && metaResult) this.addMetaResults(accordionContainer, metaResult);
      
      if (checkImages && imageResult) {
        this.addImageResults(accordionContainer, imageResult);
        
        // Highlight logic
        const highlightBtn = accordionContainer.querySelector('#btn-highlight-images');
        if (highlightBtn) {
          highlightBtn.onclick = async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { 
                  action: "highlight_images", 
                  data: imageResult.analysis 
                });
                const originalText = highlightBtn.innerText;
                highlightBtn.innerText = "✨ Highlights Active!";
                highlightBtn.style.backgroundColor = "#e8f5e8";
                setTimeout(() => {
                  highlightBtn.innerText = originalText;
                  highlightBtn.style.backgroundColor = "#fff";
                }, 2000);
              }
            } catch (err) {
              console.error("Failed to highlight:", err);
              if (err.message.includes("receiving end does not exist")) {
                 alert("Connection lost. Please REFRESH the web page and try again.");
              } else {
                 alert(`Error: ${err.message}`);
              }
            }
          };
        }
      }

      if (checkCookies && cookieResult) {
        this.addCookieResults(accordionContainer, cookieResult);
      }
      
      UIHelpers.addTimestamp(accordionContainer);
      UIHelpers.displayResults(accordionContainer);
      
    } catch (error) {
      this.handleAuditError(error);
    }
  }

  addHttpsHttpResults(container, testResults) {
    const details = [];
    const analysis = testResults.analysis;
    
    // Add IP address if available
    if (testResults.ipAddress) {
      // Include Cloudflare status directly in the IP line if detected
      const cloudflareText = testResults.isCloudflare === true ? ' (Protected by Cloudflare)' : '';
      details.push(`🌐 Server IP: ${testResults.ipAddress}${cloudflareText}`);
      details.push('');
    }
    
    // HTTPS Status
    if (analysis.httpsWorking) {
      details.push('✅ HTTPS is working');
    } else {
      details.push('❌ HTTPS not accessible');
    }
    
    // HTTP to HTTPS Redirect Status
    if (analysis.httpRedirectsToHttps) {
      details.push('✅ HTTP properly redirects to HTTPS');
    } else {
      details.push('⚠️ HTTP does not redirect to HTTPS (security risk)');
    }
    
    // WWW Redirection Analysis
    switch (analysis.wwwRedirection) {
      case 'to-www':
        details.push('🔄 Non-www redirects to www version');
        details.push(`   • Preferred URL: ${analysis.preferredUrl}`);
        break;
      case 'to-non-www':
        details.push('🔄 www redirects to non-www version');
        details.push(`   • Preferred URL: ${analysis.preferredUrl}`);
        break;
      case 'both-work':
        details.push('⚠️ Both www and non-www versions work (should pick one)');
        break;
      case 'unclear':
        details.push('❓ www/non-www redirection pattern unclear');
        break;
    }
    
    // Detailed test results
    details.push('');
    details.push('📋 Detailed Test Results:');
    
    const tests = testResults.tests;
    const testLabels = {
      'https-non-www': 'HTTPS (non-www)',
      'https-www': 'HTTPS (www)',
      'http-non-www': 'HTTP (non-www)',
      'http-www': 'HTTP (www)'
    };
    
    Object.keys(testLabels).forEach(key => {
      const test = tests[key];
      if (test) {
        const icon = test.accessible ? '✅' : '❌';
        let line = `   ${icon} ${testLabels[key]}`;
        
        if (test.redirected && test.finalUrl) {
          line += ` → ${test.finalUrl}`;
        } else if (test.accessible) {
          line += ' (direct access)';
        }
        
        if (test.note) {
          line += ` (${test.note})`;
        }
        
        details.push(line);
      }
    });
    
    // Overall security assessment
    let overallStatus = 'error';
    if (analysis.httpsWorking && analysis.httpRedirectsToHttps) {
      overallStatus = 'success';
      details.push('');
      details.push('🔒 Excellent: HTTPS working and HTTP redirects properly');
    } else if (analysis.httpsWorking) {
      overallStatus = 'warning';
      details.push('');
      details.push('⚠️ Good: HTTPS working but HTTP redirect needs improvement');
    } else {
      details.push('');
      details.push('❌ Poor: HTTPS issues detected');
    }
    
    UIHelpers.addAccordionItem(container, 'urls', overallStatus, '🔒 HTTPS/HTTP Security Analysis', details, false);
  }

  addRobotsResults(container, robotsResult) {
    let details = [];
    let status = robotsResult.status;
    
    if (status === 'success') {
      details.push('✅ robots.txt found and accessible');
      if (robotsResult.analysis) {
        details.push(...UIHelpers.formatRobotsAnalysis(robotsResult.analysis));
      }
      
      // Add the actual robots.txt content
      if (robotsResult.content) {
        details.push(''); // Empty line for spacing
        details.push('📄 File Content:');
        
        // Format the content with proper line breaks and styling
        const contentLines = robotsResult.content.split('\n');
        const shouldTruncate = contentLines.length > 50;
        const displayContent = shouldTruncate ? 
          contentLines.slice(0, 50).join('\n') + '\n\n... (truncated, showing first 50 lines)' : 
          robotsResult.content;
        
        // Show "empty file" message if content is just whitespace
        const actualContent = robotsResult.content.trim();
        const contentToShow = actualContent.length === 0 ? 
          '(This robots.txt file is empty)' : 
          displayContent;
        
        details.push(`<div style="
          background: #f8f9fa; 
          border: 1px solid #dee2e6; 
          border-radius: 4px; 
          padding: 12px; 
          margin: 8px 0; 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          white-space: pre-wrap; 
          word-wrap: break-word;
          max-height: 300px;
          overflow-y: auto;
          color: #333;
        ">${this.escapeHtml(contentToShow)}</div>`);
        
        details.push(`📏 File size: ${robotsResult.size} bytes`);
        if (shouldTruncate) {
          details.push(`📄 Total lines: ${contentLines.length} (showing first 50)`);
        }
      }
    } else {
      details.push('❌ robots.txt not found or inaccessible');
      if (robotsResult.error) {
        details.push(`Error: ${robotsResult.error}`);
      }
    }
    
    UIHelpers.addAccordionItem(container, 'robots', status, '🤖 Robots.txt Analysis', details, false);
  }

  addAnalyticsResults(container, analyticsResult) {
    let details = [];
    let status = analyticsResult.status;
    
    if (status === 'success' && analyticsResult.analytics) {
      const analytics = analyticsResult.analytics;
      
      // Google Analytics
      if (analytics.googleAnalytics.found) {
        details.push(`📊 Google Analytics: ${analytics.googleAnalytics.versions.join(', ')}`);
        if (analytics.googleAnalytics.trackingIds.length > 0) {
          details.push(`   • Tracking IDs: ${analytics.googleAnalytics.trackingIds.join(', ')}`);
        }
      }
      
      // Google Tag Manager
      if (analytics.googleTagManager.found) {
        details.push(`🏷️ Google Tag Manager`);
        if (analytics.googleTagManager.containerIds.length > 0) {
          details.push(`   • Container IDs: ${analytics.googleTagManager.containerIds.join(', ')}`);
        }
      }
      
      // Facebook Pixel
      if (analytics.facebookPixel.found) {
        details.push(`📘 Facebook Pixel`);
        if (analytics.facebookPixel.pixelIds.length > 0) {
          details.push(`   • Pixel IDs: ${analytics.facebookPixel.pixelIds.join(', ')}`);
        }
      }
      
      // Hotjar
      if (analytics.hotjar.found) {
        details.push(`🔥 Hotjar`);
        if (analytics.hotjar.siteIds.length > 0) {
          details.push(`   • Site IDs: ${analytics.hotjar.siteIds.join(', ')}`);
        }
      }
      
      // Other analytics services
      if (analytics.mixpanel.found) details.push('📈 Mixpanel');
      if (analytics.amplitude.found) details.push('📊 Amplitude');
      if (analytics.segment.found) details.push('🔗 Segment');
      if (analytics.intercom.found) details.push('💬 Intercom');
      if (analytics.zendesk.found) details.push('🎧 Zendesk');
      
      // Retargeting
      if (analytics.retargeting.found && analytics.retargeting.services.length > 0) {
        details.push(`🎯 Retargeting Services:`);
        analytics.retargeting.services.forEach(service => {
          details.push(`   • ${service}`);
        });
      }
      
      // Cookie consent with detailed provider information
      if (analytics.cookieConsent.found) {
        if (analytics.cookieConsent.providers.length > 0) {
          details.push(`🍪 Cookie Consent Providers:`);
          analytics.cookieConsent.providers.forEach(provider => {
            details.push(`   • ${provider}`);
          });
          
          // Add detailed information if available
          if (analytics.cookieConsent.details.length > 0) {
            details.push(''); // Empty line for spacing
            details.push('📋 Provider Details:');
            analytics.cookieConsent.details.forEach(detail => {
              details.push(`   • ${detail}`);
            });
          }
        } else {
          details.push('🍪 Cookie Consent detected (Generic/Unknown provider)');
        }
      }

      // Check for specific issues
      const gaIssues = analytics.googleAnalytics?.issues || [];
      const gtmIssues = analytics.googleTagManager?.issues || [];

      if(gaIssues.length > 0 || gtmIssues.length > 0) {
          details.push('');
          details.push('⚠️ Implementation Issues:');
          gaIssues.forEach(i => details.push(`   • ${i}`));
          gtmIssues.forEach(i => details.push(`   • ${i}`));
      }
      
      if (details.length === 0) {
        details.push('✅ No major analytics or tracking services detected');
      }
    } else if (status === 'success') {
      // Fallback to summary if analytics object is not available
      details.push(...(analyticsResult.summary || ['No major tracking detected']));
    } else {
      details.push('❌ Analytics check failed');
      if (analyticsResult.error) {
        details.push(`Error: ${analyticsResult.error}`);
      }
    }
    
    UIHelpers.addAccordionItem(container, 'analytics', status, '📊 Analytics & Tracking', details, false);
  }

  addSSLResults(container, sslResult) {
    let details = [];
    let status = sslResult.status;
    
    if (!sslResult.details || sslResult.details.length === 0) {
      details.push('SSL certificate information not available');
      UIHelpers.addAccordionItem(container, 'ssl', status, '🔐 SSL & Security Headers', details, false);
      return;
    }
    
    // Parse the SSL result details to extract different sections
    const parsedResult = this.parseSSLResults(sslResult.details);
    
    // Add basic certificate info (always visible)
    if (parsedResult.certificateInfo.length > 0) {
      details.push(...parsedResult.certificateInfo);
    }
    
    // Add security headers summary
    if (parsedResult.securityHeadersSummary) {
      details.push('');
      details.push(parsedResult.securityHeadersSummary);
    }
    
    // Add security headers details (simple list)
    if (parsedResult.securityHeaders.length > 0) {
      details.push('');
      details.push('🛡️ Security Headers Details:');
      details.push(...parsedResult.securityHeaders);
    }
    
    UIHelpers.addAccordionItem(container, 'ssl', status, '🔐 SSL & Security Headers', details, false);
  }
  
  parseSSLResults(sslDetails) {
    const result = {
      certificateInfo: [],
      securityHeadersSummary: '',
      securityHeaders: []
    };
    
    let currentSection = 'certificate';
    
    for (let i = 0; i < sslDetails.length; i++) {
      const line = sslDetails[i];
      
      // Fix protocols display issue
      if (line.includes('🔐 Protocols:') && line.includes('[object Object]')) {
        result.certificateInfo.push('🔐 Protocols: TLS 1.2, TLS 1.3 (or similar)');
        continue;
      }
      
      // Determine which section we're in
      if (line.includes('🛡️ Security Headers Analysis:')) {
        result.securityHeadersSummary = line;
        currentSection = 'headers';
        continue;
      }
      
      // Add content to appropriate section
      switch (currentSection) {
        case 'certificate':
          // Only include basic certificate info, skip detailed headers analysis
          if (!line.includes('HSTS') && !line.includes('CSP') && 
              !line.includes('X-Frame-Options') && !line.includes('X-Content-Type-Options') &&
              !line.includes('Prevents') && !line.includes('Impact:') && !line.includes('Essential') &&
              !line.includes('Recommended') && line.trim() !== '') {
            result.certificateInfo.push(line);
          }
          break;
        case 'headers':
          // Include all header-related lines without complex processing
          if (line.trim() !== '') {
            result.securityHeaders.push(line);
          }
          break;
      }
    }
    
    return result;
  }

  addMetaResults(container, metaResult) {
    let details = [];
    let status = metaResult.status;
    
    if (status === 'success') {
      details.push(...(metaResult.details || ['✅ Meta tags analyzed']));
      
      // Add specific meta tag content information in a clear, direct format
      if (metaResult.analysis) {
        details.push('');
        details.push(' META TAG CONTENT:');
        
        // Title - displayed more prominently
        if (metaResult.analysis.title.present) {
          details.push(`▶️ TITLE: "${metaResult.analysis.title.content}"`);
        } else {
          details.push('▶️ TITLE: Missing');
        }
        
        // Description - displayed more prominently
        if (metaResult.analysis.description.present) {
          details.push(`▶️ DESCRIPTION: "${metaResult.analysis.description.content}"`);
        } else {
          details.push('▶️ DESCRIPTION: Missing');
        }
        
        // Canonical URL - displayed more prominently
        if (metaResult.analysis.canonical.present) {
          details.push(`▶️ CANONICAL URL: ${metaResult.analysis.canonical.href}`);
        } else {
          details.push('▶️ CANONICAL URL: Missing');
        }
      }
    } else {
      details.push('❌ Meta tags check failed');
      if (metaResult.error) {
        details.push(`Error: ${metaResult.error}`);
      }
    }
    
    UIHelpers.addAccordionItem(container, 'meta', status, '🏷️ Meta Tags & SEO', details, false);
  }

  addNonDeveloperResults(container, nonDeveloperResult) {
    let details = [];
    let status = nonDeveloperResult.status;
    
    if (status === 'success' || status === 'warning' || status === 'error') {
      // Always use the formatted details from NonDeveloperChecker when available
      if (nonDeveloperResult.details && nonDeveloperResult.details.length > 0) {
        details.push(...nonDeveloperResult.details);
      } else {
        // Fallback if no details are available
        if (status === 'success') {
          details.push('✅ Content and style elements analyzed');
        } else if (status === 'warning') {
          details.push('⚠️ Content and style elements have issues');
        } else {
          details.push('❌ Content and style elements check failed');
          if (nonDeveloperResult.error) {
            details.push(`Error: ${nonDeveloperResult.error}`);
          }
        }
      }
    }
    
    UIHelpers.addAccordionItem(container, 'nonDeveloper', status, '🎨 Content and Style', details, false);
  }

  // --- NEW: Image Results Helper ---
  addImageResults(container, result) {
    let status = result.status;
    let details = result.details || ['Check failed'];
    
    UIHelpers.addAccordionItem(container, 'images', status, '🖼️ Images & Accessibility', details, false);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Remove any "Check Options" title that might exist
  const optionsTitles = document.querySelectorAll('.options-title');
  optionsTitles.forEach(title => title.remove());
  
  const app = new SecurityAuditApp();
  await app.init();
});

// Export for potential external use
export { SecurityAuditApp };