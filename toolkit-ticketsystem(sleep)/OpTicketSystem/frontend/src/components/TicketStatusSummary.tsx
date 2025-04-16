import { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { getTickets } from '../utils/ticketUtils';

const TicketStatusSummary = () => {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0,
  });

  useEffect(() => {
    // Get tickets and calculate stats
    const tickets = getTickets();
    
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const resolved = tickets.filter(t => t.status === 'Resolved').length;
    const urgent = tickets.filter(t => t.priority === 'High' && t.status !== 'Resolved').length;
    
    setStats({ total, open, inProgress, resolved, urgent });
  }, []);

  return (
    <Box sx={{ mt: 2 }}>
      <Divider />
      <List dense>
        <ListItem>
          <ListItemIcon>
            <Badge badgeContent={stats.total} color="primary" max={99}>
              <ConfirmationNumberIcon color="action" />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Total Tickets" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <Badge badgeContent={stats.open} color="error" max={99}>
              <ErrorIcon color="action" />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Open Tickets" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <Badge badgeContent={stats.inProgress} color="warning" max={99}>
              <PendingIcon color="action" />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="In Progress" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <Badge badgeContent={stats.resolved} color="success" max={99}>
              <CheckCircleIcon color="action" />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Resolved" />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <Badge badgeContent={stats.urgent} color="error" max={99}>
              <ErrorIcon color="error" />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Urgent Tickets" />
        </ListItem>
      </List>
      <Divider />
    </Box>
  );
};

export default TicketStatusSummary;
