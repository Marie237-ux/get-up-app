// app/dashboard/settings/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { User, Mail, Lock, Save, Camera, X } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (user) {
      // Load user data from database
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // First try to get from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (userData && userData.name) {
        setFormData(prev => ({
          ...prev,
          name: userData.name,
          email: user?.email || ''
        }));
      } else {
        // Fallback to metadata if no data in users table
        setFormData(prev => ({
          ...prev,
          name: user?.user_metadata?.name || '',
          email: user?.email || ''
        }));
      }
    } catch (error) {
      // Fallback to metadata on error
      setFormData(prev => ({
        ...prev,
        name: user?.user_metadata?.name || '',
        email: user?.email || ''
      }));
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Update auth metadata
      const updateData = {
        user_metadata: {
          name: formData.name.trim()
        }
      };

      const { error } = await updateUser(updateData);
      
      if (error) {
        showMessage(error.message, 'error');
        return;
      }

      // Also update the users table
      try {
        const { error: tableError } = await supabase
          .from('users')
          .update({ name: formData.name.trim() })
          .eq('id', user.id);

        if (tableError) {
          console.warn('Could not update users table:', tableError);
        }
      } catch (tableErr) {
        console.warn('Error updating users table:', tableErr);
      }
      
      showMessage('Profil mis à jour avec succès !', 'success');
    } catch (error) {
      showMessage('Erreur lors de la mise à jour du profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showMessage('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (formData.newPassword.length < 6) {
      showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }

    setLoading(true);
    
    try {
      // Note: Supabase n'a pas de méthode directe pour changer le mot de passe
      // Vous devrez implémenter cette fonctionnalité côté serveur
      showMessage('La fonctionnalité de changement de mot de passe sera bientôt disponible', 'info');
    } catch (error) {
      showMessage('Erreur lors de la mise à jour du mot de passe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage('L\'image ne doit pas dépasser 2MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Paramètres</h1>
        <p className="text-gray-600">Gérez vos informations personnelles</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          messageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {messageType === 'success' && <Save className="w-5 h-5" />}
          {messageType === 'error' && <X className="w-5 h-5" />}
          <span>{message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-1 gap-6 sm:gap-8">
        {/* Informations personnelles */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Informations personnelles</h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                    placeholder="Votre nom"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  L'email ne peut pas être modifié pour des raisons de sécurité
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </button>
            </form>
          </div>

          {/* Mot de passe */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-purple-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Mot de passe</h2>
            
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                    placeholder="Nouveau mot de passe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-900"
                    placeholder="Confirmer le mot de passe"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </div>
  
  );
}
