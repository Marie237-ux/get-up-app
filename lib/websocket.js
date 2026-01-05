// lib/websocket.js
class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(userId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Pour le développement, utilise ws://localhost:8080
        // En production, utilise wss://ton-domaine.com
        const wsUrl = process.env.NODE_ENV === 'production' 
          ? `wss://ton-domaine.com?userId=${userId}`
          : `ws://localhost:8080/?userId=${userId}`;

        console.log('Tentative de connexion WebSocket vers:', wsUrl);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connecté avec succès');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Erreur parsing message WebSocket:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket déconnecté, code:', event.code, 'raison:', event.reason);
          this.socket = null;
          
          // Ne pas tenter de reconnexion si c'est une fermeture normale
          if (event.code !== 1000) {
            this.attemptReconnect(userId);
          }
        };

        this.socket.onerror = (event) => {
          console.error('WebSocket error event:', event);
          // Ne pas rejeter ici, laisser onclose gérer
        };

      } catch (error) {
        console.error('Erreur création WebSocket:', error);
        reject(error);
      }
    });
  }

  attemptReconnect(userId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(userId);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  handleMessage(data) {
    const { type, payload } = data;
    const handlers = this.listeners.get(type) || [];
    handlers.forEach(handler => handler(payload));
  }

  // S'abonner à des événements spécifiques
  on(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  // Se désabonner
  off(type, handler) {
    if (this.listeners.has(type)) {
      const handlers = this.listeners.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Envoyer un message
  send(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket non connecté');
    }
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Vérifier si connecté
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
