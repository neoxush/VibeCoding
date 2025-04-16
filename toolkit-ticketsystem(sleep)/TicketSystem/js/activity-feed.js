// Activity Feed - Shows real-time activities from other users
// This module provides a live feed of actions happening in the system

// Configuration
const MAX_ACTIVITIES = 20; // Maximum number of activities to store
let activityFeedVisible = localStorage.getItem('activityFeedVisible') === 'true';

// Initialize activity feed
function initActivityFeed() {
    console.log('Initializing activity feed...');

    // Create activity feed container
    createActivityFeedContainer();

    // Create toggle button
    createActivityFeedButton();

    // Add event listeners for data changes
    document.addEventListener('dataChanged', handleDataChangesForActivity);

    // Load initial activities
    loadActivities();

    console.log('Activity feed initialized.');
}

// Create activity feed container
function createActivityFeedContainer() {
    const container = document.createElement('div');
    container.id = 'activity-feed-container';
    container.className = `bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 ease-in-out transform ${activityFeedVisible ? 'translate-y-0' : 'translate-y-full'}`;
    container.innerHTML = `
        <div class="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center">
            <h3 class="font-medium text-sm">Activity Feed</h3>
            <button id="close-activity-feed" class="text-white hover:text-indigo-200">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div id="activity-list" class="max-h-64 overflow-y-auto p-2 space-y-2">
            <p class="text-gray-500 text-sm text-center py-4">No recent activity</p>
        </div>
    `;
    document.body.appendChild(container);

    // Add event listener for close button
    document.getElementById('close-activity-feed').addEventListener('click', toggleActivityFeed);
}

// Create activity feed toggle button
function createActivityFeedButton() {
    // Check if button already exists
    if (document.getElementById('activity-feed-button')) {
        return; // Button already exists, don't create a duplicate
    }

    const button = document.createElement('button');
    button.id = 'activity-feed-button';
    button.className = 'bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
    button.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
        </svg>
    `;
    button.title = "Activity Feed";
    button.onclick = toggleActivityFeed;

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

    // Add notification badge if there are new activities
    updateActivityBadge();
}

// Toggle activity feed visibility
function toggleActivityFeed() {
    activityFeedVisible = !activityFeedVisible;
    localStorage.setItem('activityFeedVisible', activityFeedVisible);

    const container = document.getElementById('activity-feed-container');
    if (container) {
        if (activityFeedVisible) {
            container.classList.remove('translate-y-full');
            container.classList.add('translate-y-0');
        } else {
            container.classList.remove('translate-y-0');
            container.classList.add('translate-y-full');
        }
    }

    // Clear notification badge
    if (activityFeedVisible) {
        clearNewActivitiesFlag();
        updateActivityBadge();
    }
}

// Update activity badge
function updateActivityBadge() {
    const button = document.getElementById('activity-feed-button');
    if (!button) return;

    const hasNewActivities = localStorage.getItem('hasNewActivities') === 'true';

    // Remove existing badge if any
    const existingBadge = button.querySelector('.activity-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    // Add badge if there are new activities
    if (hasNewActivities && !activityFeedVisible) {
        const badge = document.createElement('span');
        badge.className = 'activity-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center';
        badge.textContent = '!';
        button.appendChild(badge);
    }
}

// Clear new activities flag
function clearNewActivitiesFlag() {
    localStorage.setItem('hasNewActivities', 'false');
}

// Set new activities flag
function setNewActivitiesFlag() {
    localStorage.setItem('hasNewActivities', 'true');
    updateActivityBadge();
}

// Load activities from localStorage
function loadActivities() {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');

    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    if (activities.length === 0) {
        activityList.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No recent activity</p>';
        return;
    }

    activityList.innerHTML = '';

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Display activities
    activities.forEach(activity => {
        const activityItem = createActivityItem(activity);
        activityList.appendChild(activityItem);
    });
}

// Create activity item element
function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-indigo-500';

    // Format timestamp
    const timestamp = new Date(activity.timestamp);
    const timeAgo = getTimeAgo(timestamp);

    // Set border color based on activity type
    switch (activity.type) {
        case 'ticket_created':
            item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-green-500';
            break;
        case 'ticket_updated':
            item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-blue-500';
            break;
        case 'ticket_approved':
            item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-indigo-500';
            break;
        case 'ticket_rejected':
            item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-red-500';
            break;
        case 'comment_added':
            item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-yellow-500';
            break;
        case 'user_login':
            item.className = 'bg-gray-50 rounded p-2 text-sm border-l-4 border-purple-500';
            break;
    }

    item.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="font-medium">${activity.user}</div>
            <div class="text-xs text-gray-500">${timeAgo}</div>
        </div>
        <div>${activity.message}</div>
    `;

    return item;
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }

    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }

    return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}

// Add activity
function addActivity(activity) {
    // Get current activities
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');

    // Add new activity
    activities.unshift(activity);

    // Limit to max activities
    if (activities.length > MAX_ACTIVITIES) {
        activities.length = MAX_ACTIVITIES;
    }

    // Save activities
    localStorage.setItem('activities', JSON.stringify(activities));

    // Set new activities flag
    setNewActivitiesFlag();

    // Reload activities
    loadActivities();
}

