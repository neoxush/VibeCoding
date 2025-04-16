import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Typography,
} from '@mui/material';
import { Ticket } from '../utils/ticketUtils';

interface TicketTableProps {
  tickets: Ticket[];
  title?: string;
  compact?: boolean;
}

const TicketTable = ({ tickets, title, compact = false }: TicketTableProps) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(compact ? 5 : 10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (id: string) => {
    navigate(`/tickets/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'error';
      case 'in progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <TableContainer component={Paper}>
      {title && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}
      <Table sx={{ minWidth: 650 }} aria-label="ticket table" size={compact ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Priority</TableCell>
            {!compact && <TableCell>Department</TableCell>}
            <TableCell>Created</TableCell>
            {!compact && <TableCell>Assignee</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {tickets
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((ticket) => (
              <TableRow
                key={ticket.id}
                hover
                onClick={() => handleRowClick(ticket.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{ticket.id}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
                  <Chip
                    label={ticket.status}
                    color={getStatusColor(ticket.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={ticket.priority}
                    color={
                      ticket.priority === 'High' ? 'error' :
                      ticket.priority === 'Medium' ? 'warning' : 'success'
                    }
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                {!compact && <TableCell>{ticket.department || 'N/A'}</TableCell>}
                <TableCell>{ticket.created}</TableCell>
                {!compact && <TableCell>{ticket.assignee}</TableCell>}
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={compact ? [5, 10] : [10, 25, 50]}
        component="div"
        count={tickets.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
};

export default TicketTable;
