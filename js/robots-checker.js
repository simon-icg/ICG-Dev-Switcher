// Robots.txt checker functionality
export class RobotsChecker {
  static async testRobotsUrl(url) {
    const robotsUrl = url + '/robots.txt';
    
    try {
      const response = await fetch(robotsUrl, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.ok) {
        const content = await response.text();
        const analysis = this.analyzeRobotsContent(content);
        
        return {
          url: robotsUrl,
          status: 'success',
          content: content,
          analysis: analysis,
          size: content.length
        };
      } else {
        return {
          url: robotsUrl,
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('Robots.txt test error:', error);
      return {
        url: robotsUrl,
        status: 'error',
        message: error.message
      };
    }
  }

  static analyzeRobotsContent(content) {
    const lines = content.split('\n');
    const analysis = {
      userAgents: [],
      disallowedPaths: [],
      allowedPaths: [],
      sitemaps: [],
      crawlDelay: null,
      totalLines: lines.length,
      hasWildcard: false
    };

    let currentUserAgent = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = trimmedLine.substring(0, colonIndex).toLowerCase().trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      switch (directive) {
        case 'user-agent':
          currentUserAgent = value;
          if (!analysis.userAgents.includes(value)) {
            analysis.userAgents.push(value);
          }
          if (value === '*') {
            analysis.hasWildcard = true;
          }
          break;
        case 'disallow':
          if (currentUserAgent) {
            analysis.disallowedPaths.push({ userAgent: currentUserAgent, path: value });
          }
          break;
        case 'allow':
          if (currentUserAgent) {
            analysis.allowedPaths.push({ userAgent: currentUserAgent, path: value });
          }
          break;
        case 'sitemap':
          analysis.sitemaps.push(value);
          break;
        case 'crawl-delay':
          analysis.crawlDelay = parseInt(value) || null;
          break;
      }
    }

    return analysis;
  }

  static generateRobotsReport(analysis) {
    const report = [];
    
    report.push(`📊 User Agents: ${analysis.userAgents.length}`);
    report.push(`🚫 Disallowed Paths: ${analysis.disallowedPaths.length}`);
    report.push(`✅ Allowed Paths: ${analysis.allowedPaths.length}`);
    report.push(`🗺️ Sitemaps: ${analysis.sitemaps.length}`);
    
    if (analysis.crawlDelay) {
      report.push(`⏱️ Crawl Delay: ${analysis.crawlDelay}s`);
    }
    
    if (analysis.hasWildcard) {
      report.push(`🌐 Has wildcard (*) user-agent`);
    }

    return report;
  }
}
