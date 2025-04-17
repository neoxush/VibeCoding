// Network Client - Client-side script for communicating with the shared network server
// This enables real-time collaboration without a database

// Session Key Explanation:
// The session key displayed in the UI is a unique identifier for each browser session.
// It's used to identify different clients connecting to the same server.
// Each browser (Chrome, Edge, etc.) will have its own session key, even when connecting
// to the same server URL. This is normal and expected behavior.
//
// The session keys allow the server to track which client is sending data and ensure
// that data synchronization works correctly across multiple devices/browsers.
// Having different session keys for different browsers is not a problem - it's
// actually necessary for the collaboration features to work properly.

// Configuration
const SYNC_INTERVAL = 15000; // 15 seconds - how often to check for changes (increased to reduce notifications)
const AUTO_REFRESH = true;  // Whether to automatically refresh the page when data changes
const NOTIFICATION_DEBOUNCE = 30000; // 30 seconds - minimum time between notifications

// Server URL - will be detected automatically
let SERVER_URL = '';

// Last sync timestamp
let lastSyncTime = Date.now();

// Last notification timestamp
let lastNotificationTime = 0;

// Flag to track if we're currently syncing
let isSyncing = false;

// Flag to track if a refresh is pending
let refreshPending = false;

// Data version tracking
let dataVersions = {
    users: 0,
    tickets: 0,
    messageLogs: 0
};

// Status indicator element
let statusIndicator = null;

// Initialize the network client
function initNetworkClient() {
    console.log('Initializing network client...');

    // Detect server URL
    detectServerUrl();

    // Create status indicator
    createStatusIndicator();

    // Start sync process
    startSync();

    // Override localStorage methods
    overrideLocalStorage();

    console.log('Network client initialized.');
}

// Detect server URL
function detectServerUrl() {
    // Try to get from localStorage first
    const savedUrl = localStorage.getItem('server_url');
    if (savedUrl) {
        SERVER_URL = savedUrl;
        console.log(`Using saved server URL: ${SERVER_URL}`);
        return;
    }

    // Default to current origin
    const currentUrl = window.location.origin;
    if (currentUrl.includes('localhost') || /^https?:\/\/\d+\.\d+\.\d+\.\d+/.test(currentUrl)) {
        SERVER_URL = currentUrl;
        console.log(`Using current origin as server URL: ${SERVER_URL}`);
        localStorage.setItem('server_url', SERVER_URL);
        return;
    }

    // Always prompt for server URL to ensure proper network configuration
    promptForServerUrl();
}

// Prompt for server URL
function promptForServerUrl() {
    // Try to detect local IP addresses
    let ipOptions = '';
    try {
        // Use a hidden iframe to fetch IP information
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow.document;

        // Create a script to get network interfaces
        const script = iframeDoc.createElement('script');
        script.textContent = `
            function getLocalIPs(callback) {
                const ips = [];
                const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

                if (!RTCPeerConnection) {
                    callback([]);
                    return;
                }

                const pc = new RTCPeerConnection({
                    iceServers: []
                });

                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                pc.onicecandidate = (ice) => {
                    if (!ice || !ice.candidate || !ice.candidate.candidate) return;

                    const candidateStr = ice.candidate.candidate;
                    if (candidateStr.indexOf('typ host') === -1) return;

                    const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
                    const match = ipRegex.exec(candidateStr);
                    if (match && match[1] && ips.indexOf(match[1]) === -1) {
                        ips.push(match[1]);
                    }

                    if (ice.candidate.candidate.indexOf('typ host') === -1) {
                        setTimeout(() => {
                            callback(ips);
                        }, 500);
                    }
                };
            }

            getLocalIPs(function(ips) {
                window.parent.postMessage({ type: 'local-ips', ips: ips }, '*');
            });
        `;
        iframeDoc.body.appendChild(script);

        // Listen for message from iframe
        window.addEventListener('message', function ipMessageHandler(event) {
            if (event.data && event.data.type === 'local-ips') {
                const ips = event.data.ips || [];

                // Create IP options
                if (ips.length > 0) {
                    ipOptions = '<div class="mt-4"><p class="text-sm font-medium text-gray-700 mb-2">Quick Connect:</p><div class="grid grid-cols-2 gap-2">';
                    ips.forEach(ip => {
                        ipOptions += `<button class="ip-option px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-left" data-ip="http://${ip}:3000">http://${ip}:3000</button>`;
                    });
                    ipOptions += '</div></div>';
                }

                // Remove iframe
                document.body.removeChild(iframe);
                window.removeEventListener('message', ipMessageHandler);

                // Now show the prompt with IP options
                showServerPrompt(ipOptions);
            }
        });

        // Fallback in case IP detection fails
        setTimeout(() => {
            if (!ipOptions) {
                showServerPrompt('');
            }
        }, 2000);

    } catch (e) {
        console.error('Error detecting IP addresses:', e);
        showServerPrompt('');
    }
}

