import React, { useState, useMemo } from 'react';
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Check, 
  RotateCcw, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  Layers, 
  Clock, 
  Info,
  Warehouse,
  Store
} from 'lucide-react';

export default function DailyCountView({
  selectedDate,
  location = 'loja', // 'loja' | 'deposito'
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
        if (!matchesName) return false;
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

  const handleCheckAllVisible = (checkState) => {
    const ids = filteredProducts.map(p => p.id);
    onBatchCheck(ids, checkState);
  };

  const isDeposito = location === 'deposito';

  return (
    <div className="w-full space-y-4">
      {/* Location Banner */}
      <div className={`px-4 py-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
        isDeposito 
          ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
          : 'bg-blue-50/70 border-blue-200 text-blue-900'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg text-white ${isDeposito ? 'bg-amber-600' : 'bg-blue-600'}`}>
            {isDeposito ? <Warehouse className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">
              {isDeposito ? 'Controle de Estoque - Depósito Central' : 'Controle de Estoque - Loja / Frente'}
            </h2>
            <p className="text-xs opacity-80">
              {isDeposito 
                ? 'Contagem dos produtos armazenados no depósito (armazenamento de apoio e caixas)' 
                : 'Contagem diária dos produtos expostos e disponíveis na frente da loja'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="bg-white/80 px-2.5 py-1 rounded-md border border-black/5 shadow-xs">
            {stats.checkedCount} de {stats.totalItems} itens conferidos ({stats.percentChecked}%)
          </span>
        </div>
      </div>

      {/* Top metrics summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total de Itens</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalItems}</span>
            <span className="text-xs text-slate-500">produtos</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {categories.length} categorias cadastradas
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
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

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Divergências</span>
            <AlertTriangle className={`w-4 h-4 ${stats.divergenceCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${stats.divergenceCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {stats.divergenceCount}
            </span>
            <span className="text-xs text-slate-500">itens</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {stats.divergenceCount === 0 ? 'Estoque 100% alinhado' : 'Atenção aos itens com diferença'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Entradas do Dia</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">+{stats.totalEntries}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
          <div className="mt-1.5 text-[11px] text-emerald-600 font-medium">
            Entradas registradas
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Saídas do Dia</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">-{stats.totalOutputs}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
          <div className="mt-1.5 text-[11px] text-blue-600 font-medium">
            Consumo / baixas registradas
          </div>
        </div>
      </div>

      {/* Filter and Search toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar without code mention */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar item pelo nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
              >
                limpar
              </button>
            )}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Pendentes ({stats.totalItems - stats.checkedCount})
            </button>
            <button
              onClick={() => setStatusFilter('checked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'checked'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Conferidos ({stats.checkedCount})
            </button>
            <button
              onClick={() => setStatusFilter('divergence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'divergence'
                  ? 'bg-rose-600 text-white shadow-xs'
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
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'TODAS'
                ? 'bg-blue-600 text-white shadow-xs'
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
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
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
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar todos visíveis como conferidos
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleCheckAllVisible(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desmarcar todos
            </button>
          </div>
        </div>
      </div>

      {/* Main Count Table - Full Screen Width with Reordered Columns */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-semibold text-xs border-b border-slate-200">
                {/* 1. Categoria (Before Item/Produto) */}
                <th className="py-3 px-3 text-left w-36">
                  Categoria
                </th>

                {/* 2. Item / Produto (Clean, no SKU code) */}
                <th className="py-3 px-3 min-w-[260px]">
                  Item / Produto
                </th>

                {/* 3. Estoque Inicial */}
                <th className="py-3 px-2 text-center w-24">
                  Estoque Inicial
                </th>

                {/* 4. Entradas (+) */}
                <th className="py-3 px-2 text-center w-28 bg-emerald-50/50 text-emerald-950 border-x border-emerald-100">
                  Entradas (+)
                </th>

                {/* 5. Saídas (-) */}
                <th className="py-3 px-2 text-center w-28 bg-blue-50/50 text-blue-950 border-r border-blue-100">
                  Saídas (-)
                </th>

                {/* 6. Estoque Geral (Renamed as requested in Image 2) */}
                <th className="py-3 px-2 text-center w-28 font-bold text-slate-900 bg-slate-100/60">
                  Estoque Geral
                </th>

                {/* 7. Última Contagem */}
                <th className="py-3 px-2 text-center w-36 bg-amber-50/60 text-amber-950 font-bold border-x border-amber-200">
                  Última Contagem
                </th>

                {/* 8. Diferença */}
                <th className="py-3 px-2 text-center w-32">
                  Diferença
                </th>

                {/* 9. Check (Beside Diferença!) */}
                <th className="py-3 px-2 text-center w-20 bg-slate-50/50 border-x border-slate-200">
                  Check
                </th>

                {/* 10. Conferente / Horário */}
                <th className="py-3 px-4 min-w-[180px]">
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
                  const estoqueGeral = currentStock + entries - outputCount;
                  const hasCount = item.countedStock !== null && item.countedStock !== undefined && item.countedStock !== '';
                  const countedStock = hasCount ? Number(item.countedStock) : '';
                  const diff = hasCount ? (Number(countedStock) - estoqueGeral) : 0;
                  const isChecked = !!item.checked;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-slate-50/90 ${
                        isChecked ? 'bg-emerald-50/25' : ''
                      }`}
                    >
                      {/* 1. Categoria (Before Product) */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {product.category}
                        </span>
                      </td>

                      {/* 2. Item / Produto (Clean Name and Unit only - SKU code removed as in image 1) */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          Un: {product.unit || 'UN'}
                        </div>
                      </td>

                      {/* 3. Estoque Inicial (Chain rule: yesterday's counted stock) */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-800">
                        {currentStock}
                      </td>

                      {/* 4. Entradas (+) */}
                      <td className="py-2.5 px-2 text-center bg-emerald-50/20 border-x border-emerald-100/50">
                        <input
                          type="number"
                          min="0"
                          value={item.entries === 0 ? '' : item.entries}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            onUpdateItem(product.id, { entries: val });
                          }}
                          className="w-18 mx-auto text-center font-bold text-emerald-800 bg-white border border-emerald-200 rounded-md py-1 px-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs text-sm"
                        />
                      </td>

                      {/* 5. Saídas (-) */}
                      <td className="py-2.5 px-2 text-center bg-blue-50/20 border-r border-blue-100/50">
                        <input
                          type="number"
                          min="0"
                          value={item.outputCount === 0 ? '' : item.outputCount}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            onUpdateItem(product.id, { outputCount: val });
                          }}
                          className="w-18 mx-auto text-center font-bold text-blue-800 bg-white border border-blue-200 rounded-md py-1 px-1 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs text-sm"
                        />
                      </td>

                      {/* 6. Estoque Geral (Renamed from Estoque Esperado) */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 bg-slate-100/40">
                        <span className="inline-block bg-slate-200/70 text-slate-900 px-2.5 py-1 rounded-md text-xs font-mono font-bold">
                          {estoqueGeral}
                        </span>
                      </td>

                      {/* 7. Última Contagem (Physical Count) */}
                      <td className="py-2.5 px-2 text-center bg-amber-50/30 border-x border-amber-200/60">
                        <input
                          type="number"
                          min="0"
                          value={item.countedStock === null || item.countedStock === undefined ? '' : item.countedStock}
                          placeholder="Digitar..."
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            onUpdateItem(product.id, { 
                              countedStock: val,
                              checked: val !== null ? true : item.checked
                            });
                          }}
                          className={`w-24 mx-auto text-center font-bold text-base rounded-lg py-1.5 px-2 border focus:outline-none focus:ring-2 transition shadow-xs ${
                            hasCount
                              ? 'bg-white border-amber-400 text-slate-900 ring-1 ring-amber-300'
                              : 'bg-white border-slate-300 text-slate-500 hover:border-amber-400'
                          }`}
                        />
                      </td>

                      {/* 8. Diferença */}
                      <td className="py-2.5 px-2 text-center">
                        {!hasCount ? (
                          <span className="text-xs text-slate-400 font-medium italic">
                            Não contado
                          </span>
                        ) : diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md">
                            <Check className="w-3.5 h-3.5" />
                            0 (OK)
                          </span>
                        ) : diff > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{diff} (Sobra)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md animate-pulse-subtle">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {diff} (Falta)
                          </span>
                        )}
                      </td>

                      {/* 9. Check Button (Placed right next to Diferença!) */}
                      <td className="py-2.5 px-2 text-center bg-slate-50/40 border-x border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => onToggleCheck(product.id, !isChecked)}
                          className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105 hover:bg-emerald-700'
                              : 'bg-white border-2 border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500/50'
                          }`}
                          title={isChecked ? 'Item Conferido! Clique para desmarcar' : 'Clique para marcar como Conferido'}
                        >
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </td>

                      {/* 10. Conferente / Horário */}
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col gap-1">
                          <select
                            value={item.countedBy || currentUser.name}
                            onChange={(e) => onUpdateItem(product.id, { countedBy: e.target.value })}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
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
              <strong>Dica:</strong> A última contagem deste dia se tornará o estoque inicial do dia seguinte automaticamente.
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
