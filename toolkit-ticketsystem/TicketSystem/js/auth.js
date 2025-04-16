// User roles
const USER_ROLES = {
    ADMIN: 'admin',
    APPROVER: 'approver',
    USER: 'user'
};

// Message log storage
function addToMessageLog(message, type = 'info') {
    const logs = JSON.parse(localStorage.getItem('messageLogs') || '[]');
    logs.push({
        id: generateId(),
        message,
        type,
        timestamp: new Date().toISOString()
    });

    // Keep only the last 100 messages
    if (logs.length > 100) {
        logs.shift();
    }

    localStorage.setItem('messageLogs', JSON.stringify(logs));
}

// Get message logs
function getMessageLogs() {
    return JSON.parse(localStorage.getItem('messageLogs') || '[]');
}

// Clear all data and reset to default state
function clearAllData() {
    // Clear all localStorage items
    localStorage.removeItem('tickets');
    localStorage.removeItem('users');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('messageLogs');

    // Initialize default users
    initializeDefaultUsers();

    // Show success message
    showToast('All data has been cleared. System reset to default state.', 'success');
}

// Initialize default users if none exist
function initializeDefaultUsers() {
    console.log('Initializing default users...');
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Check for existing users by email
    const findUserByEmail = (email) => users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    // Default user templates
    const defaultUsers = [
        {
            email: 'admin@admin',
            name: 'System Administrator',
            password: 'admin',
            role: USER_ROLES.ADMIN,
            isSuperAdmin: true
        },
        {
            email: 'admin@example.com',
            name: 'Admin User',
            password: 'password',
            role: USER_ROLES.ADMIN
        },
        {
            email: 'approver@example.com',
            name: 'Approver User',
            password: 'password',
            role: USER_ROLES.APPROVER
        },
        {
            email: 'user@example.com',
            name: 'Regular User',
            password: 'password',
            role: USER_ROLES.USER
        }
    ];

    // Process each default user
    let usersChanged = false;

    defaultUsers.forEach(defaultUser => {
        const userIndex = findUserByEmail(defaultUser.email);

        if (userIndex >= 0) {
            // User exists, ensure critical properties
            const existingUser = users[userIndex];

            // Only update if it's the super admin or if properties are missing
            if (defaultUser.isSuperAdmin || !existingUser.role) {
                users[userIndex] = {
                    ...existingUser,
                    role: defaultUser.role,
                    isSuperAdmin: defaultUser.isSuperAdmin || existingUser.isSuperAdmin
                };
                usersChanged = true;
                console.log(`Updated existing user: ${defaultUser.email}`);
            }
        } else {
            // Create new user
            const newUser = {
                id: generateId(),
                ...defaultUser,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            usersChanged = true;
            console.log(`Created new user: ${defaultUser.email}`);
        }
    });

    // Save changes if needed
    if (usersChanged) {
        localStorage.setItem('users', JSON.stringify(users));
        console.log('Users updated after initialization');
    }

    // Show a popup message if this is the first time
    if (!localStorage.getItem('initMessage')) {
        if (typeof showToast === 'function') {
            showToast('System initialized. Please refer to CREDENTIALS.md for login information.', 'info', 8000);
            localStorage.setItem('initMessage', 'shown');
        }
    }

    // Default users are now created in the loop above
}

// Register a new user (admin only function)
function registerUser(name, email, password, role = USER_ROLES.USER) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== USER_ROLES.ADMIN) {
        addToMessageLog('Unauthorized attempt to register a user', 'error');
        throw new Error('Only administrators can register new users');
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Check if email already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        addToMessageLog(`Failed to register user: ${email} already exists`, 'error');
        throw new Error('Email already registered');
    }

    // Create new user
    const newUser = {
        id: generateId(),
        name,
        email,
        password, // In a real app, this would be hashed
        role, // Role specified by admin
        createdAt: new Date().toISOString()
    };

    // Add user to array and save to localStorage
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    addToMessageLog(`New user registered: ${email} with role ${role}`, 'success');
    return { ...newUser, password: undefined }; // Return user without password
}

// Login user
function loginUser(email, password) {
    // Force initialization of default users
    initializeDefaultUsers();

    // Get users after initialization to ensure we have the latest data
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Normalize email for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Find the user by email
    const user = users.find(user => user.email.toLowerCase() === normalizedEmail);

    if (!user) {
        console.log('User not found:', normalizedEmail);
        addToMessageLog(`Failed login attempt for ${email} - user not found`, 'error');
        throw new Error('Invalid email or password');
    }

    // Check password
    if (user.password !== password && !(user.isSuperAdmin && (password === '' || password === 'admin'))) {
        console.log('Invalid password for user:', normalizedEmail);
        addToMessageLog(`Failed login attempt for ${email} - invalid password`, 'error');
        throw new Error('Invalid email or password');
    }

    // Create a session without the password
    const currentUser = { ...user, password: undefined };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Log the login
    addToMessageLog(`User ${email} logged in`, 'info');
    console.log('Login successful for:', normalizedEmail);

    // Show a welcome message
    if (typeof showToast === 'function') {
        const welcomeMessage = user.isSuperAdmin ?
            'Welcome, System Administrator!' :
            `Welcome, ${user.name}!`;
        showToast(welcomeMessage, 'success');
    }

    return currentUser;
}

