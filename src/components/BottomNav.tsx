import React from 'react';
import { Home, FolderClosed, Wrench, Users, Settings } from 'lucide-react';
import { NavScreen } from '../types';

interface BottomNavProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  vaultCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, vaultCount }) => {
  const navItems: { id: NavScreen; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'vault', label: 'My Vault', icon: <FolderClosed className="w-5 h-5" />, badge: vaultCount },
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-5 h-5" /> },
    { id: 'profiles', label: 'Profiles', icon: <Users className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-all duration-150 group"
            >
              {/* Material 3 active pill pill indicator */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              >
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center leading-4">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  isActive
                    ? 'font-bold text-blue-700 dark:text-blue-300'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
