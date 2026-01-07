// app/dashboard/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { tasksService, goalsService, expensesService, debtsService, supabase } from '@/lib/supabase';
import { cachedTasksService, cachedGoalsService, cachedExpensesService, cachedDebtsService, cacheInvalidators } from '@/lib/cache';
import { websocketEventTypes, createWebSocketHandlers } from '@/lib/websocket-handlers';
import Link from 'next/link';
import { 
  Calendar, 
  Target, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export default function DashboardHome() {
  const { user } = useAuth();
  const { isConnected, subscribe, send } = useWebSocket(user?.id);
  const [stats, setStats] = useState({
    todayTasks: 0,
    completedTasks: 0,
    totalGoals: 0,
    completedGoals: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    todayIncomes: 0,
    monthIncomes: 0,
    totalDebts: 0,
    overdueDebts: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Initialisation...');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadUserName();
    }
  }, [user]);

  const loadUserName = async () => {
    if (!user?.id) return;
    
    try {
      // First try to get from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (userData && userData.name) {
        setUserName(userData.name);
      } else {
        // Fallback to metadata if no data in users table
        setUserName(user?.user_metadata?.name || '');
      }
    } catch (error) {
      // Fallback to metadata on error
      setUserName(user?.user_metadata?.name || '');
    }
  };

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');

      setLoadingStep('Chargement des tâches...');
      // Utilisation des services avec cache
      const monthTasks = await cachedTasksService.getTasks(user.id, monthStart, today);
      const todayTasks = monthTasks.filter(t => t.date === today);
      
      const completedToday = todayTasks.filter(t => t.completed).length;
      const totalToday = todayTasks.length;
      const pendingToday = monthTasks.filter(t => 
        new Date(t.date) < new Date(today) && !t.completed
      ).length;

      setLoadingStep('Chargement des objectifs...');
      // Charger les objectifs (avec cache)
      const goalsData = await cachedGoalsService.getGoals(user.id);
      const completedGoalsCount = goalsData.filter(g => g.completed).length;

      setLoadingStep('Chargement des transactions...');
      // Charger les dépenses (avec cache)
      const monthExpensesData = await cachedExpensesService.getExpenses(user.id, monthStart, today);
      const todayExpensesData = monthExpensesData.filter(e => e.date === today);
      
      // Séparer les dépenses et entrées
      const todayExpenses = todayExpensesData.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const todayIncomes = todayExpensesData.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const monthExpenses = monthExpensesData.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const monthIncomes = monthExpensesData.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

      setLoadingStep('Chargement des dettes...');
      // Charger les dettes (avec cache)
      const debtsData = await cachedDebtsService.getDebts(user.id);
      const totalDebts = debtsData.filter(d => d.type === 'owed').reduce((sum, d) => sum + parseFloat(d.amount), 0);
      const overdueDebts = debtsData.filter(d => d.type === 'owed' && d.status === 'pending' && new Date(d.due_date) < new Date()).length;

      setLoadingStep('Finalisation...');
      setStats({
        todayTasks: totalToday,
        completedTasks: completedToday,
        totalGoals: goalsData.length,
        completedGoals: completedGoalsCount,
        todayExpenses: todayExpenses,
        monthExpenses: monthExpenses,
        todayIncomes: todayIncomes,
        monthIncomes: monthIncomes,
        totalDebts: totalDebts,
        overdueDebts: overdueDebts
      });

      setRecentTasks(todayTasks.slice(0, 3));
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket handlers pour les mises à jour en temps réel du dashboard
  const updateStatsWithWebSocket = useCallback(() => {
    // Invalider le cache et recharger les stats
    if (user?.id) {
      cacheInvalidators.invalidateAll(user.id);
      loadDashboardData();
    }
  }, [user?.id]);

  // S'abonner aux événements WebSocket
  useEffect(() => {
    if (!isConnected || !user) return;

    const handlers = createWebSocketHandlers({
      // Pour les tâches
      addTask: updateStatsWithWebSocket,
      updateTask: updateStatsWithWebSocket,
      deleteTask: updateStatsWithWebSocket,
      // Pour les objectifs
      addGoal: updateStatsWithWebSocket,
      updateGoal: updateStatsWithWebSocket,
      deleteGoal: updateStatsWithWebSocket,
      // Pour les dépenses
      addExpense: updateStatsWithWebSocket,
      updateExpense: updateStatsWithWebSocket,
      deleteExpense: updateStatsWithWebSocket
    });

    // S'abonner à tous les événements pertinents
    const unsubscribeTaskCreated = subscribe(websocketEventTypes.TASK_CREATED, handlers[websocketEventTypes.TASK_CREATED]);
    const unsubscribeTaskUpdated = subscribe(websocketEventTypes.TASK_UPDATED, handlers[websocketEventTypes.TASK_UPDATED]);
    const unsubscribeTaskDeleted = subscribe(websocketEventTypes.TASK_DELETED, handlers[websocketEventTypes.TASK_DELETED]);
    const unsubscribeTaskCompleted = subscribe(websocketEventTypes.TASK_COMPLETED, handlers[websocketEventTypes.TASK_COMPLETED]);
    
    const unsubscribeGoalCreated = subscribe(websocketEventTypes.GOAL_CREATED, handlers[websocketEventTypes.GOAL_CREATED]);
    const unsubscribeGoalUpdated = subscribe(websocketEventTypes.GOAL_UPDATED, handlers[websocketEventTypes.GOAL_UPDATED]);
    const unsubscribeGoalDeleted = subscribe(websocketEventTypes.GOAL_DELETED, handlers[websocketEventTypes.GOAL_DELETED]);
    const unsubscribeGoalProgress = subscribe(websocketEventTypes.GOAL_PROGRESS_UPDATED, handlers[websocketEventTypes.GOAL_PROGRESS_UPDATED]);
    
    const unsubscribeExpenseCreated = subscribe(websocketEventTypes.EXPENSE_CREATED, handlers[websocketEventTypes.EXPENSE_CREATED]);
    const unsubscribeExpenseUpdated = subscribe(websocketEventTypes.EXPENSE_UPDATED, handlers[websocketEventTypes.EXPENSE_UPDATED]);
    const unsubscribeExpenseDeleted = subscribe(websocketEventTypes.EXPENSE_DELETED, handlers[websocketEventTypes.EXPENSE_DELETED]);

    return () => {
      unsubscribeTaskCreated?.();
      unsubscribeTaskUpdated?.();
      unsubscribeTaskDeleted?.();
      unsubscribeTaskCompleted?.();
      unsubscribeGoalCreated?.();
      unsubscribeGoalUpdated?.();
      unsubscribeGoalDeleted?.();
      unsubscribeGoalProgress?.();
      unsubscribeExpenseCreated?.();
      unsubscribeExpenseUpdated?.();
      unsubscribeExpenseDeleted?.();
    };
  }, [isConnected, user, subscribe, updateStatsWithWebSocket]);

  const quickActions = [
    {
      title: 'Ajouter une tâche',
      description: 'Planifiez votre journée',
      icon: Plus,
      href: '/dashboard/calendar',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Nouvel objectif',
      description: 'Définissez vos ambitions',
      icon: Target,
      href: '/dashboard/goals',
      color: 'from-blue-500 to-purple-500'
    },
    {
      title: 'Enregistrer une dépense',
      description: 'Suivez vos finances',
      icon: DollarSign,
      href: '/dashboard/expenses',
      color: 'from-green-500 to-blue-500'
    },
    {
      title: 'Bilan du jour',
      description: 'Analysez votre journée',
      icon: TrendingUp,
      href: '/dashboard/daily-review',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const taskCompletionRate = stats.todayTasks > 0 ? Math.round((stats.completedTasks / stats.todayTasks) * 100) : 0;
  const goalCompletionRate = stats.totalGoals > 0 ? Math.round((stats.completedGoals / stats.totalGoals) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{loadingStep}</p>
          <p className="text-gray-400 text-sm mt-2">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Bonjour, {userName || 'Utilisateur'} ! 👋
        </h1>
        <p className="text-gray-600">
          Voici un aperçu de votre productivité aujourd'hui
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Tâches du jour</span>
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.completedTasks}/{stats.todayTasks}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{taskCompletionRate}%</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Objectifs</span>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.completedGoals}/{stats.totalGoals}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${goalCompletionRate}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{goalCompletionRate}%</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Entrées jour</span>
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.todayIncomes.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">FCFA</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Dépenses jour</span>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.todayExpenses.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">FCFA</p>
        </div>
      </div>

      {/* Deuxième ligne de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Entrées mois</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.monthIncomes.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">FCFA</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Dépenses mois</span>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.monthExpenses.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">FCFA</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Total dettes</span>
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">
            {stats.totalDebts.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">FCFA</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm font-medium">Dettes en retard</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">
            {stats.overdueDebts}
          </p>
          <p className="text-xs text-gray-500 mt-2">dettes</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{action.description}</p>
              <div className="flex items-center text-purple-600 text-sm font-medium group-hover:text-purple-700">
                Accéder
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tâches récentes et navigation */}
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Tâches du jour */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-gray-800">Tâches d'aujourd'hui</h2>
            <Link
              href="/dashboard/calendar"
              className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-purple-100">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">Aucune tâche aujourd'hui</p>
                <Link
                  href="/dashboard/calendar"
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une tâche
                </Link>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                      task.completed
                        ? 'bg-green-50 border-green-200'
                        : task.blockage_reason
                        ? 'bg-orange-50 border-orange-200'
                        : task.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-purple-50 border-purple-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          task.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm sm:text-base ${
                          task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {task.time && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.time}
                            </span>
                          )}
                          {task.priority === 'high' && !task.completed && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              Haute
                            </span>
                          )}
                          {task.blockage_reason &&  (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                              Bloqué
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation rapide */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Explorer</h2>
          <div className="space-y-4">
            <Link
              href="/dashboard/reports"
              className="block bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">Rapports & Statistiques</h3>
                  <p className="text-sm text-gray-600">Analysez vos performances et tendances</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/dashboard/blockages"
              className="block bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">Gestion des blocages</h3>
                  <p className="text-sm text-gray-600">Identifiez et justifiez les obstacles</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                💡 Conseil du jour
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {taskCompletionRate >= 80 
                  ? "Excellent travail ! Vous maintenez un taux de complétion remarquable. Continuez ainsi ! 🎉"
                  : taskCompletionRate >= 50
                  ? "Bon progression ! Essayez de prioriser les tâches les plus importantes pour atteindre 80%."
                  : "Vous pouvez faire mieux ! Concentrez-vous sur 2-3 tâches essentielles aujourd'hui."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}