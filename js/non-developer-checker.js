// Content and Style checks - footer copyright, web fonts, social media links
export class NonDeveloperChecker {
  
  static async testNonDeveloperElements(url) {
    console.log('Starting content and style checks for:', url);
    
    try {
      // Fetch the page content
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Parse HTML using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Run all checks
      const copyrightCheck = this.checkFooterCopyright(doc, html);
      const webFontsCheck = this.checkWebFonts(doc, html);
      const socialLinksCheck = this.checkSocialMediaLinks(doc);
      
      // Determine overall status based on individual check results
      const checksPassed = [];
      const checksWarned = [];
      const checksFailed = [];
      
      // Evaluate copyright check
      if (copyrightCheck.found && copyrightCheck.issues.length === 0) {
        checksPassed.push('copyright');
      } else if (copyrightCheck.found && copyrightCheck.issues.length > 0) {
        checksWarned.push('copyright');
      } else {
        checksFailed.push('copyright');
      }
      
      // Evaluate web fonts check
      if (webFontsCheck.found && webFontsCheck.issues.length === 0) {
        checksPassed.push('webFonts');
      } else if (webFontsCheck.found && webFontsCheck.issues.length > 0) {
        checksWarned.push('webFonts');
      } else {
        checksFailed.push('webFonts');
      }
      
      // Evaluate social links check - more lenient approach
      if (socialLinksCheck.found) {
        // Social links found is considered a pass, security issues are just warnings
        checksPassed.push('socialLinks');
      } else {
        checksFailed.push('socialLinks');
      }
      
      // Determine overall status
      let overallStatus = 'success';
      let statusMessage = '✅ Content and style elements analyzed';
      
      if (checksFailed.length > 0) {
        overallStatus = 'warning';
        statusMessage = `⚠️ Content and style elements: ${checksFailed.length} failed, ${checksWarned.length} warned, ${checksPassed.length} passed`;
      } else if (checksWarned.length > 0) {
        overallStatus = 'warning';
        statusMessage = `⚠️ Content and style elements: ${checksWarned.length} have issues, ${checksPassed.length} passed`;
      }
      
      const results = {
        status: overallStatus,
        details: [
          statusMessage,
          '',
          '📋 CONTENT AND STYLE CHECKS:'
        ],
        analysis: {
          copyright: copyrightCheck,
          webFonts: webFontsCheck,
          socialLinks: socialLinksCheck
        }
      };
      
      // Add detailed results
      results.details.push(...this.formatCopyrightResults(copyrightCheck));
      results.details.push(...this.formatWebFontsResults(webFontsCheck));
      results.details.push(...this.formatSocialLinksResults(socialLinksCheck));
      
      return results;
      
    } catch (error) {
      console.error('Content and style check failed:', error);
      
      // Try to provide some basic fallback results even on error
      const fallbackResults = {
        status: 'error',
        error: error.message,
        details: [
          '❌ Failed to analyze content and style elements',
          `Error: ${error.message}`,
          '',
          '📋 ATTEMPTED CHECKS:'
        ],
        analysis: {
          copyright: { found: false, issues: ['Unable to check - page fetch failed'] },
          webFonts: { found: false, issues: ['Unable to check - page fetch failed'] },
          socialLinks: { found: false, issues: ['Unable to check - page fetch failed'] }
        }
      };
      
      // Add fallback details
      fallbackResults.details.push('▶️ COPYRIGHT: ❌ Unable to check (page fetch failed)');
      fallbackResults.details.push('▶️ WEB FONTS: ❌ Unable to check (page fetch failed)');
      fallbackResults.details.push('▶️ SOCIAL MEDIA: ❌ Unable to check (page fetch failed)');
      fallbackResults.details.push('');
      fallbackResults.details.push('💡 This usually happens due to:');
      fallbackResults.details.push('   • CORS restrictions');
      fallbackResults.details.push('   • Network connectivity issues');
      fallbackResults.details.push('   • Website blocking automated requests');
      fallbackResults.details.push('   • Invalid URL or DNS issues');
      
      return fallbackResults;
    }
  }
  
