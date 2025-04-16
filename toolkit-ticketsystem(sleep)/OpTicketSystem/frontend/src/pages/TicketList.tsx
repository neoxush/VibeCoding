import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getTickets } from '../utils/ticketUtils'
import TicketTable from '../components/TicketTable'

// Status and priority options for filtering
const statusOptions = ['All', 'Open', 'In Progress', 'Resolved', 'Closed']
const priorityOptions = ['All', 'Low', 'Medium', 'High']

const TicketList = () => {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState(getTickets())

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [showFilters, setShowFilters] = useState(false)

  // Load tickets from localStorage
  useEffect(() => {
    setTickets(getTickets())
  }, [])

  // Refresh tickets
  const refreshTickets = () => {
    setTickets(getTickets())
  }

  // Filter tickets based on search term and filters
  const filteredTickets = tickets.filter((ticket) => {
    // Search term filter
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.department && ticket.department.toLowerCase().includes(searchTerm.toLowerCase()))

    // Status filter
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter

    // Priority filter
    const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tickets</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tickets/create')}
        >
          Create Ticket
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showFilters ? 2 : 0 }}>
          <TextField
            placeholder="Search tickets..."
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
          <Box>
            <Tooltip title="Refresh tickets">
              <IconButton aria-label="refresh" onClick={refreshTickets} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Toggle filters">
              <IconButton
                aria-label="filter"
                onClick={() => setShowFilters(!showFilters)}
                color={showFilters ? 'primary' : 'default'}
              >
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Priority"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  {priorityOptions.map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      {priority}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ ml: 'auto' }}>
                Showing {filteredTickets.length} of {tickets.length} tickets
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>

      <TicketTable tickets={filteredTickets} title="All Tickets" />
    </Box>
  )
}

export default TicketList
