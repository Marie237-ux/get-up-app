// lib/cache.js
// Système de cache simple pour améliorer les performances

class Cache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes par défaut
  }

  set(key, value, customTTL = null) {
    const ttl = customTTL || this.defaultTTL;
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  // Nettoyer les entrées expirées
  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }
}

export const cache = new Cache();

// Nettoyer le cache toutes les 30 secondes
setInterval(() => cache.cleanup(), 30000);

// Wrapper pour les fonctions async avec cache
export function withCache(fn, keyGenerator, ttl = null) {
  return async (...args) => {
    const key = keyGenerator(...args);
    
    // Vérifier le cache
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Exécuter la fonction et mettre en cache
    try {
      const result = await fn(...args);
      cache.set(key, result, ttl);
      return result;
    } catch (error) {
      // Ne pas mettre en cache en cas d'erreur
      throw error;
    }
  };
}

// Fonctions de cache spécifiques pour les services
export const cachedTasksService = {
  getTasks: withCache(
    (userId, startDate, endDate) => {
      // Import dynamique pour éviter les imports circulaires
      return import('./supabase.js').then(({ tasksService }) => 
        tasksService.getTasks(userId, startDate, endDate)
      );
    },
    (userId, startDate, endDate) => `tasks:${userId}:${startDate || 'all'}:${endDate || 'all'}`,
    2 * 60 * 1000 // 2 minutes pour les tâches
  ),

  getTasksByDate: withCache(
    (userId, date) => {
      return import('./supabase.js').then(({ tasksService }) => 
        tasksService.getTasksByDate(userId, date)
      );
    },
    (userId, date) => `tasks_date:${userId}:${date}`,
    2 * 60 * 1000
  )
};

export const cachedGoalsService = {
  getGoals: withCache(
    (userId) => {
      return import('./supabase.js').then(({ goalsService }) => 
        goalsService.getGoals(userId)
      );
    },
    (userId) => `goals:${userId}`,
    5 * 60 * 1000 // 5 minutes pour les objectifs
  )
};

export const cachedExpensesService = {
  getExpenses: withCache(
    (userId, startDate, endDate) => {
      return import('./supabase.js').then(({ expensesService }) => 
        expensesService.getExpenses(userId, startDate, endDate)
      );
    },
    (userId, startDate, endDate) => `expenses:${userId}:${startDate || 'all'}:${endDate || 'all'}`,
    3 * 60 * 1000 // 3 minutes pour les dépenses
  ),

  getExpensesByDate: withCache(
    (userId, date) => {
      return import('./supabase.js').then(({ expensesService }) => 
        expensesService.getExpensesByDate(userId, date)
      );
    },
    (userId, date) => `expenses_date:${userId}:${date}`,
    3 * 60 * 1000
  )
};

export const cachedDebtsService = {
  getDebts: withCache(
    (userId) => {
      return import('./supabase.js').then(({ debtsService }) => 
        debtsService.getDebts(userId)
      );
    },
    (userId) => `debts:${userId}`,
    5 * 60 * 1000 // 5 minutes pour les dettes
  )
};

// Fonction pour invalider le cache quand les données changent
export function invalidateCache(pattern) {
  for (const key of cache.cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// Invalidateurs spécifiques
export const cacheInvalidators = {
  invalidateTasks: (userId) => invalidateCache(`tasks:${userId}`),
  invalidateGoals: (userId) => invalidateCache(`goals:${userId}`),
  invalidateExpenses: (userId) => invalidateCache(`expenses:${userId}`),
  invalidateDebts: (userId) => invalidateCache(`debts:${userId}`),
  invalidateAll: (userId) => {
    invalidateCache(userId.toString());
  }
};