  static checkFooterCopyright(doc, html) {
    const results = {
      found: false,
      text: '',
      year: null,
      companyName: '',
      location: 'Not found',
      issues: []
    };
    
    // Look for copyright in footer elements first
    const footers = doc.querySelectorAll('footer, .footer, #footer, [class*="footer"]');
    
    // UPDATED: Now supports "© Year Company" AND "© Company Year"
    const copyrightPatterns = [
      // Format 1: Symbol Year Company (e.g. © 2025 ICG)
      /©\s*(\d{4})\s*([^.\n<]+?)(?:\s*\.|\s*$|\s*<|\s*\||\s*\n)/i,
      /copyright\s*©?\s*(\d{4})\s*([^.\n<]+?)(?:\s*\.|\s*$|\s*<|\s*\||\s*\n)/i,
      /\(c\)\s*(\d{4})\s*([^.\n<]+?)(?:\s*\.|\s*$|\s*<|\s*\||\s*\n)/i,
      
      // Format 2: Symbol Company Year (e.g. © Cotswold Designer Outlet. 2025)
      // Captures company in group 1, year in group 2
      /©\s*([^.\n<]+?)(?:[.,\s]+)(\d{4})/i,
      /copyright\s*©?\s*([^.\n<]+?)(?:[.,\s]+)(\d{4})/i,
      /\(c\)\s*([^.\n<]+?)(?:[.,\s]+)(\d{4})/i
    ];
    
    let foundCopyright = null;
    
    // Helper to identify which capture group is the year
    const extractMatch = (match, text, location) => {
      let year, company;
      
      // Check if Group 1 is 4 digits (The Year)
      if (/^\d{4}$/.test(match[1])) {
        year = match[1];
        company = match[2];
      } 
      // Check if Group 2 is 4 digits (The Year)
      else if (/^\d{4}$/.test(match[2])) {
        company = match[1];
        year = match[2];
      } else {
        return null; 
      }
      
      return {
        text: match[0].trim(),
        year: parseInt(year),
        companyName: company.trim(),
        location: location
      };
    };
    
    // 1. Check footer elements
    for (const footer of footers) {
      const footerText = footer.textContent || footer.innerText || '';
      for (const pattern of copyrightPatterns) {
        const match = footerText.match(pattern);
        if (match) {
          foundCopyright = extractMatch(match, footerText, 'Footer element');
          if (foundCopyright) break;
        }
      }
      if (foundCopyright) break;
    }
    
    // 2. Check entire document if not found in footer
    if (!foundCopyright) {
      const bodyText = doc.body ? (doc.body.textContent || doc.body.innerText || '') : html;
      for (const pattern of copyrightPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          foundCopyright = extractMatch(match, bodyText, 'Page content');
          if (foundCopyright) break;
        }
      }
    }
    
    // 3. Validate results
    if (foundCopyright) {
      results.found = true;
      results.text = foundCopyright.text;
      results.year = foundCopyright.year;
      
      // Clean up company name
      let cleanCompanyName = foundCopyright.companyName.trim();
      cleanCompanyName = cleanCompanyName.replace(/\s*(all rights reserved|reserved|rights reserved).*$/i, '').trim();
      // Remove trailing periods often captured in "Company."
      cleanCompanyName = cleanCompanyName.replace(/[.,]$/, '');
      
      results.companyName = cleanCompanyName;
      results.location = foundCopyright.location;
      
      const currentYear = new Date().getFullYear();
      if (foundCopyright.year !== currentYear) {
        if (foundCopyright.year < currentYear) {
          results.issues.push(`Copyright year (${foundCopyright.year}) is outdated - current year (${currentYear}) required`);
        } else {
          results.issues.push(`Copyright year (${foundCopyright.year}) is in the future - current year (${currentYear}) expected`);
        }
      }
      
      if (!cleanCompanyName || cleanCompanyName.length < 2) {
        results.issues.push('Company name appears to be missing or too short');
      }
    } else {
      results.issues.push('No copyright notice found in footer or page content');
    }
    
