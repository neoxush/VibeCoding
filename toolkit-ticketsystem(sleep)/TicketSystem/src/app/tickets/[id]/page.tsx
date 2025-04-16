'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data for a ticket - will be replaced with actual API calls
const mockTicket = {
  id: '1',
  title: 'Server Error 500',
  description: 'Users are experiencing 500 errors when accessing the dashboard. The error occurs randomly and seems to be related to high traffic periods. We need to investigate the server logs and optimize the database queries.',
  status: 'pending_approval',
  createdBy: 'john@example.com',
  assignedTo: null,
  createdAt: '2023-12-01T10:30:00Z',
  updatedAt: '2023-12-01T14:45:00Z',
  comments: [
    {
      id: '101',
      content: 'I checked the server logs and found some slow database queries.',
      userId: 'tech@example.com',
      userName: 'Tech Support',
      createdAt: '2023-12-01T11:30:00Z',
    },
    {
      id: '102',
      content: 'We should optimize the user dashboard query. It\'s taking too long to execute.',
      userId: 'dev@example.com',
      userName: 'Developer',
      createdAt: '2023-12-01T13:15:00Z',
    },
  ],
};

export default function TicketDetail({ params }: { params: { id: string } }) {
  const [ticket, setTicket] = useState(mockTicket);
  const [comment, setComment] = useState('');
  const [userRole, setUserRole] = useState('admin'); // Mock user role - will be replaced with actual auth
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This would be replaced with an actual API call
  useEffect(() => {
    // Fetch ticket details from API using params.id
    console.log('Fetching ticket with ID:', params.id);
    setTicket(mockTicket);
  }, [params.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      // This will be replaced with an actual API call
      console.log('Adding comment:', comment);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state with new comment
      const newComment = {
        id: Date.now().toString(),
        content: comment,
        userId: 'current-user@example.com',
        userName: 'Current User',
        createdAt: new Date().toISOString(),
      };
      
      setTicket({
        ...ticket,
        comments: [...ticket.comments, newComment],
      });
      
      setComment('');
    } catch (err) {
      setError('Failed to add comment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTicket = async () => {
    setLoading(true);
    setError(null);

    try {
      // This will be replaced with an actual API call
      console.log('Approving ticket:', params.id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setTicket({
        ...ticket,
        status: 'approved',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError('Failed to approve ticket. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Ticket Details</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{ticket.title}</h2>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
              ${ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 
                ticket.status === 'pending_approval' ? 'bg-blue-100 text-blue-800' : 
                ticket.status === 'approved' ? 'bg-green-100 text-green-800' : 
                'bg-gray-100 text-gray-800'}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-600">Created by:</p>
              <p className="font-medium">{ticket.createdBy}</p>
            </div>
            <div>
              <p className="text-gray-600">Created at:</p>
              <p className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Assigned to:</p>
              <p className="font-medium">{ticket.assignedTo || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-gray-600">Last updated:</p>
              <p className="font-medium">{new Date(ticket.updatedAt).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-line">{ticket.description}</p>
          </div>
          
          {userRole === 'admin' && ticket.status === 'pending_approval' && (
            <div className="mb-6">
              <button
                onClick={handleApproveTicket}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-green-300"
              >
                {loading ? 'Processing...' : 'Approve Ticket'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Comments</h3>
        </div>
        
        <div className="px-6 py-4">
          {ticket.comments.length > 0 ? (
            <div className="space-y-4">
              {ticket.comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-100 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold">{comment.userName}</p>
                    <p className="text-sm text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No comments yet.</p>
          )}
          
          <form onSubmit={handleAddComment} className="mt-6">
            <div className="mb-4">
              <label htmlFor="comment" className="block text-gray-700 text-sm font-bold mb-2">
                Add a comment
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                placeholder="Type your comment here..."
                required
              />
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading || !comment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
              >
                {loading ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
