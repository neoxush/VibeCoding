import { UserRole, TicketStatus } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    name: string;
  };
}

export interface TicketWithComments extends Ticket {
  comments: Comment[];
}
