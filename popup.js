// Timer variables
let countdownTimer = null;
let remainingTime = 0;
let currentDate = new Date();
let lockedDate = null; // Track if a date has been locked
let buttonState = 'load'; // Track button state: 'load' or 'save'
let domainMappings = {}; // Store CSV domain mappings

// DOM elements
let autoToggle, statusText, dateInput, decreaseDate, increaseDate, lockDateBtn, changeBufferBtn, downloadBtn, dateFormat, bufferInput, totalName;

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
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
    
    // Load domain mappings from CSV
    loadDomainMappings();
    
    // Get current tab URL and detect domain
    getCurrentTabDomain();
    
    // Add event listeners (replaces inline onclick handlers)
    autoToggle.addEventListener('click', toggleSwitch);
    decreaseDate.addEventListener('click', function() { adjustDate(-1); });
    increaseDate.addEventListener('click', function() { adjustDate(1); });
    lockDateBtn.addEventListener('click', lockDate);
    changeBufferBtn.addEventListener('click', handleBufferButton);
    downloadBtn.addEventListener('click', downloadTab);
    
    // Monitor buffer input changes to switch button state and update display
    bufferInput.addEventListener('input', function() {
        if (buttonState === 'load' && bufferInput.value.trim()) {
            setButtonState('save');
        }
        updateTotalNameDisplay(); // Update display when buffer changes
    });
    
    // Add listener for format dropdown changes to save preference and update display
    dateFormat.addEventListener('change', function() {
        const selectedFormat = dateFormat.value;
        chrome.storage.sync.set({ dateFormat: selectedFormat });
        console.log('Date format preference saved:', selectedFormat);
        updateTotalNameDisplay(); // Update display when format changes
    });
    
    // Load saved settings and timer state (DO NOT force disabled state)
    chrome.storage.sync.get({
        enabled: false,
        dateFormat: 'YYYYMMDD', // Default to 8-digit format
        lockedDate: null, // Persistent locked date
        lastEnabledDate: null // Track when extension was last enabled
    }, function(items) {
        console.log('Loading saved extension state:', items);
        
        // Set the dropdown to the saved format preference
        dateFormat.value = items.dateFormat;
        
        // Update dropdown with today's date in the preferred format
        updateDateFormatDropdown(new Date(), items.dateFormat);
        
        // Handle date initialization based on extension state and saved date
        initializeDateField(items);
        
        // Update total name display with saved format
        updateTotalNameDisplay();
        
        // Restore the toggle state and check for active timer
        updateToggleState(items.enabled);
        
        if (items.enabled) {
            // Extension is enabled - check if there's an active timer
            chrome.storage.local.get(['timerEndTime'], function(result) {
                if (result.timerEndTime) {
                    const now = Date.now();
                    const timeLeft = Math.max(0, result.timerEndTime - now);
                    
                    if (timeLeft > 0) {
                        // Resume countdown
                        remainingTime = Math.ceil(timeLeft / 1000);
                        startCountdown();
                        console.log('Resuming countdown with', remainingTime, 'seconds remaining');
                    } else {
                        // Timer expired, disable extension
                        console.log('Timer expired, disabling extension');
                        disableExtension();
                    }
                } else {
                    // Extension is enabled but no timer - this shouldn't happen, but let's handle it
                    statusText.textContent = "Extension Active";
                }
            });
        } else {
            // Extension is disabled
            statusText.textContent = "Extension Disabled";
            // Clear any leftover timer data
            chrome.storage.local.remove(['timerEndTime']);
        }
    });
});

function initializeDateField(savedItems) {
    const today = new Date();
    const todayDateString = formatDateAsInput(today);
    
    console.log('Initializing date field with saved items:', savedItems);
    console.log('Today date string:', todayDateString);
    console.log('Last enabled date:', savedItems.lastEnabledDate);
    console.log('Saved locked date:', savedItems.lockedDate);
    
    // Check if we have a locked date saved
    if (savedItems.lockedDate) {
        const savedDate = new Date(savedItems.lockedDate);
        if (!isNaN(savedDate.getTime())) {
            // We have a valid locked date
            // Only reset to today if extension was just enabled today AND we don't want to preserve the lock
            // For now, always restore the locked date unless user explicitly enables/disables
            currentDate = savedDate;
            lockedDate = savedDate;
            updateDateDisplay();
            console.log('Restored locked date:', savedDate);
            return;
        }
    }
    
    // No valid locked date - default to today's date
    setTodaysDate();
    console.log('Initialized with today\'s date (no locked date found)');
}

function formatDateAsInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function loadDomainMappings() {
    // Load the CSV file containing domain mappings
    fetch(chrome.runtime.getURL('domain_map.csv'))
        .then(response => response.text())
        .then(csvText => {
            parseDomainCSV(csvText);
        })
        .catch(error => {
            console.log('Could not load domain mappings CSV:', error);
            // Create default mappings if CSV file doesn't exist
            domainMappings = {
                'etrade.net': 'MS',
                'research.etrade.net': 'MS',
                'fidelity.com': 'FID',
                'schwab.com': 'SCH'
                // Add more default mappings as needed
            };
        });
}

function parseDomainCSV(csvText) {
    const lines = csvText.split('\n');
    domainMappings = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('#')) { // Skip empty lines and comments
            const [domain, code] = line.split(',').map(item => item.trim());
            if (domain && code) {
                domainMappings[domain.toLowerCase()] = code.toUpperCase();
            }
        }
    }
    
    console.log('Domain mappings loaded:', domainMappings);
}

function getCurrentTabDomain() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url) {
            const url = new URL(tabs[0].url);
            const hostname = url.hostname.toLowerCase();
            
            console.log('Current tab hostname:', hostname);
            
            // Store current domain for use in filename generation
            chrome.storage.local.set({ currentDomain: hostname });
            
            // Update display with domain-specific filename
            updateTotalNameDisplay();
        }
    });
}

function getDomainCodeForFilename() {
    // Get domain code from CSV mappings
    return new Promise((resolve) => {
        chrome.storage.local.get(['currentDomain'], function(result) {
            if (result.currentDomain) {
                const hostname = result.currentDomain;
                
                // First try exact match
                if (domainMappings[hostname]) {
                    resolve(domainMappings[hostname]);
                    return;
                }
                
                // Then try partial matches (for subdomains)
                for (const domain in domainMappings) {
                    if (hostname.includes(domain)) {
                        resolve(domainMappings[domain]);
                        return;
                    }
                }
                
                // If no match found, use the domain extraction logic as fallback
                const fallbackCode = getDomainForPreview(hostname);
                resolve(fallbackCode.toUpperCase());
            } else {
                resolve(''); // No domain detected
            }
        });
    });
}

function updateTotalNameDisplay() {
    const formattedDate = getFormattedDateForFile();
    const bufferContent = getBufferContentForFile();
    
    // Get domain code and update display
    getDomainCodeForFilename().then(domainCode => {
        let displayText = formattedDate;
        
        if (bufferContent) {
            displayText = formattedDate + '_' + bufferContent;
        }
        
        if (domainCode) {
            displayText = displayText + '_' + domainCode;
        }
        
        totalName.textContent = displayText;
        console.log('Total name display updated:', displayText);
    });
}

function setTodaysDate() {
    currentDate = new Date();
    lockedDate = null; // Clear any locked date when setting to today
    updateDateDisplay();
}

function updateDateDisplay() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    dateInput.value = `${year}${month}${day}`;
    updateTotalNameDisplay(); // Update display when date changes
}

function adjustDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    updateDateDisplay();
    // Clear locked date when user manually adjusts
    lockedDate = null;
    // Clear saved locked date since user is manually adjusting
    chrome.storage.sync.remove(['lockedDate']);
    console.log('Manual date adjustment - cleared locked date');
}

function parseInputDate(dateString) {
    // Parse the date string from the input field (YYYYMMDD format)
    if (dateString.length === 8) {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateString.substring(6, 8));
        return new Date(year, month, day);
    }
    return null;
}

function formatDateForDropdown(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (format === 'YYYYMMDD') {
        return `${year}${month}${day}`;
    } else if (format === 'YYMMDD') {
        const shortYear = String(year).substring(2, 4);
        return `${shortYear}${month}${day}`;
    }
    return '';
}

