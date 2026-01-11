// app/dashboard/goals/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { goalsService } from '@/lib/supabase';
import { Target, Plus, Check, Trash2, Edit2, X, TrendingUp, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous'); // 'tous', 'actifs', 'termines'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'ancien', 'titre'
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    deadline: '',
    category: 'personnel'
  });

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    try {
      const data = await goalsService.getGoals(user.id);
      setGoals(data || []);
    } catch (err) {
      console.error('Erreur chargement objectifs:', err);
    }
  };

  const addGoal = async () => {
    if (!newGoal.title.trim()) return;
    
    setLoading(true);
    try {
      const goalData = {
        user_id: user.id,
        ...newGoal,
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || null,
        deadline: newGoal.deadline || null
      };

      await goalsService.createGoal(goalData);
      await loadGoals();
      
      setNewGoal({ title: '', description: '', deadline: '', category: 'personnel' });
      setShowAddGoal(false);
      setSuccessMessage('Objectif créé avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur ajout objectif:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async () => {
    if (!editingGoal.title.trim()) return;
    
    setLoading(true);
    try {
      await goalsService.updateGoal(editingGoal.id, {
        title: editingGoal.title.trim(),
        description: editingGoal.description?.trim() || null,
        deadline: editingGoal.deadline || null,
        category: editingGoal.category,
        progress: editingGoal.progress
      });
      await loadGoals();
      setEditingGoal(null);
      setSuccessMessage('Objectif mis à jour avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur mise à jour objectif:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (goalId, completed) => {
    try {
      await goalsService.updateGoal(goalId, {
        completed: !completed,
        progress: !completed ? 100 : goals.find(g => g.id === goalId).progress
      });
      await loadGoals();
    } catch (err) {
      console.error('Erreur toggle:', err);
    }
  };

  const deleteGoal = async (goalId) => {
    setShowConfirmDelete(goalId);
  };

  const confirmDelete = async (goalId) => {
    try {
      await goalsService.deleteGoal(goalId);
      await loadGoals();
      setShowConfirmDelete(null);
      setSuccessMessage('Objectif supprimé avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const updateProgress = async (goalId, progress) => {
    try {
      await goalsService.updateProgress(goalId, progress);
      await loadGoals();
    } catch (err) {
      console.error('Erreur mise à jour progression:', err);
    }
  };

  const categories = [
    { value: 'personnel', label: 'Personnel', color: 'bg-blue-100 text-blue-700' },
    { value: 'professionnel', label: 'Professionnel', color: 'bg-purple-100 text-purple-700' },
    { value: 'sante', label: 'Santé', color: 'bg-green-100 text-green-700' },
    { value: 'finance', label: 'Finance', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'education', label: 'Éducation', color: 'bg-pink-100 text-pink-700' },
    { value: 'autre', label: 'Autre', color: 'bg-gray-100 text-gray-700' }
  ];

  const getCategoryColor = (category) => {
    return categories.find(c => c.value === category)?.color || categories[categories.length - 1].color;
  };

  const getCategoryLabel = (category) => {
    return categories.find(c => c.value === category)?.label || 'Autre';
  };

  const filteredGoals = goals.filter(goal => {
    // Filtre par catégorie
    const categoryMatch = selectedCategory === 'tous' || goal.category === selectedCategory;
    
    // Filtre par statut
    let statusMatch = true;
    if (statusFilter === 'actifs') statusMatch = !goal.completed;
    if (statusFilter === 'termines') statusMatch = goal.completed;
    
    // Filtre par recherche
    const searchMatch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (goal.description && goal.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return categoryMatch && statusMatch && searchMatch;
  }).sort((a, b) => {
    // Trier les objectifs
    if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'ancien') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'titre') return a.title.localeCompare(b.title);
    return 0;
  });

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);
  const avgProgress = activeGoals.length > 0 
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0;
    
  const filteredActiveGoals = filteredGoals.filter(g => !g.completed);
  const filteredCompletedGoals = filteredGoals.filter(g => g.completed);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Objectifs de l'année</h1>
        <p className="text-gray-600">Définissez et suivez vos objectifs annuels</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs sm:text-sm">Total</span>
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{goals.length}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs sm:text-sm">En cours</span>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{activeGoals.length}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs sm:text-sm">Complétés</span>
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{completedGoals.length}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs sm:text-sm">Progression</span>
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{avgProgress}%</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="w-full sm:w-auto flex-1">
          <input
            type="text"
            placeholder="Rechercher un objectif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-700 bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md"
          />
        </div>
        
        <div className="w-full sm:w-auto flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-700 bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md"
          >
            <option value="tous">Toutes catégories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-700 bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md"
          >
            <option value="tous">Tous</option>
            <option value="actifs">Actifs</option>
            <option value="termines">Terminés</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-700 bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md"
          >
            <option value="recent">Plus récent</option>
            <option value="ancien">Plus ancien</option>
            <option value="titre">Par titre</option>
          </select>
          
          <button
            onClick={() => setShowAddGoal(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-xl transition-all text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel objectif</span>
          </button>
        </div>
      </div>

      {/* Floating action button for mobile */}
      <button
        onClick={() => setShowAddGoal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40 hover:scale-110 active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bouton ajouter */}
      {/* <button
        onClick={() => setShowAddGoal(true)}
        className="mb-6 sm:mb-8 flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-xl transition-all text-sm sm:text-base"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        Nouvel objectif
      </button> */}

      {/* Formulaire ajout */}
      {showAddGoal && (
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-3xl border border-purple-200 shadow-lg shadow-purple-100/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Nouvel objectif</h3>
            <button
              onClick={() => {
                setShowAddGoal(false);
                setNewGoal({ title: '', description: '', deadline: '', category: 'personnel' });
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Titre de l'objectif *"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
            />

            <textarea
              placeholder="Description détaillée (optionnel)"
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
              rows="3"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Date limite (optionnel)
                </label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={addGoal}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-2xl font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base shadow-md hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Ajout...' : 'Créer l\'objectif'}
              </button>
              <button
                onClick={() => {
                  setShowAddGoal(false);
                  setNewGoal({ title: '', description: '', deadline: '', category: 'personnel' });
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-all text-sm sm:text-base shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des objectifs actifs */}
      {filteredActiveGoals.length > 0 ? (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">En cours ({filteredActiveGoals.length})</h2>
          <div className="grid gap-3 sm:gap-4">
            {filteredActiveGoals.map(goal => (
              <div
                key={goal.id}
                className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all"
              >
                {editingGoal?.id === goal.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Titre de l'objectif *"
                      value={editingGoal.title}
                      onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                      className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                    />

                    <textarea
                      placeholder="Description détaillée (optionnel)"
                      value={editingGoal.description || ''}
                      onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                      className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                      rows="3"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Catégorie
                        </label>
                        <select
                          value={editingGoal.category}
                          onChange={(e) => setEditingGoal({ ...editingGoal, category: e.target.value })}
                          className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Date limite (optionnel)
                        </label>
                        <input
                          type="date"
                          value={editingGoal.deadline || ''}
                          onChange={(e) => setEditingGoal({ ...editingGoal, deadline: e.target.value })}
                          className="w-full px-4 py-3 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-600">Progression</span>
                        <span className="text-xs sm:text-sm font-bold text-purple-600">{editingGoal.progress}%</span>
                      </div>
                      <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${editingGoal.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editingGoal.progress}
                        onChange={(e) => setEditingGoal({ ...editingGoal, progress: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={updateGoal}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-2xl font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base shadow-md hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {loading ? 'Sauvegarde...' : 'Mettre à jour'}
                      </button>
                      <button
                        onClick={() => setEditingGoal(null)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-all text-sm sm:text-base shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleComplete(goal.id, goal.completed)}
                            className="mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-gray-300 hover:border-purple-400 transition-all flex-shrink-0"
                          />
                          <h3 className={`text-sm sm:text-base font-bold ${goal.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {goal.title}
                          </h3>
                          {goal.description && (
                            <p className="text-gray-600 ml-9">{goal.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingGoal(goal)}
                          className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4 ml-6 sm:ml-9">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(goal.category)}`}>
                        {getCategoryLabel(goal.category)}
                      </span>
                      {goal.deadline && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(goal.deadline).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>

                    <div className="ml-6 sm:ml-9">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-600">Progression</span>
                        <span className="text-xs sm:text-sm font-bold text-purple-600">{goal.progress}%</span>
                      </div>
                      <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={goal.progress}
                        onChange={(e) => updateProgress(goal.id, parseInt(e.target.value))}
                        className="w-full mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Liste des objectifs complétés */}
      {filteredCompletedGoals.length > 0 && (
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Complétés ({filteredCompletedGoals.length})</h2>
          <div className="grid gap-3 sm:gap-4">
            {filteredCompletedGoals.map(goal => (
              <div
                key={goal.id}
                className="p-3 sm:p-4 rounded-xl border-2 bg-gray-50/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-gray-200 opacity-75"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <button
                        onClick={() => toggleComplete(goal.id, goal.completed)}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </button>
                      <h3 className="text-sm sm:text-base font-bold text-gray-600 line-through">{goal.title}</h3>
                    </div>
                    {goal.description && (
                      <p className="text-xs sm:text-sm text-gray-500 ml-7 sm:ml-9">{goal.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4 ml-7 sm:ml-9">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(goal.category)}`}>
                    {getCategoryLabel(goal.category)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    ✓ Complété
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredActiveGoals.length === 0 && filteredCompletedGoals.length === 0 && !showAddGoal && (
        <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl border border-purple-100 shadow-sm">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Aucun objectif trouvé</h3>
          <p className="text-gray-500 mt-1 mb-6">
            {searchQuery || selectedCategory !== 'tous' || statusFilter !== 'tous' 
              ? 'Aucun objectif ne correspond à vos critères de recherche.' 
              : 'Commencez par ajouter votre premier objectif'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('tous');
              setStatusFilter('tous');
              setShowAddGoal(true);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Ajouter un objectif
          </button>
          
          {(searchQuery || selectedCategory !== 'tous' || statusFilter !== 'tous') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('tous');
                setStatusFilter('tous');
              }}
              className="mt-4 px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all ml-3"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

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
              Êtes-vous sûr de vouloir supprimer cet objectif ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmDelete(showConfirmDelete)}
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
