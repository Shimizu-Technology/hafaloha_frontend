import type { CartItem } from '../store/orderStore';

const STORAGE_KEY = 'hafaloha_pending_checkout_v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 4;

export interface PendingCheckoutFormData {
  name: string;
  email: string;
  phone: string;
  specialInstructions: string;
  vipCode: string;
}

export interface PendingCheckoutDraft {
  version: 1;
  createdAt: string;
  restaurantId: string;
  cartItems: CartItem[];
  finalTotal: number;
  formData: PendingCheckoutFormData;
  locationId?: number;
}

export function savePendingCheckoutDraft(draft: Omit<PendingCheckoutDraft, 'version' | 'createdAt'>) {
  if (typeof window === 'undefined') return;

  const payload: PendingCheckoutDraft = {
    ...draft,
    version: 1,
    createdAt: new Date().toISOString(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadPendingCheckoutDraft(): PendingCheckoutDraft | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingCheckoutDraft;
    const createdAtMs = new Date(parsed.createdAt).getTime();

    if (!createdAtMs || Number.isNaN(createdAtMs)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (Date.now() - createdAtMs > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse pending checkout draft:', error);
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearPendingCheckoutDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
