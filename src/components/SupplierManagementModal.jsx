import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Phone, 
  Mail, 
  User, 
  Tag, 
  Search, 
  Link2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  Square,
  Boxes,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';

export default function SupplierManagementModal({
  isOpen,
  onClose,
  suppliers = [],
  categories = [],
  products = [],
  onSaveSupplier,
  onDeleteSupplier,
  onAssignProductsToSupplier
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    category: '',
    notes: ''
  });
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // --- State for the Product Selection / Linking View ---
  const [linkingSupplier, setLinkingSupplier] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [linkFilterCategory, setLinkFilterCategory] = useState('ALL');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkSelectionFilter, setLinkSelectionFilter] = useState('all'); // 'all' | 'selected' | 'unselected'

  if (!isOpen) return null;

  const showFeedback = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleStartAdd = () => {
    setEditingSupplier('new');
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      category: categories[0] || '',
      notes: ''
    });
  };

  const handleStartEdit = (sup) => {
    setEditingSupplier(sup.id);
    setFormData({
      name: sup.name || '',
      contact: sup.contact || '',
      phone: sup.phone || '',
      email: sup.email || '',
      category: sup.category || '',
      notes: sup.notes || ''
    });
  };

  const handleCancelForm = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      category: '',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const payload = {
        ...(editingSupplier !== 'new' ? { id: editingSupplier } : {}),
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        category: formData.category,
        notes: formData.notes.trim()
      };

      await onSaveSupplier(payload);
      showFeedback(editingSupplier === 'new' ? 'Fornecedor cadastrado com sucesso!' : 'Fornecedor atualizado com sucesso!');
      handleCancelForm();
    } catch (err) {
      showFeedback('Erro ao salvar fornecedor', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir o fornecedor "${name}"? Os produtos vinculados a ele ficarão sem fornecedor definido.`)) {
      try {
        await onDeleteSupplier(id);
        showFeedback('Fornecedor excluído com sucesso!');
        if (editingSupplier === id) handleCancelForm();
        if (linkingSupplier?.id === id) setLinkingSupplier(null);
      } catch (err) {
        showFeedback('Erro ao excluir fornecedor', 'error');
      }
    }
  };

  // --- OPEN PRODUCT LINKER VIEW ---
  const handleOpenProductLinker = (sup) => {
    setLinkingSupplier(sup);
    // Find all products already linked to this supplier
    const currentlyLinked = products
      .filter(p => p.supplierId === sup.id || (!p.supplierId && p.supplierName === sup.name))
      .map(p => p.id);
    setSelectedProductIds(new Set(currentlyLinked));
    setLinkFilterCategory(sup.category || 'ALL');
    setLinkSearchTerm('');
    setLinkSelectionFilter('all');
  };

  const handleCloseProductLinker = () => {
    setLinkingSupplier(null);
    setSelectedProductIds(new Set());
  };

  const handleToggleProduct = (productId) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Filter products in the product linker
  const linkerFilteredProducts = useMemo(() => {
    if (!linkingSupplier) return [];

    return products.filter(p => {
      // Category filter
      if (linkFilterCategory !== 'ALL' && p.category !== linkFilterCategory) {
        return false;
      }

      // Search term
      if (linkSearchTerm.trim()) {
        const q = linkSearchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code && p.code.toLowerCase().includes(q);
        const matchesCat = p.category && p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCat) return false;
      }

      // Selection filter ('all' | 'selected' | 'unselected')
      const isSelected = selectedProductIds.has(p.id);
      if (linkSelectionFilter === 'selected' && !isSelected) return false;
      if (linkSelectionFilter === 'unselected' && isSelected) return false;

      return true;
    });
  }, [products, linkingSupplier, linkFilterCategory, linkSearchTerm, linkSelectionFilter, selectedProductIds]);

  // Bulk actions in product linker
  const handleSelectAllFiltered = () => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      linkerFilteredProducts.forEach(p => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      linkerFilteredProducts.forEach(p => next.delete(p.id));
      return next;
    });
  };

  // Save selected products to supplier
  const handleSaveProductLinks = async () => {
    if (!linkingSupplier) return;
    try {
      const idsArray = Array.from(selectedProductIds);
      if (onAssignProductsToSupplier) {
        await onAssignProductsToSupplier(linkingSupplier.id, linkingSupplier.name, idsArray);
      }
      showFeedback(`Produtos vinculados com sucesso a ${linkingSupplier.name}! (${idsArray.length} produtos)`);
      handleCloseProductLinker();
    } catch (err) {
      showFeedback('Erro ao salvar vínculos de produtos', 'error');
    }
  };

  // Filtered suppliers list
  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.contact && s.contact.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ===================== VIEW 1: PRODUCT LINKER VIEW ===================== */}
        {linkingSupplier ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-white">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleCloseProductLinker}
                  className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-100/60 rounded-xl transition-colors"
                  title="Voltar para a lista de fornecedores"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-800">
                      Vincular Produtos — <span className="text-orange-600">{linkingSupplier.name}</span>
                    </h2>
                    {linkingSupplier.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                        {linkingSupplier.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Selecione quais produtos pertencem a este fornecedor. Vários fornecedores podem atender a mesma categoria.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseProductLinker}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar produto por nome ou código..."
                    value={linkSearchTerm}
                    onChange={(e) => setLinkSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Category Filter */}
                <div className="sm:col-span-4">
                  <select
                    value={linkFilterCategory}
                    onChange={(e) => setLinkFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="ALL">Todas as Categorias ({products.length} produtos)</option>
                    {categories.map(c => {
                      const count = products.filter(p => p.category === c).length;
                      return (
                        <option key={c} value={c}>
                          {c} ({count} produtos)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selection Filter Tabs */}
                <div className="sm:col-span-3 flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setLinkSelectionFilter('all')}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-semibold text-center transition-all ${
                      linkSelectionFilter === 'all'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkSelectionFilter('selected')}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-semibold text-center transition-all ${
                      linkSelectionFilter === 'selected'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Marcados ({selectedProductIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkSelectionFilter('unselected')}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-semibold text-center transition-all ${
                      linkSelectionFilter === 'unselected'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Outros
                  </button>
                </div>
              </div>

              {/* Quick Bulk Selection Buttons & Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                    <span>Marcar Todos Filtrados ({linkerFilteredProducts.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Desmarcar Filtrados</span>
                  </button>
                </div>

                <span className="text-xs text-slate-500">
                  Mostrando <strong>{linkerFilteredProducts.length}</strong> produtos
                </span>
              </div>
            </div>

            {/* Products Checklist Table */}
            <div className="p-4 overflow-y-auto flex-1">
              {linkerFilteredProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum produto encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de busca ou categoria acima.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Selecionar</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Situação Atual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkerFilteredProducts.map(p => {
                        const isChecked = selectedProductIds.has(p.id);
                        const otherSupplier = p.supplierId && p.supplierId !== linkingSupplier.id
                          ? suppliers.find(s => s.id === p.supplierId)
                          : null;
                        const isCurrentSupplier = p.supplierId === linkingSupplier.id;

                        return (
                          <tr
                            key={p.id}
                            onClick={() => handleToggleProduct(p.id)}
                            className={`cursor-pointer transition-colors ${
                              isChecked ? 'bg-orange-50/70 hover:bg-orange-100/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleProduct(p.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div className="flex items-center space-x-2">
                                <span>{p.name}</span>
                                {p.code && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({p.code})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {isCurrentSupplier ? (
                                <span className="inline-flex items-center text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                  <Check className="w-3 h-3 mr-1" />
                                  Já vinculado a este fornecedor
                                </span>
                              ) : otherSupplier ? (
                                <span className="inline-flex items-center text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                                  Vinculado a: {otherSupplier.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">
                                  Sem fornecedor vinculado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer with Save / Cancel */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Total selecionado para <strong>{linkingSupplier.name}</strong>:{' '}
                <strong className="text-orange-600 text-sm font-bold">{selectedProductIds.size}</strong> produtos
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleCloseProductLinker}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductLinks}
                  className="inline-flex items-center space-x-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/20 transition-all hover:shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Vínculos ({selectedProductIds.size})</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ===================== VIEW 2: SUPPLIERS LIST & CRUD VIEW ===================== */
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Gerenciamento de Fornecedores</h2>
                  <p className="text-xs text-slate-500">
                    Cadastre fornecedores e vincule os produtos que cada um fornece para pedidos de compra automáticos
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback message banner */}
            {feedbackMsg && (
              <div className={`px-6 py-2.5 text-sm font-medium flex items-center space-x-2 ${
                feedbackMsg.type === 'error' ? 'bg-red-50 text-red-700 border-b border-red-100' : 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
              }`}>
                {feedbackMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Top Bar: Search + Add Button */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por fornecedor, contato, categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                </div>
                {!editingSupplier && (
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-orange-500/20 transition-all hover:shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Fornecedor</span>
                  </button>
                )}
              </div>

              {/* Form (Add or Edit) */}
              {editingSupplier && (
                <form onSubmit={handleSubmit} className="bg-orange-50/50 border border-orange-200/80 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-orange-600" />
                      <span>{editingSupplier === 'new' ? 'Cadastrar Novo Fornecedor' : 'Editar Fornecedor'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Empresa / Fornecedor *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ambev Distribuição, Hortifruti Viva..."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Segmento Principal / Categoria</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      >
                        <option value="">Selecione a categoria principal...</option>
                        {categories.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pessoa de Contato / Vendedor</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Ex: Carlos (Vendas)"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Ex: (11) 98765-4321"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail para Pedidos</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="Ex: pedidos@fornecedor.com.br"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Observações de Entrega / Condições</label>
                      <input
                        type="text"
                        placeholder="Ex: Pedido mínimo R$ 500, entregas às terças e quintas"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-orange-200/60">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingSupplier === 'new' ? 'Salvar Fornecedor' : 'Atualizar Fornecedor'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Suppliers List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                {filteredSuppliers.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum fornecedor encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">Clique em "Novo Fornecedor" para cadastrar seu primeiro parceiro de compras.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSuppliers.map(sup => {
                      const linkedProductsCount = products.filter(p => p.supplierId === sup.id || (!p.supplierId && p.supplierName === sup.name)).length;

                      return (
                        <div key={sup.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-base">{sup.name}</h4>
                              {sup.category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {sup.category}
                                </span>
                              )}
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                <Boxes className="w-3 h-3 mr-1 text-orange-500" />
                                {linkedProductsCount} {linkedProductsCount === 1 ? 'produto vinculado' : 'produtos vinculados'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                              {sup.contact && (
                                <span className="flex items-center space-x-1">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sup.contact}</span>
                                </span>
                              )}
                              {sup.phone && (
                                <span className="flex items-center space-x-1 text-slate-700 font-medium">
                                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{sup.phone}</span>
                                </span>
                              )}
                              {sup.email && (
                                <span className="flex items-center space-x-1 text-slate-600">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sup.email}</span>
                                </span>
                              )}
                            </div>

                            {sup.notes && (
                              <p className="text-xs text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 max-w-2xl">
                                {sup.notes}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenProductLinker(sup)}
                              title={`Selecionar os produtos específicos que ${sup.name} fornece`}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Vincular Produtos ({linkedProductsCount})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(sup)}
                              title="Editar dados cadastrais do fornecedor"
                              className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-transparent hover:border-orange-200 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(sup.id, sup.name)}
                              title="Excluir fornecedor"
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Total de Fornecedores Cadastrados: <strong className="text-slate-800">{suppliers.length}</strong></span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
