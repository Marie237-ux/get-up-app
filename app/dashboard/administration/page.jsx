'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { userRolesService } from '@/lib/supabase';
import { Shield, Users, UserCheck, UserX, Search, Mail, Calendar } from 'lucide-react';

export default function AdministrationPage() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await userRolesService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      setActionLoading(userId);
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await userRolesService.updateUserStatus(userId, newStatus, user.id);
      
      // Mettre à jour la liste locale
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId 
            ? { ...u, status: newStatus }
            : u
        )
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-black">Administration</h1>
        </div>
        <p className="text-black">Gérez les utilisateurs et leurs permissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border border-purple-100">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-black">{users.length}</p>
              <p className="text-sm text-black">Total utilisateurs</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-green-100">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-black">
                {users.filter(u => u.status === 'active').length}
              </p>
              <p className="text-sm text-black">Actifs</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-red-100">
          <div className="flex items-center gap-3">
            <UserX className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-black">
                {users.filter(u => u.status === 'suspended').length}
              </p>
              <p className="text-sm text-black">Suspendus</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-purple-100">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-black">
                {users.filter(u => u.role === 'admin').length}
              </p>
              <p className="text-sm text-black">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-6 border border-purple-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par email ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-black placeholder:text-gray-500"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-black">Chargement des utilisateurs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'inscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {(user.name && user.name !== 'Nom non disponible') ? user.name[0].toUpperCase() : user.user_id.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black">
                            {user.name || `Utilisateur ${user.user_id.slice(0, 8)}...`}
                          </p>
                          <p className="text-sm text-black flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email || `ID: ${user.user_id.slice(0, 8)}...`}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Client'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-black">
                        <Calendar className="w-3 h-3" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user.user_id, user.status)}
                        disabled={actionLoading === user.user_id || user.user_id === user.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          user.status === 'active'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } ${
                          actionLoading === user.user_id || user.user_id === user.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        {actionLoading === user.user_id ? (
                          <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                        ) : user.status === 'active' ? (
                          <UserX className="w-3 h-3" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        {user.status === 'active' ? 'Suspendre' : 'Réactiver'}
                      </button>
                      
                      {user.user_id === user.id && (
                        <p className="text-xs text-gray-400 mt-1">Votre compte</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && !loading && (
              <div className="p-8 text-center text-black">
                Aucun utilisateur trouvé pour les critères de recherche.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
