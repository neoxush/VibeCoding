/**
 * Notification System
 * A clean, non-intrusive notification system with status bar and hover tooltips
 */

// Configuration
const MAX_NOTIFICATIONS = 50; // Maximum number of notifications to store
const MAX_VISIBLE_NOTIFICATIONS = 10; // Maximum number of notifications to show in the notification center
const NOTIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// State
let notifications = []; // Array of notification objects
let statusMessages = {}; // Current status messages by category
let notificationCenter = null; // Reference to notification center element
let statusBar = null; // Reference to status bar element

// Initialize notification system
function initNotificationSystem() {
    // Don't initialize on login or register pages
    if (isOnPage('login.html') || isOnPage('register.html') || isOnPage('index.html')) {
        return;
    }

    console.log('Initializing notification system...');

    // Load saved notifications
    loadNotifications();

    // Create status bar
    createStatusBar();

    // Create notification center
    createNotificationCenter();

    // Set up keyboard shortcut (N key)
    document.addEventListener('keydown', function(event) {
        // Press 'N' key to toggle notification center
        if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.altKey && !event.metaKey) {
            toggleNotificationCenter();
        }
    });

    // Clean up old notifications
    cleanupOldNotifications();
}

// Helper function to check current page
function isOnPage(pageName) {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    return currentPath === pageName;
}

// Create status bar
function createStatusBar() {
    // Check if status bar already exists
    if (document.getElementById('status-bar')) {
        statusBar = document.getElementById('status-bar');
        return;
    }

    // Get current user for role-specific styling
    const currentUser = getCurrentUser();
    const userRole = currentUser ? currentUser.role : 'user';
    
    // Create status bar element
    statusBar = document.createElement('div');
    statusBar.id = 'status-bar';
    statusBar.className = `status-bar ${userRole}-status`;
    
    // Create status bar content
    statusBar.innerHTML = `
        <div class="status-left">
            <div class="status-indicator status-success" id="status-connection">
                <div class="status-indicator-icon"></div>
                <div class="status-indicator-text">Connected</div>
                <div class="tooltip">System is connected and working properly</div>
            </div>
        </div>
        <div class="status-center" id="status-message">
            <div class="status-message-ticker">
                <div class="status-message-ticker-content" id="status-ticker-content">
                    Welcome to the Ticket System
                </div>
            </div>
        </div>
        <div class="status-right">
            <div class="notification-counter" id="notification-counter" onclick="toggleNotificationCenter()">
                <div class="notification-counter-icon">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                </div>
                <div class="notification-counter-badge" id="notification-badge">0</div>
                <div class="tooltip">View notifications (Press 'N')</div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(statusBar);
    
    // Update notification badge
    updateNotificationBadge();
}

// Create notification center
function createNotificationCenter() {
    // Check if notification center already exists
    if (document.getElementById('notification-center')) {
        notificationCenter = document.getElementById('notification-center');
        return;
    }
    
    // Get current user for role-specific title
    const currentUser = getCurrentUser();
    const userRole = currentUser ? currentUser.role : 'user';
    
    // Different title based on role
    const centerTitle = userRole === 'admin' ? 'System Notifications' : 
                       userRole === 'approver' ? 'Approval Notifications' : 
                       'Notifications';
    
    // Create notification center element
    notificationCenter = document.createElement('div');
    notificationCenter.id = 'notification-center';
    notificationCenter.className = 'notification-center';
    
    // Create notification center content
    notificationCenter.innerHTML = `
        <div class="notification-center-header">
            <div class="notification-center-title">${centerTitle}</div>
            <div class="notification-center-controls">
                <button id="notification-clear" class="notification-center-button" title="Clear all notifications">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
                <button id="notification-close" class="notification-center-button" title="Close">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
        <div class="notification-center-content">
            <div class="notification-list" id="notification-list">
                <!-- Notifications will be inserted here -->
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notificationCenter);
    
    // Add event listeners
    document.getElementById('notification-clear').addEventListener('click', clearAllNotifications);
    document.getElementById('notification-close').addEventListener('click', closeNotificationCenter);
    
    // Render notifications
    renderNotifications();
}