// Show server URL prompt with IP options
function showServerPrompt(ipOptions) {
    // Create server URL prompt
    const promptContainer = document.createElement('div');
    promptContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    promptContainer.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 class="text-xl font-bold mb-4">Server Connection</h2>
            <p class="mb-4">Please enter the server URL to connect to:</p>
            <input type="text" id="server-url-input" class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                   placeholder="http://192.168.1.x:3000" value="http://localhost:3000">
            ${ipOptions}
            <div class="flex justify-between mt-4">
                <button id="scan-network-button" class="px-4 py-2 bg-gray-600 text-white rounded-md">Scan Network</button>
                <button id="connect-button" class="px-4 py-2 bg-blue-600 text-white rounded-md">Connect</button>
            </div>
        </div>
    `;
    document.body.appendChild(promptContainer);

    // Handle IP option clicks
    const ipButtons = promptContainer.querySelectorAll('.ip-option');
    ipButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('server-url-input').value = button.getAttribute('data-ip');
        });
    });

    // Handle scan network button
    const scanButton = document.getElementById('scan-network-button');
    if (scanButton) {
        scanButton.addEventListener('click', () => {
            scanButton.textContent = 'Scanning...';
            scanButton.disabled = true;

            // Simple network scan for common local IPs
            const baseIps = ['192.168.1', '192.168.0', '10.0.0'];
            const scanResults = document.createElement('div');
            scanResults.className = 'mt-4 text-sm';
            scanResults.innerHTML = '<p class="font-medium">Scanning network...</p>';

            // Insert scan results before the buttons
            const buttonsDiv = promptContainer.querySelector('.flex.justify-between');
            buttonsDiv.parentNode.insertBefore(scanResults, buttonsDiv);

            // Simulate scanning (in a real app, you'd do actual network scanning)
            setTimeout(() => {
                scanResults.innerHTML = '<p class="font-medium mb-2">Available servers:</p><div class="grid grid-cols-2 gap-2 mb-4"></div>';
                const resultsGrid = scanResults.querySelector('.grid');

                // Add localhost
                const localhostBtn = document.createElement('button');
                localhostBtn.className = 'ip-option px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-left';
                localhostBtn.setAttribute('data-ip', 'http://localhost:3000');
                localhostBtn.textContent = 'http://localhost:3000';
                resultsGrid.appendChild(localhostBtn);

                // Add some sample IPs (in a real app, these would be actual discovered servers)
                baseIps.forEach((baseIp, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'ip-option px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-left';
                    const ip = `http://${baseIp}.${index + 1}:3000`;
                    btn.setAttribute('data-ip', ip);
                    btn.textContent = ip;
                    resultsGrid.appendChild(btn);

                    btn.addEventListener('click', () => {
                        document.getElementById('server-url-input').value = ip;
                    });
                });

                // Re-enable scan button
                scanButton.textContent = 'Scan Again';
                scanButton.disabled = false;

                // Add click handlers for the new buttons
                localhostBtn.addEventListener('click', () => {
                    document.getElementById('server-url-input').value = 'http://localhost:3000';
                });
            }, 1500);
        });
    }

    // Handle connect button click
    document.getElementById('connect-button').addEventListener('click', () => {
        const url = document.getElementById('server-url-input').value;
        if (url) {
            SERVER_URL = url;
            localStorage.setItem('server_url', SERVER_URL);
            promptContainer.remove();
            console.log(`Using entered server URL: ${SERVER_URL}`);

            // Start sync now that we have a URL
            syncData();
        }
    });
}

