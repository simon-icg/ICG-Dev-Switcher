// Image optimization and Accessibility (A11y) checks
export class ImageChecker {
  
  static async testImages(url) {
    try {
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch page');
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const analysis = this.analyzeImages(doc);
      
      let status = 'success';
      if (analysis.missingAlt.length > 0) status = 'error';
      else if (analysis.missingDimensions.length > 0) status = 'warning';
      
      return {
        url: url,
        status: status,
        analysis: analysis,
        details: this.formatImageReport(analysis)
      };
      
    } catch (error) {
      console.error('Image check error:', error);
      return {
        url: url,
        status: 'error',
        details: [`❌ Image check failed: ${error.message}`]
      };
    }
  }

  static analyzeImages(doc) {
    const images = Array.from(doc.querySelectorAll('img'));
    
    const analysis = {
      total: images.length,
      missingAlt: [],
      emptyAlt: [], 
      validAlt: [],
      missingDimensions: [],
      lazyLoaded: 0
    };

    images.forEach(img => {
      const src = img.getAttribute('src');
      if (!src) return; 
      
      const alt = img.getAttribute('alt');
      const width = img.getAttribute('width');
      const height = img.getAttribute('height');
      const loading = img.getAttribute('loading');
      
      // 1. Accessibility Check
      if (alt === null) {
        analysis.missingAlt.push(src);
      } else if (alt.trim() === '') {
        analysis.emptyAlt.push(src);
      } else {
        analysis.validAlt.push(src);
      }
      
      // 2. Performance/CLS Check
      if (!width || !height) {
        analysis.missingDimensions.push(src);
      }
      
      // 3. Lazy Loading Check
      if (loading === 'lazy') {
        analysis.lazyLoaded++;
      }
    });

    return analysis;
  }

  static formatImageReport(analysis) {
    const report = [];
    
    // Summary Header
    report.push(`🖼️ Total Images Scanned: ${analysis.total}`);
    
    // --- NEW: Add Highlight Button if issues exist ---
    if (analysis.missingAlt.length > 0 || analysis.missingDimensions.length > 0) {
      // We add a special ID to this button so main.js can find it later
      report.push(`<button id="btn-highlight-images" class="btn-secondary" style="
        width: 100%; 
        padding: 8px; 
        margin-top: 10px; 
        margin-bottom: 10px; 
        background: #fff; 
        border: 1px solid #007cba; 
        color: #007cba; 
        border-radius: 4px; 
        cursor: pointer; 
        font-weight: 600;
      ">🔦 Highlight Issues on Page</button>`);
    }
    
    // --- 1. ALT TEXT REPORTING ---
    if (analysis.missingAlt.length === 0) {
      report.push(`✅ SEO: All images have alt attributes`);
    } else {
      report.push(`❌ SEO: ${analysis.missingAlt.length} image(s) missing ALT text`);
      
      report.push('');
      report.push('🚫 Missing ALT (Specific Files):');
      
      analysis.missingAlt.slice(0, 5).forEach(src => {
        const filename = this.getFilename(src);
        report.push(`   • ${filename}`);
      });
      
      if (analysis.missingAlt.length > 5) {
        report.push(`   • ...and ${analysis.missingAlt.length - 5} others`);
      }
    }
    
    // --- 2. CLS / DIMENSIONS REPORTING ---
    if (analysis.missingDimensions.length === 0) {
      report.push(`✅ Performance: All images have width/height`);
    } else {
      report.push(`⚠️ Performance: ${analysis.missingDimensions.length} images missing dimensions`);
      
      if (analysis.missingDimensions.length > 0) {
        const examples = analysis.missingDimensions.slice(0, 3).map(src => this.getFilename(src));
        report.push(`   Examples: ${examples.join(', ')}...`);
      }
    }

    // --- 3. LAZY LOADING ---
    if (analysis.total > 0) {
      const lazyPercent = Math.round((analysis.lazyLoaded / analysis.total) * 100);
      report.push(`⚡ Lazy Loading: ${analysis.lazyLoaded}/${analysis.total} images (${lazyPercent}%)`);
    }

    return report;
  }

  // Helper to make URLs readable
  static getFilename(src) {
    try {
      // Handle data URIs
      if (src.startsWith('data:')) return 'Base64 Image Data';
      
      // Remove query strings
      const cleanSrc = src.split('?')[0];
      
      // Get last part of path
      const filename = cleanSrc.split('/').pop();
      
      // If empty or just domain, return full src shortened
      if (!filename) return src.substring(0, 30) + '...';
      
      // Truncate if filename is massive
      return filename.length > 40 ? filename.substring(0, 35) + '...' : filename;
    } catch (e) {
      return 'Unknown Image';
    }
  }
}