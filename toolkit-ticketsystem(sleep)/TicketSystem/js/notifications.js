// Notifications system for real-time updates
// This module provides toast notifications and desktop notifications for important events

// Configuration
const NOTIFICATION_DURATION = 5000; // 5 seconds
let notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
let desktopNotificationsEnabled = localStorage.getItem('desktopNotificationsEnabled') === 'true';

// Initialize notifications
function initNotifications() {
    console.log('Initializing notifications system...');

    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 flex flex-col items-end space-y-2';
        document.body.appendChild(container);
    }

    // Create notification settings button
    createNotificationSettingsButton();

    // Request desktop notification permission if enabled
    if (desktopNotificationsEnabled) {
        requestNotificationPermission();
    }

    // Add event listeners for data changes
    document.addEventListener('dataChanged', handleDataChanges);

    console.log('Notifications system initialized.');
}

// Create notification settings button
function createNotificationSettingsButton() {
    // Check if button already exists
    if (document.getElementById('notification-settings-button')) {
        return; // Button already exists, don't create a duplicate
    }

    const button = document.createElement('button');
    button.id = 'notification-settings-button';
    button.className = 'bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500';
    button.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
    `;
    button.title = notificationsEnabled ? "Notifications enabled" : "Notifications disabled";
    button.style.backgroundColor = notificationsEnabled ? '#8B5CF6' : '#9CA3AF';

    button.onclick = toggleNotifications;

    // Add to toolbar using the global function if available
    if (typeof getOrCreateToolbar === 'function') {
        const toolbar = getOrCreateToolbar();
        toolbar.appendChild(button);
    } else {
        // Fallback to looking for toolbar directly
        const toolbar = document.querySelector('.bottom-toolbar');
        if (toolbar) {
            toolbar.appendChild(button);
        } else {
            // Last resort - add to body
            document.body.appendChild(button);
        }
    }
}

// Toggle notifications
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    localStorage.setItem('notificationsEnabled', notificationsEnabled);

    const button = document.getElementById('notification-settings-button');
    if (button) {
        button.title = notificationsEnabled ? "Notifications enabled" : "Notifications disabled";
        button.style.backgroundColor = notificationsEnabled ? '#8B5CF6' : '#9CA3AF';
    }

    // Show confirmation
    showToast(notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled', 'info');

    // If enabling, ask for desktop notification permission
    if (notificationsEnabled && !desktopNotificationsEnabled) {
        setTimeout(() => {
            showDesktopNotificationPrompt();
        }, 1000);
    }
}

// Show desktop notification prompt
function showDesktopNotificationPrompt() {
    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        enableDesktopNotifications();
        return;
    }

    // Create prompt
    const promptContainer = document.createElement('div');
    promptContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    promptContainer.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 class="text-xl font-bold mb-4">Enable Desktop Notifications?</h2>
            <p class="mb-4">Would you like to receive desktop notifications when tickets are updated?</p>
            <div class="flex justify-end space-x-3">
                <button id="desktop-no" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">No Thanks</button>
                <button id="desktop-yes" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Enable</button>
            </div>
        </div>
    `;
    document.body.appendChild(promptContainer);

    // Handle button clicks
    document.getElementById('desktop-no').addEventListener('click', () => {
        promptContainer.remove();
    });

    document.getElementById('desktop-yes').addEventListener('click', () => {
        promptContainer.remove();
        requestNotificationPermission();
    });
}

// Request notification permission
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            enableDesktopNotifications();
        }
    });
}

// Enable desktop notifications
function enableDesktopNotifications() {
    desktopNotificationsEnabled = true;
    localStorage.setItem('desktopNotificationsEnabled', 'true');
    showToast('Desktop notifications enabled', 'success');
}

// Track active notifications by message to prevent duplicates
let activeNotifications = new Map();

