import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, Toolbar, Container } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

// Import components (to be created)
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const MainLayout = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // If not authenticated, redirect to login
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          ml: { sm: '240px' },
        }}
      >
        <Toolbar /> {/* This creates space for the fixed header */}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}

export default MainLayout
