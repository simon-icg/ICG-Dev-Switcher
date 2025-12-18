// Meta tags and SEO analysis
export class MetaChecker {
  static async testMetaTags(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (!response.ok) {
        return {
          url: url,
          status: 'error',
          details: [`Failed to fetch page: ${response.status}`]
        };
      }
      
      const html = await response.text();
      const metaAnalysis = this.analyzeMetaTags(html);
      
      return {
        url: url,
        status: 'success',
        analysis: metaAnalysis,
        details: this.generateMetaReport(metaAnalysis)
      };
    } catch (error) {
      console.error('Meta tags check error:', error);
      return {
        url: url,
        status: 'error',
        details: ['Meta tags check failed']
      };
    }
  }

  static analyzeMetaTags(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const analysis = {
      title: {
        content: '',
        length: 0,
        present: false
      },
      description: {
        content: '',
        length: 0,
        present: false
      },
      keywords: {
        content: '',
        count: 0,
        present: false
      },
      viewport: {
        content: '',
        present: false,
        responsive: false
      },
      charset: {
        content: '',
        present: false
      },
      openGraph: {
        title: '',
        description: '',
        image: '',
        url: '',
        type: '',
        siteName: '',
        tags: []
      },
      twitterCard: {
        card: '',
        title: '',
        description: '',
        image: '',
        site: '',
        creator: '',
        tags: []
      },
      canonical: {
        href: '',
        present: false
      },
      robots: {
        content: '',
        present: false,
        noindex: false,
        nofollow: false
      },
      hreflang: [],
      structuredData: {
        found: false,
        types: []
      }
    };

    // Title tag
    const titleElement = doc.querySelector('title');
    if (titleElement) {
      analysis.title.content = titleElement.textContent.trim();
      analysis.title.length = analysis.title.content.length;
      analysis.title.present = true;
    }

    // Meta tags
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name')?.toLowerCase();
      const property = meta.getAttribute('property')?.toLowerCase();
      const content = meta.getAttribute('content') || '';
      
      // Description
      if (name === 'description') {
        analysis.description.content = content;
        analysis.description.length = content.length;
        analysis.description.present = true;
      }
      
      // Keywords
      if (name === 'keywords') {
        analysis.keywords.content = content;
        analysis.keywords.count = content.split(',').filter(k => k.trim()).length;
        analysis.keywords.present = true;
      }
      
      // Viewport
      if (name === 'viewport') {
        analysis.viewport.content = content;
        analysis.viewport.present = true;
        analysis.viewport.responsive = content.includes('width=device-width');
      }
      
      // Charset
      if (meta.hasAttribute('charset')) {
        analysis.charset.content = meta.getAttribute('charset');
        analysis.charset.present = true;
      }
      
      // Robots
      if (name === 'robots') {
        analysis.robots.content = content;
        analysis.robots.present = true;
        analysis.robots.noindex = content.toLowerCase().includes('noindex');
        analysis.robots.nofollow = content.toLowerCase().includes('nofollow');
      }
      
      // Open Graph
      if (property?.startsWith('og:')) {
        const ogProperty = property.substring(3);
        switch (ogProperty) {
          case 'title':
            analysis.openGraph.title = content;
            break;
          case 'description':
            analysis.openGraph.description = content;
            break;
          case 'image':
            analysis.openGraph.image = content;
            break;
          case 'url':
            analysis.openGraph.url = content;
            break;
          case 'type':
            analysis.openGraph.type = content;
            break;
          case 'site_name':
            analysis.openGraph.siteName = content;
            break;
        }
        analysis.openGraph.tags.push({ property: ogProperty, content });
      }
      
      // Twitter Card
      if (name?.startsWith('twitter:')) {
        const twitterProperty = name.substring(8);
        switch (twitterProperty) {
          case 'card':
            analysis.twitterCard.card = content;
            break;
          case 'title':
            analysis.twitterCard.title = content;
            break;
          case 'description':
            analysis.twitterCard.description = content;
            break;
          case 'image':
            analysis.twitterCard.image = content;
            break;
          case 'site':
            analysis.twitterCard.site = content;
            break;
          case 'creator':
            analysis.twitterCard.creator = content;
            break;
        }
        analysis.twitterCard.tags.push({ property: twitterProperty, content });
      }
    });

    // Canonical link
    const canonicalLink = doc.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      analysis.canonical.href = canonicalLink.getAttribute('href') || '';
      analysis.canonical.present = true;
    }

    // Hreflang
    const hreflangLinks = doc.querySelectorAll('link[rel="alternate"][hreflang]');
    hreflangLinks.forEach(link => {
      analysis.hreflang.push({
        hreflang: link.getAttribute('hreflang'),
        href: link.getAttribute('href')
      });
    });

    // Structured data (JSON-LD)
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    if (jsonLdScripts.length > 0) {
      analysis.structuredData.found = true;
      jsonLdScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type']) {
            analysis.structuredData.types.push(data['@type']);
          }
        } catch (e) {
          // Invalid JSON-LD
        }
      });
    }

    return analysis;
  }

  static generateMetaReport(analysis) {
    const report = [];
    
    // Title analysis
    if (analysis.title.present) {
      if (analysis.title.length >= 30 && analysis.title.length <= 60) {
        report.push(`✅ Title: ${analysis.title.length} chars (optimal)`);
      } else if (analysis.title.length < 30) {
        report.push(`⚠️ Title: ${analysis.title.length} chars (too short)`);
      } else {
        report.push(`⚠️ Title: ${analysis.title.length} chars (too long)`);
      }
    } else {
      report.push('❌ Title: Missing');
    }
    
    // Description analysis
    if (analysis.description.present) {
      if (analysis.description.length >= 120 && analysis.description.length <= 160) {
        report.push(`✅ Description: ${analysis.description.length} chars (optimal)`);
      } else if (analysis.description.length < 120) {
        report.push(`⚠️ Description: ${analysis.description.length} chars (too short)`);
      } else {
        report.push(`⚠️ Description: ${analysis.description.length} chars (too long)`);
      }
    } else {
      report.push('❌ Description: Missing');
    }
    
    // Viewport
    if (analysis.viewport.present) {
      if (analysis.viewport.responsive) {
        report.push('✅ Viewport: Mobile-friendly');
      } else {
        report.push('⚠️ Viewport: Not responsive');
      }
    } else {
      report.push('❌ Viewport: Missing');
    }
    
    // Charset
    if (analysis.charset.present) {
      report.push(`✅ Charset: ${analysis.charset.content}`);
    } else {
      report.push('⚠️ Charset: Not specified');
    }
    
    // Canonical URL
    if (analysis.canonical.present) {
      report.push('✅ Canonical URL: Present');
    } else {
      report.push('⚠️ Canonical URL: Missing');
    }
    
    // Open Graph
    const ogTagCount = analysis.openGraph.tags.length;
    if (ogTagCount > 0) {
      report.push(`✅ Open Graph: ${ogTagCount} tags found`);
    } else {
      report.push('⚠️ Open Graph: No tags found');
    }
    
    // Twitter Card
    const twitterTagCount = analysis.twitterCard.tags.length;
    if (twitterTagCount > 0) {
      report.push(`✅ Twitter Card: ${twitterTagCount} tags found`);
    } else {
      report.push('⚠️ Twitter Card: No tags found');
    }
    
    // Structured Data
    if (analysis.structuredData.found) {
      const types = [...new Set(analysis.structuredData.types)];
      report.push(`✅ Structured Data: ${types.join(', ')}`);
    } else {
      report.push('⚠️ Structured Data: None found');
    }
    
    // Hreflang
    if (analysis.hreflang.length > 0) {
      report.push(`✅ Hreflang: ${analysis.hreflang.length} alternatives`);
    }
    
    // Robots meta
    if (analysis.robots.present) {
      if (analysis.robots.noindex || analysis.robots.nofollow) {
        report.push(`⚠️ Robots: ${analysis.robots.content} (restrictive)`);
      } else {
        report.push(`✅ Robots: ${analysis.robots.content}`);
      }
    }
    
    return report;
  }
}
