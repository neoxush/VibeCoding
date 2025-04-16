import { createClient } from '@supabase/supabase-js';

// These would typically be environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User roles
export enum UserRole {
  USER = 'user',
  APPROVER = 'approver',
  ADMIN = 'admin',
}

// Ticket statuses
export enum TicketStatus {
  OPEN = 'open',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

// Helper functions for authentication
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: UserRole.USER, // Default role for new users
      },
    },
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};

// Helper functions for tickets
export const createTicket = async (title: string, description: string, userId: string) => {
  const { data, error } = await supabase
    .from('tickets')
    .insert([
      {
        title,
        description,
        status: TicketStatus.OPEN,
        created_by: userId,
      },
    ])
    .select();
  
  return { data, error };
};

export const getTickets = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const getTicketById = async (id: string) => {
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();
  
  if (ticketError) {
    return { ticket: null, comments: null, error: ticketError };
  }
  
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('*, profiles(name)')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });
  
  return { ticket, comments, error: commentsError };
};

export const updateTicketStatus = async (id: string, status: TicketStatus) => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date() })
    .eq('id', id)
    .select();
  
  return { data, error };
};

export const addComment = async (ticketId: string, userId: string, content: string) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        ticket_id: ticketId,
        user_id: userId,
        content,
      },
    ])
    .select('*, profiles(name)');
  
  return { data, error };
};