function updateDateFormatDropdown(date, selectedFormat = null) {
    // If no format specified, get the currently selected format
    if (!selectedFormat) {
        selectedFormat = dateFormat.value;
    }
    
    const format8 = formatDateForDropdown(date, 'YYYYMMDD');
    const format6 = formatDateForDropdown(date, 'YYMMDD');
    
    // Update the dropdown options with current date examples
    dateFormat.innerHTML = `
        <option value="YYYYMMDD">${format8} (8 digits)</option>
        <option value="YYMMDD">${format6} (6 digits)</option>
    `;
    
    // Restore the selected format preference
    dateFormat.value = selectedFormat;
}

function setButtonState(state) {
    buttonState = state;
    if (state === 'load') {
        changeBufferBtn.textContent = 'Press to load buffer';
        changeBufferBtn.style.backgroundColor = '#2196F3';
        changeBufferBtn.style.color = 'white';
    } else {
        changeBufferBtn.textContent = 'Overtype to change';
        changeBufferBtn.style.backgroundColor = '#FF9800';
        changeBufferBtn.style.color = 'white';
    }
}

function handleBufferButton() {
    if (buttonState === 'load') {
        // Load clipboard content into buffer
        loadClipboardIntoBuffer();
    } else {
        // Save current buffer content and reset to load state
        const currentContent = bufferInput.value.trim();
        if (currentContent) {
            // Save to clipboard (optional)
            navigator.clipboard.writeText(currentContent).then(function() {
                console.log('Buffer content saved to clipboard:', currentContent);
            }).catch(function(error) {
                console.log('Could not write to clipboard:', error);
            });
        }
        
        // Reset button to load state
        setButtonState('load');
        
        // Update total name display
        updateTotalNameDisplay();
    }
}

function loadClipboardIntoBuffer() {
    console.log('Attempting to read clipboard...');
    
    navigator.clipboard.readText().then(function(clipboardText) {
        console.log('Clipboard read successful, content:', clipboardText);
        
        if (clipboardText && clipboardText.trim()) {
            bufferInput.value = clipboardText.trim();
            
            // CRITICAL FIX: Store clipboard content for background.js compatibility
            chrome.storage.local.set({ clipboardText: clipboardText.trim() });
            
            console.log('Clipboard content loaded into buffer:', clipboardText);
            
            // Switch button to save state
            setButtonState('save');
            
            // Update total name display
            updateTotalNameDisplay();
        } else {
            console.log('Clipboard is empty');
            bufferInput.placeholder = 'Clipboard was empty';
        }
    }).catch(function(error) {
        console.log('Clipboard read failed:', error.name, error.message);
        bufferInput.placeholder = 'Clipboard access failed';
    });
}

function toggleSwitch() {
    chrome.storage.sync.get(['enabled'], function(items) {
        const newState = !items.enabled;
        console.log('Toggle clicked: changing from', items.enabled, 'to', newState);
        
        if (newState) {
            // Turning ON - start 60-minute countdown immediately
            enableExtension();
        } else {
            // Turning OFF - cancel timer and disable immediately
            cancelTimer();
            disableExtension();
        }
    });
}

function enableExtension() {
    console.log('Enabling extension with 60-minute timer');
    
    const today = new Date();
    const todayDateString = formatDateAsInput(today);
    
    // Set extension as enabled and record today's date as last enabled date
    chrome.storage.sync.set({ 
        enabled: true,
        lastEnabledDate: todayDateString 
    });
    
    chrome.storage.local.remove(['timerEndTime']); // Clear any old timer data
    updateToggleState(true);
    
    // Reset to today's date when enabling AND clear any locked date (user's requested behavior)
    chrome.storage.sync.remove(['lockedDate']);
    setTodaysDate();
    console.log('Extension enabled - reset to today\'s date and cleared locked date');
    
    // Start 60-minute countdown immediately
    startDisableTimer();
}

