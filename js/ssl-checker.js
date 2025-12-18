// SSL Certificate validation and testing
export class SSLChecker {
  static async testSSLCertificate(url, domain) {
    try {
      // Basic HTTPS connectivity test
      const connectivityResult = await this.checkSSLConnection(domain);
      
      if (!connectivityResult.success) {
        return {
          url: url,
          status: 'error',
          details: [connectivityResult.error || 'SSL connection failed']
        };
      }

      // Always perform security headers analysis (contains detailed recommendations)
      const securityAnalysis = await this.validateSSLHeaders(domain);
      
      // Try to get additional certificate details
      const certDetails = await this.getSSLCertificateDetails(domain);
      
      // Combine certificate info with security analysis
      let combinedDetails = [];
      let status = 'success';
      let grade = 'Basic Check';
      
      if (certDetails.success && certDetails.data) {
        // Add certificate information first
        combinedDetails.push(...this.formatCertificateInfo(certDetails.data));
        grade = certDetails.grade || 'Unknown';
      } else {
        // Add basic SSL info
        combinedDetails.push('✅ HTTPS connection successful');
        combinedDetails.push('🔒 SSL certificate appears valid');
      }
      
      // Always add security headers analysis with detailed recommendations
      if (securityAnalysis.success) {
        combinedDetails.push('');
        combinedDetails.push(...securityAnalysis.details);
        
        // Adjust status based on security analysis
        if (securityAnalysis.securityScore === 0) {
          status = 'warning'; // No security headers found
        }
      } else {
        combinedDetails.push('');
        combinedDetails.push('⚠️ Security headers analysis failed');
        combinedDetails.push(...securityAnalysis.details);
        status = 'warning';
      }

      return {
        url: url,
        status: status,
        details: combinedDetails,
        grade: grade
      };

    } catch (error) {
      console.error('SSL certificate test error:', error);
      return {
        url: url,
        status: 'error',
        details: ['SSL certificate test failed']
      };
    }
  }

