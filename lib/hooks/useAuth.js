// lib/hooks/useAuth.js
'use client';

import { useState, useEffect } from 'react';
import { supabase, authService, userRolesService } from '../supabase';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
    console.log(' [Auth] Début checkUser');
    const startTime = Date.now();
    
    try {
      console.log(' [Auth] Appel getCurrentUser...');
      const user = await authService.getCurrentUser();
      console.log(' [Auth] getCurrentUser terminé en', Date.now() - startTime, 'ms');
      
      setUser(user);
      
      if (user) {
        console.log(' [Auth] Utilisateur trouvé, récupération rapide du rôle...');
        
        // Récupération du rôle en parallèle avec timeout plus court
        try {
          const role = await Promise.race([
            userRolesService.getUserRole(user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout getUserRole')), 2000) // Réduit à 2 secondes
            )
          ]);
          console.log(' [Auth] Rôle récupéré en', Date.now() - startTime, 'ms');
          setUserRole(role);
        } catch (roleError) {
          console.error(' [Auth] Erreur récupération rôle:', roleError);
          
          // Assigner le rôle par défaut immédiatement sans attendre
          setUserRole({ role: 'client', status: 'active' });
          
          // Tenter l'assignation en arrière-plan
          if (roleError.message !== 'Timeout getUserRole') {
            console.log(' [Auth] Erreur rôle, assignation par défaut...');
          } else {
            console.log(' [Auth] Timeout, assignation par défaut...');
          }
          
          // Assignation en arrière-plan (non bloquant)
          userRolesService.assignRole(
            user.id, 
            'client', 
            null, 
            user.email, 
            user.user_metadata?.name
          ).catch(assignError => {
            console.error(' [Auth] Erreur assignation async:', assignError);
          });
        }
      }
    } catch (err) {
      console.error(' [Auth] Erreur checkUser:', err);
      setError(err.message);
    } finally {
      console.log(' [Auth] checkUser terminé en', Date.now() - startTime, 'ms');
      setLoading(false);
    }
  }

  async function signUp(email, password, name, phone = null) {
    try {
      setActionLoading(true);
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
      setActionLoading(false);
    }
  }

  async function signIn(email, password) {
    console.log(' [Auth] Début signIn pour:', email);
    const startTime = Date.now();
    
    try {
      setActionLoading(true);
      setError(null);
      
      console.log(' [Auth] Appel authService.signIn...');
      const signInStartTime = Date.now();
      const data = await authService.signIn(email, password);
      console.log(' [Auth] authService.signIn terminé en', Date.now() - signInStartTime, 'ms');
      
      // Vérifier si l'utilisateur n'est pas suspendu (avec timeout)
      if (data.user) {
        console.log(' [Auth] Vérification statut utilisateur...');
        const statusStartTime = Date.now();
        
        try {
          const isActive = await Promise.race([
            userRolesService.isUserActive(data.user.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout isUserActive')), 3000)
            )
          ]);
          
          console.log(' [Auth] Statut vérifié en', Date.now() - statusStartTime, 'ms');
          
          if (!isActive) {
            throw new Error('Votre compte a été suspendu. Veuillez contacter l\'administrateur.');
          }
        } catch (statusError) {
          console.error(' [Auth] Erreur vérification statut:', statusError);
          if (statusError.message === 'Timeout isUserActive') {
            console.log(' [Auth] Timeout statut, continuation par défaut...');
            // Continuer si timeout - considérer comme actif par défaut
          } else {
            // Si autre erreur, continuer aussi pour éviter de bloquer
            console.log(' [Auth] Erreur statut, continuation...');
          }
        }
      }
      
      console.log(' [Auth] Redirection vers dashboard...');
      router.push('/dashboard');
      
      console.log(' [Auth] signIn terminé en', Date.now() - startTime, 'ms');
      return data;
    } catch (err) {
      console.error(' [Auth] Erreur signIn:', err);
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }

  async function signOut() {
    try {
      setActionLoading(true);
      setError(null);
      await authService.signOut();
      router.push('/login');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }

  async function updateUser(updateData) {
    try {
      setActionLoading(true);
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
      setActionLoading(false);
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
    actionLoading,
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