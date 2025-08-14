let domainTranslationMap = {};
let isMapLoaded = false;

// --- Register the message listener immediately so popup.js never misses it ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getPreviewFilename') {
    buildSuggestedFilename({ url: msg.url, filename: msg.filename || 'preview.pdf' })
      .then(name => sendResponse({ filename: name }))
      .catch(err => {
        console.warn('[PDF Auto-Renamer] Preview build error:', err);
        sendResponse({ filename: null });
      });
    return true; // Keep message channel open for async
  }
});

// --- Async init sequence ---
(async function init() {
  await loadDomainTranslationMap();

  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    chrome.storage.sync.get({ enabled: true }, async ({ enabled }) => {
      try {
        if (
          enabled &&
          (downloadItem.mime === 'application/pdf' ||
            (downloadItem.filename &&
             downloadItem.filename.toLowerCase().endsWith('.pdf')))
        ) {
          const newName = await buildSuggestedFilename(downloadItem);
          if (newName) {
            suggest({ filename: newName, conflictAction: 'uniquify' });
            return;
          }
        }
      } catch (e) {
        console.warn('[PDF Auto-Renamer] Error suggesting filename:', e);
      }
      // Fallback to original filename
      suggest({ filename: downloadItem.filename });
    });
    return true;
  });
})();

// --- Load domain translation CSV ---
async function loadDomainTranslationMap() {
  try {
    const res = await fetch(chrome.runtime.getURL('domain_map.csv'));
    const text = await res.text();
    const map = {};
    text.split('\n').forEach((raw) => {
      const line = raw.replace(/\r/g, '').trim();
      if (!line || line.startsWith('#')) return; // skip empty/comment lines
      const [domain, label] = line.split(',').map(x => (x || '').trim());
      if (domain && label) {
        map[domain.toLowerCase()] = label;
      }
    });
    domainTranslationMap = map;
    isMapLoaded = true;
    console.info(`[PDF Auto-Renamer] Loaded ${Object.keys(domainTranslationMap).length} domain mappings.`);
  } catch (e) {
    console.error('[PDF Auto-Renamer] Failed to load domain_map.csv:', e);
    domainTranslationMap = {};
    isMapLoaded = false;
  }
}

// --- Build suggested filename ---
async function buildSuggestedFilename(downloadLike) {
  const syncSettings = await chrome.storage.sync.get(['dateFormat', 'lockedDate', 'enabled']);
  const localSettings = await chrome.storage.local.get(['clipboardText', 'currentDomain']);

  if (!syncSettings.enabled) return null;

  const targetDate = syncSettings.lockedDate ? new Date(syncSettings.lockedDate) : new Date();
  const df = syncSettings.dateFormat || 'YYMMDD';
  const datePrefix = formatDate(targetDate, df);

  const domainPart = getDomainCode(downloadLike.url, localSettings.currentDomain);
  const clipboardText = (localSettings.clipboardText || '').trim();

  let newBase;
  if (clipboardText) {
    newBase = `${datePrefix}_${sanitizeFilename(clipboardText.substring(0, 50))}_${domainPart}`;
  } else if (downloadLike.filename) {
    const stem = String(downloadLike.filename).replace(/\.pdf$/i, '');
    newBase = `${datePrefix}_${sanitizeFilename(stem)}_${domainPart}`;
  } else {
    newBase = `${datePrefix}_${domainPart}`;
  }

  return `${newBase}.pdf`;
}

// --- Helper functions ---
function formatDate(date, fmt) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return fmt === 'YYYYMMDD'
    ? `${y}${m}${d}`
    : `${String(y).slice(-2)}${m}${d}`;
}

function getDomainCode(url, fallbackHost) {
  try {
    const host = url ? new URL(url).hostname : (fallbackHost || '');
    const cleanHost = host.replace(/^www\./i, '').toLowerCase();
    if (!cleanHost) return 'UnknownSite';

    // Exact match
    if (domainTranslationMap[cleanHost]) return domainTranslationMap[cleanHost];

    // Walk up subdomains: a.b.c.tld -> b.c.tld -> c.tld
    const parts = cleanHost.split('.');
    for (let i = 1; i < parts.length; i++) {
      const candidate = parts.slice(i).join('.');
      if (domainTranslationMap[candidate]) return domainTranslationMap[candidate];
    }

    // Contains fallback
    for (const key in domainTranslationMap) {
      if (key && cleanHost.includes(key)) return domainTranslationMap[key];
    }

    // Default: base part of domain
    const base = parts.length > 1 ? parts[parts.length - 2] : cleanHost;
    return capitalize(base.replace(/[^a-z0-9]/gi, '')) || 'UnknownSite';
  } catch {
    return 'UnknownSite';
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function sanitizeFilename(input) {
  return String(input)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, '_')
    .trim();
}
