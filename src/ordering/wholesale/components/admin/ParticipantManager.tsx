// src/ordering/wholesale/components/admin/ParticipantManager.tsx

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Search, X, Upload, FileText } from 'lucide-react';
import { Button, Input } from '../../../../shared/components/ui';
import { FundraiserParticipant } from '../../types/fundraiserParticipant';
import participantService from '../../services/participantService';
import toastUtils from '../../../../shared/utils/toastUtils';

interface ParticipantManagerProps {
  fundraiserId: number;
  fundraiserName?: string;
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({ fundraiserId, fundraiserName }) => {
  // State for participants
  const [participants, setParticipants] = useState<FundraiserParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [teams, setTeams] = useState<string[]>([]);
  
  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<FundraiserParticipant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    active: true
  });
  
  // State for bulk import modal
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkParticipants, setBulkParticipants] = useState<string>('');
  
  // Load participants
  useEffect(() => {
    if (fundraiserId) {
      fetchParticipants();
    }
  }, [fundraiserId, page, perPage, activeFilter, teamFilter]);
  
  // Fetch participants from API
  const fetchParticipants = async () => {
    if (!fundraiserId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page,
        per_page: perPage,
        sort_by: 'name',
        sort_direction: 'asc'
      };
      
      if (activeFilter !== 'all') {
        params.active = activeFilter === 'active';
      }
      
      if (teamFilter) {
        params.team = teamFilter;
      }
      
      const response = await participantService.getParticipants(fundraiserId, params);
      setParticipants(response.participants);
      setTotalPages(response.meta.total_pages);
      setTotalCount(response.meta.total_count);
      
      // Extract unique teams for filtering
      const uniqueTeams = Array.from(new Set(
        response.participants
          .map(p => p.team)
          .filter(team => team && team.trim() !== '') as string[]
      ));
      setTeams(uniqueTeams);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Failed to load participants. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants();
  };
  
  // Handle active filter change
  const handleActiveFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveFilter(e.target.value as 'all' | 'active' | 'inactive');
  };
  
  // Handle team filter change
  const handleTeamFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTeamFilter(e.target.value);
  };
  
  // Open modal for creating a new participant
  const handleCreateNew = () => {
    setCurrentParticipant(null);
    setFormData({
      name: '',
      team: '',
      active: true
    });
    setIsModalOpen(true);
  };
  
  // Open modal for editing an existing participant
  const handleEdit = (participant: FundraiserParticipant) => {
    setCurrentParticipant(participant);
    setFormData({
      name: participant.name,
      team: participant.team || '',
      active: participant.active
    });
    setIsModalOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name) {
      toastUtils.error('Name is required.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (currentParticipant && currentParticipant.id) {
        // Update existing participant
        await participantService.updateParticipant(fundraiserId, currentParticipant.id, formData);
        toastUtils.success('Participant updated successfully!');
      } else {
        // Create new participant
        await participantService.createParticipant(fundraiserId, formData);
        toastUtils.success('Participant created successfully!');
      }
      
      // Reset form and close modal
      setFormData({
        name: '',
        team: '',
        active: true
      });
      setIsModalOpen(false);
      
      // Refresh participant list
      fetchParticipants();
    } catch (err) {
      console.error('Error saving participant:', err);
      toastUtils.error('Failed to save participant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete participant
  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this participant? This action cannot be undone.')) {
      try {
        await participantService.deleteParticipant(fundraiserId, id);
        toastUtils.success('Participant deleted successfully!');
        fetchParticipants();
      } catch (err) {
        console.error('Error deleting participant:', err);
        toastUtils.error('Failed to delete participant. Please try again.');
      }
    }
  };
  
  // Open bulk import modal
  const handleOpenBulkImport = () => {
    setSelectedFile(null);
    setBulkParticipants('');
    setIsBulkImportModalOpen(true);
  };
  
  // Handle file selection for bulk import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle bulk participants text input
  const handleBulkParticipantsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkParticipants(e.target.value);
  };
  
  // Handle bulk import submission
  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile && !bulkParticipants) {
      toastUtils.error('Please provide either a CSV file or a list of participants.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let result;
      
      if (selectedFile) {
        // Import from file
        result = await participantService.bulkImportFromFile(fundraiserId, selectedFile);
      } else {
        // Import from text input
        // Parse the text input into an array of participant objects
        const lines = bulkParticipants.split('\n').filter(line => line.trim() !== '');
        const participants = lines.map(line => {
          const [name, team] = line.split(',').map(item => item.trim());
          return {
            name,
            team: team || undefined,
            active: true
          };
        });
        
        result = await participantService.bulkImportFromArray(fundraiserId, participants);
      }
      
      toastUtils.success(`${result.message} (${result.imported_count} participants)`);
      setIsBulkImportModalOpen(false);
      fetchParticipants();
    } catch (err) {
      console.error('Error importing participants:', err);
      toastUtils.error('Failed to import participants. Please check your file format and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Participant Management</h1>
          {fundraiserName && (
            <p className="text-gray-600">Fundraiser: {fundraiserName}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={handleOpenBulkImport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
          >
            <FileText size={18} className="mr-2" />
            Bulk Import
          </Button>
          <Button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <PlusCircle size={18} className="mr-2" />
            Add Participant
          </Button>
        </div>
      </div>
      
      {/* Search and filter */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <form onSubmit={handleSearchSubmit} className="flex">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 w-full"
                />
              </div>
              <Button 
                type="submit"
                className="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              >
                Search
              </Button>
            </form>
          </div>
          
          <div className="md:w-48">
            <select
              value={activeFilter}
              onChange={handleActiveFilterChange}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {teams.length > 0 && (
            <div className="md:w-48">
              <select
                value={teamFilter}
                onChange={handleTeamFilterChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teams</option>
                {teams.map((team, index) => (
                  <option key={index} value={team}>{team}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading participants...</p>
        </div>
      ) : (
        <>
          {/* Participant list */}
          {participants.length === 0 ? (
            <div className="bg-white p-8 rounded shadow text-center">
              <p className="text-gray-600">No participants found. Add your first participant to get started!</p>
            </div>
          ) : (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{participant.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {participant.team || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${participant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {participant.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(participant)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(participant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {participants.length} of {totalCount} participants
              </div>
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded ${
                      pageNum === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Modal for creating/editing participant */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {currentParticipant ? 'Edit Participant' : 'Add New Participant'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <Input
                  type="text"
                  name="team"
                  value={formData.team}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 mr-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (currentParticipant ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal for bulk import */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Bulk Import Participants</h2>
              <button
                onClick={() => setIsBulkImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBulkImportSubmit} className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with columns: name, team, active (optional). The first row should be the header.
                </p>
                <div className="flex items-center">
                  <label className="cursor-pointer bg-white border border-gray-300 rounded-md py-2 px-3 text-sm leading-4 text-gray-700 hover:bg-gray-50 inline-flex items-center">
                    <Upload size={16} className="mr-1" />
                    Choose File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="ml-3 text-sm text-gray-500">
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Or Enter Participants Manually</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter one participant per line in the format: Name, Team (optional)
                </p>
                <textarea
                  value={bulkParticipants}
                  onChange={handleBulkParticipantsChange}
                  placeholder="John Doe, Team A&#10;Jane Smith, Team B&#10;Bob Johnson"
                  rows={6}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setIsBulkImportModalOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 mr-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Importing...' : 'Import Participants'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantManager;
