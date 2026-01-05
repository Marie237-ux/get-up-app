// app/dashboard/reports/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { tasksService, goalsService, statsService } from '@/lib/supabase';
import { BarChart3, TrendingUp, Target, CheckCircle, XCircle, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [stats, setStats] = useState(null);
  const [goalsProgress, setGoalsProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, period, customStart, customEnd]);

  const loadStats = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      const today = new Date();

      if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (period === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
      } else if (period === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
      } else {
        setLoading(false);
        return;
      }

      const statsData = await statsService.getGeneralStats(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const goalsData = await statsService.getGoalsProgress(user.id);

      setStats(statsData);
      setGoalsProgress(goalsData);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    const today = new Date();
    if (period === 'month') {
      return `${today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    } else if (period === 'year') {
      return `Année ${today.getFullYear()}`;
    } else if (period === 'custom' && customStart && customEnd) {
      return `${new Date(customStart).toLocaleDateString('fr-FR')} - ${new Date(customEnd).toLocaleDateString('fr-FR')}`;
    }
    return 'Sélectionnez une période';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Rapports & Statistiques</h1>
        <p className="text-gray-600">Analysez votre progression et vos performances</p>
      </div>

      {/* Sélecteur de période */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                period === 'month'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                period === 'year'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cette année
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                period === 'custom'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Personnalisé
            </button>
          </div>

          {period === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto lg:flex-1">
              <div className="flex-1 lg:min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900 placeholder-gray-900"
                />
              </div>
              <div className="flex-1 lg:min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900 placeholder-gray-900"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
          <p className="text-center font-medium text-gray-700">
            📊 Période analysée : <span className="text-purple-600">{getPeriodLabel()}</span>
          </p>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Tâches totales</span>
                <CalendarIcon className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">{stats.completed} complétées</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Taux de réussite</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{stats.completionRate.toFixed(1)}%</p>
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Priorités hautes</span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {stats.completedHighPriority}/{stats.highPriority}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <span>{stats.highPriorityRate.toFixed(1)}% complété</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Tâches bloquées</span>
                <XCircle className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{stats.withBlockage}</p>
              <div className="mt-2 text-sm text-gray-600">
                {stats.total > 0 ? ((stats.withBlockage / stats.total) * 100).toFixed(1) : 0}% du total
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Performance générale */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Performance générale</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { name: 'Complétées', value: stats.completed, fill: '#10b981' },
                    { name: 'En attente', value: stats.pending, fill: '#f59e0b' },
                    { name: 'Bloquées', value: stats.withBlockage, fill: '#ef4444' }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par priorité */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Répartition par priorité</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { name: 'Haute', completed: stats.completedHighPriority, total: stats.highPriority, fill: '#ef4444' },
                    { name: 'Normale', completed: stats.completed - stats.completedHighPriority, total: stats.total - stats.highPriority, fill: '#8b5cf6' }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Complétées" fill="#10b981" />
                  <Bar dataKey="total" name="Total" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Objectifs annuels */}
          {goalsProgress && (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Progression des objectifs annuels</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700 mb-1">Objectifs totaux</p>
                  <p className="text-3xl font-bold text-blue-900">{goalsProgress.total}</p>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <p className="text-sm text-green-700 mb-1">Complétés</p>
                  <p className="text-3xl font-bold text-green-900">{goalsProgress.completed}</p>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl">
                  <p className="text-sm text-yellow-700 mb-1">En cours</p>
                  <p className="text-3xl font-bold text-yellow-900">{goalsProgress.inProgress}</p>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <p className="text-sm text-purple-700 mb-1">Progression moyenne</p>
                  <p className="text-3xl font-bold text-purple-900">{goalsProgress.avgProgress.toFixed(0)}%</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">Progression globale</span>
                  <span className="font-bold text-purple-600">{goalsProgress.avgProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-4 bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${goalsProgress.avgProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  {goalsProgress.total > 0 && (
                    <>
                      Vous avez complété <strong>{goalsProgress.completed}</strong> objectif(s) sur <strong>{goalsProgress.total}</strong>.
                      {goalsProgress.avgProgress < 50 ? ' Continuez vos efforts ! 💪' : 
                       goalsProgress.avgProgress < 80 ? ' Vous êtes sur la bonne voie ! 🎯' : 
                       ' Excellent travail ! 🎉'}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Insights et recommandations */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">💡 Insights & Recommandations</h3>
            
            <div className="space-y-4">
              {stats.completionRate >= 80 && (
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-green-900">Excellente performance !</p>
                    <p className="text-sm text-green-700">
                      Vous maintenez un taux de réussite exceptionnel de {stats.completionRate.toFixed(1)}%. Continuez ainsi !
                    </p>
                  </div>
                </div>
              )}

              {stats.completionRate < 50 && stats.total > 0 && (
                <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-900">Marge d'amélioration</p>
                    <p className="text-sm text-yellow-700">
                      Votre taux de réussite est de {stats.completionRate.toFixed(1)}%. Essayez de prioriser les tâches importantes et d'être plus réaliste dans vos planifications.
                    </p>
                  </div>
                </div>
              )}

              {stats.withBlockage > stats.total * 0.2 && stats.total > 0 && (
                <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900">Attention aux blocages</p>
                    <p className="text-sm text-orange-700">
                      {stats.withBlockage} tâche(s) ont été bloquées. Identifiez les obstacles récurrents et cherchez des solutions durables.
                    </p>
                  </div>
                </div>
              )}

              {stats.highPriorityRate < 70 && stats.highPriority > 0 && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">Priorisez les tâches importantes</p>
                    <p className="text-sm text-red-700">
                      Seulement {stats.highPriorityRate.toFixed(1)}% de vos tâches prioritaires sont complétées. Concentrez-vous sur l'essentiel.
                    </p>
                  </div>
                </div>
              )}

              {goalsProgress && goalsProgress.avgProgress > 0 && goalsProgress.avgProgress < 30 && (
                <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-purple-900">Accélérez vos objectifs</p>
                    <p className="text-sm text-purple-700">
                      Vos objectifs annuels progressent à {goalsProgress.avgProgress.toFixed(0)}%. Définissez des actions concrètes pour avancer plus vite.
                    </p>
                  </div>
                </div>
              )}

              {stats.total === 0 && (
                <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-900">Commencez à planifier</p>
                    <p className="text-sm text-blue-700">
                      Aucune tâche sur cette période. Commencez à planifier vos journées pour améliorer votre productivité !
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}