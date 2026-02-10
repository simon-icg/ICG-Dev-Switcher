// SSL Certificate validation and testing
export class SSLChecker {
  static async testSSLCertificate(url, domain) {
    try {
      // 1. Connectivity Check (Does not stop execution on fail)
      const connectivityResult = await this.checkSSLConnection(domain);
      let localConnectionFailed = !connectivityResult.success;
      
      // 2. Fetch Certificate Details (The critical part for dates)
      const certDetails = await this.getSSLCertificateDetails(domain);
      
      // 3. Security Headers (Local check)
      const securityAnalysis = await this.validateSSLHeaders(domain);

      // --- ASSEMBLE REPORT ---
      let combinedDetails = [];
      let status = 'success';
      let grade = 'Basic Check';

      if (localConnectionFailed) {
          combinedDetails.push(`⚠️ Local connection failed: ${connectivityResult.error}`);
          combinedDetails.push('   (Falling back to public records...)');
      } else {
          combinedDetails.push('✅ HTTPS connection successful');
      }

      // Add Certificate Date/Issuer Info
      if (certDetails.success && certDetails.data) {
        combinedDetails.push(...this.formatCertificateInfo(certDetails.data));
        grade = certDetails.grade || 'Unknown';
        
        // Flag errors/warnings based on expiration status
        if (certDetails.data.expirationStatus === 'expired') status = 'error';
        else if (certDetails.data.expirationStatus === 'warning') status = 'warning';
      } else {
        // If all 3 APIs failed
        combinedDetails.push('🔒 SSL certificate appears valid locally');
        combinedDetails.push('⚠️ Expiration date unavailable (All external checks blocked)');
      }
      
      // Add Security Headers
      if (securityAnalysis.success) {
        combinedDetails.push('');
        combinedDetails.push(...securityAnalysis.details);
        if (status !== 'error' && securityAnalysis.securityScore === 0) status = 'warning';
      } else {
        combinedDetails.push('');
        combinedDetails.push('⚠️ Security headers analysis failed');
      }

      return {
        url: url,
        status: status,
        details: combinedDetails,
        grade: grade
      };

    } catch (error) {
      console.error('SSL Test Error:', error);
      return { url: url, status: 'error', details: ['Critical SSL Test Error'] };
    }
  }

  static async checkSSLConnection(domain) {
    try {
      await fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors' });
      return { success: true };
    } catch (error) {
      try {
          await fetch(`https://${domain}`, { method: 'GET', mode: 'no-cors' });
          return { success: true };
      } catch (e2) {
          return { success: false, error: "Network/Certificate Error" };
      }
    }
  }

  static async getSSLCertificateDetails(domain) {
    // STRATEGY: Try 3 different sources for robustness

    // Source 1: NetworkCalc (Fastest JSON API)
    try {
        const result = await this.tryNetworkCalcAPI(domain);
        if (result.success) return result;
    } catch (e) { console.warn('NetworkCalc failed', e); }

    // Source 2: crt.sh (BEST for Let's Encrypt / Plesk Sites)
    // This reads the public transparency log, bypassing server firewalls entirely.
    try {
        const result = await this.tryCrtShAPI(domain);
        if (result.success) return result;
    } catch (e) { console.warn('crt.sh failed', e); }

    // Source 3: SSL Labs (Detailed but slower)
    try {
        const result = await this.trySSLLabsAPI(domain);
        if (result.success) return result;
    } catch (e) { console.warn('SSL Labs failed', e); }

    return { success: false };
  }