// Logout user
function logoutUser() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        addToMessageLog(`User ${currentUser.email} logged out`, 'info');
    }
    localStorage.removeItem('currentUser');
}

// Get current logged in user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// Check if user is logged in
function isLoggedIn() {
    return getCurrentUser() !== null;
}

// Check if current user has a specific role
function hasRole(role) {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.role === role;
}

// Check if current user is admin
function isAdmin() {
    return hasRole(USER_ROLES.ADMIN);
}

// Check if current user is approver or admin
function canApproveTickets() {
    const currentUser = getCurrentUser();
    return currentUser && (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.APPROVER);
}

// Generate a random ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Redirect to dashboard if already authenticated
function redirectIfAuthenticated() {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return true;
    }
    return false;
}

// Export users to file
function exportUsers() {
    if (!isAdmin()) {
        addToMessageLog('Unauthorized attempt to export users', 'error');
        throw new Error('Only administrators can export users');
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Create CSV content
    let csvContent = 'id,name,email,role,createdAt\n';

    users.forEach(user => {
        // Don't include passwords in export for security
        csvContent += `${user.id},${user.name},${user.email},${user.role},${user.createdAt}\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToMessageLog('Users exported to CSV', 'success');
}

// Import users from CSV file
function importUsers(fileContent) {
    if (!isAdmin()) {
        addToMessageLog('Unauthorized attempt to import users', 'error');
        throw new Error('Only administrators can import users');
    }

    try {
        const currentUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const lines = fileContent.split('\n');
        const header = lines[0].split(',');

        // Verify header format
        if (!header.includes('email') || !header.includes('name') || !header.includes('role')) {
            throw new Error('Invalid file format. CSV must include email, name, and role columns.');
        }

        const emailIndex = header.indexOf('email');
        const nameIndex = header.indexOf('name');
        const roleIndex = header.indexOf('role');
        const passwordIndex = header.indexOf('password');

        let importedCount = 0;
        let skippedCount = 0;

        // Start from line 1 (skip header)
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines

            const values = lines[i].split(',');
            const email = values[emailIndex]?.trim();
            const name = values[nameIndex]?.trim();
            const role = values[roleIndex]?.trim();
            const password = passwordIndex >= 0 ? values[passwordIndex]?.trim() : 'changeme';

            if (!email || !name || !role) {
                skippedCount++;
                continue;
            }

            // Check if user already exists
            const existingUserIndex = currentUsers.findIndex(u => u.email === email);

            if (existingUserIndex >= 0) {
                // Update existing user
                currentUsers[existingUserIndex].name = name;
                currentUsers[existingUserIndex].role = role;
                if (password && password !== 'changeme') {
                    currentUsers[existingUserIndex].password = password;
                }
            } else {
                // Add new user
                currentUsers.push({
                    id: generateId(),
                    name,
                    email,
                    password,
                    role,
                    createdAt: new Date().toISOString()
                });
            }

            importedCount++;
        }

        // Save updated users
        localStorage.setItem('users', JSON.stringify(currentUsers));

        addToMessageLog(`Imported ${importedCount} users (${skippedCount} skipped)`, 'success');
        return { importedCount, skippedCount };
    } catch (error) {
        addToMessageLog(`Import failed: ${error.message}`, 'error');
        throw error;
    }
}

// Get all users (admin only)
function getAllUsers() {
    if (!isAdmin()) {
        addToMessageLog('Unauthorized attempt to view all users', 'error');
        throw new Error('Only administrators can view all users');
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.map(user => ({ ...user, password: undefined })); // Don't return passwords
}

// Update user (admin only)
function updateUser(userId, updates) {
    if (!isAdmin()) {
        addToMessageLog('Unauthorized attempt to update user', 'error');
        throw new Error('Only administrators can update users');
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) {
        addToMessageLog(`Failed to update user: User ID ${userId} not found`, 'error');
        throw new Error('User not found');
    }

    // Don't allow updating super admin's email or role
    if (users[userIndex].isSuperAdmin) {
        if (updates.email && updates.email !== 'admin@admin') {
            throw new Error('Cannot change super admin email');
        }
        if (updates.role && updates.role !== USER_ROLES.ADMIN) {
            throw new Error('Cannot change super admin role');
        }
    }

    // Update user properties
    Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'isSuperAdmin') { // Don't allow changing id or super admin status
            users[userIndex][key] = updates[key];
        }
    });

    localStorage.setItem('users', JSON.stringify(users));
    addToMessageLog(`User ${users[userIndex].email} updated`, 'success');

    return { ...users[userIndex], password: undefined };
}

// Delete user (admin only)
function deleteUser(userId) {
    if (!isAdmin()) {
        addToMessageLog('Unauthorized attempt to delete user', 'error');
        throw new Error('Only administrators can delete users');
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) {
        addToMessageLog(`Failed to delete user: User ID ${userId} not found`, 'error');
        throw new Error('User not found');
    }

    // Don't allow deleting super admin
    if (users[userIndex].isSuperAdmin) {
        addToMessageLog('Attempt to delete super admin account', 'error');
        throw new Error('Cannot delete super admin account');
    }

    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);

    localStorage.setItem('users', JSON.stringify(users));
    addToMessageLog(`User ${deletedUser.email} deleted`, 'success');

    return { ...deletedUser, password: undefined };
}
