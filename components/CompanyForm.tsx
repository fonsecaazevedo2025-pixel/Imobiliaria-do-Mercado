
import React, { useState, useRef, useEffect } from 'react';
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

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSave, onCancel, initialData, isPublic = false }) => {
  const streetInputRef = useRef<HTMLInputElement>(null);

  // --- Algorithmic Validations ---

  const validateCNPJ = (cnpj: string): boolean => {
    const clean = cnpj.replace(/[^\d]+/g, '');
    if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) return false;
    let size = clean.length - 2;
    let numbers = clean.substring(0, size);
    let digits = clean.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    size = size + 1;
    numbers = clean.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(digits.charAt(1));
  };

  const validateCPF = (cpf: string): boolean => {
    const clean = cpf.replace(/[^\d]+/g, '');
    if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(clean.substring(10, 11));
  };

  const validateCRECI = (number: string, uf: string): boolean => {
    const cleanNumber = number.replace(/[^0-9jfJF]/g, "");
    return cleanNumber.length >= 3 && uf.length === 2;
  };

  const validateEmail = (email: string): boolean => {
    const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(String(email).toLowerCase());
  };

  const getPhoneValidationError = (phone: string): string | null => {
    const clean = phone.replace(/\D/g, "");
    if (!clean) return "O telefone é obrigatório.";
    if (clean.length < 10) return "Telefone muito curto.";
    if (clean.length > 11) return "Telefone muito longo.";
    if (/^(\d)\1+$/.test(clean)) return "Número inválido.";
    const ddd = parseInt(clean.substring(0, 2));
    const validDDDs = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];
    if (!validDDDs.includes(ddd)) return "DDD inválido.";
    if (clean.length === 11 && clean[2] !== '9') return "Celulares devem iniciar com 9.";
    return null;
  };

  const validateURL = (url: string): boolean => {
    if (!url) return true;
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(url);
  };

  // --- Masking Helpers ---

  const maskPhone = (v: string) => {
    const clean = v.replace(/\D/g, "").substring(0, 11);
    if (!clean) return "";
    const ddd = clean.substring(0, 2);
    const rest = clean.substring(2);
    if (clean.length <= 2) return `(${ddd}`;
    if (clean.length <= 6) return `(${ddd}) ${rest}`;
    if (clean.length <= 10) return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
  };

  const maskCEP = (v: string) => {
    const clean = v.replace(/\D/g, "").substring(0, 8);
    if (clean.length > 5) return `${clean.substring(0, 5)}-${clean.substring(5)}`;
    return clean;
  };

  const maskCNPJ = (v: string) => v.replace(/\D/g, "").substring(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  const maskCPF = (v: string) => v.replace(/\D/g, "").substring(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  const maskCRECI = (v: string) => v.replace(/[^0-9jfJF]/g, "").toUpperCase().substring(0, 8);

  // --- Form State ---

  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'CRECI'>(initialData?.docType || 'CNPJ');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cnpj: initialData?.docType !== 'CRECI' ? initialData?.cnpj || '' : '',
    creci: initialData?.docType === 'CRECI' ? initialData?.creci || '' : '',
    creciUF: initialData?.creciUF || '',
    cep: initialData?.cep || '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    email: initialData?.email || '',
    phone: initialData?.phone ? maskPhone(initialData.phone) : '',
    website: initialData?.website || '',
    responsible: initialData?.responsible || '',
    partnershipManager: initialData?.partnershipManager || '',
    hiringManager: initialData?.hiringManager || (isPublic ? 'Cadastro Público' : ''),
    brokerCount: initialData?.brokerCount || 0,
    commissionRate: initialData?.commissionRate || 5,
    status: initialData?.status || 'Ativo',
    notes: initialData?.notes || '',
    contactHistory: initialData?.contactHistory || [] as ContactHistoryEntry[],
    location: initialData?.location || { lat: -23.5505, lng: -46.6333 },
  });

  const [isSearchingDoc, setIsSearchingDoc] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [hiringManagerError, setHiringManagerError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.docType === 'CNPJ') setDocSuccess(validateCNPJ(initialData.cnpj));
      if (initialData.docType === 'CPF') setDocSuccess(validateCPF(initialData.cnpj));
      if (initialData.docType === 'CRECI') setDocSuccess(validateCRECI(initialData.creci || '', initialData.creciUF || ''));
    }
  }, [initialData]);

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

  const handleDocLookup = async () => {
    if (docType !== 'CNPJ') return;
    const clean = formData.cnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      setDocError("CNPJ incompleto.");
      return;
    }
    
    setIsSearchingDoc(true);
    setDocError(null);
    setDocSuccess(false);

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
      } else {
        setDocError("CNPJ não encontrado.");
      }
    } catch (e) {
      setDocError("Erro na consulta.");
    } finally {
      setIsSearchingDoc(false);
    }
  };

  const handleCEPLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setIsCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({ 
          ...prev, 
          street: data.logradouro || '', 
          neighborhood: data.bairro || '', 
          city: data.localidade || '', 
          state: data.uf || '' 
        }));
      }
    } catch (e) {
      console.error("CEP error", e);
    } finally {
      setIsCepLoading(false);
    }
  };

  const onDocInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDocError(null);
    setDocSuccess(false);

    if (docType === 'CNPJ') {
      const masked = maskCNPJ(val);
      setFormData({ ...formData, cnpj: masked });
      if (masked.replace(/\D/g, '').length === 14) setDocSuccess(validateCNPJ(masked));
    } else if (docType === 'CPF') {
      const masked = maskCPF(val);
      setFormData({ ...formData, cnpj: masked });
      if (masked.replace(/\D/g, '').length === 11) setDocSuccess(validateCPF(masked));
    } else {
      const masked = maskCRECI(val);
      setFormData({ ...formData, creci: masked });
      setDocSuccess(validateCRECI(masked, formData.creciUF));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, email: val });
    setEmailError(val && !validateEmail(val) ? "E-mail com formato inválido (ex: contato@empresa.com)." : null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setFormData({ ...formData, phone: masked });
    if (masked.replace(/\D/g, '').length >= 10) {
      setPhoneError(getPhoneValidationError(masked));
    }
  };

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, website: val });
    setUrlError(val && !validateURL(val) ? "Formato de URL inválido (ex: www.site.com.br)." : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!docSuccess) {
      setDocError(`Valide o ${docType} antes de salvar.`);
      return;
    }

    if (!validateEmail(formData.email)) {
      setEmailError("O e-mail informado é inválido.");
      return;
    }

    const phoneErr = getPhoneValidationError(formData.phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }

    if (formData.website && !validateURL(formData.website)) {
      setUrlError("URL inválida.");
      return;
    }

    // Validação final do Gestor Interno
    if (!formData.hiringManager || !formData.hiringManager.trim()) {
      setHiringManagerError("O Gestor Interno (Hub) é obrigatório.");
      return;
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

  const addHistoryEntry = () => {
    const newEntry: ContactHistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type: 'Telefone',
      summary: '',
      notes: ''
    };
    setFormData(prev => ({ ...prev, contactHistory: [newEntry, ...prev.contactHistory] }));
  };

  const updateHistoryEntry = (id: string, updates: Partial<ContactHistoryEntry>) => {
    setFormData(prev => ({
      ...prev,
      contactHistory: prev.contactHistory.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-200/50 w-full max-w-2xl mx-auto animate-fadeIn overflow-y-auto max-h-[90vh] no-scrollbar">
      <div className="mb-10 text-center md:text-left">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          {initialData ? 'Editar Parceiro' : 'Novo Credenciamento'}
        </h3>
        <p className="text-sm text-slate-400 font-medium mt-1">Preencha os dados oficiais do parceiro estratégico.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* DOCUMENTO SELETOR */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
          {(['CNPJ', 'CPF', 'CRECI'] as const).map(type => (
            <button 
              key={type} 
              type="button" 
              onClick={() => { setDocType(type); setDocSuccess(false); setDocError(null); }} 
              className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${docType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* NÚMERO DOC */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Documento ({docType})</label>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input 
                required 
                className={`w-full h-14 pl-5 pr-12 bg-slate-50 border rounded-2xl outline-none focus:ring-4 transition-all font-bold ${docSuccess ? 'border-emerald-500/50 ring-emerald-500/10 text-emerald-900' : (docError ? 'border-red-500/50 ring-red-500/10' : 'border-slate-200 focus:border-blue-500/50')}`} 
                value={docType === 'CRECI' ? formData.creci : formData.cnpj} 
                onChange={onDocInputChange} 
                placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : (docType === 'CPF' ? "000.000.000-00" : "00000-J")} 
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                {isSearchingDoc ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : docSuccess ? (
                  <span className="text-emerald-500 text-xl animate-bounceIn">✓</span>
                ) : docError ? (
                  <span className="text-red-500 text-xl animate-shake">⚠️</span>
                ) : null}
              </div>
            </div>
            {docType === 'CNPJ' && (
              <button 
                type="button" 
                onClick={handleDocLookup} 
                disabled={isSearchingDoc} 
                className="h-14 px-6 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                {isSearchingDoc ? 'Validando...' : 'Validar CNPJ'}
              </button>
            )}
          </div>
          {docError && <p className="text-[10px] text-red-500 font-black px-1 uppercase tracking-tight">{docError}</p>}
        </div>

        {/* NOME / RAZÃO */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome / Razão Social</label>
          <input required className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>

        {/* WEBSITE COM VALIDAÇÃO ROBUSTA */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Site Institucional (Opcional)</label>
          <div className="relative">
            <input 
              className={`w-full h-14 pl-5 pr-12 bg-slate-50 border rounded-2xl outline-none focus:ring-4 transition-all font-bold ${formData.website && !urlError ? 'border-emerald-500/50 ring-emerald-500/10' : (urlError ? 'border-red-500/50 ring-red-500/10' : 'border-slate-200 focus:border-blue-500/50')}`} 
              value={formData.website} 
              onChange={handleWebsiteChange} 
              placeholder="www.suaempresa.com.br"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
              {formData.website && !urlError ? (
                <span className="text-emerald-500 text-xl animate-bounceIn drop-shadow-sm" title="URL Válida">✓</span>
              ) : urlError ? (
                <span className="text-red-500 text-xl animate-shake" title="URL Inválida">⚠️</span>
              ) : null}
            </div>
          </div>
          {urlError && <p className="text-[10px] text-red-500 font-black px-1 uppercase tracking-tighter animate-fadeIn">{urlError}</p>}
        </div>

        {/* CONTATOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">E-mail Profissional</label>
            <div className="relative">
              <input 
                required 
                type="email" 
                className={`w-full h-14 pl-5 pr-12 bg-slate-50 border rounded-2xl outline-none focus:ring-4 transition-all font-bold ${formData.email && !emailError ? 'border-emerald-500/50 ring-emerald-500/10' : (emailError ? 'border-red-500/50 ring-red-500/10' : 'border-slate-200 focus:border-blue-500/50')}`} 
                value={formData.email} 
                onChange={handleEmailChange} 
                placeholder="exemplo@dominio.com"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                {formData.email && !emailError ? (
                  <span className="text-emerald-500 text-xl animate-bounceIn">✓</span>
                ) : emailError ? (
                  <span className="text-red-500 text-xl animate-shake">⚠️</span>
                ) : null}
              </div>
            </div>
            {emailError && <p className="text-[10px] text-red-500 font-black px-1 uppercase tracking-tight animate-fadeIn">{emailError}</p>}
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">WhatsApp / Telefone</label>
            <div className="relative">
              <input required className={`w-full h-14 px-5 bg-slate-50 border rounded-2xl outline-none focus:ring-4 transition-all font-bold ${phoneError ? 'border-red-500/50 text-red-900' : 'border-slate-200'}`} value={formData.phone} onChange={handlePhoneChange} placeholder="(00) 00000-0000" />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                {formData.phone.replace(/\D/g, '').length >= 10 && !phoneError ? <span className="text-emerald-500 text-xl">✓</span> : phoneError ? <span className="text-red-500 text-xl animate-shake">⚠️</span> : null}
              </div>
            </div>
            {phoneError && <p className="text-[10px] text-red-500 font-black px-1 uppercase">{phoneError}</p>}
          </div>
        </div>

        {/* ENDEREÇO SEÇÃO */}
        <div className="space-y-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-1">
            <span className="text-xl">📍</span>
            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Endereço Comercial</h4>
          </div>
          
          <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-200/50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">CEP</label>
                <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.cep} onChange={e => { const v = maskCEP(e.target.value); setFormData({...formData, cep: v}); if(v.length===9) handleCEPLookup(v); }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Bairro</label>
                <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Logradouro</label>
                <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nº</label>
                <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Cidade</label>
                <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">UF</label>
                <select required className="w-full h-12 px-2 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                  <option value="">--</option>
                  {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* GESTORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest px-1">Gestor da Parceria</label>
            <input 
              type="text"
              className="w-full h-12 px-4 bg-white border border-blue-100 rounded-xl outline-none font-bold transition-all focus:ring-4 focus:ring-blue-500/10" 
              value={formData.partnershipManager} 
              onChange={e => setFormData({...formData, partnershipManager: e.target.value})} 
              placeholder="Responsável no parceiro"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest px-1">Gestor Interno (Hub)</label>
            <div className="relative">
              <input 
                required 
                className={`w-full h-12 pl-4 pr-10 bg-white border rounded-xl outline-none font-bold transition-all ${hiringManagerError ? 'border-red-500 ring-4 ring-red-500/10' : 'border-blue-100 focus:ring-4 focus:ring-blue-500/10'}`} 
                value={formData.hiringManager} 
                onChange={e => {
                  setFormData({...formData, hiringManager: e.target.value});
                  if (e.target.value.trim()) setHiringManagerError(null);
                }} 
                onBlur={() => {
                  if (!formData.hiringManager.trim()) setHiringManagerError("O Gestor Interno (Hub) é obrigatório.");
                }}
                placeholder="Quem atende este parceiro?" 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {hiringManagerError && <span className="text-red-500 animate-shake">⚠️</span>}
              </div>
            </div>
            {hiringManagerError && <p className="text-[10px] text-red-500 font-black px-1 uppercase tracking-tighter animate-fadeIn">{hiringManagerError}</p>}
          </div>
        </div>

        {/* HISTÓRICO */}
        <div className="space-y-6 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Contatos Recentes</h4>
            <button type="button" onClick={addHistoryEntry} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">+ Novo</button>
          </div>
          <div className="space-y-4">
            {formData.contactHistory.map(h => (
              <div key={h.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-fadeIn">
                <div className="flex gap-4 mb-4">
                  <input type="date" className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={h.date} onChange={e => updateHistoryEntry(h.id, { date: e.target.value })} />
                  <input className="flex-[2] h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={h.summary} onChange={e => updateHistoryEntry(h.id, { summary: e.target.value })} placeholder="Resumo do contato..." />
                </div>
                <textarea className="w-full h-20 p-4 bg-white border border-slate-200 rounded-xl text-xs font-medium resize-none" value={h.notes} onChange={e => updateHistoryEntry(h.id, { notes: e.target.value })} placeholder="Detalhes da conversa..." />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 h-14 bg-white text-slate-500 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all">Cancelar</button>
          <button type="submit" className="flex-[2] h-14 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">Salvar Parceiro</button>
        </div>
      </form>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-bounceIn { animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