// Global toolbar reference
let globalToolbar = null;

// Create or get the global toolbar
function getOrCreateToolbar() {
    if (globalToolbar) return globalToolbar;

    // Check if toolbar already exists
    let toolbar = document.querySelector('.bottom-toolbar');
    if (toolbar) {
        globalToolbar = toolbar;
        return toolbar;
    }

    // Create bottom toolbar
    toolbar = document.createElement('div');
    toolbar.className = 'bottom-toolbar';
    document.body.appendChild(toolbar);

    globalToolbar = toolbar;
    return toolbar;
}

// Create status indicator and toolbar
function createStatusIndicator() {
    // Create status indicator
    statusIndicator = document.createElement('div');
    statusIndicator.id = 'sync-status';
    // Using CSS class from ui-fixes.css
    statusIndicator.innerHTML = `
        <span id="sync-indicator" class="w-3 h-3 rounded-full mr-2 bg-gray-500"></span>
        <span id="sync-text">Initializing...</span>
    `;
    document.body.appendChild(statusIndicator);

    // Get or create toolbar
    const toolbar = getOrCreateToolbar();

    // Add manual sync button
    const syncButton = document.createElement('button');
    syncButton.id = 'manual-sync-button';
    syncButton.className = 'bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    syncButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
    `;
    syncButton.title = "Sync Now";
    syncButton.onclick = manualSync;
    toolbar.appendChild(syncButton);

    // Add server config button only if not admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || currentUser.role !== 'admin') {
        const configButton = document.createElement('button');
        configButton.id = 'server-config-button';
        configButton.className = 'bg-gray-600 hover:bg-gray-700 text-white rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500';
        configButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
        `;
        configButton.title = "Configure Server";
        configButton.onclick = promptForServerUrl;
        toolbar.appendChild(configButton);
    }
}

// Update status indicator
function updateStatusIndicator(status, message) {
    if (!statusIndicator) return;

    const indicator = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');

    if (!indicator || !text) return;

    switch (status) {
        case 'syncing':
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-yellow-500 animate-pulse';
            text.textContent = message || 'Syncing...';
            statusIndicator.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-yellow-100 text-yellow-800';
            break;

        case 'success':
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-green-500';
            text.textContent = message || 'Synced';
            statusIndicator.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-green-100 text-green-800';

            // Reset to idle after 3 seconds
            setTimeout(() => {
                updateStatusIndicator('idle');
            }, 3000);
            break;

        case 'error':
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-red-500';
            text.textContent = message || 'Sync Error';
            statusIndicator.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-red-100 text-red-800';
            break;

        case 'idle':
        default:
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-gray-500';
            text.textContent = message || 'Waiting for changes';
            statusIndicator.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-gray-100 text-gray-800';
            break;
    }
}

// Start sync process
function startSync() {
    // Initial sync
    syncData();

    // Set up interval for regular syncing
    setInterval(() => {
        // Only sync if we're not already syncing
        if (!isSyncing) {
            syncData();
        }
    }, SYNC_INTERVAL);
}

// Manual sync trigger
function manualSync() {
    console.log('Manual sync triggered');
    syncData(true);
}

