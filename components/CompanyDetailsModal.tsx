
import React from 'react';
import { Company } from '../types';

interface CompanyDetailsModalProps {
  company: Company;
  onClose: () => void;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({ company, onClose }) => {
  const isUpcoming = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    return target >= today;
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'WhatsApp': return '💬';
      case 'Telefone': return '📞';
      case 'Reunião': return '🤝';
      case 'E-mail': return '📧';
      case 'Vídeo': return '🎥';
      default: return '📱';
    }
  };

  const openWaze = () => {
    const { lat, lng } = company.location;
    window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Prontuário do Parceiro</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 text-2xl">×</button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Top Info Section */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">🏢</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xl font-bold text-slate-900 truncate leading-tight">{company.name}</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {company.docType === 'CRECI' 
                  ? `REGISTRO: CRECI ${company.creci} / ${company.creciUF}` 
                  : `DOC: ${company.cnpj}`}
              </p>
              
              {/* Interactive Contact Pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Email Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 group transition-all hover:bg-blue-100">
                  <span className="text-[11px] font-bold truncate max-w-[140px]">{company.email}</span>
                  <a 
                    href={`mailto:${company.email}`} 
                    className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full shadow-md hover:scale-110 transition-all active:scale-90"
                    title={`Enviar e-mail para ${company.email}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </a>
                </div>

                {/* Phone/WA Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 group">
                  <span className="text-[11px] font-bold">{company.phone}</span>
                  <a 
                    href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full shadow-md hover:scale-110 transition-all active:scale-90"
                    title={`Abrir WhatsApp para ${company.phone}`}
                  >
                    <span className="text-[10px]">💬</span>
                  </a>
                </div>

                {/* Website Pill */}
                {company.website && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200 group">
                    <span className="text-[11px] font-bold truncate max-w-[120px]">{company.website.replace(/^https?:\/\//, '')}</span>
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-6 h-6 bg-slate-800 text-white rounded-full shadow-md hover:scale-110 transition-all"
                    >
                      <span className="text-[10px]">🌐</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${company.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{company.status}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">{company.commissionRate}% Comis.</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white shadow-sm flex items-center gap-1">
                  👥 {company.brokerCount} Corretores
                </span>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Localização e Logradouro</p>
              <div className="flex items-start gap-2">
                <span className="text-lg mt-0.5">📍</span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{company.address}</p>
              </div>
            </div>
            <button 
              onClick={openWaze}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm font-bold shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-[0.98]"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/66/Waze_icon.png" alt="Waze" className="w-5 h-5 object-contain" />
              Ver Rota no Waze
            </button>
          </div>

          {/* Contact Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Resp. Operacional</p>
               <p className="text-xs font-bold text-slate-700 truncate">{company.responsible}</p>
             </div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Gestor Parceiro</p>
               <p className="text-xs font-bold text-slate-700 truncate">{company.partnershipManager || 'N/A'}</p>
             </div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Gestor da Conta</p>
               <p className="text-xs font-bold text-blue-600 truncate">{company.hiringManager}</p>
             </div>
          </div>

          {/* Timeline of interactions */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Linha do Tempo de Relacionamento</h5>
            
            <div className="space-y-6 relative ml-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
              {company.contactHistory && company.contactHistory.length > 0 ? (
                company.contactHistory.map((h, i) => (
                  <div key={h.id} className="relative pl-8">
                    <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-300'}`}></div>
                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">{getIcon(h.type)} {h.type}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-1">{h.summary}</p>
                      {h.notes && (
                        <p className="text-xs text-slate-600 whitespace-pre-wrap mt-1 pb-1">
                          {h.notes}
                        </p>
                      )}
                      {h.nextContactDate && (
                        <div className={`mt-2 pt-2 border-t border-slate-100 text-[9px] font-bold ${isUpcoming(h.nextContactDate) ? 'text-blue-600' : 'text-slate-400'}`}>
                          Follow-up: {new Date(h.nextContactDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                   <p className="text-xs text-slate-400 italic">Nenhum registro de interação encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
          <button onClick={onClose} className="px-8 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-900 transition-all active:scale-95">Fechar</button>
        </div>
      </div>
    </div>
  );
};
