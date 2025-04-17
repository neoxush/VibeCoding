import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import { useAuth } from '../contexts/AuthContext'
import { getTickets } from '../utils/ticketUtils'
import TicketTable from '../components/TicketTable'

// Filter function for tickets
const filterTickets = (tickets: any[], searchTerm: string) => {
  if (!searchTerm) return tickets;

  return tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.department && ticket.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ticket.assignee.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState(getTickets())
  const [searchTerm, setSearchTerm] = useState('')

  // Load tickets from localStorage
  useEffect(() => {
    setTickets(getTickets())
  }, [])

  // Filter tickets based on search term
  const filteredTickets = filterTickets(tickets, searchTerm)

  // Calculate ticket stats
  const stats = {
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status === 'Open').length,
    resolvedTickets: tickets.filter(t => t.status === 'Resolved').length,
    urgentTickets: tickets.filter(t => t.priority === 'High' && t.status !== 'Resolved').length,
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="subtitle1">
            Welcome back, {user?.username}!
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tickets/create')}
        >
          Create Ticket
        </Button>
      </Box>

      {/* Stats cards in a collapsible accordion */}
      <Accordion defaultExpanded={false} sx={{ mb: 3 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="stats-content"
          id="stats-header"
        >
          <Typography variant="h6">Ticket Statistics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">Total Tickets</Typography>
                  <Typography variant="h3">{stats.totalTickets}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">Open Tickets</Typography>
                  <Typography variant="h3">{stats.openTickets}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">Resolved Tickets</Typography>
                  <Typography variant="h3">{stats.resolvedTickets}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">Urgent Tickets</Typography>
                  <Typography variant="h3">{stats.urgentTickets}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Search bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tickets..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Ticket table */}
      <TicketTable tickets={filteredTickets} />
    </Box>
  )
}

export default Dashboard
