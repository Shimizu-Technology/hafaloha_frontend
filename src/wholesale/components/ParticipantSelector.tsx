// src/wholesale/components/ParticipantSelector.tsx
import { useState } from 'react';
import { WholesaleParticipant } from '../services/wholesaleApi';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

interface ParticipantSelectorProps {
  participants: WholesaleParticipant[];
  selectedParticipantId?: number | null;
  onParticipantSelect: (participantId: number | null) => void;
  fundraiserName: string;
  disabled?: boolean;
  className?: string;
}

export default function ParticipantSelector({
  participants,
  selectedParticipantId,
  onParticipantSelect,
  fundraiserName,
  disabled = false,
  className = ''
}: ParticipantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedParticipant = participants.find(p => p.id === selectedParticipantId);

  const handleParticipantClick = (participantId: number | null) => {
    onParticipantSelect(participantId);
    setIsOpen(false);
  };



  return (
    <div className={`participant-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Who would you like to support? *
      </label>
      
      <div className="relative">
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedParticipant ? (
                <>
                  {selectedParticipant.photoUrl ? (
                    <OptimizedImage 
                      src={selectedParticipant.photoUrl} 
                      alt={selectedParticipant.name}
                      context="cart"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{selectedParticipant.name}</div>
                  </div>
                </>
              ) : selectedParticipantId === null ? (
                <>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">General Organization Support</div>
                    <div className="text-sm text-gray-500">Support {fundraiserName} overall</div>
                  </div>
                </>
              ) : (
                <span className="text-gray-500">Select a participant to support...</span>
              )}
            </div>
            
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {/* General Organization Option */}
            <button
              type="button"
              onClick={() => handleParticipantClick(null)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                selectedParticipantId === null ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">General Organization Support</div>
                  <div className="text-sm text-gray-500">Support {fundraiserName} overall</div>
                </div>
              </div>
            </button>

            {/* Individual Participants */}
            {participants.map((participant) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => handleParticipantClick(participant.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                  selectedParticipantId === participant.id ? 'bg-blue-50' : ''
                } ${participants.indexOf(participant) === participants.length - 1 ? '' : 'border-b border-gray-100'}`}
              >
                <div className="flex items-center space-x-3">
                  {participant.photoUrl ? (
                    <OptimizedImage 
                      src={participant.photoUrl} 
                      alt={participant.name}
                      context="cart"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                   <div className="flex-grow">
                     <div className="font-medium text-gray-900">{participant.name}</div>
                   </div>

                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Participant Details (description removed for current scope) */}
      {selectedParticipant && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            {selectedParticipant.photoUrl ? (
              <OptimizedImage src={selectedParticipant.photoUrl} alt={selectedParticipant.name} context="cart" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div className="flex-grow">
              <h4 className="font-medium text-blue-900">Supporting: {selectedParticipant.name}</h4>
            </div>
          </div>
        </div>
      )}

      {/* General Organization Selection */}
      {selectedParticipantId === null && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">
                Supporting: {fundraiserName}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Your purchase will support the general organization fund.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-500">
        {participants.length > 0 
          ? `Choose a specific participant to support, or select "General Organization Support" to help the overall cause.`
          : 'Your purchase will support the general organization fund.'
        }
      </div>
    </div>
  );
}