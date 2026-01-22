
import React, { useState, useEffect, useMemo } from 'react';
import { Layout, AppTab } from './components/Layout';
import { CompanyForm } from './components/CompanyForm';
import { InteractiveMap } from './components/InteractiveMap';
import { ReportsView } from './components/ReportsView';
import { CompanyDetailsModal } from './components/CompanyDetailsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Company, DashboardStats } from './types';
import { getAIInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STORAGE_KEY = 'partner_hub_v2_cos';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partnershipManagerFilter, setPartnershipManagerFilter] = useState('');
  const [hiringManagerFilter, setHiringManagerFilter] = useState('');
  const [commissionMinFilter, setCommissionMinFilter] = useState<string>('');
  const [commissionMaxFilter, setCommissionMaxFilter] = useState<string>('');
  const [dateStartFilter, setDateStartFilter] = useState<string>('');
  const [dateEndFilter, setDateEndFilter] = useState<string>('');

  const [isPublicMode, setIsPublicMode] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'register') setIsPublicMode(true);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCompanies(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (companies.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const stats: DashboardStats = useMemo(() => {
    const totalBrokers = companies.reduce((acc, c) => acc + c.brokerCount, 0);
    return {
      totalCompanies: companies.length,
      totalBrokers,
      avgBrokers: companies.length > 0 ? Math.round(totalBrokers / companies.length) : 0,
      activePercentage: companies.length > 0 ? Math.round((companies.filter(c => c.status === 'Ativo').length / companies.length) * 100) : 0
    };
  }, [companies]);

  const upcomingContacts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return companies.filter(c => c.nextContactDate && new Date(c.nextContactDate) >= today).slice(0, 5);
  }, [companies]);

  // Extrair nomes únicos de gestores internos (Hub)
  const uniqueHiringManagers = useMemo(() => {
    const managers = companies
      .map(c => c.hiringManager)
      .filter((val, index, self) => val && self.indexOf(val) === index)
      .sort();
    return managers;
  }, [companies]);

  // Extrair nomes únicos de gestores da parceria (Externos)
  const uniquePartnershipManagers = useMemo(() => {
    const managers = companies
      .map(c => c.partnershipManager)
      .filter((val, index, self) => val && self.indexOf(val) === index)
      .sort();
    return managers;
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCommMin = commissionMinFilter === '' || c.commissionRate >= parseFloat(commissionMinFilter);
      const matchesCommMax = commissionMaxFilter === '' || c.commissionRate <= parseFloat(commissionMaxFilter);
      
      const regDate = new Date(c.registrationDate);
      const matchesDateStart = dateStartFilter === '' || regDate >= new Date(dateStartFilter);
      const matchesDateEnd = dateEndFilter === '' || regDate <= new Date(dateEndFilter);

      const matchesPartnershipManager = partnershipManagerFilter === '' || (c.partnershipManager || '').toLowerCase().includes(partnershipManagerFilter.toLowerCase());
      const matchesHiringManager = hiringManagerFilter === '' || (c.hiringManager || '').toLowerCase().includes(hiringManagerFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesCommMin && matchesCommMax && matchesDateStart && matchesDateEnd && matchesPartnershipManager && matchesHiringManager;
    });
  }, [companies, searchTerm, statusFilter, commissionMinFilter, commissionMaxFilter, dateStartFilter, dateEndFilter, partnershipManagerFilter, hiringManagerFilter]);

  const handleSaveCompany = (data: Omit<Company, 'id' | 'registrationDate'>) => {
    if (editingCompany) {
      setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...data } : c));
    } else {
      setCompanies([{ ...data, id: Math.random().toString(36).substr(2, 9), registrationDate: new Date().toISOString().split('T')[0] }, ...companies]);
    }
    setShowForm(false);
    setEditingCompany(undefined);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPartnershipManagerFilter('');
    setHiringManagerFilter('');
    setCommissionMinFilter('');
    setCommissionMaxFilter('');
    setDateStartFilter('');
    setDateEndFilter('');
  };

  const handleDuplicate = (c: Company) => {
    const duplicated: Company = { ...c, id: Math.random().toString(36).substr(2, 9), name: `${c.name} (Cópia)`, registrationDate: new Date().toISOString().split('T')[0] };
    setCompanies([duplicated, ...companies]);
  };

  const handleEdit = (c: Company) => {
    setEditingCompany(c);
    setShowForm(true);
    setActiveTab('companies');
  };

  if (isPublicMode) {
     return <div className="p-10"><CompanyForm onSave={handleSaveCompany} onCancel={() => {}} isPublic={true} /></div>;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} companies={companies} upcomingContacts={upcomingContacts}>
      
      {activeTab === 'dashboard' && (
        <div className="space-y-6 md:space-y-10 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Total Parceiros', val: stats.totalCompanies, icon: '🏢', color: 'bg-white text-slate-800' },
              { label: 'Força de Vendas', val: `${stats.totalBrokers} un`, icon: '👥', color: 'bg-white text-slate-800' },
              { label: 'Rede Ativa', val: `${stats.activePercentage}%`, icon: '⚡', color: 'bg-white text-green-600' },
              { label: 'Ticket Médio', val: stats.avgBrokers, icon: '📈', color: 'bg-blue-600 text-white' }
            ].map((s, i) => (
              <div key={i} className={`${s.color} p-6 md:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm flex flex-col justify-between h-40 md:h-48 transition-all hover:scale-[1.02] hover:shadow-xl`}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</span>
                  <span className="text-xl">{s.icon}</span>
                </div>
                <h4 className="text-3xl md:text-4xl font-black tracking-tighter">{s.val}</h4>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
            <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
               <h4 className="text-xl font-bold text-slate-900 mb-8 tracking-tight">Crescimento de Equipe por Empresa</h4>
               <div className="h-72 md:h-96">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={companies.slice(0, 8)}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                     <XAxis dataKey="name" hide />
                     <Tooltip cursor={{fill: '#F2F2F7'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                     <Bar dataKey="brokerCount" radius={[12, 12, 4, 4]} fill="#3b82f6" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white flex flex-col">
               <div className="flex justify-between items-center mb-10">
                 <h4 className="text-lg font-bold">Insights IA</h4>
                 <button 
                   onClick={async () => { setLoadingInsights(true); setAiInsights(await getAIInsights(companies)); setLoadingInsights(false); }} 
                   className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-all"
                 >
                   {loadingInsights ? '...' : '✨'}
                 </button>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar text-sm leading-relaxed text-slate-300 font-medium italic">
                 {aiInsights || "Toque no ícone acima para gerar uma análise estratégica da sua rede usando Inteligência Artificial."}
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-6 md:space-y-8 animate-fadeIn h-full">
          {!showForm ? (
            <div className="flex flex-col gap-6">
              
              {/* ADVANCED FILTERS SECTION */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {/* Row 1: Search and Status */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Busca Rápida</label>
                    <input type="text" placeholder="Nome ou CNPJ..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Status</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer font-medium text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="all">Todos</option>
                      <option value="Ativo">🟢 Ativos</option>
                      <option value="Inativo">⚪ Inativos</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest px-1 flex items-center gap-1">
                      <span>👤</span> Gestor da Parceria
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        list="partnership-managers-list"
                        placeholder="Filtrar por gestor externo..." 
                        className="w-full px-4 py-3 bg-blue-50/30 border border-blue-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm text-blue-900 placeholder:text-blue-300" 
                        value={partnershipManagerFilter} 
                        onChange={e => setPartnershipManagerFilter(e.target.value)} 
                      />
                      {partnershipManagerFilter && (
                        <button onClick={() => setPartnershipManagerFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-600 font-bold">✕</button>
                      )}
                    </div>
                    <datalist id="partnership-managers-list">
                      {uniquePartnershipManagers.map(manager => (
                        <option key={manager} value={manager} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest px-1 flex items-center gap-1 transition-colors ${hiringManagerFilter ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <span>🛡️</span> Gestor Interno (Hub)
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        list="hiring-managers-list"
                        placeholder="Nome do responsável..." 
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-sm ${hiringManagerFilter ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`} 
                        value={hiringManagerFilter} 
                        onChange={e => setHiringManagerFilter(e.target.value)} 
                      />
                      {hiringManagerFilter && (
                        <button onClick={() => setHiringManagerFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-indigo-600 font-bold">✕</button>
                      )}
                    </div>
                    <datalist id="hiring-managers-list">
                      {uniqueHiringManagers.map(manager => (
                        <option key={manager} value={manager} />
                      ))}
                    </datalist>
                  </div>

                  {/* Row 2: Commission and Dates */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Comissão (%)</label>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Mín" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm" value={commissionMinFilter} onChange={e => setCommissionMinFilter(e.target.value)} />
                      <input type="number" placeholder="Máx" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm" value={commissionMaxFilter} onChange={e => setCommissionMaxFilter(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Período de Registro</label>
                    <div className="flex gap-2 items-center">
                      <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm" value={dateStartFilter} onChange={e => setDateStartFilter(e.target.value)} />
                      <span className="text-slate-300">→</span>
                      <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm" value={dateEndFilter} onChange={e => setDateEndFilter(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={clearFilters} className="flex-1 h-[46px] bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all">
                      Limpar
                    </button>
                    <button onClick={() => setShowForm(true)} className="flex-[2] h-[46px] bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/10 hover:bg-blue-700 active:scale-[0.98] transition-all">
                      + Novo Parceiro
                    </button>
                  </div>
                </div>
              </div>

              {/* LIST - TABLE ON DESKTOP */}
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200/50 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b">
                      <th className="px-10 py-6">Parceiro</th>
                      <th className="px-10 py-6">Gestores (Ext / Int)</th>
                      <th className="px-10 py-6 text-center">Status</th>
                      <th className="px-10 py-6 text-center">Comissão</th>
                      <th className="px-10 py-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.cnpj}</p>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-xs font-bold text-slate-700">{c.partnershipManager || 'N/A'}</p>
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">{c.hiringManager}</p>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                        </td>
                        <td className="px-10 py-6 text-center font-black text-slate-600">{c.commissionRate}%</td>
                        <td className="px-10 py-6 text-right space-x-2">
                          <button onClick={() => setSelectedCompanyForDetails(c)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">👁️</button>
                          <button onClick={() => { setEditingCompany(c); setShowForm(true); }} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                        </td>
                      </tr>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center">
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum parceiro encontrado com os filtros aplicados</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="md:hidden space-y-4">
                {filteredCompanies.map(c => (
                  <div key={c.id} onClick={() => setSelectedCompanyForDetails(c)} className="bg-white p-6 rounded-[2rem] border border-slate-200/50 shadow-sm active:scale-95 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 truncate">{c.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{c.cnpj}</p>
                        <p className="text-[9px] text-blue-500 font-black mt-1 uppercase tracking-tighter">Hub: {c.hiringManager}</p>
                      </div>
                      <span className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <span className="text-xs font-bold text-slate-500">Comissão: <span className="text-blue-600">{c.commissionRate}%</span></span>
                      <span className="text-xs font-bold text-slate-500">Equipe: <span className="text-slate-900">{c.brokerCount}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pb-20 md:pb-0">
              <CompanyForm onSave={handleSaveCompany} onCancel={() => { setShowForm(false); setEditingCompany(undefined); }} initialData={editingCompany} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'map' && <InteractiveMap companies={companies} />}
      {activeTab === 'reports' && <ReportsView companies={companies} onEdit={handleEdit} onDelete={(id) => setCompanyToDelete(companies.find(c => c.id === id) || null)} onView={setSelectedCompanyForDetails} onDuplicate={handleDuplicate} />}
      
      {selectedCompanyForDetails && <CompanyDetailsModal company={selectedCompanyForDetails} onClose={() => setSelectedCompanyForDetails(null)} />}
      {companyToDelete && <DeleteConfirmationModal company={companyToDelete} onConfirm={() => { setCompanies(companies.filter(x => x.id !== companyToDelete.id)); setCompanyToDelete(null); }} onCancel={() => setCompanyToDelete(null)} />}
    </Layout>
  );
};

export default App;
