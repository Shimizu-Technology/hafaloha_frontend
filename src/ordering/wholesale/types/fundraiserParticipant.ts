// src/ordering/wholesale/types/fundraiserParticipant.ts

export interface FundraiserParticipant {
  id?: number;
  name: string;
  team?: string;
  active: boolean;
  fundraiser_id: number;
  created_at?: string;
  updated_at?: string;
}