// Toggle notification center
function toggleNotificationCenter() {
    if (!notificationCenter) return;
    
    const isVisible = notificationCenter.classList.contains('show');
    
    if (isVisible) {
        closeNotificationCenter();
    } else {
        openNotificationCenter();
    }
}

// Open notification center
function openNotificationCenter() {
    if (!notificationCenter) return;
    
    notificationCenter.classList.add('show');
    
    // Mark all as read
    markAllNotificationsAsRead();
    
    // Update badge
    updateNotificationBadge();
}

// Close notification center
function closeNotificationCenter() {
    if (!notificationCenter) return;
    
    notificationCenter.classList.remove('show');
}

// Add a notification
function addNotification(message, type = 'info', options = {}) {
    // Get current user for role-based filtering
    const currentUser = getCurrentUser();
    const userRole = currentUser ? currentUser.role : 'user';
    
    // For regular users, only show success and error notifications
    if (userRole === 'user' && type !== 'success' && type !== 'error' && !options.forceShow) {
        // Skip non-critical messages for regular users
        return;
    }
    
    // Create notification object
    const notification = {
        id: generateId(),
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        read: false,
        ...options
    };
    
    // Add to notifications array
    notifications.unshift(notification);
    
    // Limit the number of notifications
    if (notifications.length > MAX_NOTIFICATIONS) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS);
    }
    
    // Save notifications
    saveNotifications();
    
    // Update notification badge
    updateNotificationBadge();
    
    // Render notifications if notification center is open
    if (notificationCenter && notificationCenter.classList.contains('show')) {
        renderNotifications();
    }
    
    // Update status message
    updateStatusMessage(message, type);
    
    return notification;
}

// Update status message
function updateStatusMessage(message, type) {
    if (!statusBar) return;
    
    // Update ticker content
    const tickerContent = document.getElementById('status-ticker-content');
    if (tickerContent) {
        tickerContent.textContent = message;
        
        // Reset animation
        tickerContent.style.animation = 'none';
        setTimeout(() => {
            tickerContent.style.animation = '';
        }, 10);
    }
    
    // Update connection status indicator if it's an error
    if (type === 'error') {
        const connectionStatus = document.getElementById('status-connection');
        if (connectionStatus) {
            connectionStatus.className = 'status-indicator status-error';
            connectionStatus.querySelector('.status-indicator-text').textContent = 'Error';
            connectionStatus.querySelector('.tooltip').textContent = message;
        }
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    let changed = false;
    
    notifications.forEach(notification => {
        if (!notification.read) {
            notification.read = true;
            changed = true;
        }
    });
    
    if (changed) {
        saveNotifications();
        updateNotificationBadge();
    }
}

// Mark a notification as read
function markNotificationAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    
    if (notification && !notification.read) {
        notification.read = true;
        saveNotifications();
        updateNotificationBadge();
    }
}

// Remove a notification
function removeNotification(id) {
    const index = notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
        notifications.splice(index, 1);
        saveNotifications();
        updateNotificationBadge();
        renderNotifications();
    }
}

// Clear all notifications
function clearAllNotifications() {
    notifications = [];
    saveNotifications();
    updateNotificationBadge();
    renderNotifications();
    closeNotificationCenter();
}

