import React from 'react';
import { 
  Store, 
  Warehouse, 
  Boxes, 
  ShoppingCart, 
  Building2, 
  BarChart3, 
  FileText, 
  PackagePlus, 
  Users, 
  Download, 
  Flame, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Eye
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  users = [],
  currentUserId,
  setCurrentUserId,
  summaryStats,
  depositoStats,
  ordersCount = 0,
  criticalGeneralCount = 0,
  hasLowGeneralStock = false,
  isFirebaseActive = false,
  onOpenProducts,
  onOpenUsers,
  onOpenSuppliers,
  onOpenExport,
  onOpenFirebase,
  isCollapsed = false,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
  navRef
}) {
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const navItems = [
    {
      id: 'count',
      label: 'Loja / Frente',
      icon: Store,
      badge: summaryStats ? `${summaryStats.checkedCount}/${summaryStats.totalItems}` : null,
      activeColor: 'bg-blue-600 text-white shadow-sm shadow-blue-500/30',
      badgeColor: 'bg-blue-500/30 text-white'
    },
    {
      id: 'deposito',
      label: 'Depósito Central',
      icon: Warehouse,
      badge: depositoStats ? `${depositoStats.checkedCount}/${depositoStats.totalItems}` : null,
      activeColor: 'bg-amber-600 text-white shadow-sm shadow-amber-500/30',
      badgeColor: 'bg-amber-500/30 text-white'
    },
    {
      id: 'general_stock',
      label: 'Estoque Geral',
      icon: Boxes,
      badge: hasLowGeneralStock ? `${criticalGeneralCount} mín!` : 'Geral',
      isPulsing: hasLowGeneralStock,
      activeColor: hasLowGeneralStock 
        ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-sm animate-pulse font-bold'
        : 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-bold',
      badgeColor: hasLowGeneralStock ? 'bg-white text-rose-700 font-black animate-pulse' : 'bg-indigo-500/30 text-white'
    },
    {
      id: 'visualization',
      label: 'Visualização',
      icon: Eye,
      badge: '7 Dias',
      activeColor: 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-bold',
      badgeColor: 'bg-indigo-400/30 text-indigo-100'
    },
    {
      id: 'orders',
      label: 'Pedidos de Compra',
      icon: ShoppingCart,
      badge: ordersCount > 0 ? `${ordersCount}` : null,
      isPulsing: ordersCount > 0,
      activeColor: 'bg-orange-600 text-white shadow-sm shadow-orange-500/30',
      badgeColor: ordersCount > 0 ? 'bg-white text-orange-700 font-bold' : 'bg-orange-500/30 text-white'
    },
    {
      id: 'suppliers',
      label: 'Fornecedores',
      icon: Building2,
      activeColor: 'bg-orange-600 text-white shadow-sm shadow-orange-500/30'
    },
    {
      id: 'dashboard',
      label: 'Dashboard de Saídas',
      icon: BarChart3,
      activeColor: 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
    },
    {
      id: 'reports',
      label: 'Relatórios (.xlm)',
      icon: FileText,
      badge: 'Custom',
      activeColor: 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30',
      badgeColor: 'bg-indigo-400/30 text-indigo-100'
    }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container - Fixo e permanente na tela */}
      <aside className={`
        fixed lg:static top-0 left-0 z-50 h-screen bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none shadow-xl lg:shadow-none
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top: Branding & Logo & Collapse Button */}
        <div className="p-3.5 border-b border-slate-800/80">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded-xl shadow-xs shrink-0">
                  <img src="/logo.png" alt="Arena Viva" className="h-8 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold text-white tracking-tight truncate">Estoque Viva</h1>
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded">
                      Praia
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">Arena Viva Beach</p>
                </div>
              </div>

              {/* Desktop Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Recolher Menu (manter ícones visíveis)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Layout quando recolhido: Logo centralizado e botão para expandir sempre visível */
            <div className="flex flex-col items-center gap-2.5 py-1">
              <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded-xl shadow-xs shrink-0" title="Arena Viva Beach">
                <img src="/logo.png" alt="Arena Viva" className="h-8 w-auto object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Expandir Menu Completo"
              >
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          )}
        </div>

        {/* Conferente Selector in Sidebar */}
        <div className="px-3 py-2.5 border-b border-slate-800/60 bg-slate-950/40">
          {!isCollapsed ? (
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <UserCheck className="w-3 h-3 text-indigo-400" />
                Conferente Responsável:
              </label>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (users && users.length > 1) {
                    const idx = users.findIndex(u => u.id === currentUserId);
                    const nextUser = users[(idx + 1) % users.length];
                    setCurrentUserId(nextUser.id);
                  }
                }}
                className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 hover:text-white border border-indigo-500/30 flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer transition"
                title={`Conferente Responsável: ${currentUser?.name || 'Geral'} (Clique para alternar conferente)`}
              >
                {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'CO'}
              </button>
            </div>
          )}
        </div>

        {/* Navigation Menus List - Rola em sincronia com o conteúdo da direita */}
        <div 
          ref={navRef}
          className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-700"
        >
          {/* Main Menus */}
          <div className="space-y-1">
            {!isCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 mb-1 block">
                Menu Principal
              </span>
            )}

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return !isCollapsed ? (
                /* Item Expandido */
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    item.isPulsing && !isActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-bold hover:bg-rose-500/30'
                      : isActive
                        ? item.activeColor
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${item.isPulsing ? 'animate-bounce' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${
                      item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ) : (
                /* Item Recolhido: Ícone centralizado em destaque com badge flutuante */
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer relative ${
                    item.isPulsing && !isActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-bold hover:bg-rose-500/30'
                      : isActive
                        ? item.activeColor
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                  title={`${item.label} ${item.badge ? `(${item.badge})` : ''}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${item.isPulsing ? 'animate-bounce text-rose-400' : ''}`} />

                  {/* Badge flutuante quando recolhido */}
                  {item.isPulsing ? (
                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-slate-900" />
                  ) : item.badge && item.id === 'orders' ? (
                    <span className="absolute top-1 right-1.5 min-w-[16px] h-4 text-[9px] font-black rounded-full bg-orange-500 text-white flex items-center justify-center px-1 shadow-xs">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Quick Actions & System Management */}
          <div className="space-y-1 pt-3 border-t border-slate-800/80">
            {!isCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 mb-1 block">
                Gestão & Cadastros
              </span>
            )}

            {/* Gerenciar Itens */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => { onOpenProducts(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                title="Cadastrar ou editar produtos e categorias"
              >
                <PackagePlus className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Itens & Categorias</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenProducts(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className="w-full flex items-center justify-center p-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                title="Itens & Categorias (Cadastrar ou editar)"
              >
                <PackagePlus className="w-5 h-5 shrink-0" />
              </button>
            )}

            {/* Usuários */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => { onOpenUsers(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                title="Gerenciar usuários e conferentes"
              >
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Usuários</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenUsers(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className="w-full flex items-center justify-center p-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                title="Usuários e Conferentes"
              >
                <Users className="w-5 h-5 shrink-0" />
              </button>
            )}

            {/* Exportar Dados */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => { onOpenExport(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-blue-300 hover:text-blue-100 hover:bg-blue-900/30 transition cursor-pointer"
                title="Exportar dados de contagem em .xlm ou .csv"
              >
                <Download className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Exportar Dados</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenExport(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className="w-full flex items-center justify-center p-3 rounded-xl text-blue-400 hover:text-blue-200 hover:bg-blue-900/30 transition cursor-pointer"
                title="Exportar Dados (.xlm / .csv)"
              >
                <Download className="w-5 h-5 shrink-0" />
              </button>
            )}

            {/* Firebase Cloud */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => { onOpenFirebase(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isFirebaseActive
                    ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Configurações e status do Firebase Cloud"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Flame className={`w-4 h-4 shrink-0 ${isFirebaseActive ? 'text-amber-400 fill-amber-400' : 'text-amber-500'}`} />
                  <span>Firebase Cloud</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${isFirebaseActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onOpenFirebase(); if (setIsMobileOpen) setIsMobileOpen(false); }}
                className={`w-full flex items-center justify-center p-3 rounded-xl transition cursor-pointer relative ${
                  isFirebaseActive ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={`Firebase Cloud: ${isFirebaseActive ? 'Ativo e sincronizando' : 'Inativo'}`}
              >
                <Flame className={`w-5 h-5 shrink-0 ${isFirebaseActive ? 'text-amber-400 fill-amber-400' : ''}`} />
                <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isFirebaseActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </button>
            )}
          </div>
        </div>

        {/* Footer: Live Sync & Arena Viva Info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-[10px] text-slate-400 leading-tight truncate">
                <strong className="text-slate-200">Sincronização Ativa</strong>
                <div>Multi-dispositivos tempo real</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Sincronização simultânea ativa em tempo real">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-2 ring-emerald-500/20" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
