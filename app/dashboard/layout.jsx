// app/dashboard/layout.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  Target, 
  DollarSign, 
  BarChart3, 
  FileText, 
  AlertTriangle,
  Menu,
  X,
  LogOut,
  User,
  Home,
  Settings,
  CreditCard,
  Shield
} from 'lucide-react';

const navigation = [
  { name: 'Accueil', href: '/dashboard', icon: Home },
  { name: 'Calendrier', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Objectifs', href: '/dashboard/goals', icon: Target },
  { name: 'Transactions', href: '/dashboard/expenses', icon: DollarSign },
  { name: 'Dettes', href: '/dashboard/debts', icon: CreditCard },
  { name: 'Bilan du jour', href: '/dashboard/daily-review', icon: FileText },
  { name: 'Rapports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Blocages', href: '/dashboard/blockages', icon: AlertTriangle },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }) {
  const { user, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    checkMobile();
    handleScroll();
    
    window.addEventListener('resize', checkMobile);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex">
      {/* Sidebar pour desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-xl border-r border-purple-100 shadow-2xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative lg:inset-0 lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-purple-100">
            <Link href="/dashboard" className="flex items-center justify-center group">
              <div className="relative transform transition-all duration-300 group-hover:scale-105">
                <img 
                  src="/logo 1.png" 
                  alt="GetUp Logo" 
                  className="w-64 h-16 object-contain drop-shadow-lg rounded-lg border border-purple-100 bg-white/50 backdrop-blur-sm" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-lg pointer-events-none" />
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group
                    ${isActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-600'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
            
          {/* User info et déconnexion (mobile only) */}
          <div className="lg:hidden p-4 border-t border-purple-100">
            <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.user_metadata?.name || user?.email || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay pour mobile */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`sticky top-0 z-30 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/60 backdrop-blur-xl border-b border-purple-100/50 shadow-sm' 
            : 'bg-white/80 backdrop-blur-xl border-b border-purple-100 shadow-sm'
        }`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Bouton menu mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Titre de la page */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-lg font-semibold text-gray-800">
                  {navigation.find(item => item.href === pathname)?.name || 'GetUp'}
                </h1>
              </div>

              {/* Infos utilisateur et déconnexion */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Utilisateur'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                  title="Déconnexion"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
