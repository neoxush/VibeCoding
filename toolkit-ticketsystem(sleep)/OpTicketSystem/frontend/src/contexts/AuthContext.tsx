import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

// Define types
interface User {
  id: string
  username: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      const loginSuccess = localStorage.getItem('loginSuccess')

      if (token && storedUser) {
        try {
          // For demo purposes, use the stored user data
          setUser(JSON.parse(storedUser))

          // Set default auth header for future API calls
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          // Clear login success flag if it exists
          if (loginSuccess) {
            localStorage.removeItem('loginSuccess')
          }
        } catch (error) {
          // Clear invalid data
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('loginSuccess')
          delete axios.defaults.headers.common['Authorization']
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // For demo purposes only - this would normally call the API
      if (email === 'admin@example.com' && password === 'admin123') {
        const demoUser = {
          id: '1',
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin'
        }

        // Save token and user data
        localStorage.setItem('token', 'demo-token')
        localStorage.setItem('user', JSON.stringify(demoUser))

        // Set auth header for future API calls
        axios.defaults.headers.common['Authorization'] = `Bearer demo-token`

        // Update state
        setUser(demoUser)
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    // Clear token and user
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
