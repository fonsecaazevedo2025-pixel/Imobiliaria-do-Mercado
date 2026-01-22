
import React from 'react';
import { Company } from '../types';

interface DeleteConfirmationModalProps {
  company: Company;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ company, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
            ⚠️
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Parceiro?</h3>
          <p className="text-slate-500 mb-1">
            Você está prestes a remover <strong>{company.name}</strong>.
          </p>
          <p className="text-sm text-slate-400">
            Esta ação é permanente e não pode ser desfeita. Todos os dados vinculados a este CNPJ serão perdidos.
          </p>
        </div>
        
        <div className="bg-slate-50 px-8 py-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-100 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
};
