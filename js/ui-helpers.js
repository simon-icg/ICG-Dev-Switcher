// UI manipulation and display functions
export class UIHelpers {
  static createChecklist(allChecks) {
    const container = document.createElement('div');
    container.className = 'checklist-container';
    
    const title = document.createElement('div');
    title.className = 'checklist-title';
    title.textContent = '🔄 Running Checks...';
    container.appendChild(title);
    
    allChecks.forEach((checkLabel, index) => {
      const checkItem = document.createElement('div');
      checkItem.className = 'check-item pending';
      checkItem.setAttribute('data-index', index);
      
      const status = document.createElement('span');
      status.className = 'check-status';
      status.textContent = '⏳';
      
      const label = document.createElement('span');
      label.className = 'check-label';
      label.textContent = checkLabel;
      
      checkItem.appendChild(status);
      checkItem.appendChild(label);
      container.appendChild(checkItem);
    });
    
    return container;
  }

  static updateCheckItem(container, index, status, redirectInfo = null, methods = null) {
    const checkItem = container.querySelector(`[data-index="${index}"]`);
    if (!checkItem) return;
    
    const statusElement = checkItem.querySelector('.check-status');
    const labelElement = checkItem.querySelector('.check-label');
    
    // Remove existing classes
    checkItem.classList.remove('pending', 'testing', 'success', 'error', 'warning');
    
    switch (status) {
      case 'testing':
        checkItem.classList.add('testing');
        statusElement.textContent = '🔄';
        break;
      case 'success':
        checkItem.classList.add('success');
        statusElement.textContent = '✅';
        break;
      case 'error':
        checkItem.classList.add('error');
        statusElement.textContent = '❌';
        break;
      case 'warning':
        checkItem.classList.add('warning');
        statusElement.textContent = '⚠️';
        break;
      default:
        checkItem.classList.add('pending');
        statusElement.textContent = '⏳';
    }
    
    // Add redirect info if provided
    if (redirectInfo) {
      const existingRedirectInfo = labelElement.querySelector('.redirect-info');
      if (existingRedirectInfo) {
        existingRedirectInfo.remove();
      }
      
      const redirectSpan = document.createElement('span');
      redirectSpan.className = 'redirect-info';
      redirectSpan.textContent = ` (${redirectInfo})`;
      labelElement.appendChild(redirectSpan);
    }
    
    // Add methods info if provided
    if (methods) {
      const existingMethodsInfo = labelElement.querySelector('.methods-info');
      if (existingMethodsInfo) {
        existingMethodsInfo.remove();
      }
      
      const methodsSpan = document.createElement('span');
      methodsSpan.className = 'methods-info';
      methodsSpan.textContent = ` - ${methods}`;
      labelElement.appendChild(methodsSpan);
    }
    
    // Check if all checks are complete and update title
    this.updateChecklistTitle(container);
  }

  static updateChecklistTitle(container) {
    const titleElement = container.querySelector('.checklist-title');
    if (!titleElement) return;
    
    const allCheckItems = container.querySelectorAll('.check-item');
    const pendingItems = container.querySelectorAll('.check-item.pending');
    const testingItems = container.querySelectorAll('.check-item.testing');
    
    if (pendingItems.length === 0 && testingItems.length === 0) {
      // All checks are complete
      const successItems = container.querySelectorAll('.check-item.success');
      const errorItems = container.querySelectorAll('.check-item.error');
      const warningItems = container.querySelectorAll('.check-item.warning');
      
      if (errorItems.length > 0) {
        titleElement.textContent = '❌ Checks Complete (Some Issues Found)';
      } else if (warningItems.length > 0) {
        titleElement.textContent = '⚠️ Checks Complete (Warnings Found)';
      } else {
        titleElement.textContent = '✅ All Checks Complete';
      }
    } else if (testingItems.length > 0) {
      titleElement.textContent = '🔄 Running Checks...';
    }
  }

  static createResultsAccordion() {
    const container = document.createElement('div');
    container.className = 'results-accordion';
    return container;
  }

