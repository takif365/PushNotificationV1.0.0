/**
 * Generate HTML snippet code for embedding in client websites
 * This code will load the PNS loader with domain-specific configuration
 */
export function generateSnippet(domain, baseUrl) {
    return `<!-- PNS Snippet for ${domain.name} -->
<!-- Insert this code in the <head> section of your website -->
<script>
  (function() {
    const script = document.createElement('script');
    script.src = '${baseUrl}/standalone/pns-loader.js';
    script.dataset.domainId = '${domain.id}';
    script.dataset.userId = '${domain.userId}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
}

/**
 * Generate installation instructions for a domain
 */
export function generateInstructions(domain, snippetCode, serviceWorkerUrl) {
    return `
# Installation Instructions for ${domain.name}

## Step 1: Add the Snippet Code

Copy the code below and paste it in the **<head>** section of your website:

\`\`\`html
${snippetCode}
\`\`\`

## Step 2: Verify Installation

1. Open your website in a browser
2. Open Developer Console (F12)
3. Look for messages starting with **[PNS]**
4. You should see: "PNS Loader initialized"

## Step 3: Test Notifications

1. Allow notifications when prompted
2. Your site will appear in the "Domains" list with active subscribers
3. You can now send test notifications from the dashboard

## Service Worker URL

Your custom service worker is available at:
${serviceWorkerUrl}

---

**Need Help?** Check the documentation or contact support.
  `.trim();
}
