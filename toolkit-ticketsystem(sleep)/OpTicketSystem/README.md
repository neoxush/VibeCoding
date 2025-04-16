# OpTicket System

A local network ticket management system with customizable workflows, role-based access control, and Excel export capabilities.

## Project Structure

```
OpTicketSystem/
├── frontend/                  # React frontend application
├── backend/                   # Node.js backend application
├── docs/                      # Documentation
└── PROJECT_RULES.md           # Project rules and communication
```

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

## Getting Started

### Frontend Setup

1. Install dependencies:
   ```
   cd frontend
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```
   The frontend will be available at http://localhost:3000

### Backend Setup

1. Install dependencies:
   ```
   cd backend
   npm install
   ```

2. Set up the database:
   ```
   npx prisma migrate dev --name init
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The backend API will be available at http://localhost:4000

## Initial Admin User

After setting up the database, you'll need to create an admin user. You can do this by making a POST request to the registration endpoint:

```
POST http://localhost:4000/api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

Then, you'll need to update the user's role to "admin" in the database.

## Features

- User authentication with role-based access control
- Customizable ticket framework configurable by admins
- Dashboard for viewing tickets with different actions based on user roles
- Detailed ticket pages with comments and simple polling functionality
- Local network deployment without reliance on external web services
- Database with export capabilities to formats compatible with Excel

## Development

See the PROJECT_RULES.md file for detailed information about the project requirements, decisions, and communication.

## Testing

To test the application:

1. Make sure both frontend and backend servers are running
2. Open a web browser and navigate to http://localhost:3000
3. Log in with the admin credentials you created

## Deployment

For local network deployment:

1. Build the frontend:
   ```
   cd frontend
   npm run build
   ```

2. Build the backend:
   ```
   cd backend
   npm run build
   ```

3. Start the production server:
   ```
   cd backend
   npm start
   ```

4. Access the application from other computers on the network using the server's IP address:
   ```
   http://<server-ip>:4000
   ```
