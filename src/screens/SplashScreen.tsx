import React, { useEffect } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center cursor-pointer select-none animate-in fade-in duration-300"
    >
      <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-wider">FORMVAULT</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Offline Document Vault &amp; Toolkit
          </p>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono mt-4">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% On-Device • Zero Cloud Dependency</span>
        </div>
      </div>
    </div>
  );
};
