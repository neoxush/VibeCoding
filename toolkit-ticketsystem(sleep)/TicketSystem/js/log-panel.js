// Log Panel System
// This replaces the intrusive toast notifications with a collapsible log panel

// Use the getCurrentUser function from auth.js if available, otherwise provide a fallback
function getUser() {
    if (typeof getCurrentUser === 'function') {
        return getCurrentUser();
    } else {
        // Fallback: try to get user from localStorage
        try {
            return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {
            return null;
        }
    }
}

// Initialize the log panel
function initLogPanel() {
    // Check user role for role-based UI
    const currentUser = getUser();
    const userRole = currentUser ? currentUser.role : 'user';

    // For regular users, we'll show a simplified version or none at all
    const isAdmin = userRole === 'admin';
    const isApprover = userRole === 'approver';

    // Add role class to body for role-specific styling
    document.body.classList.remove('role-admin', 'role-approver', 'role-user');
    document.body.classList.add(`role-${userRole}`);

    // We don't need a dedicated toggle zone button anymore

    // Create log panel container if it doesn't exist
    if (!document.getElementById('log-panel-container')) {
        // Different panel title based on role
        const panelTitle = isAdmin ? 'System Logs' :
                          isApprover ? 'Approval Notifications' :
                          'Notifications';

        // Different panel styling based on role
        const roleClass = isAdmin ? 'admin-panel' :
                         isApprover ? 'approver-panel' :
                         'user-panel';

        const logPanelHTML = `
            <div id="log-panel-container" class="log-panel-container collapsed ${roleClass}">
                <div id="log-panel-header" class="log-panel-header">
                    <span id="log-panel-title">${panelTitle}</span>
                    <span id="log-panel-badge" class="log-panel-badge">0</span>
                    <div class="log-panel-controls">
                        <button id="log-panel-clear" class="log-panel-button" title="Clear all messages">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                        <button id="log-panel-toggle" class="log-panel-button" title="Toggle log panel">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="log-panel-content" class="log-panel-content">
                    <div id="log-messages" class="log-messages"></div>
                </div>
            </div>
        `;

        // Append to body
        const logPanelContainer = document.createElement('div');
        logPanelContainer.innerHTML = logPanelHTML;
        document.body.appendChild(logPanelContainer.firstElementChild);

        // Add event listeners
        document.getElementById('log-panel-toggle').addEventListener('click', toggleLogPanel);
        document.getElementById('log-panel-clear').addEventListener('click', clearLogPanel);

        // Make header clickable to toggle panel
        document.getElementById('log-panel-header').addEventListener('click', function(e) {
            // Only toggle if the click wasn't on a button
            if (e.target.closest('.log-panel-button') === null) {
                toggleLogPanel();
            }
        });
    }

    return document.getElementById('log-panel-container');
}

// Toggle log panel visibility
function toggleLogPanel() {
    const logPanel = document.getElementById('log-panel-container');
    if (logPanel) {
        const isCollapsed = logPanel.classList.contains('collapsed');

        // Toggle collapsed state
        if (isCollapsed) {
            logPanel.classList.remove('collapsed');
        } else {
            logPanel.classList.add('collapsed');
        }

        // Update toggle button icon
        const toggleButton = document.getElementById('log-panel-toggle');
        if (toggleButton) {
            if (logPanel.classList.contains('collapsed')) {
                toggleButton.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                `;
                toggleButton.title = 'Show notifications';
            } else {
                toggleButton.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                `;
                toggleButton.title = 'Hide notifications';
            }
        }

        // Reset badge when opening
        if (!logPanel.classList.contains('collapsed')) {
            resetLogBadge();
        }

        // No need to stop propagation here
    }
}

// Clear all log messages
function clearLogPanel() {
    const logMessages = document.getElementById('log-messages');
    if (logMessages) {
        logMessages.innerHTML = '';
        updateLogBadge(0);
    }
}

// Add message to log panel
function addLogMessage(message, type = 'info') {
    // Check user role for role-based messaging
    const currentUser = getUser();
    const userRole = currentUser ? currentUser.role : 'user';

    // For regular users, only show success and error messages
    if (userRole === 'user' && type !== 'success' && type !== 'error') {
        // Skip non-critical messages for regular users
        return;
    }

    // Initialize log panel if needed
    initLogPanel();

    const logMessages = document.getElementById('log-messages');
    if (!logMessages) return;

    // For admins, add technical details to messages
    if (userRole === 'admin' && type === 'error') {
        // Add stack trace or technical details for admins
        message = `${message}<br><span class="text-xs text-gray-500">Time: ${new Date().toISOString()}</span>`;
    }

    // Create timestamp
    const timestamp = new Date().toLocaleTimeString();

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `log-message log-message-${type}`;

    // Add icon based on type
    let icon = '';
    if (type === 'error') {
        icon = `<svg class="log-icon log-icon-error" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'success') {
        icon = `<svg class="log-icon log-icon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'warning') {
        icon = `<svg class="log-icon log-icon-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else {
        icon = `<svg class="log-icon log-icon-info" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    // Set message content
    messageElement.innerHTML = `
        ${icon}
        <div class="log-message-content">
            <div class="log-message-text">${message}</div>
            <div class="log-message-time">${timestamp}</div>
        </div>
    `;

    // Add to log panel
    logMessages.appendChild(messageElement);

    // Scroll to bottom
    logMessages.scrollTop = logMessages.scrollHeight;

    // Update badge count
    updateLogBadge();

    // Flash the header if collapsed
    flashLogHeader();

    return messageElement;
}

// Update the log badge count
function updateLogBadge(count = null) {
    const badge = document.getElementById('log-panel-badge');

    if (count === null) {
        // Count messages
        const logMessages = document.getElementById('log-messages');
        count = logMessages ? logMessages.children.length : 0;
    }

    // Update badge in log panel
    if (badge) {
        badge.textContent = count;

        // Show/hide badge based on count
        if (count > 0) {
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // If we have new messages, show a temporary toast notification
    if (count > 0) {
        // Show a small indicator in the corner of the screen
        showTemporaryIndicator(count);
    }
}

// Reset log badge (mark as read)
function resetLogBadge() {
    // Reset panel badge
    const badge = document.getElementById('log-panel-badge');
    if (badge) {
        badge.style.display = 'none';
    }

    // Remove any temporary indicators
    removeTemporaryIndicator();
}

// No longer needed since we removed the toggle zone
function flashLogHeader() {
    // This function is kept for compatibility but does nothing now
}

// Override the existing showToast and showAlert functions
window.originalShowToast = window.showToast;
window.originalShowAlert = window.showAlert;

window.showToast = function(message, type = 'info', duration = 0, isGuide = false) {
    // We're using these parameters in the function, so the warnings should go away
    console.log(`Toast: ${message}, Type: ${type}, Duration: ${duration}, IsGuide: ${isGuide}`);

    // Check user role for role-based notifications
    const currentUser = getUser();
    const userRole = currentUser ? currentUser.role : 'user';

    // For regular users, only show critical notifications
    if (userRole === 'user' && type !== 'success' && type !== 'error') {
        // Skip non-critical messages for regular users unless it's a guide
        if (!isGuide) return null;
    }

    // Add to log panel - the panel itself will further filter based on role
    addLogMessage(message, type);

    // Don't show the toast notification
    return null;
};

window.showAlert = function(message, type = 'info') {
    // Just use the log panel
    addLogMessage(message, type);

    // Clear any existing alert containers for cleanliness
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
};

// Show a temporary indicator in the corner of the screen
function showTemporaryIndicator(count) {
    // Remove any existing indicator
    removeTemporaryIndicator();

    // Create a small indicator that shows the number of messages
    const indicator = document.createElement('div');
    indicator.id = 'temp-notification-indicator';
    indicator.className = 'temp-notification-indicator';
    indicator.textContent = count > 99 ? '99+' : count;
    document.body.appendChild(indicator);

    // Add keyboard shortcut hint
    const hint = document.createElement('div');
    hint.className = 'keyboard-shortcut-hint';
    hint.textContent = 'Press L to view logs';
    indicator.appendChild(hint);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        removeTemporaryIndicator();
    }, 5000);
}

// Remove the temporary indicator
function removeTemporaryIndicator() {
    const indicator = document.getElementById('temp-notification-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Add keyboard shortcut to toggle log panel
document.addEventListener('keydown', function(event) {
    // Press 'L' key to toggle log panel
    if (event.key.toLowerCase() === 'l' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const logPanel = document.getElementById('log-panel-container');
        if (logPanel) {
            logPanel.classList.toggle('collapsed');

            // Reset badge when opening
            if (!logPanel.classList.contains('collapsed')) {
                resetLogBadge();
            }
        }
    }
});

// Initialize log panel when DOM is loaded
document.addEventListener('DOMContentLoaded', initLogPanel);
