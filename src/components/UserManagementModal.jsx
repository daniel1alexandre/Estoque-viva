import React, { useState } from 'react';
import { X, UserPlus, Users, ShieldCheck, Trash2, AlertCircle } from 'lucide-react';

export default function UserManagementModal({
  isOpen,
  onClose,
  users,
  onAddUser,
  onDeleteUser
}) {
  const [name, setName] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddUser({ name: name.trim() });
    setName('');
  };

  const confirmDelete = (userId) => {
    if (users.length <= 1) {
      alert('É necessário manter ao menos 1 conferente cadastrado no sistema.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      if (onDeleteUser) {
        onDeleteUser(userId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Gerenciar Usuários & Conferentes</h3>
              <p className="text-xs text-slate-500">Usuários responsáveis pelas contagens diárias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add form - NO ROLE/FUNÇÃO FIELD */}
          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              Novo Conferente
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                required
                placeholder="Nome do Usuário / Conferente (Ex: Roberto Gomes)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Cadastrar
              </button>
            </div>
          </form>

          {/* User List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Usuários Cadastrados ({users.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Mínimo 1 conferente ativo
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              {users.map(u => (
                <div key={u.id} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200 shrink-0">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      Ativo
                    </span>
                    <button
                      type="button"
                      onClick={() => confirmDelete(u.id)}
                      disabled={users.length <= 1}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        users.length <= 1
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                      }`}
                      title={users.length <= 1 ? 'Não é possível remover o único usuário' : `Remover usuário ${u.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