// Render notifications in the notification center
function renderNotifications() {
    if (!notificationCenter) return;
    
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    // Get current user for role-based filtering
    const currentUser = getCurrentUser();
    const userRole = currentUser ? currentUser.role : 'user';
    
    // Filter notifications based on user role
    let filteredNotifications = notifications;
    
    if (userRole === 'user') {
        // Regular users only see success and error notifications
        filteredNotifications = notifications.filter(n => 
            n.type === 'success' || n.type === 'error' || n.forceShow
        );
    } else if (userRole === 'approver') {
        // Approvers see all notifications except admin-only ones
        filteredNotifications = notifications.filter(n => !n.adminOnly);
    }
    
    // Limit the number of visible notifications
    const visibleNotifications = filteredNotifications.slice(0, MAX_VISIBLE_NOTIFICATIONS);
    
    // Check if there are any notifications
    if (visibleNotifications.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-empty">
                <div class="notification-empty-icon">
                    <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                </div>
                <div>No notifications</div>
            </div>
        `;
        return;
    }
    
    // Render notifications
    let html = '';
    
    visibleNotifications.forEach(notification => {
        // Get icon based on type
        let icon = '';
        switch (notification.type) {
            case 'success':
                icon = `<svg class="notification-item-icon" fill="none" stroke="#10b981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`;
                break;
            case 'error':
                icon = `<svg class="notification-item-icon" fill="none" stroke="#ef4444" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`;
                break;
            case 'warning':
                icon = `<svg class="notification-item-icon" fill="none" stroke="#f59e0b" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>`;
                break;
            default:
                icon = `<svg class="notification-item-icon" fill="none" stroke="#3b82f6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`;
        }
        
        // Format timestamp
        const timestamp = new Date(notification.timestamp);
        const formattedTime = formatTimestamp(timestamp);
        
        // Create notification item
        html += `
            <div class="notification-item notification-item-${notification.type} ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
                ${icon}
                <div class="notification-item-content">
                    <div class="notification-item-text">${notification.message}</div>
                    <div class="notification-item-time">${formattedTime}</div>
                </div>
                <div class="notification-item-close" onclick="removeNotification('${notification.id}')">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
            </div>
        `;
    });
    
    // Add "more" message if there are more notifications
    if (filteredNotifications.length > MAX_VISIBLE_NOTIFICATIONS) {
        const moreCount = filteredNotifications.length - MAX_VISIBLE_NOTIFICATIONS;
        html += `
            <div class="notification-item notification-item-info">
                <div class="notification-item-content">
                    <div class="notification-item-text">And ${moreCount} more notification${moreCount > 1 ? 's' : ''}...</div>
                </div>
            </div>
        `;
    }
    
    // Update notification list
    notificationList.innerHTML = html;
    
    // Add click event to mark as read
    const notificationItems = notificationList.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', function(event) {
            // Ignore clicks on close button
            if (event.target.closest('.notification-item-close')) return;
            
            const id = this.dataset.id;
            markNotificationAsRead(id);
            
            // Update UI
            this.classList.add('read');
        });
    });
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    
    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Update badge
    badge.textContent = unreadCount;
    
    // Show/hide badge
    if (unreadCount > 0) {
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Save notifications to localStorage
function saveNotifications() {
    try {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
        console.error('Failed to save notifications:', error);
    }
}

// Load notifications from localStorage
function loadNotifications() {
    try {
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) {
            notifications = JSON.parse(savedNotifications);
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
        notifications = [];
    }
}

// Clean up old notifications
function cleanupOldNotifications() {
    const now = new Date().getTime();
    
    // Filter out notifications older than NOTIFICATION_EXPIRY
    const oldLength = notifications.length;
    notifications = notifications.filter(notification => {
        const timestamp = new Date(notification.timestamp).getTime();
        return (now - timestamp) < NOTIFICATION_EXPIRY;
    });
    
    // Save if any were removed
    if (oldLength !== notifications.length) {
        saveNotifications();
        updateNotificationBadge();
    }
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    
    // Less than a minute
    if (diff < 60 * 1000) {
        return 'Just now';
    }
    
    // Less than an hour
    if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return timestamp.toLocaleDateString();
}

// Helper function to generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Override the existing showToast and showAlert functions
window.originalShowToast = window.showToast;
window.originalShowAlert = window.showAlert;

window.showToast = function(message, type = 'info', duration = 0, isGuide = false) {
    // Add notification
    addNotification(message, type, { forceShow: isGuide });
    
    // Call original function for backward compatibility
    if (window.originalShowToast && typeof window.originalShowToast === 'function') {
        // Don't actually show the toast, just log it
        console.log(`Toast: ${message}, Type: ${type}, Duration: ${duration}, IsGuide: ${isGuide}`);
    }
    
    return null;
};

window.showAlert = function(message, type = 'info') {
    // Add notification
    addNotification(message, type, { forceShow: true });
    
    // Call original function for backward compatibility
    if (window.originalShowAlert && typeof window.originalShowAlert === 'function') {
        // Don't actually show the alert, just log it
        console.log(`Alert: ${message}, Type: ${type}`);
    }
    
    return null;
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initNotificationSystem);

// Export functions for external use
window.addNotification = addNotification;
window.toggleNotificationCenter = toggleNotificationCenter;
window.clearAllNotifications = clearAllNotifications;
window.removeNotification = removeNotification;
