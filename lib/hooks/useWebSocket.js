// lib/hooks/useWebSocket.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '@/lib/websocket';

export const useWebSocket = (userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const handlersRef = useRef(new Map());

  useEffect(() => {
    if (!userId) return;

    const connect = async () => {
      try {
        await websocketService.connect(userId);
        setIsConnected(true);
      } catch (error) {
        console.error('Erreur de connexion WebSocket:', error);
        setIsConnected(false);
        // Ne pas afficher d'erreur à l'utilisateur pour le moment
      }
    };

    connect();

    // Écouter les messages
    const handleMessage = (data) => {
      setLastMessage(data);
      
      // Appeler les handlers spécifiques
      const type = data.type;
      if (handlersRef.current.has(type)) {
        handlersRef.current.get(type).forEach(handler => {
          handler(data.payload);
        });
      }
    };

    websocketService.on('message', handleMessage);

    // Nettoyage
    return () => {
      websocketService.off('message', handleMessage);
    };
  }, [userId]);

  // S'abonner à des événements spécifiques
  const subscribe = useCallback((type, handler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, []);
    }
    handlersRef.current.get(type).push(handler);

    // Retourner fonction de désabonnement
    return () => {
      if (handlersRef.current.has(type)) {
        const handlers = handlersRef.current.get(type);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, []);

  // Envoyer un message
  const send = useCallback((type, payload) => {
    websocketService.send(type, payload);
  }, []);

  // Déconnexion
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    lastMessage,
    subscribe,
    send,
    disconnect
  };
};
