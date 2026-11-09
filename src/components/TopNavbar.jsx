import React from 'react';
import { 
  Menu, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Store, 
  Warehouse, 
  Boxes, 
  ShoppingCart, 
  Building2, 
  BarChart3, 
  FileText
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

export default function TopNavbar({
  activeTab,
  selectedDate,
  setSelectedDate,
  saveStatus,
  onOpenMobileMenu
}) {

  const tabTitles = {
    count: { title: 'Controle de Estoque - Loja / Frente', subtitle: 'Conferência física diária e apuração de saídas', icon: Store, color: 'text-blue-600' },
    deposito: { title: 'Controle de Estoque - Depósito Central', subtitle: 'Gestão de entradas e estoque de retaguarda', icon: Warehouse, color: 'text-amber-600' },
    general_stock: { title: 'Estoque Geral Integrado', subtitle: 'Consolidação de Loja + Depósito com monitoramento de nível mínimo', icon: Boxes, color: 'text-indigo-600' },
    orders: { title: 'Gestão de Pedidos de Compra', subtitle: 'Reposição agrupada por segmento e fornecedor', icon: ShoppingCart, color: 'text-orange-600' },
    suppliers: { title: 'Gerenciador de Fornecedores', subtitle: 'Vínculos de produtos e contatos comerciais', icon: Building2, color: 'text-orange-600' },
    dashboard: { title: 'Dashboard de Saídas e Vendas', subtitle: 'Análise de divergências e produtos mais vendidos', icon: BarChart3, color: 'text-blue-600' },
    reports: { title: 'Central de Relatórios Personalizados', subtitle: 'Exportação para .xlm (Excel), filtros dinâmicos e ordenação A-Z', icon: FileText, color: 'text-indigo-600' }
  };

  const currentInfo = tabTitles[activeTab] || tabTitles.count;
  const TabIcon = currentInfo.icon;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs w-full px-3 sm:px-6 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Hamburger menu for mobile + Current Screen Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg bg-slate-100 ${currentInfo.color}`}>
              <TabIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {currentInfo.title}
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                {currentInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Date Picker, Auto-save status, Live Sync indicator, Active User */}
        <div className="flex items-center flex-wrap gap-2.5 justify-end">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span className="text-blue-700 font-semibold text-[11px]">Salvando...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold text-[11px]">Gravado</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 text-[11px]">Pronto</span>
              </>
            )}
          </div>

          {/* Multi-device Live Sync Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" 
            title="Sincronização em tempo real ativa"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span className="text-[11px]">Sincronizado</span>
          </div>
        </div>
      </div>
    </header>
  );
}

