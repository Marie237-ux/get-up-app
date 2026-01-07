// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions pour les opérations courantes

// ============= PROFILES =============
export const profilesService = {
  // Créer ou mettre à jour le profil utilisateur
  async upsertProfile(userId, profileData) {
    const { data, error } = await supabase.auth.updateUser({
      data: profileData
    });
    
    if (error) throw error;
    return data;
  },

  // Récupérer le profil utilisateur depuis les métadonnées
  async getUserProfile(userId) {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    if (!user) throw new Error('Utilisateur non trouvé');

    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || '',
      created_at: user.created_at
    };
  },

  // Créer un profil dans la table users (fallback si RPC disponible)
  async createProfileInTable(userId, email, name, phone) {
    try {
      const { data, error } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email,
        user_name: name,
        user_phone: phone
      });

      if (error) {
        console.error('RPC non disponible, utilisation des métadonnées uniquement');
        return null;
      }

      return data;
    } catch (rpcError) {
      console.error('Erreur RPC, utilisation des métadonnées uniquement');
      return null;
    }
  }
};

// ============= AUTH =============
export const authService = {
  // Inscription
  async signUp(email, password, name, phone = null) {
    // 1. Créer l'utilisateur dans auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          phone: phone
        }
      }
    });

    if (authError) throw authError;

    // 2. Essayer de créer le profil dans la table (si RPC disponible)
    if (authData.user) {
      try {
        await profilesService.createProfileInTable(
          authData.user.id,
          email,
          name,
          phone
        );
      } catch (error) {
        console.log('Profil créé uniquement dans les métadonnées auth');
      }
    }

    return authData;
  },

  // Connexion
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Gérer les erreurs spécifiques
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.');
      } else if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email ou mot de passe incorrect');
      } else {
        throw error; // Conserver le message d'erreur original
      }
    }
    
    return data;
  },

  // Déconnexion
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Obtenir utilisateur connecté
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
};