// Sync data with server
function syncData(isManual = false) {
    // Prevent multiple syncs running at the same time
    if (isSyncing && !isManual) {
        console.log('Sync already in progress, skipping');
        return;
    }

    if (!SERVER_URL) {
        console.log('No server URL set, skipping sync');
        updateStatusIndicator('error', 'No server connection');
        return;
    }

    // Set syncing flag
    isSyncing = true;

    // Log sync start
    console.log('Starting data sync with server', isManual ? '(manual)' : '(automatic)');

    updateStatusIndicator('syncing', isManual ? 'Manual sync...' : 'Syncing...');

    // Get current data
    const currentData = {
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        tickets: JSON.parse(localStorage.getItem('tickets') || '[]'),
        messageLogs: JSON.parse(localStorage.getItem('messageLogs') || '[]')
    };

    // Calculate data versions
    const newVersions = {
        users: calculateVersion(currentData.users),
        tickets: calculateVersion(currentData.tickets),
        messageLogs: calculateVersion(currentData.messageLogs)
    };

    // Check if our data has changed since last sync
    const hasLocalChanges =
        newVersions.users !== dataVersions.users ||
        newVersions.tickets !== dataVersions.tickets ||
        newVersions.messageLogs !== dataVersions.messageLogs;

    // Fetch data from server
    fetch(`${SERVER_URL}/api/data`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            return response.json();
        })
        .then(serverData => {
            // Calculate server data versions
            const serverVersions = {
                users: calculateVersion(serverData.users),
                tickets: calculateVersion(serverData.tickets),
                logs: calculateVersion(serverData.logs)
            };

            // Check if server data is different from our data
            const hasServerChanges =
                serverVersions.users !== newVersions.users ||
                serverVersions.tickets !== newVersions.tickets ||
                serverVersions.logs !== newVersions.messageLogs;

            if (hasLocalChanges && !hasServerChanges) {
                // We have changes, server doesn't - push our changes
                console.log('Local changes detected, pushing to server');

                return fetch(`${SERVER_URL}/api/data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        users: currentData.users,
                        tickets: currentData.tickets,
                        logs: currentData.messageLogs
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}`);
                    }

                    // Update versions
                    dataVersions = { ...newVersions };

                    // Update last sync time
                    lastSyncTime = Date.now();
                    localStorage.setItem('lastSyncTime', lastSyncTime.toString());

                    updateStatusIndicator('success', 'Changes saved to server');
                    // Reset syncing flag
                    isSyncing = false;
                });
            } else if (hasServerChanges) {
                // Server has changes - pull them
                console.log('Server changes detected, updating local data');

                // Update local data
                localStorage.setItem('users', JSON.stringify(serverData.users));
                localStorage.setItem('tickets', JSON.stringify(serverData.tickets));
                localStorage.setItem('messageLogs', JSON.stringify(serverData.logs));

                // Log the updated data
                console.log('Updated tickets from server:', serverData.tickets);
                console.log('Updated users from server:', serverData.users.map(u => ({ id: u.id, email: u.email, role: u.role })));

                // Update versions
                dataVersions = {
                    users: serverVersions.users,
                    tickets: serverVersions.tickets,
                    messageLogs: serverVersions.logs
                };

                // Update last sync time
                lastSyncTime = Date.now();
                localStorage.setItem('lastSyncTime', lastSyncTime.toString());

                // Notify about data changes (with debounce)
                notifyDataChanged();

                updateStatusIndicator('success', 'New data received');
                // Reset syncing flag
                isSyncing = false;
            } else if (isManual) {
                updateStatusIndicator('success', 'Already in sync');
                // Reset syncing flag
                isSyncing = false;
            } else {
                updateStatusIndicator('idle');
                // Reset syncing flag
                isSyncing = false;
            }
        })
        .catch(error => {
            console.error('Error during sync:', error);
            updateStatusIndicator('error', 'Sync failed');
            // Reset syncing flag even on error
            isSyncing = false;
        });
}

// Calculate a simple version number for data
function calculateVersion(data) {
    const json = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < json.length; i++) {
        const char = json.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return hash;
}

// Track the last data hash to prevent redundant notifications
let lastDataHash = null;

