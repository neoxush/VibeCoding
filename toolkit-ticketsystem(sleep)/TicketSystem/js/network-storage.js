// Network Storage - File-based shared storage for local network
// This module replaces localStorage with file-based storage in a shared network folder

// Configuration - CHANGE THIS PATH to your shared network folder
const SHARED_FOLDER_PATH = 'shared-data/';

// Data files
const DATA_FILES = {
    USERS: SHARED_FOLDER_PATH + 'users.json',
    TICKETS: SHARED_FOLDER_PATH + 'tickets.json',
    LOGS: SHARED_FOLDER_PATH + 'logs.json'
};

// Polling interval in milliseconds (how often to check for changes)
const POLLING_INTERVAL = 3000; // 3 seconds

// Last known modification times
let lastModified = {
    users: 0,
    tickets: 0,
    logs: 0
};

// Initialize storage
function initNetworkStorage() {
    console.log('Initializing network storage...');
    
    // Create shared folder if it doesn't exist
    createFolderIfNotExists(SHARED_FOLDER_PATH);
    
    // Create data files if they don't exist
    createFileIfNotExists(DATA_FILES.USERS, '[]');
    createFileIfNotExists(DATA_FILES.TICKETS, '[]');
    createFileIfNotExists(DATA_FILES.LOGS, '[]');
    
    // Start polling for changes
    startPolling();
    
    // Override localStorage methods
    overrideLocalStorage();
    
    console.log('Network storage initialized.');
}

// Create folder if it doesn't exist
function createFolderIfNotExists(folderPath) {
    try {
        const fs = require('fs');
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`Created folder: ${folderPath}`);
        }
    } catch (error) {
        console.error(`Error creating folder: ${folderPath}`, error);
    }
}

// Create file if it doesn't exist
function createFileIfNotExists(filePath, defaultContent) {
    try {
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, defaultContent);
            console.log(`Created file: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error creating file: ${filePath}`, error);
    }
}

// Start polling for changes
function startPolling() {
    // Initial load
    loadAllData();
    
    // Set up polling interval
    setInterval(() => {
        checkForChanges();
    }, POLLING_INTERVAL);
}

// Load all data from files
function loadAllData() {
    loadUsers();
    loadTickets();
    loadLogs();
}

// Load users from file
function loadUsers() {
    try {
        const fs = require('fs');
        const stats = fs.statSync(DATA_FILES.USERS);
        const modTime = stats.mtimeMs;
        
        // Only load if file has changed
        if (modTime > lastModified.users) {
            const data = fs.readFileSync(DATA_FILES.USERS, 'utf8');
            localStorage.setItem('users', data);
            lastModified.users = modTime;
            console.log('Loaded users from file.');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load tickets from file
function loadTickets() {
    try {
        const fs = require('fs');
        const stats = fs.statSync(DATA_FILES.TICKETS);
        const modTime = stats.mtimeMs;
        
        // Only load if file has changed
        if (modTime > lastModified.tickets) {
            const data = fs.readFileSync(DATA_FILES.TICKETS, 'utf8');
            localStorage.setItem('tickets', data);
            lastModified.tickets = modTime;
            console.log('Loaded tickets from file.');
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
}

// Load logs from file
function loadLogs() {
    try {
        const fs = require('fs');
        const stats = fs.statSync(DATA_FILES.LOGS);
        const modTime = stats.mtimeMs;
        
        // Only load if file has changed
        if (modTime > lastModified.logs) {
            const data = fs.readFileSync(DATA_FILES.LOGS, 'utf8');
            localStorage.setItem('messageLogs', data);
            lastModified.logs = modTime;
            console.log('Loaded logs from file.');
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// Check for changes in files
function checkForChanges() {
    try {
        const fs = require('fs');
        
        // Check users file
        const usersStats = fs.statSync(DATA_FILES.USERS);
        if (usersStats.mtimeMs > lastModified.users) {
            loadUsers();
            // Notify UI of changes
            notifyDataChanged('users');
        }
        
        // Check tickets file
        const ticketsStats = fs.statSync(DATA_FILES.TICKETS);
        if (ticketsStats.mtimeMs > lastModified.tickets) {
            loadTickets();
            // Notify UI of changes
            notifyDataChanged('tickets');
        }
        
        // Check logs file
        const logsStats = fs.statSync(DATA_FILES.LOGS);
        if (logsStats.mtimeMs > lastModified.logs) {
            loadLogs();
            // Notify UI of changes
            notifyDataChanged('logs');
        }
    } catch (error) {
        console.error('Error checking for changes:', error);
    }
}

// Notify UI of data changes
function notifyDataChanged(dataType) {
    // Create and dispatch a custom event
    const event = new CustomEvent('dataChanged', { detail: { dataType } });
    document.dispatchEvent(event);
    
    console.log(`Data changed: ${dataType}`);
}

// Save users to file
function saveUsers(data) {
    try {
        const fs = require('fs');
        fs.writeFileSync(DATA_FILES.USERS, data);
        lastModified.users = Date.now();
        console.log('Saved users to file.');
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Save tickets to file
function saveTickets(data) {
    try {
        const fs = require('fs');
        fs.writeFileSync(DATA_FILES.TICKETS, data);
        lastModified.tickets = Date.now();
        console.log('Saved tickets to file.');
    } catch (error) {
        console.error('Error saving tickets:', error);
    }
}

// Save logs to file
function saveLogs(data) {
    try {
        const fs = require('fs');
        fs.writeFileSync(DATA_FILES.LOGS, data);
        lastModified.logs = Date.now();
        console.log('Saved logs to file.');
    } catch (error) {
        console.error('Error saving logs:', error);
    }
}

// Override localStorage methods
function overrideLocalStorage() {
    // Store original methods
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    
    // Override setItem
    localStorage.setItem = function(key, value) {
        // Call original method
        originalSetItem.call(localStorage, key, value);
        
        // Save to file based on key
        if (key === 'users') {
            saveUsers(value);
        } else if (key === 'tickets') {
            saveTickets(value);
        } else if (key === 'messageLogs') {
            saveLogs(value);
        }
    };
    
    // Override getItem (not strictly necessary but included for completeness)
    localStorage.getItem = function(key) {
        // Ensure we have the latest data
        if (key === 'users') {
            loadUsers();
        } else if (key === 'tickets') {
            loadTickets();
        } else if (key === 'messageLogs') {
            loadLogs();
        }
        
        // Call original method
        return originalGetItem.call(localStorage, key);
    };
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        initNetworkStorage();
    }
});