// ============= TASKS =============
export const tasksService = {
  // Récupérer toutes les tâches d'un utilisateur
  async getTasks(userId, startDate, endDate) {
    let query = supabase
      .from('tasks')
      .select('id, title, date, time, completed, priority, blockage_reason, user_id')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Récupérer tâches d'une date spécifique
  async getTasksByDate(userId, date) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, date, time, completed, priority, blockage_reason, user_id')
      .eq('user_id', userId)
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Créer une tâche
  async createTask(taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour une tâche
  async updateTask(taskId, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer une tâche
  async deleteTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  // Marquer comme complétée
  async toggleComplete(taskId, completed) {
    return this.updateTask(taskId, { completed });
  },

  // Ajouter un blocage
  async addBlockage(taskId, reason) {
    return this.updateTask(taskId, { blockage_reason: reason });
  },
};

// ============= GOALS =============
export const goalsService = {
  // Récupérer tous les objectifs
  async getGoals(userId) {
    const { data, error } = await supabase
      .from('goals')
      .select('id, title, description, completed, progress, user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Créer un objectif
  async createGoal(goalData) {
    const { data, error } = await supabase
      .from('goals')
      .insert([goalData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour un objectif
  async updateGoal(goalId, updates) {
    const { data, error } = await supabase
      .from('goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer un objectif
  async deleteGoal(goalId) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  },

  // Mettre à jour la progression
  async updateProgress(goalId, progress) {
    return this.updateGoal(goalId, { progress });
  },
};

// ============= EXPENSES =============
export const expensesService = {
  // Récupérer les transactions (dépenses et entrées)
  async getExpenses(userId, startDate, endDate) {
    let query = supabase
      .from('expenses')
      .select('id, amount, type, date, user_id, created_at, category, description, payment_method')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Récupérer les transactions par date
  async getExpensesByDate(userId, date) {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, type, date, user_id, created_at, category, description, payment_method')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer les entrées uniquement
  async getIncomes(userId, startDate, endDate) {
    let query = supabase
      .from('expenses')
      .select('id, amount, type, date, user_id, created_at, category, description, payment_method')
      .eq('user_id', userId)
      .eq('type', 'income')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Récupérer les dépenses uniquement
  async getExpensesOnly(userId, startDate, endDate) {
    let query = supabase
      .from('expenses')
      .select('id, amount, type, date, user_id, created_at, category, description, payment_method')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Créer une transaction (dépense ou entrée)
  async createExpense(expenseData) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expenseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour une dépense
  async updateExpense(expenseId, updates) {
    const { data, error } = await supabase
      .from('expenses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer une dépense
  async deleteExpense(expenseId) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  // Statistiques des dépenses
  async getExpenseStats(userId, startDate, endDate) {
    const { data, error } = await supabase
      .rpc('get_expense_stats', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) throw error;
    return data;
  },
};

// ============= DEBTS =============
export const debtsService = {
  // Récupérer toutes les dettes
  async getDebts(userId) {
    const { data, error } = await supabase
      .from('debts')
      .select('id, amount, type, status, due_date, user_id, created_at, title, description, creditor_debtor, category, priority, amount_paid')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer les dettes par statut
  async getDebtsByStatus(userId, status) {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Récupérer les dettes en retard
  async getOverdueDebts(userId) {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Créer une dette
  async createDebt(debtData) {
    const { data, error } = await supabase
      .from('debts')
      .insert([debtData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour une dette
  async updateDebt(debtId, updates) {
    const { data, error } = await supabase
      .from('debts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', debtId)
      .eq('user_id', updates.user_id) // Sécurité: l'utilisateur ne peut modifier que ses propres dettes
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Ajouter un paiement partiel
  async addPayment(debtId, amount) {
    // D'abord récupérer la dette actuelle
    const { data: currentDebt } = await supabase
      .from('debts')
      .select('amount, amount_paid, status, user_id')
      .eq('id', debtId)
      .single();

    if (currentDebt.error) throw currentDebt.error;

    const newAmountPaid = (currentDebt.amount_paid || 0) + amount;
    const newStatus = newAmountPaid >= currentDebt.amount ? 'paid' : 'partial';

    const { data, error } = await supabase
      .from('debts')
      .update({
        amount_paid: newAmountPaid,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer une dette
  async deleteDebt(debtId) {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', debtId);

    if (error) throw error;
  },

  // Statistiques des dettes
  async getDebtStats(userId) {
    const { data, error } = await supabase
      .rpc('get_debt_stats', {
        p_user_id: userId
      });

    if (error) throw error;
    return data;
  },
};

// ============= PAYMENTS =============
export const paymentsService = {
  // Récupérer tous les paiements d'une dette
  async getPaymentsByDebt(debtId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Créer un paiement
  async createPayment(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour un paiement
  async updatePayment(paymentId, updates) {
    const { data, error } = await supabase
      .from('payments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer un paiement
  async deletePayment(paymentId) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
  },

  // Supprimer tous les paiements d'une dette
  async deletePaymentsByDebt(debtId) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('debt_id', debtId);

    if (error) throw error;
  },
};

// ============= DAILY REVIEWS =============
export const reviewsService = {
  // Récupérer le bilan d'une date
  async getReview(userId, date) {
    const { data, error } = await supabase
      .from('daily_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Créer ou mettre à jour un bilan
  async upsertReview(reviewData) {
    const { data, error } = await supabase
      .from('daily_reviews')
      .upsert([reviewData], { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============= USER ROLES =============
export const userRolesService = {
  // Récupérer le rôle d'un utilisateur
  async getUserRole(userId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, status')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Assigner un rôle à un utilisateur
  async assignRole(userId, role, assignedBy = null, userEmail = null, userName = null) {
    const { data, error } = await supabase
      .from('user_roles')
      .upsert([{
        user_id: userId,
        role: role,
        status: 'active',
        email: userEmail,
        name: userName,
        assigned_by: assignedBy,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour les informations utilisateur dans user_roles
  async updateUserInfo(userId, email = null, name = null) {
    const { data, error } = await supabase
      .from('user_roles')
      .update({
        email: email,
        name: name,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Synchroniser les informations utilisateur depuis auth vers user_roles
  async syncUserInfo(userId) {
    try {
      // Récupérer les informations depuis auth
      const { data: { user }, error: authError } = await supabase.auth.getUser(userId);
      
      if (authError) throw authError;
      if (!user) throw new Error('Utilisateur non trouvé');

      // Mettre à jour la table user_roles
      return await this.updateUserInfo(
        userId,
        user.email,
        user.user_metadata?.name
      );
    } catch (error) {
      console.error('Erreur synchronisation utilisateur:', error);
      throw error;
    }
  },

  // Suspendre/réactiver un utilisateur
  async updateUserStatus(userId, status, updatedBy = null) {
    const { data, error } = await supabase
      .from('user_roles')
      .update({
        status: status,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Récupérer tous les utilisateurs avec leurs rôles (pour admin)
  async getAllUsers() {
    try {
      // Récupérer tous les rôles utilisateurs avec nom et email
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Transformer les données et synchroniser si nécessaire
      const users = await Promise.all(rolesData.map(async (role) => {
        let userInfo = {
          user_id: role.user_id,
          role: role.role,
          status: role.status,
          created_at: role.created_at,
          updated_at: role.updated_at,
          email: role.email,
          name: role.name,
          raw_user_meta_data: null
        };

        // Si email ou name manquant, essayer de synchroniser
        if (!role.email || !role.name) {
          try {
            const { data: { user }, error: authError } = await supabase.auth.getUser(role.user_id);
            
            if (!authError && user) {
              // Mettre à jour la base de données
              await this.updateUserInfo(
                role.user_id,
                user.email,
                user.user_metadata?.name
              );
              
              // Mettre à jour les infos locales
              userInfo.email = user.email;
              userInfo.name = user.user_metadata?.name;
            }
          } catch (syncError) {
            console.warn(`Impossible de synchroniser l'utilisateur ${role.user_id}:`, syncError);
          }
        }

        // Utiliser les valeurs par défaut si toujours manquantes
        if (!userInfo.email) userInfo.email = 'Email non disponible';
        if (!userInfo.name) userInfo.name = 'Nom non disponible';

        return userInfo;
      }));

      return users;
    } catch (error) {
      console.error('Erreur dans getAllUsers:', error);
      throw error;
    }
  },

  // Vérifier si un utilisateur est admin
  async isAdmin(userId) {
    const role = await this.getUserRole(userId);
    return role?.role === 'admin' && role?.status === 'active';
  },

  // Vérifier si un utilisateur est actif
  async isUserActive(userId) {
    const role = await this.getUserRole(userId);
    return role?.status === 'active';
  }
};

// ============= STATS =============
export const statsService = {
  // Statistiques générales
  async getGeneralStats(userId, startDate, endDate) {
    const tasks = await tasksService.getTasks(userId, startDate, endDate);
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const completedHighPriority = tasks.filter(
      t => t.priority === 'high' && t.completed
    ).length;
    const withBlockage = tasks.filter(t => t.blockage_reason).length;

    return {
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      highPriority,
      completedHighPriority,
      highPriorityRate: highPriority > 0 ? (completedHighPriority / highPriority) * 100 : 0,
      withBlockage,
    };
  },

  // Progrès vers les objectifs
  async getGoalsProgress(userId) {
    const goals = await goalsService.getGoals(userId);
    
    const total = goals.length;
    const completed = goals.filter(g => g.completed).length;
    const avgProgress = total > 0 
      ? goals.reduce((sum, g) => sum + g.progress, 0) / total 
      : 0;

    return {
      total,
      completed,
      inProgress: total - completed,
      avgProgress,
    };
  },
};