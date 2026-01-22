
import React, { useState, useEffect } from 'react';
import { Company, ContactHistoryEntry } from '../types';

interface CompanyFormProps {
  onSave: (company: Omit<Company, 'id' | 'registrationDate'>) => void;
  onCancel: () => void;
  initialData?: Company;
  isPublic?: boolean;
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CONTACT_TYPES = ['Telefone', 'WhatsApp', 'E-mail', 'Reunião', 'Vídeo'] as const;

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSave, onCancel, initialData, isPublic = false }) => {
  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'CRECI'>(initialData?.docType || 'CNPJ');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cnpj: initialData?.cnpj || '',
    creci: initialData?.creci || '',
    creciUF: initialData?.creciUF || '',
    cep: initialData?.cep || '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    responsible: initialData?.responsible || '',
    partnershipManager: initialData?.partnershipManager || '',
    hiringManager: initialData?.hiringManager || (isPublic ? 'Auto-Cadastro' : ''),
    brokerCount: initialData?.brokerCount || 0,
    commissionRate: initialData?.commissionRate || 5,
    status: initialData?.status || 'Ativo',
    notes: initialData?.notes || '',
    contactHistory: initialData?.contactHistory || [] as ContactHistoryEntry[],
    location: initialData?.location || { lat: -23.5505, lng: -46.6333 },
    lastContactDate: initialData?.lastContactDate || '',
    lastContactType: initialData?.lastContactType || '' as any,
    contactSummary: initialData?.contactSummary || '',
    nextContactDate: initialData?.nextContactDate || '',
  });

  const [isSearchingDoc, setIsSearchingDoc] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [highlightFields, setHighlightFields] = useState(false);

  useEffect(() => {
    if (initialData?.address) {
      const parts = initialData.address.split(' - ');
      const main = parts[0]?.split(', ') || [];
      const cityState = parts[parts.length - 1]?.split('/') || [];
      setFormData(prev => ({
        ...prev,
        street: main[0] || '',
        number: main[1] || '',
        neighborhood: parts[1] || '',
        city: cityState[0] || '',
        state: cityState[1] || '',
        complement: parts.length > 3 ? parts[2] : ''
      }));
    }
  }, [initialData]);

  const maskCNPJ = (v: string) => v.replace(/\D/g, "").substring(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  const maskCEP = (v: string) => v.replace(/\D/g, "").substring(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
  const maskPhone = (v: string) => v.replace(/\D/g, "").substring(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");

  const handleDocLookup = async () => {
    if (docType !== 'CNPJ') return;
    const clean = formData.cnpj.replace(/\D/g, '');
    if (clean.length !== 14) { setDocError("CNPJ incompleto."); return; }
    
    setIsSearchingDoc(true);
    setDocError(null);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (resp.ok) {
        const data = await resp.json();
        setFormData(prev => ({
          ...prev,
          name: data.razao_social || data.nome_fantasia || prev.name,
          cep: maskCEP(data.cep || ''),
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.municipio || '',
          state: data.uf || '',
          number: data.numero || '',
        }));
        setDocSuccess(true);
        setHighlightFields(true);
        setTimeout(() => setHighlightFields(false), 2000);
      } else { setDocError("CNPJ não encontrado."); }
    } catch (e) { setDocError("Erro de conexão."); }
    finally { setIsSearchingDoc(false); }
  };

  const handleCEPLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
      }
    } catch (e) {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.lastContactDate && formData.nextContactDate) {
      if (new Date(formData.nextContactDate) <= new Date(formData.lastContactDate)) {
        setDateError("A data de follow-up deve ser após o último contato.");
        return;
      }
    }
    const fullAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''} - ${formData.neighborhood} - ${formData.city}/${formData.state}`;
    const { street, number, neighborhood, city, state, complement, ...rest } = formData;
    
    onSave({ 
      ...rest, 
      address: fullAddress, 
      docType: docType,
      cnpj: docType === 'CRECI' ? formData.creci : formData.cnpj 
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-200/60 w-full max-w-2xl mx-auto animate-fadeIn overflow-y-auto max-h-[90vh] no-scrollbar">
      <header className="mb-10 text-center md:text-left">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-3">
          <span className="bg-blue-600 text-white p-2 rounded-xl text-lg shadow-lg">🚀</span>
          {initialData ? 'Editar Parceiro' : 'Novo Credenciamento'}
        </h3>
        <p className="text-sm text-slate-400 font-medium mt-1">Preencha os dados estratégicos da parceria.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
          {(['CNPJ', 'CPF', 'CRECI'] as const).map(type => (
            <button key={type} type="button" onClick={() => { setDocType(type); setDocSuccess(false); setDocError(null); }} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${docType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{type}</button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Identificação ({docType})</label>
          <div className="flex gap-3">
            {docType === 'CRECI' ? (
              <div className="flex flex-1 gap-3">
                <input required className="flex-[2] h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={formData.creci} onChange={e => setFormData({...formData, creci: e.target.value})} placeholder="Registro (Ex: 12345-J)" />
                <select required className="flex-1 h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={formData.creciUF} onChange={e => setFormData({...formData, creciUF: e.target.value})}>
                  <option value="">UF</option>
                  {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            ) : (
              <div className="relative flex-1">
                <input required className={`w-full h-14 pl-5 pr-12 bg-slate-50 border rounded-2xl outline-none focus:ring-4 transition-all font-bold ${docSuccess ? 'border-emerald-500 ring-emerald-500/10 text-emerald-900' : (docError ? 'border-red-500 ring-red-500/10' : 'border-slate-200 focus:border-blue-500/50')}`} value={formData.cnpj} onChange={(e) => { const v = docType === 'CNPJ' ? maskCNPJ(e.target.value) : e.target.value; setDocError(null); setDocSuccess(false); setFormData({ ...formData, cnpj: v }); }} placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"} />
                {isSearchingDoc && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                {docSuccess && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 text-xl animate-bounceIn">✓</span>}
              </div>
            )}
            {docType === 'CNPJ' && (
              <button type="button" onClick={handleDocLookup} disabled={isSearchingDoc || formData.cnpj.length < 18} className="h-14 px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all">Validar</button>
            )}
          </div>
          {docError && <p className="text-[10px] text-red-500 font-bold px-1 uppercase animate-shake">⚠️ {docError}</p>}
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome / Razão Social</label>
          <input required className={`w-full h-14 px-5 bg-slate-50 border rounded-2xl outline-none focus:ring-4 transition-all font-bold ${highlightFields ? 'ring-4 ring-blue-500/20 border-blue-500 bg-blue-50/20' : 'border-slate-200 focus:border-blue-500/50'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome oficial do parceiro" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail Corporativo</label>
            <input required type="email" className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contato@empresa.com.br" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">WhatsApp</label>
            <input required className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
        </div>

        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/50 space-y-6">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CEP</label>
                <input required className={`w-full h-12 px-4 bg-white border rounded-xl outline-none font-bold ${highlightFields ? 'border-blue-500' : 'border-slate-200'}`} value={formData.cep} onChange={e => { const v = maskCEP(e.target.value); setFormData({...formData, cep: v}); if(v.length===9) handleCEPLookup(v); }} placeholder="00000-000" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bairro</label>
                <input required className={`w-full h-12 px-4 bg-white border rounded-xl outline-none font-bold ${highlightFields ? 'border-blue-500' : 'border-slate-200'}`} value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
              </div>
           </div>
           <div className="grid grid-cols-4 gap-6">
              <input required className={`col-span-3 h-12 px-4 bg-white border rounded-xl outline-none font-bold ${highlightFields ? 'border-blue-500' : 'border-slate-200'}`} value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} placeholder="Rua / Logradouro" />
              <input required className="h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} placeholder="Nº" />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-6 p-6 bg-blue-50/40 rounded-3xl border border-blue-100">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Último Contato</label>
            <input type="date" className="w-full h-12 px-4 bg-white border border-blue-100 rounded-xl outline-none font-bold" value={formData.lastContactDate} onChange={e => setFormData({...formData, lastContactDate: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Próximo Contato</label>
            <input type="date" className={`w-full h-12 px-4 bg-white border rounded-xl outline-none font-bold ${dateError ? 'border-red-500 ring-2 ring-red-500/10' : 'border-blue-100'}`} value={formData.nextContactDate} onChange={e => { setFormData({...formData, nextContactDate: e.target.value}); setDateError(null); }} />
          </div>
          {dateError && <p className="col-span-2 text-[9px] text-red-500 font-black uppercase tracking-tighter animate-shake">⚠️ {dateError}</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 h-14 bg-white text-slate-500 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all">Descartar</button>
          <button type="submit" className="flex-[2] h-14 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95">Finalizar Cadastro</button>
        </div>
      </form>
    </div>
  );
};
