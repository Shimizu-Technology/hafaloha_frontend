import { create } from 'zustand';
import toast from 'react-hot-toast';

interface NotificationStore {
  playSound: boolean;
  toggleSound: () => void;
  notifyOrderStatus: (orderId: string, status: string) => void;
  notifyNewOrder: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  playSound: true,
  toggleSound: () => set(state => ({ playSound: !state.playSound })),
  notifyOrderStatus: (orderId: string, status: string) => {
    const messages = {
      pending: 'Order received',
      preparing: 'Your order is being prepared',
      ready: 'Your order is ready for pickup!',
      completed: 'Order completed',
      cancelled: 'Order cancelled'
    };
    
    toast(messages[status as keyof typeof messages], {
      icon: status === 'ready' ? '🔔' : undefined,
      duration: status === 'ready' ? 10000 : 5000
    });
  },
  notifyNewOrder: () => {
    if (get().playSound) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    }
    toast('New order received!', {
      icon: '🔔',
      duration: 5000
    });
  }
}));