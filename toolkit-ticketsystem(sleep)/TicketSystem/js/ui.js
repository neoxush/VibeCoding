// Create premium toast container if it doesn't exist
function ensurePremiumToastContainer() {
    let toastContainer = document.getElementById('premium-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'premium-toast-container';
        toastContainer.className = 'premium-toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

// Show premium toast notification
function showToast(message, type = 'info', duration = 3000, isGuide = false) {
    const toastContainer = ensurePremiumToastContainer();

    // Limit the number of toasts to 3 at a time
    const existingToasts = toastContainer.querySelectorAll('.premium-toast');
    if (existingToasts.length >= 3) {
        // Remove the oldest toast
        removePremiumToast(existingToasts[0]);
    }

    // Get title based on type
    let title = '';
    switch(type) {
        case 'success':
            title = 'Success';
            duration = 2000; // Shorter duration for success messages
            break;
        case 'error':
            title = 'Error';
            duration = 4000; // Longer duration for errors
            break;
        case 'warning':
            title = 'Warning';
            break;
        case 'guide':
            title = 'Guide';
            type = 'info'; // Use info styling for guides
            isGuide = true;
            duration = 6000; // Shorter duration for guides
            break;
        default:
            title = 'Information';
            break;
    }

    // For guide messages, use a longer duration
    if (isGuide) {
        duration = Math.max(duration, 6000); // At least 6 seconds for guides
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `premium-toast premium-toast-${type}`;

    // Add icon based on type
    let icon = '';
    if (type === 'error') {
        icon = `<svg class="premium-toast-icon premium-toast-icon-error w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'success') {
        icon = `<svg class="premium-toast-icon premium-toast-icon-success w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'warning') {
        icon = `<svg class="premium-toast-icon premium-toast-icon-warning w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else {
        icon = `<svg class="premium-toast-icon premium-toast-icon-info w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    // Set toast content
    let guideClass = isGuide ? 'premium-toast-guide' : '';
    let guideIcon = '';

    // Add special styling for guide messages
    if (isGuide) {
        guideIcon = `<div class="premium-toast-guide-icon">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
        </div>`;
    }

    toast.innerHTML = `
        ${icon}
        <div class="premium-toast-content ${guideClass}">
            <div class="premium-toast-title">${title}</div>
            <div class="premium-toast-message">${message}</div>
            ${isGuide ? guideIcon : ''}
        </div>
        <div class="premium-toast-close" id="toast-close">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
        </div>
        <div class="premium-toast-progress premium-toast-progress-${type}"></div>
    `;

    // Add toast to container
    toastContainer.appendChild(toast);

    // Add event listener to close button
    const closeButton = toast.querySelector('#toast-close');
    closeButton.addEventListener('click', () => {
        removePremiumToast(toast);
    });

    // Animate progress bar
    const progressBar = toast.querySelector('.premium-toast-progress');
    progressBar.style.animation = `shrink ${duration/1000}s linear forwards`;
    progressBar.style.transformOrigin = 'left';

    // Add keyframes for progress bar animation if not already added
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.innerHTML = `
            @keyframes shrink {
                0% { width: 100%; }
                100% { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    }

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-remove after duration
    setTimeout(() => {
        removePremiumToast(toast);
    }, duration);

    // Add to message log
    addToMessageLog(message, type);

    return toast;
}

// Remove premium toast with animation
function removePremiumToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Legacy alert function (now uses toast)
function showAlert(message, type = 'info') {
    // Just use the premium toast system
    showToast(message, type);

    // Clear any existing alert containers for cleanliness
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

// Get initials from name for avatar
function getInitials(name) {
    if (!name) return 'U';

    const parts = name.split(' ');
    if (parts.length === 1) return name.charAt(0).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Update navbar based on authentication status - premium design
function updateNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    const currentUser = getCurrentUser();
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // Create the premium header HTML
    let navbarHtml = `
        <header class="premium-header">
            <div class="premium-header-container">
                <div class="premium-brand">
                    <div class="premium-logo">
                        <div class="premium-logo-icon-container">
                            <svg class="premium-logo-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>
                            </svg>
                            <div class="premium-status"></div>
                        </div>
                        <div class="premium-logo-text">Ticket <span>System</span></div>
                    </div>
                </div>

                <nav class="premium-nav">
    `;

    // Only show menu items if user is logged in
    if (currentUser) {
        // Render navigation items with icons
        navbarHtml += `
                    <a href="dashboard.html" class="premium-nav-item ${currentPath === 'dashboard.html' ? 'active' : ''}">
                        <svg class="premium-nav-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        <span class="premium-nav-text">Dashboard</span>
                    </a>

                    <a href="create-ticket.html" class="premium-nav-item ${currentPath === 'create-ticket.html' ? 'active' : ''}">
                        <svg class="premium-nav-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="premium-nav-text">New Ticket</span>
                    </a>
        `;

        // Add pending approvals link if user can approve tickets
        if (canApproveTickets()) {
            const pendingTickets = getPendingApprovalTickets();
            const pendingCount = pendingTickets.length;

            navbarHtml += `
                    <a href="pending-approvals.html" class="premium-nav-item ${currentPath === 'pending-approvals.html' ? 'active' : ''}">
                        <svg class="premium-nav-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        <span class="premium-nav-text">Pending Approvals</span>
                        ${pendingCount > 0 ? `<span class="premium-nav-badge">${pendingCount}</span>` : ''}
                    </a>
            `;
        }

        // Add admin panel link if user is admin
        if (isAdmin()) {
            navbarHtml += `
                    <a href="admin-panel.html" class="premium-nav-item ${currentPath === 'admin-panel.html' ? 'active' : ''}">
                        <svg class="premium-nav-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span class="premium-nav-text">Admin Panel</span>
                    </a>
            `;
        }

        // User dropdown - premium design
        navbarHtml += `
                </nav>
                <div class="premium-user">
                    <div class="premium-user-button" id="user-menu-button">
                        <div class="premium-user-avatar">
                            <div class="premium-user-avatar-initials">${getInitials(currentUser.name)}</div>
                        </div>
                        <div class="premium-user-info">
                            <span class="premium-user-name">${currentUser.role === 'admin' ? 'System Administrator' : currentUser.name}</span>
                            <span class="premium-user-role">${currentUser.role}</span>
                        </div>
                        <svg class="premium-user-dropdown-toggle w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <div id="user-dropdown" class="premium-user-dropdown">
                        <div class="premium-user-dropdown-header">
                            <div class="premium-user-dropdown-title">${currentUser.role === 'admin' ? 'System Administrator' : currentUser.name}</div>
                            <div class="premium-user-dropdown-subtitle">${currentUser.email || 'admin@admin'}</div>
                        </div>
                        <div class="premium-user-dropdown-body">
                            <a href="message-log.html" class="premium-user-dropdown-item">
                                <svg class="premium-user-dropdown-item-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Message Log
                            </a>
                            <div class="premium-user-dropdown-divider"></div>
                            <button onclick="handleLogout()" class="premium-user-dropdown-item">
                                <svg class="premium-user-dropdown-item-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
        `;
    } else {
        // For non-logged in users
        navbarHtml += `
                    <a href="login.html" class="premium-nav-item ${currentPath === 'login.html' ? 'active' : ''}">
                        <svg class="premium-nav-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                        </svg>
                        <span class="premium-nav-text">Login</span>
                    </a>
                    <a href="register.html" class="premium-nav-item ${currentPath === 'register.html' ? 'active' : ''}">
                        <svg class="premium-nav-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                        </svg>
                        <span class="premium-nav-text">Register</span>
                    </a>
                </nav>
        `;
    }

    navbarHtml += `
            </div>
        </header>
    `;

    navbarContainer.innerHTML = navbarHtml;

    // Add event listener for user dropdown with animation
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');

            // Rotate the dropdown toggle icon
            const dropdownToggle = userMenuButton.querySelector('.premium-user-dropdown-toggle');
            if (dropdownToggle) {
                dropdownToggle.style.transform = userDropdown.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.classList.remove('active');

                // Reset the dropdown toggle icon
                const dropdownToggle = userMenuButton.querySelector('.premium-user-dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.style.transform = 'rotate(0)';
                }
            }
        });

        // Prevent dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.stopPropagation();
            }
        });
    }
}

// Handle logout
function handleLogout() {
    logoutUser();
    window.location.href = 'index.html';
}

// Render ticket list
function renderTicketList(tickets, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No tickets found.</p>';
        return;
    }

    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    tickets.forEach(ticket => {
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${ticket.title}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${getStatusBadgeHtml(ticket.status)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${ticket.createdByName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(ticket.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <a href="ticket-details.html?id=${ticket.id}" class="ascii-btn ascii-btn-light-primary ascii-btn-view">
                        <span class="ascii-icon"></span>
                        View Details
                    </a>
        `;

        if (ticket.status === TICKET_STATUS.OPEN && getCurrentUser().id === ticket.createdBy) {
            html += `
                    <button onclick="submitTicketForApproval('${ticket.id}')" class="ascii-btn ascii-btn-light-warning ascii-btn-submit">
                        <span class="ascii-icon"></span>
                        Submit for Approval
                    </button>
            `;
        }

        html += `
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Submit ticket for approval (UI handler)
function submitTicketForApproval(ticketId) {
    // Show loading state
    const button = document.querySelector(`button[onclick="submitTicketForApproval('${ticketId}')"]`);
    const originalText = button ? button.innerHTML : '';

    if (button) {
        button.innerHTML = '<span class="animate-pulse">Processing...</span>';
        button.disabled = true;
    }

    // Call the submitForApproval function
    submitForApproval(ticketId)
        .then(() => {
            // Success already handled by updateTicketStatus function
            // Refresh the ticket list
            const tickets = getMyTickets();
            renderTicketList(tickets, 'ticket-list');

            // Force dashboard update if we're on the dashboard page
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        })
        .catch(error => {
            showToast(error.message, 'error');

            // Reset button state
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
}

// Render pending approvals
function renderPendingApprovals(tickets, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No tickets pending approval.</p>';
        return;
    }

    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    tickets.forEach(ticket => {
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="font-medium text-gray-900">${ticket.title}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${ticket.createdByName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(ticket.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <a href="ticket-details.html?id=${ticket.id}" class="ascii-btn ascii-btn-light-primary ascii-btn-view">
                        <span class="ascii-icon"></span>
                        View Details
                    </a>
                    <button
                        onclick="approveTicket('${ticket.id}')"
                        class="ascii-btn ascii-btn-light-success ascii-btn-approve"
                    >
                        <span class="ascii-icon"></span>
                        Approve
                    </button>
                    <button
                        onclick="rejectTicket('${ticket.id}')"
                        class="ascii-btn ascii-btn-light-danger ascii-btn-reject"
                    >
                        <span class="ascii-icon"></span>
                        Reject
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Approve ticket (UI handler)
function approveTicket(ticketId) {
    // Show loading state
    const button = document.querySelector(`button[onclick="approveTicket('${ticketId}')"]`);
    const originalText = button ? button.innerHTML : '';

    if (button) {
        button.innerHTML = '<span class="animate-pulse">Processing...</span>';
        button.disabled = true;
    }

    // Call the updateTicketStatus function
    updateTicketStatus(ticketId, TICKET_STATUS.APPROVED)
        .then(() => {
            // Success already handled by updateTicketStatus function
            // Refresh the pending approvals list
            const pendingTickets = getPendingApprovalTickets();
            renderPendingApprovals(pendingTickets, 'pending-approvals-list');

            // Also refresh the main ticket list if it exists
            if (document.getElementById('ticket-list')) {
                const tickets = getMyTickets();
                renderTicketList(tickets, 'ticket-list');
            }

            // Force dashboard update if we're on the dashboard page
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        })
        .catch(error => {
            showToast(error.message, 'error');

            // Reset button state
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
}

// Reject ticket (UI handler)
function rejectTicket(ticketId) {
    // Show loading state
    const button = document.querySelector(`button[onclick="rejectTicket('${ticketId}')"]`);
    const originalText = button ? button.innerHTML : '';

    if (button) {
        button.innerHTML = '<span class="animate-pulse">Processing...</span>';
        button.disabled = true;
    }

    // Call the updateTicketStatus function
    updateTicketStatus(ticketId, TICKET_STATUS.REJECTED)
        .then(() => {
            // Success already handled by updateTicketStatus function
            // Refresh the pending approvals list
            const pendingTickets = getPendingApprovalTickets();
            renderPendingApprovals(pendingTickets, 'pending-approvals-list');

            // Also refresh the main ticket list if it exists
            if (document.getElementById('ticket-list')) {
                const tickets = getMyTickets();
                renderTicketList(tickets, 'ticket-list');
            }

            // Force dashboard update if we're on the dashboard page
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        })
        .catch(error => {
            showToast(error.message, 'error');

            // Reset button state
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
}

// Close ticket (UI handler)
function handleCloseTicket(ticketId) {
    // Show loading state
    const button = document.querySelector(`button[onclick="handleCloseTicket('${ticketId}')"]`);
    const originalText = button ? button.innerHTML : '';

    if (button) {
        button.innerHTML = '<span class="animate-pulse">Processing...</span>';
        button.disabled = true;
    }

    // Call the closeTicket function
    closeTicket(ticketId)
        .then(() => {
            showToast('Ticket closed successfully.', 'success');

            // Reload the current page to show updated status
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        })
        .catch(error => {
            showToast(error.message, 'error');

            // Reset button state
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
}

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Render ticket details
function renderTicketDetails(ticket, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
        <div class="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">${ticket.title}</h2>
                ${getStatusBadgeHtml(ticket.status)}
            </div>

            <div class="px-6 py-4">
                <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                        <p class="text-gray-600 mb-1">Created by:</p>
                        <p class="font-medium">${ticket.createdByName}</p>
                    </div>
                    <div>
                        <p class="text-gray-600 mb-1">Created at:</p>
                        <p class="font-medium">${formatDate(ticket.createdAt)}</p>
                    </div>
                    <div>
                        <p class="text-gray-600 mb-1">Assigned to:</p>
                        <p class="font-medium">${ticket.assignedToName || 'Unassigned'}</p>
                    </div>
                    <div>
                        <p class="text-gray-600 mb-1">Last updated:</p>
                        <p class="font-medium">${formatDate(ticket.updatedAt)}</p>
                    </div>
                </div>

                <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold mb-3">Description</h3>
                    <p class="text-gray-700 whitespace-pre-line">${ticket.description}</p>
                </div>

                <div class="border-t border-gray-200 pt-4">
                    <h3 class="text-lg font-semibold mb-3">Actions</h3>
                    <div class="flex flex-wrap gap-3">
                        ${ticket.status === TICKET_STATUS.OPEN ? `
                            ${getCurrentUser().id === ticket.createdBy ? `
                                <button onclick="submitTicketForApproval('${ticket.id}')" class="ascii-btn ascii-btn-light-warning ascii-btn-submit">
                                    <span class="ascii-icon"></span>
                                    Submit for Approval
                                </button>
                            ` : ''}
                        ` : ''}

                        ${canApproveTickets() && ticket.status === TICKET_STATUS.PENDING_APPROVAL ? `
                            <button onclick="approveTicket('${ticket.id}')" class="ascii-btn ascii-btn-light-success ascii-btn-approve">
                                <span class="ascii-icon"></span>
                                Approve Ticket
                            </button>
                            <button onclick="rejectTicket('${ticket.id}')" class="ascii-btn ascii-btn-light-danger ascii-btn-reject">
                                <span class="ascii-icon"></span>
                                Reject Ticket
                            </button>
                        ` : ''}

                        ${ticket.status === TICKET_STATUS.APPROVED && isAdmin() ? `
                            <button onclick="handleCloseTicket('${ticket.id}')" class="ascii-btn ascii-btn-light-secondary ascii-btn-close">
                                <span class="ascii-icon"></span>
                                Close Ticket
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Render comments
function renderComments(ticket, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
        <div class="bg-white shadow-md rounded-lg overflow-hidden mt-8">
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-xl font-bold text-gray-800">Comments</h3>
                <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    ${ticket.comments ? ticket.comments.length : 0} comments
                </span>
            </div>

            <div class="px-6 py-4">
    `;

    if (!ticket.comments || ticket.comments.length === 0) {
        html += `
            <div class="py-8 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <p class="mt-2 text-gray-500">No comments yet. Be the first to comment!</p>
            </div>
        `;
    } else {
        html += `<div class="space-y-4 mb-6">`;

        ticket.comments.forEach(comment => {
            html += `
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            <div class="bg-blue-100 text-blue-800 p-2 rounded-full mr-3">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                            </div>
                            <p class="font-semibold">${comment.userName}</p>
                        </div>
                        <p class="text-sm text-gray-500">${formatDate(comment.createdAt)}</p>
                    </div>
                    <p class="text-gray-700 pl-9">${comment.content}</p>
                </div>
            `;
        });

        html += `</div>`;
    }

    html += `
                <div class="border-t border-gray-200 pt-4">
                    <form id="comment-form" class="mt-2">
                        <div class="mb-4">
                            <label for="comment" class="block text-gray-700 text-sm font-bold mb-2">
                                Add a comment
                            </label>
                            <textarea
                                id="comment"
                                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                                placeholder="Type your comment here..."
                                required
                            ></textarea>
                        </div>

                        <div>
                            <button type="submit" class="ascii-btn ascii-btn-light-primary ascii-btn-comment">
                                <span class="ascii-icon"></span>
                                Post Comment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Add event listener for comment form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const commentInput = document.getElementById('comment');
            const content = commentInput.value.trim();

            if (content) {
                try {
                    addComment(ticket.id, content);
                    // Refresh the page to show the new comment
                    window.location.reload();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    }
}

// Render message logs
function renderMessageLogs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const logs = getMessageLogs();

    if (logs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No messages in log.</p>';
        return;
    }

    // Sort logs by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = `
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            <div class="px-4 py-5 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-lg font-medium text-gray-900">Message Log</h2>
                <button id="clear-logs-btn" class="ascii-btn ascii-btn-sm ascii-btn-danger ascii-btn-remove">
                    <span class="ascii-icon"></span>
                    Clear Logs
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
    `;

    logs.forEach(log => {
        const typeClass = log.type === 'error' ? 'text-red-600' :
                        log.type === 'success' ? 'text-green-600' :
                        log.type === 'warning' ? 'text-yellow-600' : 'text-blue-600';

        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(log.timestamp)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                        ${log.type}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${log.message}
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Add event listener for clear logs button
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all message logs?')) {
                localStorage.removeItem('messageLogs');
                renderMessageLogs(containerId);
                showToast('Message logs cleared', 'info');
            }
        });
    }
}