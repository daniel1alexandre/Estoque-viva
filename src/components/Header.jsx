import React from 'react';
import { 
  ClipboardCheck, 
  BarChart3, 
  PackagePlus, 
  Users, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Sparkles,
  Boxes
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

export default function Header({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  users,
  currentUserId,
  setCurrentUserId,
  saveStatus,
  onOpenProducts,
  onOpenUsers,
  onOpenExport,
  summaryStats
}) {
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-700 to-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Estoque Diário Pro</h1>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Contagem física, conferência com check, saídas e divergências em tempo real
              </p>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-save visual indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span className="text-blue-700">Salvando...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Salvo automaticamente</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Pronto</span>
                </>
              )}
            </div>

            {/* User Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Conferente:
              </span>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role || 'Conferente'})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Modals */}
            <button
              onClick={onOpenProducts}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
              title="Cadastrar ou editar produtos e categorias"
            >
              <PackagePlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Itens</span>
            </button>

            <button
              onClick={onOpenUsers}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
              title="Gerenciar usuários e conferentes"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Usuários</span>
            </button>

            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-sm"
              title="Exportar dados da contagem para Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Bottom bar: Navigation Tabs & Date selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-3">
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('count')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'count'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Contagem Diária</span>
              {summaryStats && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'count'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {summaryStats.checkedCount}/{summaryStats.totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard de Saídas</span>
              {summaryStats && summaryStats.totalOutputToday > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-500 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {summaryStats.totalOutputToday} saídas
                </span>
              )}
            </button>
          </nav>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data da Contagem:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

