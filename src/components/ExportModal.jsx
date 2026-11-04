import React from 'react';
import { X, Download, Printer, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { exportCountToCSV, formatDateBR } from '../utils/formatters';

export default function ExportModal({
  isOpen,
  onClose,
  selectedDate,
  products,
  countData,
  users
}) {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportCountToCSV(selectedDate, products, countData?.items || {}, users);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exportar Relatório</h3>
              <p className="text-xs text-slate-500">Contagem de {formatDateBR(selectedDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecione o formato desejado para exportar a conferência física e a contagem diária dos itens:
          </p>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition text-left group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Planilha Excel / CSV</div>
                <div className="text-xs text-slate-500">
                  Exporta com todas as colunas: entradas, saídas, contagem física e divergências
                </div>
              </div>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition text-left group"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 group-hover:scale-105 transition">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Imprimir Folha de Conferência</div>
                <div className="text-xs text-slate-500">
                  Gera versão limpa para prancheta ou relatório em PDF
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

