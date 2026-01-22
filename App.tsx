
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

const STORAGE_KEY = 'partner_hub_v3_desktop';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCompanies(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (companies.length >= 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    }
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
    return companies.filter(c => c.nextContactDate && new Date(c.nextContactDate) >= today)
      .sort((a,b) => new Date(a.nextContactDate!).getTime() - new Date(b.nextContactDate!).getTime())
      .slice(0, 5);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  const handleSaveCompany = (data: Omit<Company, 'id' | 'registrationDate'>) => {
    if (editingCompany) {
      setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...data } : c));
    } else {
      setCompanies([{ ...data, id: Math.random().toString(36).substr(2, 9), registrationDate: new Date().toISOString().split('T')[0] }, ...companies]);
    }
    setShowForm(false);
    setEditingCompany(undefined);
  };

  const handleEdit = (c: Company) => {
    setEditingCompany(c);
    setShowForm(true);
    setActiveTab('companies');
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} companies={companies} upcomingContacts={upcomingContacts}>
      
      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-fadeIn">
          {/* Stats Hub */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Rede de Parceiros', val: stats.totalCompanies, icon: '🏢', sub: 'Empresas cadastradas' },
              { label: 'Força de Vendas', val: stats.totalBrokers, icon: '👥', sub: 'Total de corretores' },
              { label: 'Equipe Média', val: stats.avgBrokers, icon: '📊', sub: 'Corretores por empresa' },
              { label: 'Taxa de Atividade', val: `${stats.activePercentage}%`, icon: '⚡', sub: 'Status "Ativo"', color: 'text-green-600' }
            ].map((s, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl p-3 bg-slate-50 rounded-2xl shadow-inner">{s.icon}</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{s.label}</span>
                </div>
                <h4 className={`text-4xl font-black tracking-tighter ${s.color || 'text-slate-900'}`}>{s.val}</h4>
                <p className="text-xs text-slate-400 font-medium mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-10">
                 <h4 className="text-xl font-bold text-slate-900 tracking-tight">Top Parceiros por Volume</h4>
                 <div className="flex gap-2">
                   <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                   <span className="text-[10px] font-black text-slate-400 uppercase">Quantidade de Corretores</span>
                 </div>
               </div>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={companies.slice(0, 10)}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" hide />
                     <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)'}} cursor={{fill: '#f8fafc'}} />
                     <Bar dataKey="brokerCount" radius={[12, 12, 4, 4]} fill="#2563eb" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* AI Insights & Actions */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl text-white flex-1 flex flex-col relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-blue-600/20 transition-all"></div>
                 <div className="flex justify-between items-center mb-8 relative z-10">
                   <h4 className="text-lg font-bold">Consultoria IA</h4>
                   <button 
                     onClick={async () => { setLoadingInsights(true); setAiInsights(await getAIInsights(companies)); setLoadingInsights(false); }} 
                     className={`w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-all ${loadingInsights ? 'animate-pulse' : ''}`}
                   >
                     {loadingInsights ? '⏳' : '✨'}
                   </button>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar text-sm leading-relaxed text-slate-300 font-medium italic relative z-10">
                   {aiInsights || "Solicite uma análise estratégica da sua rede de parceiros baseada em corretores, taxas e histórico."}
                 </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-3">
                 <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Atalhos de Gestão</h5>
                 <button onClick={() => setShowForm(true)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">+ Novo Cadastro</button>
                 <button onClick={() => setActiveTab('reports')} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Gerar Relatórios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-8 animate-fadeIn h-full">
          {!showForm ? (
            <div className="flex flex-col gap-8">
              {/* Filters */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Busca Direta</label>
                  <input type="text" placeholder="Pesquisar por nome, CNPJ ou CRECI..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="w-full md:w-48 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Status</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-sm appearance-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Todos</option>
                    <option value="Ativo">Ativos</option>
                    <option value="Inativo">Inativos</option>
                  </select>
                </div>
                <button onClick={() => setShowForm(true)} className="h-14 px-8 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/10 hover:bg-blue-700 transition-all">+ Adicionar Parceiro</button>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b">
                      <th className="px-10 py-6">Empresa / Parceiro</th>
                      <th className="px-10 py-6">Identificação</th>
                      <th className="px-10 py-6 text-center">Status</th>
                      <th className="px-10 py-6 text-center">Comissão</th>
                      <th className="px-10 py-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-6">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-xs">{c.address}</p>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-xs font-black text-slate-700 font-mono">{c.cnpj}</p>
                          <p className="text-[9px] text-blue-500 font-black uppercase">{c.docType}</p>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                        </td>
                        <td className="px-10 py-6 text-center font-black text-slate-600">{c.commissionRate}%</td>
                        <td className="px-10 py-6 text-right space-x-2">
                          <button onClick={() => setSelectedCompanyForDetails(c)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">👁️</button>
                          <button onClick={() => { setEditingCompany(c); setShowForm(true); }} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">✏️</button>
                        </td>
                      </tr>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <span className="text-6xl">🔍</span>
                            <p className="font-black uppercase tracking-widest text-xs">Nenhum parceiro encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <CompanyForm onSave={handleSaveCompany} onCancel={() => { setShowForm(false); setEditingCompany(undefined); }} initialData={editingCompany} />
          )}
        </div>
      )}

      {activeTab === 'map' && <InteractiveMap companies={companies} />}
      {activeTab === 'reports' && <ReportsView companies={companies} onEdit={handleEdit} onDelete={(id) => setCompanyToDelete(companies.find(c => c.id === id) || null)} onView={setSelectedCompanyForDetails} onDuplicate={(c) => setCompanies([{...c, id: Math.random().toString(36).substr(2, 9), name: `${c.name} (Cópia)`}, ...companies])} />}
      
      {selectedCompanyForDetails && <CompanyDetailsModal company={selectedCompanyForDetails} onClose={() => setSelectedCompanyForDetails(null)} />}
      {companyToDelete && <DeleteConfirmationModal company={companyToDelete} onConfirm={() => { setCompanies(companies.filter(x => x.id !== companyToDelete.id)); setCompanyToDelete(null); }} onCancel={() => setCompanyToDelete(null)} />}
    </Layout>
  );
};

export default App;
