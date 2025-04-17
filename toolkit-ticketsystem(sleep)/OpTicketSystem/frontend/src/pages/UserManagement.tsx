import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

// Mock data - will be replaced with API calls
const mockUsers = [
  { id: '1', username: 'admin', email: 'admin@example.com', role: 'admin', createdAt: '2023-05-01' },
  { id: '2', username: 'manager1', email: 'manager1@example.com', role: 'manager', createdAt: '2023-05-02' },
  { id: '3', username: 'agent1', email: 'agent1@example.com', role: 'agent', createdAt: '2023-05-03' },
  { id: '4', username: 'agent2', email: 'agent2@example.com', role: 'agent', createdAt: '2023-05-04' },
  { id: '5', username: 'user1', email: 'user1@example.com', role: 'user', createdAt: '2023-05-05' },
  { id: '6', username: 'user2', email: 'user2@example.com', role: 'user', createdAt: '2023-05-06' },
  { id: '7', username: 'user3', email: 'user3@example.com', role: 'user', createdAt: '2023-05-07' },
  { id: '8', username: 'user4', email: 'user4@example.com', role: 'user', createdAt: '2023-05-08' },
  { id: '9', username: 'user5', email: 'user5@example.com', role: 'user', createdAt: '2023-05-09' },
  { id: '10', username: 'user6', email: 'user6@example.com', role: 'user', createdAt: '2023-05-10' },
]

const roles = [
  { id: 'admin', name: 'Admin' },
  { id: 'manager', name: 'Manager' },
  { id: 'agent', name: 'Agent' },
  { id: 'user', name: 'User' },
]

const UserManagement = () => {
  const [users, setUsers] = useState(mockUsers)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
  })

  // In a real app, we would fetch data from the API
  useEffect(() => {
    // Example: axios.get('/api/users').then(res => setUsers(res.data))
  }, [])

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(0)
  }

  const handleOpenDialog = (user: any = null) => {
    if (user) {
      setEditUser(user)
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
      })
    } else {
      setEditUser(null)
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSelectChange = (event: any) => {
    setFormData({
      ...formData,
      role: event.target.value,
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    
    if (editUser) {
      // Update existing user
      // In a real app, we would send the data to the API
      // Example: axios.put(`/api/users/${editUser.id}`, formData)
      
      // For now, just update the local state
      const updatedUsers = users.map((user) =>
        user.id === editUser.id
          ? { ...user, username: formData.username, email: formData.email, role: formData.role }
          : user
      )
      setUsers(updatedUsers)
    } else {
      // Create new user
      // In a real app, we would send the data to the API
      // Example: axios.post('/api/users', formData)
      
      // For now, just add to the local state
      const newUser = {
        id: `temp-${Date.now()}`,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString().split('T')[0],
      }
      setUsers([...users, newUser])
    }
    
    handleCloseDialog()
  }

  const handleDeleteUser = (id: string) => {
    // In a real app, we would send the request to the API
    // Example: axios.delete(`/api/users/${id}`)
    
    // For now, just remove from the local state
    const updatedUsers = users.filter((user) => user.id !== id)
    setUsers(updatedUsers)
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'error'
      case 'manager':
        return 'warning'
      case 'agent':
        return 'info'
      case 'user':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder="Search users..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            sx={{ width: '300px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="user table">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.createdAt}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(user)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteUser(user.id)}
                      size="small"
                      disabled={user.role === 'admin'} // Prevent deleting admin users
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editUser}
                  helperText={editUser ? 'Leave blank to keep current password' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role}
                    label="Role"
                    onChange={handleSelectChange}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UserManagement
