'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data for tickets - will be replaced with actual API calls
const mockTickets = [
  {
    id: '1',
    title: 'Server Error 500',
    description: 'Users are experiencing 500 errors when accessing the dashboard',
    status: 'open',
    createdBy: 'john@example.com',
    assignedTo: null,
    createdAt: '2023-12-01T10:30:00Z',
  },
  {
    id: '2',
    title: 'Feature Request: Export to PDF',
    description: 'Customers are requesting the ability to export reports as PDF files',
    status: 'pending_approval',
    createdBy: 'sarah@example.com',
    assignedTo: 'admin@example.com',
    createdAt: '2023-12-02T14:15:00Z',
  },
  {
    id: '3',
    title: 'Login Page Redesign',
    description: 'Update the login page to match the new brand guidelines',
    status: 'approved',
    createdBy: 'designer@example.com',
    assignedTo: 'dev@example.com',
    createdAt: '2023-12-03T09:45:00Z',
  },
];

export default function Dashboard() {
  const [tickets, setTickets] = useState(mockTickets);
  const [userRole, setUserRole] = useState('admin'); // Mock user role - will be replaced with actual auth

  // This would be replaced with an actual API call
  useEffect(() => {
    // Fetch tickets from API
    setTickets(mockTickets);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex space-x-4">
          <Link
            href="/tickets/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create New Ticket
          </Link>
          <button
            onClick={() => console.log('Logout clicked')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Tickets</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            View and manage your tickets
          </p>
        </div>
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                    <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 
                        ticket.status === 'pending_approval' ? 'bg-blue-100 text-blue-800' : 
                        ticket.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.createdBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                      View
                    </Link>
                    {userRole === 'admin' && ticket.status === 'pending_approval' && (
                      <button 
                        onClick={() => console.log('Approve ticket', ticket.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
