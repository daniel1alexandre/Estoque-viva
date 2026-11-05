import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Store, 
  Warehouse, 
  ShoppingCart, 
  TrendingDown, 
  Package, 
  ArrowRight,
  Filter,
  ShieldAlert,
  Download
} from 'lucide-react';

export default function GeneralStockView({
  products = [],
  categories = [],
  counts = {},
  selectedDate,
  onNavigateToOrders
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'critical', 'normal'

  // Extract sessions for selected date
  const lojaSession = counts?.loja?.[selectedDate]?.items || {};
  const depositoSession = counts?.deposito?.[selectedDate]?.items || {};

  // Compute detailed inventory per product
  const inventoryList = useMemo(() => {
    return products.map(product => {
      // 1. Loja Stock Calculation
      const lojaItem = lojaSession[product.id];
      let estoqueLoja = product.currentStock || 0;
      if (lojaItem) {
        const hasCount = lojaItem.countedStock !== null && lojaItem.countedStock !== undefined && lojaItem.countedStock !== '';
        if (hasCount) {
          estoqueLoja = Number(lojaItem.countedStock);
        } else {
          const cur = Number(lojaItem.currentStock ?? product.currentStock) || 0;
          const ent = Number(lojaItem.entries) || 0;
          const diff = Math.abs(Number(lojaItem.difference) || 0);
          estoqueLoja = Math.max(0, cur + ent - diff);
        }
      }

      // 2. Depósito Stock Calculation (Base Stock + Entradas do dia)
      const depItem = depositoSession[product.id];
      let estoqueDeposito = 0;
      if (depItem) {
        const baseDep = Number(depItem.currentStock ?? product.currentStock) || 0;
        const entriesDep = Number(depItem.entries) || 0;
        estoqueDeposito = baseDep + entriesDep;
      } else {
        estoqueDeposito = product.currentStock || 0;
      }

      // 3. Estoque Geral (Loja + Depósito)
      const estoqueGeral = estoqueLoja + estoqueDeposito;
      const minStock = Number(product.minStock) || 0;

      // Status: Crítico se menor ou igual ao mínimo
      const isCritical = estoqueGeral <= minStock;
      const isDepCritical = estoqueDeposito <= minStock;
      const deficit = Math.max(0, minStock - estoqueGeral);

      return {
        product,
        estoqueLoja,
        estoqueDeposito,
        estoqueGeral,
        minStock,
        isCritical,
        isDepCritical,
        deficit
      };
    }).sort((a, b) => {
      const catCompare = (a.product.category || '').localeCompare(b.product.category || '', 'pt-BR', { sensitivity: 'base' });
      if (catCompare !== 0) return catCompare;
      return (a.product.name || '').localeCompare(b.product.name || '', 'pt-BR', { sensitivity: 'base' });
    });
  }, [products, lojaSession, depositoSession]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalLoja = 0;
    let totalDeposito = 0;
    let criticalCount = 0;

    inventoryList.forEach(item => {
      totalLoja += item.estoqueLoja;
      totalDeposito += item.estoqueDeposito;
      if (item.isCritical) criticalCount++;
    });

    return {
      totalProducts: products.length,
      totalGeral: totalLoja + totalDeposito,
      totalLoja,
      totalDeposito,
      criticalCount
    };
  }, [inventoryList, products.length]);

  // Filtered list
  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => {
      // Category filter
      if (selectedCategory !== 'TODAS' && item.product.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = item.product.name.toLowerCase().includes(term);
        const matchesCode = item.product.code?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode) return false;
      }

      // Status filter
      if (statusFilter === 'critical' && !item.isCritical) return false;
      if (statusFilter === 'normal' && item.isCritical) return false;

      return true;
    });
  }, [inventoryList, selectedCategory, searchTerm, statusFilter]);

  return (
    <div className="w-full space-y-4">
      {/* Banner de Cabeçalho do Estoque Geral */}
      <div className="px-4 py-3.5 rounded-xl border bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-inner">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">Estoque Geral Integrado</h2>
              <span className="text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                Loja / Frente + Depósito
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              Visão consolidada do inventário completo da Arena Viva • Alerta automático de nível mínimo para compras
            </p>
          </div>
        </div>

        {stats.criticalCount > 0 ? (
          <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-200 px-3 py-1.5 rounded-lg animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-bold">
              {stats.criticalCount} {stats.criticalCount === 1 ? 'produto atingiu' : 'produtos atingiram'} o estoque mínimo!
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">
              Todos os itens operando acima do nível mínimo
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total de Itens</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalProducts}</span>
            <span className="text-xs text-slate-500">cadastrados</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {categories.length} categorias ativas
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Estoque Loja / Frente</span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.totalLoja}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600/80 font-medium">
            Disponível para venda balcão
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Estoque Depósito</span>
            <Warehouse className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{stats.totalDeposito}</span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80 font-medium">
            Armazenamento central
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between bg-indigo-50/20">
          <div className="flex items-center justify-between text-indigo-900 mb-1">
            <span className="text-xs font-semibold">Estoque Geral Total</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{stats.totalGeral}</span>
            <span className="text-xs text-indigo-600">unidades</span>
          </div>
          <div className="mt-1 text-[11px] text-indigo-600 font-semibold">
            Loja + Depósito somados
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between col-span-2 md:col-span-1 transition ${
          stats.criticalCount > 0 
            ? 'bg-rose-50 border-rose-200 animate-pulse-subtle' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className={`text-xs font-semibold ${stats.criticalCount > 0 ? 'text-rose-900 font-bold' : ''}`}>
              Nível Mínimo / Reposição
            </span>
            <ShieldAlert className={`w-4 h-4 ${stats.criticalCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${stats.criticalCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {stats.criticalCount}
            </span>
            <span className="text-xs text-slate-500">produtos</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${stats.criticalCount > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
              {stats.criticalCount > 0 ? 'Lançados em Pedidos' : 'Tudo abastecido'}
            </span>
            {stats.criticalCount > 0 && onNavigateToOrders && (
              <button
                type="button"
                onClick={onNavigateToOrders}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-0.5 cursor-pointer"
              >
                Ver Pedidos <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do produto ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
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
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Estoque Mínimo ({stats.criticalCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('normal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'normal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Estoque OK ({products.length - stats.criticalCount})
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
                ? 'bg-indigo-600 text-white shadow-xs'
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
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({countInCat})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Estoque Geral Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-semibold text-xs border-b border-slate-200">
                <th className="py-3 px-3 text-left w-36">Categoria</th>
                <th className="py-3 px-3 min-w-[260px]">Produto</th>
                <th className="py-3 px-2 text-center w-32 bg-blue-50/30 text-blue-950 border-x border-blue-100">
                  <div className="flex items-center justify-center gap-1">
                    <Store className="w-3.5 h-3.5 text-blue-600" />
                    <span>Estoque Loja</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-36 bg-amber-50/40 text-amber-950 border-r border-amber-100">
                  <div className="flex items-center justify-center gap-1">
                    <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                    <span>Estoque Depósito</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-36 bg-indigo-50/60 text-indigo-950 font-bold border-r border-indigo-200">
                  <div className="flex items-center justify-center gap-1">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>Estoque Geral Total</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-28 font-semibold text-slate-700 border-r border-slate-200">
                  Estoque Mínimo
                </th>
                <th className="py-3 px-3 text-center w-48">Status / Situação</th>
                <th className="py-3 px-3 text-center w-32">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Nenhum produto encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tente alterar a categoria ou limpar a busca.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const { product, estoqueLoja, estoqueDeposito, estoqueGeral, minStock, isCritical } = item;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isCritical
                          ? 'bg-rose-50/80 border-l-4 border-l-rose-500 hover:bg-rose-100/60'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* Categoria */}
                      <td className="py-3 px-3">
                        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {product.category}
                        </span>
                      </td>

                      {/* Produto com destaque se crítico */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {isCritical && (
                            <span 
                              className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" 
                              title="Produto em nível crítico (igual ou abaixo do mínimo)"
                            />
                          )}
                          <div>
                            <div className={`font-semibold leading-snug ${isCritical ? 'text-rose-950 font-bold' : 'text-slate-900'}`}>
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Unidade: <span className="font-medium text-slate-600">{product.unit || 'UN'}</span>
                              {product.code && <> • Cód: {product.code}</>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estoque Loja */}
                      <td className="py-3 px-2 text-center bg-blue-50/15 border-x border-blue-100/40">
                        <span className="font-bold text-slate-800 text-sm">
                          {estoqueLoja}
                        </span>
                      </td>

                      {/* Estoque Depósito */}
                      <td className="py-3 px-2 text-center bg-amber-50/20 border-r border-amber-100/40">
                        <span className="font-bold text-amber-900 text-sm">
                          {estoqueDeposito}
                        </span>
                      </td>

                      {/* Estoque Geral Total */}
                      <td className="py-3 px-2 text-center bg-indigo-50/30 border-r border-indigo-200/50">
                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black ${
                          isCritical
                            ? 'bg-rose-600 text-white shadow-xs animate-pulse-subtle'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}>
                          {estoqueGeral}
                        </span>
                      </td>

                      {/* Estoque Mínimo */}
                      <td className="py-3 px-2 text-center border-r border-slate-200">
                        <span className="font-bold text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">
                          {minStock} un
                        </span>
                      </td>

                      {/* Status / Situação com DESTAQUE marcante se crítico */}
                      <td className="py-3 px-3 text-center">
                        {isCritical ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold shadow-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
                            <span>Reposição Necessária</span>
                          </div>
                        ) : estoqueGeral <= minStock * 1.5 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold">
                            <span>Atenção (Baixo)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Estoque Normal</span>
                          </div>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-3 text-center">
                        {isCritical ? (
                          <button
                            type="button"
                            onClick={onNavigateToOrders}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                            title="Ver este item na lista de compras no menu Pedidos"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Fazer Pedido</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            Abastecido
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

