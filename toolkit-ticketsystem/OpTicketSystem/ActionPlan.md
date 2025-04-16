# OpTicket System - Action Plan

## Project Overview
OpTicket System is a local network ticket management system with customizable workflows, role-based access control, and Excel export capabilities.

## Current Status
- Basic project structure is set up for both frontend and backend
- Database schema defined with Prisma
- Authentication system partially implemented
- Frontend UI framework established with Material-UI
- Basic routing structure in place

## Style Guide & Development Rules

### Code Style

#### General
- Use consistent indentation (2 spaces)
- Keep line length under 100 characters
- Use meaningful variable and function names
- Add comments for complex logic, but prefer self-documenting code
- Follow the DRY (Don't Repeat Yourself) principle

#### Frontend (React/TypeScript)
- Use functional components with hooks instead of class components
- Organize imports in groups: React, external libraries, internal components, styles
- Use TypeScript interfaces for props and state
- Follow component structure:
  ```tsx
  // Imports

  // Types/Interfaces

  // Component
  const ComponentName = ({ prop1, prop2 }: ComponentProps) => {
    // Hooks

    // Handlers

    // Render
    return (...)
  }

  // Exports
  export default ComponentName
  ```
- Use named exports for utility functions and context providers
- Prefer destructuring for props and state
- Use React Query for data fetching and state management

#### Backend (Node.js/Express)
- Follow RESTful API design principles
- Use async/await for asynchronous operations
- Implement proper error handling with try/catch blocks
- Organize routes by resource
- Keep controllers thin, move business logic to services
- Use middleware for cross-cutting concerns
- Validate all inputs using Zod or similar validation library

### UI/UX Design Style

#### Colors
- Primary: #1976d2 (Material UI blue)
- Secondary: #dc004e (Material UI pink)
- Success: #4caf50
- Warning: #ff9800
- Error: #f44336
- Background: #f5f5f5
- Text: #333333

#### Typography
- Font Family: Roboto
- Headings:
  - H1: 2.5rem, 400 weight
  - H2: 2rem, 400 weight
  - H3: 1.75rem, 400 weight
  - H4: 1.5rem, 500 weight
  - H5: 1.25rem, 500 weight
  - H6: 1rem, 500 weight
- Body: 1rem, 400 weight
- Small text: 0.875rem, 400 weight

#### Components
- Use Material UI components consistently
- Follow Material Design principles
- Maintain consistent spacing (8px grid system)
- Use elevation (shadows) appropriately to indicate hierarchy
- Ensure all interactive elements have proper hover/focus states
- Maintain accessibility standards (WCAG 2.1 AA)

#### Layout
- Use responsive design for all pages
- Implement consistent page layouts with proper hierarchy
- Use Grid and Flexbox for layouts
- Maintain consistent margins and padding

### Database Rules
- Use meaningful names for tables and columns
- Follow naming conventions (camelCase for fields)
- Include created/updated timestamps on all tables
- Define proper relationships and constraints
- Document any complex relationships or business rules
- Use migrations for all schema changes

### Git Workflow
- Use feature branches for all new work
- Write meaningful commit messages
- Keep commits focused on single changes
- Pull request reviews required before merging
- Maintain a clean main branch

## Action Items

### Phase 1: Complete Core Infrastructure (Current Focus)
- [ ] Finish implementing authentication controllers
- [ ] Complete user management functionality
- [ ] Set up proper error handling middleware
- [ ] Implement JWT token refresh mechanism
- [ ] Create database seeding scripts for initial setup

### Phase 2: Ticket System Core
- [ ] Implement ticket CRUD operations
- [ ] Create ticket status workflow management
- [ ] Develop comment functionality
- [ ] Build attachment handling system
- [ ] Implement custom fields for tickets

### Phase 3: UI Development
- [ ] Complete dashboard with role-specific views
- [ ] Build ticket list with filtering and sorting
- [ ] Develop ticket detail view with comments
- [ ] Create admin configuration panels
- [ ] Implement user management interface

### Phase 4: Advanced Features
- [ ] Add polling functionality for tickets
- [ ] Implement Excel/CSV export capabilities
- [ ] Create notification system
- [ ] Build reporting and analytics features
- [ ] Develop audit logging for system actions

### Phase 5: Testing and Deployment
- [ ] Write comprehensive tests for backend APIs
- [ ] Create frontend component tests
- [ ] Perform integration testing
- [ ] Optimize for local network deployment
- [ ] Create documentation for setup and usage

## Timeline
- Phase 1: [Insert target date]
- Phase 2: [Insert target date]
- Phase 3: [Insert target date]
- Phase 4: [Insert target date]
- Phase 5: [Insert target date]

## Current Focus
[Describe what you're currently working on and any immediate next steps]

## Notes
[Any additional notes, challenges, or considerations]