// Notify about data changes
function notifyDataChanged() {
    // Get current data to check if it's actually changed
    const currentData = {
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        tickets: JSON.parse(localStorage.getItem('tickets') || '[]'),
        messageLogs: JSON.parse(localStorage.getItem('messageLogs') || '[]')
    };

    // Log the current data
    console.log('Current data for notification check:', {
        userCount: currentData.users.length,
        ticketCount: currentData.tickets.length,
        messageCount: currentData.messageLogs.length
    });

    // Log tickets specifically
    console.log('Current tickets for notification:', currentData.tickets);

    // Calculate a hash of the current data
    const currentDataHash = calculateVersion(currentData);

    // If the data hasn't actually changed, don't notify
    if (lastDataHash === currentDataHash) {
        console.log('Data hash unchanged, skipping notification');
        return;
    }

    // Update the last data hash
    lastDataHash = currentDataHash;

    console.log('Data changed, dispatching event');

    // Create and dispatch a custom event with ticket data
    const event = new CustomEvent('dataChanged', { detail: { tickets: currentData.tickets } });
    document.dispatchEvent(event);

    // Force an immediate UI update if we're on the dashboard
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath === 'dashboard.html' && typeof updateDashboard === 'function') {
        console.log('On dashboard page, forcing immediate update');
        setTimeout(() => {
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        }, 500);
    }

    // Check if we should show a notification (debounce)
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTime;

    // Only show notification if enough time has passed since the last one
    if (timeSinceLastNotification < NOTIFICATION_DEBOUNCE && !refreshPending) {
        console.log('Skipping notification due to debounce');
        return;
    }

    // Update last notification time
    lastNotificationTime = now;

    // Auto refresh if enabled
    if (AUTO_REFRESH) {
        // Don't refresh if we're on a form page or editing
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const isFormPage =
            currentPath === 'create-ticket.html' ||
            (currentPath === 'ticket-details.html' && document.querySelector('form'));

        if (!isFormPage && !refreshPending) {
            console.log('Auto refreshing page due to data changes');
            showToast('New data received. Refreshing...', 'info');

            // Set refresh pending flag to prevent multiple refreshes
            refreshPending = true;

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else if (!refreshPending) {
            showToast('New data available. Finish your work and refresh.', 'info');
        }
    }
}

// Override localStorage methods to trigger sync
function overrideLocalStorage() {
    // Store original methods
    const originalSetItem = localStorage.setItem;

    // Override setItem
    localStorage.setItem = function(key, value) {
        // Call original method
        originalSetItem.call(localStorage, key, value);

        // Trigger sync for relevant keys
        if (key === 'users' || key === 'tickets' || key === 'messageLogs') {
            // Don't sync immediately for every change, wait a bit
            clearTimeout(window.syncTimeout);
            window.syncTimeout = setTimeout(() => {
                // Only sync if we're not already syncing
                if (!isSyncing) {
                    syncData();
                }
            }, 1000); // Increased to 1 second for better debouncing
        }
    };

    // Override ticket operations to ensure sync
    const originalCreateTicket = window.createTicket;
    if (originalCreateTicket) {
        window.createTicket = function(...args) {
            const result = originalCreateTicket.apply(this, args);
            // Only sync if we're not already syncing
            if (!isSyncing) {
                syncData();
            }
            return result;
        };
    }

    const originalUpdateTicketStatus = window.updateTicketStatus;
    if (originalUpdateTicketStatus) {
        window.updateTicketStatus = function(...args) {
            const result = originalUpdateTicketStatus.apply(this, args);
            // Only sync if we're not already syncing
            if (!isSyncing) {
                syncData();
            }
            return result;
        };
    }

    const originalAddComment = window.addComment;
    if (originalAddComment) {
        window.addComment = function(...args) {
            const result = originalAddComment.apply(this, args);
            // Only sync if we're not already syncing
            if (!isSyncing) {
                syncData();
            }
            return result;
        };
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        initNetworkClient();
    }
});
