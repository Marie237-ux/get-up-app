// app/dashboard/daily-review/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { tasksService, reviewsService } from '@/lib/supabase';
import { TrendingUp, Check, X, Smile, Meh, Frown, AlertTriangle, ChevronLeft, ChevronRight, Save } from 'lucide-react';

export default function DailyReviewPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [review, setReview] = useState({
    mood: '',
    notes: '',
    achievements: '',
    improvements: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user && selectedDate) {
      loadDayData();
    }
  }, [user, selectedDate]);

  const loadDayData = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Charger les tâches
      const tasksData = await tasksService.getTasksByDate(user.id, dateStr);
      setTasks(tasksData || []);

      // Charger le bilan existant
      const reviewData = await reviewsService.getReview(user.id, dateStr);
      if (reviewData) {
        setReview({
          mood: reviewData.mood || '',
          notes: reviewData.notes || '',
          achievements: reviewData.achievements || '',
          improvements: reviewData.improvements || ''
        });
      } else {
        setReview({
          mood: '',
          notes: '',
          achievements: '',
          improvements: ''
        });
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    }
  };

  const saveReview = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await reviewsService.upsertReview({
        user_id: user.id,
        date: dateStr,
        ...review
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde bilan:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const highPriorityTasks = tasks.filter(t => t.priority === 'high');
  const completedHighPriority = highPriorityTasks.filter(t => t.completed).length;
  const blockedTasks = tasks.filter(t => t.blockage_reason);

  const moods = [
    { value: 'great', label: 'Excellent', icon: '😄', color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'good', label: 'Bien', icon: '🙂', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'okay', label: 'Moyen', icon: '😐', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'bad', label: 'Difficile', icon: '😞', color: 'bg-red-100 text-red-700 border-red-300' }
  ];

  const getMoodButtonClass = (isSelected, moodColor) => {
    if (isSelected) {
      return moodColor + ' border-current shadow-lg scale-105';
    }
    return 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900';
  };

  return (
    <div>
      {/* Header avec navigation de date */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Bilan du jour</h1>
            <p className="text-gray-600">Révisez votre journée et planifiez demain</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-purple-600" />
            </button>
            
            <div className="px-6 py-3 bg-white/80 backdrop-blur-lg rounded-xl border border-purple-100 font-medium text-gray-800">
              {selectedDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
              })}
            </div>
            
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>
            
            {!isToday() && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
              >
                Aujourd'hui
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Tâches totales</span>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold">{totalTasks}</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{completedTasks} / {totalTasks}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Taux de réussite</span>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-800">{completionRate}%</p>
            <div className="flex-1">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Priorités hautes</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {completedHighPriority} / {highPriorityTasks.length}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Tâches bloquées</span>
            <X className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{blockedTasks.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Liste des tâches */}
        <div>
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Résumé des tâches</h2>
            
            {totalTasks === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune tâche prévue ce jour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Tâches complétées */}
                {completedTasks > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Complétées ({completedTasks})
                    </h3>
                    <div className="space-y-2">
                      {tasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="p-3 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-700 line-through">{task.title}</p>
                              {task.time && (
                                <p className="text-xs text-gray-500 mt-1">{task.time}</p>
                              )}
                            </div>
                            {task.priority === 'high' && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                Haute
                              </span>
                            )}
                            {task.blockage_reason && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                Bloqué
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tâches non complétées */}
                {pendingTasks > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Non complétées ({pendingTasks})
                    </h3>
                    <div className="space-y-2">
                      {tasks.filter(t => !t.completed).map(task => (
                        <div key={task.id} className="p-3 bg-red-50 border border-red-200 rounded-xl">
                          <div className="flex items-start gap-2">
                            <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-700">{task.title}</p>
                              {task.time && (
                                <p className="text-xs text-gray-500 mt-1">{task.time}</p>
                              )}
                              {task.blockage_reason && (
                                <p className="text-xs text-orange-600 mt-1 italic">
                                  Raison: {task.blockage_reason}
                                </p>
                              )}
                            </div>
                            {task.priority === 'high' && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                Haute
                              </span>
                            )}
                            {task.blockage_reason && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                Bloqué
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bilan personnel */}
        <div>
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Mon bilan</h2>
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Sauvegardé
                </span>
              )}
            </div>

            <div className="space-y-6">
              {/* Humeur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Comment s'est passée ma journée ?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {moods.map(mood => (
                    <button
                      key={mood.value}
                      onClick={() => setReview({ ...review, mood: mood.value })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        getMoodButtonClass(review.mood === mood.value, mood.color)
                      }`}
                    >
                      <div className="text-3xl mb-2">{mood.icon}</div>
                      <div className="text-sm font-medium">{mood.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Réussites */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mes réussites du jour 🎉
                </label>
                <textarea
                  value={review.achievements}
                  onChange={(e) => setReview({ ...review, achievements: e.target.value })}
                  placeholder="Qu'est-ce que j'ai bien fait aujourd'hui ? De quoi suis-je fier ?"
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none placeholder-gray-900 text-gray-900"
                  rows="3"
                />
              </div>

              {/* Points d'amélioration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points d'amélioration 💡
                </label>
                <textarea
                  value={review.improvements}
                  onChange={(e) => setReview({ ...review, improvements: e.target.value })}
                  placeholder="Que puis-je améliorer demain ?"
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none placeholder-gray-900 text-gray-900"
                  rows="3"
                />
              </div>

              {/* Notes générales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes générales 📝
                </label>
                <textarea
                  value={review.notes}
                  onChange={(e) => setReview({ ...review, notes: e.target.value })}
                  placeholder="Autres réflexions, pensées, ou observations..."
                  className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none resize-none placeholder-gray-900 text-gray-900"
                  rows="4"
                />
              </div>

              {/* Bouton sauvegarder */}
              <button
                onClick={saveReview}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Sauvegarde...' : 'Sauvegarder le bilan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
