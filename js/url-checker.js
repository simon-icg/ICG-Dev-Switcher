// URL testing and validation functions
export class UrlChecker {
  static async testUrl(baseUrl) {
    const domain = new URL(baseUrl).hostname;
    const baseDomain = domain.replace(/^www\./, '');
    
    // Test all combinations
    const urlsToTest = [
      `https://${baseDomain}`,
      `https://www.${baseDomain}`,
      `http://${baseDomain}`,
      `http://www.${baseDomain}`
    ];

    const results = {
      url: baseUrl,
      domain: domain,
      tests: {},
      analysis: {
        httpsWorking: false,
        httpRedirectsToHttps: false,
        wwwRedirection: null, // 'to-www', 'to-non-www', 'both-work', 'none'
        preferredUrl: null
      },
      isCloudflare: false // Initialize Cloudflare flag
    };

    // Test each URL
    for (const testUrl of urlsToTest) {
      const testResult = await this.testSingleUrl(testUrl);
      const key = this.getUrlKey(testUrl);
      results.tests[key] = testResult;
      
      // Check for Cloudflare headers if not already found
      if (!results.isCloudflare && testResult.cloudflareDetected) {
        results.isCloudflare = true;
      }
    }

    // Analyze results
    this.analyzeResults(results);
    
    // Get IP address and check Cloudflare by IP range
    try {
      const ipInfo = await this.getIpAddress(baseUrl);
      if (ipInfo) {
        results.ipAddress = ipInfo.ip;
        // If Cloudflare was detected either by headers or IP, set it to true
        results.isCloudflare = results.isCloudflare || ipInfo.isCloudflare;
      }
    } catch (error) {
      console.error('Error getting IP information:', error);
    }

    return results;
  }

  static async testSingleUrl(url) {
    try {
      console.log(`Testing URL: ${url}`);
      
      // Try to detect redirects by fetching with a custom approach
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow' // Follow redirects to see final destination
      });

      console.log(`URL ${url} - Status: ${response.status}, Redirected: ${response.redirected}, Final: ${response.url}`);
      
      // Check for Cloudflare headers
      const cloudflareDetected = this.checkCloudflareHeaders(response.headers);

      return {
        url: url,
        status: 'success',
        statusCode: response.status,
        finalUrl: response.url,
        redirected: response.redirected,
        accessible: true,
        cloudflareDetected: cloudflareDetected
      };
    } catch (error) {
      console.log(`URL ${url} failed with fetch, trying no-cors fallback:`, error.message);
      
      // If fetch fails, try with no-cors as fallback
      try {
        const fallbackResponse = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        console.log(`URL ${url} - Fallback successful`);
        
        return {
          url: url,
          status: 'success',
          statusCode: null,
          finalUrl: url,
          redirected: false,
          accessible: true,
          note: 'Accessible but redirect detection limited by CORS',
          cloudflareDetected: false // We can't check headers in no-cors mode
        };
      } catch (fallbackError) {
        console.log(`URL ${url} - Both attempts failed:`, fallbackError.message);
        
        return {
          url: url,
          status: 'error',
          statusCode: null,
          finalUrl: null,
          redirected: false,
          accessible: false,
          error: error.message,
          fallbackError: fallbackError.message,
          cloudflareDetected: false
        };
      }
    }
  }

  static getUrlKey(url) {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const hasWww = urlObj.hostname.startsWith('www.');
    
    if (isHttps && hasWww) return 'https-www';
    if (isHttps && !hasWww) return 'https-non-www';
    if (!isHttps && hasWww) return 'http-www';
    if (!isHttps && !hasWww) return 'http-non-www';
  }

  static analyzeResults(results) {
    const tests = results.tests;
    
    // Check HTTPS working
    results.analysis.httpsWorking = 
      tests['https-www']?.accessible || tests['https-non-www']?.accessible;

    // Check HTTP to HTTPS redirects
    const httpNonWww = tests['http-non-www'];
    const httpWww = tests['http-www'];
    
    if (httpNonWww?.redirected && httpNonWww?.finalUrl?.startsWith('https:')) {
      results.analysis.httpRedirectsToHttps = true;
    }
    if (httpWww?.redirected && httpWww?.finalUrl?.startsWith('https:')) {
      results.analysis.httpRedirectsToHttps = true;
    }

    // Check www redirection pattern
    const httpsWww = tests['https-www'];
    const httpsNonWww = tests['https-non-www'];
    
    if (httpsWww?.redirected && httpsNonWww?.accessible && !httpsNonWww?.redirected) {
      results.analysis.wwwRedirection = 'to-non-www';
      results.analysis.preferredUrl = httpsNonWww.finalUrl || httpsNonWww.url;
    } else if (httpsNonWww?.redirected && httpsWww?.accessible && !httpsWww?.redirected) {
      results.analysis.wwwRedirection = 'to-www';
      results.analysis.preferredUrl = httpsWww.finalUrl || httpsWww.url;
    } else if (httpsWww?.accessible && httpsNonWww?.accessible) {
      results.analysis.wwwRedirection = 'both-work';
    } else {
      results.analysis.wwwRedirection = 'unclear';
    }
  }

  static async getIpAddress(url) {
    try {
      const domain = new URL(url).hostname;
      
      // Use Cloudflare DNS-over-HTTPS API to get IP address
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
        headers: {
          'Accept': 'application/dns-json'
        }
      });
      
      const data = await response.json();
      
      if (data.Answer && data.Answer.length > 0) {
        const ip = data.Answer[0].data;
        console.log(`IP address found: ${ip}`);
        
        // Check for Cloudflare immediately
        const isCloudflare = this.checkCloudflare(ip);
        
        return {
          ip: ip,
          isCloudflare: isCloudflare
        };
      }
      
      return { ip: 'Unable to resolve', isCloudflare: false };
    } catch (error) {
      console.error('IP address lookup error:', error);
      return { ip: 'DNS lookup failed', isCloudflare: false };
    }
  }

  static checkCloudflare(ip) {
    if (!ip || typeof ip !== 'string') return false;
    
    // Cloudflare IP ranges (most common ones)
    const cloudflareRanges = [
      '173.245.48', '103.21.244', '103.22.200', 
      '103.31.4', '141.101.64', '108.162.192', 
      '190.93.240', '188.114.96', '197.234.240', 
      '198.41.128', '162.158', '104.16', 
      '104.24', '131.0.72'
    ];
    
    // Simple check - see if IP starts with any of these ranges
    for (const range of cloudflareRanges) {
      if (ip.startsWith(range)) {
        console.log(`Cloudflare detected: IP ${ip} matches range ${range}`);
        return true;
      }
    }
    
    return false;
  }
  
  static checkCloudflareHeaders(headers) {
    // Check for Cloudflare specific headers
    const cloudflareHeaders = ['cf-ray', 'cf-cache-status', 'cf-connecting-ip', 'cf-worker'];
    
    for (const header of cloudflareHeaders) {
      if (headers.get(header)) {
        console.log(`Cloudflare detected via header: ${header}`);
        return true;
      }
    }
    
    // Check if server header mentions cloudflare
    const server = headers.get('server');
    if (server && server.toLowerCase().includes('cloudflare')) {
      console.log('Cloudflare detected via server header');
      return true;
    }
    
    return false;
  }

  static async checkRedirect(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual'
      });
      
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        return {
          isRedirect: true,
          status: response.status,
          location: location,
          type: response.status === 301 ? 'permanent' : 'temporary'
        };
      }
      
      return { isRedirect: false };
    } catch (error) {
      console.error('Redirect check error:', error);
      return { isRedirect: false, error: error.message };
    }
  }
}
