// Ticket statuses
const TICKET_STATUS = {
    OPEN: 'open',
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CLOSED: 'closed'
};

// Make TICKET_STATUS available globally for shared-data.js
window.TICKET_STATUS = TICKET_STATUS;

// Get all tickets
function getAllTickets() {
    return JSON.parse(localStorage.getItem('tickets') || '[]');
}

// Get ticket by ID
function getTicketById(ticketId) {
    const tickets = getAllTickets();
    return tickets.find(ticket => ticket.id === ticketId) || null;
}

// Create a new ticket
function createTicket(title, description) {
    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('You must be logged in to create a ticket');
    }

    // First load from server to get the latest data
    return loadFromServer()
        .then(() => {
            // Get all tickets (after loading from server)
            const tickets = getAllTickets();

            // Create new ticket
            const newTicket = {
                id: 'ticket-' + Date.now(),
                title,
                description,
                status: TICKET_STATUS.PENDING_APPROVAL,
                createdBy: currentUser.id,
                createdByName: currentUser.name,
                assignedTo: null,
                assignedToName: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                comments: []
            };

            // Add to tickets array
            tickets.push(newTicket);

            // Save to localStorage
            localStorage.setItem('tickets', JSON.stringify(tickets));

            console.log('Ticket created:', newTicket);

            // Force data change notification to update UI
            if (typeof notifyDataChanged === 'function') {
                console.log('Notifying about data change after ticket creation');
                notifyDataChanged();
            }

            // Add to activity log
            addToActivityLog({
                type: 'ticket_created',
                ticketId: newTicket.id,
                ticketTitle: newTicket.title,
                userId: currentUser.id,
                userName: currentUser.name,
                timestamp: new Date().toISOString()
            });

            // Save to server
            return saveToServer(tickets)
                .then(() => {
                    // Show success message
                    if (typeof showToast === 'function') {
                        showToast('Ticket created and saved to server successfully', 'success');
                    }
                    return newTicket;
                })
                .catch(error => {
                    console.error('Error saving ticket to server:', error);
                    if (typeof showToast === 'function') {
                        showToast('Ticket created locally but failed to save to server', 'warning');
                    }
                    return newTicket;
                });
        })
        .catch(error => {
            console.error('Error loading data from server before creating ticket:', error);
            throw new Error('Failed to load data from server. Please try again.');
        });
}

// Add to activity log
function addToActivityLog(activity) {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    activities.push(activity);
    localStorage.setItem('activities', JSON.stringify(activities));
    console.log('Activity logged:', activity);
}

// Update ticket status
function updateTicketStatus(ticketId, newStatus) {
    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return Promise.reject(new Error('You must be logged in to update a ticket'));
    }

    // Check if user can approve tickets
    if (newStatus === TICKET_STATUS.APPROVED || newStatus === TICKET_STATUS.REJECTED) {
        if (!canApproveTickets()) {
            return Promise.reject(new Error('You do not have permission to approve or reject tickets'));
        }
    }

    // First load from server to get the latest data
    return loadFromServer()
        .then(() => {
            // Get all tickets (after loading from server)
            const tickets = getAllTickets();
            const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);

            if (ticketIndex === -1) {
                throw new Error('Ticket not found');
            }

            // Update ticket
            tickets[ticketIndex].status = newStatus;
            tickets[ticketIndex].updatedAt = new Date().toISOString();

            // If approving, assign the ticket to the current user
            if (newStatus === TICKET_STATUS.APPROVED) {
                tickets[ticketIndex].assignedTo = currentUser.id;
                tickets[ticketIndex].assignedToName = currentUser.name;
            }

            // Save to localStorage
            localStorage.setItem('tickets', JSON.stringify(tickets));

            // Log the status update
            console.log(`Ticket ${ticketId} status updated to ${newStatus}`);

            // Add to activity log
            addToActivityLog({
                type: 'ticket_status_updated',
                ticketId: ticketId,
                previousStatus: tickets[ticketIndex].status,
                newStatus: newStatus,
                userId: currentUser.id,
                userName: currentUser.name,
                timestamp: new Date().toISOString()
            });

            // Save to server
            return saveToServer(tickets)
                .then(() => {
                    // Show success message
                    if (typeof showToast === 'function') {
                        showToast(`Ticket status updated to ${newStatus} and saved to server`, 'success');
                    }
                    return tickets[ticketIndex];
                })
                .catch(error => {
                    console.error('Error saving ticket status to server:', error);
                    if (typeof showToast === 'function') {
                        showToast('Ticket status updated locally but failed to save to server', 'warning');
                    }
                    return tickets[ticketIndex];
                });
        })
        .catch(error => {
            console.error('Error updating ticket status:', error);
            return Promise.reject(error);
        });
}

