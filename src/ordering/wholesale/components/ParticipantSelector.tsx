// src/ordering/wholesale/components/ParticipantSelector.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Loader, RefreshCw } from 'lucide-react';
import participantService from '../services/participantService';

export interface Participant {
  id: number;
  name: string;
  team?: string;
}

// Special participant ID for "General Support" option
export const GENERAL_SUPPORT_ID = 0;

interface ParticipantSelectorProps {
  fundraiserId: number;
  selectedParticipantId?: number;
  onChange: (participantId: number) => void;
  className?: string;
  required?: boolean;
  label?: string;
  disabled?: boolean;
  showGeneralSupport?: boolean; // Option to show or hide General Support option
  generalSupportLabel?: string; // Customizable label for General Support
  defaultToGeneralSupport?: boolean; // Whether to default to General Support when no selection
}

const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({
  fundraiserId,
  selectedParticipantId,
  onChange,
  className = '',
  required = false,
  label = 'Support a Participant',
  disabled = false,
  showGeneralSupport = true,
  generalSupportLabel = 'General Support (No specific participant)',
  defaultToGeneralSupport = true
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to create a memoized version of fetchParticipants
  const fetchParticipants = useCallback(async () => {
    if (!fundraiserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await participantService.getParticipants(fundraiserId, { active: true });
      // Extract participants from the response
      const fetchedParticipants = response.participants || [];
      
      setParticipants(fetchedParticipants.filter(p => p.id !== undefined).map(p => ({
        id: p.id as number,
        name: p.name || `Participant ${p.id}`,
        team: p.team
      })));
    } catch (error) {
      console.error(`Failed to fetch participants for fundraiser ${fundraiserId}:`, error);
      setError('Failed to load participants. Please try again.');
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [fundraiserId]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Set default to general support if no selection is made and defaultToGeneralSupport is true
  useEffect(() => {
    if (selectedParticipantId === undefined && showGeneralSupport && defaultToGeneralSupport) {
      onChange(GENERAL_SUPPORT_ID);
    }
  }, [selectedParticipantId, showGeneralSupport, defaultToGeneralSupport, onChange]);

  // Group participants by team if team information is available
  const participantsByTeam = participants.reduce((groups, participant) => {
    const team = participant.team || 'No Team';
    if (!groups[team]) {
      groups[team] = [];
    }
    groups[team].push(participant);
    return groups;
  }, {} as Record<string, Participant[]>);

  const hasTeams = Object.keys(participantsByTeam).length > 1;

  return (
    <div className={className}>
      <label htmlFor={`participant-${fundraiserId}`} className="text-sm font-medium text-gray-700 mb-1 flex items-center">
        <Users className="h-4 w-4 mr-1" />
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {loading ? (
        // Enhanced loading state with skeleton loader
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="flex items-center mt-2 text-sm text-gray-400">
            <Loader className="h-4 w-4 mr-2 animate-spin" />
            Loading participants...
          </div>
        </div>
      ) : error ? (
        // Enhanced error state with retry button
        <div>
          <div className="text-sm text-red-500 mb-2">{error}</div>
          <button 
            onClick={fetchParticipants} 
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            type="button"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry loading participants
          </button>
        </div>
      ) : participants.length === 0 ? (
        <div className="text-sm text-gray-500 p-2 border border-gray-200 rounded bg-gray-50">
          No participants found for this fundraiser
          {showGeneralSupport && (
            <div className="mt-1">
              <button 
                className="text-[#c1902f] hover:text-[#d4a43f] text-sm"
                onClick={() => onChange(GENERAL_SUPPORT_ID)}
                type="button"
              >
                Select General Support
              </button>
            </div>
          )}
        </div>
      ) : (
        <select
          id={`participant-${fundraiserId}`}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] sm:text-sm rounded-md"
          value={selectedParticipantId === undefined ? (showGeneralSupport && defaultToGeneralSupport ? GENERAL_SUPPORT_ID : '') : selectedParticipantId}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          required={required}
        >
          <option value="">Select a participant</option>
          
          {/* General Support Option */}
          {showGeneralSupport && (
            <option value={GENERAL_SUPPORT_ID}>{generalSupportLabel}</option>
          )}
          
          {hasTeams ? (
            // Group by teams if available
            Object.entries(participantsByTeam).map(([team, teamParticipants]) => (
              <optgroup key={team} label={team}>
                {teamParticipants.map(participant => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </optgroup>
            ))
          ) : (
            // Simple list if no teams
            participants.map(participant => (
              <option key={participant.id} value={participant.id}>
                {participant.name} {participant.team ? `(${participant.team})` : ''}
              </option>
            ))
          )}
        </select>
      )}
    </div>
  );
};

export default ParticipantSelector;
