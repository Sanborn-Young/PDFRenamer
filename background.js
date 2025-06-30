// --- Domain translation map logic ---
let domainTranslationMap = {};

// Load the CSV into a map at startup
async function loadDomainTranslationMap() {
  const url = chrome.runtime.getURL('domain_map.csv');
  try {
    const response = await fetch(url);
    const text = await response.text();
    text.split('\n').forEach(line => {
      const [domain, label] = line.split(',').map(x => x && x.trim());
      if (domain && label) {
        domainTranslationMap[domain.toLowerCase()] = label;
      }
    });
    console.log('Domain map loaded:', domainTranslationMap);
  } catch (e) {
    console.error('Could not load domain_map.csv:', e);
  }
}
loadDomainTranslationMap();

// --- Main download renaming logic ---
chrome.downloads.onDeterminingFilename.addListener(function(downloadItem, suggest) {
  // Only process PDF files
  if (downloadItem.filename.toLowerCase().endsWith('.pdf')) {
    console.log('PDF detected:', downloadItem.filename);

    // Handle asynchronously to read clipboard from storage
    handlePDFRename(downloadItem, suggest);
    return true; // Indicates we're handling this asynchronously
  }

  // For non-PDF files, use original filename
  suggest({ filename: downloadItem.filename });
});

async function handlePDFRename(downloadItem, suggest) {
  try {
    // Get current date in YYMMDD format
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = year + month + day;

    // Get clipboard content from chrome.storage.local
    let clipboardText = '';
    try {
      const result = await chrome.storage.local.get('clipboardText');
      clipboardText = result.clipboardText || '';
      console.log('Clipboard content from storage:', clipboardText);
    } catch (error) {
      console.log('Could not read clipboard from storage:', error);
    }

    // Extract and sanitize the domain
    let domainPart = '';
    if (downloadItem.url) {
      try {
        const urlObj = new URL(downloadItem.url);
        let host = urlObj.hostname;
        // Remove 'www.' prefix if present
        if (host.startsWith('www.')) host = host.substring(4);

        // Get the main part of the domain
        if (host.endsWith('.com')) {
          domainPart = host.split('.').slice(-2, -1)[0];
        } else {
          const parts = host.split('.');
          if (parts.length >= 2) {
            domainPart = parts[parts.length - 2];
          } else {
            domainPart = parts[0];
          }
        }
        // Lowercase for lookup in translation map
        let lookupDomain = domainPart.toLowerCase();
        // Use translation if available
        if (domainTranslationMap[lookupDomain]) {
          domainPart = domainTranslationMap[lookupDomain];
        } else {
          // Capitalize first letter for aesthetics
          domainPart = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
        }
        // Remove any non-alphanumeric characters
        domainPart = domainPart.replace(/[^a-zA-Z0-9]/g, '');
      } catch (e) {
        domainPart = 'UnknownSite';
      }
    }

    // Create new filename
    let newFilename;
    if (clipboardText && clipboardText.trim()) {
      const sanitizedClipboard = sanitizeFilename(clipboardText.trim().substring(0, 50));
      newFilename = `${datePrefix}_${sanitizedClipboard}_${domainPart}.pdf`;
    } else {
      // Use original filename if clipboard is empty
      const originalName = downloadItem.filename.replace('.pdf', '');
      newFilename = `${datePrefix}_${originalName}_${domainPart}.pdf`;
    }

    console.log('New filename:', newFilename);

    // Suggest the new filename
    suggest({
      filename: newFilename,
      conflictAction: 'uniquify' // Automatically handles duplicate names
    });

    // Optionally clear clipboardText after use:
    // await chrome.storage.local.remove('clipboardText');

  } catch (error) {
    console.error('Error in handlePDFRename:', error);
    // Fallback to original filename
    suggest({ filename: downloadItem.filename });
  }
}

// Sanitize filename for Windows compatibility
function sanitizeFilename(input) {
  // Remove invalid Windows filename characters
  return input
    .replace(/[<>:"/\\|?*]/g, '') // Remove forbidden characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .trim();
}
