# OpTicketSystem Project Structure

## Directory Structure

```
OpTicketSystem/
├── frontend/                  # React frontend application
│   ├── public/                # Static files
│   ├── src/                   # Source code
│   │   ├── assets/           # Images, fonts, etc.
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts for state management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Page layout components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   ├── App.tsx           # Main App component
│   │   ├── main.tsx          # Entry point
│   │   └── vite-env.d.ts     # Vite type definitions
│   ├── .eslintrc.js          # ESLint configuration
│   ├── index.html            # HTML template
│   ├── package.json          # Frontend dependencies
│   ├── tsconfig.json         # TypeScript configuration
│   └── vite.config.ts        # Vite configuration
│
├── backend/                   # Node.js backend application
│   ├── src/                   # Source code
│   │   ├── config/           # Configuration files
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Express middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   └── app.ts            # Express application setup
│   ├── prisma/               # Prisma ORM files
│   │   └── schema.prisma     # Database schema
│   ├── .env                  # Environment variables
│   ├── package.json          # Backend dependencies
│   └── tsconfig.json         # TypeScript configuration
│
├── docs/                      # Documentation
│   ├── api/                  # API documentation
│   └── user/                 # User documentation
│
└── PROJECT_RULES.md           # Project rules and communication
```

## Initial Setup Steps

1. Create frontend React application with Vite
2. Create backend Node.js application with Express
3. Set up database with Prisma ORM
4. Configure authentication with JWT
5. Implement basic user management
6. Create initial ticket management functionality

## Frontend Dependencies

- React
- React Router
- Material UI
- React Query
- Axios
- date-fns
- yup (form validation)
- react-hook-form

## Backend Dependencies

- Express
- Prisma
- bcrypt
- jsonwebtoken
- cors
- helmet
- dotenv
- zod (validation)
- multer (file uploads)
- exceljs (Excel export)
