import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Building2, 
  Layers, 
  ListFilter, 
  Search, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  AlertTriangle, 
  ArrowUpRight, 
  Phone, 
  Mail, 
  Package, 
  Tag, 
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function OrdersView({
  products = [],
  categories = [],
  suppliers = [],
  counts = {},
  selectedDate,
  onOpenSuppliersModal,
  onSaveProduct
}) {
  const [viewMode, setViewMode] = useState('supplier'); // 'supplier' | 'category' | 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [customQuantities, setCustomQuantities] = useState({});
  const [expandedCards, setExpandedCards] = useState({});

  // Calculate Loja and Depósito Sessions for selected date
  const lojaSession = counts?.loja?.[selectedDate]?.items || {};
  const depositoSession = counts?.deposito?.[selectedDate]?.items || {};

  const orderItems = useMemo(() => {
    return products.map(product => {
      // 1. Depósito stock: base stock + entries
      const depItem = depositoSession[product.id];
      let stock = product.depositoStock ?? 0;
      let entries = 0;
      if (depItem) {
        stock = Number(depItem.currentStock ?? product.depositoStock ?? 0) || 0;
        entries = Number(depItem.entries) || 0;
      }
      const totalDepositoStock = stock + entries;

      // 2. Loja stock
      const lojaItem = lojaSession[product.id];
      let lojaStock = product.currentStock || 0;
      if (lojaItem) {
        const hasCount = lojaItem.countedStock !== null && lojaItem.countedStock !== undefined && lojaItem.countedStock !== '';
        if (hasCount) {
          lojaStock = Number(lojaItem.countedStock);
        } else {
          const cur = Number(lojaItem.currentStock ?? product.currentStock) || 0;
          const ent = Number(lojaItem.entries) || 0;
          const hasTarde = lojaItem.outputCount !== null && lojaItem.outputCount !== undefined && lojaItem.outputCount !== '';
          if (hasTarde) {
            lojaStock = Number(lojaItem.outputCount);
          } else {
            lojaStock = cur + ent;
          }
        }
      }

      // 3. Estoque Geral Total
      const totalGeneralStock = lojaStock + totalDepositoStock;
      const minStock = Number(product.minStock) || 0;

      // Regra: Produtos cujo estoque geral ou estoque no depósito estiver igual ou abaixo do mínimo são lançados em Pedidos
      const needsOrder = totalGeneralStock <= minStock || totalDepositoStock <= minStock;
      
      // Suggested order qty: target = minStock * 2 (ou pelo menos repor o déficit)
      const targetStock = minStock > 0 ? minStock * 2 : 10;
      const autoSuggestion = Math.max(1, targetStock - Math.max(0, totalGeneralStock));
      const orderQty = customQuantities[product.id] !== undefined ? customQuantities[product.id] : autoSuggestion;

      // Determine supplier: product's supplierId -> supplier with same category (ONLY if category has single supplier) -> unassigned
      let assignedSupplier = null;
      if (product.supplierId) {
        assignedSupplier = suppliers.find(s => s.id === product.supplierId) || null;
      }
      if (!assignedSupplier && product.supplierName) {
        assignedSupplier = suppliers.find(s => s.name === product.supplierName) || null;
      }
      if (!assignedSupplier && product.category) {
        const catSuppliers = suppliers.filter(s => s.category === product.category);
        if (catSuppliers.length === 1) {
          assignedSupplier = catSuppliers[0];
        }
      }

      return {
        product,
        lojaStock,
        depositoStock: totalDepositoStock,
        totalGeneralStock,
        minStock,
        needsOrder,
        deficit: Math.max(0, minStock - totalGeneralStock),
        orderQty,
        supplier: assignedSupplier,
        supplierName: assignedSupplier ? assignedSupplier.name : 'Sem Fornecedor Vinculado'
      };
    }).filter(item => item.needsOrder); // Only items where generalStock <= minStock OR depositoStock <= minStock
  }, [products, lojaSession, depositoSession, suppliers, customQuantities]);

  // Handle suggested qty edit
  const handleQtyChange = (productId, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setCustomQuantities(prev => ({
      ...prev,
      [productId]: num
    }));
  };

  const handleProductSupplierChange = (product, newSupplierId) => {
    if (!onSaveProduct) return;
    const sup = suppliers.find(s => s.id === newSupplierId);
    onSaveProduct({
      ...product,
      supplierId: newSupplierId || null,
      supplierName: sup ? sup.name : null
    });
  };

  // Toggle card expansion
  const toggleExpand = (key) => {
    setExpandedCards(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  // Filtered order items by search / supplier / category
  const filteredItems = useMemo(() => {
    return orderItems.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        item.product.name.toLowerCase().includes(q) ||
        (item.product.code && item.product.code.toLowerCase().includes(q)) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(q)) ||
        (item.product.category && item.product.category.toLowerCase().includes(q));

      const matchSup = filterSupplier === 'ALL' || (item.supplier ? item.supplier.id === filterSupplier : filterSupplier === 'NONE');
      const matchCat = filterCategory === 'ALL' || item.product.category === filterCategory;

      return matchSearch && matchSup && matchCat;
    }).sort((a, b) => {
      const c = (a.product.category || '').localeCompare(b.product.category || '', 'pt-BR', { sensitivity: 'base' });
      if (c !== 0) return c;
      return (a.product.name || '').localeCompare(b.product.name || '', 'pt-BR', { sensitivity: 'base' });
    });
  }, [orderItems, searchTerm, filterSupplier, filterCategory]);

  // Group by Supplier
  const groupedBySupplier = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const supKey = item.supplier ? item.supplier.id : 'unassigned';
      if (!groups[supKey]) {
        groups[supKey] = {
          supplier: item.supplier,
          supplierName: item.supplier ? item.supplier.name : 'Fornecedor a Definir / Não Vinculado',
          items: []
        };
      }
      groups[supKey].items.push(item);
    });
    return Object.values(groups).map(g => ({
      ...g,
      items: g.items.sort((a, b) => a.product.name.localeCompare(b.product.name, 'pt-BR', { sensitivity: 'base' }))
    })).sort((a, b) => {
      if (a.supplier && !b.supplier) return -1;
      if (!a.supplier && b.supplier) return 1;
      return a.supplierName.localeCompare(b.supplierName, 'pt-BR', { sensitivity: 'base' });
    });
  }, [filteredItems]);

  // Group by Segment / Category
  const groupedByCategory = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const cat = item.product.category || 'OUTROS';
      if (!groups[cat]) {
        groups[cat] = {
          category: cat,
          items: []
        };
      }
      groups[cat].items.push(item);
    });
    return Object.values(groups).map(g => ({
      ...g,
      items: g.items.sort((a, b) => a.product.name.localeCompare(b.product.name, 'pt-BR', { sensitivity: 'base' }))
    })).sort((a, b) => a.category.localeCompare(b.category, 'pt-BR', { sensitivity: 'base' }));
  }, [filteredItems]);

  // Copy formatted WhatsApp order to clipboard
  const copyWhatsAppOrder = (groupName, items, supplier) => {
    const dateFormatted = new Date().toLocaleDateString('pt-BR');
    let message = `🛒 *PEDIDO DE COMPRA - ARENA VIVA*\n`;
    message += `📅 Data: ${dateFormatted}\n`;
    if (supplier) {
      message += `🏢 Fornecedor: *${supplier.name}*\n`;
      if (supplier.contact) message += `👤 A/C: ${supplier.contact}\n`;
    } else {
      message += `🏷️ Segmento: *${groupName}*\n`;
    }
    message += `----------------------------------------\n`;
    message += `*ITENS SOLICITADOS:*\n\n`;

    items.forEach((it, idx) => {
      const p = it.product;
      message += `${idx + 1}. *${p.name}*\n`;
      message += `   • Quantidade a Pedir: *${it.orderQty} ${p.unit || 'UN'}*\n`;
      message += `   • Estoque Atual Depósito: ${it.depositoStock} (Mín: ${it.minStock})\n\n`;
    });

    message += `----------------------------------------\n`;
    message += `Solicitamos confirmar recebimento e prazo de entrega. Obrigado! 🏖️🎾`;

    navigator.clipboard.writeText(message);
    setCopiedId(groupName);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Open WhatsApp Web with prefilled message
  const openWhatsApp = (supplier, items) => {
    if (!supplier?.phone) {
      alert('Este fornecedor não possui telefone cadastrado. Cadastre no Gerenciador de Fornecedores.');
      return;
    }
    const cleanPhone = supplier.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    const dateFormatted = new Date().toLocaleDateString('pt-BR');
    let message = `🛒 *PEDIDO DE COMPRA - ARENA VIVA*\n`;
    message += `📅 Data: ${dateFormatted}\n`;
    message += `🏢 Fornecedor: *${supplier.name}*\n`;
    if (supplier.contact) message += `👤 A/C: ${supplier.contact}\n\n`;
    message += `Olá! Segue nosso pedido para reposição do estoque da Arena Viva:\n\n`;

    items.forEach((it, idx) => {
      message += `${idx + 1}. *${it.product.name}* -> *${it.orderQty} ${it.product.unit || 'UN'}*\n`;
    });

    message += `\nFavor confirmar disponibilidade e previsão de entrega!`;

    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Print order
  const handlePrint = () => {
    window.print();
  };

  // Summary statistics
  const totalItemsNeedingOrder = orderItems.length;
  const zeroStockItems = orderItems.filter(i => i.depositoStock === 0).length;
  const totalSuggestedUnits = orderItems.reduce((acc, curr) => acc + curr.orderQty, 0);
  const activeSuppliersWithOrders = new Set(orderItems.map(i => i.supplier?.id || 'none')).size;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/15 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider">Produtos no Mínimo</p>
            <h3 className="text-3xl font-extrabold mt-1">{totalItemsNeedingOrder}</h3>
            <p className="text-xs text-orange-100 mt-1 flex items-center">
              <span>Estoque no Depósito ≤ Mínimo</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Estoque Zerado (Crítico)</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{zeroStockItems}</h3>
            <p className="text-xs text-slate-500 mt-1">Urgência máxima de compra</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidades a Comprar</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{totalSuggestedUnits}</h3>
            <p className="text-xs text-slate-500 mt-1">Total de unidades sugeridas</p>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
            <Package className="w-6 h-6 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fornecedores a Acionar</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{activeSuppliersWithOrders}</h3>
            <p className="text-xs text-slate-500 mt-1">Parceiros com pedidos pendentes</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Control Bar: View Switcher, Search, Filters, and Supplier Management Button */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View Mode Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setViewMode('supplier')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'supplier'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Por Fornecedor</span>
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'category'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Segmento</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista Geral ({orderItems.length})</span>
            </button>
          </div>

          {/* Quick Actions: Manage Suppliers & Print */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSuppliersModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-200"
            >
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Cadastrar / Gerenciar Fornecedores</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs rounded-xl transition-colors border border-orange-200"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Pedidos</span>
            </button>
          </div>
        </div>

        {/* Filters Row: Search input + Fornecedor select + Categoria select */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por produto, fornecedor ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="ALL">Todos os Fornecedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="NONE">Sem Fornecedor Vinculado</option>
            </select>
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="ALL">Todos os Segmentos</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      {orderItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Estoque do Depósito 100% Abastecido!</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Nenhum produto está com estoque igual ou abaixo do nível mínimo no Depósito. Todos os itens estão com margem segura.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Grouped by Supplier */}
          {viewMode === 'supplier' && (
            <div className="space-y-5">
              {groupedBySupplier.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
                  Nenhum produto correspondente aos filtros aplicados.
                </div>
              ) : (
                groupedBySupplier.map(group => {
                  const isExpanded = expandedCards[group.supplierName] !== false; // default open
                  const sup = group.supplier;
                  const totalUnitsGroup = group.items.reduce((acc, it) => acc + it.orderQty, 0);

                  return (
                    <div 
                      key={group.supplierName} 
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-orange-300"
                    >
                      {/* Supplier Card Header */}
                      <div className="p-5 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-base font-bold text-slate-800">{group.supplierName}</h3>
                              {sup?.category && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                  {sup.category}
                                </span>
                              )}
                              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                                {group.items.length} {group.items.length === 1 ? 'item' : 'itens'} ({totalUnitsGroup} un)
                              </span>
                            </div>

                            {/* Contact info */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                              {sup?.contact && (
                                <span>Contato: <strong className="text-slate-700">{sup.contact}</strong></span>
                              )}
                              {sup?.phone && (
                                <span className="flex items-center space-x-1 text-slate-700">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{sup.phone}</span>
                                </span>
                              )}
                              {sup?.email && (
                                <span className="flex items-center space-x-1 text-slate-600">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{sup.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons on card header */}
                        <div className="flex items-center flex-wrap gap-2 shrink-0">
                          {sup?.phone && (
                            <button
                              onClick={() => openWhatsApp(sup, group.items)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          <button
                            onClick={() => copyWhatsAppOrder(group.supplierName, group.items, sup)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/20 transition-all"
                          >
                            {copiedId === group.supplierName ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Pedido</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => toggleExpand(group.supplierName)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Items Table */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                                <th className="py-2.5 px-4 font-bold">Produto</th>
                                <th className="py-2.5 px-3 font-bold">Segmento</th>
                                <th className="py-2.5 px-3 font-bold text-center">Estoque Geral (Total)</th>
                                <th className="py-2.5 px-3 font-bold text-center">Estoque Mínimo</th>
                                <th className="py-2.5 px-3 font-bold text-center">Déficit</th>
                                <th className="py-2.5 px-4 font-bold text-right">Qtd. a Pedir</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map(it => {
                                const p = it.product;
                                const isZero = it.totalGeneralStock === 0;

                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-4">
                                      <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                                      <div className="text-[11px] text-slate-400">{p.code}</div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium text-[11px]">
                                        {p.category}
                                      </span>
                                      {!sup && onSaveProduct && (
                                        <div className="mt-1">
                                          <select
                                            value=""
                                            onChange={(e) => handleProductSupplierChange(p, e.target.value)}
                                            className="text-[11px] bg-orange-50 border border-orange-200 text-orange-900 rounded-md px-1.5 py-0.5 font-medium cursor-pointer"
                                          >
                                            <option value="">Atribuir fornecedor...</option>
                                            {suppliers.map(s => (
                                              <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs ${
                                          isZero 
                                            ? 'bg-rose-100 text-rose-700 border border-rose-300' 
                                            : it.totalGeneralStock <= it.minStock 
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                              : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {it.totalGeneralStock} un
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                          Loja: {it.lojaStock} • Dep: {it.depositoStock}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center text-slate-600 font-semibold">
                                      {it.minStock} un
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="text-rose-600 font-bold">
                                        -{it.deficit}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="inline-flex items-center space-x-1.5 justify-end">
                                        <input
                                          type="number"
                                          min="1"
                                          value={it.orderQty}
                                          onChange={(e) => handleQtyChange(p.id, e.target.value)}
                                          className="w-16 px-2 py-1 text-center font-bold text-sm bg-orange-50 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-900"
                                        />
                                        <span className="text-slate-400 font-medium">{p.unit || 'UN'}</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. Grouped by Category */}
          {viewMode === 'category' && (
            <div className="space-y-5">
              {groupedByCategory.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
                  Nenhum produto correspondente aos filtros aplicados.
                </div>
              ) : (
                groupedByCategory.map(group => {
                  const isExpanded = expandedCards[group.category] !== false;
                  const totalUnitsGroup = group.items.reduce((acc, it) => acc + it.orderQty, 0);

                  return (
                    <div 
                      key={group.category} 
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-orange-300"
                    >
                      <div className="p-5 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-base font-bold text-slate-800">{group.category}</h3>
                              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                                {group.items.length} {group.items.length === 1 ? 'item' : 'itens'} ({totalUnitsGroup} un)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">Reposição para produtos deste segmento</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyWhatsAppOrder(group.category, group.items, null)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            {copiedId === group.category ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Segmento</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => toggleExpand(group.category)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                                <th className="py-2.5 px-4 font-bold">Produto</th>
                                <th className="py-2.5 px-3 font-bold">Fornecedor</th>
                                <th className="py-2.5 px-3 font-bold text-center">Estoque Geral (Total)</th>
                                <th className="py-2.5 px-3 font-bold text-center">Estoque Mínimo</th>
                                <th className="py-2.5 px-3 font-bold text-center">Déficit</th>
                                <th className="py-2.5 px-4 font-bold text-right">Qtd. a Pedir</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map(it => {
                                const p = it.product;
                                const isZero = it.totalGeneralStock === 0;

                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-4">
                                      <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                                      <div className="text-[11px] text-slate-400">{p.code}</div>
                                    </td>
                                    <td className="py-3 px-3">
                                      {onSaveProduct ? (
                                        <select
                                          value={p.supplierId || ''}
                                          onChange={(e) => handleProductSupplierChange(p, e.target.value)}
                                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-800 focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer max-w-[170px]"
                                        >
                                          <option value="">Sem Fornecedor</option>
                                          {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="inline-flex items-center text-slate-700 font-medium">
                                          <Building2 className="w-3.5 h-3.5 text-slate-400 mr-1" />
                                          {it.supplierName}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs ${
                                          isZero 
                                            ? 'bg-rose-100 text-rose-700 border border-rose-300' 
                                            : it.totalGeneralStock <= it.minStock 
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                              : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {it.totalGeneralStock} un
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                          Loja: {it.lojaStock} • Dep: {it.depositoStock}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center text-slate-600 font-semibold">
                                      {it.minStock} un
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="text-rose-600 font-bold">
                                        -{it.deficit}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="inline-flex items-center space-x-1.5 justify-end">
                                        <input
                                          type="number"
                                          min="1"
                                          value={it.orderQty}
                                          onChange={(e) => handleQtyChange(p.id, e.target.value)}
                                          className="w-16 px-2 py-1 text-center font-bold text-sm bg-orange-50 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-900"
                                        />
                                        <span className="text-slate-400 font-medium">{p.unit || 'UN'}</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 3. General List */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-4 font-bold">Produto</th>
                      <th className="py-3 px-3 font-bold">Segmento</th>
                      <th className="py-3 px-3 font-bold">Fornecedor</th>
                      <th className="py-3 px-3 font-bold text-center">Estoque Geral (Total)</th>
                      <th className="py-3 px-3 font-bold text-center">Estoque Mínimo</th>
                      <th className="py-3 px-3 font-bold text-center">Déficit</th>
                      <th className="py-3 px-4 font-bold text-right">Qtd. a Pedir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(it => {
                      const p = it.product;
                      const isZero = it.totalGeneralStock === 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                            <div className="text-[11px] text-slate-400">{p.code}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium text-[11px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {onSaveProduct ? (
                              <select
                                value={p.supplierId || ''}
                                onChange={(e) => handleProductSupplierChange(p, e.target.value)}
                                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-800 focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer max-w-[170px]"
                              >
                                <option value="">Sem Fornecedor</option>
                                {suppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-700 font-medium">
                                {it.supplierName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs ${
                                isZero 
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300' 
                                  : it.totalGeneralStock <= it.minStock 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                    : 'bg-slate-100 text-slate-700'
                              }`}>
                                {it.totalGeneralStock} un
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                Loja: {it.lojaStock} • Dep: {it.depositoStock}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 font-semibold">
                            {it.minStock} un
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-rose-600 font-bold">
                              -{it.deficit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center space-x-1.5 justify-end">
                              <input
                                type="number"
                                min="1"
                                value={it.orderQty}
                                onChange={(e) => handleQtyChange(p.id, e.target.value)}
                                className="w-16 px-2 py-1 text-center font-bold text-sm bg-orange-50 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-900"
                              />
                              <span className="text-slate-400 font-medium">{p.unit || 'UN'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

