// src/ordering/hooks/usePromos.ts
import { useState, useCallback } from 'react';
import { useOrderingApi } from './useOrderingApi';

export interface PromoCode {
  code: string;
  discountAmount?: number;
  discountPercent?: number;
  validUntil?: string;
  maxUses?: number;
  currentUses?: number;
}

export function usePromos() {
  const { get, post, patch, delete: remove } = useOrderingApi();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET /promo_codes
  const fetchPromoCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get('/promo_codes');
      setPromoCodes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // local check
  const validatePromoCode = useCallback(
    (code: string) => {
      const promo = promoCodes.find((p) => {
        const notExpired = !p.validUntil || new Date(p.validUntil) > new Date();
        const underMax = !p.maxUses || (p.currentUses || 0) < p.maxUses;
        return p.code === code && notExpired && underMax;
      });
      return promo || null;
    },
    [promoCodes]
  );

  // Example: server side apply
  const applyDiscount = useCallback(
    async (total: number, code: string) => {
      try {
        const result = await post('/promo_codes/apply', { code, total });
        // Suppose returns { newTotal, codeUsed }
        const { newTotal, codeUsed } = result;
        if (codeUsed) {
          // increment usage in local state
          setPromoCodes((prev) =>
            prev.map((p) =>
              p.code === codeUsed.code
                ? { ...p, currentUses: (p.currentUses || 0) + 1 }
                : p
            )
          );
          return newTotal;
        }
        return total;
      } catch {
        return total; // fallback if error
      }
    },
    [post]
  );

  const addPromoCode = useCallback(
    async (codeData: Partial<PromoCode>) => {
      setLoading(true);
      setError(null);
      try {
        const newCode = await post('/promo_codes', { promo_code: codeData });
        setPromoCodes((prev) => [...prev, newCode]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [post]
  );

  const updatePromoCode = useCallback(
    async (codeData: Partial<PromoCode>) => {
      if (!codeData.code) return;
      setLoading(true);
      setError(null);
      try {
        const updated = await patch(`/promo_codes/${codeData.code}`, {
          promo_code: codeData,
        });
        setPromoCodes((prev) =>
          prev.map((p) => (p.code === updated.code ? updated : p))
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [patch]
  );

  const deletePromoCode = useCallback(
    async (codeVal: string) => {
      setLoading(true);
      setError(null);
      try {
        await remove(`/promo_codes/${codeVal}`);
        setPromoCodes((prev) => prev.filter((p) => p.code !== codeVal));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [remove]
  );

  return {
    promoCodes,
    loading,
    error,
    fetchPromoCodes,
    validatePromoCode,
    applyDiscount,
    addPromoCode,
    updatePromoCode,
    deletePromoCode,
  };
}
