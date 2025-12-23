// Analytics and tracking detection
export class AnalyticsChecker {
  
  static async testAnalyticsTracking(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (!response.ok) {
        return {
          url: url,
          status: 'error',
          message: `Failed to fetch page: ${response.status}`
        };
      }
      
      const html = await response.text();
      const analytics = this.detectAnalytics(html);
      
      return {
        url: url,
        status: 'success',
        analytics: analytics,
        summary: this.generateAnalyticsSummary(analytics)
      };
    } catch (error) {
      console.error('Analytics check error:', error);
      return {
        url: url,
        status: 'error',
        message: error.message
      };
    }
  }

  static detectAnalytics(html) {
    const analytics = {
      googleAnalytics: {
        found: false,
        versions: [],
        trackingIds: [],
        issues: [] // New: To store duplicate/redundant warnings
      },
      googleTagManager: {
        found: false,
        containerIds: [],
        issues: []
      },
      facebookPixel: {
        found: false,
        pixelIds: []
      },
      hotjar: {
        found: false,
        siteIds: []
      },
      mixpanel: { found: false },
      amplitude: { found: false },
      segment: { found: false },
      intercom: { found: false },
      zendesk: { found: false },
      cookieConsent: {
        found: false,
        providers: [],
        details: []
      },
      retargeting: {
        found: false,
        services: []
      }
    };

    // --- GOOGLE ANALYTICS CHECKS ---

    // 1. Universal Analytics (UA) - DEPRECATED
    // We capture all matches to check for counts
    const uaMatches = html.match(/UA-\d+-\d+/g) || [];
    if (uaMatches.length > 0) {
      analytics.googleAnalytics.found = true;
      const uniqueUA = [...new Set(uaMatches)];
      analytics.googleAnalytics.trackingIds.push(...uniqueUA);
      
      // FLAG: Redundant/Old
      analytics.googleAnalytics.issues.push(`⚠️ Deprecated Universal Analytics tag(s) found: ${uniqueUA.join(', ')}. These should be removed.`);
    }

    // 2. Google Analytics 4 (GA4)
    const ga4Matches = html.match(/G-[A-Z0-9]+/g) || [];
    if (ga4Matches.length > 0) {
      analytics.googleAnalytics.found = true;
      analytics.googleAnalytics.versions.push('GA4');
      
      // Logic to find duplicates vs unique
      const uniqueGA4 = [...new Set(ga4Matches)];
      analytics.googleAnalytics.trackingIds.push(...uniqueGA4);
      
      // CHECK COUNTS: Standard gtag.js uses ID twice (src URL + config)
      // Only warn if we see 3 or more occurrences of the SAME ID
      if (ga4Matches.length > uniqueGA4.length) {
        const counts = {};
        ga4Matches.forEach(id => counts[id] = (counts[id] || 0) + 1);
        Object.keys(counts).forEach(id => {
          if (counts[id] > 2) {
            analytics.googleAnalytics.issues.push(`⚠️ Excessive GA4 ID counts: ${id} appears ${counts[id]} times (Standard gtag.js uses it twice).`);
          }
        });
      }
    }

    // --- GOOGLE TAG MANAGER CHECKS ---
    
    const gtmMatches = html.match(/GTM-[A-Z0-9]+/g) || [];
    if (gtmMatches.length > 0) {
      analytics.googleTagManager.found = true;
      const uniqueGTM = [...new Set(gtmMatches)];
      analytics.googleTagManager.containerIds = uniqueGTM;

      // FLAG: Multiple different containers (GTM-A and GTM-B)
      if (uniqueGTM.length > 1) {
        analytics.googleTagManager.issues.push(`⚠️ Multiple distinct GTM containers detected (${uniqueGTM.join(', ')}). Verify if this is intentional.`);
      }

      // CHECK COUNTS: Standard GTM uses ID twice (Script + Noscript)
      // Only warn if we see 3 or more occurrences of the SAME ID
      if (gtmMatches.length > uniqueGTM.length) {
        const counts = {};
        gtmMatches.forEach(id => counts[id] = (counts[id] || 0) + 1);
        Object.keys(counts).forEach(id => {
          if (counts[id] > 2) {
            analytics.googleTagManager.issues.push(`⚠️ Excessive GTM counts: ${id} appears ${counts[id]} times (Standard is 2: Script + Noscript).`);
          }
        });
      }
    }

    // --- OTHER ANALYTICS ---

    // Facebook Pixel
    const fbPixelMatches = html.match(/fbq\(['"]init['"],\s*['"](\d+)['"]/g);
    if (fbPixelMatches || html.includes('connect.facebook.net')) {
      analytics.facebookPixel.found = true;
      if (fbPixelMatches) {
        analytics.facebookPixel.pixelIds = fbPixelMatches.map(match => match.match(/\d+/)[0]);
      }
    }

    // Hotjar
    const hotjarMatches = html.match(/hjid:(\d+)/g);
    if (hotjarMatches || html.includes('static.hotjar.com')) {
      analytics.hotjar.found = true;
      if (hotjarMatches) {
        analytics.hotjar.siteIds = hotjarMatches.map(match => match.match(/\d+/)[0]);
      }
    }

    // Simple detections
    if (html.includes('mixpanel') || html.includes('cdn.mxpnl.com')) analytics.mixpanel.found = true;
    if (html.includes('amplitude') || html.includes('cdn.amplitude.com')) analytics.amplitude.found = true;
    if (html.includes('segment.com') || html.includes('cdn.segment.com')) analytics.segment.found = true;
    if (html.includes('intercom') || html.includes('widget.intercom.io')) analytics.intercom.found = true;
    if (html.includes('zendesk') || html.includes('static.zdassets.com')) analytics.zendesk.found = true;

    // Cookie consent detection
    analytics.cookieConsent = this.detectCookieConsentProviders(html);

    // Retargeting
    const retargetingServices = [
      { name: 'Google Ads', pattern: /googleadservices\.com/i },
      { name: 'Microsoft Ads', pattern: /bat\.bing\.com/i },
      { name: 'LinkedIn', pattern: /snap\.licdn\.com/i },
      { name: 'Twitter', pattern: /analytics\.twitter\.com/i },
      { name: 'Pinterest', pattern: /ct\.pinterest\.com/i }
    ];

    retargetingServices.forEach(service => {
      if (service.pattern.test(html)) {
        analytics.retargeting.found = true;
        analytics.retargeting.services.push(service.name);
      }
    });

    return analytics;
  }

  static detectCookieConsentProviders(html) {
    const cookieConsent = {
      found: false,
      providers: [],
      details: []
    };

    // Full list of providers from original file
    const providers = [
      {
        name: 'OneTrust',
        patterns: [
          /onetrust\.com/i,
          /otSDKStub/i,
          /OneTrust/i,
          /ot-sdk/i,
          /optanon/i
        ],
        idPatterns: [
          /data-domain-script="([^"]+)"/i,
          /optanonwrapper/i
        ]
      },
      {
        name: 'Cookiebot',
        patterns: [
          /cookiebot\.com/i,
          /consent\.cookiebot\.com/i,
          /Cookiebot/i,
          /CookieConsent/i
        ],
        idPatterns: [
          /data-cbid="([^"]+)"/i,
          /cookiebot.*id.*=.*"([^"]+)"/i
        ]
      },
      {
        name: 'CookieYes',
        patterns: [
          /cookieyes\.com/i,
          /app\.cookieyes\.com/i,
          /CookieYes/i,
          /cky-/i
        ],
        idPatterns: [
          /cky-.*="([^"]+)"/i
        ]
      },
      {
        name: 'Osano',
        patterns: [
          /osano\.com/i,
          /cmp\.osano\.com/i,
          /Osano/i
        ],
        idPatterns: [
          /osano.*customer.*id/i
        ]
      },
      {
        name: 'TrustArc',
        patterns: [
          /trustarc\.com/i,
          /consent\.trustarc\.com/i,
          /TrustArc/i,
          /truste\.com/i
        ],
        idPatterns: []
      },
      {
        name: 'Quantcast Choice',
        patterns: [
          /quantcast\.com/i,
          /choice\.quantcast\.com/i,
          /qcCmpApi/i,
          /__tcfapi/i
        ],
        idPatterns: []
      },
      {
        name: 'Termly',
        patterns: [
          /termly\.io/i,
          /app\.termly\.io/i,
          /Termly/i
        ],
        idPatterns: []
      },
      {
        name: 'Cookie Script',
        patterns: [
          /cookie-script\.com/i,
          /CookieScript/i
        ],
        idPatterns: []
      },
      {
        name: 'Klaro',
        patterns: [
          /klaro/i,
          /klaroConfig/i
        ],
        idPatterns: []
      },
      {
        name: 'Cookie Notice',
        patterns: [
          /cookie.*notice/i,
          /cookieNotice/i
        ],
        idPatterns: []
      },
      {
        name: 'Complianz',
        patterns: [
          /complianz/i,
          /cmplz/i
        ],
        idPatterns: []
      },
      {
        name: 'iubenda',
        patterns: [
          /iubenda\.com/i,
          /iubenda/i,
          /_iub/i
        ],
        idPatterns: [
          /iubenda.*siteId.*:.*['"]\s*(\d+)/i
        ]
      },
      {
        name: 'Usercentrics',
        patterns: [
          /usercentrics/i,
          /app\.usercentrics/i
        ],
        idPatterns: [
          /data-settings-id="([^"]+)"/i
        ]
      },
      {
        name: 'Consensu',
        patterns: [
          /consensu/i,
          /app\.consensu/i
        ],
        idPatterns: []
      },
      {
        name: 'Consentmanager',
        patterns: [
          /consentmanager/i,
          /cdn\.consentmanager/i
        ],
        idPatterns: []
      }
    ];

    // Check each provider
    providers.forEach(provider => {
      let found = false;
      let details = [];

      // Check main patterns
      provider.patterns.forEach(pattern => {
        if (pattern.test(html)) {
          found = true;
        }
      });

      if (found) {
        cookieConsent.found = true;
        cookieConsent.providers.push(provider.name);

        // Try to extract IDs or additional details
        provider.idPatterns.forEach(idPattern => {
          const match = html.match(idPattern);
          if (match && match[1]) {
            details.push(`ID: ${match[1]}`);
          }
        });

        if (details.length > 0) {
          cookieConsent.details.push(`${provider.name}: ${details.join(', ')}`);
        } else {
          cookieConsent.details.push(`${provider.name}: Detected`);
        }
      }
    });

    // Generic cookie consent detection if no specific provider found
    if (!cookieConsent.found) {
      const genericPatterns = [
        /cookie.*consent/i,
        /gdpr.*consent/i,
        /accept.*cookie/i,
        /cookie.*banner/i,
        /privacy.*consent/i,
        /cookieConsent/i,
        /data-cookie/i,
        /cookie.*policy.*accept/i
      ];

      const foundGeneric = genericPatterns.some(pattern => pattern.test(html));
      if (foundGeneric) {
        cookieConsent.found = true;
        cookieConsent.providers.push('Generic/Custom');
        cookieConsent.details.push('Generic/Custom: Cookie consent detected');
      }
    }

    return cookieConsent;
  }

  static generateAnalyticsSummary(analytics) {
    const summary = [];
    
    // --- Google Analytics Summary ---
    if (analytics.googleAnalytics.found) {
      summary.push(`📊 Google Analytics: ${analytics.googleAnalytics.versions.join(', ')}`);
      
      if (analytics.googleAnalytics.trackingIds.length > 0) {
         summary.push(`   IDs: ${analytics.googleAnalytics.trackingIds.join(', ')}`);
      }

      // Add Issues/Warnings to summary
      if (analytics.googleAnalytics.issues.length > 0) {
        analytics.googleAnalytics.issues.forEach(issue => summary.push(issue));
      }
    }

    // --- GTM Summary ---
    if (analytics.googleTagManager.found) {
      summary.push(`🏷️ Google Tag Manager: ${analytics.googleTagManager.containerIds.join(', ')}`);
      
      // Add Issues/Warnings to summary
      if (analytics.googleTagManager.issues.length > 0) {
        analytics.googleTagManager.issues.forEach(issue => summary.push(issue));
      }
    }

    // --- Other Services ---
    if (analytics.facebookPixel.found) {
      summary.push(`📘 Facebook Pixel: ${analytics.facebookPixel.pixelIds.length > 0 ? analytics.facebookPixel.pixelIds.join(', ') : 'Detected'}`);
    }

    if (analytics.hotjar.found) {
      summary.push(`🔥 Hotjar: ${analytics.hotjar.siteIds.length > 0 ? analytics.hotjar.siteIds.join(', ') : 'Detected'}`);
    }

    if (analytics.mixpanel.found) summary.push('📈 Mixpanel');
    if (analytics.amplitude.found) summary.push('📊 Amplitude');
    if (analytics.segment.found) summary.push('🔗 Segment');
    if (analytics.intercom.found) summary.push('💬 Intercom');
    if (analytics.zendesk.found) summary.push('🎧 Zendesk');

    if (analytics.cookieConsent.found) {
      if (analytics.cookieConsent.providers.length > 0) {
        summary.push(`🍪 Cookie Consent: ${analytics.cookieConsent.providers.join(', ')}`);
      } else {
        summary.push('🍪 Cookie Consent detected');
      }
    }

    if (analytics.retargeting.found && analytics.retargeting.services.length > 0) {
      summary.push(`🎯 Retargeting: ${analytics.retargeting.services.join(', ')}`);
    }

    if (summary.length === 0) {
      summary.push('No major analytics or tracking services detected');
    }

    return summary;
  }
}