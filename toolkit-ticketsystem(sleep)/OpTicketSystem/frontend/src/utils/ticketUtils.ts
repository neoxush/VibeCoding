// Types
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created: string;
  assignee: string;
  createdBy: string;
  department?: string;
}

// Get all tickets from localStorage
export const getTickets = (): Ticket[] => {
  const storedTickets = localStorage.getItem('tickets');
  if (storedTickets) {
    return JSON.parse(storedTickets);
  }
  
  // Return mock data if no tickets exist
  const mockTickets = [
    { 
      id: '1', 
      title: 'Network connectivity issue', 
      description: 'Users in the marketing department are experiencing intermittent network connectivity issues.',
      status: 'Open', 
      priority: 'High', 
      created: '2023-05-10', 
      assignee: 'John Doe',
      createdBy: 'Admin User'
    },
    { 
      id: '2', 
      title: 'Email not working', 
      description: 'Several users are unable to send or receive emails.',
      status: 'In Progress', 
      priority: 'Medium', 
      created: '2023-05-09', 
      assignee: 'Jane Smith',
      createdBy: 'Admin User'
    },
    { 
      id: '3', 
      title: 'New software installation', 
      description: 'Need to install new accounting software on finance department computers.',
      status: 'Open', 
      priority: 'Low', 
      created: '2023-05-08', 
      assignee: 'Unassigned',
      createdBy: 'Admin User'
    },
    { 
      id: '4', 
      title: 'Printer not working', 
      description: 'The printer in the finance department is not responding.',
      status: 'Resolved', 
      priority: 'Medium', 
      created: '2023-05-07', 
      assignee: 'John Doe',
      createdBy: 'Admin User'
    },
    { 
      id: '5', 
      title: 'Password reset request', 
      description: 'User needs password reset for their account.',
      status: 'Open', 
      priority: 'Low', 
      created: '2023-05-06', 
      assignee: 'Jane Smith',
      createdBy: 'Admin User'
    },
  ];
  
  // Save mock tickets to localStorage
  localStorage.setItem('tickets', JSON.stringify(mockTickets));
  return mockTickets;
};

// Get a single ticket by ID
export const getTicketById = (id: string): Ticket | undefined => {
  const tickets = getTickets();
  return tickets.find(ticket => ticket.id === id);
};

// Add a new ticket
export const addTicket = (ticket: Omit<Ticket, 'id' | 'created'>): Ticket => {
  const tickets = getTickets();
  
  // Generate a new ID (in a real app, this would be done by the backend)
  const newId = (Math.max(...tickets.map(t => parseInt(t.id)), 0) + 1).toString();
  
  // Create new ticket with ID and creation date
  const newTicket: Ticket = {
    ...ticket,
    id: newId,
    created: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
  };
  
  // Add to tickets array
  const updatedTickets = [...tickets, newTicket];
  
  // Save to localStorage
  localStorage.setItem('tickets', JSON.stringify(updatedTickets));
  
  return newTicket;
};

// Update an existing ticket
export const updateTicket = (id: string, updates: Partial<Ticket>): Ticket | undefined => {
  const tickets = getTickets();
  const ticketIndex = tickets.findIndex(ticket => ticket.id === id);
  
  if (ticketIndex === -1) {
    return undefined;
  }
  
  // Update the ticket
  const updatedTicket = { ...tickets[ticketIndex], ...updates };
  tickets[ticketIndex] = updatedTicket;
  
  // Save to localStorage
  localStorage.setItem('tickets', JSON.stringify(tickets));
  
  return updatedTicket;
};

// Delete a ticket
export const deleteTicket = (id: string): boolean => {
  const tickets = getTickets();
  const filteredTickets = tickets.filter(ticket => ticket.id !== id);
  
  if (filteredTickets.length === tickets.length) {
    return false; // No ticket was deleted
  }
  
  // Save to localStorage
  localStorage.setItem('tickets', JSON.stringify(filteredTickets));
  
  return true;
};

// Get priority name from ID
export const getPriorityName = (priorityId: string): string => {
  const priorities = {
    '1': 'Low',
    '2': 'Medium',
    '3': 'High'
  };
  
  return priorities[priorityId as keyof typeof priorities] || 'Unknown';
};

// Get assignee name from ID
export const getAssigneeName = (assigneeId: string): string => {
  const assignees = {
    '101': 'Alice Johnson',
    '102': 'John Doe',
    '103': 'Jane Smith',
    '': 'Unassigned'
  };
  
  return assignees[assigneeId as keyof typeof assignees] || 'Unknown';
};
