import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  SlidersHorizontal, 
  Download, 
  Printer, 
  Share2, 
  Check, 
  Search, 
  Filter, 
  Layers, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Boxes, 
  Store, 
  Warehouse, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Eye,
  Calendar,
  Package,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

export default function ReportsView({
  products = [],
  categories = [],
  suppliers = [],
  counts = {},
  selectedDate,
  users = [],
  currentUserId
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'CRITICAL', 'MOVING', 'DIVERGENT', 'ZERO'
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Available column toggles
  const [columns, setColumns] = useState({
    code: true,
    name: true,
    category: true,
    unit: true,
    supplier: true,
    estoqueLoja: true,
    estoqueDeposito: true,
    estoqueGeral: true,
    minStock: true,
    initialStock: false,
    entries: true,
    outputCount: false,
    countedStock: false,
    saidas: true,
    difference: false,
    checked: false,
    observation: false
  });

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  // Daily sessions for selectedDate
  const lojaSession = counts?.loja?.[selectedDate]?.items || {};
  const depositoSession = counts?.deposito?.[selectedDate]?.items || {};

  // Presets
  const applyPreset = (presetKey) => {
    if (presetKey === 'general') {
      setColumns({
        code: true,
        name: true,
        category: true,
        unit: true,
        supplier: true,
        estoqueLoja: true,
        estoqueDeposito: true,
        estoqueGeral: true,
        minStock: true,
        initialStock: false,
        entries: true,
        outputCount: false,
        countedStock: false,
        saidas: false,
        difference: false,
        checked: false,
        observation: false
      });
      setStatusFilter('ALL');
    } else if (presetKey === 'sales') {
      setColumns({
        code: false,
        name: true,
        category: true,
        unit: true,
        supplier: false,
        estoqueLoja: true,
        estoqueDeposito: false,
        estoqueGeral: true,
        minStock: false,
        initialStock: true,
        entries: true,
        outputCount: true,
        countedStock: true,
        saidas: true,
        difference: true,
        checked: true,
        observation: false
      });
      setStatusFilter('MOVING');
    } else if (presetKey === 'purchases') {
      setColumns({
        code: true,
        name: true,
        category: true,
        unit: true,
        supplier: true,
        estoqueLoja: true,
        estoqueDeposito: true,
        estoqueGeral: true,
        minStock: true,
        initialStock: false,
        entries: false,
        outputCount: false,
        countedStock: false,
        saidas: false,
        difference: false,
        checked: false,
        observation: false
      });
      setStatusFilter('CRITICAL');
    } else if (presetKey === 'audit') {
      setColumns({
        code: true,
        name: true,
        category: true,
        unit: true,
        supplier: false,
        estoqueLoja: true,
        estoqueDeposito: true,
        estoqueGeral: true,
        minStock: false,
        initialStock: true,
        entries: true,
        outputCount: true,
        countedStock: true,
        saidas: true,
        difference: true,
        checked: true,
        observation: true
      });
      setStatusFilter('ALL');
    } else if (presetKey === 'all') {
      setColumns({
        code: true,
        name: true,
        category: true,
        unit: true,
        supplier: true,
        estoqueLoja: true,
        estoqueDeposito: true,
        estoqueGeral: true,
        minStock: true,
        initialStock: true,
        entries: true,
        outputCount: true,
        countedStock: true,
        saidas: true,
        difference: true,
        checked: true,
        observation: true
      });
    }
  };

  const toggleColumn = (colKey) => {
    setColumns(prev => ({
      ...prev,
      [colKey]: !prev[colKey]
    }));
  };

  // Compile detailed rows with strict alphabetical ordering
  const compiledRows = useMemo(() => {
    const list = products.map(product => {
      // Loja details
      const lojaItem = lojaSession[product.id];
      const lojaInitial = Number(lojaItem?.currentStock ?? product.currentStock) || 0;
      const lojaEntries = Number(lojaItem?.entries) || 0;
      const lojaTarde = Number(lojaItem?.outputCount) || 0;
      const hasLojaCount = lojaItem?.countedStock !== null && lojaItem?.countedStock !== undefined && lojaItem?.countedStock !== '';
      const lojaCounted = hasLojaCount ? Number(lojaItem.countedStock) : null;
      const lojaDiff = Number(lojaItem?.difference) || 0;
      const lojaSaidas = Math.abs(lojaDiff);
      const isLojaChecked = !!lojaItem?.checked;
      const lojaObs = lojaItem?.observation || '';

      let estoqueLoja = product.currentStock || 0;
      if (lojaItem) {
        if (hasLojaCount) {
          estoqueLoja = Number(lojaItem.countedStock);
        } else {
          estoqueLoja = Math.max(0, lojaInitial + lojaEntries - lojaSaidas);
        }
      }

      // Depósito details
      const depItem = depositoSession[product.id];
      const depInitial = Number(depItem?.currentStock ?? product.currentStock) || 0;
      const depEntries = Number(depItem?.entries) || 0;
      const estoqueDeposito = depInitial + depEntries;
      const depObs = depItem?.observation || '';

      // Estoque Geral
      const estoqueGeral = estoqueLoja + estoqueDeposito;
      const minStock = Number(product.minStock) || 0;
      const isCritical = estoqueGeral <= minStock;
      const isZero = estoqueGeral === 0;
      const hasDivergence = hasLojaCount && lojaDiff !== 0;
      const hasMovement = lojaEntries > 0 || depEntries > 0 || lojaSaidas > 0;

      // Supplier
      let assignedSupplier = null;
      if (product.supplierId) {
        assignedSupplier = suppliers.find(s => s.id === product.supplierId) || null;
      } else if (product.supplierName) {
        assignedSupplier = suppliers.find(s => s.name === product.supplierName) || null;
      } else if (product.category) {
        const catSups = suppliers.filter(s => s.category === product.category);
        if (catSups.length === 1) assignedSupplier = catSups[0];
      }

      return {
        id: product.id,
        code: product.code || '',
        name: product.name || '',
        category: product.category || 'Geral',
        unit: product.unit || 'UN',
        supplierName: assignedSupplier ? assignedSupplier.name : (product.supplierName || 'Sem Fornecedor'),
        initialStock: lojaInitial,
        entries: lojaEntries + depEntries,
        lojaEntries,
        depEntries,
        outputCount: lojaTarde,
        countedStock: lojaCounted,
        estoqueLoja,
        estoqueDeposito,
        estoqueGeral,
        saidas: lojaSaidas,
        difference: lojaDiff,
        minStock,
        isCritical,
        isZero,
        hasDivergence,
        hasMovement,
        isChecked: isLojaChecked,
        observation: [lojaObs, depObs].filter(Boolean).join(' | ')
      };
    });

    // 1. Filter rows
    const filtered = list.filter(row => {
      // Category filter
      if (selectedCategory !== 'ALL' && row.category !== selectedCategory) {
        return false;
      }

      // Supplier filter
      if (selectedSupplier !== 'ALL' && row.supplierName !== selectedSupplier) {
        return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(term);
        const matchesCode = row.code.toLowerCase().includes(term);
        if (!matchesName && !matchesCode) return false;
      }

      // Status Filter
      if (statusFilter === 'CRITICAL' && !row.isCritical) return false;
      if (statusFilter === 'ZERO' && !row.isZero) return false;
      if (statusFilter === 'MOVING' && !row.hasMovement) return false;
      if (statusFilter === 'DIVERGENT' && !row.hasDivergence) return false;

      return true;
    });

    // 2. Classificação alfabética rigorosa: Categoria (A-Z) e Produto (A-Z)
    return filtered.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category, 'pt-BR', { sensitivity: 'base' });
      if (catCompare !== 0) return catCompare;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }, [products, lojaSession, depositoSession, suppliers, selectedCategory, selectedSupplier, searchTerm, statusFilter]);

  // Group rows by Category (A-Z)
  const groupedRows = useMemo(() => {
    const groups = {};
    compiledRows.forEach(row => {
      if (!groups[row.category]) {
        groups[row.category] = [];
      }
      groups[row.category].push(row);
    });

    // Sort category keys alphabetically (A-Z)
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      .map(cat => ({
        category: cat,
        items: groups[cat], // Items are already sorted by name
        subtotalLoja: groups[cat].reduce((acc, it) => acc + it.estoqueLoja, 0),
        subtotalDeposito: groups[cat].reduce((acc, it) => acc + it.estoqueDeposito, 0),
        subtotalGeral: groups[cat].reduce((acc, it) => acc + it.estoqueGeral, 0),
        subtotalSaidas: groups[cat].reduce((acc, it) => acc + it.saidas, 0),
        subtotalEntradas: groups[cat].reduce((acc, it) => acc + it.entries, 0),
        criticalCount: groups[cat].filter(it => it.isCritical).length
      }));
  }, [compiledRows]);

  // Totals for filtered report
  const totals = useMemo(() => {
    let totalLoja = 0;
    let totalDeposito = 0;
    let totalGeral = 0;
    let totalSaidas = 0;
    let totalEntradas = 0;
    let totalCritical = 0;

    compiledRows.forEach(r => {
      totalLoja += r.estoqueLoja;
      totalDeposito += r.estoqueDeposito;
      totalGeral += r.estoqueGeral;
      totalSaidas += r.saidas;
      totalEntradas += r.entries;
      if (r.isCritical) totalCritical++;
    });

    return {
      count: compiledRows.length,
      totalLoja,
      totalDeposito,
      totalGeral,
      totalSaidas,
      totalEntradas,
      totalCritical
    };
  }, [compiledRows]);

  // Generate XML Spreadsheet (SpreadsheetML) content for .xlm and .xml
  const generateXmlSpreadsheet = () => {
    const escapeXml = (unsafe) => {
      if (unsafe === null || unsafe === undefined) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const activeCols = [];
    if (columns.category) activeCols.push({ key: 'category', label: 'Categoria', type: 'String', width: 140 });
    if (columns.code) activeCols.push({ key: 'code', label: 'Código', type: 'String', width: 90 });
    if (columns.name) activeCols.push({ key: 'name', label: 'Produto', type: 'String', width: 220 });
    if (columns.unit) activeCols.push({ key: 'unit', label: 'Unidade', type: 'String', width: 60 });
    if (columns.supplier) activeCols.push({ key: 'supplierName', label: 'Fornecedor', type: 'String', width: 160 });
    if (columns.initialStock) activeCols.push({ key: 'initialStock', label: 'Estoque Inicial', type: 'Number', width: 90 });
    if (columns.entries) activeCols.push({ key: 'entries', label: 'Entradas (+)', type: 'Number', width: 90 });
    if (columns.outputCount) activeCols.push({ key: 'outputCount', label: 'Contagem Tarde', type: 'Number', width: 100 });
    if (columns.countedStock) activeCols.push({ key: 'countedStock', label: 'Última Contagem', type: 'Number', width: 100 });
    if (columns.estoqueLoja) activeCols.push({ key: 'estoqueLoja', label: 'Estoque Loja', type: 'Number', width: 90 });
    if (columns.estoqueDeposito) activeCols.push({ key: 'estoqueDeposito', label: 'Estoque Depósito', type: 'Number', width: 100 });
    if (columns.estoqueGeral) activeCols.push({ key: 'estoqueGeral', label: 'Estoque Geral Total', type: 'Number', width: 120 });
    if (columns.saidas) activeCols.push({ key: 'saidas', label: 'Saídas (Vendas)', type: 'Number', width: 100 });
    if (columns.minStock) activeCols.push({ key: 'minStock', label: 'Estoque Mínimo', type: 'Number', width: 90 });
    if (columns.difference) activeCols.push({ key: 'difference', label: 'Diferença', type: 'Number', width: 80 });
    if (columns.checked) activeCols.push({ key: 'checked', label: 'Conferido', type: 'String', width: 80 });
    if (columns.observation) activeCols.push({ key: 'observation', label: 'Observação', type: 'String', width: 200 });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Relatório de Estoque - Arena Viva</Title>
  <Author>${escapeXml(currentUser?.name || 'Arena Viva')}</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaStyle">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#312E81"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#312E81"/>
   </Borders>
  </Style>
  <Style ss:ID="CategoryRowStyle">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRowStyle">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3" ss:Color="#D97706"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D97706"/>
   </Borders>
  </Style>
  <Style ss:ID="TextLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="TextCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="BoldNumberStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="CriticalNumberStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Relatorio_Estoque">
  <Table>
`;

    // Column widths
    activeCols.forEach(col => {
      xml += `   <Column ss:Width="${col.width}"/>\n`;
    });

    // Title rows
    xml += `   <Row ss:Height="24">
    <Cell ss:MergeAcross="${activeCols.length - 1}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">ARENA VIVA BEACH - RELATÓRIO PERSONALIZADO DE ESTOQUE</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${activeCols.length - 1}" ss:StyleID="MetaStyle">
     <Data ss:Type="String">Data: ${escapeXml(formatDateBR(selectedDate))} | Emitido por: ${escapeXml(currentUser?.name || 'Sistema')} | Total de Itens: ${totals.count} | Estoque Geral: ${totals.totalGeral} un</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>
   <Row ss:Height="24">\n`;

    activeCols.forEach(col => {
      xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;

    const renderXmlRow = (r) => {
      let rowXml = `   <Row ss:Height="20">\n`;
      activeCols.forEach(col => {
        let val = r[col.key];
        if (col.key === 'checked') val = r.isChecked ? 'SIM' : 'NÃO';
        if (col.key === 'countedStock' && val === null) val = '';

        const isNumeric = col.type === 'Number' && val !== '' && val !== null && val !== undefined && !isNaN(Number(val));
        let styleId = 'TextCenter';
        if (col.key === 'name' || col.key === 'category' || col.key === 'supplierName' || col.key === 'observation') {
          styleId = 'TextLeft';
        }
        if (isNumeric) {
          styleId = 'NumberStyle';
          if (col.key === 'estoqueGeral') {
            styleId = r.isCritical ? 'CriticalNumberStyle' : 'BoldNumberStyle';
          }
        }

        if (isNumeric) {
          rowXml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${Number(val)}</Data></Cell>\n`;
        } else {
          rowXml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
        }
      });
      rowXml += `   </Row>\n`;
      return rowXml;
    };

    if (groupByCategory && groupedRows && groupedRows.length > 0) {
      groupedRows.forEach(g => {
        xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="${activeCols.length - 1}" ss:StyleID="CategoryRowStyle">
     <Data ss:Type="String">CATEGORIA: ${escapeXml(g.category)} (${g.items.length} itens - Subtotal Geral: ${g.subtotalGeral} un)</Data>
    </Cell>
   </Row>\n`;
        g.items.forEach(it => {
          xml += renderXmlRow(it);
        });
      });
    } else {
      compiledRows.forEach(r => {
        xml += renderXmlRow(r);
      });
    }

    // Grand Totals Row
    xml += `   <Row ss:Height="22">\n`;
    activeCols.forEach((col, idx) => {
      if (idx === 0) {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="String">TOTAL GERAL</Data></Cell>\n`;
      } else if (col.key === 'estoqueLoja') {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="Number">${totals.totalLoja}</Data></Cell>\n`;
      } else if (col.key === 'estoqueDeposito') {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="Number">${totals.totalDeposito}</Data></Cell>\n`;
      } else if (col.key === 'estoqueGeral') {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="Number">${totals.totalGeral}</Data></Cell>\n`;
      } else if (col.key === 'entries') {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="Number">${totals.totalEntradas}</Data></Cell>\n`;
      } else if (col.key === 'saidas') {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="Number">${totals.totalSaidas}</Data></Cell>\n`;
      } else {
        xml += `    <Cell ss:StyleID="TotalRowStyle"><Data ss:Type="String"></Data></Cell>\n`;
      }
    });
    xml += `   </Row>\n`;

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    return xml;
  };

  const handleExportXLM = (ext = 'xlm') => {
    const xmlContent = generateXmlSpreadsheet();
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_estoque_viva_${selectedDate}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    const activeHeaders = [];
    if (columns.category) activeHeaders.push('Categoria');
    if (columns.code) activeHeaders.push('Código');
    if (columns.name) activeHeaders.push('Produto');
    if (columns.unit) activeHeaders.push('Unidade');
    if (columns.supplier) activeHeaders.push('Fornecedor');
    if (columns.initialStock) activeHeaders.push('Estoque Inicial');
    if (columns.entries) activeHeaders.push('Entradas');
    if (columns.outputCount) activeHeaders.push('Contagem Tarde');
    if (columns.countedStock) activeHeaders.push('Última Contagem');
    if (columns.estoqueLoja) activeHeaders.push('Estoque Loja');
    if (columns.estoqueDeposito) activeHeaders.push('Estoque Depósito');
    if (columns.estoqueGeral) activeHeaders.push('Estoque Geral Total');
    if (columns.saidas) activeHeaders.push('Saídas / Vendas');
    if (columns.minStock) activeHeaders.push('Estoque Mínimo');
    if (columns.difference) activeHeaders.push('Diferença');
    if (columns.checked) activeHeaders.push('Conferido');
    if (columns.observation) activeHeaders.push('Observação');

    const csvRows = [activeHeaders.join(';')];

    compiledRows.forEach(r => {
      const rowVals = [];
      if (columns.category) rowVals.push(`"${r.category}"`);
      if (columns.code) rowVals.push(`"${r.code}"`);
      if (columns.name) rowVals.push(`"${r.name}"`);
      if (columns.unit) rowVals.push(`"${r.unit}"`);
      if (columns.supplier) rowVals.push(`"${r.supplierName}"`);
      if (columns.initialStock) rowVals.push(r.initialStock);
      if (columns.entries) rowVals.push(r.entries);
      if (columns.outputCount) rowVals.push(r.outputCount);
      if (columns.countedStock) rowVals.push(r.countedStock !== null ? r.countedStock : '');
      if (columns.estoqueLoja) rowVals.push(r.estoqueLoja);
      if (columns.estoqueDeposito) rowVals.push(r.estoqueDeposito);
      if (columns.estoqueGeral) rowVals.push(r.estoqueGeral);
      if (columns.saidas) rowVals.push(r.saidas);
      if (columns.minStock) rowVals.push(r.minStock);
      if (columns.difference) rowVals.push(r.difference);
      if (columns.checked) rowVals.push(r.isChecked ? 'SIM' : 'NÃO');
      if (columns.observation) rowVals.push(`"${r.observation.replace(/"/g, '""')}"`);

      csvRows.push(rowVals.join(';'));
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_estoque_viva_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary text for WhatsApp
  const handleCopySummary = () => {
    let text = `📊 *RELATÓRIO DE ESTOQUE - ARENA VIVA*\n`;
    text += `📅 Data: ${formatDateBR(selectedDate)}\n`;
    text += `👤 Conferente: ${currentUser?.name || 'Geral'}\n`;
    text += `📦 Total de Itens: ${totals.count} produtos\n`;
    text += `🏢 Estoque Geral Total: ${totals.totalGeral} un\n`;
    text += `🛒 Estoque Loja: ${totals.totalLoja} un | 🏭 Depósito: ${totals.totalDeposito} un\n`;
    text += `📈 Total de Saídas/Vendas: ${totals.totalSaidas} un\n`;
    if (totals.totalCritical > 0) {
      text += `⚠️ *Atenção:* ${totals.totalCritical} produtos no nível mínimo!\n`;
    }
    text += `\n*Top Itens / Resumo por Categoria:*\n`;

    groupedRows.forEach(g => {
      text += `• *${g.category}*: ${g.items.length} itens | Total: ${g.subtotalGeral} un\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    });
  };

  // Print Formatted Report
  const handlePrint = () => {
    window.print();
  };

  // Sorted list of categories for filter dropdown
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  // Sorted list of suppliers for filter dropdown
  const sortedSuppliers = useMemo(() => {
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [suppliers]);

  return (
    <div className="w-full space-y-4">
      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">ARENA VIVA BEACH - RELATÓRIO DE ESTOQUE</h1>
            <p className="text-xs text-slate-600">
              Data de Referência: <strong>{formatDateBR(selectedDate)}</strong> • Emitido por: <strong>{currentUser?.name || 'Sistema'}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            Total de Itens: <strong>{totals.count}</strong> | Estoque Geral: <strong>{totals.totalGeral} un</strong>
          </div>
        </div>
      </div>

      {/* Screen Top Banner */}
      <div className="print:hidden px-4 py-3.5 rounded-xl border bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">Central de Relatórios Personalizados</h2>
              <span className="text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                Customizável
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              Monte o relatório escolhendo as colunas, filtros e agrupamento desejados • Categorias e itens ordenados de A a Z
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            title="Copiar resumo do relatório formatado para WhatsApp"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedSummary ? 'Copiado!' : 'Copiar Resumo'}</span>
          </button>

          {/* Botão de Exportação .xlm - Requisito explícito do usuário */}
          <button
            type="button"
            onClick={() => handleExportXLM('xlm')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer ring-1 ring-emerald-400/50"
            title="Exportar dados formatados para arquivo .xlm (Planilha nativa Excel com formatação, cabeçalhos e subtotais)"
          >
            <Download className="w-4 h-4" />
            <span>Exportar .xlm</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportXLM('xml')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition cursor-pointer"
            title="Exportar arquivo no formato .xml"
          >
            <span>.xml</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 transition cursor-pointer"
            title="Exportar como CSV para Excel"
          >
            <span>.csv</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
            title="Imprimir relatório formatado ou salvar como PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards do Relatório com o Recorte Atual */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Itens Listados</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-slate-900">{totals.count}</span>
            <span className="text-[11px] text-slate-400">produtos</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 block">Estoque Loja</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-blue-600">{totals.totalLoja}</span>
            <span className="text-[11px] text-slate-400">un</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 block">Estoque Depósito</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-amber-600">{totals.totalDeposito}</span>
            <span className="text-[11px] text-slate-400">un</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-900 block">Estoque Geral Total</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-indigo-700">{totals.totalGeral}</span>
            <span className="text-[11px] text-indigo-600">un</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 block">Total Entradas</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-emerald-600">+{totals.totalEntradas}</span>
            <span className="text-[11px] text-slate-400">un</span>
          </div>
        </div>

        <div className={`p-3 rounded-xl border shadow-xs transition ${
          totals.totalCritical > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-[11px] font-semibold block ${totals.totalCritical > 0 ? 'text-rose-900 font-bold' : 'text-slate-500'}`}>
            Nível Mínimo
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-black ${totals.totalCritical > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {totals.totalCritical}
            </span>
            <span className="text-[11px] text-slate-400">críticos</span>
          </div>
        </div>
      </div>

      {/* Painel do Construtor do Relatório: Presets + Toggles de Colunas + Filtros */}
      <div className="print:hidden bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header do Configurador */}
        <div 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition select-none"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Configurador do Relatório • Monte o que você precisa observar
            </h3>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Clique para {isConfigOpen ? 'recolher' : 'expandir'} opções de colunas e filtros)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              {Object.values(columns).filter(Boolean).length} colunas ativas
            </span>
            {isConfigOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </div>

        {isConfigOpen && (
          <div className="p-4 space-y-4">
            {/* Presets Rápidos */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Modelos Rápidos (Presets):
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('general')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Estoque Geral (Consolidado)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('sales')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Vendas & Saídas (Diferença)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('purchases')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Reposição de Compras (Nível Mínimo)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('audit')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Auditoria de Contagem
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Todas as Colunas
                </button>
              </div>
            </div>

            {/* Seleção de Colunas / Campos */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                Selecione as Colunas que Deseja Exibir no Relatório:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { key: 'category', label: 'Categoria' },
                  { key: 'code', label: 'Código do Item' },
                  { key: 'name', label: 'Nome do Produto' },
                  { key: 'unit', label: 'Unidade (UN)' },
                  { key: 'supplier', label: 'Fornecedor' },
                  { key: 'estoqueLoja', label: 'Estoque Loja' },
                  { key: 'estoqueDeposito', label: 'Estoque Depósito' },
                  { key: 'estoqueGeral', label: 'Estoque Geral Total' },
                  { key: 'minStock', label: 'Estoque Mínimo' },
                  { key: 'initialStock', label: 'Estoque Inicial' },
                  { key: 'entries', label: 'Entradas (+)' },
                  { key: 'outputCount', label: 'Contagem Tarde' },
                  { key: 'countedStock', label: 'Última Contagem' },
                  { key: 'saidas', label: 'Saídas (Vendas)' },
                  { key: 'difference', label: 'Diferença' },
                  { key: 'checked', label: 'Conferido (Check)' },
                  { key: 'observation', label: 'Observação' }
                ].map(col => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
                      columns[col.key]
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!columns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {/* Busca por Produto */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Buscar Item:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Nome do produto ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 bg-slate-200 px-1 rounded cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Filtro por Categoria (Ordenado A-Z) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Categoria (A-Z):</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todas as Categorias ({categories.length})</option>
                  {sortedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Fornecedor (Ordenado A-Z) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Fornecedor (A-Z):</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os Fornecedores ({suppliers.length})</option>
                  {sortedSuppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Situação */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Situação do Estoque:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os Produtos</option>
                  <option value="CRITICAL">⚠️ Apenas Estoque Mínimo / Crítico</option>
                  <option value="ZERO">⛔ Apenas Estoque Zerado</option>
                  <option value="MOVING">📈 Apenas com Movimentação no Dia</option>
                  <option value="DIVERGENT">🔍 Apenas com Divergências na Contagem</option>
                </select>
              </div>
            </div>

            {/* Alternador de Agrupamento */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={groupByCategory}
                  onChange={(e) => setGroupByCategory(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Agrupar visualmente por Categoria (com subtotais por categoria)</span>
              </label>

              <div className="text-slate-400 text-[11px]">
                Exibindo <strong>{compiledRows.length}</strong> itens ordenados de <strong>A a Z</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Relatório Formatado: Tabela Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full">
        {compiledRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Nenhum produto encontrado com os filtros selecionados</p>
            <p className="text-xs text-slate-400 mt-1">
              Ajuste as opções no Configurador do Relatório acima.
            </p>
          </div>
        ) : groupByCategory ? (
          /* Modo Agrupado por Categoria (A-Z) com subtotais */
          <div className="divide-y divide-slate-200">
            {groupedRows.map(group => (
              <div key={group.category} className="w-full">
                {/* Cabeçalho da Categoria com Subtotais */}
                <div className="bg-slate-100/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {group.category}
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                    </span>
                    {group.criticalCount > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                        {group.criticalCount} no nível mínimo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                    {columns.estoqueLoja && <span>Loja: <strong className="text-blue-700">{group.subtotalLoja}</strong></span>}
                    {columns.estoqueDeposito && <span>Depósito: <strong className="text-amber-700">{group.subtotalDeposito}</strong></span>}
                    {columns.estoqueGeral && <span>Total: <strong className="text-indigo-700">{group.subtotalGeral}</strong></span>}
                    {columns.saidas && group.subtotalSaidas > 0 && <span>Saídas: <strong className="text-slate-900">-{group.subtotalSaidas}</strong></span>}
                  </div>
                </div>

                {/* Tabela de Itens da Categoria */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 text-slate-600 font-semibold border-b border-slate-200">
                        {columns.code && <th className="py-2 px-3 w-24">Código</th>}
                        {columns.name && <th className="py-2 px-3 min-w-[200px]">Produto (A-Z)</th>}
                        {columns.unit && <th className="py-2 px-2 text-center w-16">UN</th>}
                        {columns.supplier && <th className="py-2 px-3 w-36">Fornecedor</th>}
                        {columns.initialStock && <th className="py-2 px-2 text-center w-24">Est. Inicial</th>}
                        {columns.entries && <th className="py-2 px-2 text-center w-24 text-emerald-800 bg-emerald-50/30">Entradas (+)</th>}
                        {columns.outputCount && <th className="py-2 px-2 text-center w-24 text-amber-800 bg-amber-50/30">Cont. Tarde</th>}
                        {columns.countedStock && <th className="py-2 px-2 text-center w-24 text-amber-800 bg-amber-50/30">Últ. Contagem</th>}
                        {columns.estoqueLoja && <th className="py-2 px-2 text-center w-24 text-blue-900 bg-blue-50/30">Est. Loja</th>}
                        {columns.estoqueDeposito && <th className="py-2 px-2 text-center w-28 text-amber-900 bg-amber-50/30">Est. Depósito</th>}
                        {columns.estoqueGeral && <th className="py-2 px-2 text-center w-28 font-bold text-indigo-950 bg-indigo-50/40">Est. Geral</th>}
                        {columns.minStock && <th className="py-2 px-2 text-center w-20">Mínimo</th>}
                        {columns.saidas && <th className="py-2 px-2 text-center w-24">Saídas</th>}
                        {columns.difference && <th className="py-2 px-2 text-center w-24">Diferença</th>}
                        {columns.checked && <th className="py-2 px-2 text-center w-20">Check</th>}
                        {columns.observation && <th className="py-2 px-3 min-w-[180px]">Observações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map(item => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50 transition-colors ${
                            item.isCritical ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          {columns.code && <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{item.code || '-'}</td>}
                          {columns.name && (
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {item.isCritical && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" title="Estoque no nível mínimo ou abaixo" />
                                )}
                                <span>{item.name}</span>
                              </div>
                            </td>
                          )}
                          {columns.unit && <td className="py-2 px-2 text-center text-slate-500 font-medium">{item.unit}</td>}
                          {columns.supplier && <td className="py-2 px-3 text-slate-600 truncate max-w-[160px]">{item.supplierName}</td>}
                          {columns.initialStock && <td className="py-2 px-2 text-center text-slate-700 font-medium">{item.initialStock}</td>}
                          {columns.entries && (
                            <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/15">
                              {item.entries > 0 ? `+${item.entries}` : '0'}
                            </td>
                          )}
                          {columns.outputCount && <td className="py-2 px-2 text-center font-medium text-amber-700">{item.outputCount || '-'}</td>}
                          {columns.countedStock && <td className="py-2 px-2 text-center font-medium text-amber-700">{item.countedStock !== null ? item.countedStock : '-'}</td>}
                          {columns.estoqueLoja && <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/15">{item.estoqueLoja}</td>}
                          {columns.estoqueDeposito && <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50/15">{item.estoqueDeposito}</td>}
                          {columns.estoqueGeral && (
                            <td className="py-2 px-2 text-center font-black bg-indigo-50/20">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                                item.isCritical ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-indigo-900 font-extrabold'
                              }`}>
                                {item.estoqueGeral}
                              </span>
                            </td>
                          )}
                          {columns.minStock && <td className="py-2 px-2 text-center text-slate-500 font-medium">{item.minStock}</td>}
                          {columns.saidas && (
                            <td className="py-2 px-2 text-center font-bold text-slate-800">
                              {item.saidas > 0 ? item.saidas : '0'}
                            </td>
                          )}
                          {columns.difference && (
                            <td className="py-2 px-2 text-center font-bold">
                              {item.difference === 0 ? (
                                <span className="text-emerald-600">0</span>
                              ) : item.difference > 0 ? (
                                <span className="text-blue-600">+{item.difference}</span>
                              ) : (
                                <span className="text-rose-600">{item.difference}</span>
                              )}
                            </td>
                          )}
                          {columns.checked && (
                            <td className="py-2 px-2 text-center">
                              {item.isChecked ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          )}
                          {columns.observation && <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[200px]">{item.observation || '-'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Modo Tabela Única / Corrida (Ordenada por Categoria A-Z e Produto A-Z) */
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  {columns.category && <th className="py-2.5 px-3 w-32">Categoria (A-Z)</th>}
                  {columns.code && <th className="py-2.5 px-3 w-24">Código</th>}
                  {columns.name && <th className="py-2.5 px-3 min-w-[200px]">Produto (A-Z)</th>}
                  {columns.unit && <th className="py-2.5 px-2 text-center w-16">UN</th>}
                  {columns.supplier && <th className="py-2.5 px-3 w-36">Fornecedor</th>}
                  {columns.initialStock && <th className="py-2.5 px-2 text-center w-24">Est. Inicial</th>}
                  {columns.entries && <th className="py-2.5 px-2 text-center w-24 text-emerald-800 bg-emerald-50/30">Entradas (+)</th>}
                  {columns.outputCount && <th className="py-2.5 px-2 text-center w-24 text-amber-800 bg-amber-50/30">Cont. Tarde</th>}
                  {columns.countedStock && <th className="py-2.5 px-2 text-center w-24 text-amber-800 bg-amber-50/30">Últ. Contagem</th>}
                  {columns.estoqueLoja && <th className="py-2.5 px-2 text-center w-24 text-blue-900 bg-blue-50/30">Est. Loja</th>}
                  {columns.estoqueDeposito && <th className="py-2.5 px-2 text-center w-28 text-amber-900 bg-amber-50/30">Est. Depósito</th>}
                  {columns.estoqueGeral && <th className="py-2.5 px-2 text-center w-28 font-bold text-indigo-950 bg-indigo-50/40">Est. Geral</th>}
                  {columns.minStock && <th className="py-2.5 px-2 text-center w-20">Mínimo</th>}
                  {columns.saidas && <th className="py-2.5 px-2 text-center w-24">Saídas</th>}
                  {columns.difference && <th className="py-2.5 px-2 text-center w-24">Diferença</th>}
                  {columns.checked && <th className="py-2.5 px-2 text-center w-20">Check</th>}
                  {columns.observation && <th className="py-2.5 px-3 min-w-[180px]">Observações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compiledRows.map(item => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      item.isCritical ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    {columns.category && (
                      <td className="py-2.5 px-3">
                        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      </td>
                    )}
                    {columns.code && <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{item.code || '-'}</td>}
                    {columns.name && (
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {item.isCritical && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" title="Estoque no nível mínimo ou abaixo" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                    )}
                    {columns.unit && <td className="py-2.5 px-2 text-center text-slate-500 font-medium">{item.unit}</td>}
                    {columns.supplier && <td className="py-2.5 px-3 text-slate-600 truncate max-w-[160px]">{item.supplierName}</td>}
                    {columns.initialStock && <td className="py-2.5 px-2 text-center text-slate-700 font-medium">{item.initialStock}</td>}
                    {columns.entries && (
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/15">
                        {item.entries > 0 ? `+${item.entries}` : '0'}
                      </td>
                    )}
                    {columns.outputCount && <td className="py-2.5 px-2 text-center font-medium text-amber-700">{item.outputCount || '-'}</td>}
                    {columns.countedStock && <td className="py-2.5 px-2 text-center font-medium text-amber-700">{item.countedStock !== null ? item.countedStock : '-'}</td>}
                    {columns.estoqueLoja && <td className="py-2.5 px-2 text-center font-bold text-blue-700 bg-blue-50/15">{item.estoqueLoja}</td>}
                    {columns.estoqueDeposito && <td className="py-2.5 px-2 text-center font-bold text-amber-700 bg-amber-50/15">{item.estoqueDeposito}</td>}
                    {columns.estoqueGeral && (
                      <td className="py-2.5 px-2 text-center font-black bg-indigo-50/20">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          item.isCritical ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-indigo-900 font-extrabold'
                        }`}>
                          {item.estoqueGeral}
                        </span>
                      </td>
                    )}
                    {columns.minStock && <td className="py-2.5 px-2 text-center text-slate-500 font-medium">{item.minStock}</td>}
                    {columns.saidas && (
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                        {item.saidas > 0 ? item.saidas : '0'}
                      </td>
                    )}
                    {columns.difference && (
                      <td className="py-2.5 px-2 text-center font-bold">
                        {item.difference === 0 ? (
                          <span className="text-emerald-600">0</span>
                        ) : item.difference > 0 ? (
                          <span className="text-blue-600">+{item.difference}</span>
                        ) : (
                          <span className="text-rose-600">{item.difference}</span>
                        )}
                      </td>
                    )}
                    {columns.checked && (
                      <td className="py-2.5 px-2 text-center">
                        {item.isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}
                    {columns.observation && <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[200px]">{item.observation || '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

