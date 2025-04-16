// Reset Admin Account Script
// This script will create a guaranteed working admin account
// Run with: node reset-admin.js

// Create the admin user directly
const adminUser = {
    id: 'superadmin-fixed',
    name: 'System Administrator',
    email: 'admin@admin',
    password: 'admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
    isSuperAdmin: true
};

// Create a users array with just the admin
const users = [adminUser];

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

console.log('Admin account has been reset!');
console.log('You can now log in with:');
console.log('Email: admin@admin');
console.log('Password: admin');
