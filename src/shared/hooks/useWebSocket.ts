// src/shared/hooks/useWebSocket.ts

import { useEffect, useState, useCallback, useRef } from 'react';
import websocketService, { WebSocketCallbacks } from '../services/websocketService';
import { useAuthStore } from '../../ordering/store/authStore';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onNewOrder?: (order: any) => void;
  onOrderUpdated?: (order: any) => void;
  onLowStock?: (item: any) => void;
  onError?: (error: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseWebSocketResult {
  isConnected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketResult => {
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create a connect function that can be called from the component
  const connect = useCallback(() => {
    console.debug('[WebSocket] Attempting connection', {
      hasUser: !!user,
      restaurantId: user?.restaurant_id,
      isCleaningUp: isCleaningUp.current,
      isConnected: isConnected
    });

    if (!user?.restaurant_id) {
      const error = new Error('No restaurant ID available');
      console.error('[WebSocket] Connection failed:', error.message);
      setError(error);
      return;
    }

    const callbacks: WebSocketCallbacks = {
      onNewOrder: options.onNewOrder,
      onOrderUpdated: options.onOrderUpdated,
      onLowStock: options.onLowStock,
      onError: (err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        if (options.onError) options.onError(err);
      },
      onConnected: () => {
        setIsConnected(true);
        setError(null);
        if (options.onConnected) options.onConnected();
      },
      onDisconnected: () => {
        setIsConnected(false);
        if (options.onDisconnected) options.onDisconnected();
      }
    };

    websocketService.connect(user.restaurant_id, callbacks);
  }, [
    user?.restaurant_id,
    options.onNewOrder,
    options.onOrderUpdated,
    options.onLowStock,
    options.onError,
    options.onConnected,
    options.onDisconnected
  ]);

  // Create a disconnect function that can be called from the component
  const disconnect = useCallback((source: string = 'manual') => {
    if (isConnected) {
      console.debug('[WebSocket] Disconnecting', { source });
      websocketService.disconnect(source);
      setIsConnected(false);
    }
  }, [isConnected]);

  // Ref to track if we're in cleanup phase
  const isCleaningUp = useRef(false);

  // Connect to WebSocket when the component mounts if autoConnect is true
  useEffect(() => {
    // Skip if we're cleaning up
    if (isCleaningUp.current) {
      return;
    }

    let connectTimer: NodeJS.Timeout | null = null;

    // Only connect if we have a user with a restaurant_id and autoConnect is not explicitly false
    if (options.autoConnect !== false && user?.restaurant_id && !isConnected) {
      console.debug('[WebSocket] Connection criteria met', {
        autoConnect: options.autoConnect,
        restaurantId: user.restaurant_id,
        isConnected,
        userId: user.id,
        userRole: user.role
      });
      
      // Force a connection attempt immediately
      console.debug('[WebSocket] Initiating immediate connection');
      connect();
      
      // Add a retry mechanism in case the first attempt fails
      connectTimer = setTimeout(() => {
        if (!isCleaningUp.current && !isConnected) {
          console.debug('[WebSocket] First connection attempt failed, retrying...');
          connect();
        }
      }, 2000);
    } else {
      console.debug('[WebSocket] Connection criteria NOT met', {
        autoConnect: options.autoConnect,
        hasUser: !!user,
        hasRestaurantId: !!user?.restaurant_id,
        isConnected
      });
    }
    
    // Cleanup function
    return () => {
      isCleaningUp.current = true;
      if (connectTimer) {
        clearTimeout(connectTimer);
      }
      if (isConnected) {
        console.debug('[WebSocket] Cleaning up connection');
        disconnect('cleanup');
      }
    };
  }, [connect, disconnect, options.autoConnect, user?.restaurant_id]);

  return {
    isConnected,
    error,
    connect,
    disconnect
  };
};

export default useWebSocket;