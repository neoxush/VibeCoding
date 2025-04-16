# OpTicketSystem Project Rules and Communication

This document serves as the central place for project requirements, decisions, and communication regarding the OpTicketSystem project.

## Project Overview

OpTicketSystem is a local network-based ticket management system with the following key features:
- User authentication with role-based access control
- Customizable ticket framework configurable by admins
- Dashboard for viewing tickets with different actions based on user roles
- Detailed ticket pages with comments and simple polling functionality
- Local network deployment without reliance on external web services
- Database with export capabilities to formats compatible with Excel

## Technology Stack

### Frontend
- React.js with Vite
- Material-UI or Ant Design
- React Router
- React Query

### Backend
- Node.js with Express.js
- SQLite (or PostgreSQL if more advanced features needed)
- Prisma ORM
- JWT for authentication

### Network & Deployment
- Local network deployment using a Node.js server
- Optional: Electron wrapper for desktop application experience

## Development Rules

1. All major feature decisions should be documented in this file
2. Changes to the database schema should be discussed and approved before implementation
3. Security considerations must be prioritized, especially for authentication and data access
4. Code should follow established best practices and include appropriate comments
5. Regular testing should be performed to ensure functionality works across the local network

## Current Status and Next Steps

Current Status: Initial project structure and basic setup completed

Completed:
1. Set up the initial project structure for both frontend and backend
2. Created the database schema with Prisma
3. Implemented basic authentication system
4. Set up frontend UI framework with Material-UI

Next Steps:
1. Implement ticket management functionality
2. Create ticket listing and detail views
3. Implement comment system
4. Build admin configuration panels
5. Add file attachment functionality
6. Implement data export to Excel

## Open Questions and Decisions

(This section will be updated as questions arise and decisions are made)

## Feature Requirements

### Authentication System
- Login/logout functionality
- Role-based access control
- Password reset mechanism
- Session management

### Ticket Management
- Ticket creation with customizable fields
- Status workflow configuration
- Automatic status transitions based on conditions
- File attachments

### Dashboard
- Role-specific views
- Filtering and sorting options
- Quick actions
- Notification indicators

### Ticket Detail View
- Complete ticket information
- Comment thread
- Status history
- Polls and voting interface

### Admin Configuration Panel
- User management
- Role configuration
- Custom field definition
- Workflow setup

### Data Export
- Export to Excel/CSV
- Filtering options for exports
- Scheduled exports (optional)

## Implementation Timeline

The project will be implemented in phases:

1. **Phase 1**: Project Setup and Core Infrastructure
2. **Phase 2**: Ticket System Core
3. **Phase 3**: UI Development
4. **Phase 4**: Advanced Features
5. **Phase 5**: Testing and Deployment

## Communication Log

### 2025-04-15
- Initial project structure created
- Basic frontend and backend setup completed
- Database schema defined with Prisma
- Authentication system implemented
- Basic UI components created

### Open Questions
- Should we implement real-time notifications for ticket updates?
- What specific Excel export format is preferred?
- Are there any specific security requirements beyond standard authentication?

