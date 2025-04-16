// Shared storage implementation for network communication
let socket;
let isConnected = false;
let connectionAttempts = 0;
let pendingMessages = [];
let serverUrl = '';

// Debug mode - set to true to see more logs
const DEBUG = true;

// Helper function for logging when in debug mode
function debugLog(...args) {
    if (DEBUG) {
        console.log('[SharedStorage]', ...args);
    }
}

// Connection status indicator
const connectionStatus = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    ERROR: 'error'
};

// Current connection status
let currentStatus = connectionStatus.DISCONNECTED;

// Initialize WebSocket connection
function initializeWebSocket() {
    // Try to connect to the server
    try {
        // Get the current hostname and use it to connect to the WebSocket server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let host = window.location.hostname || 'localhost';
        const port = 3000; // This should match the port in server.js

        // If we're running from a file:// URL, default to localhost
        if (window.location.protocol === 'file:') {
            console.log('Running from file:// URL, defaulting to localhost');
            host = 'localhost';
        }

        // Check if we have a manually configured server URL
        const savedUrl = getSavedServerUrl();
        if (savedUrl) {
            debugLog('Using manually configured server URL:', savedUrl);
            serverUrl = savedUrl;
        } else {
            serverUrl = `${protocol}//${host}:${port}`;
        }
        debugLog('Server URL:', serverUrl);

        // Create status indicator
        createStatusIndicator();

        // Create WebSocket connection
        connectToServer();

        // Set up reconnection on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !isConnected) {
                debugLog('Page became visible, reconnecting...');
                connectToServer();
            }
        });

        // Override localStorage functions to use shared storage
        overrideStorageFunctions();

        return true;
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        updateStatusIndicator(connectionStatus.ERROR);
        return false;
    }
}

