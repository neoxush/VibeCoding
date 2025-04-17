# Ticket System with Real-Time Collaboration

A simplified ticket management system with user authentication, authorization, and real-time collaboration features for local networks. This system allows multiple users to work together on tickets without requiring a database.

## Features

- User authentication (login/register)
- Role-based authorization (admin, approver, regular user)
- Create and manage tickets
- Ticket approval workflow
- Comment on tickets
- Dashboard for ticket overview
- Real-time collaboration across multiple devices
- Automatic data synchronization
- Works on local networks without internet access
- Real-time notifications for important events
- Activity feed showing what other users are doing
- Desktop notifications (with permission)

## Technology

- HTML, CSS, and JavaScript
- Tailwind CSS for styling
- Browser's localStorage for data persistence
- Simple HTTP server for data synchronization
- Real-time collaboration via polling

## Setup Instructions

### Option 1: Simple Server (Recommended)

1. Install Node.js if you don't have it already
2. Open a terminal/command prompt in the project folder
3. Run the server:
   ```
   node shared-network-server.js
   ```
4. The server will display a URL like `http://192.168.1.x:3000`
5. Open this URL in your browser on any device on your local network

### Option 2: Direct File Access

If you can't run the Node.js server, you can still use the system:

1. Open any HTML file directly in your browser (e.g., `index.html`)
2. When prompted, enter the server URL of another device running the system
3. If no other device is running the server, you can work in offline mode

## Default User Accounts

The system comes with these pre-configured user accounts:

1. **Super Admin**
   - Email: admin@admin
   - Password: "admin" or leave empty
   - Role: admin with super privileges

2. **Admin User**
   - Email: admin@example.com
   - Password: password
   - Role: admin (can approve tickets and manage users)

3. **Approver User**
   - Email: approver@example.com
   - Password: password
   - Role: approver (can approve tickets)

4. **Regular User**
   - Email: user@example.com
   - Password: password
   - Role: user (can create tickets)

## Pages

- **index.html** - Landing page
- **login.html** - User login
- **register.html** - User registration
- **dashboard.html** - Main dashboard with ticket overview
- **create-ticket.html** - Create new tickets
- **ticket-details.html** - View ticket details and add comments
- **pending-approvals.html** - Review and approve/reject tickets

## Data Storage and Synchronization

Data is stored in multiple places to enable collaboration:

- **Browser localStorage** - Local cache of data on each device
- **Shared server storage** - Central repository for synchronized data

The system automatically synchronizes data between devices:

- Changes made on one device are automatically pushed to the server
- Other devices poll the server regularly to get updates
- A status indicator shows the current sync status
- Manual sync is available via the sync button (bottom right)

## Workflow

1. Users register or log in
2. Regular users create tickets (initially in "open" status)
3. Users can submit tickets for approval (changes status to "pending_approval")
4. Approvers or admins can approve or reject tickets
5. Users can comment on tickets at any stage

## Collaboration Features

- **Sync Status Indicator** (bottom left): Shows if you're connected and in sync
- **Manual Sync Button** (bottom right): Click to force synchronization
- **Server Config Button** (gear icon): Change server URL if needed
- **Notifications Button** (bell icon): Toggle notifications on/off
- **Activity Feed Button** (message icon): View recent activities from all users

## Troubleshooting

- **Connection Issues**: Click the sync button (bottom right) to manually sync
- **Server Configuration**: Click the gear icon to change the server URL
- **Data Not Updating**: Check that you're connected to the same server as other users
- **Login Issues**: For the admin account, you can use "admin" as the password or leave it empty
- **Missing Notifications**: Click the bell icon to enable notifications

## Notes

- This is a simplified system for demonstration purposes
- In a production environment, you would use a proper backend with a database
- The system works best on a local network where all devices can reach the server
- No internet connection is required - everything works within your local network

## License

This project is licensed under the MIT License.
