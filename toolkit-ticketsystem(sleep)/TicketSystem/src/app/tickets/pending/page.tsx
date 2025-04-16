'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getTickets, updateTicketStatus, TicketStatus } from '@/lib/supabase';
import { Ticket } from '@/types';

export default function PendingApprovals() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data, error } = await getTickets();
        
        if (error) {
          throw error;
        }
        
        // Filter tickets that are pending approval
        const pendingTickets = data?.filter(
          (ticket) => ticket.status === TicketStatus.PENDING_APPROVAL
        ) || [];
        
        setTickets(pendingTickets);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch tickets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleApprove = async (ticketId: string) => {
    setActionLoading(ticketId);
    try {
      const { data, error } = await updateTicketStatus(
        ticketId,
        TicketStatus.APPROVED
      );
      
      if (error) {
        throw error;
      }
      
      // Update the local state
      setTickets((prevTickets) =>
        prevTickets.filter((ticket) => ticket.id !== ticketId)
      );
    } catch (err: any) {
      setError(err.message || 'Failed to approve ticket');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (ticketId: string) => {
    setActionLoading(ticketId);
    try {
      const { data, error } = await updateTicketStatus(
        ticketId,
        TicketStatus.REJECTED
      );
      
      if (error) {
        throw error;
      }
      
      // Update the local state
      setTickets((prevTickets) =>
        prevTickets.filter((ticket) => ticket.id !== ticketId)
      );
    } catch (err: any) {
      setError(err.message || 'Failed to reject ticket');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'approver')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="text-gray-500 text-center">No tickets pending approval.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-900">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.created_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(ticket.id)}
                        disabled={actionLoading === ticket.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:bg-green-300"
                      >
                        {actionLoading === ticket.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(ticket.id)}
                        disabled={actionLoading === ticket.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:bg-red-300"
                      >
                        {actionLoading === ticket.id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
