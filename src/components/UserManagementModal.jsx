import React, { useState } from 'react';
import { X, UserPlus, Users, ShieldCheck, Check } from 'lucide-react';

export default function UserManagementModal({
  isOpen,
  onClose,
  users,
  onAddUser
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Conferente');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddUser({ name: name.trim(), role });
    setName('');
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
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              Novo Conferente
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roberto Gomes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Função / Cargo</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Conferente">Conferente</option>
                  <option value="Almoxarife">Almoxarife</option>
                  <option value="Supervisor de Estoque">Supervisor de Estoque</option>
                  <option value="Auxiliar de Logística">Auxiliar de Logística</option>
                  <option value="Gerente de Operações">Gerente de Operações</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Cadastrar Usuário
              </button>
            </div>
          </form>

          {/* User List */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Usuários Ativos ({users.length})
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {users.map(u => (
                <div key={u.id} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.role}</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    Ativo
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

