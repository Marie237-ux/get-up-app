// lib/hooks/useAuth.js
'use client';

import { useState, useEffect } from 'react';
import { supabase, authService, userRolesService } from '../supabase';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Vérifier la session au chargement
    checkUser();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Récupérer le rôle de l'utilisateur
          try {
            const role = await userRolesService.getUserRole(session.user.id);
            setUserRole(role);
          } catch (err) {
            console.error('Erreur récupération rôle:', err);
            // Assigner le rôle client par défaut si aucun rôle trouvé
            if (event === 'SIGNED_IN') {
              await userRolesService.assignRole(
                session.user.id, 
                'client', 
                null, 
                session.user.email, 
                session.user.user_metadata?.name
              );
              setUserRole({ role: 'client', status: 'active' });
            }
          }
        } else {
          setUser(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const user = await authService.getCurrentUser();
      setUser(user);
      
      if (user) {
        // Récupérer le rôle de l'utilisateur
        try {
          const role = await userRolesService.getUserRole(user.id);
          setUserRole(role);
        } catch (err) {
          console.error('Erreur récupération rôle:', err);
          // Assigner le rôle client par défaut
          await userRolesService.assignRole(
            user.id, 
            'client', 
            null, 
            user.email, 
            user.user_metadata?.name
          );
          setUserRole({ role: 'client', status: 'active' });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email, password, name, phone = null) {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.signUp(email, password, name, phone);
      
      // Assigner le rôle client par défaut après l'inscription
      if (data.user) {
        await userRolesService.assignRole(
          data.user.id, 
          'client', 
          null, 
          data.user.email, 
          name
        );
      }
      
      router.push('/dashboard');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.signIn(email, password);
      
      // Vérifier si l'utilisateur n'est pas suspendu
      if (data.user) {
        const isActive = await userRolesService.isUserActive(data.user.id);
        if (!isActive) {
          throw new Error('Votre compte a été suspendu. Veuillez contacter l\'administrateur.');
        }
      }
      
      router.push('/dashboard');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      setLoading(true);
      setError(null);
      await authService.signOut();
      router.push('/login');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(updateData) {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.updateUser(updateData);
      
      if (error) {
        throw error;
      }
      
      // Mettre à jour l'état local avec les nouvelles données
      if (data.user) {
        // Récupérer l'utilisateur complet avec les métadonnées mises à jour
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        setUser(updatedUser);
      }
      
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }

  // Fonctions utilitaires pour les rôles
  const isAdmin = userRole?.role === 'admin' && userRole?.status === 'active';
  const isClient = userRole?.role === 'client' && userRole?.status === 'active';
  const isSuspended = userRole?.status === 'suspended';
  const isActive = userRole?.status === 'active';

  return {
    user,
    userRole,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateUser,
    isAdmin,
    isClient,
    isSuspended,
    isActive,
  };
}