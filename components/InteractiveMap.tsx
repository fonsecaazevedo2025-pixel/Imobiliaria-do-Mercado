
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
      zoomControl: false,
      scrollWheelZoom: true
    }).setView(initialCenter, 12);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
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

    // Limpar marcadores anteriores para redesenhar com base no contexto de busca
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    companies.forEach(company => {
      // Destaque de Proximidade: Se estiver a menos de 2km da busca
      let isNearby = false;
      if (searchResult) {
        const dist = L.latLng(searchResult.lat, searchResult.lng).distanceTo(L.latLng(company.location.lat, company.location.lng));
        isNearby = dist <= 2000;
      }

      const markerColor = isNearby ? '#10b981' : (company.status === 'Ativo' ? '#2563eb' : '#94a3b8');
      const glowClass = isNearby ? 'animate-pulse-glow' : '';
      
      const markerHtml = `
        <div class="${glowClass}" style="position: relative; width: 42px; height: 42px; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.25));">
          <svg viewBox="0 0 38 38" width="42" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 38C19 38 34 26.5 34 15C34 6.71573 27.2843 0 19 0C10.7157 0 4 6.71573 4 15C4 26.5 19 38 19 38Z" fill="${markerColor}" stroke="white" stroke-width="2"/>
            <path d="M12 18L19 12L26 18V24H22V20H16V24H12V18Z" fill="white"/>
          </svg>
          ${isNearby ? '<div style="position: absolute; top: -10px; right: -10px; background: #10b981; color: white; font-size: 7px; font-weight: 900; padding: 2px 5px; border-radius: 6px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">PRÓXIMO</div>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-company-pin',
        html: markerHtml,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42]
      });

      const marker = L.marker([company.location.lat, company.location.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; padding: 6px; min-width: 200px;">
            <strong style="display: block; font-size: 15px; color: #0f172a; margin-bottom: 4px;">${company.name}</strong>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 9px; font-weight: 800; color: ${company.status === 'Ativo' ? '#059669' : '#475569'}; text-transform: uppercase; background: ${company.status === 'Ativo' ? '#ecfdf5' : '#f8fafc'}; padding: 2px 8px; border-radius: 6px; border: 1px solid ${company.status === 'Ativo' ? '#10b98133' : '#e2e8f0'};">
                ${company.status}
              </span>
              ${isNearby ? '<span style="font-size: 9px; font-weight: 800; color: #10b981; text-transform: uppercase; background: #f0fdf4; padding: 2px 8px; border-radius: 6px; border: 1px solid #10b98133;">Área de Busca</span>' : ''}
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 10px;">${company.address}</p>
            <div style="border-top: 1px solid #f1f5f9; padding-top: 10px; display: flex; justify-content: space-between;">
              <div>
                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Hub Responsável</span>
                <span style="display: block; font-size: 12px; font-weight: 700; color: #2563eb;">${company.hiringManager}</span>
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

        // Resetar busca anterior
        if (searchMarkerRef.current) searchMarkerRef.current.remove();
        if (searchCircleRef.current) searchCircleRef.current.remove();

        // Novo PIN de centro de busca
        const searchIcon = L.divIcon({
          className: 'search-center-pin',
          html: `<div style="background: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); animation: bounce 1s infinite alternate;"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        searchMarkerRef.current = L.marker([latNum, lngNum], { icon: searchIcon }).addTo(mapRef.current);
        
        // Círculo de proximidade (2km) - Destaque Visual
        searchCircleRef.current = L.circle([latNum, lngNum], {
          radius: 2000,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '8, 8'
        }).addTo(mapRef.current);

        mapRef.current.setView([latNum, lngNum], 15, { animate: true, duration: 1.5 });
      } else {
        alert("Localização não encontrada. Tente inserir o CEP ou nome da rua e cidade.");
      }
    } catch (error) {
      console.error("Erro Nominatim:", error);
      alert("Não foi possível realizar a busca no momento.");
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
      mapRef.current.fitBounds(group.getBounds().pad(0.1), { animate: true });
    }
  };

  const handleExportMapPDF = async () => {
    if (companies.length === 0 || !mapContainerRef.current) return;
    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(mapContainerRef.current, { useCORS: true, scale: 2 });
      const mapImageData = canvas.toDataURL('image/jpeg', 0.9);
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('PartnerHub | Geoprospecção', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Relatório emitido em: ${new Date().toLocaleString()}`, 14, 28);
      doc.addImage(mapImageData, 'JPEG', 14, 35, 182, 100);
      autoTable(doc, {
        startY: 145,
        head: [['Parceiro', 'Hub Responsável', 'Status', 'Equipe']],
        body: companies.map(c => [c.name, c.hiringManager, c.status, c.brokerCount]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
      doc.save(`mapa-prospeccao-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 z-0 flex flex-col overflow-hidden">
      
      {/* Floating Search Hub */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-xl px-4 no-print animate-fadeIn">
        <form onSubmit={handleSearch} className="relative flex gap-3">
          <div className="relative flex-1 group">
            <input 
              type="text" 
              placeholder="Digite um endereço ou CEP para prospecção..." 
              className="w-full h-14 pl-14 pr-12 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[1.25rem] shadow-2xl outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800 font-bold text-sm placeholder:text-slate-400 placeholder:font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-xl">🔍</span>
              )}
            </div>
            {searchTerm && !isSearching && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 font-bold p-1">✕</button>
            )}
          </div>
          
          {searchResult ? (
            <button 
              type="button" 
              onClick={clearSearch}
              className="px-6 h-14 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
            >
              Limpar Busca
            </button>
          ) : (
            <button 
              type="submit"
              disabled={!searchTerm.trim() || isSearching}
              className={`px-8 h-14 bg-blue-600 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 active:scale-95 ${!searchTerm.trim() ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-blue-700'}`}
            >
              Prospectar
            </button>
          )}
        </form>
      </div>

      <div ref={mapContainerRef} className="w-full h-full flex-1" />
      
      {/* Botões Inferiores Flutuantes */}
      <div className="absolute bottom-6 left-6 z-[1000] no-print flex gap-3 animate-fadeIn">
        <button onClick={handleExportMapPDF} disabled={isExportingPDF} className="px-6 py-3 bg-white/90 backdrop-blur-md text-slate-900 border border-slate-200 rounded-2xl font-bold text-xs hover:bg-white transition-all shadow-2xl flex items-center gap-2 active:scale-95">
          {isExportingPDF ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <span>📄</span>} Exportar PDF do Mapa
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-5px); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.4)); }
          50% { filter: drop-shadow(0 0 24px rgba(16, 185, 129, 0.9)); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 1.5rem !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          padding: 4px !important;
        }
        .leaflet-popup-tip {
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};
