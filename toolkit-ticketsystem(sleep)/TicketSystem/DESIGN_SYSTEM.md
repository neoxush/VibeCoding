# Ticket System Design System

This document outlines the design system for the Ticket System application, providing guidelines for UI components, colors, typography, and user experience across different user roles.

## Core Design Principles

1. **Role-Based UI**: Different user roles see only what they need to accomplish their tasks
2. **Progressive Disclosure**: Information is revealed progressively as needed
3. **Consistent Visual Language**: Maintain consistent styling across all pages
4. **Accessibility**: Ensure the UI is accessible to all users
5. **Minimalism**: Remove unnecessary elements to focus on core functionality

## Color System

### Primary Colors
- **Primary Blue**: #3B82F6 - Used for primary actions, links, and highlighting
- **Primary Green**: #10B981 - Used for success states, approvals, and positive actions
- **Primary Red**: #EF4444 - Used for errors, rejections, and destructive actions
- **Primary Yellow**: #F59E0B - Used for warnings and pending states

### Neutral Colors
- **Dark**: #1E293B - Used for primary text
- **Medium**: #64748B - Used for secondary text
- **Light**: #E2E8F0 - Used for borders and dividers
- **Background**: #F8FAFC - Used for page backgrounds
- **White**: #FFFFFF - Used for card backgrounds

### Role-Specific Colors
- **Admin**: #8B5CF6 (Purple) - Used for admin-specific elements
- **Approver**: #3B82F6 (Blue) - Used for approver-specific elements
- **User**: #10B981 (Green) - Used for user-specific elements

## Typography

- **Primary Font**: Inter, sans-serif
- **Headings**: 
  - H1: 24px, Bold
  - H2: 20px, Bold
  - H3: 18px, Bold
  - H4: 16px, Bold
- **Body Text**: 14px, Regular
- **Small Text**: 12px, Regular
- **Button Text**: 14px, Medium

## Components

### Buttons

#### Primary Button
- Background: Primary Blue
- Text: White
- Hover: Darker Blue
- Padding: 8px 16px
- Border Radius: 6px

#### Secondary Button
- Background: White
- Text: Primary Blue
- Border: 1px solid Primary Blue
- Hover: Light Blue Background
- Padding: 8px 16px
- Border Radius: 6px

#### Destructive Button
- Background: Primary Red
- Text: White
- Hover: Darker Red
- Padding: 8px 16px
- Border Radius: 6px

### Cards

- Background: White
- Border Radius: 8px
- Shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
- Padding: 16px

### Form Elements

#### Text Input
- Border: 1px solid Light
- Border Radius: 6px
- Padding: 8px 12px
- Focus: Border Primary Blue

#### Select
- Same as Text Input
- With dropdown icon

#### Checkbox
- Size: 16px x 16px
- Checked: Primary Blue

### Notifications

#### Toast Notifications
- **For Regular Users**: Minimal, non-intrusive notifications for critical information only
- **For Admins/Approvers**: More detailed notifications with action information

#### Log Panel
- **For Regular Users**: Hidden by default, simplified if accessed
- **For Admins**: Accessible, detailed logs of all system activities

## User Interface by Role

### All Users
- Clean, minimal login screen
- Role-specific dashboard
- Simple navigation
- Clear feedback for actions

### Regular Users
- Focus on ticket creation and tracking
- Minimal system messages (success/error only)
- Simplified UI with only necessary elements
- No technical details or logs

### Approvers
- Focus on pending approvals
- Moderate level of system messages
- Access to ticket details and history
- Limited access to logs

### Administrators
- Complete system overview
- Detailed system messages and logs
- Access to all features and settings
- Technical details when needed

## Page Templates

### Login Page
- Clean, centered card layout
- Role selection with clear visual differentiation
- Minimal form fields
- Clear call-to-action

### Dashboard
- **Regular Users**: Focus on their tickets and creating new ones
- **Approvers**: Focus on pending approvals and recently approved/rejected tickets
- **Admins**: Overview of system status, recent activity, and quick actions

### Ticket Creation
- Step-by-step form with clear instructions
- Immediate feedback on submission
- Preview option before submission

### Ticket Details
- Clear presentation of ticket information
- Role-appropriate actions prominently displayed
- Comment section for communication
- Status history for tracking

## Interaction Patterns

### Notifications
- **Regular Users**: Only show critical notifications (success/error)
- **Approvers**: Show notifications related to approvals and status changes
- **Admins**: Show detailed notifications for all system events

### System Messages
- **Regular Users**: Hide technical details, show only user-friendly messages
- **Approvers**: Show moderate level of detail
- **Admins**: Show complete technical details and logs

### Navigation
- **Regular Users**: Simple navigation with focus on tickets
- **Approvers**: Navigation focused on approvals and tickets
- **Admins**: Complete navigation with access to all areas

## Implementation Guidelines

1. Use role-based conditional rendering for UI elements
2. Implement progressive disclosure for complex features
3. Maintain consistent styling through CSS variables
4. Use clear, concise language in all UI text
5. Provide appropriate feedback for all user actions
6. Ensure all interactive elements have appropriate hover/focus states
7. Test the UI with actual users of each role
