// Reset All Users Script
// This script will create all default user accounts
// Run with: node reset-all-users.js

// Create all default users
const users = [
    {
        id: 'superadmin-fixed',
        name: 'System Administrator',
        email: 'admin@admin',
        password: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
        isSuperAdmin: true
    },
    {
        id: 'admin-fixed',
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
        createdAt: new Date().toISOString()
    },
    {
        id: 'approver-fixed',
        name: 'Approver User',
        email: 'approver@example.com',
        password: 'password',
        role: 'approver',
        createdAt: new Date().toISOString()
    },
    {
        id: 'user-fixed',
        name: 'Regular User',
        email: 'user@example.com',
        password: 'password',
        role: 'user',
        createdAt: new Date().toISOString()
    }
];

// Save to localStorage-like file for the server to read
const fs = require('fs');
const path = require('path');

// Ensure the shared-data directory exists
const dataDir = './shared-data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Write the users file
const usersFile = path.join(dataDir, 'users.json');
fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

console.log('All user accounts have been reset!');
console.log('You can now log in with any of the following accounts:');
console.log('');
console.log('Super Admin:');
console.log('  Email: admin@admin');
console.log('  Password: admin');
console.log('');
console.log('Admin User:');
console.log('  Email: admin@example.com');
console.log('  Password: password');
console.log('');
console.log('Approver User:');
console.log('  Email: approver@example.com');
console.log('  Password: password');
console.log('');
console.log('Regular User:');
console.log('  Email: user@example.com');
console.log('  Password: password');
