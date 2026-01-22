
import React, { useState } from 'react';
import { Company } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import L from 'leaflet';
import html2canvas from 'html2canvas';

interface ReportsViewProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onView: (company: Company) => void;
  onDuplicate: (company: Company) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ companies, onEdit, onDelete, onView, onDuplicate }) => {
  const [isGeneratingGeoReport, setIsGeneratingGeoReport] = useState(false);

  const handleExportSummaryPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const dateStr = new Date().toLocaleString('pt-BR');
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('PartnerHub', 14, 22);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Relatório Consolidado de Parceiros', 14, 32);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emitido em: ${dateStr}`, 14, 40);
    const activeCount = companies.filter(c => c.status === 'Ativo').length;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 282, 45);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total de Parceiros: ${companies.length} (${activeCount} Ativos)`, 14, 55);
    const tableData = companies.map(company => [
      company.name,
      company.hiringManager,
      company.partnershipManager || company.responsible,
      company.phone,
      company.status,
      `${company.commissionRate}%`,
      company.brokerCount.toString()
    ]);
    autoTable(doc, {
      startY: 65,
      head: [['Imobiliária', 'Resp. Interno', 'Gestor da Parceria', 'Telefone', 'Status', 'Comissão', 'Equipe']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10, halign: 'left' },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    doc.save(`relatorio-geral-parceiros-${new Date().getTime()}.pdf`);
  };

  const handleExportStaticHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Parceiros - PartnerHub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #f8fafc; font-family: sans-serif; }
        .card { background: white; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    </style>
</head>
<body class="p-8">
    <div class="max-w-6xl mx-auto">
        <header class="mb-8 flex justify-between items-end">
            <div>
                <h1 class="text-3xl font-bold text-blue-600">PartnerHub</h1>
                <p class="text-slate-500">Relatório Estratégico de Imobiliárias Parceiras</p>
            </div>
            <div class="text-right text-xs text-slate-400">
                Gerado em: ${new Date().toLocaleString('pt-BR')}
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="card p-6 border-l-4 border-blue-500">
                <p class="text-xs font-bold text-slate-400 uppercase">Total Parceiros</p>
                <p class="text-3xl font-bold">${companies.length}</p>
            </div>
            <div class="card p-6 border-l-4 border-green-500">
                <p class="text-xs font-bold text-slate-400 uppercase">Equipe Total</p>
                <p class="text-3xl font-bold">${companies.reduce((a, b) => a + b.brokerCount, 0)}</p>
            </div>
            <div class="card p-6 border-l-4 border-amber-500">
                <p class="text-xs font-bold text-slate-400 uppercase">Ativos</p>
                <p class="text-3xl font-bold">${companies.filter(c => c.status === 'Ativo').length}</p>
            </div>
        </div>

        <div class="card overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50 border-b">
                    <tr class="text-xs font-bold text-slate-500 uppercase">
                        <th class="p-4">Empresa</th>
                        <th class="p-4">Documento</th>
                        <th class="p-4">Gestor Hub</th>
                        <th class="p-4">Equipe</th>
                        <th class="p-4 text-center">Comissão</th>
                        <th class="p-4 text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    ${companies.map(c => `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="p-4 font-bold text-slate-800">${c.name}</td>
                            <td class="p-4 text-xs text-slate-500">${c.cnpj}</td>
                            <td class="p-4 text-sm text-blue-600 font-medium">${c.hiringManager}</td>
                            <td class="p-4 text-sm font-bold text-slate-600">${c.brokerCount}</td>
                            <td class="p-4 text-center text-emerald-600 font-bold">${c.commissionRate}%</td>
                            <td class="p-4 text-right">
                                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
                                    ${c.status}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_web_parceiros_${new Date().getTime()}.html`;
    link.click();
  };

  const handleExportGeographicPDF = async () => {
    if (companies.length === 0) return;
    setIsGeneratingGeoReport(true);
    try {
      const mapContainer = document.createElement('div');
      mapContainer.style.width = '1000px';
      mapContainer.style.height = '600px';
      mapContainer.style.position = 'absolute';
      mapContainer.style.left = '-9999px';
      mapContainer.style.top = '-9999px';
      document.body.appendChild(mapContainer);
      const map = L.map(mapContainer, { zoomControl: false }).setView([-23.5505, -46.6333], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const markers: L.Marker[] = [];
      companies.forEach(company => {
        const color = company.status === 'Ativo' ? '#2563eb' : '#64748b';
        const icon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        markers.push(L.marker([company.location.lat, company.location.lng], { icon }).addTo(map));
      });
      if (markers.length > 0) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
      await new Promise(resolve => setTimeout(resolve, 2000));
      const canvas = await html2canvas(mapContainer, { useCORS: true, logging: false });
      const mapImageData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text('PartnerHub', 14, 20);
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Relatório de Presença Geográfica', 14, 30);
      doc.addImage(mapImageData, 'PNG', 14, 45, 182, 100);
      const tableData = companies.map(c => [c.name, c.cnpj, c.address.split(' - ').pop() || 'N/A', c.status, `${c.commissionRate}%`]);
      autoTable(doc, {
        startY: 160,
        head: [['Imobiliária', 'Documento', 'Localização', 'Status', 'Comissão']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }
      });
      doc.save(`relatorio-geografico-parceiros-${new Date().getTime()}.pdf`);
      document.body.removeChild(mapContainer);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingGeoReport(false);
    }
  };

  const handleExportCompanyPDF = (company: Company) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('PartnerHub', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('PRONTUÁRIO TÉCNICO E COMERCIAL INDIVIDUAL', 14, 28);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 35, 182, 25, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 35, 182, 25);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(company.name.toUpperCase(), 20, 48);
    doc.setFontSize(10);
    doc.setTextColor(company.status === 'Ativo' ? 22 : 100, company.status === 'Ativo' ? 163 : 116, company.status === 'Ativo' ? 74 : 139);
    doc.text(`STATUS ATUAL: ${company.status.toUpperCase()}`, 20, 54);

    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('01. GESTÃO E RESPONSÁVEIS', 14, 75);
    doc.line(14, 77, 70, 77);

    const gestaoData = [
      ['Resp. Operacional:', company.responsible, 'Gestor da Parceria:', company.partnershipManager || 'Não informado'],
      ['Gestor Hub:', company.hiringManager, 'Email:', company.email],
      ['Telefone:', company.phone, 'Início Parceria:', new Date(company.registrationDate).toLocaleDateString('pt-BR')]
    ];

    autoTable(doc, {
      startY: 80,
      body: gestaoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: 'bold', cellWidth: 40 }, 3: { cellWidth: 50 } }
    });

    const agreementY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('02. ACORDO E LOCALIZAÇÃO', 14, agreementY);
    doc.line(14, agreementY + 2, 70, agreementY + 2);

    const acordoData = [
      ['Taxa Comissão:', `${company.commissionRate}%`, 'Equipe:', `${company.brokerCount} corretores`],
      ['CEP:', company.cep, 'Endereço:', company.address]
    ];

    autoTable(doc, {
      startY: agreementY + 5,
      body: acordoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: 'bold', cellWidth: 40 }, 3: { cellWidth: 50 } }
    });

    doc.save(`prontuario-${company.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Relatórios de Parcerias</h3>
          <p className="text-slate-500 text-sm">Gere documentação completa para reuniões e auditorias.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleExportStaticHTML} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-all shadow-sm flex items-center gap-2">
            <span>🌐</span> Exportar Web Report
          </button>
          <button type="button" onClick={handleExportGeographicPDF} disabled={isGeneratingGeoReport} className={`px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 ${isGeneratingGeoReport ? 'opacity-50 cursor-wait' : 'hover:bg-emerald-700 active:scale-95'}`}>
            {isGeneratingGeoReport ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>📍</span>} Relatório Geográfico
          </button>
          <button type="button" onClick={handleExportSummaryPDF} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2">
            <span>📊</span> Exportar PDF Geral
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Parceiro Imobiliário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Gestores</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Comissão</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right no-print">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map(company => (
              <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-800 text-sm">{company.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{company.cnpj}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-medium text-slate-700">P: {company.partnershipManager || 'N/D'}</p>
                  <p className="text-[10px] text-blue-500 italic">H: {company.hiringManager}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${company.status === 'Ativo' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-emerald-600">{company.commissionRate}%</td>
                <td className="px-6 py-4 text-right no-print space-x-1">
                  <button onClick={() => onDuplicate(company)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-100" title="Duplicar">📑</button>
                  <button type="button" onClick={() => handleExportCompanyPDF(company)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold border border-blue-100">
                    <span>📥</span> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
