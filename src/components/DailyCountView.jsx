import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Check, 
  RotateCcw, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  Layers, 
  Clock, 
  UserCheck, 
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';

export default function DailyCountView({
  selectedDate,
  products,
  categories,
  users,
  currentUserId,
  countData,
  onUpdateItem,
  onToggleCheck,
  onBatchCheck
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'checked', 'divergence'

  // Current session items dictionary
  const items = countData?.items || {};
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      // Category filter
      if (selectedCategory !== 'TODAS' && prod.category !== selectedCategory) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(term);
        const matchesCode = (prod.code || '').toLowerCase().includes(term);
        if (!matchesName && !matchesCode) return false;
      }

      // Status filter
      const item = items[prod.id] || {};
      const isChecked = !!item.checked;
      const difference = Number(item.difference) || 0;
      const hasDivergence = item.countedStock !== null && item.countedStock !== undefined && difference !== 0;

      if (statusFilter === 'pending' && isChecked) return false;
      if (statusFilter === 'checked' && !isChecked) return false;
      if (statusFilter === 'divergence' && !hasDivergence) return false;

      return true;
    });
  }, [products, items, selectedCategory, searchTerm, statusFilter]);

  // Overall Statistics for today
  const stats = useMemo(() => {
    let totalItems = products.length;
    let checkedCount = 0;
    let divergenceCount = 0;
    let totalEntries = 0;
    let totalOutputs = 0;

    products.forEach(p => {
      const it = items[p.id];
      if (it) {
        if (it.checked) checkedCount++;
        if (it.countedStock !== null && it.countedStock !== undefined && Number(it.difference) !== 0) {
          divergenceCount++;
        }
        totalEntries += Number(it.entries) || 0;
        totalOutputs += Number(it.outputCount) || 0;
      }
    });

    const percentChecked = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

    return {
      totalItems,
      checkedCount,
      divergenceCount,
      totalEntries,
      totalOutputs,
      percentChecked
    };
  }, [products, items]);

  // Handle batch check for all currently visible items
  const handleCheckAllVisible = (checkState) => {
    const ids = filteredProducts.map(p => p.id);
    onBatchCheck(ids, checkState);
  };

  return (
    <div className="space-y-6">
      {/* Top metrics summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total de Itens</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalItems}</span>
            <span className="text-xs text-slate-500">produtos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {categories.length} categorias ativas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Conferência</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.percentChecked}%</span>
            <span className="text-xs text-slate-500">({stats.checkedCount}/{stats.totalItems})</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentChecked}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Divergências</span>
            <AlertTriangle className={`w-4 h-4 ${stats.divergenceCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${stats.divergenceCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {stats.divergenceCount}
            </span>
            <span className="text-xs text-slate-500">itens</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {stats.divergenceCount === 0 ? 'Estoque 100% alinhado' : 'Atenção aos itens com falta/sobra'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Entradas do Dia</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">+{stats.totalEntries}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">
            Entradas registradas hoje
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Saídas do Dia</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">-{stats.totalOutputs}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 font-medium">
            Baixas/Consumo registradas
          </div>
        </div>
      </div>

      {/* Filter and Search toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar item por nome ou código (ex: Arroz, BEB-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded"
              >
                limpar
              </button>
            )}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Pendentes ({stats.totalItems - stats.checkedCount})
            </button>
            <button
              onClick={() => setStatusFilter('checked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'checked'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Conferidos ({stats.checkedCount})
            </button>
            <button
              onClick={() => setStatusFilter('divergence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'divergence'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Com Divergência ({stats.divergenceCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5" />
            Categorias:
          </span>
          <button
            onClick={() => setSelectedCategory('TODAS')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === 'TODAS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map(cat => {
            const countInCat = products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({countInCat})
              </button>
            );
          })}
        </div>

        {/* Quick batch actions bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Exibindo <span className="font-semibold text-slate-800">{filteredProducts.length}</span> de{' '}
            <span className="font-semibold text-slate-800">{products.length}</span> itens
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCheckAllVisible(true)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar todos visíveis como conferidos
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleCheckAllVisible(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desmarcar todos
            </button>
          </div>
        </div>
      </div>

      {/* Main Count Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <th className="py-3.5 px-4 text-center w-16">
                  Check
                </th>
                <th className="py-3.5 px-4 min-w-[200px]">
                  Item / Produto
                </th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">
                  Categoria
                </th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">
                  Estoque Inicial
                </th>
                <th className="py-3.5 px-3 text-center min-w-[100px] bg-emerald-50/40 text-emerald-900 border-x border-emerald-100">
                  Entradas (+)
                </th>
                <th className="py-3.5 px-3 text-center min-w-[100px] bg-blue-50/40 text-blue-900 border-r border-blue-100">
                  Saídas (-)
                </th>
                <th className="py-3.5 px-3 text-center min-w-[100px]">
                  Estoque Esperado
                </th>
                <th className="py-3.5 px-3 text-center min-w-[130px] bg-amber-50/50 text-amber-900 font-bold border-x border-amber-200">
                  Última Contagem
                </th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">
                  Diferença
                </th>
                <th className="py-3.5 px-4 min-w-[160px]">
                  Conferente / Horário
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Nenhum produto encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tente alterar a categoria ou limpar a busca.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const item = items[product.id] || {
                    productId: product.id,
                    currentStock: product.currentStock,
                    entries: 0,
                    outputCount: 0,
                    countedStock: null,
                    difference: 0,
                    checked: false,
                    countedBy: currentUser.name
                  };

                  const currentStock = Number(item.currentStock ?? product.currentStock) || 0;
                  const entries = Number(item.entries) || 0;
                  const outputCount = Number(item.outputCount) || 0;
                  const expectedStock = currentStock + entries - outputCount;
                  const hasCount = item.countedStock !== null && item.countedStock !== undefined && item.countedStock !== '';
                  const countedStock = hasCount ? Number(item.countedStock) : '';
                  const diff = hasCount ? (Number(countedStock) - expectedStock) : 0;
                  const isChecked = !!item.checked;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isChecked ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Check Button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleCheck(product.id, !isChecked)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105 hover:bg-emerald-700'
                              : 'bg-white border-2 border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500/50'
                          }`}
                          title={isChecked ? 'Item Conferido! Clique para desmarcar' : 'Clique para marcar como Conferido'}
                        >
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </td>

                      {/* Product Name & Code */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 leading-tight">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {product.code || 'S/C'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Un: <strong className="font-medium text-slate-700">{product.unit || 'UN'}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {product.category}
                        </span>
                      </td>

                      {/* Initial / System Stock */}
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {currentStock}
                      </td>

                      {/* Entries Input */}
                      <td className="py-3 px-3 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                        <input
                          type="number"
                          min="0"
                          value={item.entries === 0 ? '' : item.entries}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            onUpdateItem(product.id, { entries: val });
                          }}
                          className="w-18 mx-auto text-center font-semibold text-emerald-800 bg-white border border-emerald-200 rounded-md py-1 px-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs text-sm"
                        />
                      </td>

                      {/* Outputs Input */}
                      <td className="py-3 px-3 text-center bg-blue-50/20 border-r border-blue-100/50">
                        <input
                          type="number"
                          min="0"
                          value={item.outputCount === 0 ? '' : item.outputCount}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            onUpdateItem(product.id, { outputCount: val });
                          }}
                          className="w-18 mx-auto text-center font-semibold text-blue-800 bg-white border border-blue-200 rounded-md py-1 px-1 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-sm"
                        />
                      </td>

                      {/* Expected Stock (Calculated) */}
                      <td className="py-3 px-3 text-center font-semibold text-slate-800">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">
                          {expectedStock}
                        </span>
                      </td>

                      {/* Physical Count (Última Contagem) with prominent styling and auto-save */}
                      <td className="py-3 px-3 text-center bg-amber-50/30 border-x border-amber-200/60">
                        <input
                          type="number"
                          min="0"
                          value={item.countedStock === null || item.countedStock === undefined ? '' : item.countedStock}
                          placeholder="Digitar..."
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            // Auto-saves immediately upon typing, and auto-marks check if desired or marks counted
                            onUpdateItem(product.id, { 
                              countedStock: val,
                              checked: val !== null ? true : item.checked // auto-check when count is typed
                            });
                          }}
                          className={`w-24 mx-auto text-center font-bold text-base rounded-lg py-1.5 px-2 border focus:outline-none focus:ring-2 transition shadow-sm ${
                            hasCount
                              ? 'bg-white border-amber-400 text-slate-900 ring-1 ring-amber-300'
                              : 'bg-white border-slate-300 text-slate-500 hover:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* Difference Badge */}
                      <td className="py-3 px-3 text-center">
                        {!hasCount ? (
                          <span className="text-xs text-slate-400 font-medium italic">
                            Não contado
                          </span>
                        ) : diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                            0 (OK)
                          </span>
                        ) : diff > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-full">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{diff} (Sobra)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-full animate-pulse-subtle">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {diff} (Falta)
                          </span>
                        )}
                      </td>

                      {/* User selector per item & check time */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <select
                            value={item.countedBy || currentUser.name}
                            onChange={(e) => onUpdateItem(product.id, { countedBy: e.target.value })}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          >
                            {users.map(u => (
                              <option key={u.id} value={u.name}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                          
                          {isChecked && item.checkedAt && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>Conferido às {new Date(item.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info in table */}
        <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              <strong>Dica:</strong> A contagem física, entradas e saídas são salvas automaticamente assim que você digita.
            </span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-700">
            <span>Total Entradas: <strong className="text-emerald-700 font-bold">+{stats.totalEntries}</strong></span>
            <span>Total Saídas: <strong className="text-blue-700 font-bold">-{stats.totalOutputs}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

