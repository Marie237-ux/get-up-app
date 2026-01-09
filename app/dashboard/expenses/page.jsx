// app/dashboard/expenses/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { expensesService } from '@/lib/supabase';
import { websocketEventTypes, createWebSocketHandlers } from '@/lib/websocket-handlers';
import { DollarSign, Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon, CheckCircle, Edit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function ExpensesPage() {
  const { user } = useAuth();
  const { isConnected, subscribe, send } = useWebSocket(user?.id);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenses, setExpenses] = useState([]);
  const [dayExpenses, setDayExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // day, month, year
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  const [newExpense, setNewExpense] = useState({
    type: 'expense', // expense ou income
    amount: '',
    category: 'alimentation',
    description: '',
    payment_method: 'especes'
  });

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user, selectedDate, viewMode, filterCategory, filterType]);

  const loadExpenses = async () => {
    try {
      let startDate, endDate;
      let data;
      
      if (viewMode === 'day') {
        startDate = endDate = selectedDate.toLocaleDateString('en-CA');
        data = await expensesService.getExpensesByDate(user.id, startDate);
        data = data || [];
      } else if (viewMode === 'month') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toLocaleDateString('en-CA');
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toLocaleDateString('en-CA');
        data = await expensesService.getExpenses(user.id, startDate, endDate);
        data = data || [];
      } else if (viewMode === 'year') {
        startDate = new Date(selectedDate.getFullYear(), 0, 1).toLocaleDateString('en-CA');
        endDate = new Date(selectedDate.getFullYear(), 11, 31).toLocaleDateString('en-CA');
        data = await expensesService.getExpenses(user.id, startDate, endDate);
        data = data || [];
      }

      // Appliquer les filtres
      let filteredData = data.filter(expense => {
        // Filtrer par catégorie
        if (filterCategory !== 'all' && expense.category !== filterCategory) return false;
        
        // Filtrer par type
        if (filterType !== 'all' && expense.type !== filterType) return false;
        
        return true;
      });

      if (viewMode === 'day') {
        setDayExpenses(filteredData);
      } else {
        setExpenses(filteredData);
      }
    } catch (err) {
      console.error('Erreur chargement dépenses:', err);
    }
  };

  const addExpense = async () => {
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    
    setLoading(true);
    try {
      const expenseData = {
        user_id: user.id,
        type: newExpense.type, // expense ou income
        date: selectedDate.toISOString().split('T')[0],
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description.trim() || null,
        payment_method: newExpense.payment_method
      };

      await expensesService.createExpense(expenseData);
      await loadExpenses();
      
      setNewExpense({ 
        type: 'expense',
        amount: '', 
        category: 'alimentation', 
        description: '', 
        payment_method: 'especes' 
      });
      setShowAddExpense(false);
      setSuccessMessage('Transaction ajoutée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur ajout dépense:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    setShowConfirmDelete(expenseId);
  };

  const confirmDelete = async (expenseId) => {
    try {
      await expensesService.deleteExpense(expenseId);
      await loadExpenses();
      setShowConfirmDelete(null);
      setSuccessMessage('Transaction supprimée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const startEditExpense = (expense) => {
    setEditingExpense(expense);
    setNewExpense({
      type: expense.type,
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || '',
      payment_method: expense.payment_method
    });
    setShowAddExpense(true);
  };

  const updateExpense = async () => {
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    
    setLoading(true);
    try {
      const expenseData = {
        type: newExpense.type,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description.trim() || null,
        payment_method: newExpense.payment_method
      };

      await expensesService.updateExpense(editingExpense.id, expenseData);
      await loadExpenses();
      
      setNewExpense({ 
        type: 'expense',
        amount: '', 
        category: 'alimentation', 
        description: '', 
        payment_method: 'especes' 
      });
      setEditingExpense(null);
      setShowAddExpense(false);
      setSuccessMessage('Transaction modifiée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur modification:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setNewExpense({ 
      type: 'expense',
      amount: '', 
      category: 'alimentation', 
      description: '', 
      payment_method: 'especes' 
    });
    setEditingExpense(null);
    setShowAddExpense(false);
  };

  const changeDate = (amount) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + amount);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + amount);
    } else if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + amount);
    }
    setSelectedDate(newDate);
  };

  const categories = [
    { value: 'alimentation', label: 'Alimentation', icon: '🍔', color: '#ef4444' },
    { value: 'transport', label: 'Transport', icon: '🚗', color: '#3b82f6' },
    { value: 'logement', label: 'Logement', icon: '🏠', color: '#8b5cf6' },
    { value: 'sante', label: 'Santé', icon: '⚕️', color: '#10b981' },
    { value: 'loisirs', label: 'Loisirs', icon: '🎮', color: '#f59e0b' },
    { value: 'education', label: 'Éducation', icon: '📚', color: '#6366f1' },
    { value: 'vetements', label: 'Vêtements', icon: '👕', color: '#ec4899' },
    { value: 'autre', label: 'Autre', icon: '💰', color: '#6b7280' }
  ];

  const paymentMethods = [
    { value: 'especes', label: 'Espèces', icon: '💵' },
    { value: 'carte', label: 'Carte bancaire', icon: '💳' },
    { value: 'mobile', label: 'Paiement mobile', icon: '📱' },
    { value: 'virement', label: 'Virement', icon: '🏦' }
  ];

  const getCategoryInfo = (cat) => categories.find(c => c.value === cat) || categories[categories.length - 1];
  const getPaymentInfo = (pm) => paymentMethods.find(p => p.value === pm) || paymentMethods[0];

  // Statistiques
  const currentExpenses = viewMode === 'day' ? dayExpenses : expenses;
  const expensesOnly = currentExpenses.filter(e => e.type === 'expense');
  const incomesOnly = currentExpenses.filter(e => e.type === 'income');
  
  const totalExpenses = expensesOnly.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncomes = incomesOnly.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const netAmount = totalIncomes - totalExpenses;
  
  const expensesByCategory = categories.map(cat => {
    const categoryExpenses = currentExpenses
      .filter(e => e.category === cat.value && e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const categoryIncomes = currentExpenses
      .filter(e => e.category === cat.value && e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    return {
      name: cat.label,
      expenses: categoryExpenses,
      incomes: categoryIncomes,
      net: categoryIncomes - categoryExpenses,
      total: categoryExpenses + categoryIncomes,
      color: cat.color,
      icon: cat.icon
    };
  }).filter(c => c.total > 0);

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // WebSocket handlers pour les mises à jour en temps réel
  const updateExpenseInList = useCallback((expense) => {
    // Vérifier si la dépense appartient à la période courante
    const expenseDate = new Date(expense.date);
    const isInCurrentPeriod = viewMode === 'day' 
      ? expenseDate.toDateString() === selectedDate.toDateString()
      : (expenseDate.getMonth() === selectedDate.getMonth() && 
         expenseDate.getFullYear() === selectedDate.getFullYear());

    if (isInCurrentPeriod) {
      if (viewMode === 'day') {
        setDayExpenses(prev => {
          const exists = prev.find(e => e.id === expense.id);
          if (exists) {
            return prev.map(e => e.id === expense.id ? expense : e);
          } else {
            return [...prev, expense];
          }
        });
      } else {
        setExpenses(prev => {
          const exists = prev.find(e => e.id === expense.id);
          if (exists) {
            return prev.map(e => e.id === expense.id ? expense : e);
          } else {
            return [...prev, expense];
          }
        });
      }
    }
  }, [viewMode, selectedDate]);

  const removeExpenseFromList = useCallback((expenseId) => {
    if (viewMode === 'day') {
      setDayExpenses(prev => prev.filter(e => e.id !== expenseId));
    } else {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }
  }, [viewMode]);

  // S'abonner aux événements WebSocket
  useEffect(() => {
    if (!isConnected || !user) return;

    const handlers = createWebSocketHandlers({
      addExpense: updateExpenseInList,
      updateExpense: updateExpenseInList,
      deleteExpense: removeExpenseFromList
    });

    // S'abonner aux événements de dépenses
    const unsubscribeCreated = subscribe(websocketEventTypes.EXPENSE_CREATED, handlers[websocketEventTypes.EXPENSE_CREATED]);
    const unsubscribeUpdated = subscribe(websocketEventTypes.EXPENSE_UPDATED, handlers[websocketEventTypes.EXPENSE_UPDATED]);
    const unsubscribeDeleted = subscribe(websocketEventTypes.EXPENSE_DELETED, handlers[websocketEventTypes.EXPENSE_DELETED]);

    return () => {
      unsubscribeCreated?.();
      unsubscribeUpdated?.();
      unsubscribeDeleted?.();
    };
  }, [isConnected, user, subscribe, updateExpenseInList, removeExpenseFromList]);

  // Modifier les fonctions pour envoyer des événements WebSocket
  const addExpenseWithWebSocket = async () => {
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
    
    setLoading(true);
    try {
      const expenseData = {
        user_id: user.id,
        type: newExpense.type,
        date: selectedDate.toISOString().split('T')[0],
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description.trim() || null,
        payment_method: newExpense.payment_method
      };

      const createdExpense = await expensesService.createExpense(expenseData);
      
      // Envoyer l'événement WebSocket
      if (isConnected) {
        send(websocketEventTypes.EXPENSE_CREATED, createdExpense);
      }
      
      // Mise à jour locale immédiate
      updateExpenseInList(createdExpense);
      
      setNewExpense({ 
        type: 'expense',
        amount: '', 
        category: 'alimentation', 
        description: '', 
        payment_method: 'especes' 
      });
      setShowAddExpense(false);
      setSuccessMessage('Transaction ajoutée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur ajout dépense:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteWithWebSocket = async (expenseId) => {
    try {
      await expensesService.deleteExpense(expenseId);
      
      // Envoyer l'événement WebSocket
      if (isConnected) {
        send(websocketEventTypes.EXPENSE_DELETED, expenseId);
      }
      
      // Mise à jour locale immédiate
      removeExpenseFromList(expenseId);
      
      setShowConfirmDelete(null);
      setSuccessMessage('Transaction supprimée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dépenses et Entrées</h1>
        <p className="text-gray-600">Suivez vos finances au quotidien</p>
      </div>

      {/* Navigation et filtres */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'day'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'year'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Année
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-purple-600" />
          </button>
          
          <div className="px-6 py-2 bg-white/80 backdrop-blur-lg rounded-xl border border-purple-100 font-medium text-gray-800 min-w-[200px] text-center">
            {viewMode === 'day' 
              ? selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : viewMode === 'month'
              ? `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
              : `Année ${selectedDate.getFullYear()}`
            }
          </div>
          
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-purple-600" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
          >
            <option value="all">Tous les types</option>
            <option value="expense">Dépenses uniquement</option>
            <option value="income">Entrées uniquement</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddExpense(true)}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Ajouter
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total dépensé</span>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalExpenses.toFixed(0)} FCFA</p>
          <p className="text-sm text-gray-500 mt-1">{expensesOnly.length} transaction(s)</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total entrées</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{totalIncomes.toFixed(0)} FCFA</p>
          <p className="text-sm text-gray-500 mt-1">{incomesOnly.length} transaction(s)</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Net (entrées - dépenses)</span>
            <TrendingDown className="w-5 h-5 text-blue-500" />
          </div>
          <p className={`text-3xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netAmount >= 0 ? '+' : ''}{netAmount.toFixed(0)} FCFA
          </p>
        </div>
      </div>

      {/* Formulaire ajout/modification */}
      {showAddExpense && (
        <div className="mb-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingExpense ? 'Modifier la transaction' : (newExpense.type === 'income' ? 'Nouvelle entrée' : 'Nouvelle dépense')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={newExpense.type}
                onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              >
                <option value="expense"> Dépense</option>
                <option value="income"> Entrée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant (FCFA) *
              </label>
              <input
                type="number"
                placeholder="5000"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <select
                value={newExpense.payment_method}
                onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              >
                {paymentMethods.map(pm => (
                  <option key={pm.value} value={pm.value}>
                    {pm.icon} {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                placeholder="Ex: Courses au marché"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={editingExpense ? updateExpense : addExpenseWithWebSocket}
              disabled={loading}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? (editingExpense ? 'Modification...' : 'Ajout...') : (editingExpense ? 'Modifier' : `Ajouter la ${newExpense.type === 'income' ? 'entrée' : 'dépense'}`)}
            </button>
            <button
              onClick={cancelEdit}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Graphique répartition */}
        {expensesByCategory.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition par catégorie</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expensesByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(0)} FCFA`} />
                <Legend />
                <Bar dataKey="expenses" fill="#ef4444" name="Dépenses" />
                <Bar dataKey="incomes" fill="#10b981" name="Entrées" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {expensesByCategory.map(cat => (
                <div key={cat.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-sm font-medium text-gray-900">{cat.icon} {cat.name}</span>
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-red-600 font-medium">
                      💸 {cat.expenses.toFixed(0)} FCFA
                    </span>
                    <span className="text-sm text-green-600 font-medium">
                      💵 {cat.incomes.toFixed(0)} FCFA
                    </span>
                    <span className={`text-sm font-bold ${cat.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cat.net >= 0 ? '+' : ''}{cat.net.toFixed(0)} FCFA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des dépenses */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Détail des Transactions ({currentExpenses.length})
          </h3>
          
          {currentExpenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune dépense enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentExpenses.map(expense => {
                const catInfo = getCategoryInfo(expense.category);
                const pmInfo = getPaymentInfo(expense.payment_method);
                return (
                  <div
                    key={expense.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">
                            {catInfo.icon}
                          </span>
                          <div>
                            <p className={`font-bold ${expense.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(expense.amount).toFixed(0)} FCFA
                            </p>
                            <p className="text-sm text-gray-600">{catInfo.label}</p>
                          </div>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-500 mt-2">{expense.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            expense.type === 'income' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {expense.type === 'income' ? 'Entrée' : 'Dépense'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {pmInfo.icon} {pmInfo.label}
                          </span>
                          {(viewMode === 'month' || viewMode === 'year') && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(expense.date).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditExpense(expense)}
                          className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg animate-pulse">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Fenêtre de confirmation de suppression */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmDeleteWithWebSocket(showConfirmDelete)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all"
              >
                Supprimer
              </button>
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}