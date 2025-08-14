// Timer variables
let countdownTimer = null;
let remainingTime = 0;
let currentDate = new Date();
let lockedDate = null;

// DOM elements
let autoToggle, statusText, dateInput, decreaseDate, increaseDate,
    lockDateBtn, changeBufferBtn, downloadBtn, dateFormat, bufferInput, totalName,
    clipboardNote, dateErrorNote;

document.addEventListener('DOMContentLoaded', function () {
  autoToggle = document.getElementById('autoToggle');
  statusText = document.getElementById('statusText');
  dateInput = document.getElementById('dateInput');
  decreaseDate = document.getElementById('decreaseDate');
  increaseDate = document.getElementById('increaseDate');
  lockDateBtn = document.getElementById('lockDateBtn');
  changeBufferBtn = document.getElementById('changeBufferBtn');
  downloadBtn = document.getElementById('downloadBtn');
  dateFormat = document.getElementById('dateFormat');
  bufferInput = document.getElementById('bufferInput');
  totalName = document.getElementById('totalName');

  // Notes for clipboard/date errors
  clipboardNote = document.createElement('div');
  clipboardNote.style.fontSize = '11px';
  clipboardNote.style.color = '#b00';
  clipboardNote.style.marginTop = '4px';
  clipboardNote.style.display = 'none';
  changeBufferBtn.insertAdjacentElement('afterend', clipboardNote);

  dateErrorNote = document.createElement('div');
  dateErrorNote.style.fontSize = '11px';
  dateErrorNote.style.color = '#b00';
  dateErrorNote.style.marginTop = '4px';
  dateErrorNote.style.display = 'none';
  dateInput.insertAdjacentElement('afterend', dateErrorNote);

  getCurrentTabDomain();

  // On load: silently try clipboard only if popup is focused
  if (document.hasFocus()) {
    loadClipboardIntoBuffer({ silent: true });
  }

  // Event bindings
  autoToggle.addEventListener('click', toggleSwitch);
  decreaseDate.addEventListener('click', () => adjustDate(-1));
  increaseDate.addEventListener('click', () => adjustDate(1));
  lockDateBtn.addEventListener('click', lockDate);
  changeBufferBtn.addEventListener('click', () => {
    if (!document.hasFocus()) {
      clipboardNote.textContent = 'Popup is not focused. Click inside it, then try again or paste manually.';
      clipboardNote.style.display = 'block';
      return;
    }
    loadClipboardIntoBuffer({ silent: false });
  });
  downloadBtn.addEventListener('click', downloadTab);

  bufferInput.addEventListener('input', () => {
    const bufferContent = bufferInput.value.trim();
    if (bufferContent) {
      chrome.storage.local.set({ clipboardText: bufferContent });
    } else {
      chrome.storage.local.remove(['clipboardText']);
    }
    updateTotalNameDisplay();
  });

  dateFormat.addEventListener('change', () => {
    chrome.storage.sync.set({ dateFormat: dateFormat.value });
    updateDateDisplay();
    updateTotalNameDisplay();
  });

  // Load settings with default dateFormat=YYMMDD
  chrome.storage.sync.get({
    enabled: false,
    dateFormat: 'YYMMDD',
    lockedDate: null,
    lastEnabledDate: null
  }, function (items) {
    dateFormat.value = items.dateFormat;
    initializeDateField(items);
    updateTotalNameDisplay();
    updateToggleState(items.enabled);

    if (items.enabled) {
      chrome.storage.local.get(['timerEndTime'], function (result) {
        if (result.timerEndTime) {
          const now = Date.now();
          const timeLeft = Math.max(0, result.timerEndTime - now);
          if (timeLeft > 0) {
            remainingTime = Math.ceil(timeLeft / 1000);
            startCountdown();
          } else {
            disableExtension();
          }
        } else {
          statusText.textContent = "Extension Active";
        }
      });
    } else {
      statusText.textContent = "Extension Disabled";
      chrome.storage.local.remove(['timerEndTime']);
    }
  });
});

