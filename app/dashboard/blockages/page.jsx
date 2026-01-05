// app/dashboard/blockages/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { tasksService } from '@/lib/supabase';
import { FileText, AlertCircle, Clock, Save, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BlockagesPage() {
  const { user } = useAuth();
  const [incompleteTasks, setIncompleteTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [blockageReason, setBlockageReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // week, month, year

  useEffect(() => {
    if (user) {
      loadIncompleteTasks();
    }
  }, [user, selectedDate, viewMode]);

  const loadIncompleteTasks = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      if (viewMode === 'week') {
        startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - 7);
        endDate = selectedDate;
      } else if (viewMode === 'month') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      } else if (viewMode === 'year') {
        startDate = new Date(selectedDate.getFullYear(), 0, 1);
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
      }

      const tasks = await tasksService.getTasks(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Filtrer les tâches passées non complétées
      const incomplete = tasks.filter(t => {
        const taskDate = new Date(t.date);
        return !t.completed && taskDate < new Date();
      });

      setIncompleteTasks(incomplete);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (amount) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + amount * 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + amount);
    } else if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + amount);
    }
    setSelectedDate(newDate);
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const startEditing = (task) => {
    setEditingTask(task);
    setBlockageReason(task.blockage_reason || '');
  };

  const saveBlockageReason = async () => {
    if (!editingTask || !blockageReason.trim()) return;

    setSaving(true);
    try {
      await tasksService.addBlockage(editingTask.id, blockageReason.trim());
      await loadIncompleteTasks();
      setEditingTask(null);
      setBlockageReason('');
    } catch (err) {
      console.error('Erreur sauvegarde blocage:', err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setBlockageReason('');
  };

  const markAsCompleted = async (taskId) => {
    try {
      await tasksService.toggleComplete(taskId, false);
      await loadIncompleteTasks();
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const groupedByDate = incompleteTasks.reduce((acc, task) => {
    const date = task.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  const tasksWithBlockage = incompleteTasks.filter(t => t.blockage_reason);
  const tasksWithoutBlockage = incompleteTasks.filter(t => !t.blockage_reason);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Blocages & Justifications</h1>
        <p className="text-gray-600">Expliquez pourquoi certaines tâches n'ont pas été accomplies</p>
      </div>

      {/* Navigation par période */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'year'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
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
              {viewMode === 'week' 
                ? `Semaine du ${new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - selectedDate.getDay() + 1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
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
        </div>

        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
          <p className="text-center font-medium text-gray-700">
            📊 Période analysée : <span className="text-purple-600">
              {viewMode === 'week' 
                ? `Semaine du ${new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - selectedDate.getDay() + 1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : viewMode === 'month'
                ? `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                : `Année ${selectedDate.getFullYear()}`
              }
            </span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Tâches non complétées</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{incompleteTasks.length}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Avec justification</span>
            <FileText className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{tasksWithBlockage.length}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Sans justification</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{tasksWithoutBlockage.length}</p>
        </div>
      </div>

      {/* Modal d'édition */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Justifier le blocage</h3>
              <button
                onClick={cancelEditing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-purple-50 rounded-xl">
              <p className="font-bold text-gray-800 mb-1">{editingTask.title}</p>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(editingTask.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </span>
                {editingTask.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {editingTask.time}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pourquoi cette tâche n'a-t-elle pas été accomplie ? *
              </label>
              <textarea
                value={blockageReason}
                onChange={(e) => setBlockageReason(e.target.value)}
                placeholder="Expliquez les raisons du blocage, les obstacles rencontrés, ou les circonstances qui ont empêché la réalisation..."
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none"
                rows="6"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Soyez précis pour mieux identifier les patterns et améliorer votre planification future.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveBlockageReason}
                disabled={saving || !blockageReason.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={cancelEditing}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des tâches */}
      {incompleteTasks.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-12 border border-purple-100 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Parfait ! 🎉</h3>
          <p className="text-gray-600">Aucune tâche non complétée sur cette période.</p>
          <p className="text-sm text-gray-500 mt-2">Continuez votre excellent travail !</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date} className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-500" />
                {new Date(date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}
                <span className="text-sm font-normal text-gray-500">
                  ({groupedByDate[date].length} tâche{groupedByDate[date].length !== 1 ? 's' : ''})
                </span>
              </h3>

              <div className="space-y-3">
                {groupedByDate[date].map(task => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      task.blockage_reason
                        ? 'bg-green-50 border-green-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {task.blockage_reason ? (
                            <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          )}
                          <h4 className="font-bold text-gray-800">{task.title}</h4>
                        </div>

                        {task.time && (
                          <p className="text-sm text-gray-600 mb-2 flex items-center gap-1 ml-7">
                            <Clock className="w-3 h-3" />
                            Prévu à {task.time}
                          </p>
                        )}

                        {task.notes && (
                          <p className="text-sm text-gray-600 mb-2 ml-7 italic">"{task.notes}"</p>
                        )}

                        {task.blockage_reason ? (
                          <div className="ml-7 p-3 bg-white rounded-lg border border-green-200">
                            <p className="text-sm font-medium text-green-900 mb-1">Justification :</p>
                            <p className="text-sm text-gray-700">{task.blockage_reason}</p>
                          </div>
                        ) : (
                          <div className="ml-7 p-3 bg-white rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-700">
                              ⚠️ Cette tâche nécessite une justification
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => startEditing(task)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            task.blockage_reason
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {task.blockage_reason ? 'Modifier' : 'Justifier'}
                        </button>
                        <button
                          onClick={() => markAsCompleted(task.id)}
                          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-all"
                        >
                          Marquer fait
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conseils */}
      {tasksWithoutBlockage.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-6 border border-purple-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            💡 Pourquoi justifier vos blocages ?
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Identifiez les obstacles récurrents dans votre quotidien</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Améliorez votre planification en anticipant les contraintes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Développez votre conscience de vos patterns de productivité</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span>Créez un historique utile pour vos bilans futurs</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}