function startDisableTimer() {
    // Set timer for 60 minutes (3600 seconds)
    remainingTime = 3600;
    const endTime = Date.now() + (60 * 60 * 1000); // 60 minutes in milliseconds
    
    console.log('Starting 60-minute timer, will end at:', new Date(endTime));
    
    // Store timer end time for persistence
    chrome.storage.local.set({ timerEndTime: endTime });
    
    // Start countdown display
    startCountdown();
}

function startCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    countdownTimer = setInterval(() => {
        if (remainingTime <= 0) {
            disableExtension();
            return;
        }
        
        // Display time in minutes and seconds for better UX
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        statusText.textContent = `Extension will disable in ${minutes}m ${seconds}s`;
        remainingTime--;
    }, 1000);
    
    // Initial display
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    statusText.textContent = `Extension will disable in ${minutes}m ${seconds}s`;
}

function disableExtension() {
    console.log('Disabling extension');
    cancelTimer();
    chrome.storage.sync.set({ enabled: false });
    chrome.storage.local.remove(['timerEndTime']);
    updateToggleState(false);
    statusText.textContent = "Extension Disabled";
}

function cancelTimer() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    chrome.storage.local.remove(['timerEndTime']);
}

function updateToggleState(isEnabled) {
    console.log('Updating toggle visual state to:', isEnabled);
    if (isEnabled) {
        autoToggle.classList.add('active');
    } else {
        autoToggle.classList.remove('active');
    }
}

// Button functions
function lockDate() {
    const inputDateString = dateInput.value;
    console.log('Attempting to lock date:', inputDateString);
    
    // Parse the date from the input field
    const parsedDate = parseInputDate(inputDateString);
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Valid date - lock it in
        lockedDate = new Date(parsedDate);
        currentDate = new Date(parsedDate); // Update current date to match locked date
        
        // Save the locked date to storage for persistence
        chrome.storage.sync.set({ lockedDate: lockedDate.toISOString() });
        console.log('Date locked and saved to storage:', lockedDate.toISOString());
        
        // Get the current format preference and update dropdown with new date
        chrome.storage.sync.get({ dateFormat: 'YYYYMMDD' }, function(items) {
            updateDateFormatDropdown(lockedDate, items.dateFormat);
            updateTotalNameDisplay(); // Update display with new locked date
        });
        
        console.log('Date successfully locked and saved:', lockedDate);
        
        // Visual feedback
        lockDateBtn.style.backgroundColor = '#4CAF50';
        lockDateBtn.style.color = 'white';
        lockDateBtn.textContent = 'Date Locked!';
        
        // Reset button appearance after 2 seconds
        setTimeout(() => {
            lockDateBtn.style.backgroundColor = '';
            lockDateBtn.style.color = '';
            lockDateBtn.textContent = 'Press To Lock In Date';
        }, 2000);
        
    } else {
        // Invalid date format
        console.log('Invalid date format');
        
        // Visual feedback for error
        lockDateBtn.style.backgroundColor = '#f44336';
        lockDateBtn.style.color = 'white';
        lockDateBtn.textContent = 'Invalid Date!';
        
        // Reset button appearance after 2 seconds
        setTimeout(() => {
            lockDateBtn.style.backgroundColor = '';
            lockDateBtn.style.color = '';
            lockDateBtn.textContent = 'Press To Lock In Date';
        }, 2000);
    }
}

