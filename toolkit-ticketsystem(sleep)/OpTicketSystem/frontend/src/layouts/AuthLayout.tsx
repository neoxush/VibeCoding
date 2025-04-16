import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, Container, Paper } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // If authenticated, redirect to dashboard
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Outlet />
        </Paper>
      </Container>
    </Box>
  )
}

export default AuthLayout
