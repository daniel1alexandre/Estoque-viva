import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Package, Layers, Check } from 'lucide-react';

export default function ProductManagementModal({
  isOpen,
  onClose,
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onAddCategory
}) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [unit, setUnit] = useState('UN');
  const [minStock, setMinStock] = useState('10');
  const [currentStock, setCurrentStock] = useState('50');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingProduct({ id: null });
    setName('');
    setCode('');
    setCategory(categories[0] || '');
    setUnit('UN');
    setMinStock('10');
    setCurrentStock('50');
  };

  const handleStartEdit = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCode(prod.code);
    setCategory(prod.category);
    setUnit(prod.unit);
    setMinStock(String(prod.minStock || 0));
    setCurrentStock(String(prod.currentStock || 0));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProduct({
      id: editingProduct?.id || null,
      name: name.trim(),
      code: code.trim() || `COD-${Math.floor(100 + Math.random() * 900)}`,
      category,
      unit: unit.trim() || 'UN',
      minStock: Number(minStock) || 0,
      currentStock: Number(currentStock) || 0
    });

    setEditingProduct(null);
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowCatInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Catálogo de Produtos e Categorias</h3>
              <p className="text-xs text-slate-500">Cadastre e edite os itens da empresa para a contagem diária</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Actions: Add Product or Add Category */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>

            <div className="flex items-center gap-2">
              {showCatInput ? (
                <form onSubmit={handleCreateCategory} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCatInput(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCatInput(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Nova Categoria
                </button>
              )}
            </div>
          </div>

          {/* Form Modal/Section when creating or editing */}
          {editingProduct && (
            <form onSubmit={handleFormSubmit} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Café Torrado Especial 500g"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código / SKU</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: BEB-001"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade de Medida</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Ex: UN, CX, FARDO, KG"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque Inicial / Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          )}

          {/* Product list table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-center">Unidade</th>
                  <th className="py-2.5 px-3 text-center">Estoque Atual</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{p.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{p.unit}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">{p.currentStock}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja excluir o produto "${p.name}"?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

