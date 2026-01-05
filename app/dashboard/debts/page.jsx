// app/dashboard/debts/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { debtsService, paymentsService } from '@/lib/supabase';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Edit2,
  TrendingUp,
  TrendingDown,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showConfirmDeletePayment, setShowConfirmDeletePayment] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('day'); // day, month, year
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [newDebt, setNewDebt] = useState({
    title: '',
    description: '',
    amount: '',
    type: 'owed',
    creditor_debtor: '',
    due_date: '',
    category: '',
    priority: 'medium'
  });

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [editingDebt, setEditingDebt] = useState({
    title: '',
    description: '',
    amount: '',
    type: 'owed',
    creditor_debtor: '',
    due_date: '',
    category: '',
    priority: 'medium'
  });

  const [editingPayment, setEditingPayment] = useState({
    amount: '',
    date: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      loadDebts();
    }
  }, [user, filterStatus, filterType, viewMode, selectedDate]);

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

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

  const loadDebts = async () => {
    try {
      setLoading(true);
      let startDate, endDate;
      
      // Calculer les dates selon le viewMode
      if (viewMode === 'day') {
        startDate = endDate = selectedDate.toLocaleDateString('en-CA');
      } else if (viewMode === 'month') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toLocaleDateString('en-CA');
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toLocaleDateString('en-CA');
      } else if (viewMode === 'year') {
        startDate = new Date(selectedDate.getFullYear(), 0, 1).toLocaleDateString('en-CA');
        endDate = new Date(selectedDate.getFullYear(), 11, 31).toLocaleDateString('en-CA');
      }
      
      // Récupérer toutes les dettes
      const allDebts = await debtsService.getDebts(user.id);
      
      // Filtrer selon les critères
      let data = allDebts.filter(debt => {
        // Filtrer par statut
        if (filterStatus !== 'all' && debt.status !== filterStatus) return false;
        
        // Filtrer par type
        if (filterType !== 'all' && debt.type !== filterType) return false;
        
        // Filtrer par période
        const debtDate = new Date(debt.created_at || debt.due_date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        if (debtDate < start || debtDate > end) return false;
        
        return true;
      });
      
      // Corriger automatiquement le statut des dettes
      const correctedDebts = await Promise.all(
        (data || []).map(async (debt) => {
          const amountPaid = parseFloat(debt.amount_paid || 0);
          const totalAmount = parseFloat(debt.amount);
          
          // Déterminer le bon statut
          let correctStatus = 'pending';
          if (amountPaid > 0 && amountPaid < totalAmount) {
            correctStatus = 'partial';
          } else if (amountPaid >= totalAmount) {
            correctStatus = 'paid';
          }
          
          // Si le statut est incorrect, le mettre à jour
          if (debt.status !== correctStatus) {
            try {
              await debtsService.updateDebt(debt.id, {
                user_id: user.id,
                status: correctStatus
              });
              return { ...debt, status: correctStatus };
            } catch (err) {
              console.error('Erreur correction statut:', err);
              return debt;
            }
          }
          
          return debt;
        })
      );
      
      setDebts(correctedDebts);
    } catch (err) {
      console.error('Erreur chargement dettes:', err);
    } finally {
      setLoading(false);
    }
  };

  const addDebt = async () => {
    if (!newDebt.title.trim() || !newDebt.amount || parseFloat(newDebt.amount) <= 0) {
      return;
    }

    setLoading(true);
    try {
      const debtData = {
        user_id: user.id,
        ...newDebt,
        amount: parseFloat(newDebt.amount)
      };

      await debtsService.createDebt(debtData);
      await loadDebts();
      
      setNewDebt({
        title: '',
        description: '',
        amount: '',
        type: 'owed',
        creditor_debtor: '',
        due_date: '',
        category: '',
        priority: 'medium'
      });
      setShowAddDebt(false);
      setSuccessMessage('Dette ajoutée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur ajout dette:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateDebtStatus = async (debtId, updates) => {
    setLoading(true);
    try {
      await debtsService.updateDebt(debtId, { ...updates, user_id: user.id });
      await loadDebts();
    } catch (err) {
      console.error('Erreur mise à jour dette:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteDebt = async (debtId) => {
    setShowConfirmDelete(debtId);
  };

  const confirmDeleteDebt = async (debtId) => {
    setLoading(true);
    try {
      await debtsService.deleteDebt(debtId);
      await loadDebts();
      setShowConfirmDelete(null);
      setSuccessMessage('Dette supprimée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression dette:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (debtId, amount) => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      // Créer le paiement dans la table séparée
      const paymentData = {
        debt_id: debtId,
        amount: parseFloat(amount),
        date: paymentDate,
        description: paymentDescription || 'Paiement manuel',
        user_id: user.id
      };
      
      await paymentsService.createPayment(paymentData);
      
      // Mettre à jour le montant payé de la dette
      await debtsService.addPayment(debtId, parseFloat(amount));
      
      await loadDebts();
      setShowPaymentForm(false);
      setSelectedDebt(null);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentDescription('');
      setSuccessMessage('Paiement ajouté avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur ajout paiement:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPayment = (debt) => {
    setSelectedDebt(debt);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentDescription('');
    setShowPaymentForm(true);
  };

  const cancelPayment = () => {
    setShowPaymentForm(false);
    setSelectedDebt(null);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentDescription('');
  };

  const startEdit = (debt) => {
    setEditingDebt({
      id: debt.id,
      title: debt.title,
      description: debt.description || '',
      amount: debt.amount.toString(),
      type: debt.type,
      creditor_debtor: debt.creditor_debtor,
      due_date: debt.due_date || '',
      category: debt.category || '',
      priority: debt.priority
    });
    setShowEditForm(true);
  };

  const updateDebt = async () => {
    if (!editingDebt.title.trim() || !editingDebt.amount || parseFloat(editingDebt.amount) <= 0) {
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        user_id: user.id,
        title: editingDebt.title,
        description: editingDebt.description,
        amount: parseFloat(editingDebt.amount),
        type: editingDebt.type,
        creditor_debtor: editingDebt.creditor_debtor,
        due_date: editingDebt.due_date,
        category: editingDebt.category,
        priority: editingDebt.priority
      };

      await debtsService.updateDebt(editingDebt.id, updateData);
      await loadDebts();
      
      setEditingDebt({
        title: '',
        description: '',
        amount: '',
        type: 'owed',
        creditor_debtor: '',
        due_date: '',
        category: '',
        priority: 'medium'
      });
      setShowEditForm(false);
      setSuccessMessage('Dette modifiée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur modification dette:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingDebt({
      title: '',
      description: '',
      amount: '',
      type: 'owed',
      creditor_debtor: '',
      due_date: '',
      category: '',
      priority: 'medium'
    });
    setShowEditForm(false);
  };

  // Fonctions pour la gestion des paiements
  const startEditPayment = (debt, payment) => {
    setSelectedDebt(debt);
    setEditingPayment({
      amount: payment.amount.toString(),
      date: payment.date || new Date().toISOString().split('T')[0],
      description: payment.description || ''
    });
    setSelectedPayment(payment);
    setShowEditPayment(true);
  };

  const updatePayment = async () => {
    if (!editingPayment.amount || parseFloat(editingPayment.amount) <= 0) return;

    setLoading(true);
    try {
      // Mettre à jour le paiement dans la table séparée
      await paymentsService.updatePayment(selectedPayment.id, {
        amount: parseFloat(editingPayment.amount),
        date: editingPayment.date,
        description: editingPayment.description
      });
      
      // Recalculer le montant total payé
      const allPayments = await paymentsService.getPaymentsByDebt(selectedDebt.id);
      const newAmountPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const newStatus = newAmountPaid >= parseFloat(selectedDebt.amount) ? 'paid' : 
                       newAmountPaid > 0 ? 'partial' : 'pending';

      // Mettre à jour la dette
      await debtsService.updateDebt(selectedDebt.id, {
        user_id: user.id,
        amount_paid: newAmountPaid,
        status: newStatus
      });
      
      await loadDebts();
      await loadPayments(selectedDebt.id);
      
      setEditingPayment({
        amount: '',
        date: '',
        description: ''
      });
      setShowEditPayment(false);
      setSelectedPayment(null);
      setSuccessMessage('Paiement modifié avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur modification paiement:', err);
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (debt, payment) => {
    setSelectedDebt(debt);
    setSelectedPayment(payment);
    setShowConfirmDeletePayment(true);
  };

  const confirmDeletePayment = async () => {
    if (!selectedDebt || !selectedPayment) return;
    
    setLoading(true);
    try {
      // Supprimer le paiement de la table séparée
      await paymentsService.deletePayment(selectedPayment.id);
      
      // Recalculer le montant total payé
      const remainingPayments = await paymentsService.getPaymentsByDebt(selectedDebt.id);
      const newAmountPaid = remainingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const newStatus = newAmountPaid >= parseFloat(selectedDebt.amount) ? 'paid' : 
                       newAmountPaid > 0 ? 'partial' : 'pending';

      // Mettre à jour la dette
      await debtsService.updateDebt(selectedDebt.id, {
        user_id: user.id,
        amount_paid: newAmountPaid,
        status: newStatus
      });
      
      await loadDebts();
      await loadPayments(selectedDebt.id);
      setShowConfirmDeletePayment(false);
      setSelectedDebt(null);
      setSelectedPayment(null);
      setSuccessMessage('Paiement supprimé avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression paiement:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelEditPayment = () => {
    setEditingPayment({
      amount: '',
      date: '',
      description: ''
    });
    setShowEditPayment(false);
    setSelectedPayment(null);
  };

  // Fonction pour charger les paiements d'une dette
  const loadPayments = async (debtId) => {
    try {
      const paymentData = await paymentsService.getPaymentsByDebt(debtId);
      setPayments(paymentData || []);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
    }
  };

  // Fonction pour ouvrir l'historique des paiements
  const openPaymentHistory = async (debt) => {
    setSelectedDebt(debt);
    await loadPayments(debt.id);
    setShowPaymentHistory(true);
  };

  const getTypeLabel = (type) => type === 'owed' ? 'Dette' : 'Créance';
  const getTypeIcon = (type) => type === 'owed' ? '📤' : '📥';
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'partial': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'partial': return 'Partiellement payé';
      case 'paid': return 'Payé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  // Calculer les statistiques
  const totalOwed = debts.filter(d => d.type === 'owed').reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const totalOwing = debts.filter(d => d.type === 'owing').reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const totalPaid = debts.reduce((sum, d) => sum + parseFloat(d.amount_paid || 0), 0);
  const overdueDebts = debts.filter(d => d.type === 'owed' && d.status === 'pending' && new Date(d.due_date) < new Date());
  const overdueCount = overdueDebts.length;
  const overdueAmount = overdueDebts.reduce((sum, d) => sum + (parseFloat(d.amount) - parseFloat(d.amount_paid || 0)), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dettes et Créances</h1>
        <p className="text-gray-600">Suivez vos dettes et créances</p>
      </div>

      {/* Navigation par période */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'day'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'year'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="partial">Partiellement payé</option>
            <option value="paid">Payé</option>
            <option value="cancelled">Annulé</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
          >
            <option value="all">Tous les types</option>
            <option value="owed">Dettes uniquement</option>
            <option value="owing">Créances uniquement</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddDebt(true)}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          Ajouter une dette
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total dû</span>
            <ArrowUpRight className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalOwed.toFixed(0)} FCFA</p>
          <p className="text-sm text-gray-500">{debts.filter(d => d.type === 'owed').length} dettes</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total à recevoir</span>
            <ArrowDownLeft className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalOwing.toFixed(0)} FCFA</p>
          <p className="text-sm text-gray-500">{debts.filter(d => d.type === 'owing').length} créances</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">En retard</span>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-sm text-gray-500">{overdueAmount.toFixed(0)} FCFA</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Net à payer</span>
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{(totalOwed - totalOwing - totalPaid).toFixed(0)} FCFA</p>
        </div>
      </div>

      {/* Graphique de répartition */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Répartition par type */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition par type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Dettes', value: totalOwed, fill: '#ef4444' },
              { name: 'Créances', value: totalOwing, fill: '#10b981' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(0)} FCFA`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-900">📤 Dettes</span>
              </span>
              <span className="text-sm text-red-600 font-medium">
                {totalOwed.toFixed(0)} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-900">📥 Créances</span>
              </span>
              <span className="text-sm text-green-600 font-medium">
                {totalOwing.toFixed(0)} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-900">💰 Net</span>
              </span>
              <span className={`text-sm font-bold ${(totalOwing - totalOwed) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(totalOwing - totalOwed).toFixed(0)} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Répartition par statut */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition par statut</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'En attente', value: debts.filter(d => d.status === 'pending').length, fill: '#f59e0b' },
              { name: 'Partiellement payé', value: debts.filter(d => d.status === 'partial').length, fill: '#3b82f6' },
              { name: 'Payé', value: debts.filter(d => d.status === 'paid').length, fill: '#10b981' },
              { name: 'Annulé', value: debts.filter(d => d.status === 'cancelled').length, fill: '#6b7280' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value} dettes`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium text-gray-900">⏳ En attente</span>
              </span>
              <span className="text-sm text-yellow-600 font-medium">
                {debts.filter(d => d.status === 'pending').length} dettes
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-900">🔄 Partiellement payé</span>
              </span>
              <span className="text-sm text-blue-600 font-medium">
                {debts.filter(d => d.status === 'partial').length} dettes
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-900">✅ Payé</span>
              </span>
              <span className="text-sm text-green-600 font-medium">
                {debts.filter(d => d.status === 'paid').length} dettes
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-sm font-medium text-gray-900">❌ Annulé</span>
              </span>
              <span className="text-sm text-gray-600 font-medium">
                {debts.filter(d => d.status === 'cancelled').length} dettes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {showAddDebt && (
        <div className="mb-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Nouvelle {getTypeLabel(newDebt.type)}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={newDebt.type}
                onChange={(e) => setNewDebt({ ...newDebt, type: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              >
                <option value="owed">📤 Dette (je dois)</option>
                <option value="owing">📥 Créance (on me doit)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                placeholder="Ex: Emprunt pour voiture"
                value={newDebt.title}
                onChange={(e) => setNewDebt({ ...newDebt, title: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant (FCFA) *
              </label>
              <input
                type="number"
                placeholder="50000"
                value={newDebt.amount}
                onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newDebt.type === 'owed' ? 'Créancier *' : 'Débiteur *'}
              </label>
              <input
                type="text"
                placeholder={newDebt.type === 'owed' ? 'Banque X' : 'Client Y'}
                value={newDebt.creditor_debtor}
                onChange={(e) => setNewDebt({ ...newDebt, creditor_debtor: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'échéance
              </label>
              <input
                type="date"
                value={newDebt.due_date}
                onChange={(e) => setNewDebt({ ...newDebt, due_date: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
              </label>
              <select
                value={newDebt.category}
                onChange={(e) => setNewDebt({ ...newDebt, category: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="alimentation">🍔 Alimentation</option>
                <option value="transport">🚗 Transport</option>
                <option value="logement">🏠 Logement</option>
                <option value="sante">⚕️ Santé</option>
                <option value="loisirs">🎮 Loisirs</option>
                <option value="education">📚 Éducation</option>
                <option value="vetements">👕 Vêtements</option>
                <option value="autre">💰 Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorité
              </label>
              <select
                value={newDebt.priority}
                onChange={(e) => setNewDebt({ ...newDebt, priority: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              placeholder="Description détaillée (optionnel)"
              value={newDebt.description}
              onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })}
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none text-gray-900"
              rows="3"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={addDebt}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Ajout...' : `Ajouter la ${getTypeLabel(newDebt.type)}`}
            </button>
            <button
              onClick={() => {
                setShowAddDebt(false);
                setNewDebt({
                  title: '',
                  description: '',
                  amount: '',
                  type: 'owed',
                  creditor_debtor: '',
                  due_date: '',
                  category: '',
                  priority: 'medium'
                });
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des dettes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="text-center py-12 col-span-full">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des dettes...</p>
          </div>
        ) : debts.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-purple-100 col-span-full">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune dette</h3>
            <p className="text-gray-600">Commencez par ajouter vos dettes et créances</p>
          </div>
        ) : (
          debts.map(debt => (
            <div
              key={debt.id}
              className={`bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 hover:shadow-xl transition-all ${
                debt.type === 'owed' 
                  ? 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/30 to-transparent' 
                  : 'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/30 to-transparent'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                      debt.type === 'owed' 
                        ? 'bg-gradient-to-br from-red-100 to-red-200 shadow-red-200' 
                        : 'bg-gradient-to-br from-green-100 to-green-200 shadow-green-200'
                    } shadow-lg`}>
                      {debt.type === 'owed' ? '📤' : '📥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 break-words">{debt.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          debt.type === 'owed' 
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-300' 
                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-300'
                        }`}>
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                          {debt.type === 'owed' ? 'Dette' : 'Créance'}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(debt.priority)}`}>
                          {getPriorityLabel(debt.priority)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                          {getStatusLabel(debt.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3 text-sm">{debt.creditor_debtor}</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 mb-3">
                    <span className={`text-lg font-bold ${
                      debt.type === 'owed' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {parseFloat(debt.amount).toFixed(0)} FCFA
                    </span>
                    {debt.due_date && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(debt.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {debt.description && (
                    <p className="text-sm text-gray-500 mb-3">{debt.description}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between sm:block">
                      <span className="font-medium">Payé:</span>
                      <span className="ml-2">{parseFloat(debt.amount_paid || 0).toFixed(0)} FCFA</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="font-medium">Reste:</span>
                      <span className="ml-2 font-semibold">{(parseFloat(debt.amount) - parseFloat(debt.amount_paid || 0)).toFixed(0)} FCFA</span>
                    </div>
                    {parseFloat(debt.amount_paid || 0) > 0 && (
                      <button
                        onClick={() => openPaymentHistory(debt)}
                        className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors self-start sm:self-auto"
                      >
                        Voir les paiements
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                {((parseFloat(debt.amount_paid || 0) === 0) || (parseFloat(debt.amount_paid || 0) < parseFloat(debt.amount))) && (
                  <button
                    onClick={() => startPayment(debt)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors min-w-[120px]"
                  >
                    Ajouter paiement
                  </button>
                )}
                
                <button
                  onClick={() => startEdit(debt)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors min-w-[80px]"
                >
                  <Edit2 className="w-3 h-3 inline mr-1" />
                  Modifier
                </button>
                
                <button
                  onClick={() => deleteDebt(debt.id)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors min-w-[80px]"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" />
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulaire de paiement */}
      {showPaymentForm && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md mx-4 shadow-2xl w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Ajouter un paiement - {selectedDebt.title}
            </h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Montant total:</span>
                <span className="font-medium">{parseFloat(selectedDebt.amount).toFixed(0)} FCFA</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Déjà payé:</span>
                <span className="font-medium">{parseFloat(selectedDebt.amount_paid || 0).toFixed(0)} FCFA</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-800 mb-4">
                <span>Reste à payer:</span>
                <span className="text-green-600">{(parseFloat(selectedDebt.amount) - parseFloat(selectedDebt.amount_paid || 0)).toFixed(0)} FCFA</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant du paiement (FCFA) *
              </label>
              <input
                type="number"
                placeholder="5000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date du paiement
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Description du paiement (optionnel)"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none text-gray-900"
                rows="3"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addPayment(selectedDebt.id, paymentAmount)}
                disabled={loading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
              <button
                onClick={cancelPayment}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de modification */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl mx-4 shadow-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Modifier la {getTypeLabel(editingDebt.type)}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={editingDebt.type}
                  onChange={(e) => setEditingDebt({ ...editingDebt, type: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="owed">📤 Dette (je dois)</option>
                  <option value="owing">📥 Créance (on me doit)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Emprunt pour voiture"
                  value={editingDebt.title}
                  onChange={(e) => setEditingDebt({ ...editingDebt, title: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (FCFA) *
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  value={editingDebt.amount}
                  onChange={(e) => setEditingDebt({ ...editingDebt, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingDebt.type === 'owed' ? 'Créancier *' : 'Débiteur *'}
                </label>
                <input
                  type="text"
                  placeholder={editingDebt.type === 'owed' ? 'Banque X' : 'Client Y'}
                  value={editingDebt.creditor_debtor}
                  onChange={(e) => setEditingDebt({ ...editingDebt, creditor_debtor: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={editingDebt.due_date}
                  onChange={(e) => setEditingDebt({ ...editingDebt, due_date: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={editingDebt.category}
                  onChange={(e) => setEditingDebt({ ...editingDebt, category: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option value="alimentation">🍔 Alimentation</option>
                  <option value="transport">🚗 Transport</option>
                  <option value="logement">🏠 Logement</option>
                  <option value="sante">⚕️ Santé</option>
                  <option value="loisirs">🎮 Loisirs</option>
                  <option value="education">📚 Éducation</option>
                  <option value="vetements">👕 Vêtements</option>
                  <option value="autre">💰 Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={editingDebt.priority}
                  onChange={(e) => setEditingDebt({ ...editingDebt, priority: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Description détaillée (optionnel)"
                value={editingDebt.description}
                onChange={(e) => setEditingDebt({ ...editingDebt, description: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none text-gray-900"
                rows="3"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={updateDebt}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Modification...' : 'Modifier la dette'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique des paiements */}
      {showPaymentHistory && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl mx-4 shadow-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Historique des paiements - {selectedDebt.title}
            </h3>
            
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Aucun paiement enregistré</p>
                </div>
              ) : (
                payments.map(payment => (
                  <div key={payment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {parseFloat(payment.amount).toFixed(0)} FCFA
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </p>
                        {payment.description && (
                          <p className="text-sm text-gray-500">{payment.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditPayment(selectedDebt, payment)}
                          className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePayment(selectedDebt, payment)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de modification de paiement */}
      {showEditPayment && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md mx-4 shadow-2xl w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Modifier le paiement - {selectedDebt.title}
            </h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Montant actuel:</span>
                <span className="font-medium">{parseFloat(selectedPayment.amount || 0).toFixed(0)} FCFA</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau montant (FCFA) *
              </label>
              <input
                type="number"
                placeholder="5000"
                value={editingPayment.amount}
                onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date du paiement
              </label>
              <input
                type="date"
                value={editingPayment.date}
                onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Description du paiement (optionnel)"
                value={editingPayment.description}
                onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none text-gray-900"
                rows="3"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={updatePayment}
                disabled={loading || !editingPayment.amount || parseFloat(editingPayment.amount) <= 0}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Modification...' : 'Modifier le paiement'}
              </button>
              <button
                onClick={cancelEditPayment}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fenêtre de confirmation de suppression de dette */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette dette ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmDeleteDebt(showConfirmDelete)}
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

      {/* Fenêtre de confirmation de suppression de paiement */}
      {showConfirmDeletePayment && selectedDebt && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce paiement de {parseFloat(selectedPayment.amount).toFixed(0)} FCFA ? 
              Cette action réduira le montant payé de la dette.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeletePayment}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all"
              >
                Supprimer
              </button>
              <button
                onClick={() => {
                  setShowConfirmDeletePayment(false);
                  setSelectedDebt(null);
                  setSelectedPayment(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message de succès */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg animate-pulse">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
    </div>
  );
}
