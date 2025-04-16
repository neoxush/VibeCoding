import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import EditIcon from '@mui/icons-material/Edit'
import { format } from 'date-fns'
import { getTicketById, updateTicket } from '../utils/ticketUtils'
import { useAuth } from '../contexts/AuthContext'

// Mock data - will be replaced with API calls
const mockTicket = {
  id: '1',
  title: 'Network connectivity issue',
  content: 'Users in the marketing department are experiencing intermittent network connectivity issues. The problem started yesterday afternoon and is affecting their ability to access shared drives and the internet.',
  status: 'Open',
  priority: 'High',
  created: '2023-05-10T10:30:00Z',
  updated: '2023-05-10T14:45:00Z',
  creator: {
    id: '101',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: '',
  },
  assignee: {
    id: '102',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '',
  },
}

const mockComments = [
  {
    id: '201',
    content: 'I checked the network switches and they appear to be functioning normally. Will investigate further.',
    created: '2023-05-10T11:15:00Z',
    user: {
      id: '102',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '',
    },
  },
  {
    id: '202',
    content: 'Are there any error messages when trying to access the shared drives?',
    created: '2023-05-10T12:30:00Z',
    user: {
      id: '103',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: '',
    },
  },
  {
    id: '203',
    content: 'Users are seeing "Network path not found" errors. I\'ve asked them to restart their computers to see if that helps.',
    created: '2023-05-10T13:45:00Z',
    user: {
      id: '101',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      avatar: '',
    },
  },
]

const mockStatuses = [
  { id: '1', name: 'Open' },
  { id: '2', name: 'In Progress' },
  { id: '3', name: 'Resolved' },
  { id: '4', name: 'Closed' },
]

const mockPriorities = [
  { id: '1', name: 'Low' },
  { id: '2', name: 'Medium' },
  { id: '3', name: 'High' },
]

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState(mockComments)
  const [newComment, setNewComment] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success')

  // Load ticket data from localStorage
  useEffect(() => {
    if (id) {
      const loadedTicket = getTicketById(id)
      if (loadedTicket) {
        setTicket(loadedTicket)
        setStatus(loadedTicket.status)
        setPriority(loadedTicket.priority)
      } else {
        // Ticket not found
        setSnackbarMessage('Ticket not found')
        setSnackbarSeverity('error')
        setSnackbarOpen(true)
        setTimeout(() => navigate('/tickets'), 2000)
      }
    }
  }, [id, navigate])

  const handleStatusChange = (event: any) => {
    const newStatus = event.target.value
    setStatus(newStatus)

    if (id && ticket) {
      try {
        const updatedTicket = updateTicket(id, { status: newStatus })
        if (updatedTicket) {
          setTicket(updatedTicket)
          setSnackbarMessage('Ticket status updated successfully')
          setSnackbarSeverity('success')
          setSnackbarOpen(true)
        }
      } catch (error) {
        setSnackbarMessage('Failed to update ticket status')
        setSnackbarSeverity('error')
        setSnackbarOpen(true)
      }
    }
  }

  const handlePriorityChange = (event: any) => {
    const newPriority = event.target.value
    setPriority(newPriority)

    if (id && ticket) {
      try {
        const updatedTicket = updateTicket(id, { priority: newPriority })
        if (updatedTicket) {
          setTicket(updatedTicket)
          setSnackbarMessage('Ticket priority updated successfully')
          setSnackbarSeverity('success')
          setSnackbarOpen(true)
        }
      } catch (error) {
        setSnackbarMessage('Failed to update ticket priority')
        setSnackbarSeverity('error')
        setSnackbarOpen(true)
      }
    }
  }

  const handleCommentSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newComment.trim()) return

    // Create a new comment object
    const newCommentObj = {
      id: `temp-${Date.now()}`,
      content: newComment,
      created: new Date().toISOString(),
      user: {
        id: user?.id || 'anonymous',
        name: user?.username || 'Anonymous User',
        email: user?.email || '',
        avatar: '',
      },
    }

    setComments([...comments, newCommentObj])
    setNewComment('')
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'error'
      case 'in progress':
        return 'warning'
      case 'resolved':
        return 'success'
      case 'closed':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a')
  }

  // If ticket is not loaded yet, show loading
  if (!ticket) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6">Loading ticket...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/tickets')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">Ticket #{id}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h5">{ticket.title}</Typography>
              <IconButton>
                <EditIcon />
              </IconButton>
            </Box>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {ticket.description}
            </Typography>

            {ticket.department && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Department:</strong> {ticket.department}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created by {ticket.createdBy} on {formatDate(ticket.created)}
                </Typography>
              </Box>
              <Box>
                <Button variant="outlined" startIcon={<AttachFileIcon />} sx={{ mr: 1 }}>
                  Attachments
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Comments
            </Typography>
            <List>
              {comments.map((comment) => (
                <ListItem key={comment.id} alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar alt={comment.user.name} src={comment.user.avatar} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2">{comment.user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(comment.created)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
                      >
                        {comment.content}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box component="form" onSubmit={handleCommentSubmit}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  disabled={!newComment.trim()}
                >
                  Add Comment
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Ticket Details" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <Select value={status} onChange={handleStatusChange}>
                      {mockStatuses.map((s) => (
                        <MenuItem key={s.id} value={s.name}>
                          <Chip
                            label={s.name}
                            color={getStatusColor(s.name) as any}
                            size="small"
                            sx={{ minWidth: '80px' }}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Priority</Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <Select value={priority} onChange={handlePriorityChange}>
                      {mockPriorities.map((p) => (
                        <MenuItem key={p.id} value={p.name}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Assignee</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Avatar
                      sx={{ width: 24, height: 24, mr: 1 }}
                    />
                    <Typography variant="body2">
                      {ticket.assignee || 'Unassigned'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Created By</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Avatar
                      sx={{ width: 24, height: 24, mr: 1 }}
                    />
                    <Typography variant="body2">{ticket.createdBy}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <Divider />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Activity log will be displayed here.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TicketDetail