// Show a toast notification
function showNotification(message, type = 'info', duration = NOTIFICATION_DURATION) {
    if (!notificationsEnabled) return;

    const container = document.getElementById('notification-container');
    if (!container) return;

    // Check if this exact message is already being shown
    if (activeNotifications.has(message)) {
        console.log('Skipping duplicate notification:', message);
        return;
    }

    // Limit the number of notifications to 3
    if (container.children.length >= 3) {
        // Remove the oldest notification
        if (container.firstChild) {
            removeNotification(container.firstChild);
        }
    }

    const notification = document.createElement('div');
    notification.className = `transform transition-all duration-300 ease-out opacity-0 translate-x-8 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`;

    // Set color based on type
    let iconColor, bgColor;
    switch (type) {
        case 'success':
            iconColor = 'text-green-500';
            bgColor = 'bg-green-50';
            break;
        case 'error':
            iconColor = 'text-red-500';
            bgColor = 'bg-red-50';
            break;
        case 'warning':
            iconColor = 'text-yellow-500';
            bgColor = 'bg-yellow-50';
            break;
        default:
            iconColor = 'text-blue-500';
            bgColor = 'bg-blue-50';
    }

    // Create icon based on type
    let icon;
    switch (type) {
        case 'success':
            icon = `<svg class="h-6 w-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>`;
            break;
        case 'error':
            icon = `<svg class="h-6 w-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>`;
            break;
        case 'warning':
            icon = `<svg class="h-6 w-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>`;
            break;
        default:
            icon = `<svg class="h-6 w-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`;
    }

    notification.innerHTML = `
        <div class="p-4 ${bgColor}">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${icon}
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                    <p class="text-sm font-medium text-gray-900">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                    <button class="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
                        <span class="sr-only">Close</span>
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add to container
    container.appendChild(notification);

    // Track this notification
    activeNotifications.set(message, notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-x-8');
    }, 10);

    // Close button
    const closeButton = notification.querySelector('button');
    closeButton.addEventListener('click', () => {
        removeNotification(notification);
    });

    // Auto remove after duration
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
}

// Remove a notification with animation
function removeNotification(notification) {
    notification.classList.add('opacity-0', 'translate-x-8');

    // Remove from tracking map
    for (const [message, notif] of activeNotifications.entries()) {
        if (notif === notification) {
            activeNotifications.delete(message);
            break;
        }
    }

    setTimeout(() => {
        notification.remove();
    }, 300);
}

// Show a desktop notification
function showDesktopNotification(title, body) {
    if (!desktopNotificationsEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico'
    });

    notification.onclick = function() {
        window.focus();
        this.close();
    };
}

// Handle data changes
function handleDataChanges(event) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');

    // Get previous state to detect new tickets
    const previousState = JSON.parse(localStorage.getItem('previousTicketState') || '{}');
    const previousTickets = previousState.tickets || [];

    // Store current state for next comparison
    localStorage.setItem('previousTicketState', JSON.stringify({
        tickets: tickets,
        timestamp: new Date().toISOString()
    }));

    // Find tickets that need attention based on user role
    let relevantTickets = [];

    if (currentUser.role === 'admin' || currentUser.role === 'approver') {
        // Find pending approval tickets
        relevantTickets = tickets.filter(ticket => ticket.status === 'pending_approval');

        // Find newly created tickets (not in previous state)
        const newTickets = tickets.filter(ticket => {
            // Check if this ticket didn't exist before
            return !previousTickets.some(prevTicket => prevTicket.id === ticket.id);
        });

        // Notify about new tickets
        if (newTickets.length > 0) {
            showNotification(`${newTickets.length} new ticket(s) created`, 'success');

            if (newTickets.length === 1) {
                showDesktopNotification(
                    'New Ticket Created',
                    `"${newTickets[0].title}" was just created by ${getUserName(newTickets[0].createdBy)}`
                );
            } else {
                showDesktopNotification(
                    'New Tickets Created',
                    `${newTickets.length} new tickets were just created`
                );
            }
        }

        // Notify about pending approvals
        if (relevantTickets.length > 0) {
            showNotification(`${relevantTickets.length} ticket(s) pending approval`, 'info');

            if (relevantTickets.length === 1) {
                showDesktopNotification(
                    'Ticket Pending Approval',
                    `"${relevantTickets[0].title}" is waiting for your approval`
                );
            } else {
                showDesktopNotification(
                    'Tickets Pending Approval',
                    `${relevantTickets.length} tickets are waiting for your approval`
                );
            }
        }
    } else {
        // For regular users, find their tickets that have been approved/rejected
        const userTickets = tickets.filter(ticket =>
            ticket.createdBy === currentUser.id &&
            (ticket.status === 'approved' || ticket.status === 'rejected') &&
            ticket.statusUpdatedAt &&
            new Date(ticket.statusUpdatedAt) > new Date(Date.now() - 86400000) // Last 24 hours
        );

        if (userTickets.length > 0) {
            userTickets.forEach(ticket => {
                showNotification(
                    `Your ticket "${ticket.title}" was ${ticket.status}`,
                    ticket.status === 'approved' ? 'success' : 'error'
                );

                showDesktopNotification(
                    `Ticket ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`,
                    `Your ticket "${ticket.title}" was ${ticket.status}`
                );
            });
        }
    }
}

// Helper function to get user name by ID
function getUserName(userId) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
}

// Override the existing showToast function to use our notification system
window.originalShowToast = window.showToast;
window.showToast = function(message, type) {
    // Call original function for backward compatibility
    if (window.originalShowToast) {
        window.originalShowToast(message, type);
    }

    // Show notification
    showNotification(message, type);
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        initNotifications();
    }
});
