
export interface ContactHistoryEntry {
  id: string;
  date: string;
  type: 'Telefone' | 'WhatsApp' | 'E-mail' | 'Reunião' | 'Vídeo';
  summary: string;
  notes?: string;
  nextContactDate?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string; 
  creci?: string;
  creciUF?: string;
  docType: 'CNPJ' | 'CPF' | 'CRECI';
  cep: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  responsible: string;
  partnershipManager: string; // Gestor estratégico no parceiro
  hiringManager: string; // Gestor interno (Hub)
  website?: string;
  email: string;
  phone: string;
  registrationDate: string;
  brokerCount: number;
  commissionRate: number;
  status: 'Ativo' | 'Inativo';
  // Relationship history (Legacy/Quick Access)
  lastContactDate?: string;
  lastContactType?: 'Telefone' | 'WhatsApp' | 'E-mail' | 'Reunião' | 'Vídeo';
  contactSummary?: string;
  nextContactDate?: string;
  notes?: string;
  // Full History
  contactHistory: ContactHistoryEntry[];
}

export interface DashboardStats {
  totalCompanies: number;
  totalBrokers: number;
  avgBrokers: number;
  activePercentage: number;
}
