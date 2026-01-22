
import React, { useState, useRef, useEffect } from 'react';
import { Company } from '../types';

export type AppTab = 'dashboard' | 'companies' | 'map' | 'reports';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  companies: Company[];
  upcomingContacts: Company[];
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, companies, upcomingContacts }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { id: 'dashboard' as AppTab, label: 'Dashboard', icon: '📊' },
    { id: 'companies' as AppTab, label: 'Empresas', icon: '📋' },
    { id: 'map' as AppTab, label: 'Mapa', icon: '📍' },
    { id: 'reports' as AppTab, label: 'Relatórios', icon: '📄' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F2F2F7] overflow-hidden">
      
      {/* SIDEBAR - DESKTOP ONLY */}
      <aside className="hidden md:flex w-72 bg-slate-900 text-white flex-col shadow-2xl z-50">
        <div className="p-8">
          <h1 className="text-2xl font-black flex items-center gap-3 tracking-tight">
            <span className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">🏢</span>
            PartnerHub
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 font-bold text-sm ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800/50">
          <div className="flex items-center gap-4 p-2 bg-slate-800/30 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-sm shadow-inner">AD</div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">Administrador</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Online</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* HEADER - ADAPTIVE */}
        <header className="h-16 md:h-20 ios-blur border-b border-slate-200/60 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 no-print pt-safe">
          <div className="flex flex-col">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 capitalize tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl transition-all relative ${showNotifications ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200'}`}
              >
                <span className="text-xl">🔔</span>
                {upcomingContacts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {upcomingContacts.length}
                  </span>
                )}
              </button>

              {/* IOS STYLE NOTIFICATION PANEL */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-[calc(100vw-2rem)] md:w-96 ios-blur rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-slideDown z-50 mr-[-0.5rem] md:mr-0">
                  <div className="p-5 bg-slate-50/50 border-b border-slate-200/50 flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Atenção Necessária</h4>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                    {upcomingContacts.length > 0 ? (
                      <div className="divide-y divide-slate-100/50">
                        {upcomingContacts.map(company => (
                          <div key={company.id} className="p-5 hover:bg-white/40 transition-colors cursor-pointer" onClick={() => { setActiveTab('companies'); setShowNotifications(false); }}>
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-bold text-slate-900">{company.name}</p>
                              <span className="text-[10px] font-black px-2 py-1 bg-red-100 text-red-600 rounded-lg">
                                {new Date(company.nextContactDate!).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">Resp: <span className="font-bold text-slate-700">{company.responsible}</span></p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sem pendências</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className={`flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-8 ${activeTab === 'map' ? 'p-0' : 'p-4 md:p-10'} print:p-0`}>
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>

        {/* BOTTOM NAV BAR - MOBILE ONLY (iOS Style) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 ios-blur border-t border-slate-200/50 flex justify-around items-center px-4 pb-safe pt-2 z-[100] h-20">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300 ${activeTab === item.id ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              {activeTab === item.id && <span className="w-1 h-1 bg-blue-600 rounded-full"></span>}
            </button>
          ))}
        </nav>
      </main>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
