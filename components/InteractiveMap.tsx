
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Company } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface InteractiveMapProps {
  companies: Company[];
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ companies }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const searchCircleRef = useRef<L.Circle | null>(null);
  
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = companies.length > 0 
      ? [companies[0].location.lat, companies[0].location.lng] 
      : [-23.5505, -46.6333];

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(initialCenter, 12);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      crossOrigin: true
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Limpar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    companies.forEach(company => {
      // Lógica de destaque: Se houver busca, verifica se está no raio de 2km
      let isNearby = false;
      if (searchResult) {
        const dist = L.latLng(searchResult.lat, searchResult.lng).distanceTo(L.latLng(company.location.lat, company.location.lng));
        isNearby = dist <= 2000;
      }

      const markerColor = isNearby ? '#10b981' : (company.status === 'Ativo' ? '#2563eb' : '#94a3b8');
      const glowClass = isNearby ? 'animate-pulse-glow' : '';
      
      const markerHtml = `
        <div class="${glowClass}" style="position: relative; width: 38px; height: 38px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
          <svg viewBox="0 0 38 38" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 38C19 38 34 26.5 34 15C34 6.71573 27.2843 0 19 0C10.7157 0 4 6.71573 4 15C4 26.5 19 38 19 38Z" fill="${markerColor}" stroke="white" stroke-width="2"/>
            <path d="M12 18L19 12L26 18V24H22V20H16V24H12V18Z" fill="white"/>
          </svg>
          ${isNearby ? '<div style="position: absolute; top: -8px; right: -8px; background: #10b981; color: white; font-size: 8px; font-weight: 900; padding: 2px 4px; border-radius: 4px; border: 1px solid white;">PRÓXIMO</div>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-company-pin',
        html: markerHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
      });

      const marker = L.marker([company.location.lat, company.location.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 180px;">
            <strong style="display: block; font-size: 14px; color: #1e293b; margin-bottom: 2px;">${company.name}</strong>
            <span style="display: inline-block; font-size: 10px; font-weight: 800; color: ${company.status === 'Ativo' ? '#16a34a' : '#64748b'}; text-transform: uppercase; background: ${company.status === 'Ativo' ? '#f0fdf4' : '#f1f5f9'}; padding: 1px 6px; border-radius: 4px;">
              ${company.status}
            </span>
            <p style="font-size: 11px; color: #64748b; margin-top: 8px; margin-bottom: 4px; line-height: 1.4;">${company.address}</p>
            <div style="margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Equipe</span>
                <span style="display: block; font-size: 12px; font-weight: 700; color: #1e293b;">${company.brokerCount}</span>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Comissão</span>
                <span style="display: block; font-size: 12px; font-weight: 700; color: #059669;">${company.commissionRate}%</span>
              </div>
            </div>
          </div>
        `);
      
      markersRef.current.set(company.id, marker);
    });

    if (companies.length > 0 && mapRef.current && !searchResult) {
      const group = L.featureGroup(Array.from(markersRef.current.values()));
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [companies, searchResult]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim() || !mapRef.current) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        setSearchResult({ lat: latNum, lng: lngNum });

        // Limpar busca anterior
        if (searchMarkerRef.current) searchMarkerRef.current.remove();
        if (searchCircleRef.current) searchCircleRef.current.remove();

        // Adicionar PIN de busca
        const searchIcon = L.divIcon({
          className: 'search-pin',
          html: `<div style="background: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.2);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        searchMarkerRef.current = L.marker([latNum, lngNum], { icon: searchIcon }).addTo(mapRef.current);
        
        // Círculo de proximidade (2km)
        searchCircleRef.current = L.circle([latNum, lngNum], {
          radius: 2000,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '5, 5'
        }).addTo(mapRef.current);

        mapRef.current.setView([latNum, lngNum], 15, { animate: true });
      } else {
        alert("Local não encontrado. Tente um CEP ou endereço mais detalhado.");
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      alert("Erro ao buscar endereço.");
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResult(null);
    if (searchMarkerRef.current) searchMarkerRef.current.remove();
    if (searchCircleRef.current) searchCircleRef.current.remove();
    searchMarkerRef.current = null;
    searchCircleRef.current = null;
    if (companies.length > 0 && mapRef.current) {
      const group = L.featureGroup(Array.from(markersRef.current.values()));
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  const handleExportMapCSV = () => {
    if (companies.length === 0) return;
    const headers = ['Empresa', 'CNPJ', 'Status', 'Latitude', 'Longitude', 'Endereco', 'Responsavel'];
    const rows = companies.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.cnpj}"`,
      `"${c.status}"`,
      c.location.lat,
      c.location.lng,
      `"${c.address.replace(/"/g, '""')}"`,
      `"${c.responsible.replace(/"/g, '""')}"`
    ]);
    const csvContent = "\ufeff" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mapa_parceiros_${new Date().getTime()}.csv`;
    link.click();
  };

  const handleExportMapPDF = async () => {
    if (companies.length === 0 || !mapContainerRef.current) return;
    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        scale: 2
      });
      const mapImageData = canvas.toDataURL('image/jpeg', 0.85);
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('PartnerHub', 14, 20);
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Distribuição Geográfica da Rede', 14, 30);
      doc.addImage(mapImageData, 'JPEG', 14, 40, 182, 100);
      autoTable(doc, {
        startY: 150,
        head: [['Parceiro', 'Status', 'Comissão', 'Equipe']],
        body: companies.map(c => [c.name, c.status, `${c.commissionRate}%`, c.brokerCount]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
      doc.save(`mapa-rede-${new Date().getTime()}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 z-0 flex flex-col">
      {/* Floating Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-xl px-4 no-print">
        <form onSubmit={handleSearch} className="relative group flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar endereço ou CEP para prospecção..." 
              className="w-full h-14 pl-14 pr-12 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl shadow-2xl outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700 font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-xl">🔍</span>
              )}
            </div>
          </div>
          
          {searchResult && (
            <button 
              type="button" 
              onClick={clearSearch}
              className="px-6 h-14 bg-red-500 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-red-600 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
            >
              <span>✕</span> Limpar Busca
            </button>
          )}
          {!searchResult && searchTerm && (
             <button 
              type="submit"
              className="px-6 h-14 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
            >
              Buscar
            </button>
          )}
        </form>
      </div>

      <div ref={mapContainerRef} className="w-full h-full flex-1" />
      
      <div className="absolute bottom-6 left-6 z-[1000] no-print flex gap-3">
        <button onClick={handleExportMapCSV} className="px-5 py-3 bg-white/90 backdrop-blur-md text-slate-800 border border-white/50 rounded-2xl font-bold hover:bg-white transition-all shadow-xl flex items-center gap-2">
          <span>📍</span> CSV
        </button>
        <button onClick={handleExportMapPDF} disabled={isExportingPDF} className="px-5 py-3 bg-blue-600/90 backdrop-blur-md text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl flex items-center gap-2">
          {isExportingPDF ? '...' : '📄 PDF Map'}
        </button>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.4)); }
          50% { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.8)); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
