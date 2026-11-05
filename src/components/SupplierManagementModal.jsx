import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

export default function SupplierManagementModal({
  isOpen,
  onClose,
  suppliers = [],
  categories = [],
  products = [],
  onSaveSupplier,
  onDeleteSupplier,
  onBatchAssignCategory
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
      } catch (err) {
        showFeedback('Erro ao excluir fornecedor', 'error');
      }
    }
  };

  const handleLinkCategory = async (sup) => {
    if (!sup.category) {
      alert('Este fornecedor não possui uma categoria vinculada. Edite-o e selecione uma categoria.');
      return;
    }
    const catProds = products.filter(p => p.category === sup.category);
    if (window.confirm(`Deseja vincular todos os ${catProds.length} produtos da categoria "${sup.category}" ao fornecedor "${sup.name}"?`)) {
      try {
        await onBatchAssignCategory(sup.category, sup.id, sup.name);
        showFeedback(`Todos os produtos da categoria ${sup.category} vinculados a ${sup.name}!`);
      } catch (err) {
        showFeedback('Erro ao vincular produtos', 'error');
      }
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Gerenciamento de Fornecedores</h2>
              <p className="text-xs text-slate-500">Cadastre fornecedores e vincule aos produtos para pedidos automáticos de compra</p>
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
                  const linkedProductsCount = products.filter(p => p.supplierId === sup.id || (!p.supplierId && p.category === sup.category)).length;

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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
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

                      <div className="flex items-center space-x-2 shrink-0">
                        {sup.category && (
                          <button
                            type="button"
                            onClick={() => handleLinkCategory(sup)}
                            title={`Vincular todos os produtos da categoria ${sup.category} a este fornecedor`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Vincular Categoria</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sup)}
                          title="Editar fornecedor"
                          className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-transparent hover:border-orange-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sup.id, sup.name)}
                          title="Excluir fornecedor"
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
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
          <span>Total de Fornecedores: <strong className="text-slate-800">{suppliers.length}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