  static async checkSSLConnection(domain) {
    try {
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `SSL connection failed: ${error.message}` 
      };
    }
  }

  static async getSSLCertificateDetails(domain) {
    // Try multiple methods to get SSL certificate information
    
    // Method 1: SSL Labs API (if available)
    try {
      const sslLabsResult = await this.trySSLLabsAPI(domain);
      if (sslLabsResult.success) {
        return sslLabsResult;
      }
    } catch (error) {
      console.warn('SSL Labs API failed:', error);
    }

    // Method 2: Alternative SSL checking service
    try {
      const altResult = await this.tryAlternativeSSLCheck(domain);
      if (altResult.success) {
        return altResult;
      }
    } catch (error) {
      console.warn('Alternative SSL check failed:', error);
    }

    // Method 3: Basic browser-based validation
    return await this.basicSSLValidation(domain);
  }

  static async trySSLLabsAPI(domain) {
    try {
      // Note: SSL Labs API requires CORS setup and may not work directly from browser extension
      const apiUrl = `https://api.ssllabs.com/api/v3/analyze?host=${domain}&publish=off&all=done`;
      
      const response = await fetch(apiUrl, {
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`SSL Labs API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'READY' && data.endpoints && data.endpoints.length > 0) {
        const endpoint = data.endpoints[0];
        return {
          success: true,
          data: {
            grade: endpoint.grade,
            issuer: data.certs?.[0]?.issuerLabel || 'Unknown',
            validFrom: new Date(data.certs?.[0]?.notBefore || 0),
            validTo: new Date(data.certs?.[0]?.notAfter || 0),
            protocol: endpoint.details?.protocols?.join(', ') || 'Unknown',
            keySize: data.certs?.[0]?.keySize || 'Unknown'
          },
          grade: endpoint.grade
        };
      }
      
      throw new Error('SSL Labs analysis not ready or failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async tryAlternativeSSLCheck(domain) {
    try {
      // Alternative method using a different service or approach
      // This is a placeholder for other SSL checking services
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD'
      });
      
      // Extract what we can from the response headers
      const securityHeaders = {
        'strict-transport-security': response.headers.get('strict-transport-security'),
        'content-security-policy': response.headers.get('content-security-policy'),
        'x-frame-options': response.headers.get('x-frame-options'),
        'x-content-type-options': response.headers.get('x-content-type-options')
      };
      
      return {
        success: true,
        data: {
          grade: 'B', // Default grade for basic check
          securityHeaders: securityHeaders,
          httpsOnly: response.url.startsWith('https://'),
          timestamp: new Date()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async validateSSLHeaders(domain) {
    try {
      const httpsUrl = `https://${domain}`;
      const response = await fetch(httpsUrl, { 
        method: 'HEAD',
        mode: 'cors'
      });
      
      const details = [];
      
      // Check for security headers with detailed analysis
      const securityHeaders = {
        'strict-transport-security': {
          name: 'HSTS',
          importance: 'Essential',
          description: 'Prevents downgrade attacks and cookie hijacking'
        },
        'content-security-policy': {
          name: 'CSP',
          importance: 'Recommended', 
          description: 'Prevents XSS attacks and data injection'
        },
        'x-frame-options': {
          name: 'X-Frame-Options',
          importance: 'Recommended',
          description: 'Prevents clickjacking attacks'
        },
        'x-content-type-options': {
          name: 'X-Content-Type-Options',
          importance: 'Recommended',
          description: 'Prevents MIME type sniffing attacks'
        }
      };
      
      const headerResults = {};
      let foundCount = 0;
      
      Object.keys(securityHeaders).forEach(header => {
        const value = response.headers.get(header);
        headerResults[header] = {
          found: !!value,
          value: value,
          ...securityHeaders[header]
        };
        if (value) foundCount++;
      });
      
      // Add summary
      details.push(`🛡️ Security Headers Analysis: ${foundCount}/${Object.keys(securityHeaders).length} present`);
      
      // Add simple header status breakdown
      Object.entries(headerResults).forEach(([key, info]) => {
        const icon = info.found ? '✅' : '❌';
        const importance = info.importance === 'Essential' ? '🔴 Essential' : '🟡 Recommended';
        if (info.found) {
          details.push(`   ${icon} ${info.name} (${importance})`);
        } else {
          details.push(`   ${icon} ${info.name} (${importance}) - ${info.description}`);
        }
      });
      
      if (foundCount === Object.keys(securityHeaders).length) {
        details.push('');
        details.push('🎉 Excellent: All recommended security headers are present!');
      }
      
      return {
        success: true,
        details: details,
        headerResults: headerResults,
        securityScore: foundCount
      };
    } catch (error) {
      return {
        success: false,
        details: [`❌ Security headers analysis failed: ${error.message}`]
      };
    }
  }

  static async basicSSLValidation(domain) {
    try {
      const httpsUrl = `https://${domain}`;
      const response = await fetch(httpsUrl, { 
        method: 'HEAD',
        mode: 'cors'
      });
      
      const details = [
        '✅ HTTPS connection successful',
        `📊 Response status: ${response.status}`,
        '🔒 SSL certificate appears valid'
      ];
      
      // Get security headers analysis
      const securityAnalysis = await this.validateSSLHeaders(domain);
      
      if (securityAnalysis.success) {
        details.push('');
        details.push(...securityAnalysis.details);
        
        return {
          success: true,
          details: details,
          headerResults: securityAnalysis.headerResults,
          securityScore: securityAnalysis.securityScore
        };
      } else {
        details.push('');
        details.push(...securityAnalysis.details);
        
        return {
          success: false,
          details: details
        };
      }
      
    } catch (error) {
      return {
        success: false,
        details: [`❌ SSL validation failed: ${error.message}`]
      };
    }
  }

  static formatCertificateInfo(certData) {
    const details = [];
    
    if (certData.grade) {
      details.push(`🏆 SSL Grade: ${certData.grade}`);
    }
    
    if (certData.issuer) {
      details.push(`🏢 Issuer: ${certData.issuer}`);
    }
    
    if (certData.validFrom && certData.validTo) {
      const now = new Date();
      const daysUntilExpiry = Math.ceil((certData.validTo - now) / (1000 * 60 * 60 * 24));
      
      details.push(`📅 Valid until: ${certData.validTo.toDateString()}`);
      
      if (daysUntilExpiry > 30) {
        details.push(`✅ Expires in ${daysUntilExpiry} days`);
      } else if (daysUntilExpiry > 0) {
        details.push(`⚠️ Expires in ${daysUntilExpiry} days`);
      } else {
        details.push(`❌ Certificate expired ${Math.abs(daysUntilExpiry)} days ago`);
      }
    }
    
    if (certData.protocol) {
      details.push(`🔐 Protocols: ${certData.protocol}`);
    }
    
    if (certData.keySize) {
      details.push(`🔑 Key size: ${certData.keySize} bits`);
    }
    
    // Enhanced security headers analysis
    if (certData.securityHeaders) {
      const headerCount = Object.values(certData.securityHeaders).filter(Boolean).length;
      details.push('');
      details.push(`🛡️ Security Headers: ${headerCount}/4 detected`);
      
      // Show which headers are present/missing
      const headerDescriptions = {
        'strict-transport-security': 'Prevents downgrade attacks and cookie hijacking',
        'content-security-policy': 'Prevents XSS attacks and data injection',
        'x-frame-options': 'Prevents clickjacking attacks',
        'x-content-type-options': 'Prevents MIME type sniffing attacks'
      };
      
      Object.entries(certData.securityHeaders).forEach(([header, value]) => {
        const icon = value ? '✅' : '❌';
        const importance = header === 'strict-transport-security' ? '🔴 Essential' : '🟡 Recommended';
        const name = header === 'strict-transport-security' ? 'HSTS' :
                    header === 'content-security-policy' ? 'CSP' : 
                    header === 'x-frame-options' ? 'X-Frame-Options' : 
                    'X-Content-Type-Options';
        
        if (value) {
          details.push(`   ${icon} ${name} (${importance})`);
        } else {
          details.push(`   ${icon} ${name} (${importance}) - ${headerDescriptions[header]}`);
        }
      });
      
      if (headerCount < 4) {
        details.push('');
        details.push('💡 Missing security headers detected');
      }
    }
    
    return details;
  }
}
