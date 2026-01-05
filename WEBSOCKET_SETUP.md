# WebSocket Implementation Guide

## 🚀 Installation et Configuration

### 1. Installer les dépendances
```bash
npm install
```

### 2. Démarrer l'application complète
```bash
npm run dev:full
```
Cela démarrera simultanément :
- Le serveur WebSocket sur le port 8080
- L'application Next.js sur le port 3000

### 3. Démarrage séparé (optionnel)
```bash
# Terminal 1: Serveur WebSocket
npm run ws:server

# Terminal 2: Application Next.js
npm run dev
```

## 📡 Fonctionnalités WebSocket

### Événements supportés :

#### Tâches
- `TASK_CREATED` - Nouvelle tâche créée
- `TASK_UPDATED` - Tâche modifiée
- `TASK_DELETED` - Tâche supprimée
- `TASK_COMPLETED` - Tâche marquée comme complétée

#### Objectifs
- `GOAL_CREATED` - Nouvel objectif créé
- `GOAL_UPDATED` - Objectif modifié
- `GOAL_DELETED` - Objectif supprimé
- `GOAL_PROGRESS_UPDATED` - Progression d'objectif mise à jour

#### Dépenses
- `EXPENSE_CREATED` - Nouvelle dépense ajoutée
- `EXPENSE_UPDATED` - Dépense modifiée
- `EXPENSE_DELETED` - Dépense supprimée

#### Système
- `USER_CONNECTED` - Utilisateur connecté
- `USER_DISCONNECTED` - Utilisateur déconnecté
- `ERROR` - Erreur système

## 🔧 Utilisation dans les composants

### Hook WebSocket
```javascript
import { useWebSocket } from '@/lib/hooks/useWebSocket';

const MyComponent = () => {
  const { isConnected, subscribe, send } = useWebSocket(user?.id);
  
  // S'abonner aux événements
  useEffect(() => {
    if (!isConnected) return;
    
    const unsubscribe = subscribe('TASK_CREATED', (task) => {
      console.log('Nouvelle tâche:', task);
    });
    
    return unsubscribe;
  }, [isConnected, subscribe]);
  
  // Envoyer un événement
  const handleCreateTask = (taskData) => {
    send('TASK_CREATED', taskData);
  };
};
```

### Gestionnaires d'événements
```javascript
import { createWebSocketHandlers } from '@/lib/websocket-handlers';

const handlers = createWebSocketHandlers({
  addTask: (task) => setTasks(prev => [...prev, task]),
  updateTask: (task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t)),
  deleteTask: (taskId) => setTasks(prev => prev.filter(t => t.id !== taskId))
});
```

## ⚡ Performance

### Avantages :
- **Latence réduite** : ~50ms vs ~500ms (HTTP)
- **Mises à jour en temps réel** : Pas besoin de recharger
- **Charge serveur réduite** : Moins de requêtes répétitives
- **Meilleure UX** : Interface toujours synchronisée

### Gestion de la connexion :
- Reconnexion automatique en cas de déconnexion
- Gestion des erreurs avec messages utilisateurs
- État de connexion visible dans l'interface

## 🔒 Sécurité

### En production :
- Utiliser `wss://` (WebSocket sécurisé) au lieu de `ws://`
- Authentification via userId dans l'URL
- Filtrage des messages par utilisateur/équipe

### Configuration production :
```javascript
// Dans lib/websocket.js
const wsUrl = process.env.NODE_ENV === 'production' 
  ? `wss://ton-domaine.com/ws?userId=${userId}`
  : `ws://localhost:8080?userId=${userId}`;
```

## 🐛 Débogage

### Logs serveur :
Le serveur WebSocket log toutes les connexions et messages :
```bash
Serveur WebSocket démarré sur le port 8080
Client connecté: user123
Message reçu de user123: { type: 'TASK_CREATED', payload: {...} }
Client déconnecté: user123
```

### Logs client :
Active les logs dans la console du navigateur pour le débogage WebSocket.

## 📈 Monitoring

### Métriques à surveiller :
- Nombre de connexions simultanées
- Latence des messages
- Taux de reconnexion
- Volume de messages par seconde

### Outils recommandés :
- WebSocket Inspector (Chrome DevTools)
- Custom monitoring dashboard
- Logs structurés avec timestamps

## 🔄 Mises à jour futures

### Améliorations possibles :
- Salons/rooms pour les équipes
- Persistance des messages
- Compression des messages
- Load balancing pour scaling horizontal
- Intégration avec Redis pour multi-serveurs

---

**Note** : Cette implémentation est un point de départ. Pour la production, ajoutez :
- Gestion des erreurs avancée
- Monitoring et métriques
- Tests automatisés
- Documentation API complète
