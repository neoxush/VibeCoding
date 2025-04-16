# Ticket System Credentials

This document contains the login credentials for the Ticket System. Keep this information secure and do not share it publicly.

## Default Accounts

### Super Admin
- **Email**: admin@admin
- **Password**: admin
- **Role**: Administrator
- **Description**: This account has full system access and can manage all users and settings.
- **Note**: Use the special admin login page (admin-login.html) for guaranteed access.

### Admin User
- **Email**: admin@example.com
- **Password**: password
- **Role**: Administrator
- **Description**: Regular administrator account with full access to the system.

### Approver User
- **Email**: approver@example.com
- **Password**: password
- **Role**: Approver
- **Description**: This account can approve tickets but cannot modify system settings.

### Regular User
- **Email**: user@example.com
- **Password**: password
- **Role**: User
- **Description**: Standard user account that can create and view tickets.

## Authentication Notes

- Passwords are stored in plain text for development purposes only
- In a production environment, passwords should be properly hashed
- The system uses localStorage for user management in this simplified version
- User sessions persist until logout or browser data is cleared

## Troubleshooting

If you're having trouble logging in:

1. Try using the "Reset system data" button on the login page
2. Check browser console for any error messages
3. Ensure localStorage is enabled in your browser
4. Try using a different browser if issues persist
