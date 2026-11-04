import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  Legend 
} from 'recharts';
import { 
  TrendingDown, 
  TrendingUp, 
  Package, 
  Calendar, 
  Award, 
  Flame, 
  AlertCircle, 
  Layers, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

const CATEGORY_COLORS = [
  '#0284c7', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b'  // Slate
];

export default function DashboardView({
  products,
  categories,
  countsHistory,
  selectedDate
}) {
  const [timeRange, setTimeRange] = useState('7days'); // 'today', '7days', '30days', 'all'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Filter dates based on timeRange
  const availableDates = useMemo(() => {
    return Object.keys(countsHistory || {}).sort((a, b) => a.localeCompare(b));
  }, [countsHistory]);

  const targetDates = useMemo(() => {
    if (availableDates.length === 0) return [];
    if (timeRange === 'today') {
      return availableDates.includes(selectedDate) ? [selectedDate] : [availableDates[availableDates.length - 1]];
    }
    if (timeRange === '7days') {
      return availableDates.slice(-7);
    }
    if (timeRange === '30days') {
      return availableDates.slice(-30);
    }
    return availableDates;
  }, [availableDates, timeRange, selectedDate]);

  // Aggregate outputs across the selected dates
  const aggregatedData = useMemo(() => {
    const productOutputMap = {};
    const categoryOutputMap = {};
    let totalOutput = 0;
    let totalEntries = 0;
    let daysWithData = targetDates.length || 1;

    // Daily output timeline
    const dailyTimeline = targetDates.map(dateKey => {
      const session = countsHistory[dateKey];
      let dayOutputs = 0;
      let dayEntries = 0;

      if (session && session.items) {
        Object.entries(session.items).forEach(([pId, item]) => {
          const prod = products.find(p => p.id === pId);
          if (prod) {
            if (selectedCategoryFilter === 'ALL' || prod.category === selectedCategoryFilter) {
              const hasCount = item.countedStock !== null && item.countedStock !== undefined && item.countedStock !== '';
              const hasTarde = item.outputCount !== null && item.outputCount !== undefined && item.outputCount !== '' && Number(item.outputCount) > 0;
              let out = 0;
              if (hasCount && hasTarde) {
                out = Math.abs(Number(item.outputCount) - Number(item.countedStock));
              } else if (hasCount && !hasTarde) {
                const inicial = (Number(item.currentStock) || 0) + (Number(item.entries) || 0);
                const final = Number(item.countedStock) || 0;
                out = Math.max(0, inicial - final);
              }

              const ent = Number(item.entries) || 0;
              dayOutputs += out;
              dayEntries += ent;

              productOutputMap[pId] = (productOutputMap[pId] || 0) + out;
              categoryOutputMap[prod.category] = (categoryOutputMap[prod.category] || 0) + out;
            }
          }
        });
      }

      totalOutput += dayOutputs;
      totalEntries += dayEntries;

      return {
        date: dateKey,
        formattedDate: formatDateBR(dateKey),
        saidas: dayOutputs,
        entradas: dayEntries
      };
    });

    // Top products ranking
    const topProducts = Object.entries(productOutputMap)
      .map(([pId, totalOut]) => {
        const prod = products.find(p => p.id === pId);
        return {
          id: pId,
          name: prod ? prod.name : 'Desconhecido',
          code: prod ? prod.code : '',
          category: prod ? prod.category : '',
          unit: prod ? prod.unit : 'UN',
          currentStock: prod ? prod.currentStock : 0,
          totalOutput: totalOut
        };
      })
      .filter(p => p.totalOutput > 0)
      .sort((a, b) => b.totalOutput - a.totalOutput);

    // Category distribution
    const categoryDistribution = Object.entries(categoryOutputMap)
      .map(([catName, outCount]) => ({
        name: catName,
        value: outCount
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);

    const topProduct = topProducts[0] || null;
    const topCategory = categoryDistribution[0] || null;
    const avgDailyOutput = Math.round(totalOutput / (daysWithData || 1));

    return {
      dailyTimeline,
      topProducts,
      categoryDistribution,
      totalOutput,
      totalEntries,
      avgDailyOutput,
      topProduct,
      topCategory
    };
  }, [targetDates, countsHistory, products, selectedCategoryFilter]);

  // Divergence audit report from the latest available date
  const latestDivergences = useMemo(() => {
    const latestDate = availableDates[availableDates.length - 1];
    if (!latestDate || !countsHistory[latestDate]) return [];

    const session = countsHistory[latestDate];
    const list = [];
    Object.entries(session.items || {}).forEach(([pId, item]) => {
      const prod = products.find(p => p.id === pId);
      if (prod && item.countedStock !== null && item.countedStock !== undefined) {
        const diff = Number(item.difference) || 0;
        if (diff !== 0) {
          list.push({
            id: prod.id,
            name: prod.name,
            code: prod.code,
            category: prod.category,
            currentStock: item.currentStock,
            entries: item.entries,
            outputCount: item.outputCount,
            countedStock: item.countedStock,
            difference: diff,
            countedBy: item.countedBy,
            date: latestDate
          });
        }
      }
    });

    return list.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }, [availableDates, countsHistory, products]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Dashboard de Saída e Consumo dos Produtos
          </h2>
          <p className="text-xs text-slate-500">
            Análise detalhada de baixas, saída por categorias, tendências diárias e curva de consumo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-md transition ${
                timeRange === 'today' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 rounded-md transition ${
                timeRange === '7days' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1.5 rounded-md transition ${
                timeRange === '30days' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 dias
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                timeRange === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Geral
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outflows */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Saídas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {aggregatedData.totalOutput}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Unidades baixadas no período ({targetDates.length} dias analisados)
          </p>
        </div>

        {/* Daily Average Output */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Média Diária de Saída</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 tracking-tight">
            ~{aggregatedData.avgDailyOutput}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Média de unidades consumidas/dia
          </p>
        </div>

        {/* Top Product */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Produto Mais Movimentado</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          {aggregatedData.topProduct ? (
            <div>
              <div className="text-base font-bold text-slate-900 line-clamp-1" title={aggregatedData.topProduct.name}>
                {aggregatedData.topProduct.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {aggregatedData.topProduct.totalOutput} saídas
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-2">Sem movimentações</div>
          )}
        </div>

        {/* Top Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Categoria Mais Ativa</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          {aggregatedData.topCategory ? (
            <div>
              <div className="text-base font-bold text-slate-900 line-clamp-1">
                {aggregatedData.topCategory.name}
              </div>
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-100 inline-block px-2 py-0.5 rounded-full mt-1">
                {aggregatedData.topCategory.value} baixas no total
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-2">Sem movimentações</div>
          )}
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evolução Diária de Saídas vs Entradas</h3>
              <p className="text-xs text-slate-500">Histórico dia a dia de movimentação do inventário</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                Saídas
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                Entradas
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedData.dailyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="saidasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="entradasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value, name) => [value, name === 'saidas' ? 'Saídas' : 'Entradas']}
                />
                <Area type="monotone" dataKey="saidas" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#saidasGrad)" />
                <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#entradasGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Donut Chart (1 col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Saídas por Categoria</h3>
            <p className="text-xs text-slate-500">Distribuição do volume de baixas</p>
          </div>

          <div className="h-52 w-full my-auto">
            {aggregatedData.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aggregatedData.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {aggregatedData.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => [`${val} saídas`, 'Total']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhuma saída registrada
              </div>
            )}
          </div>

          {/* Custom Category Legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-32 overflow-y-auto">
            {aggregatedData.categoryDistribution.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 truncate max-w-[170px]" title={cat.name}>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  {cat.name}
                </span>
                <span className="font-semibold text-slate-800">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 10 Ranking & Divergences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Ranking Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Top Produtos com Maior Saída
              </h3>
              <p className="text-xs text-slate-500">Produtos com maior volume de baixa no período</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              Ranking
            </span>
          </div>

          <div className="space-y-3">
            {aggregatedData.topProducts.slice(0, 7).map((prod, index) => {
              const maxOut = aggregatedData.topProducts[0]?.totalOutput || 1;
              const percent = Math.round((prod.totalOutput / maxOut) * 100);

              return (
                <div key={prod.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        index === 0 ? 'bg-amber-100 text-amber-800' :
                        index === 1 ? 'bg-slate-200 text-slate-800' :
                        index === 2 ? 'bg-amber-50 text-amber-900' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate" title={prod.name}>
                        {prod.name}
                      </span>
                    </div>
                    <span className="font-bold text-blue-700 whitespace-nowrap">
                      {prod.totalOutput}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {aggregatedData.topProducts.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma movimentação registrada no período
              </div>
            )}
          </div>
        </div>

        {/* Divergence Audit / Quality Report */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Auditoria de Divergências na Última Contagem
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo entre o estoque apurado e a contagem física
              </p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              latestDivergences.length === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {latestDivergences.length} {latestDivergences.length === 1 ? 'divergência' : 'divergências'}
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {latestDivergences.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  ✓
                </div>
                <p className="text-sm font-semibold text-slate-700">Sem divergências registradas!</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Todas as contagens físicas bateram 100% com o estoque calculado.
                </p>
              </div>
            ) : (
              latestDivergences.map((div) => {
                const isShortage = div.difference < 0;
                return (
                  <div
                    key={div.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                      isShortage ? 'bg-rose-50/50 border-rose-200' : 'bg-blue-50/50 border-blue-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {div.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Contagem da Tarde: <strong>{div.outputCount ?? 0}</strong></span>
                        <span>•</span>
                        <span>Última Contagem: <strong>{div.countedStock}</strong></span>
                        <span>•</span>
                        <span>Por: <strong>{div.countedBy}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                        isShortage ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {div.difference > 0 ? `+${div.difference} (Sobra)` : `${div.difference} (Falta)`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

