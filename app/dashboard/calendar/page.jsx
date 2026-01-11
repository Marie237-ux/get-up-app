// app/dashboard/calendar/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { tasksService } from '@/lib/supabase';
import { Calendar, Plus, Check, Clock, Trash2, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, FileText, CheckCircle, Edit } from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [dayTasks, setDayTasks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    time: '',
    notes: '',
    priority: 'normal'
  });

  // Charger les tâches du mois et du jour en parallèle au premier chargement
  useEffect(() => {
    if (user) {
      const loadInitialData = async () => {
        setInitialLoading(true);
        try {
          const today = new Date();
          const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
          
          // Charger les deux en parallèle
          const [monthTasksData, dayTasksData] = await Promise.all([
            tasksService.getTasks(
              user.id,
              start.toLocaleDateString('en-CA'),
              end.toLocaleDateString('en-CA')
            ),
            tasksService.getTasksByDate(user.id, selectedDate.toLocaleDateString('en-CA'))
          ]);
          
          setTasks(monthTasksData || []);
          setDayTasks(dayTasksData || []);
        } catch (err) {
          console.error('Erreur chargement initial:', err);
        } finally {
          setInitialLoading(false);
        }
      };

      loadInitialData();
    }
  }, [user]);

  // Recharger les tâches du mois quand le mois change
  useEffect(() => {
    if (user && !initialLoading) {
      loadMonthTasks();
    }
  }, [user, currentMonth, initialLoading]);

  // Recharger les tâches du jour quand la date change (après le chargement initial)
  useEffect(() => {
    if (user && selectedDate && !initialLoading) {
      loadDayTasks();
    }
  }, [user, selectedDate, initialLoading]);

  const loadMonthTasks = async () => {
    try {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const data = await tasksService.getTasks(
        user.id,
        start.toLocaleDateString('en-CA'),
        end.toLocaleDateString('en-CA')
      );
      
      setTasks(data || []);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    }
  };

  const loadDayTasks = async () => {
    try {
      const dateStr = selectedDate.toLocaleDateString('en-CA');
      const data = await tasksService.getTasksByDate(user.id, dateStr);
      setDayTasks(data || []);
    } catch (err) {
      console.error('Erreur chargement tâches du jour:', err);
    }
  };

  const addTask = async () => {
    setError('');
    
    if (!newTask.title.trim()) {
      setError('Le titre est requis');
      return;
    }

    // Vérifier conflit horaire
    if (newTask.time) {
      const conflit = dayTasks.find(t => t.time === newTask.time);
      if (conflit) {
        setError(`Conflit d'horaire ! "${conflit.title}" est déjà prévu à ${newTask.time}`);
        return;
      }
    }

    setLoading(true);
    try {
      const taskData = {
        user_id: user.id,
        date: selectedDate.toLocaleDateString('en-CA'),
        ...newTask,
        title: newTask.title.trim(),
        notes: newTask.notes.trim() || null,
        time: newTask.time || null
      };

      await tasksService.createTask(taskData);
      await loadDayTasks();
      await loadMonthTasks();
      
      setNewTask({ title: '', time: '', notes: '', priority: 'normal' });
      setShowAddTask(false);
      setSuccessMessage('Tâche ajoutée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ajout de la tâche');
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (taskId, completed) => {
    try {
    await tasksService.toggleComplete(taskId, !completed);
      await loadDayTasks();
      await loadMonthTasks();
    } catch (err) {
      console.error('Erreur toggle:', err);
    }
  };

  const deleteTask = async (taskId) => {
    setShowConfirmDelete(taskId);
  };

  const confirmDelete = async (taskId) => {
    try {
     await tasksService.deleteTask(taskId);
      await loadDayTasks();
      await loadMonthTasks();
      setShowConfirmDelete(null);
      setSuccessMessage('Tâche supprimée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      time: task.time || '',
      notes: task.notes || '',
      priority: task.priority || 'normal'
    });
    setShowAddTask(true);
  };

  const updateTask = async () => {
    setError('');
    
    if (!newTask.title.trim()) {
      setError('Le titre est requis');
      return;
    }

    // Vérifier conflit horaire (exclure la tâche en cours d'édition)
    if (newTask.time) {
      const conflit = dayTasks.find(t => t.time === newTask.time && t.id !== editingTask.id);
      if (conflit) {
        setError(`Conflit d'horaire ! "${conflit.title}" est déjà prévu à ${newTask.time}`);
        return;
      }
    }

    setLoading(true);
    try {
      const taskData = {
        title: newTask.title.trim(),
        notes: newTask.notes.trim() || null,
        time: newTask.time || null,
        priority: newTask.priority
      };

      await tasksService.updateTask(editingTask.id, taskData);
      await loadDayTasks();
      await loadMonthTasks();
      
      setNewTask({ title: '', time: '', notes: '', priority: 'normal' });
      setEditingTask(null);
      setShowAddTask(false);
      setSuccessMessage('Tâche modifiée avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification de la tâche');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setNewTask({ title: '', time: '', notes: '', priority: 'normal' });
    setEditingTask(null);
    setShowAddTask(false);
    setError('');
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasTasksOnDate = (date) => {
    if (!date) return false;
    const dateStr = date.toLocaleDateString('en-CA');
    return tasks.some(t => t.date === dateStr);
  };

  const getTaskCountForDate = (date) => {
    if (!date) return 0;
    const dateStr = date.toLocaleDateString('en-CA');
    return tasks.filter(t => t.date === dateStr).length;
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const priorityColors = {
    low: 'border-blue-200 bg-blue-50',
    normal: 'border-purple-200 bg-purple-50',
    high: 'border-red-200 bg-red-50'
  };

  const priorityBadges = {
    low: 'bg-blue-100 text-blue-700',
    normal: 'bg-purple-100 text-purple-700',
    high: 'bg-red-100 text-red-700'
  };

  const priorityLabels = {
    low: 'Basse',
    normal: 'Normale',
    high: 'Haute'
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Calendrier</h1>
        <p className="text-gray-600">Organisez vos tâches au quotidien</p>
      </div>

      {/* Indicateur de chargement initial */}
      {initialLoading && (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement du calendrier...</p>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {!initialLoading && (
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendrier */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center sm:text-left">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-3 py-2 text-xs sm:text-sm font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </button>
                </div>
              </div>

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-1 sm:py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {getDaysInMonth(currentMonth).map((date, idx) => {
                  const taskCount = getTaskCountForDate(date);
                  return (
                    <button
                      key={idx}
                      onClick={() => date && setSelectedDate(date)}
                      disabled={!date}
                      className={`
                        aspect-square rounded-lg sm:rounded-xl p-1 sm:p-2 text-xs sm:text-sm font-medium transition-all relative
                        ${!date ? 'invisible' : ''}
                        ${isToday(date) ? 'ring-2 ring-purple-400' : ''}
                        ${isSelected(date) 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                          : 'hover:bg-purple-50 text-gray-700'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-xs sm:text-sm">{date && date.getDate()}</span>
                        {taskCount > 0 && (
                          <span className={`text-xs mt-0.5 ${isSelected(date) ? 'text-white' : 'text-purple-600'}`}>
                            {taskCount}
                          </span>
                        )}
                      </div>
                      {hasTasksOnDate(date) && (
                        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected(date) ? 'bg-white' : 'bg-purple-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tâches du jour */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100 lg:sticky lg:top-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">
                    {selectedDate.toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {dayTasks.length} tâche{dayTasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddTask(true); setError(''); }}
                  className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Formulaire d'ajout/modification */}
              {showAddTask && (
                <div className="mb-6 p-4 sm:p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-3xl border border-purple-200 shadow-lg shadow-purple-100/50 backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {editingTask ? 'Modifier la tâche' : 'Ajouter une tâche'}
                  </h3>
                  <input
                    type="text"
                    placeholder="Titre de la tâche *"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-3 mb-4 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                  />
                  
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full px-4 py-3 mb-4 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                  />
                  
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-4 py-3 mb-4 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                  >
                    <option value="low">🔵 Priorité basse</option>
                    <option value="normal">🟣 Priorité normale</option>
                    <option value="high">🔴 Priorité haute</option>
                  </select>
                  
                  <textarea
                    placeholder="Notes (optionnel)"
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    className="w-full px-4 py-3 mb-4 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none resize-none text-sm text-gray-900 bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:bg-white/80"
                    rows="3"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={editingTask ? updateTask : addTask}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm"
                    >
                      {loading ? (editingTask ? 'Modification...' : 'Ajout...') : (editingTask ? 'Modifier' : 'Ajouter')}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des tâches */}
              <div className="space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-400">
                    <Calendar className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">Aucune tâche prévue</p>
                    <p className="text-xs sm:text-sm mt-1">Cliquez sur + pour ajouter</p>
                  </div>
                ) : (
                  dayTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3 sm:p-4 rounded-2xl border-2 transition-all ${
                        task.completed
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : priorityColors[task.priority] || priorityColors.normal
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleComplete(task.id, task.completed)}
                          className={`mt-1 w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            task.completed
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-500'
                              : 'border-gray-300 hover:border-purple-400'
                          }`}
                        >
                          {task.completed && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`font-semibold text-sm sm:text-base ${
                            task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}>
                              {task.title}
                            </h4>
                            {task.priority === 'high' && !task.completed && (
                              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
                            {task.time && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {task.time}
                              </div>
                            )}
                            
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadges[task.priority]}`}>
                              {priorityLabels[task.priority]}
                            </span>
                            
                            {task.blockage_reason && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <FileText className="w-3 h-3" />
                                Bloqué
                              </div>
                            )}
                          </div>
                          
                          {task.notes && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-2">{task.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditTask(task)}
                            className="p-1.5 sm:p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 sm:p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
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

      {/* Fenêtre de confirmation de suppression */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
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