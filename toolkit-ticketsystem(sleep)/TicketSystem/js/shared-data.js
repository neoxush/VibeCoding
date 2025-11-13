// Cross-tab communication for simulated real-time collaboration
let ticketChannel;

// Initialize BroadcastChannel if supported
try {
    ticketChannel = new BroadcastChannel('ticket-system-channel');
} catch (e) {
    console.warn('BroadcastChannel not supported in this browser. Falling back to localStorage events.');
    // We'll use localStorage events as fallback
}

// Store original functions
const originalGetAllTickets = window.getAllTickets;
const originalCreateTicket = window.createTicket;
const originalUpdateTicketStatus = window.updateTicketStatus;
const originalAddComment = window.addComment;
const originalSubmitTicketForApproval = window.submitTicketForApproval;
const originalApproveTicket = window.approveTicket;
const originalRejectTicket = window.rejectTicket;
const originalCloseTicket = window.closeTicket;

// Override getAllTickets to ensure we have the latest data
window.getAllTickets = function() {
    return originalGetAllTickets();
};

// Override createTicket to broadcast the new ticket
window.createTicket = function(title, description) {
    const newTicket = originalCreateTicket(title, description);

    // Broadcast the new ticket to other tabs
    broadcastMessage({
        type: 'new-ticket',
        ticket: newTicket,
        sessionId: getSessionId()
    });

    return newTicket;
};

// Override updateTicketStatus to broadcast the status change
window.updateTicketStatus = function(ticketId, newStatus) {
    const updatedTicket = originalUpdateTicketStatus(ticketId, newStatus);

    // Broadcast the status change
    broadcastMessage({
        type: 'ticket-status-changed',
        ticketId: ticketId,
        newStatus: newStatus,
        sessionId: getSessionId()
    });

    return updatedTicket;
};

// Override submitTicketForApproval
window.submitTicketForApproval = function(ticketId) {
    const result = originalSubmitTicketForApproval(ticketId);

    // Broadcast the status change
    broadcastMessage({
        type: 'ticket-status-changed',
        ticketId: ticketId,
        newStatus: TICKET_STATUS.PENDING_APPROVAL,
        sessionId: getSessionId()
    });

    return result;
};

// Override approveTicket
window.approveTicket = function(ticketId) {
    const result = originalApproveTicket(ticketId);

    // Broadcast the status change
    broadcastMessage({
        type: 'ticket-status-changed',
        ticketId: ticketId,
        newStatus: TICKET_STATUS.APPROVED,
        sessionId: getSessionId()
    });

    return result;
};

// Override rejectTicket
window.rejectTicket = function(ticketId) {
    const result = originalRejectTicket(ticketId);

    // Broadcast the status change
    broadcastMessage({
        type: 'ticket-status-changed',
        ticketId: ticketId,
        newStatus: TICKET_STATUS.REJECTED,
        sessionId: getSessionId()
    });

    return result;
};

// Override closeTicket
window.closeTicket = function(ticketId) {
    const result = originalCloseTicket(ticketId);

    // Broadcast the status change
    broadcastMessage({
        type: 'ticket-status-changed',
        ticketId: ticketId,
        newStatus: TICKET_STATUS.CLOSED,
        sessionId: getSessionId()
    });

    return result;
};

// Override addComment to broadcast the new comment
window.addComment = function(ticketId, content) {
    const newComment = originalAddComment(ticketId, content);

    // Broadcast the new comment
    broadcastMessage({
        type: 'new-comment',
        ticketId: ticketId,
        comment: newComment,
        sessionId: getSessionId()
    });

    return newComment;
};

// Function to broadcast a message to other tabs
function broadcastMessage(message) {
    if (ticketChannel) {
        // Use BroadcastChannel if available
        ticketChannel.postMessage(message);
    } else {
        // Fallback to localStorage event
        const timestamp = new Date().getTime();
        localStorage.setItem('ticket-system-message', JSON.stringify({
            ...message,
            timestamp
        }));
        // Remove it immediately to allow future events with same data
        setTimeout(() => {
            localStorage.removeItem('ticket-system-message');
        }, 100);
    }
}