// Connect to the WebSocket server
function connectToServer() {
    if (isConnected || currentStatus === connectionStatus.CONNECTING) {
        debugLog('Already connected or connecting, skipping connection attempt');
        return;
    }

    updateStatusIndicator(connectionStatus.CONNECTING);
    connectionAttempts++;
    debugLog(`Connecting to ${serverUrl} (attempt ${connectionAttempts})`);

    try {
        socket = new WebSocket(serverUrl);

        socket.onopen = () => {
            debugLog('Connected to server successfully');
            isConnected = true;
            connectionAttempts = 0;
            updateStatusIndicator(connectionStatus.CONNECTED);

            // Request initial data
            debugLog('Requesting initial data from server');
            socket.send(JSON.stringify({ type: 'get-data' }));

            // Send any pending messages
            if (pendingMessages.length > 0) {
                debugLog(`Sending ${pendingMessages.length} pending messages`);
                while (pendingMessages.length > 0) {
                    const message = pendingMessages.shift();
                    socket.send(JSON.stringify(message));
                }
            }
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                debugLog('Received message:', message.type);
                handleServerMessage(message);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        socket.onclose = (event) => {
            debugLog(`Disconnected from server. Code: ${event.code}, Reason: ${event.reason}`);
            isConnected = false;
            updateStatusIndicator(connectionStatus.DISCONNECTED);

            // Try to reconnect after a delay
            const delay = Math.min(30000, Math.pow(2, connectionAttempts) * 1000);
            debugLog(`Will attempt to reconnect in ${delay}ms`);
            setTimeout(connectToServer, delay);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            debugLog('WebSocket error occurred');
            updateStatusIndicator(connectionStatus.ERROR);
        };
    } catch (error) {
        console.error('Error connecting to server:', error);
        debugLog('Error creating WebSocket:', error.message);
        updateStatusIndicator(connectionStatus.ERROR);

        // Try to reconnect after a delay
        const delay = Math.min(30000, Math.pow(2, connectionAttempts) * 1000);
        debugLog(`Will attempt to reconnect in ${delay}ms`);
        setTimeout(connectToServer, delay);
    }
}

// Handle messages from the server
function handleServerMessage(message) {
    console.log('Received message:', message.type);

    switch (message.type) {
        case 'init':
            // Initialize data from server
            if (message.data.tickets) {
                localStorage.setItem('tickets', JSON.stringify(message.data.tickets));
            }
            if (message.data.users) {
                localStorage.setItem('users', JSON.stringify(message.data.users));
            }
            if (message.data.messageLogs) {
                localStorage.setItem('messageLogs', JSON.stringify(message.data.messageLogs));
            }

            // Refresh the page if needed
            if (window.needsRefresh) {
                window.location.reload();
                window.needsRefresh = false;
            }
            break;

        case 'tickets-updated':
            localStorage.setItem('tickets', JSON.stringify(message.data));
            showToast('Tickets updated from another user', 'info');
            refreshIfRelevant('tickets');
            break;

        case 'users-updated':
            localStorage.setItem('users', JSON.stringify(message.data));
            showToast('User data updated from another user', 'info');
            refreshIfRelevant('users');
            break;

        case 'logs-updated':
            localStorage.setItem('messageLogs', JSON.stringify(message.data));
            refreshIfRelevant('logs');
            break;

        case 'new-ticket':
            showToast('New ticket created by another user', 'info');
            refreshIfRelevant('tickets');
            break;

        case 'ticket-updated':
            showToast(`Ticket ${message.data.ticketId} was updated to ${message.data.status}`, 'info');
            refreshIfRelevant('tickets');
            break;

        case 'new-comment':
            showToast('New comment added to a ticket', 'info');
            refreshIfRelevant('tickets');
            break;
    }
}

// Refresh the page if we're on a relevant page
function refreshIfRelevant(dataType) {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    if (dataType === 'tickets') {
        if (currentPath === 'dashboard.html' ||
            currentPath === 'pending-approvals.html' ||
            currentPath.includes('ticket-details.html')) {

            // Add a small delay to allow for multiple updates
            clearTimeout(window.refreshTimeout);
            window.refreshTimeout = setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } else if (dataType === 'users') {
        if (currentPath === 'admin-panel.html') {
            clearTimeout(window.refreshTimeout);
            window.refreshTimeout = setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } else if (dataType === 'logs') {
        if (currentPath === 'message-log.html') {
            clearTimeout(window.refreshTimeout);
            window.refreshTimeout = setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
}

// Send a message to the server
function sendToServer(message) {
    if (isConnected && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        // Queue the message to be sent when connected
        pendingMessages.push(message);

        // Try to connect if not already connecting
        if (currentStatus !== connectionStatus.CONNECTING) {
            connectToServer();
        }
    }
}

// Create a status indicator in the UI
function createStatusIndicator() {
    // Create status indicator
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connection-status';
    statusDiv.className = 'fixed bottom-4 left-24 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center';
    statusDiv.innerHTML = `
        <span id="status-indicator" class="w-3 h-3 rounded-full mr-2"></span>
        <span id="status-text">Disconnected</span>
    `;
    document.body.appendChild(statusDiv);

    // Create connect button
    const connectButton = document.createElement('button');
    connectButton.id = 'manual-connect-button';
    connectButton.className = 'fixed bottom-4 right-20 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    connectButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
    `;
    connectButton.title = "Connect to server";
    connectButton.onclick = () => {
        debugLog('Manual connection attempt');
        connectToServer();
    };
    document.body.appendChild(connectButton);

    // Set initial status
    updateStatusIndicator(connectionStatus.DISCONNECTED);
}

// Update the status indicator
function updateStatusIndicator(status) {
    currentStatus = status;

    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');

    if (!indicator || !text) return;

    switch (status) {
        case connectionStatus.CONNECTED:
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-green-500';
            text.textContent = 'Connected';
            indicator.parentElement.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-green-100 text-green-800';
            break;

        case connectionStatus.DISCONNECTED:
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-gray-500';
            text.textContent = 'Disconnected';
            indicator.parentElement.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-gray-100 text-gray-800';
            break;

        case connectionStatus.CONNECTING:
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-yellow-500 animate-pulse';
            text.textContent = 'Connecting...';
            indicator.parentElement.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-yellow-100 text-yellow-800';
            break;

        case connectionStatus.ERROR:
            indicator.className = 'w-3 h-3 rounded-full mr-2 bg-red-500';
            text.textContent = 'Connection Error';
            indicator.parentElement.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-red-100 text-red-800';
            break;
    }
}

// Override localStorage functions to use shared storage
function overrideStorageFunctions() {
    // Store original functions
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;

    // Override setItem
    localStorage.setItem = function(key, value) {
        // Call original function
        originalSetItem.call(localStorage, key, value);

        // Sync with server for specific keys
        if (key === 'tickets') {
            sendToServer({
                type: 'update-tickets',
                data: JSON.parse(value)
            });
        } else if (key === 'users') {
            sendToServer({
                type: 'update-users',
                data: JSON.parse(value)
            });
        } else if (key === 'messageLogs') {
            sendToServer({
                type: 'update-logs',
                data: JSON.parse(value)
            });
        }
    };

    // Override removeItem
    localStorage.removeItem = function(key) {
        // Call original function
        originalRemoveItem.call(localStorage, key);

        // Sync with server for specific keys
        if (key === 'tickets') {
            sendToServer({
                type: 'update-tickets',
                data: []
            });
        } else if (key === 'users') {
            sendToServer({
                type: 'update-users',
                data: []
            });
        } else if (key === 'messageLogs') {
            sendToServer({
                type: 'update-logs',
                data: []
            });
        }
    };

    // Override clear
    localStorage.clear = function() {
        // Call original function
        originalClear.call(localStorage);

        // Sync with server
        sendToServer({
            type: 'update-tickets',
            data: []
        });

        sendToServer({
            type: 'update-users',
            data: []
        });

        sendToServer({
            type: 'update-logs',
            data: []
        });
    };

    // Override ticket functions
    const originalCreateTicket = window.createTicket;
    if (originalCreateTicket) {
        window.createTicket = function(title, description) {
            const newTicket = originalCreateTicket(title, description);

            // Notify server about new ticket
            sendToServer({
                type: 'new-ticket',
                data: newTicket
            });

            return newTicket;
        };
    }

    // Override ticket status update functions
    const originalUpdateTicketStatus = window.updateTicketStatus;
    if (originalUpdateTicketStatus) {
        window.updateTicketStatus = function(ticketId, newStatus) {
            const updatedTicket = originalUpdateTicketStatus(ticketId, newStatus);

            // Notify server about ticket update
            sendToServer({
                type: 'ticket-updated',
                data: {
                    ticketId,
                    status: newStatus
                }
            });

            return updatedTicket;
        };
    }

    // Override comment functions
    const originalAddComment = window.addComment;
    if (originalAddComment) {
        window.addComment = function(ticketId, content) {
            const newComment = originalAddComment(ticketId, content);

            // Notify server about new comment
            sendToServer({
                type: 'new-comment',
                data: {
                    ticketId,
                    comment: newComment
                }
            });

            return newComment;
        };
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        initializeWebSocket();
    }
});