  static addAccordionItem(container, checkType, status, title, details, isExpanded = false) {
    const accordionItem = document.createElement('div');
    accordionItem.className = `accordion-item ${status}`;
    
    // Create header
    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.onclick = () => this.toggleAccordion(accordionItem);
    
    const statusIcon = this.getStatusIcon(status);
    const statusSpan = document.createElement('span');
    statusSpan.className = 'accordion-status';
    statusSpan.textContent = statusIcon;
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'accordion-title';
    titleSpan.textContent = title;
    
    const toggleSpan = document.createElement('span');
    toggleSpan.className = 'accordion-toggle';
    toggleSpan.textContent = isExpanded ? '▲' : '▼';
    
    header.appendChild(statusSpan);
    header.appendChild(titleSpan);
    header.appendChild(toggleSpan);
    
    // Create content
    const content = document.createElement('div');
    content.className = isExpanded ? 'accordion-content expanded' : 'accordion-content';
    
    details.forEach(detail => {
      const detailDiv = document.createElement('div');
      detailDiv.className = 'accordion-detail';
      
      // Check if the detail contains HTML (simple check for HTML tags)
      if (detail.includes('<div') || detail.includes('<span') || detail.includes('<pre')) {
        detailDiv.innerHTML = detail;
      } else {
        detailDiv.textContent = detail;
      }
      
      content.appendChild(detailDiv);
    });
    
    accordionItem.appendChild(header);
    accordionItem.appendChild(content);
    container.appendChild(accordionItem);
    
    return accordionItem;
  }

  static getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'testing': return '🔄';
      default: return '⏳';
    }
  }

  static toggleAccordion(accordionItem) {
    const content = accordionItem.querySelector('.accordion-content');
    const toggle = accordionItem.querySelector('.accordion-toggle');
    
    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      toggle.textContent = '▼';
    } else {
      content.classList.add('expanded');
      toggle.textContent = '▲';
    }
  }

  static addTimestamp(container) {
    const timestamp = document.createElement('div');
    timestamp.className = 'audit-timestamp';
    timestamp.textContent = `Audit completed at ${new Date().toLocaleString()}`;
    container.appendChild(timestamp);
  }

  static formatRobotsAnalysis(analysis) {
    const items = [];
    
    if (analysis.userAgents && analysis.userAgents.length > 0) {
      items.push(`📊 User Agents: ${analysis.userAgents.length}`);
    }
    
    if (analysis.disallowedPaths && analysis.disallowedPaths.length > 0) {
      items.push(`🚫 Disallowed Paths: ${analysis.disallowedPaths.length}`);
    }
    
    if (analysis.sitemaps && analysis.sitemaps.length > 0) {
      items.push(`🗺️ Sitemaps: ${analysis.sitemaps.length}`);
    }
    
    if (analysis.crawlDelay) {
      items.push(`⏱️ Crawl Delay: ${analysis.crawlDelay}s`);
    }
    
    if (analysis.hasWildcard) {
      items.push(`🌐 Has wildcard (*) user-agent`);
    }
    
    return items;
  }

  static showError(message) {
    const results = document.getElementById('results');
    results.innerHTML = `
      <div class="result-item error">
        <div class="result-status error">❌ ${message}</div>
      </div>
    `;
  }

  static showLoading(message = 'Running security and SEO audit...') {
    const results = document.getElementById('results');
    results.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <div>${message}</div>
      </div>
    `;
  }

  static clearResults() {
    const results = document.getElementById('results');
    results.innerHTML = '';
    
    // Also remove the current URL display if it exists
    const currentUrlDiv = document.getElementById('currentUrl');
    if (currentUrlDiv) {
      currentUrlDiv.remove();
    }
  }

  static displayResults(container) {
    const results = document.getElementById('results');
    results.innerHTML = '';
    results.appendChild(container);
  }

  static appendToResults(container) {
    const results = document.getElementById('results');
    results.appendChild(container);
  }
}
