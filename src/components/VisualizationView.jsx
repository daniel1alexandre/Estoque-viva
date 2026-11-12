import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  Calendar, 
  Search, 
  Layers, 
  Store, 
  Warehouse, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  FileSpreadsheet, 
  ArrowRight, 
  BarChart3, 
  Table as TableIcon, 
  CalendarDays,
  TrendingUp,
  TrendingDown,
  UserCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatDateBR, normalizeCategoryName } from '../utils/formatters';

export default function VisualizationView({
  products = [],
  categories = [],
  counts = {},
  selectedDate,
  onSelectDate,
  onNavigateToTab,
  users = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [locationFilter, setLocationFilter] = useState('loja'); // 'loja' | 'deposito' | 'both'
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'cards' | 'chart'
  const [refDate, setRefDate] = useState(selectedDate || new Date().toISOString().slice(0, 10));

  // Compute the last 7 calendar days ending at refDate (D-6 to D-0)
  const last7Days = useMemo(() => {
    const dates = [];
    const dateStr = refDate || new Date().toISOString().slice(0, 10);
    const [y, m, d] = dateStr.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);

    for (let i = 6; i >= 0; i--) {
      const dt = new Date(baseDate);
      dt.setDate(baseDate.getDate() - i);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      const curDateStr = `${year}-${month}-${day}`;

      const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weekday = weekdayNames[dt.getDay()];
      const formattedBR = `${day}/${month}`;
      const fullDateBR = `${day}/${month}/${year}`;
      const isToday = curDateStr === new Date().toISOString().slice(0, 10);

      dates.push({
        dateStr: curDateStr,
        weekday,
        formattedBR,
        fullDateBR,
        isToday,
        isReference: i === 0
      });
    }
    return dates;
  }, [refDate]);

  // Quick switch helpers
  const handleSetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRefDate(today);
  };

  const handleSetYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    setRefDate(yStr);
  };

  // Helper to extract product count stats on a given date and location
  const getProductDayData = (prodId, dateStr, loc) => {
    if (loc === 'both') {
      const lojaItem = counts.loja?.[dateStr]?.items?.[prodId];
      const depItem = counts.deposito?.[dateStr]?.items?.[prodId];

      const hasLoja = lojaItem && lojaItem.countedStock !== null && lojaItem.countedStock !== undefined && lojaItem.countedStock !== '';
      const hasDep = depItem && depItem.countedStock !== null && depItem.countedStock !== undefined && depItem.countedStock !== '';

      const lojaStock = hasLoja ? Number(lojaItem.countedStock) : (Number(lojaItem?.currentStock) || 0);
      const depStock = hasDep ? Number(depItem.countedStock) : (Number(depItem?.currentStock) || 0);

      const totalEntries = (Number(lojaItem?.entries) || 0) + (Number(depItem?.entries) || 0);
      const isChecked = !!(lojaItem?.checked || depItem?.checked);
      const hasAnyCount = hasLoja || hasDep || !!lojaItem || !!depItem;

      return {
        hasCount: hasLoja || hasDep,
        hasRecord: hasAnyCount,
        finalStock: lojaStock + depStock,
        lojaStock,
        depStock,
        entries: totalEntries,
        checked: isChecked,
        lojaItem,
        depItem,
        countedBy: lojaItem?.countedBy || depItem?.countedBy || '-'
      };
    }

    const locSession = counts[loc]?.[dateStr]?.items || {};
    const item = locSession[prodId];
    if (!item) {
      return {
        hasCount: false,
        hasRecord: false,
        finalStock: null,
        entries: 0,
        outputCount: null,
        checked: false,
        difference: 0,
        countedBy: '-'
      };
    }

    const hasCount = item.countedStock !== null && item.countedStock !== undefined && item.countedStock !== '';
    const numCounted = hasCount ? Number(item.countedStock) : null;
    const currentStock = Number(item.currentStock) || 0;
    const entries = Number(item.entries) || 0;

    // For Deposito: Final Stock = currentStock + entries
    // For Loja: Final Stock = hasCount ? countedStock : currentStock
    const finalStock = loc === 'deposito' ? (currentStock + entries) : (hasCount ? numCounted : currentStock);

    return {
      hasCount,
      hasRecord: true,
      finalStock,
      countedStock: numCounted,
      currentStock,
      entries,
      outputCount: item.outputCount !== null && item.outputCount !== undefined && item.outputCount !== '' ? Number(item.outputCount) : null,
      difference: Number(item.difference) || 0,
      checked: !!item.checked,
      countedBy: item.countedBy || '-',
      checkedAt: item.checkedAt || null,
      observation: item.observation || ''
    };
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== 'TODAS' && normalizeCategoryName(p.category).toUpperCase() !== normalizeCategoryName(selectedCategory).toUpperCase()) {
        return false;
      }
      // Search filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(term);
        const matchesCode = (p.code || '').toLowerCase().includes(term);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    }).sort((a, b) => {
      const catCompare = (a.category || '').localeCompare(b.category || '', 'pt-BR', { sensitivity: 'base' });
      if (catCompare !== 0) return catCompare;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    });
  }, [products, selectedCategory, searchTerm]);

  // Overall stats across the 7 days
  const periodStats = useMemo(() => {
    let daysWithRecords = 0;
    let totalCheckedRecords = 0;
    let totalEntriesSum = 0;
    let totalOutputsSum = 0;

    const dailySummaries = last7Days.map(d => {
      let dayChecked = 0;
      let dayEntries = 0;
      let dayOutputs = 0;
      let hasData = false;

      products.forEach(p => {
        const data = getProductDayData(p.id, d.dateStr, locationFilter);
        if (data.hasRecord) {
          hasData = true;
          if (data.checked) dayChecked++;
          dayEntries += data.entries || 0;
          if (data.outputCount !== null && data.outputCount !== undefined) {
            dayOutputs += data.outputCount;
          }
        }
      });

      if (hasData) daysWithRecords++;
      totalCheckedRecords += dayChecked;
      totalEntriesSum += dayEntries;
      totalOutputsSum += dayOutputs;

      return {
        ...d,
        hasData,
        checkedCount: dayChecked,
        totalItems: products.length,
        checkRate: products.length > 0 ? Math.round((dayChecked / products.length) * 100) : 0,
        dayEntries,
        dayOutputs
      };
    });

    return {
      daysWithRecords,
      totalCheckedRecords,
      totalEntriesSum,
      totalOutputsSum,
      dailySummaries
    };
  }, [last7Days, products, counts, locationFilter]);

  // Chart data for 7-day trend
  const chartData = useMemo(() => {
    return periodStats.dailySummaries.map(d => ({
      name: `${d.weekday} ${d.formattedBR}`,
      fullDate: d.fullDateBR,
      conferidos: d.checkedCount,
      entradas: d.dayEntries,
      saidas: d.dayOutputs,
      taxa: d.checkRate
    }));
  }, [periodStats]);

  // Export to .XLM (Excel 2003 XML Spreadsheet)
  const handleExportXLM = () => {
    const escapeXml = (unsafe) => {
      if (unsafe === null || unsafe === undefined) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const locLabel = locationFilter === 'loja' ? 'Loja / Frente' : locationFilter === 'deposito' ? 'Depósito Central' : 'Estoque Geral Consolidado';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="ProductStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CategoryStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/>
   </Borders>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CheckedCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#065F46"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Ultimos_7_Dias">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="80"/>
   <Column ss:Width="260"/>
   <Column ss:Width="130"/>
   <Column ss:Width="50"/>\n`;

    // 7 Date columns
    last7Days.forEach(() => {
      xml += `   <Column ss:Width="95"/>\n`;
    });

    // Title rows
    xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${3 + last7Days.length}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">CONTROLE DE ESTOQUE - VISUALIZAÇÃO DOS ÚLTIMOS 7 DIAS</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${3 + last7Days.length}" ss:StyleID="SubtitleStyle">
     <Data ss:Type="String">Local: ${escapeXml(locLabel)} | Período: ${escapeXml(last7Days[0].fullDateBR)} até ${escapeXml(last7Days[6].fullDateBR)} | Total de Itens: ${filteredProducts.length}</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Código</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Produto</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Categoria</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Unidade</Data></Cell>\n`;

    last7Days.forEach(d => {
      xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(d.weekday)} (${escapeXml(d.formattedBR)})</Data></Cell>\n`;
    });

    xml += `   </Row>\n`;

    // Data rows
    let currentCat = '';
    filteredProducts.forEach(prod => {
      if (prod.category !== currentCat) {
        currentCat = prod.category;
        xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="${3 + last7Days.length}" ss:StyleID="CategoryStyle">
     <Data ss:Type="String">CATEGORIA: ${escapeXml(currentCat)}</Data>
    </Cell>
   </Row>\n`;
      }

      xml += `   <Row>
    <Cell ss:StyleID="ProductStyle"><Data ss:Type="String">${escapeXml(prod.code || '-')}</Data></Cell>
    <Cell ss:StyleID="ProductStyle"><Data ss:Type="String">${escapeXml(prod.name)}</Data></Cell>
    <Cell ss:StyleID="Default"><Data ss:Type="String">${escapeXml(prod.category)}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="String">${escapeXml(prod.unit || 'UN')}</Data></Cell>\n`;

      last7Days.forEach(d => {
        const itemData = getProductDayData(prod.id, d.dateStr, locationFilter);
        const val = itemData.finalStock !== null ? itemData.finalStock : '-';
        const style = itemData.checked ? 'CheckedCell' : 'NumberCell';
        xml += `    <Cell ss:StyleID="${style}"><Data ss:Type="${typeof val === 'number' ? 'Number' : 'String'}">${val}</Data></Cell>\n`;
      });

      xml += `   </Row>\n`;
    });

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visualizacao-estoque-7dias-${last7Days[0].dateStr}-a-${last7Days[6].dateStr}.xlm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-[1920px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Context Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title and subtitle */}
          <div className="flex items-start gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-md shadow-indigo-500/20 shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Visualização dos Últimos 7 Dias</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {last7Days[0].formattedBR} até {last7Days[6].formattedBR}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Histórico detalhado, conferências diárias e evolução do estoque físico dia a dia
              </p>
            </div>
          </div>

          {/* Action buttons: Location Filter + View Mode Toggle + Export */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Location Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLocationFilter('loja')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  locationFilter === 'loja'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Loja / Frente</span>
              </button>
              <button
                type="button"
                onClick={() => setLocationFilter('deposito')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  locationFilter === 'deposito'
                    ? 'bg-white text-amber-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Warehouse className="w-3.5 h-3.5" />
                <span>Depósito</span>
              </button>
              <button
                type="button"
                onClick={() => setLocationFilter('both')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  locationFilter === 'both'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Consolidado</span>
              </button>
            </div>

            {/* View Mode Toggle: Matrix vs Cards vs Chart */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'matrix' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tabela comparativa dos 7 dias"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabela 7 Dias</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Cards com resumo diário"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Por Dia</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'chart' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gráfico de evolução da semana"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gráfico</span>
              </button>
            </div>

            {/* Reference Date Switcher */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Data final de referência dos 7 dias"
              />
              <button
                type="button"
                onClick={handleSetYesterday}
                className="text-[11px] px-1.5 py-0.5 text-slate-500 hover:text-indigo-600 font-semibold cursor-pointer rounded hover:bg-slate-200/60"
                title="Ver semana até ontem"
              >
                Ontem
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="text-[11px] px-1.5 py-0.5 text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer rounded hover:bg-indigo-50"
                title="Ver semana até hoje"
              >
                Hoje
              </button>
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportXLM}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-2xs transition cursor-pointer"
              title="Exportar tabela completa dos 7 dias para Excel .xlm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar .xlm</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              Dias com Contagem
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {periodStats.daysWithRecords} <span className="text-xs font-normal text-slate-400">de 7 dias</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Total Itens Conferidos
            </div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              {periodStats.totalCheckedRecords}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
              Saídas na Semana (Tarde)
            </div>
            <div className="text-lg font-black text-blue-700 mt-0.5">
              {periodStats.totalOutputsSum} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Entradas Repostas
            </div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              {periodStats.totalEntriesSum} <span className="text-xs font-normal text-slate-400">un</span>
            </div>
          </div>
        </div>

        {/* Filters: Search & Category Pills */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar item pelo nome do produto ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Quick info */}
          <div className="text-xs text-slate-500 font-medium shrink-0">
            Exibindo <span className="font-bold text-slate-900">{filteredProducts.length}</span> de{' '}
            <span className="font-bold text-slate-900">{products.length}</span> itens
          </div>
        </div>

        {/* Category horizontal pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5" />
            Categorias:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('TODAS')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'TODAS'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map(cat => {
            const countInCat = products.filter(p => normalizeCategoryName(p.category).toUpperCase() === normalizeCategoryName(cat).toUpperCase()).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({countInCat})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 min-w-[260px] sticky left-0 bg-slate-50 z-10 shadow-r">
                    Produto / Categoria
                  </th>
                  <th className="py-3 px-2 text-center w-16">Un</th>
                  {last7Days.map(d => (
                    <th
                      key={d.dateStr}
                      className={`py-3 px-2 text-center min-w-[105px] border-l border-slate-100 transition-colors ${
                        d.isToday
                          ? 'bg-blue-50/80 text-blue-900 border-b-2 border-b-blue-600'
                          : d.isReference
                          ? 'bg-indigo-50/60 text-indigo-950 font-black'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{d.weekday}</span>
                        <span className="text-xs font-bold text-slate-900">{d.formattedBR}</span>
                        {d.isToday && (
                          <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider mt-0.5">
                            Hoje
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4 + last7Days.length} className="text-center py-12 text-slate-400">
                      Nenhum produto encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Product Name & Category */}
                      <td className="py-2.5 px-3 min-w-[260px] sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-r">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {product.category}
                          </span>
                          {product.code && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] font-mono text-slate-400">{product.code}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-2 text-center text-[11px] font-medium text-slate-500">
                        {product.unit || 'UN'}
                      </td>

                      {/* 7 Days Columns */}
                      {last7Days.map(d => {
                        const dayData = getProductDayData(product.id, d.dateStr, locationFilter);
                        const hasVal = dayData.finalStock !== null && dayData.finalStock !== undefined;
                        const hasEntries = dayData.entries > 0;
                        const hasOutput = dayData.outputCount !== null && dayData.outputCount !== undefined && dayData.outputCount > 0;

                        return (
                          <td
                            key={d.dateStr}
                            className={`py-2 px-2 text-center border-l border-slate-100 transition-colors ${
                              d.isToday ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            {hasVal ? (
                              <div 
                                className={`inline-flex flex-col items-center justify-center p-1 rounded-lg w-full transition ${
                                  dayData.checked
                                    ? 'bg-emerald-50/80 border border-emerald-200'
                                    : 'bg-slate-50 border border-slate-200/60'
                                }`}
                                title={`Data: ${d.fullDateBR}\nEstoque Final: ${dayData.finalStock}\nEntradas (+): ${dayData.entries}\nSaída/Tarde: ${dayData.outputCount ?? '-'}\nConferido: ${dayData.checked ? 'Sim' : 'Não'}\nConferente: ${dayData.countedBy}`}
                              >
                                <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                                  <span>{dayData.finalStock}</span>
                                  {dayData.checked && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  )}
                                </div>

                                {/* Mini tags for entries or outputs */}
                                {(hasEntries || hasOutput) && (
                                  <div className="flex items-center gap-1 mt-0.5 text-[9px] font-semibold leading-none">
                                    {hasEntries && (
                                      <span className="text-emerald-700">+{dayData.entries}</span>
                                    )}
                                    {hasOutput && (
                                      <span className="text-blue-700">T:{dayData.outputCount}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-medium">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode: Timeline / Daily Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          {periodStats.dailySummaries.map((day, idx) => {
            const isLatest = idx === 6;
            return (
              <div
                key={day.dateStr}
                className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                  day.isToday
                    ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/10'
                    : day.isReference
                    ? 'border-indigo-300 bg-indigo-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400 block">
                        {day.weekday}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {day.formattedBR}
                      </h4>
                    </div>
                    {day.isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Metrics in this day */}
                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Conferidos:
                      </span>
                      <span className="font-bold text-slate-800">
                        {day.checkedCount}/{day.totalItems}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${day.checkRate}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        Entradas:
                      </span>
                      <span className="font-semibold text-emerald-700">
                        +{day.dayEntries} un
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                        Tarde / Saídas:
                      </span>
                      <span className="font-semibold text-blue-700">
                        {day.dayOutputs} un
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action: Go directly to this day's count view */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectDate) onSelectDate(day.dateStr);
                      if (onNavigateToTab) onNavigateToTab(locationFilter === 'deposito' ? 'deposito' : 'count');
                    }}
                    className="w-full py-1.5 text-xs font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Abrir Contagem</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode: Charts */}
      {viewMode === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Itens Conferidos Dia a Dia */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Itens Conferidos nos Últimos 7 Dias
            </h3>
            <p className="text-xs text-slate-400 mb-4">Volume diário de conferências físicas realizadas</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="conferidos" fill="#10b981" radius={[4, 4, 0, 0]} name="Itens Conferidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Entradas vs Saídas nos 7 Dias */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Movimentações da Semana: Entradas vs Saídas
            </h3>
            <p className="text-xs text-slate-400 mb-4">Comparativo de reposições de estoque e saídas da tarde</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="entradas" fill="#059669" radius={[4, 4, 0, 0]} name="Entradas (+)" />
                  <Bar dataKey="saidas" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Saídas (Tarde)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