function initializeDateField(savedItems) {
  if (savedItems.lockedDate) {
    const savedDate = new Date(savedItems.lockedDate);
    if (!isNaN(savedDate.getTime())) {
      currentDate = savedDate;
      lockedDate = savedDate;
      updateDateDisplay();
      updateDateFormatDropdown(lockedDate, savedItems.dateFormat);
      return;
    }
  }
  setTodaysDate();
}

function getCurrentTabDomain() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].url) {
      const hostname = new URL(tabs[0].url).hostname.toLowerCase();
      chrome.storage.local.set({ currentDomain: hostname }, updateTotalNameDisplay);
    }
  });
}

function setTodaysDate() {
  currentDate = new Date();
  lockedDate = null;
  updateDateDisplay();
}

function updateDateDisplay() {
  const fmt = dateFormat.value || 'YYMMDD';
  const y = currentDate.getFullYear();
  const m = String(currentDate.getMonth() + 1).padStart(2, '0');
  const d = String(currentDate.getDate()).padStart(2, '0');
  dateInput.value = (fmt === 'YYYYMMDD') ? `${y}${m}${d}` : `${String(y).slice(-2)}${m}${d}`;
  updateTotalNameDisplay();
}

function adjustDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  updateDateDisplay();
  lockedDate = null;
  chrome.storage.sync.remove(['lockedDate']);
}

function lockDate() {
  dateErrorNote.style.display = 'none';
  const input = dateInput.value.trim();
  const parsedDate = parseInputDate(input);

  if (!/^\d{6}$|^\d{8}$/.test(input)) {
    showDateError('Enter date as YYYYMMDD or YYMMDD');
    return;
  }
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    showDateError('Date not valid (check month/day)');
    return;
  }

  lockedDate = new Date(parsedDate);
  currentDate = new Date(parsedDate);
  chrome.storage.sync.set({ lockedDate: lockedDate.toISOString() });
  chrome.storage.sync.get({ dateFormat: 'YYMMDD' }, function (items) {
    updateDateFormatDropdown(lockedDate, items.dateFormat);
    updateTotalNameDisplay();
  });
  flashLockButton('#4CAF50', 'Date Locked!');
}

function showDateError(message) {
  dateErrorNote.textContent = message;
  dateErrorNote.style.display = 'block';
  flashLockButton('#f44336', 'Invalid Date!');
}

function flashLockButton(color, text) {
  lockDateBtn.style.backgroundColor = color;
  lockDateBtn.style.color = 'white';
  lockDateBtn.textContent = text;
  setTimeout(() => {
    lockDateBtn.style.backgroundColor = '';
    lockDateBtn.style.color = '';
    lockDateBtn.textContent = 'Enter';
  }, 2000);
}

function updateDateFormatDropdown(date, selectedFormat = null) {
  dateFormat.value = selectedFormat || dateFormat.value;
}

function parseInputDate(dateString) {
  if (dateString.length === 8) {
    const y = parseInt(dateString.substr(0, 4), 10);
    const m = parseInt(dateString.substr(4, 2), 10) - 1;
    const d = parseInt(dateString.substr(6, 2), 10);
    return new Date(y, m, d);
  }
  if (dateString.length === 6) {
    const yFull = parseInt(dateString.substr(0, 2), 10) + 2000;
    const m = parseInt(dateString.substr(2, 2), 10) - 1;
    const d = parseInt(dateString.substr(4, 2), 10);
    return new Date(yFull, m, d);
  }
  return null;
}

