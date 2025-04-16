// Local Network Sync - Simple file-based synchronization for local networks
// This module enables real-time collaboration without databases or external APIs

// Configuration
const SYNC_INTERVAL = 5000; // 5 seconds - how often to check for changes
const AUTO_REFRESH = true;  // Whether to automatically refresh the page when data changes

// Last sync timestamp
let lastSyncTime = Date.now();

// Data version tracking
let dataVersions = {
    users: 0,
    tickets: 0,
    messageLogs: 0
};

// Status indicator element
let statusIndicator = null;

// Initialize the sync system
function initSync() {
    console.log('Initializing local network sync...');
    
    // Create status indicator
    createStatusIndicator();
    
    // Start sync process
    startSync();
    
    // Add event listeners for data changes
    addDataChangeListeners();
    
    console.log('Local network sync initialized.');
}

// Create status indicator
function createStatusIndicator() {
    statusIndicator = document.createElement('div');
    statusIndicator.id = 'sync-status';
    statusIndicator.className = 'fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium z-50 flex items-center bg-gray-100 text-gray-800';
    statusIndicator.innerHTML = `
        <span id="sync-indicator" class="w-3 h-3 rounded-full mr-2 bg-gray-500"></span>
        <span id="sync-text">Initializing...</span>
    `;
    document.body.appendChild(statusIndicator);
    
    // Add manual sync button
    const syncButton = document.createElement('button');
    syncButton.id = 'manual-sync-button';
    syncButton.className = 'fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    syncButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
    `;
    syncButton.title = "Sync Now";
    syncButton.onclick = manualSync;
    document.body.appendChild(syncButton);
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
    setInterval(syncData, SYNC_INTERVAL);
}

// Manual sync trigger
function manualSync() {
    console.log('Manual sync triggered');
    syncData(true);
}

// Sync data with shared storage
function syncData(isManual = false) {
    updateStatusIndicator('syncing', isManual ? 'Manual sync...' : 'Syncing...');
    
    try {
        // Get current data
        const currentData = {
            users: JSON.parse(localStorage.getItem('users') || '[]'),
            tickets: JSON.parse(localStorage.getItem('tickets') || '[]'),
            messageLogs: JSON.parse(localStorage.getItem('messageLogs') || '[]')
        };
        
        // Calculate data versions (simple hash based on JSON string length and content)
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
        
        if (hasLocalChanges) {
            console.log('Local changes detected, saving to shared storage');
            
            // In a real implementation, this would save to a shared network location
            // For now, we'll simulate by saving to localStorage with a special prefix
            localStorage.setItem('shared_users', JSON.stringify(currentData.users));
            localStorage.setItem('shared_tickets', JSON.stringify(currentData.tickets));
            localStorage.setItem('shared_messageLogs', JSON.stringify(currentData.messageLogs));
            
            // Update versions
            dataVersions = { ...newVersions };
            
            // Update last sync time
            lastSyncTime = Date.now();
            localStorage.setItem('lastSyncTime', lastSyncTime.toString());
            
            updateStatusIndicator('success', 'Changes saved');
        } else {
            // Check if shared data has changed
            const sharedData = {
                users: JSON.parse(localStorage.getItem('shared_users') || '[]'),
                tickets: JSON.parse(localStorage.getItem('shared_tickets') || '[]'),
                messageLogs: JSON.parse(localStorage.getItem('shared_messageLogs') || '[]')
            };
            
            const sharedVersions = {
                users: calculateVersion(sharedData.users),
                tickets: calculateVersion(sharedData.tickets),
                messageLogs: calculateVersion(sharedData.messageLogs)
            };
            
            const hasRemoteChanges = 
                sharedVersions.users !== dataVersions.users ||
                sharedVersions.tickets !== dataVersions.tickets ||
                sharedVersions.messageLogs !== dataVersions.messageLogs;
            
            if (hasRemoteChanges) {
                console.log('Remote changes detected, updating local data');
                
                // Update local data
                localStorage.setItem('users', JSON.stringify(sharedData.users));
                localStorage.setItem('tickets', JSON.stringify(sharedData.tickets));
                localStorage.setItem('messageLogs', JSON.stringify(sharedData.messageLogs));
                
                // Update versions
                dataVersions = { ...sharedVersions };
                
                // Update last sync time
                lastSyncTime = Date.now();
                localStorage.setItem('lastSyncTime', lastSyncTime.toString());
                
                // Notify about data changes
                notifyDataChanged();
                
                updateStatusIndicator('success', 'New data received');
            } else if (isManual) {
                updateStatusIndicator('success', 'Already in sync');
            } else {
                updateStatusIndicator('idle');
            }
        }
    } catch (error) {
        console.error('Error during sync:', error);
        updateStatusIndicator('error', 'Sync failed');
    }
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

// Notify about data changes
function notifyDataChanged() {
    // Create and dispatch a custom event
    const event = new CustomEvent('dataChanged');
    document.dispatchEvent(event);
    
    // Auto refresh if enabled
    if (AUTO_REFRESH) {
        // Don't refresh if we're on a form page or editing
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const isFormPage = 
            currentPath === 'create-ticket.html' || 
            (currentPath === 'ticket-details.html' && document.querySelector('form'));
        
        if (!isFormPage) {
            console.log('Auto refreshing page due to data changes');
            showToast('New data received. Refreshing...', 'info');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showToast('New data available. Finish your work and refresh.', 'info');
        }
    }
}

// Add event listeners for data changes
function addDataChangeListeners() {
    // Listen for localStorage changes
    window.addEventListener('storage', function(e) {
        // Only react to shared storage changes
        if (e.key && e.key.startsWith('shared_')) {
            console.log('Shared storage changed:', e.key);
            syncData();
        }
    });
    
    // Override ticket operations to trigger sync
    const originalCreateTicket = window.createTicket;
    if (originalCreateTicket) {
        window.createTicket = function(...args) {
            const result = originalCreateTicket.apply(this, args);
            syncData();
            return result;
        };
    }
    
    const originalUpdateTicketStatus = window.updateTicketStatus;
    if (originalUpdateTicketStatus) {
        window.updateTicketStatus = function(...args) {
            const result = originalUpdateTicketStatus.apply(this, args);
            syncData();
            return result;
        };
    }
    
    const originalAddComment = window.addComment;
    if (originalAddComment) {
        window.addComment = function(...args) {
            const result = originalAddComment.apply(this, args);
            syncData();
            return result;
        };
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        initSync();
    }
});
