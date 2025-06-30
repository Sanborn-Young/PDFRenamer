// Sanitize clipboard text for safe filenames
function sanitizeFilename(input) {
  // Replace illegal filename characters (including comma) with an underscore
  return input.replace(/[<>:"/\\|?*,]/g, '_').replace(/[\x00-\x1f\x80-\x9f]/g, '').trim();
}

// Helper to extract main domain part for preview (similar logic as background.js)
function getDomainForPreview(hostname) {
  if (!hostname) return 'domain';
  let host = hostname;
  if (host.startsWith('www.')) host = host.substring(4);
  if (host.endsWith('.com')) {
    return host.split('.').slice(-2, -1)[0] || 'domain';
  } else {
    const parts = host.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2] || 'domain';
    } else {
      return parts[0] || 'domain';
    }
  }
}

// Popup script - handles settings UI
document.addEventListener('DOMContentLoaded', function() {
  const enableExtension = document.getElementById('enableExtension');
  const dateFormat = document.getElementById('dateFormat');
  const useClipboard = document.getElementById('useClipboard');
  const preview = document.getElementById('preview');
  const saveButton = document.getElementById('saveSettings');
  const fetchClipboard = document.getElementById('fetchClipboard');
  const clipboardStatus = document.getElementById('clipboardStatus');
  const downloadActiveTabBtn = document.getElementById('downloadActiveTab');

  // Load saved settings
  chrome.storage.sync.get({
    enabled: true,
    dateFormat: 'YYMMDD',
    useClipboard: true
  }, function(items) {
    enableExtension.checked = items.enabled;
    dateFormat.value = items.dateFormat;
    useClipboard.checked = items.useClipboard;
    updatePreview();
  });

  // Update preview when settings change
  enableExtension.addEventListener('change', updatePreview);
  dateFormat.addEventListener('change', updatePreview);
  useClipboard.addEventListener('change', updatePreview);

  // Save settings
  saveButton.addEventListener('click', function() {
    chrome.storage.sync.set({
      enabled: enableExtension.checked,
      dateFormat: dateFormat.value,
      useClipboard: useClipboard.checked
    }, function() {
      // Visual feedback
      saveButton.textContent = 'Saved!';
      saveButton.style.background = '#0f9d58';

      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
        saveButton.style.background = '#4285f4';
      }, 1500);
    });
  });

  // Clipboard capture logic
  if (fetchClipboard) {
    fetchClipboard.addEventListener('click', async () => {
      try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText();
        }
        // Sanitize clipboard text before storing
        text = sanitizeFilename(text);
        await chrome.storage.local.set({ clipboardText: text });
        clipboardStatus.textContent = '✔️ Captured!';
        clipboardStatus.style.color = 'green';
        setTimeout(() => { clipboardStatus.textContent = ''; }, 2000);
      } catch (e) {
        clipboardStatus.textContent = '❌ Failed!';
        clipboardStatus.style.color = 'red';
        setTimeout(() => { clipboardStatus.textContent = ''; }, 2000);
      }
    });
  }

  // Download the currently active tab's URL with Save As dialog and clipboard renaming
  if (downloadActiveTabBtn) {
    downloadActiveTabBtn.addEventListener('click', async function() {
      // 1. Get clipboard text
      let clipboardText = '';
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          clipboardText = await navigator.clipboard.readText();
        }
      } catch (e) {
        // If clipboard access fails, clipboardText remains ''
      }
      // Sanitize clipboard text before storing
      clipboardText = sanitizeFilename(clipboardText);

      // 2. Store clipboard text for background.js to use
      await chrome.storage.local.set({ clipboardText: clipboardText });

      // 3. Get current tab and trigger download
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          const url = tabs[0].url;
          chrome.downloads.download({
            url: url,
            saveAs: true // This opens the Save As dialog and uses last used folder
          });
        }
      });
    });
  }

  // Update preview with current tab's domain
  function updatePreview() {
    const now = new Date();
    let dateStr;

    switch(dateFormat.value) {
      case 'YYYYMMDD':
        dateStr = now.getFullYear().toString() +
                  (now.getMonth() + 1).toString().padStart(2, '0') +
                  now.getDate().toString().padStart(2, '0');
        break;
      case 'MMDDYY':
        dateStr = (now.getMonth() + 1).toString().padStart(2, '0') +
                  now.getDate().toString().padStart(2, '0') +
                  now.getFullYear().toString().slice(-2);
        break;
      default: // YYMMDD
        dateStr = now.getFullYear().toString().slice(-2) +
                  (now.getMonth() + 1).toString().padStart(2, '0') +
                  now.getDate().toString().padStart(2, '0');
    }

    // Get the current tab's domain for the preview
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let domainPart = 'domain';
      if (tabs.length > 0) {
        try {
          const url = new URL(tabs[0].url);
          domainPart = getDomainForPreview(url.hostname);
        } catch (e) {
          domainPart = 'domain';
        }
      }
      let previewText;
      if (enableExtension.checked) {
        if (useClipboard.checked) {
          previewText = `${dateStr}_clipboard-content_${domainPart}.pdf`;
        } else {
          previewText = `${dateStr}_original-filename_${domainPart}.pdf`;
        }
      } else {
        previewText = 'original-filename.pdf';
      }
      preview.textContent = previewText;
    });
  }
});
