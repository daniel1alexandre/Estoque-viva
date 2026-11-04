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
  Warehouse, 
  Boxes, 
  Store,
  Flame
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
  onOpenFirebase,
  isFirebaseActive,
  summaryStats,
  depositoStats
}) {
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs w-full">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2.5 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-auto flex items-center justify-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
              <img src="/logo.png" alt="Arena Viva" className="h-9 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Controle de Estoque Viva Beach</h1>
                <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  Arena Viva
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Controle diário da Loja e Depósito com contagem física, conferência e divergências
              </p>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
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
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Modals */}
            <button
              onClick={onOpenProducts}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Cadastrar ou editar produtos e categorias"
            >
              <PackagePlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Itens</span>
            </button>

            <button
              onClick={onOpenUsers}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Gerenciar usuários e conferentes"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Usuários</span>
            </button>

            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-2xs cursor-pointer"
              title="Exportar dados da contagem para Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar</span>
            </button>

            {/* Firebase Database Status & Config Button */}
            <button
              onClick={onOpenFirebase}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs cursor-pointer ${
                isFirebaseActive
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Configurar e sincronizar com o banco de dados Firebase"
            >
              <Flame className={`w-3.5 h-3.5 ${isFirebaseActive ? 'text-amber-600 fill-amber-500' : 'text-amber-600'}`} />
              <span>{isFirebaseActive ? 'Firebase Ativo' : 'Firebase'}</span>
            </button>
          </div>
        </div>

        {/* Bottom bar: Navigation Tabs (Loja, Depósito, Dashboard) & Date selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2.5">
          <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Loja / Frente */}
            <button
              onClick={() => setActiveTab('count')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'count'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Loja / Frente</span>
              {summaryStats && (
                <span
                  className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
                    activeTab === 'count'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {summaryStats.checkedCount}/{summaryStats.totalItems}
                </span>
              )}
            </button>

            {/* Depósito Menu Button */}
            <button
              onClick={() => setActiveTab('deposito')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'deposito'
                  ? 'bg-amber-600 text-white shadow-xs shadow-amber-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Warehouse className="w-4 h-4" />
              <span>Depósito</span>
              {depositoStats && (
                <span
                  className={`text-[11px] px-2 py-0.2 rounded-full font-bold ${
                    activeTab === 'deposito'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {depositoStats.checkedCount}/{depositoStats.totalItems}
                </span>
              )}
            </button>

            {/* Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard de Saídas</span>
            </button>
          </nav>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs cursor-pointer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