function formatDateAsInput(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

// Focus-safe, friendly clipboard reader
function loadClipboardIntoBuffer({ silent = false } = {}) {
  if (!document.hasFocus()) {
    if (!silent) {
      clipboardNote.textContent = 'Popup is not focused. Click inside it, then try again or paste manually.';
      clipboardNote.style.display = 'block';
    }
    updateTotalNameDisplay();
    return;
  }
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
    if (!silent) {
      clipboardNote.textContent = 'Clipboard API not available. Please paste manually.';
      clipboardNote.style.display = 'block';
    }
    updateTotalNameDisplay();
    return;
  }
  navigator.clipboard.readText()
    .then(text => {
      clipboardNote.style.display = 'none';
      if (text && text.trim()) {
        const trimmed = text.trim();
        bufferInput.value = trimmed;
        chrome.storage.local.set({ clipboardText: trimmed });
      } else {
        chrome.storage.local.remove(['clipboardText']);
        if (!silent) {
          clipboardNote.textContent = 'Clipboard is empty. Please paste manually.';
          clipboardNote.style.display = 'block';
        }
      }
      updateTotalNameDisplay();
    })
    .catch(err => {
      if (!document.hasFocus()) {
        if (!silent) {
          clipboardNote.textContent = 'Popup lost focus. Click inside it, then try again or paste manually.';
          clipboardNote.style.display = 'block';
        }
        updateTotalNameDisplay();
        return;
      }
      const name = err && err.name ? err.name : 'DOMException';
      const msg = err && err.message ? err.message : '';
      console.info(`Clipboard read blocked: ${name}${msg ? ' — ' + msg : ''}`);
      if (!silent) {
        let hint = 'Clipboard read failed. Please paste manually.';
        if (name === 'NotAllowedError') {
          hint = 'Clipboard access was blocked. Ensure the popup is focused, then click again or paste manually.';
        } else if (name === 'NotFoundError') {
          hint = 'Clipboard is empty. Copy some text, then click again.';
        } else if (name === 'SecurityError') {
          hint = 'Clipboard blocked in this context. Please paste manually.';
        }
        clipboardNote.textContent = hint;
        clipboardNote.style.display = 'block';
      }
      updateTotalNameDisplay();
    });
}

function toggleSwitch() {
  chrome.storage.sync.get(['enabled'], function (items) {
    items.enabled ? disableExtension() : enableExtension();
  });
}

function enableExtension() {
  chrome.storage.sync.set({
    enabled: true,
    lastEnabledDate: formatDateAsInput(new Date())
  });
  chrome.storage.local.remove(['timerEndTime']);
  updateToggleState(true);
  chrome.storage.sync.remove(['lockedDate']);
  setTodaysDate();
  startDisableTimer();
}

function startDisableTimer() {
  remainingTime = 3600;
  const endTime = Date.now() + 3600 * 1000;
  chrome.storage.local.set({ timerEndTime: endTime });
  startCountdown();
}

function startCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (remainingTime <= 0) {
      disableExtension();
      return;
    }
    const m = Math.floor(remainingTime / 60);
    const s = remainingTime % 60;
    statusText.textContent = `Extension will disable in ${m}m ${s}s`;
    remainingTime--;
  }, 1000);
}

function disableExtension() {
  clearInterval(countdownTimer);
  countdownTimer = null;
  chrome.storage.sync.set({ enabled: false });
  chrome.storage.local.remove(['timerEndTime']);
  updateToggleState(false);
  statusText.textContent = "Extension Disabled";
  totalName.value = 'Enable extension to see preview';
}

function updateToggleState(isEnabled) {
  autoToggle.classList.toggle('active', isEnabled);
  if (!isEnabled) {
    totalName.value = 'Enable extension to see preview';
  }
}

function downloadTab() {
  chrome.storage.sync.get(['enabled'], function (items) {
    if (!items.enabled) return;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].url) {
        chrome.downloads.download({
          url: tabs[0].url,
          saveAs: true,
          conflictAction: 'uniquify'
        });
      }
    });
  });
}

function updateTotalNameDisplay() {
  chrome.storage.sync.get({ enabled: false }, ({ enabled }) => {
    if (!enabled) {
      totalName.value = 'Enable extension to see preview';
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const url = tabs[0] ? tabs[0].url : null;
      chrome.runtime.sendMessage(
        { action: 'getPreviewFilename', url, filename: 'preview.pdf' },
        response => {
          if (chrome.runtime.lastError) {
            console.warn('No background listener:', chrome.runtime.lastError.message);
            totalName.value = 'Enable extension to see preview';
            return;
          }
          totalName.value = (response && response.filename)
            ? response.filename.replace(/\.pdf$/i, '')
            : '';
        }
      );
    });
  });
}
