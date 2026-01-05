// server/websocket-server.js
const WebSocket = require('ws');

class WebSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket connection
  }

  start() {
    try {
      // Créer le serveur WebSocket directement
      this.wss = new WebSocket.Server({ 
        port: this.port,
        path: '/'
      });

      this.wss.on('connection', (ws, request) => {
        console.log('Nouvelle connexion WebSocket reçue');
        
        // Extraire userId depuis l'URL
        let userId = null;
        try {
          const url = request.url || '';
          const urlParams = new URLSearchParams(url.split('?')[1] || '');
          userId = urlParams.get('userId');
        } catch (error) {
          console.error('Erreur parsing URL:', error);
        }
        
        if (!userId) {
          console.log('Connexion rejetée: userId manquant');
          ws.close(1008, 'UserId requis');
          return;
        }

        console.log(`Client connecté: ${userId}`);
        
        // Stocker la connexion
        this.clients.set(userId, ws);
        
        // Envoyer confirmation de connexion
        this.sendToClient(userId, 'USER_CONNECTED', { 
          message: 'Connecté avec succès',
          timestamp: new Date().toISOString()
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(userId, message);
          } catch (error) {
            console.error('Erreur parsing message:', error);
            this.sendToClient(userId, 'ERROR', { 
              message: 'Message invalide',
              timestamp: new Date().toISOString()
            });
          }
        });

        ws.on('close', () => {
          console.log(`Client déconnecté: ${userId}`);
          this.clients.delete(userId);
          
          // Notifier les autres clients si nécessaire
          this.broadcast('USER_DISCONNECTED', { 
            userId,
            timestamp: new Date().toISOString()
          }, userId);
        });

        ws.on('error', (error) => {
          console.error(`Erreur client ${userId}:`, error);
          this.clients.delete(userId);
        });
      });

      this.wss.on('error', (error) => {
        console.error('Erreur serveur WebSocket:', error);
      });

      console.log(`Serveur WebSocket démarré sur le port ${this.port}`);
      
    } catch (error) {
      console.error('Erreur démarrage serveur WebSocket:', error);
      throw error;
    }
  }

  handleMessage(senderId, message) {
    const { type, payload } = message;
    
    console.log(`Message reçu de ${senderId}:`, { type, payload });

    // Diffuser le message à tous les clients concernés
    switch (type) {
      case 'TASK_CREATED':
      case 'TASK_UPDATED':
      case 'TASK_DELETED':
      case 'TASK_COMPLETED':
      case 'GOAL_CREATED':
      case 'GOAL_UPDATED':
      case 'GOAL_DELETED':
      case 'GOAL_PROGRESS_UPDATED':
      case 'EXPENSE_CREATED':
      case 'EXPENSE_UPDATED':
      case 'EXPENSE_DELETED':
        // Diffuser à tous les clients (pour le moment)
        // En production, filtrer par utilisateur ou équipe
        this.broadcast(type, payload);
        break;
        
      default:
        console.warn(`Type de message non géré: ${type}`);
    }
  }

  sendToClient(userId, type, payload) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  }

  broadcast(type, payload, excludeUserId = null) {
    this.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({ type, payload }));
        } catch (error) {
          console.error(`Erreur envoi à ${userId}:`, error);
          this.clients.delete(userId);
        }
      }
    });
  }

  // Pour intégration avec ton backend existant
  broadcastToUser(userId, type, payload) {
    this.sendToClient(userId, type, payload);
  }

  // Arrêter le serveur
  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('Serveur WebSocket arrêté');
    }
  }
}

// Démarrer le serveur si exécuté directement
if (require.main === module) {
  const wsServer = new WebSocketServer(8080);
  wsServer.start();
  
  // Gérer l'arrêt propre
  process.on('SIGINT', () => {
    console.log('Arrêt du serveur WebSocket...');
    wsServer.stop();
    process.exit(0);
  });
}

module.exports = WebSocketServer;
