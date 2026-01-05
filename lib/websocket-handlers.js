// lib/websocket-handlers.js
export const websocketEventTypes = {
  // Tâches
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  
  // Objectifs
  GOAL_CREATED: 'GOAL_CREATED',
  GOAL_UPDATED: 'GOAL_UPDATED',
  GOAL_DELETED: 'GOAL_DELETED',
  GOAL_PROGRESS_UPDATED: 'GOAL_PROGRESS_UPDATED',
  
  // Dépenses
  EXPENSE_CREATED: 'EXPENSE_CREATED',
  EXPENSE_UPDATED: 'EXPENSE_UPDATED',
  EXPENSE_DELETED: 'EXPENSE_DELETED',
  
  // Système
  USER_CONNECTED: 'USER_CONNECTED',
  USER_DISCONNECTED: 'USER_DISCONNECTED',
  ERROR: 'ERROR'
};

// Gestionnaires d'événements pour les mises à jour en temps réel
export const createWebSocketHandlers = (updateFunctions) => {
  return {
    // Handlers pour les tâches
    [websocketEventTypes.TASK_CREATED]: (task) => {
      if (updateFunctions.addTask) {
        updateFunctions.addTask(task);
      }
    },
    
    [websocketEventTypes.TASK_UPDATED]: (task) => {
      if (updateFunctions.updateTask) {
        updateFunctions.updateTask(task);
      }
    },
    
    [websocketEventTypes.TASK_DELETED]: (taskId) => {
      if (updateFunctions.deleteTask) {
        updateFunctions.deleteTask(taskId);
      }
    },
    
    [websocketEventTypes.TASK_COMPLETED]: (task) => {
      if (updateFunctions.updateTask) {
        updateFunctions.updateTask(task);
      }
    },
    
    // Handlers pour les objectifs
    [websocketEventTypes.GOAL_CREATED]: (goal) => {
      if (updateFunctions.addGoal) {
        updateFunctions.addGoal(goal);
      }
    },
    
    [websocketEventTypes.GOAL_UPDATED]: (goal) => {
      if (updateFunctions.updateGoal) {
        updateFunctions.updateGoal(goal);
      }
    },
    
    [websocketEventTypes.GOAL_DELETED]: (goalId) => {
      if (updateFunctions.deleteGoal) {
        updateFunctions.deleteGoal(goalId);
      }
    },
    
    [websocketEventTypes.GOAL_PROGRESS_UPDATED]: (goal) => {
      if (updateFunctions.updateGoal) {
        updateFunctions.updateGoal(goal);
      }
    },
    
    // Handlers pour les dépenses
    [websocketEventTypes.EXPENSE_CREATED]: (expense) => {
      if (updateFunctions.addExpense) {
        updateFunctions.addExpense(expense);
      }
    },
    
    [websocketEventTypes.EXPENSE_UPDATED]: (expense) => {
      if (updateFunctions.updateExpense) {
        updateFunctions.updateExpense(expense);
      }
    },
    
    [websocketEventTypes.EXPENSE_DELETED]: (expenseId) => {
      if (updateFunctions.deleteExpense) {
        updateFunctions.deleteExpense(expenseId);
      }
    }
  };
};
