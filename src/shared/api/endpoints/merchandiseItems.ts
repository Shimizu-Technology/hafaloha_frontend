import { api } from '../../../ordering/lib/api';
import { MerchandiseItem, MerchandiseVariant } from '../../../ordering/store/merchandiseStore';

export const fetchMerchandiseItems = async (params: { collection_id?: number }): Promise<MerchandiseItem[]> => {
  const queryParams = new URLSearchParams();
  if (params.collection_id) {
    queryParams.append('collection_id', params.collection_id.toString());
  }
  
  const url = `/merchandise_items?${queryParams.toString()}`;
  return api.get<MerchandiseItem[]>(url);
};

export const createMerchandiseItem = async (item: Omit<MerchandiseItem, 'id'>): Promise<MerchandiseItem> => {
  const payload = {
    merchandise_item: item
  };
  return api.post<MerchandiseItem>('/merchandise_items', payload);
};

export const updateMerchandiseItem = async (
  id: number,
  data: Partial<MerchandiseItem>
): Promise<MerchandiseItem> => {
  const payload = {
    merchandise_item: data
  };
  return api.patch<MerchandiseItem>(`/merchandise_items/${id}`, payload);
};

export const deleteMerchandiseItem = async (id: number): Promise<void> => {
  return api.delete(`/merchandise_items/${id}`);
};

export const batchCreateVariants = async (
  itemId: number,
  variants: Omit<MerchandiseVariant, 'id' | 'merchandise_item_id'>[]
): Promise<MerchandiseVariant[]> => {
  const payload = {
    merchandise_item_id: itemId,
    variants: variants
  };
  return api.post<MerchandiseVariant[]>(`/merchandise_items/${itemId}/batch_create_variants`, payload);
};
