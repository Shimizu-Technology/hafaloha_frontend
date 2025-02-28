// src/ordering/components/admin/settings/UsersSettings.tsx

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { UserModal } from './UserModal';

interface User {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

type RoleFilter = 'all' | 'admin' | 'customer';

// For sorting
type SortBy = 'created_at' | 'email';
type SortDir = 'asc' | 'desc';

interface UsersSettingsProps {
  restaurantId?: string;
}

export function UsersSettings({ restaurantId }: UsersSettingsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // For editing
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');

  // Sorting
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10; // or 20, etc.

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filterRole, sortBy, sortDir, page]);

  interface UsersResponse {
    users: User[];
    total_count: number;
    page: number;
    per_page: number;
  }

  async function fetchUsers() {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterRole !== 'all') params.append('role', filterRole);

      params.append('page', String(page));
      params.append('per_page', String(perPage));
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const url = `/admin/users?${params.toString()}`;
      const data = await api.get<UsersResponse>(url);

      // data = { users, total_count, page, per_page }
      setUsers(data.users);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users.');
    }
  }

  function handleUserClick(user: User) {
    setIsCreateMode(false);
    setSelectedUser(user);
    setShowModal(true);
  }

  function handleCreateNewUser() {
    setIsCreateMode(true);
    setSelectedUser(null);
    setShowModal(true);
  }

  function handleModalClose(didChange: boolean) {
    setShowModal(false);
    setSelectedUser(null);
    if (didChange) {
      // re-fetch data
      fetchUsers();
    }
  }

  // Pagination helpers
  const totalPages = Math.ceil(totalCount / perPage);

  function handlePrevPage() {
    if (page > 1) setPage(page - 1);
  }

  function handleNextPage() {
    if (page < totalPages) setPage(page + 1);
  }

  // Helper for date formatting
  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
    }).format(new Date(dateStr));
    // e.g. "February 21, 2025"
  }

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left side: Search & Filter & Sort */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Search input */}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setPage(1); // reset to page 1
              setSearchTerm(e.target.value);
            }}
            className="border border-gray-300 rounded-md px-3 py-1
                       text-sm focus:outline-none focus:ring-1 
                       focus:ring-[#c1902f] w-64"
          />

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => {
              setPage(1);
              setFilterRole(e.target.value as RoleFilter);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm
                       focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
          </select>

          {/* Sort dropdown */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortBy);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm 
                         focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
            >
              <option value="created_at">Sort: Date Created</option>
              <option value="email">Sort: Email</option>
            </select>

            <select
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value as SortDir);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm
                         focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
            >
              <option value="desc">DESC</option>
              <option value="asc">ASC</option>
            </select>
          </div>
        </div>

        {/* Create User Button */}
        <button
          onClick={handleCreateNewUser}
          className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]
                     text-sm"
        >
          + Create New User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/5">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/4">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/6">
                Role
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/6">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const fullName =
                user.first_name || user.last_name
                  ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                  : '—';

              return (
                <tr
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <td className="px-4 py-2">{fullName}</td>
                  <td className="px-4 py-2 text-gray-700">{user.email}</td>
                  <td className="px-4 py-2 capitalize text-gray-600">
                    {user.role}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* If no users found */}
        {users.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No users found.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-2 text-sm">
        <div>
          Page {page} of {Math.max(totalPages, 1)}
        </div>
        <div className="space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <UserModal
          user={selectedUser}
          isCreateMode={isCreateMode}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