    return results;
  }
  
  static checkWebFonts(doc, html) {
    const results = {
      found: false,
      fonts: [],
      sources: [],
      issues: []
    };
    
    // Check for Google Fonts
    const googleFontLinks = doc.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
    if (googleFontLinks.length > 0) {
      results.sources.push('Google Fonts');
      googleFontLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('family=')) {
          const familyMatch = href.match(/family=([^&:]+)/);
          if (familyMatch) {
            results.fonts.push(decodeURIComponent(familyMatch[1].replace(/\+/g, ' ')));
          }
        }
      });
    }
    
    // Check for Adobe Fonts (Typekit)
    const adobeFontLinks = doc.querySelectorAll('link[href*="use.typekit.net"], script[src*="use.typekit.net"]');
    if (adobeFontLinks.length > 0) {
      results.sources.push('Adobe Fonts (Typekit)');
    }
    
    // Check for custom font CSS
    const styleElements = doc.querySelectorAll('style');
    const linkElements = doc.querySelectorAll('link[rel="stylesheet"]');
    
    let hasCustomFonts = false;
    const fontFaceRegex = /@font-face\s*{[^}]*font-family\s*:\s*['"']?([^'";]+)['"']?/gi;
    
    // Check inline styles
    styleElements.forEach(style => {
      const content = style.textContent || style.innerHTML || '';
      let match;
      while ((match = fontFaceRegex.exec(content)) !== null) {
        hasCustomFonts = true;
        results.fonts.push(match[1].trim());
      }
    });
    
    if (hasCustomFonts) {
      results.sources.push('Custom @font-face');
    }
    
    // Check for font loading in HTML
    if (html.includes('@font-face') || html.includes('font-family')) {
      if (!hasCustomFonts && results.sources.length === 0) {
        results.sources.push('CSS font-family declarations');
      }
    }
    
    results.found = results.sources.length > 0 || results.fonts.length > 0;
    
    if (!results.found) {
      results.issues.push('No web fonts detected');
    }
    
    return results;
  }
  
  static checkSocialMediaLinks(doc) {
    const results = {
      found: false,
      links: [],
      issues: []
    };
    
    // Common social media domains
    const socialDomains = [
      'facebook.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com',
      'pinterest.com',
      'snapchat.com',
      'whatsapp.com',
      'telegram.org',
      'discord.com',
      'reddit.com',
      'tumblr.com',
      'flickr.com',
      'vimeo.com',
      'twitch.tv'
    ];
    
    // Find all external links
    const links = doc.querySelectorAll('a[href]');
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      try {
        // Handle relative URLs and absolute URLs
        let url;
        if (href.startsWith('http')) {
          url = new URL(href);
        } else if (href.startsWith('//')) {
          url = new URL('https:' + href);
        } else {
          return; // Skip relative links for social media check
        }
        
        const domain = url.hostname.toLowerCase();
        
        // Check if it's a social media domain
        const socialPlatform = socialDomains.find(social => 
          domain === social || domain.endsWith('.' + social)
        );
        
        if (socialPlatform) {
          const linkText = link.textContent?.trim() || '';
          const hasExternalIndicator = link.hasAttribute('target') && link.getAttribute('target') === '_blank';
          const hasRelNoopener = link.getAttribute('rel')?.includes('noopener');
          const hasRelNoreferrer = link.getAttribute('rel')?.includes('noreferrer');
          
          results.links.push({
            platform: socialPlatform.replace('.com', '').replace('.org', '').replace('.tv', ''),
            url: href,
            text: linkText,
            opensInNewTab: hasExternalIndicator,
            hasNoopener: hasRelNoopener,
            hasNoreferrer: hasRelNoreferrer
          });
        }
      } catch (error) {
        // Skip malformed URLs
      }
    });
    
    results.found = results.links.length > 0;
    
    if (!results.found) {
      results.issues.push('No social media links found');
    } else {
      // Check for security best practices
      const linksWithoutTarget = results.links.filter(link => !link.opensInNewTab);
      const linksWithoutNoopener = results.links.filter(link => !link.hasNoopener);
      
      if (linksWithoutTarget.length > 0) {
        results.issues.push(`${linksWithoutTarget.length} social link(s) don't open in new tab`);
      }
      
      if (linksWithoutNoopener.length > 0) {
        results.issues.push(`${linksWithoutNoopener.length} social link(s) missing rel="noopener" security attribute`);
      }
    }
    
    return results;
  }
  
  static formatCopyrightResults(copyrightCheck) {
    const details = [];
    
    if (copyrightCheck.found) {
      if (copyrightCheck.issues.length === 0) {
        details.push(`▶️ COPYRIGHT: ✅ "${copyrightCheck.text}"`);
      } else {
        details.push(`▶️ COPYRIGHT: ⚠️ "${copyrightCheck.text}"`);
      }
      details.push(`   • Found in: ${copyrightCheck.location}`);
      details.push(`   • Year: ${copyrightCheck.year}`);
      details.push(`   • Company: ${copyrightCheck.companyName}`);
      
      if (copyrightCheck.issues.length > 0) {
        details.push('   ⚠️ Issues:');
        copyrightCheck.issues.forEach(issue => {
          details.push(`     • ${issue}`);
        });
      }
    } else {
      details.push('▶️ COPYRIGHT: ❌ Missing');
      details.push('   ❌ No copyright notice found');
    }
    
    details.push('');
    return details;
  }
  
  static formatWebFontsResults(webFontsCheck) {
    const details = [];
    
    if (webFontsCheck.found) {
      if (webFontsCheck.issues.length === 0) {
        details.push(`▶️ WEB FONTS: ✅ ${webFontsCheck.sources.join(', ')}`);
      } else {
        details.push(`▶️ WEB FONTS: ⚠️ ${webFontsCheck.sources.join(', ')}`);
      }
      
      if (webFontsCheck.fonts.length > 0) {
        details.push(`   • Font families: ${webFontsCheck.fonts.slice(0, 5).join(', ')}${webFontsCheck.fonts.length > 5 ? '...' : ''}`);
      }
      
      if (webFontsCheck.issues.length > 0) {
        details.push('   ⚠️ Issues:');
        webFontsCheck.issues.forEach(issue => {
          details.push(`     • ${issue}`);
        });
      }
    } else {
      details.push('▶️ WEB FONTS: ❌ Not detected');
      details.push('   ❌ No custom web fonts found');
    }
    
    details.push('');
    return details;
  }
  
  static formatSocialLinksResults(socialLinksCheck) {
    const details = [];
    
    if (socialLinksCheck.found) {
      // Always show as success if links are found
      details.push(`▶️ SOCIAL MEDIA: ✅ ${socialLinksCheck.links.length} link(s) found`);
      
      // Group by platform
      const platforms = [...new Set(socialLinksCheck.links.map(link => link.platform))];
      details.push(`   • Platforms: ${platforms.join(', ')}`);
      
      // Show security status
      const secureLinks = socialLinksCheck.links.filter(link => link.opensInNewTab && link.hasNoopener);
      details.push(`   • Secure external links: ${secureLinks.length}/${socialLinksCheck.links.length}`);
      
      if (socialLinksCheck.issues.length > 0) {
        details.push('   💡 Security Recommendations:');
        socialLinksCheck.issues.forEach(issue => {
          details.push(`     • ${issue}`);
        });
        details.push('   📝 Note: These are security best practices, not critical failures');
      }
    } else {
      details.push('▶️ SOCIAL MEDIA: ❌ No links found');
      details.push('   ❌ No social media links detected');
    }
    
    return details;
  }
}
