// app/(auth)/login/page.jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { Calendar, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    try {
      await signIn(email, password);
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(err.message || 'Email ou mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-purple-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo 2.png" alt="GetUp Logo" className="w-24 h-24 mx-auto mb-4 rounded-2xl border border-gray-200" />
            <p className="text-gray-600">Connectez-vous à votre compte</p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all text-gray-900"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all text-gray-900"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </div>

          {/* Lien inscription */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link
              href="/signup"
              className="text-purple-600 font-medium hover:underline"
            >
              Créez-en un gratuitement
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          GetUp © 2026 - Organisez votre année avec style
        </p>
      </div>
    </div>
  );
}