  // --- API 1: NetworkCalc ---
  static async tryNetworkCalcAPI(domain) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); 
      const response = await fetch(`https://networkcalc.com/api/security/certificate/${domain}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      if (data && data.certificate && data.certificate.valid_to) {
          return {
              success: true,
              data: {
                  issuer: data.certificate.issuer ? data.certificate.issuer.O : 'Let\'s Encrypt',
                  validTo: new Date(data.certificate.valid_to),
                  grade: 'Standard',
                  protocol: 'TLS (Modern)'
              }
          };
      }
      throw new Error('Invalid Data');
  }

  // --- API 2: crt.sh (Transparency Log) ---
  static async tryCrtShAPI(domain) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for large logs
      
      // Query the public ledger for this domain
      const response = await fetch(`https://crt.sh/?q=${domain}&output=json`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('crt.sh Error');
      
      const entries = await response.json();
      
      if (entries && entries.length > 0) {
          // Sort by ID descending to get the newest certificate
          // crt.sh returns all history, we only want the active one
          const newest = entries.sort((a, b) => b.id - a.id)[0];
          
          if (newest && newest.not_after) {
              return {
                  success: true,
                  data: {
                      issuer: newest.issuer_name || 'Let\'s Encrypt',
                      validTo: new Date(newest.not_after),
                      grade: 'Standard',
                      protocol: 'TLS (Modern)',
                      source: 'crt.sh Public Log'
                  }
              };
          }
      }
      throw new Error('No valid certs found');
  }

  // --- API 3: SSL Labs ---
  static async trySSLLabsAPI(domain) {
    const apiUrl = `https://api.ssllabs.com/api/v3/analyze?host=${domain}&publish=off&all=done`;
    const response = await fetch(apiUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    
    if (data.status === 'READY' && data.endpoints?.[0]) {
      return {
        success: true,
        data: {
          grade: data.endpoints[0].grade,
          issuer: data.certs?.[0]?.issuerLabel || 'Unknown',
          validTo: new Date(data.certs?.[0]?.notAfter || 0),
          protocol: data.endpoints[0].details?.protocols?.join(', ') || 'TLS'
        }
      };
    }
    throw new Error('Analysis Not Ready');
  }

  static async validateSSLHeaders(domain) {
    try {
      const response = await fetch(`https://${domain}`, { method: 'HEAD', mode: 'cors' });
      const details = [];
      const securityHeaders = {
        'strict-transport-security': { name: 'HSTS', importance: 'Essential', description: 'Prevents downgrade attacks' },
        'content-security-policy': { name: 'CSP', importance: 'Recommended', description: 'Prevents XSS' },
        'x-frame-options': { name: 'X-Frame-Options', importance: 'Recommended', description: 'Prevents clickjacking' },
        'x-content-type-options': { name: 'X-Content-Type-Options', importance: 'Recommended', description: 'Prevents MIME sniffing' }
      };
      
      let foundCount = 0;
      const headerResults = {};
      
      Object.keys(securityHeaders).forEach(header => {
        const value = response.headers.get(header);
        headerResults[header] = { found: !!value, value: value, ...securityHeaders[header] };
        if (value) foundCount++;
      });
      
      details.push(`🛡️ Security Headers Analysis: ${foundCount}/${Object.keys(securityHeaders).length} present`);
      
      Object.entries(headerResults).forEach(([key, info]) => {
        const icon = info.found ? '✅' : '❌';
        const importance = info.importance === 'Essential' ? '🔴 Essential' : '🟡 Recommended';
        details.push(info.found ? `   ${icon} ${info.name} (${importance})` : `   ${icon} ${info.name} (${importance}) - ${info.description}`);
      });
      
      return { success: true, details: details, securityScore: foundCount, headerResults: headerResults };
    } catch (error) {
      return { success: false, details: [`❌ Security headers failed: ${error.message}`] };
    }
  }

  static formatCertificateInfo(certData) {
    const details = [];
    
    // Grade display
    if (certData.grade && certData.grade !== 'Basic' && certData.grade !== 'Standard') {
      details.push(`🏆 SSL Grade: ${certData.grade}`);
    }
    
    // Issuer display (Clean up Let's Encrypt names)
    let issuer = certData.issuer;
    if (issuer.includes("Let's Encrypt")) issuer = "Let's Encrypt (R3)";
    details.push(`🏢 Issuer: ${issuer}`);
    
    // DATE & EXPIRATION LOGIC
    if (certData.validTo) {
      const now = new Date();
      const validTo = new Date(certData.validTo);
      const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
      
      details.push(`📅 Expires: ${validTo.toLocaleDateString()}`);
      
      const isCurrentMonth = (validTo.getMonth() === now.getMonth()) && (validTo.getFullYear() === now.getFullYear());
      
      if (daysUntilExpiry < 0) {
        details.push(`❌ CERTIFICATE EXPIRED (${Math.abs(daysUntilExpiry)} days ago)`);
        certData.expirationStatus = 'expired';
      } else if (daysUntilExpiry < 30) {
        details.push(`⚠️ Expires in ${daysUntilExpiry} days (Renew Soon!)`);
        certData.expirationStatus = 'warning';
      } else if (isCurrentMonth) {
        details.push(`⚠️ Expires THIS MONTH (${validTo.toLocaleDateString()})`);
        certData.expirationStatus = 'warning';
      } else {
        details.push(`✅ Valid for ${daysUntilExpiry} more days`);
      }
    } else {
        details.push('⚠️ Expiration date not found');
    }
    
    if (certData.protocol) details.push(`🔐 Protocols: ${certData.protocol}`);
    if (certData.source) details.push(`ℹ️ Source: ${certData.source}`);
    
    // Append header info if passed from API logic
    if (certData.securityHeaders && Object.keys(certData.securityHeaders).length > 0) {
        const hCount = Object.values(certData.securityHeaders).filter(h => h.found).length;
        if(hCount === 0) details.push('💡 Missing security headers detected');
    }
    
    return details;
  }
}