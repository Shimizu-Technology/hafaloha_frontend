// src/ordering/wholesale/services/participantService.ts

import axios from 'axios';
import { FundraiserParticipant } from '../types/fundraiserParticipant';
import { getRequestHeaders, getRequestParams } from '../../../shared/utils/authUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ParticipantsResponse {
  participants: FundraiserParticipant[];
  meta: {
    total_count: number;
    total_pages: number;
    current_page: number;
    per_page: number;
  };
}

interface ImportResult {
  message: string;
  imported_count: number;
}

const participantService = {
  /**
   * Get participants for a fundraiser
   */
  getParticipants: async (
    fundraiserId: number,
    params: {
      page?: number;
      per_page?: number;
      active?: boolean;
      team?: string;
      sort_by?: string;
      sort_direction?: 'asc' | 'desc';
    } = {}
  ): Promise<ParticipantsResponse> => {
    const headers = getRequestHeaders();
    const requestParams = getRequestParams(params);
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants`,
      { 
        params: requestParams,
        headers 
      }
    );
    return response.data;
  },

  /**
   * Get a single participant by ID
   */
  getParticipant: async (fundraiserId: number, participantId: number): Promise<FundraiserParticipant> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants/${participantId}`,
      { headers, params }
    );
    return response.data;
  },

  /**
   * Create a new participant
   */
  createParticipant: async (
    fundraiserId: number,
    participant: {
      name: string;
      team?: string;
      active?: boolean;
    }
  ): Promise<FundraiserParticipant> => {
    const headers = getRequestHeaders();
    
    // Ensure the participant is associated with the correct fundraiser
    const enhancedData = {
      ...participant,
      fundraiser_id: fundraiserId
    };
    
    const response = await axios.post(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants`,
      { participant: enhancedData },
      { headers }
    );
    return response.data;
  },

  /**
   * Update an existing participant
   */
  updateParticipant: async (
    fundraiserId: number,
    participantId: number,
    participant: {
      name?: string;
      team?: string;
      active?: boolean;
    }
  ): Promise<FundraiserParticipant> => {
    const headers = getRequestHeaders();
    
    // Ensure the participant is associated with the correct fundraiser
    const enhancedData = {
      ...participant,
      fundraiser_id: fundraiserId
    };
    
    const response = await axios.put(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants/${participantId}`,
      { participant: enhancedData },
      { headers }
    );
    return response.data;
  },

  /**
   * Delete a participant
   */
  deleteParticipant: async (fundraiserId: number, participantId: number): Promise<void> => {
    const headers = getRequestHeaders();
    
    await axios.delete(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants/${participantId}`,
      { headers }
    );
  },

  /**
   * Bulk import participants from CSV file
   */
  bulkImportFromFile: async (fundraiserId: number, file: File): Promise<ImportResult> => {
    const authHeaders = getRequestHeaders();
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants/bulk_import`,
      formData,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Bulk import participants from array
   */
  bulkImportFromArray: async (
    fundraiserId: number,
    participants: Array<{
      name: string;
      team?: string;
      active?: boolean;
    }>
  ): Promise<ImportResult> => {
    const headers = getRequestHeaders();
    
    // Ensure all participants are associated with the correct fundraiser
    const enhancedParticipants = participants.map(participant => ({
      ...participant,
      fundraiser_id: fundraiserId
    }));
    
    const response = await axios.post(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/participants/bulk_import`,
      { participants: enhancedParticipants },
      { headers }
    );

    return response.data;
  }
};

export default participantService;
