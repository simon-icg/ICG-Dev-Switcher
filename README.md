# 🛠️ ICG Dev Tools & Security Audit

A comprehensive Chrome Extension for the ICG development team. This tool combines environment switching with deep technical auditing capabilities.

## 🚀 Features

### 1. Environment Switcher (Popup)
Click the extension icon to access the Quick Switcher.
* **Auto-Detect:** Automatically finds the `dev.` or `project.dev` equivalent of the current site.
* **Custom Override:** Manually map a live site to a specific dev URL (saved in local storage).
* **Visual Status:** Displays a green checkmark badge on the icon when viewing an ICG-managed site.

### 2. Deep Audit Tools (Side Panel)
Click the **"🔒 Open Audit Tools"** button in the popup to open the side panel suite.

* **🌐 URL & Server Check:**
    * Validates HTTP vs HTTPS accessibility.
    * Checks for proper 301 redirects (Non-WWW vs WWW).
    * **Cloudflare Detection:** Identifies if the site is behind Cloudflare (via headers or IP range).
    * Displays the real Server IP.

* **🤖 Robots.txt Analyzer:**
    * Reads `robots.txt` and parses rules.
    * Highlights risky `Disallow: /` rules.
    * Detects Sitemap declarations.

* **📊 Analytics Detector:**
    * Scans for Google Analytics (UA/GA4), GTM, Facebook Pixel, Hotjar, etc.
    * Detects Cookie Consent providers (Cookiebot, OneTrust, etc.).

* **🔐 SSL & Security:**
    * Checks Certificate validity and expiration.
    * **Security Headers:** Validates HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.

* **🏷️ SEO & Meta:**
    * Validates Title/Description length.
    * Checks Canonical tags, OG (Open Graph) tags, and Twitter Cards.

* **🎨 Content & Style:**
    * **Copyright Check:** Ensures the footer copyright year is current.
    * **Web Fonts:** Lists Google Fonts, Adobe Fonts, or custom `@font-face` usage.
    * **Social Links:** Checks if social links open in new tabs and use `rel="noopener"`.

## 📦 Installation (Development)

1.  Clone this repository.
2.  Open Chrome and go to `chrome://extensions/`.
3.  Enable **Developer Mode** (top right).
4.  Click **Load Unpacked**.
5.  Select this folder.

## 🚢 Release Notes
* **v1.1.0:** Merged Dev Switcher with new Side Panel Audit Tools. Added Cloudflare and SSL security headers checks.