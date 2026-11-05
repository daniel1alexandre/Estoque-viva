import React, { useState, useMemo } from 'react';
import { X, Plus, Edit2, Trash2, Package, Layers, Check, Search } from 'lucide-react';

export default function ProductManagementModal({
  isOpen,
  onClose,
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onAddCategory,
  onDeleteCategory
}) {
  const [editingProductId, setEditingProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New product form fields (only for adding new)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0] || '');
  const [newUnit, setNewUnit] = useState('UN');
  const [newMinStock, setNewMinStock] = useState('10');
  const [newCurrentStock, setNewCurrentStock] = useState('50');

  // Inline edit row form fields
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('UN');
  const [editMinStock, setEditMinStock] = useState('10');
  const [editStock, setEditStock] = useState('0');

  if (!isOpen) return null;

  // Filter products by search
  const filteredList = products.filter(p => {
    if (!searchTerm.trim()) return true;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           p.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStartInlineEdit = (prod) => {
    setIsCreatingNew(false);
    setEditingProductId(prod.id);
    setEditName(prod.name);
    setEditCategory(prod.category);
    setEditUnit(prod.unit || 'UN');
    setEditMinStock(String(prod.minStock || 0));
    setEditStock(String(prod.currentStock || 0));
  };

  const handleSaveInlineEdit = (prodId) => {
    if (!editName.trim()) return;

    onSaveProduct({
      id: prodId,
      name: editName.trim(),
      category: editCategory,
      unit: editUnit.trim() || 'UN',
      minStock: Number(editMinStock) || 0,
      currentStock: Number(editStock) || 0
    });

    setEditingProductId(null);
  };

  const handleStartCreate = () => {
    setEditingProductId(null);
    setIsCreatingNew(true);
    setNewName('');
    setNewCategory(categories[0] || '');
    setNewUnit('UN');
    setNewMinStock('10');
    setNewCurrentStock('50');
  };

  const handleSaveNewProduct = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onSaveProduct({
      name: newName.trim(),
      category: newCategory,
      unit: newUnit.trim() || 'UN',
      minStock: Number(newMinStock) || 0,
      currentStock: Number(newCurrentStock) || 0
    });

    setIsCreatingNew(false);
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setNewCategory(newCatName.trim());
    setNewCatName('');
    setShowCatInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Catálogo de Produtos</h3>
              <p className="text-xs text-slate-500">Cadastre e edite os itens da empresa diretamente na lista</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Top Actions: Search, Add Product, Add Category */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar produto por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleStartCreate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Novo Produto
              </button>

              <button
                type="button"
                onClick={() => setShowCatManager(prev => !prev)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  showCatManager
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-100'
                }`}
                title="Exibir e gerenciar/excluir categorias existentes"
              >
                <Layers className="w-3.5 h-3.5" />
                Categorias ({categories.length})
              </button>

              {showCatInput ? (
                <form onSubmit={handleCreateCategory} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 font-medium cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCatInput(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCatInput(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  Nova Categoria
                </button>
              )}
            </div>
          </div>

          {/* Category Management Drawer */}
          {showCatManager && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Categorias Cadastradas — Clique na lixeira para excluir uma categoria
                </span>
                <button
                  type="button"
                  onClick={() => setShowCatManager(false)}
                  className="text-xs text-amber-800 hover:text-amber-950 font-medium cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map(cat => {
                  const prodsInCat = products.filter(p => p.category === cat).length;
                  return (
                    <div
                      key={cat}
                      className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 shadow-2xs"
                    >
                      <span className="font-semibold">{cat}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({prodsInCat} itens)</span>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = prodsInCat > 0
                            ? `Atenção: Existem ${prodsInCat} produto(s) vinculados à categoria "${cat}". Tem certeza que deseja excluir esta categoria?`
                            : `Deseja realmente excluir a categoria "${cat}"?`;
                          if (window.confirm(msg)) {
                            if (onDeleteCategory) onDeleteCategory(cat);
                          }
                        }}
                        className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title={`Excluir categoria "${cat}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form to create a NEW product */}
          {isCreatingNew && (
            <form onSubmit={handleSaveNewProduct} className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Cadastrar Novo Produto
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Cerveja Especial 600ml"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newCurrentStock}
                    onChange={(e) => setNewCurrentStock(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          )}

          {/* Product list table with INLINE EDITING EXACTLY ON THE ROW */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nome do Produto</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-center">Estoque Atual</th>
                  <th className="py-2.5 px-3 text-center">Estoque Mínimo</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(p => {
                  const isEditingThisRow = editingProductId === p.id;

                  // Render inline edit row directly where the item is located!
                  if (isEditingThisRow) {
                    return (
                      <tr key={p.id} className="bg-blue-50/90 border-2 border-blue-400">
                        {/* Nome input */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full text-xs border border-blue-400 rounded-md px-2 py-1.5 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nome do produto..."
                            autoFocus
                          />
                        </td>

                        {/* Categoria select */}
                        <td className="py-2 px-3">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full text-xs border border-blue-400 rounded-md px-2 py-1.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {categories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>

                        {/* Estoque Atual input */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            className="w-20 mx-auto text-center text-xs border border-blue-400 rounded-md px-2 py-1.5 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>

                        {/* Estoque Mínimo input */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={editMinStock}
                            onChange={(e) => setEditMinStock(e.target.value)}
                            className="w-16 mx-auto text-center text-xs border border-blue-400 rounded-md px-2 py-1.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>

                        {/* Inline Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(p.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition cursor-pointer"
                              title="Salvar alterações"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProductId(null)}
                              className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md transition cursor-pointer"
                              title="Cancelar edição"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Normal row display (SKU code and Unidade completely removed)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{p.currentStock}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{p.minStock || 0}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartInlineEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                            title="Editar este produto diretamente aqui"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Tem certeza que deseja excluir o produto "${p.name}"?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div>
            Total de produtos: <strong className="text-slate-800">{filteredList.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
