// test-websocket.js
const WebSocket = require('ws');

console.log('Test de connexion WebSocket...');

// Test de connexion simple
const ws = new WebSocket('ws://localhost:8080/?userId=test-user');

ws.on('open', () => {
  console.log('✅ Connexion WebSocket réussie !');
  
  // Envoyer un message test
  ws.send(JSON.stringify({
    type: 'TASK_CREATED',
    payload: { id: '1', title: 'Test task' }
  }));
  
  // Fermer après 2 secondes
  setTimeout(() => {
    ws.close();
  }, 2000);
});

ws.on('message', (data) => {
  console.log('📨 Message reçu:', data.toString());
});

ws.on('close', () => {
  console.log('🔌 Connexion fermée');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ Erreur WebSocket:', error);
  process.exit(1);
});

// Timeout après 10 secondes
setTimeout(() => {
  console.error('⏰ Timeout - pas de connexion');
  process.exit(1);
}, 10000);