// Listen for messages from other tabs
function setupMessageListeners() {
    if (ticketChannel) {
        // BroadcastChannel method
        ticketChannel.onmessage = handleIncomingMessage;
    } else {
        // localStorage event method
        window.addEventListener('storage', function(e) {
            if (e.key === 'ticket-system-message' && e.newValue) {
                try {
                    const message = JSON.parse(e.newValue);
                    handleIncomingMessage({ data: message });
                } catch (err) {
                    console.error('Error parsing message:', err);
                }
            }
        });
    }
}

// Handle incoming messages from other tabs
function handleIncomingMessage(event) {
    const message = event.data;

    // Ignore messages from our own session
    if (message.sessionId === getSessionId()) {
        return;
    }

    console.log('Received message from another tab:', message);

    switch(message.type) {
        case 'new-ticket':
            // Refresh the ticket list if we're on the dashboard
            if (isOnPage('dashboard.html')) {
                showToast('New ticket created by another user', 'info');
                scheduleRefresh();
            } else if (isOnPage('pending-approvals.html') && message.ticket.status === TICKET_STATUS.PENDING_APPROVAL) {
                showToast('New ticket pending approval', 'info');
                scheduleRefresh();
            }
            break;

        case 'ticket-status-changed':
            // Refresh if we're viewing the affected ticket
            const currentTicketId = getUrlParameter('id');
            if (currentTicketId === message.ticketId) {
                showToast(`Ticket status changed to ${formatStatus(message.newStatus)}`, 'info');
                scheduleRefresh();
            }
            // Also refresh dashboard or pending approvals page
            else if (isOnPage('dashboard.html')) {
                showToast('A ticket status was updated', 'info');
                scheduleRefresh();
            }
            else if (isOnPage('pending-approvals.html')) {
                showToast('A pending ticket was updated', 'info');
                scheduleRefresh();
            }
            break;

        case 'new-comment':
            // Refresh if we're viewing the affected ticket
            const ticketId = getUrlParameter('id');
            if (ticketId === message.ticketId) {
                showToast('New comment added', 'info');
                scheduleRefresh();
            }
            break;
    }
}

// Format status for display
function formatStatus(status) {
    switch(status) {
        case TICKET_STATUS.OPEN:
            return 'Open';
        case TICKET_STATUS.PENDING_APPROVAL:
            return 'Pending Approval';
        case TICKET_STATUS.APPROVED:
            return 'Approved';
        case TICKET_STATUS.REJECTED:
            return 'Rejected';
        case TICKET_STATUS.CLOSED:
            return 'Closed';
        default:
            return status;
    }
}

// Check if we're on a specific page
function isOnPage(pageName) {
    return window.location.pathname.endsWith(pageName);
}

// Schedule a page refresh
function scheduleRefresh() {
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

// Generate or retrieve session ID
function getSessionId() {
    let sessionId = localStorage.getItem('session-id');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('session-id', sessionId);
    }
    return sessionId;
}

// Function to manually refresh data from other tabs
function refreshFromOtherTabs() {
    showToast('Refreshing data...', 'info');
    window.location.reload();
}

// Get URL parameter helper function
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Add refresh button to the UI (disabled as per user request)
function addRefreshButton() {
    // Function disabled - refresh button removed
    return;
}

// Add session indicator
function addSessionIndicator() {
    // Don't add on login or register pages
    if (isOnPage('login.html') || isOnPage('register.html') || isOnPage('index.html')) {
        return;
    }

    const sessionId = getSessionId().substring(0, 4);
    const currentUser = getCurrentUser();
    const userName = currentUser ? currentUser.name : 'Not logged in';
    const userRole = currentUser ? currentUser.role : '';

    const sessionIndicator = document.createElement('div');
    sessionIndicator.className = 'fixed bottom-4 left-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-md opacity-80 z-50';
    sessionIndicator.innerHTML = `
        <div class="font-bold">${userName} (${userRole})</div>
        <div>Session: ${sessionId}</div>
    `;

    document.body.appendChild(sessionIndicator);
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setupMessageListeners();
    addRefreshButton();
    addSessionIndicator();

    // Add a class to body to indicate real-time is enabled
    document.body.classList.add('realtime-enabled');
});

// Add some CSS for the new elements
const style = document.createElement('style');
style.textContent = `
    .realtime-enabled .premium-toast {
        border-left-width: 6px;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    .realtime-enabled .premium-toast.show {
        animation: pulse 1s ease-in-out;
    }
`;
document.head.appendChild(style);
