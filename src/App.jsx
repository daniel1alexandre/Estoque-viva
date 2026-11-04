import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import DailyCountView from './components/DailyCountView';
import DashboardView from './components/DashboardView';
import ProductManagementModal from './components/ProductManagementModal';
import UserManagementModal from './components/UserManagementModal';
import ExportModal from './components/ExportModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';
import { getTodayDateString } from './utils/formatters';
import {
  isFirebaseConfigured,
  initFirebase,
  loadDataFromFirestore,
  saveCountItemToFirestore,
  batchCheckInFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveCategoriesToFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  subscribeToRealtimeFirestore
} from './services/firebase';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('count'); // 'count' (loja) | 'deposito' | 'dashboard'
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  // Structure: { loja: { [date]: session }, deposito: { [date]: session } }
  const [countsHistory, setCountsHistory] = useState({ loja: {}, deposito: {} });
  const [currentUserId, setCurrentUserId] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [loading, setLoading] = useState(true);

  // Modals
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isFirebaseActive, setIsFirebaseActive] = useState(isFirebaseConfigured());

  const saveTimeoutsRef = useRef({});

  // Active location: 'loja' or 'deposito'
  const currentLocation = activeTab === 'deposito' ? 'deposito' : 'loja';

  // Fetch full data on initial mount or reload
  const loadData = useCallback(async () => {
    let loadedFromFirebase = false;

    if (isFirebaseConfigured()) {
      try {
        initFirebase();
        const fbData = await loadDataFromFirestore();
        if (fbData && fbData.products && fbData.products.length > 0) {
          setProducts(fbData.products);
          setCategories(fbData.categories || []);
          setUsers(fbData.users || []);
          setCountsHistory(fbData.counts || { loja: {}, deposito: {} });
          if (fbData.users && fbData.users.length > 0) {
            setCurrentUserId(fbData.users[0].id);
          }
          setIsFirebaseActive(true);
          loadedFromFirebase = true;
        }
      } catch (fbErr) {
        console.warn('Tentativa com Firestore falhou, usando backend local:', fbErr);
      }
    }

    if (!loadedFromFirebase) {
      try {
        const res = await fetch(`${API_BASE}/data`);
        if (!res.ok) throw new Error('Falha ao conectar com servidor');
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setUsers(data.users || []);

        // Format counts safely
        let normalizedCounts = { loja: {}, deposito: {} };
        if (data.counts) {
          if (data.counts.loja || data.counts.deposito) {
            normalizedCounts = {
              loja: data.counts.loja || {},
              deposito: data.counts.deposito || {}
            };
          } else {
            normalizedCounts.loja = data.counts;
          }
        }
        setCountsHistory(normalizedCounts);

        if (data.users && data.users.length > 0) {
          setCurrentUserId(data.users[0].id);
        }
        localStorage.setItem('estoque_backup_data', JSON.stringify(data));
      } catch (err) {
        console.warn('Backend indisponível, usando armazenamento local fallback:', err);
        const cached = localStorage.getItem('estoque_backup_data');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            setProducts(data.products || []);
            setCategories(data.categories || []);
            setUsers(data.users || []);
            let normalizedCounts = { loja: {}, deposito: {} };
            if (data.counts) {
              if (data.counts.loja || data.counts.deposito) {
                normalizedCounts = {
                  loja: data.counts.loja || {},
                  deposito: data.counts.deposito || {}
                };
              } else {
                normalizedCounts.loja = data.counts;
              }
            }
            setCountsHistory(normalizedCounts);
            if (data.users && data.users.length > 0) {
              setCurrentUserId(data.users[0].id);
            }
          } catch (e) {
            console.error('Erro ao ler cache local:', e);
          }
        }
      }
    }

    setIsFirebaseActive(isFirebaseConfigured());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------- SINCRONIZAÇÃO SIMULTÂNEA MULTI-APARELHO (REAL-TIME) ----------------
  useEffect(() => {
    // 1. Modo Nuvem Firebase Firestore: WebSockets onSnapshot em tempo real
    if (isFirebaseActive) {
      const unsubscribe = subscribeToRealtimeFirestore({
        onCounts: (liveCounts) => {
          setCountsHistory(prev => ({
            loja: { ...prev.loja, ...(liveCounts.loja || {}) },
            deposito: { ...prev.deposito, ...(liveCounts.deposito || {}) }
          }));
        },
        onProducts: (liveProducts) => {
          setProducts(liveProducts);
        },
        onCategories: (liveCategories) => {
          setCategories(liveCategories);
        },
        onUsers: (liveUsers) => {
          setUsers(liveUsers);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }

    // 2. Modo Servidor Local: SSE (Server-Sent Events) com fallback para polling
    let sseSource = null;
    let pollInterval = null;

    try {
      sseSource = new EventSource(`${API_BASE}/sync-events`);
      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.initial) {
            // Outro aparelho fez atualização! Atualizar dados em segundo plano
            fetch(`${API_BASE}/data`)
              .then(res => res.json())
              .then(latest => {
                if (latest.counts) {
                  setCountsHistory({
                    loja: latest.counts.loja || {},
                    deposito: latest.counts.deposito || {}
                  });
                }
                if (latest.products) setProducts(latest.products);
                if (latest.categories) setCategories(latest.categories);
                if (latest.users) setUsers(latest.users);
              })
              .catch(() => {});
          }
        } catch (e) {
          // ignore
        }
      };

      sseSource.onerror = () => {
        if (!pollInterval) {
          let lastVer = null;
          pollInterval = setInterval(async () => {
            try {
              const res = await fetch(`${API_BASE}/version`);
              if (res.ok) {
                const { version } = await res.json();
                if (lastVer && version !== lastVer) {
                  const dataRes = await fetch(`${API_BASE}/data`);
                  const latest = await dataRes.json();
                  if (latest.counts) {
                    setCountsHistory({
                      loja: latest.counts.loja || {},
                      deposito: latest.counts.deposito || {}
                    });
                  }
                  if (latest.products) setProducts(latest.products);
                  if (latest.categories) setCategories(latest.categories);
                  if (latest.users) setUsers(latest.users);
                }
                lastVer = version;
              }
            } catch (err) {
              // ignore
            }
          }, 2500);
        }
      };
    } catch (e) {
      console.warn('SSE indisponível:', e);
    }

    return () => {
      if (sseSource) sseSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isFirebaseActive]);

  // Helper: Find previous day's counted stock for a product in a location
  const getPrevCountedStock = useCallback((location, targetDateStr, productId, defaultVal) => {
    const locCounts = countsHistory[location] || {};
    const priorDates = Object.keys(locCounts)
      .filter(d => d < targetDateStr)
      .sort((a, b) => b.localeCompare(a)); // Descending: closest previous day first

    if (priorDates.length > 0) {
      const prevDate = priorDates[0];
      const prevItem = locCounts[prevDate]?.items?.[productId];
      if (prevItem) {
        if (prevItem.countedStock !== null && prevItem.countedStock !== undefined && prevItem.countedStock !== '') {
          return Number(prevItem.countedStock);
        }
        // Fallback to Estoque Geral of that previous day
        return (Number(prevItem.currentStock) || 0) + (Number(prevItem.entries) || 0) - (Number(prevItem.outputCount) || 0);
      }
    }
    return defaultVal;
  }, [countsHistory]);

  // Ensure count session exists for current location & selectedDate
  useEffect(() => {
    if (!loading && products.length > 0) {
      const locCounts = countsHistory[currentLocation] || {};
      if (!locCounts[selectedDate]) {
        const defaultUser = users.find(u => u.id === currentUserId) || users[0];
        const newItems = {};
        const mult = currentLocation === 'deposito' ? 2.5 : 1;

        products.forEach(p => {
          // Chain rule: initial stock of today is the counted stock of yesterday
          const initialStock = getPrevCountedStock(
            currentLocation,
            selectedDate,
            p.id,
            Math.round(p.currentStock * mult)
          );

          newItems[p.id] = {
            productId: p.id,
            currentStock: initialStock,
            entries: 0,
            outputCount: 0,
            countedStock: null,
            difference: 0,
            checked: false,
            checkedAt: null,
            countedBy: defaultUser ? defaultUser.name : 'Conferente',
            lastModified: new Date().toISOString()
          };
        });

        const newSession = {
          date: selectedDate,
          location: currentLocation,
          defaultUserId: currentUserId,
          items: newItems
        };

        setCountsHistory(prev => ({
          ...prev,
          [currentLocation]: {
            ...(prev[currentLocation] || {}),
            [selectedDate]: newSession
          }
        }));

        fetch(`${API_BASE}/counts/${selectedDate}?location=${currentLocation}`).catch(console.error);
      }
    }
  }, [selectedDate, currentLocation, loading, products, users, currentUserId, countsHistory, getPrevCountedStock]);

  // Current session count data
  const currentCountData = (countsHistory[currentLocation] && countsHistory[currentLocation][selectedDate]) || {
    date: selectedDate,
    location: currentLocation,
    defaultUserId: currentUserId,
    items: {}
  };

  // When user is selected in the Header, sync across all items in current count
  const handleUserChange = useCallback((newUserId) => {
    setCurrentUserId(newUserId);
    const newUser = users.find(u => u.id === newUserId);
    if (!newUser) return;

    setCountsHistory(prev => {
      const loc = currentLocation;
      const locSessions = prev[loc] || {};
      const currentSess = locSessions[selectedDate];
      if (!currentSess || !currentSess.items) return prev;

      const updatedItems = {};
      Object.entries(currentSess.items).forEach(([pId, it]) => {
        updatedItems[pId] = {
          ...it,
          countedBy: newUser.name
        };
      });

      return {
        ...prev,
        [loc]: {
          ...locSessions,
          [selectedDate]: {
            ...currentSess,
            defaultUserId: newUserId,
            items: updatedItems
          }
        }
      };
    });
  }, [users, currentLocation, selectedDate]);

  // Immediate local update + debounced auto-save to backend
  const handleUpdateItem = useCallback((productId, partialChanges) => {
    const loc = currentLocation;
    const currentUser = users.find(u => u.id === currentUserId) || users[0];
    const prevSession = (countsHistory[loc] && countsHistory[loc][selectedDate]) || { date: selectedDate, items: {} };
    const prevItem = prevSession.items[productId] || {
      productId,
      currentStock: products.find(p => p.id === productId)?.currentStock || 0,
      entries: 0,
      outputCount: 0,
      countedStock: null,
      difference: 0,
      checked: false,
      countedBy: currentUser?.name || 'Conferente'
    };

    const updatedItem = {
      ...prevItem,
      ...partialChanges,
      lastModified: new Date().toISOString()
    };

    // Formulas requested by user:
    // Estoque Final = Última Contagem
    const numCurrent = Number(updatedItem.currentStock) || 0;
    const numEntries = Number(updatedItem.entries) || 0;
    const numTarde = Number(updatedItem.outputCount) || 0;
    const hasCount = updatedItem.countedStock !== null && updatedItem.countedStock !== undefined && updatedItem.countedStock !== '';
    const numCounted = hasCount ? Number(updatedItem.countedStock) : 0;
    const estoqueFinal = hasCount ? numCounted : numCurrent;

    // Diferença = (ultima contagem - contagem da tarde)
    updatedItem.difference = hasCount ? (numCounted - numTarde) : 0;

    // Update UI state immediately
    setCountsHistory(prev => {
      const locSessions = prev[loc] || {};
      const currentSess = locSessions[selectedDate] || { date: selectedDate, items: {} };
      const updatedLoc = {
        ...locSessions,
        [selectedDate]: {
          ...currentSess,
          items: {
            ...currentSess.items,
            [productId]: updatedItem
          }
        }
      };

      // Chain rule: if countedStock was changed, propagate to the immediately following date as its initial stock!
      if (hasCount) {
        const futureDates = Object.keys(updatedLoc)
          .filter(d => d > selectedDate)
          .sort((a, b) => a.localeCompare(b));

        if (futureDates.length > 0) {
          const nextDate = futureDates[0];
          const nextSess = updatedLoc[nextDate];
          if (nextSess && nextSess.items && nextSess.items[productId]) {
            const nextIt = { ...nextSess.items[productId] };
            nextIt.currentStock = Number(updatedItem.countedStock);
            const nextGeral = nextIt.currentStock + (Number(nextIt.entries) || 0) - (Number(nextIt.outputCount) || 0);
            if (nextIt.countedStock !== null && nextIt.countedStock !== undefined && nextIt.countedStock !== '') {
              nextIt.difference = Number(nextIt.countedStock) - nextGeral;
            }
            updatedLoc[nextDate] = {
              ...nextSess,
              items: {
                ...nextSess.items,
                [productId]: nextIt
              }
            };
          }
        }
      }

      return {
        ...prev,
        [loc]: updatedLoc
      };
    });

    setSaveStatus('saving');

    const timerKey = `${loc}_${productId}`;
    if (saveTimeoutsRef.current[timerKey]) {
      clearTimeout(saveTimeoutsRef.current[timerKey]);
    }

    saveTimeoutsRef.current[timerKey] = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/counts/save-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            location: loc,
            ...updatedItem
          })
        });

        if (isFirebaseConfigured()) {
          saveCountItemToFirestore(loc, selectedDate, productId, updatedItem);
        }

        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
        }, 2000);
      } catch (err) {
        console.error('Erro ao salvar item no servidor:', err);
        setSaveStatus('idle');
      }
    }, 350);
  }, [countsHistory, selectedDate, currentLocation, users, currentUserId, products]);

  // Toggle Check
  const handleToggleCheck = useCallback(async (productId, newCheckState) => {
    const loc = currentLocation;
    const currentUser = users.find(u => u.id === currentUserId) || users[0];

    setCountsHistory(prev => {
      const locSessions = prev[loc] || {};
      const session = locSessions[selectedDate] || { date: selectedDate, items: {} };
      const item = session.items[productId] || {};
      const updated = {
        ...item,
        checked: newCheckState,
        checkedAt: newCheckState ? new Date().toISOString() : null,
        countedBy: currentUser ? currentUser.name : item.countedBy
      };

      const hasCount = item.countedStock !== null && item.countedStock !== undefined && item.countedStock !== '';
      const finalVal = (newCheckState && hasCount)
        ? Number(item.countedStock)
        : ((Number(item.currentStock) || 0) + (Number(item.entries) || 0) - (Number(item.outputCount) || 0));

      const updatedLoc = {
        ...locSessions,
        [selectedDate]: {
          ...session,
          items: {
            ...session.items,
            [productId]: updated
          }
        }
      };

      const futureDates = Object.keys(updatedLoc)
        .filter(d => d > selectedDate)
        .sort((a, b) => a.localeCompare(b));

      if (futureDates.length > 0) {
        const nextDate = futureDates[0];
        const nextSess = updatedLoc[nextDate];
        if (nextSess && nextSess.items && nextSess.items[productId]) {
          const nextIt = { ...nextSess.items[productId] };
          nextIt.currentStock = finalVal;
          const nextExp = nextIt.currentStock + (Number(nextIt.entries) || 0) - (Number(nextIt.outputCount) || 0);
          if (nextIt.countedStock !== null && nextIt.countedStock !== undefined && nextIt.countedStock !== '') {
            nextIt.difference = Number(nextIt.countedStock) - nextExp;
          }
          updatedLoc[nextDate] = {
            ...nextSess,
            items: {
              ...nextSess.items,
              [productId]: nextIt
            }
          };
        }
      }

      return {
        ...prev,
        [loc]: updatedLoc
      };
    });

    setSaveStatus('saving');
    try {
      await fetch(`${API_BASE}/counts/toggle-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          location: loc,
          productId,
          checked: newCheckState,
          countedBy: currentUser ? currentUser.name : undefined
        })
      });

      if (isFirebaseConfigured()) {
        saveCountItemToFirestore(loc, selectedDate, productId, {
          checked: newCheckState,
          checkedAt: newCheckState ? now : null,
          countedBy: currentUser ? currentUser.name : undefined
        });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
    } catch (err) {
      console.error('Erro ao alternar check:', err);
      setSaveStatus('idle');
    }
  }, [selectedDate, currentLocation, users, currentUserId]);

  // Batch Check
  const handleBatchCheck = useCallback(async (productIds, checkState) => {
    const loc = currentLocation;
    const currentUser = users.find(u => u.id === currentUserId) || users[0];
    const now = new Date().toISOString();

    setCountsHistory(prev => {
      const locSessions = prev[loc] || {};
      const session = locSessions[selectedDate] || { date: selectedDate, items: {} };
      const updatedItems = { ...session.items };

      productIds.forEach(id => {
        if (updatedItems[id]) {
          updatedItems[id] = {
            ...updatedItems[id],
            checked: checkState,
            checkedAt: checkState ? now : null,
            countedBy: currentUser ? currentUser.name : updatedItems[id].countedBy
          };
        }
      });

      return {
        ...prev,
        [loc]: {
          ...locSessions,
          [selectedDate]: {
            ...session,
            items: updatedItems
          }
        }
      };
    });

    try {
      await fetch(`${API_BASE}/counts/batch-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          location: loc,
          productIds,
          checked: checkState,
          countedBy: currentUser ? currentUser.name : undefined
        })
      });

      if (isFirebaseConfigured()) {
        batchCheckInFirestore(loc, selectedDate, productIds, checkState, currentUser ? currentUser.name : undefined);
      }
    } catch (err) {
      console.error('Erro no batch check:', err);
    }
  }, [selectedDate, currentLocation, users, currentUserId]);

  // Products CRUD
  const handleSaveProduct = async (productData) => {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      const savedProd = data.product || productData;
      
      setProducts(prev => {
        const index = prev.findIndex(p => p.id === savedProd.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = savedProd;
          return next;
        }
        return [...prev, savedProd];
      });

      if (isFirebaseConfigured()) {
        saveProductToFirestore(savedProd);
      }
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== productId));

      if (isFirebaseConfigured()) {
        deleteProductFromFirestore(productId);
      }
    } catch (err) {
      console.error('Erro ao deletar produto:', err);
    }
  };

  const handleAddCategory = async (catName) => {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName })
      });
      const data = await res.json();
      const updatedCats = data.categories || [...categories, catName];
      setCategories(updatedCats);

      if (isFirebaseConfigured()) {
        saveCategoriesToFirestore(updatedCats);
      }
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
    }
  };

  const handleAddUser = async (userData) => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      const savedUser = data.user || { id: 'usr-' + Date.now(), name: userData.name };
      setUsers(prev => [...prev, savedUser]);
      setCurrentUserId(savedUser.id);

      if (isFirebaseConfigured()) {
        saveUserToFirestore(savedUser);
      }
    } catch (err) {
      console.error('Erro ao adicionar usuário:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao excluir usuário no backend:', err);
    }

    setUsers(prev => {
      const remaining = prev.filter(u => u.id !== userId);
      if (currentUserId === userId && remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
      }
      return remaining;
    });

    if (isFirebaseConfigured()) {
      deleteUserFromFirestore(userId);
    }
  };

  // Stats calculation - Saída é a diferença entre as contagens
  const summaryStats = useMemo(() => {
    const session = countsHistory.loja?.[selectedDate];
    let checkedCount = 0;
    let totalOutputToday = 0;

    if (session && session.items) {
      Object.values(session.items).forEach(it => {
        if (it.checked) checkedCount++;
        const hasCount = it.countedStock !== null && it.countedStock !== undefined && it.countedStock !== '';
        const hasTarde = it.outputCount !== null && it.outputCount !== undefined && it.outputCount !== '' && Number(it.outputCount) > 0;
        let saida = 0;
        if (hasCount && hasTarde) {
          saida = Math.abs(Number(it.outputCount) - Number(it.countedStock));
        } else if (hasCount && !hasTarde) {
          const inicial = (Number(it.currentStock) || 0) + (Number(it.entries) || 0);
          const final = Number(it.countedStock) || 0;
          saida = Math.max(0, inicial - final);
        }
        totalOutputToday += saida;
      });
    }

    return {
      totalItems: products.length,
      checkedCount,
      totalOutputToday
    };
  }, [countsHistory.loja, selectedDate, products]);

  const depositoStats = useMemo(() => {
    const session = countsHistory.deposito?.[selectedDate];
    let checkedCount = 0;
    let totalOutputToday = 0;

    if (session && session.items) {
      Object.values(session.items).forEach(it => {
        if (it.checked) checkedCount++;
        const hasCount = it.countedStock !== null && it.countedStock !== undefined && it.countedStock !== '';
        const hasTarde = it.outputCount !== null && it.outputCount !== undefined && it.outputCount !== '' && Number(it.outputCount) > 0;
        let saida = 0;
        if (hasCount && hasTarde) {
          saida = Math.abs(Number(it.outputCount) - Number(it.countedStock));
        } else if (hasCount && !hasTarde) {
          const inicial = (Number(it.currentStock) || 0) + (Number(it.entries) || 0);
          const final = Number(it.countedStock) || 0;
          saida = Math.max(0, inicial - final);
        }
        totalOutputToday += saida;
      });
    }

    return {
      totalItems: products.length,
      checkedCount,
      totalOutputToday
    };
  }, [countsHistory.deposito, selectedDate, products]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Carregando sistema de estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 w-full">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        users={users}
        currentUserId={currentUserId}
        setCurrentUserId={handleUserChange}
        saveStatus={saveStatus}
        onOpenProducts={() => setIsProductsModalOpen(true)}
        onOpenUsers={() => setIsUsersModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenFirebase={() => setIsFirebaseModalOpen(true)}
        isFirebaseActive={isFirebaseActive}
        summaryStats={summaryStats}
        depositoStats={depositoStats}
      />

      {/* Main container: Full Width utilizing all left and right margins */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 py-4">
        {activeTab === 'count' ? (
          <DailyCountView
            key={`loja-${selectedDate}`}
            selectedDate={selectedDate}
            location="loja"
            products={products}
            categories={categories}
            users={users}
            currentUserId={currentUserId}
            countData={currentCountData}
            onUpdateItem={handleUpdateItem}
            onToggleCheck={handleToggleCheck}
            onBatchCheck={handleBatchCheck}
            onSaveProduct={handleSaveProduct}
          />
        ) : activeTab === 'deposito' ? (
          <DailyCountView
            key={`deposito-${selectedDate}`}
            selectedDate={selectedDate}
            location="deposito"
            products={products}
            categories={categories}
            users={users}
            currentUserId={currentUserId}
            countData={currentCountData}
            onUpdateItem={handleUpdateItem}
            onToggleCheck={handleToggleCheck}
            onBatchCheck={handleBatchCheck}
            onSaveProduct={handleSaveProduct}
          />
        ) : (
          <DashboardView
            products={products}
            categories={categories}
            countsHistory={countsHistory.loja || {}}
            selectedDate={selectedDate}
          />
        )}
      </main>

      {/* Modals */}
      <ProductManagementModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
        products={products}
        categories={categories}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onAddCategory={handleAddCategory}
      />

      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={users}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedDate={selectedDate}
        products={products}
        countData={currentCountData}
        users={users}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => {
          setIsFirebaseModalOpen(false);
          setIsFirebaseActive(isFirebaseConfigured());
        }}
        products={products}
        categories={categories}
        users={users}
        countsHistory={countsHistory}
        onReloadData={loadData}
      />
    </div>
  );
}