// Add comment to a ticket
function addComment(ticketId, content) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('You must be logged in to comment on a ticket');
    }

    const tickets = getAllTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);

    if (ticketIndex === -1) {
        throw new Error('Ticket not found');
    }

    const newComment = {
        id: generateId(),
        content,
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString()
    };

    if (!tickets[ticketIndex].comments) {
        tickets[ticketIndex].comments = [];
    }

    tickets[ticketIndex].comments.push(newComment);
    tickets[ticketIndex].updatedAt = new Date().toISOString();

    localStorage.setItem('tickets', JSON.stringify(tickets));

    return newComment;
}

// Get tickets created by current user
function getMyTickets() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return [];
    }

    const tickets = getAllTickets();
    return tickets.filter(ticket => ticket.createdBy === currentUser.id);
}

// Get tickets assigned to current user
function getAssignedTickets() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return [];
    }

    const tickets = getAllTickets();
    return tickets.filter(ticket => ticket.assignedTo === currentUser.id);
}

// Get tickets pending approval
function getPendingApprovalTickets() {
    const tickets = getAllTickets();
    return tickets.filter(ticket => ticket.status === TICKET_STATUS.PENDING_APPROVAL);
}

// Save to server
function saveToServer(tickets) {
    try {
        // Get server URL
        const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';

        // Get all data
        const data = {
            tickets: tickets || JSON.parse(localStorage.getItem('tickets') || '[]'),
            users: JSON.parse(localStorage.getItem('users') || '[]'),
            logs: JSON.parse(localStorage.getItem('messageLogs') || '[]')
        };

        console.log('Saving data to server:', data);

        // Send data to server
        return fetch(`${serverUrl}/api/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Server save result:', result);
            // Show success message
            if (typeof showToast === 'function') {
                showToast('Data saved to server successfully', 'success');
            } else {
                console.log('Data saved to server successfully');
            }
            return result;
        })
        .catch(error => {
            console.error('Error saving to server:', error);
            // Show error message
            if (typeof showToast === 'function') {
                showToast('Error saving to server: ' + error.message, 'error');
            }
            throw error;
        });
    } catch (error) {
        console.error('Error in saveToServer:', error);
        return Promise.reject(error);
    }
}

// Load from server
function loadFromServer() {
    try {
        // Get server URL
        const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';

        console.log('Loading data from server...');

        // Get data from server
        return fetch(`${serverUrl}/api/data`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Server data loaded:', data);

            // Update localStorage
            if (data.tickets && data.tickets.length > 0) {
                console.log(`Updating tickets in localStorage: ${data.tickets.length} tickets`);
                localStorage.setItem('tickets', JSON.stringify(data.tickets));
            } else {
                console.log('No tickets found on server');
            }

            if (data.users && data.users.length > 0) {
                console.log(`Updating users in localStorage: ${data.users.length} users`);
                localStorage.setItem('users', JSON.stringify(data.users));
            }

            if (data.logs && data.logs.length > 0) {
                console.log(`Updating logs in localStorage: ${data.logs.length} logs`);
                localStorage.setItem('messageLogs', JSON.stringify(data.logs));
            }

            // Show success message
            if (typeof showToast === 'function') {
                showToast('Data loaded from server successfully', 'success');
            } else {
                console.log('Data loaded from server successfully');
            }

            return data;
        })
        .catch(error => {
            console.error('Error loading from server:', error);
            // Show error message
            if (typeof showToast === 'function') {
                showToast('Error loading from server: ' + error.message, 'error');
            }
            return Promise.reject(error);
        });
    } catch (error) {
        console.error('Error in loadFromServer:', error);
        return Promise.reject(error);
    }
}

// Submit ticket for approval
function submitForApproval(ticketId) {
    return updateTicketStatus(ticketId, TICKET_STATUS.PENDING_APPROVAL);
}

// Close ticket (admin only)
function closeTicket(ticketId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return Promise.reject(new Error('You must be logged in to close a ticket'));
    }

    // Check if user is admin
    if (!isAdmin()) {
        return Promise.reject(new Error('Only administrators can close tickets'));
    }

    // Use the Promise-based updateTicketStatus function
    return updateTicketStatus(ticketId, TICKET_STATUS.CLOSED);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Get status badge HTML
function getStatusBadgeHtml(status) {
    let className = '';
    let label = '';

    switch (status) {
        case TICKET_STATUS.OPEN:
            className = 'ticket-status-open';
            label = 'Open';
            break;
        case TICKET_STATUS.PENDING_APPROVAL:
            className = 'ticket-status-pending';
            label = 'Pending Approval';
            break;
        case TICKET_STATUS.APPROVED:
            className = 'ticket-status-approved';
            label = 'Approved';
            break;
        case TICKET_STATUS.REJECTED:
            className = 'ticket-status-rejected';
            label = 'Rejected';
            break;
        case TICKET_STATUS.CLOSED:
            className = 'ticket-status-closed';
            label = 'Closed';
            break;
        default:
            label = status.replace('_', ' ');
            break;
    }

    // The CSS now handles the styling and the dot indicator
    return `<span class="${className}">${label}</span>`;
}
