# 🛠️ ICG Dev Tools & Security Audit

A comprehensive Chrome Extension for the ICG development team. This tool combines environment switching with deep technical auditing and visual debugging capabilities.

## 🚀 Features

### 1. Designer Tools (Popup)
Click the **"📐 Get Asset Sizes"** button in the popup to launch the interactive asset sizer.
* **X-Ray Selection:** Hover over any image on the page (even through transparent overlays, sliders, or `::after` elements) to highlight it.
* **Automated Breakpoint Scanner:** Clicks trigger an invisible background scan that tests the image against 6 standard agency breakpoints (320px up to 1920px).
* **@2x Export Calculation:** Instantly calculates the absolute maximum dimensions the image will ever render at, providing the exact `@2x` retina export size for designers.
* **Source File Detection:** Displays the actual intrinsic dimensions of the currently loaded image file to help spot massive, unoptimized uploads.
* **Object-Fit Detection:** Warns if the image uses `object-fit: cover` and might be cropped.

### 2. Environment Switcher (Popup)
* **Auto-Detect:** Automatically finds the `dev.` or `project.dev` equivalent of the current site.
* **Custom Override:** Manually map a live site to a specific dev URL (saved in local storage).
* **Visual Status:** Displays a green checkmark badge on the icon when viewing an ICG-managed site.

### 3. Deep Audit Tools (Side Panel)
Click the **"🔒 Open Audit Tools"** button in the popup to open the side panel suite.

* **🎨 Content & Style:**
    * **Copyright Check:** Ensures the footer copyright year is current.
    * **Web Fonts:** Lists Google Fonts, Adobe Fonts, or custom `@font-face` usage.
    * **Social Links:** Checks if social links open in new tabs and use `rel="noopener"`.

* **📊 Analytics Detector:**
    * Scans for Google Analytics (UA/GA4), GTM, Facebook Pixel, Hotjar, etc.
    * **Duplicate Detection:** Flags if GA4 or GTM tags are installed multiple times.
    * **Code Hygiene:** Warns about deprecated Universal Analytics tags.

* **🔐 SSL & Security:**
    * **Certificate Expiration:** Checks validity periods and warns if expiring within the current month.
    * **Deep Verification:** Uses public transparency logs (crt.sh) and NetworkCalc to verify Let's Encrypt/Plesk certificates even if the local network blocks the request.
    * **Security Headers:** Validates HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.

* **🌐 HTTPS & Redirects:**
    * Validates HTTP vs HTTPS accessibility.
    * Checks for proper 301 redirects (Non-WWW vs WWW).
    * **Cloudflare Detection:** Identifies if the site is behind Cloudflare.

* **🤖 Robots.txt Analyzer:**
    * Reads `robots.txt` and parses rules.
    * Highlights risky `Disallow: /` rules.
    * Detects Sitemap declarations.

* **🏷️ SEO & Meta:**
    * Validates Title/Description length.
    * Checks Canonical tags, OG (Open Graph) tags, and Twitter Cards.

* **🖼️ Image & Accessibility:**
    * Scans all images for missing `alt` tags (SEO/A11y risk).
    * Checks for missing `width` and `height` attributes (CLS performance risk).
    * **Visual Highlighter:** Click "Highlight Issues" to draw Red (Critical) or Yellow (Warning) borders around problematic images directly on the webpage.

## 📦 Installation (Development)

1.  Clone this repository.
2.  Open Chrome and go to `chrome://extensions/`.
3.  Enable **Developer Mode** (top right).
4.  Click **Load Unpacked**.
5.  Select this folder.

## 🚢 Release Notes
* **v1.4.1:** Optimized the Asset Sizer. Capped automated breakpoints at 1920px for realistic `@2x` retina sizing and added detection of current intrinsic image file dimensions.
* **v1.4.0:** Added the **Interactive Asset Sizer** tool with X-Ray element selection and automated breakpoint scanning for Designers. Reorganized the popup UI.
* **v1.3.0:** Upgraded the SSL checker to use multi-source verification (NetworkCalc + crt.sh).
* **v1.2.0:** Added Visual Image Highlighter, Accessibility checks, and enhanced duplicate Analytics tag detection.
* **v1.1.0:** Merged Dev Switcher with Side Panel Audit Tools.