// Handle data changes for activity feed
function handleDataChangesForActivity(event) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Check for new tickets
    checkForNewTickets(currentUser);

    // Check for status changes
    checkForStatusChanges(currentUser);

    // Check for new comments
    checkForNewComments(currentUser);
}

// Check for new tickets
function checkForNewTickets(currentUser) {
    const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
    const lastCheckTime = localStorage.getItem('lastTicketCheckTime') || '0';

    // Find new tickets
    const newTickets = tickets.filter(ticket =>
        new Date(ticket.createdAt) > new Date(lastCheckTime) &&
        ticket.createdBy !== currentUser.id
    );

    // Add activities for new tickets
    newTickets.forEach(ticket => {
        const creator = getUserName(ticket.createdBy);

        addActivity({
            type: 'ticket_created',
            user: creator,
            message: `Created ticket "${ticket.title}"`,
            timestamp: ticket.createdAt
        });
    });

    // Update last check time
    localStorage.setItem('lastTicketCheckTime', new Date().toISOString());
}

// Check for status changes
function checkForStatusChanges(currentUser) {
    const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
    const lastCheckTime = localStorage.getItem('lastStatusCheckTime') || '0';

    // Find tickets with status changes
    const changedTickets = tickets.filter(ticket =>
        ticket.statusUpdatedAt &&
        new Date(ticket.statusUpdatedAt) > new Date(lastCheckTime) &&
        ticket.statusUpdatedBy !== currentUser.id
    );

    // Add activities for status changes
    changedTickets.forEach(ticket => {
        const updater = getUserName(ticket.statusUpdatedBy);
        let activityType = 'ticket_updated';
        let message = `Updated ticket "${ticket.title}" status to ${ticket.status}`;

        if (ticket.status === 'approved') {
            activityType = 'ticket_approved';
            message = `Approved ticket "${ticket.title}"`;
        } else if (ticket.status === 'rejected') {
            activityType = 'ticket_rejected';
            message = `Rejected ticket "${ticket.title}"`;
        }

        addActivity({
            type: activityType,
            user: updater,
            message: message,
            timestamp: ticket.statusUpdatedAt
        });
    });

    // Update last check time
    localStorage.setItem('lastStatusCheckTime', new Date().toISOString());
}

// Check for new comments
function checkForNewComments(currentUser) {
    const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
    const lastCheckTime = localStorage.getItem('lastCommentCheckTime') || '0';

    // Find tickets with new comments
    tickets.forEach(ticket => {
        if (!ticket.comments) return;

        const newComments = ticket.comments.filter(comment =>
            new Date(comment.timestamp) > new Date(lastCheckTime) &&
            comment.userId !== currentUser.id
        );

        // Add activities for new comments
        newComments.forEach(comment => {
            const commenter = getUserName(comment.userId);

            addActivity({
                type: 'comment_added',
                user: commenter,
                message: `Commented on "${ticket.title}": "${comment.text.substring(0, 30)}${comment.text.length > 30 ? '...' : ''}"`,
                timestamp: comment.timestamp
            });
        });
    });

    // Update last check time
    localStorage.setItem('lastCommentCheckTime', new Date().toISOString());
}

// Get user name by ID
function getUserName(userId) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);

    return user ? user.name : 'Unknown User';
}

// Override ticket operations to add activities
const originalCreateTicket = window.createTicket;
if (originalCreateTicket) {
    window.createTicket = function(...args) {
        const result = originalCreateTicket.apply(this, args);

        // Add activity for current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        addActivity({
            type: 'ticket_created',
            user: currentUser.name || 'You',
            message: `Created ticket "${result.title}"`,
            timestamp: result.createdAt
        });

        return result;
    };
}

const originalUpdateTicketStatus = window.updateTicketStatus;
if (originalUpdateTicketStatus) {
    window.updateTicketStatus = function(...args) {
        const result = originalUpdateTicketStatus.apply(this, args);

        // Add activity for current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        let activityType = 'ticket_updated';
        let message = `Updated ticket "${result.title}" status to ${result.status}`;

        if (result.status === 'approved') {
            activityType = 'ticket_approved';
            message = `Approved ticket "${result.title}"`;
        } else if (result.status === 'rejected') {
            activityType = 'ticket_rejected';
            message = `Rejected ticket "${result.title}"`;
        }

        addActivity({
            type: activityType,
            user: currentUser.name || 'You',
            message: message,
            timestamp: new Date().toISOString()
        });

        return result;
    };
}

const originalAddComment = window.addComment;
if (originalAddComment) {
    window.addComment = function(...args) {
        const result = originalAddComment.apply(this, args);

        // Add activity for current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const ticketId = args[0];
        const commentText = args[1];

        // Get ticket title
        const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
        const ticket = tickets.find(t => t.id === ticketId);

        if (ticket) {
            addActivity({
                type: 'comment_added',
                user: currentUser.name || 'You',
                message: `Commented on "${ticket.title}": "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`,
                timestamp: new Date().toISOString()
            });
        }

        return result;
    };
}

// Add login activity
const originalLoginUser = window.loginUser;
if (originalLoginUser) {
    window.loginUser = function(...args) {
        const result = originalLoginUser.apply(this, args);

        // Add activity
        addActivity({
            type: 'user_login',
            user: result.name || 'Unknown User',
            message: 'Logged in',
            timestamp: new Date().toISOString()
        });

        return result;
    };
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        initActivityFeed();
    }
});
