import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Save, 
  RefreshCw, 
  ArrowUpRight,
  ShieldCheck,
  Cloud,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  isFirebaseConfigured, 
  initFirebase, 
  seedDataToFirestore 
} from '../services/firebase';

export default function FirebaseConfigModal({
  isOpen,
  onClose,
  products,
  categories,
  users,
  suppliers = [],
  countsHistory,
  onReloadData
}) {
  const [configText, setConfigText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getFirebaseConfig();
      setApiKey(current.apiKey || '');
      setProjectId(current.projectId || '');
      setAuthDomain(current.authDomain || '');
      setStorageBucket(current.storageBucket || '');
      setMessagingSenderId(current.messagingSenderId || '');
      setAppId(current.appId || '');
      setIsConfigured(isFirebaseConfigured());
      setStatusMessage(null);
      setCopiedLink(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle parsing pasted Firebase config code
  const handleParseSnippet = (snippet) => {
    try {
      const matchKey = (key) => {
        const regex = new RegExp(`${key}["']?\\s*:\\s*["']([^"']+)["']`);
        const match = snippet.match(regex);
        return match ? match[1] : '';
      };

      const k = matchKey('apiKey');
      const p = matchKey('projectId');
      const ad = matchKey('authDomain');
      const sb = matchKey('storageBucket');
      const ms = matchKey('messagingSenderId');
      const ai = matchKey('appId');

      if (k || p) {
        if (k) setApiKey(k);
        if (p) setProjectId(p);
        if (ad) setAuthDomain(ad);
        if (sb) setStorageBucket(sb);
        if (ms) setMessagingSenderId(ms);
        if (ai) setAppId(ai);
        setStatusMessage({ type: 'success', text: 'Configuração colada detectada e preenchida com sucesso!' });
      }
    } catch (e) {
      console.warn('Erro ao processar snippet:', e);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setStatusMessage({ type: 'error', text: 'Preencha pelo menos a API Key e o Project ID.' });
      return;
    }

    const newConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    saveFirebaseConfig(newConfig);
    
    // Also save to backend server so other devices can auto-configure
    fetch('/api/firebase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig })
    }).catch(err => console.warn('Aviso: servidor offline para salvar config do Firebase:', err));

    const db = initFirebase();
    if (db) {
      setIsConfigured(true);
      setStatusMessage({ type: 'success', text: 'Firebase configurado com sucesso! Conexão em nuvem ativa para todos os dispositivos.' });
      if (onReloadData) {
        onReloadData();
      }
    } else {
      setStatusMessage({ type: 'error', text: 'Falha ao inicializar Firebase. Verifique as credenciais.' });
    }
  };

  const handleCopyShareLink = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setStatusMessage({ type: 'error', text: 'Preencha a API Key e o Project ID antes de gerar o link de compartilhamento.' });
      return;
    }
    const cfg = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };
    const encoded = encodeURIComponent(btoa(JSON.stringify(cfg)));
    const link = `${window.location.origin}/?fb_cfg=${encoded}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setStatusMessage({ 
      type: 'success', 
      text: 'Link de conexão copiado! Abra este link nos outros celulares ou PCs para conectar todos automaticamente à mesma nuvem.' 
    });
    setTimeout(() => setCopiedLink(false), 5000);
  };

  const handleDisconnect = () => {
    saveFirebaseConfig(null);
    fetch('/api/firebase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: null })
    }).catch(() => {});
    setApiKey('');
    setProjectId('');
    setAuthDomain('');
    setStorageBucket('');
    setMessagingSenderId('');
    setAppId('');
    setIsConfigured(false);
    setStatusMessage({ type: 'info', text: 'Firebase desconectado. O sistema usará o modo local padrão.' });
  };

  const handleSyncToFirebase = async () => {
    if (!isConfigured) {
      setStatusMessage({ type: 'error', text: 'Configure e salve o Firebase antes de sincronizar.' });
      return;
    }

    try {
      setIsSyncing(true);
      setStatusMessage({ type: 'info', text: 'Sincronizando produtos, categorias, fornecedores e usuários para o Firestore...' });
      await seedDataToFirestore(products, categories, users, countsHistory, suppliers);
      setStatusMessage({ type: 'success', text: 'Todos os produtos, fornecedores, usuários e contagens foram sincronizados com sucesso no Cloud Firestore!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao sincronizar dados: ' + (err.message || 'Verifique as regras do Firestore no Console.') });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Banco de Dados Firebase</h3>
                {isConfigured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Google Cloud Firestore para sincronização em nuvem em tempo real</p>
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
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Quick paste helper */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-amber-600" />
              Colar Código de Configuração do Firebase Console:
            </label>
            <textarea
              rows={3}
              placeholder="Cole aqui o objeto firebaseConfig do Console do Firebase (ex: const firebaseConfig = { apiKey: '...', projectId: '...' };)"
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                handleParseSnippet(e.target.value);
              }}
              className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              O sistema extrai os campos automaticamente ao colar o código acima.
            </p>
          </div>

          {/* Manual Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">API Key (*)</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Project ID (*)</label>
              <input
                type="text"
                placeholder="controle-estoque-viva-beach"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="projeto.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Storage Bucket</label>
              <input
                type="text"
                placeholder="projeto.appspot.com"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Messaging Sender ID</label>
              <input
                type="text"
                placeholder="1234567890"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">App ID</label>
              <input
                type="text"
                placeholder="1:1234567890:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Multi-device instant share link */}
          {isConfigured && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  Conectar Outros Celulares e Computadores
                </div>
                <p className="text-[11px] text-blue-800/80">
                  Gera um link que ativa automaticamente a sincronização em tempo real em qualquer outro aparelho via WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          )}

          {/* Sync action button */}
          {isConfigured && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-700" />
                  Sincronizar Dados Atuais com o Firebase
                </div>
                <p className="text-[11px] text-amber-800/80">
                  Envia todos os 146 itens, categorias e histórico para as coleções do Firestore.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncToFirebase}
                disabled={isSyncing}
                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Enviar Dados'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {isConfigured && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
              >
                Desconectar Firebase
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