function downloadTab() {
    console.log('Download current tab initiated');
    
    // Check if extension is enabled
    chrome.storage.sync.get(['enabled'], function(items) {
        if (!items.enabled) {
            console.log('Extension is disabled - cannot download');
            // Visual feedback
            downloadBtn.style.backgroundColor = '#f44336';
            downloadBtn.style.color = 'white';
            downloadBtn.textContent = 'Extension Disabled!';
            
            setTimeout(() => {
                downloadBtn.style.backgroundColor = '';
                downloadBtn.style.color = '';
                downloadBtn.textContent = 'Download Current Tab';
            }, 2000);
            return;
        }
        
        // Get current tab URL
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url) {
                const currentUrl = tabs[0].url;
                console.log('Current tab URL:', currentUrl);
                
                // Check if current page is a PDF
                if (currentUrl.toLowerCase().includes('.pdf') || tabs[0].title.toLowerCase().includes('pdf')) {
                    // Get complete filename from popup logic
                    getCompleteFilename().then(filename => {
                        console.log('Generated filename:', filename);
                        
                        // Store popup data for background.js to use
                        chrome.storage.local.set({
                            usePopupSettings: true,
                            popupFilename: filename,
                            popupDate: getFormattedDateForFile(),
                            popupBuffer: getBufferContentForFile(),
                            clipboardText: getBufferContentForFile() // For compatibility with background.js
                        });
                        
                        // Trigger download using chrome.downloads API
                        chrome.downloads.download({
                            url: currentUrl,
                            filename: filename + '.pdf',
                            conflictAction: 'uniquify',
                            saveAs: false  // Respects user's Chrome download settings
                        }, function(downloadId) {
                            if (chrome.runtime.lastError) {
                                console.error('Download failed:', chrome.runtime.lastError);
                                // Visual feedback for error
                                downloadBtn.style.backgroundColor = '#f44336';
                                downloadBtn.style.color = 'white';
                                downloadBtn.textContent = 'Download Failed!';
                                
                                setTimeout(() => {
                                    downloadBtn.style.backgroundColor = '';
                                    downloadBtn.style.color = '';
                                    downloadBtn.textContent = 'Download Current Tab';
                                }, 2000);
                            } else {
                                console.log('Download started with ID:', downloadId);
                                // Visual feedback for success
                                downloadBtn.style.backgroundColor = '#4CAF50';
                                downloadBtn.style.color = 'white';
                                downloadBtn.textContent = 'Download Started!';
                                
                                setTimeout(() => {
                                    downloadBtn.style.backgroundColor = '';
                                    downloadBtn.style.color = '';
                                    downloadBtn.textContent = 'Download Current Tab';
                                }, 2000);
                            }
                        });
                    });
                } else {
                    console.log('Current page is not a PDF');
                    // Visual feedback
                    downloadBtn.style.backgroundColor = '#FF9800';
                    downloadBtn.style.color = 'white';
                    downloadBtn.textContent = 'Not a PDF page!';
                    
                    setTimeout(() => {
                        downloadBtn.style.backgroundColor = '';
                        downloadBtn.style.color = '';
                        downloadBtn.textContent = 'Download Current Tab';
                    }, 2000);
                }
            } else {
                console.log('Could not get current tab information');
                // Visual feedback
                downloadBtn.style.backgroundColor = '#f44336';
                downloadBtn.style.color = 'white';
                downloadBtn.textContent = 'Tab Error!';
                
                setTimeout(() => {
                    downloadBtn.style.backgroundColor = '';
                    downloadBtn.style.color = '';
                    downloadBtn.textContent = 'Download Current Tab';
                }, 2000);
            }
        });
    });
}

// Helper function to get the currently selected date format for file renaming
function getSelectedDateFormat() {
    return dateFormat.value;
}

// Helper function to get formatted date string for file renaming
function getFormattedDateForFile(date = null) {
    const targetDate = date || lockedDate || currentDate;
    const selectedFormat = getSelectedDateFormat();
    return formatDateForDropdown(targetDate, selectedFormat);
}

// Helper function to get current buffer content for file renaming
function getBufferContentForFile() {
    return bufferInput.value.trim();
}

// Helper function to generate complete filename for download
function getCompleteFilename() {
    return new Promise((resolve) => {
        const formattedDate = getFormattedDateForFile();
        const bufferContent = getBufferContentForFile();
        
        getDomainCodeForFilename().then(domainCode => {
            let filename = formattedDate;
            
            if (bufferContent) {
                filename = filename + '_' + bufferContent;
            }
            
            if (domainCode) {
                filename = filename + '_' + domainCode;
            }
            
            resolve(sanitizeFilename(filename));
        });
    });
}

// Sanitize clipboard text for safe filenames
// Replace this function in popup.js
function sanitizeFilename(input) {
    return input
        .replace(/[<>:"/\\|?*]/g, '_') // Replace forbidden characters with underscores
        .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
        .replace(/^\.+/, '') // Remove leading dots
        .replace(/\.+$/, '') // Remove trailing dots
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .trim();
}
