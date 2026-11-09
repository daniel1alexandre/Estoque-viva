import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import DailyCountView from './components/DailyCountView';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import GeneralStockView from './components/GeneralStockView';
import ReportsView from './components/ReportsView';
import ProductManagementModal from './components/ProductManagementModal';
import UserManagementModal from './components/UserManagementModal';
import SupplierManagementModal from './components/SupplierManagementModal';
import ExportModal from './components/ExportModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';
import { getTodayDateString } from './utils/formatters';
import { initialSuppliers } from './data/initialData';
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
  saveSupplierToFirestore,
  deleteSupplierFromFirestore,
  subscribeToRealtimeFirestore,
  resetAllStockAndCountsInFirestore
} from './services/firebase';

const API_BASE = '/api';

// Timestamp-based intelligent merge to prevent overwriting in-flight changes
function mergeItem(localItem, remoteItem) {
  if (!localItem) return remoteItem;
  if (!remoteItem) return localItem;
  const localTime = new Date(localItem.lastModified || 0).getTime();
  const remoteTime = new Date(remoteItem.lastModified || 0).getTime();
  return remoteTime > localTime ? remoteItem : localItem;
}

function mergeSessions(localSession, remoteSession) {
  if (!localSession) return remoteSession;
  if (!remoteSession) return localSession;

  const mergedItems = { ...(localSession.items || {}) };

  Object.entries(remoteSession.items || {}).forEach(([pId, remoteItem]) => {
    mergedItems[pId] = mergeItem(mergedItems[pId], remoteItem);
  });

  return {
    ...remoteSession,
    ...localSession,
    items: mergedItems
  };
}

function mergeCountsHistory(localHistory, remoteHistory) {
  if (!localHistory) return remoteHistory || { loja: {}, deposito: {} };
  if (!remoteHistory) return localHistory || { loja: {}, deposito: {} };

  const result = {
    loja: { ...(localHistory.loja || {}) },
    deposito: { ...(localHistory.deposito || {}) }
  };

  ['loja', 'deposito'].forEach(loc => {
    const remoteLoc = remoteHistory[loc] || {};
    Object.entries(remoteLoc).forEach(([date, remoteSess]) => {
      const localSess = result[loc][date];
      result[loc][date] = mergeSessions(localSess, remoteSess);
    });
  });

  return result;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('count'); // 'count' (loja) | 'deposito' | 'dashboard'
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  // Structure: { loja: { [date]: session }, deposito: { [date]: session } }
  const [countsHistory, setCountsHistory] = useState({ loja: {}, deposito: {} });
  const [currentUserId, setCurrentUserId] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [loading, setLoading] = useState(true);

  // Sidebar Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const sidebarNavRef = useRef(null);

  // Auto-scroll no Menu Lateral quando os itens na tela principal à direita forem rolados para baixo
  const handleMainScroll = (e) => {
    if (sidebarNavRef.current) {
      const main = e.currentTarget;
      const maxMainScroll = main.scrollHeight - main.clientHeight;
      if (maxMainScroll > 0) {
        const scrollRatio = main.scrollTop / maxMainScroll;
        const maxSidebarScroll = sidebarNavRef.current.scrollHeight - sidebarNavRef.current.clientHeight;
        if (maxSidebarScroll > 0) {
          sidebarNavRef.current.scrollTop = scrollRatio * maxSidebarScroll;
        }
      }
    }
  };

  // Modals
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isFirebaseActive, setIsFirebaseActive] = useState(isFirebaseConfigured());

  const saveTimeoutsRef = useRef({});
  const clientIdRef = useRef('client_' + Math.random().toString(36).substring(2) + '_' + Date.now());

  // Active location: 'loja' or 'deposito'
  const currentLocation = activeTab === 'deposito' ? 'deposito' : 'loja';

  // Regra de ordenação alfabética rigorosa: Categorias (A-Z) e Produtos dentro de cada categoria (A-Z)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const catComp = (a.category || '').localeCompare(b.category || '', 'pt-BR', { sensitivity: 'base' });
      if (catComp !== 0) return catComp;
      return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    });
  }, [products]);

  // Fetch full data on initial mount or reload - SEMPRE PRESERVANDO DADOS
  const loadData = useCallback(async () => {
    // 1. Carrega do localStorage primeiro para manter alterações salvas de imediato
    try {
      const cachedCounts = localStorage.getItem('viva_counts_history');
      const cachedProds = localStorage.getItem('viva_products');
      const cachedCats = localStorage.getItem('viva_categories');
      const cachedUsers = localStorage.getItem('viva_users');
      const cachedSups = localStorage.getItem('viva_suppliers');

      if (cachedCounts) {
        setCountsHistory(JSON.parse(cachedCounts));
      }
      if (cachedProds) {
        setProducts(JSON.parse(cachedProds));
      }
      if (cachedCats) setCategories(JSON.parse(cachedCats));
      if (cachedUsers) setUsers(JSON.parse(cachedUsers));
      if (cachedSups) {
        try {
          const parsedSups = JSON.parse(cachedSups);
          if (Array.isArray(parsedSups) && parsedSups.length > 0) {
            setSuppliers(parsedSups);
          } else {
            setSuppliers(initialSuppliers);
          }
        } catch (e) {
          setSuppliers(initialSuppliers);
        }
      } else {
        setSuppliers(initialSuppliers);
      }
    } catch (e) {
      console.warn('Erro ao ler cache local inicial:', e);
    }

    let loadedFromFirebase = false;

    // 2. Carrega do Firebase Cloud Firestore (banco em nuvem)
    if (isFirebaseConfigured()) {
      try {
        initFirebase();
        const fbData = await loadDataFromFirestore();
        if (fbData && fbData.products && fbData.products.length > 0) {
          setProducts(fbData.products);
          setCategories(fbData.categories || []);
          setUsers(fbData.users || []);
          if (fbData.suppliers && fbData.suppliers.length > 0) {
            setSuppliers(fbData.suppliers);
            try { localStorage.setItem('viva_suppliers', JSON.stringify(fbData.suppliers)); } catch (e) {}
          } else {
            setSuppliers(initialSuppliers);
          }

          const initialCounts = fbData.counts || {};
          setCountsHistory(prev => {
            const merged = mergeCountsHistory(prev, initialCounts);
            try {
              localStorage.setItem('viva_counts_history', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });

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

    // 3. Fallback para API do servidor / banco local persistente (db.json)
    if (!loadedFromFirebase) {
      try {
        const res = await fetch(`${API_BASE}/data`);
        if (!res.ok) throw new Error('Falha ao conectar com servidor');
        const data = await res.json();
        const prods = data.products || [];
        if (prods.length > 0) setProducts(prods);
        if (data.categories && data.categories.length > 0) setCategories(data.categories);
        if (data.users && data.users.length > 0) setUsers(data.users);
        if (data.suppliers && data.suppliers.length > 0) {
          setSuppliers(data.suppliers);
          try { localStorage.setItem('viva_suppliers', JSON.stringify(data.suppliers)); } catch (e) {}
        } else {
          setSuppliers(initialSuppliers);
        }

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

        setCountsHistory(prev => {
          const merged = mergeCountsHistory(prev, normalizedCounts);
          try {
            localStorage.setItem('viva_counts_history', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });

        if (data.users && data.users.length > 0) {
          setCurrentUserId(data.users[0].id);
        }
      } catch (err) {
        console.warn('Backend indisponível, usando armazenamento local preservado:', err);
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
          setCountsHistory(prev => {
            const merged = mergeCountsHistory(prev, liveCounts);
            try {
              localStorage.setItem('viva_counts_history', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        },
        onProducts: (liveProducts) => {
          setProducts(liveProducts);
          try { localStorage.setItem('viva_products', JSON.stringify(liveProducts)); } catch (e) {}
        },
        onCategories: (liveCategories) => {
          setCategories(liveCategories);
          try { localStorage.setItem('viva_categories', JSON.stringify(liveCategories)); } catch (e) {}
        },
        onUsers: (liveUsers) => {
          setUsers(liveUsers);
          try { localStorage.setItem('viva_users', JSON.stringify(liveUsers)); } catch (e) {}
        },
        onSuppliers: (liveSuppliers) => {
          setSuppliers(liveSuppliers);
          try { localStorage.setItem('viva_suppliers', JSON.stringify(liveSuppliers)); } catch (e) {}
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
      sseSource = new EventSource(`${API_BASE}/sync-events?clientId=${clientIdRef.current}`);
      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // If this update was initiated by this client, ignore it to prevent overwriting
          if (data.origin && data.origin === clientIdRef.current) {
            return;
          }
          if (!data.initial) {
            fetch(`${API_BASE}/data`)
              .then(res => res.json())
              .then(latest => {
                if (latest.counts) {
                  setCountsHistory(prev => {
                    const merged = mergeCountsHistory(prev, {
                      loja: latest.counts.loja || {},
                      deposito: latest.counts.deposito || {}
                    });
                    try { localStorage.setItem('viva_counts_history', JSON.stringify(merged)); } catch (e) {}
                    return merged;
                  });
                }
                if (latest.products) setProducts(latest.products);
                if (latest.categories) setCategories(latest.categories);
                if (latest.users) setUsers(latest.users);
                if (latest.suppliers) setSuppliers(latest.suppliers);
              })
              .catch(() => {});
          }
        } catch (e) {}
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
                    setCountsHistory(prev => {
                      const merged = mergeCountsHistory(prev, {
                        loja: latest.counts.loja || {},
                        deposito: latest.counts.deposito || {}
                      });
                      try { localStorage.setItem('viva_counts_history', JSON.stringify(merged)); } catch (e) {}
                      return merged;
                    });
                  }
                  if (latest.products) setProducts(latest.products);
                  if (latest.categories) setCategories(latest.categories);
                  if (latest.users) setUsers(latest.users);
                }
                lastVer = version;
              }
            } catch (err) {}
          }, 4000);
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
    const numCurrent = Number(updatedItem.currentStock) || 0;
    const numEntries = Number(updatedItem.entries) || 0;
    const numTarde = Number(updatedItem.outputCount) || 0;
    const hasCount = updatedItem.countedStock !== null && updatedItem.countedStock !== undefined && updatedItem.countedStock !== '';
    const numCounted = hasCount ? Number(updatedItem.countedStock) : 0;
    
    // For Depósito: Estoque Final = currentStock + entries
    // For Loja: Estoque Final = hasCount ? numCounted : numCurrent
    const estoqueFinal = loc === 'deposito' ? (numCurrent + numEntries) : (hasCount ? numCounted : numCurrent);

    // Diferença = (ultima contagem - contagem da tarde)
    updatedItem.difference = loc === 'deposito' ? 0 : (hasCount ? (numCounted - numTarde) : 0);

    // Regra: quando a contagem da tarde e a última contagem forem feitas e forem iguais, o check vai automático
    const hasTarde = updatedItem.outputCount !== null && updatedItem.outputCount !== undefined && updatedItem.outputCount !== '';
    if (loc === 'loja' && hasTarde && hasCount && Number(updatedItem.outputCount) === Number(updatedItem.countedStock)) {
      updatedItem.checked = true;
      if (!updatedItem.checkedAt) {
        updatedItem.checkedAt = new Date().toISOString();
      }
    }

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

      // Chain rule:
      // In Depósito: propagate (currentStock + entries) to the immediately following date as its initial stock!
      // In Loja: propagate countedStock if hasCount
      const shouldPropagate = loc === 'deposito' || hasCount;
      const finalStockToPropagate = loc === 'deposito' ? (numCurrent + numEntries) : Number(updatedItem.countedStock);

      if (shouldPropagate) {
        const futureDates = Object.keys(updatedLoc)
          .filter(d => d > selectedDate)
          .sort((a, b) => a.localeCompare(b));

        if (futureDates.length > 0) {
          const nextDate = futureDates[0];
          const nextSess = updatedLoc[nextDate];
          if (nextSess && nextSess.items && nextSess.items[productId]) {
            const nextIt = { ...nextSess.items[productId] };
            nextIt.currentStock = finalStockToPropagate;
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

      const nextHistory = {
        ...prev,
        [loc]: updatedLoc
      };

      try {
        localStorage.setItem('viva_counts_history', JSON.stringify(nextHistory));
      } catch (e) {}

      return nextHistory;
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
          headers: { 
            'Content-Type': 'application/json',
            'X-Client-Id': clientIdRef.current
          },
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
        }, 1500);
      } catch (err) {
        console.warn('Servidor offline ou lento, alteração preservada localmente:', err);
        if (isFirebaseConfigured()) {
          saveCountItemToFirestore(loc, selectedDate, productId, updatedItem);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
      }
    }, 250);
  }, [countsHistory, selectedDate, currentLocation, users, currentUserId, products]);

  // Toggle Check
  const handleToggleCheck = useCallback(async (productId, newCheckState) => {
    const loc = currentLocation;
    const currentUser = users.find(u => u.id === currentUserId) || users[0];
    const now = new Date().toISOString();

    setCountsHistory(prev => {
      const locSessions = prev[loc] || {};
      const session = locSessions[selectedDate] || { date: selectedDate, items: {} };
      const item = session.items[productId] || {};
      const updated = {
        ...item,
        checked: newCheckState,
        checkedAt: newCheckState ? now : null,
        countedBy: currentUser ? currentUser.name : item.countedBy,
        lastModified: now
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

      const nextHistory = {
        ...prev,
        [loc]: updatedLoc
      };

      try {
        localStorage.setItem('viva_counts_history', JSON.stringify(nextHistory));
      } catch (e) {}

      return nextHistory;
    });

    setSaveStatus('saving');
    try {
      await fetch(`${API_BASE}/counts/toggle-check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
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
          countedBy: currentUser ? currentUser.name : undefined,
          lastModified: now
        });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
    } catch (err) {
      console.warn('Erro ao alternar check no servidor, salvo localmente:', err);
      if (isFirebaseConfigured()) {
        saveCountItemToFirestore(loc, selectedDate, productId, {
          checked: newCheckState,
          checkedAt: newCheckState ? now : null,
          countedBy: currentUser ? currentUser.name : undefined,
          lastModified: now
        });
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500);
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
            countedBy: currentUser ? currentUser.name : updatedItems[id].countedBy,
            lastModified: now
          };
        }
      });

      const nextHistory = {
        ...prev,
        [loc]: {
          ...locSessions,
          [selectedDate]: {
            ...session,
            items: updatedItems
          }
        }
      };

      try {
        localStorage.setItem('viva_counts_history', JSON.stringify(nextHistory));
      } catch (e) {}

      return nextHistory;
    });

    try {
      await fetch(`${API_BASE}/counts/batch-check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
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
      console.warn('Erro no batch check no servidor, salvo localmente:', err);
      if (isFirebaseConfigured()) {
        batchCheckInFirestore(loc, selectedDate, productIds, checkState, currentUser ? currentUser.name : undefined);
      }
    }
  }, [selectedDate, currentLocation, users, currentUserId]);

  // Products CRUD
  const handleSaveProduct = async (productData) => {
    setProducts(prev => {
      const index = prev.findIndex(p => p.id === productData.id);
      const next = index !== -1 ? [...prev] : [...prev, productData];
      if (index !== -1) next[index] = productData;
      try { localStorage.setItem('viva_products', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      const savedProd = data.product || productData;
      
      setProducts(prev => {
        const index = prev.findIndex(p => p.id === savedProd.id);
        const next = [...prev];
        if (index !== -1) {
          next[index] = savedProd;
        } else {
          next.push(savedProd);
        }
        try { localStorage.setItem('viva_products', JSON.stringify(next)); } catch (e) {}
        return next;
      });

      if (isFirebaseConfigured()) {
        saveProductToFirestore(savedProd);
      }
    } catch (err) {
      console.error('Erro ao salvar produto no servidor, mantido localmente:', err);
      if (isFirebaseConfigured()) {
        saveProductToFirestore(productData);
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== productId);
      try { localStorage.setItem('viva_products', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      await fetch(`${API_BASE}/products/${productId}`, { 
        method: 'DELETE',
        headers: { 'X-Client-Id': clientIdRef.current }
      });

      if (isFirebaseConfigured()) {
        deleteProductFromFirestore(productId);
      }
    } catch (err) {
      console.error('Erro ao deletar produto no servidor:', err);
      if (isFirebaseConfigured()) {
        deleteProductFromFirestore(productId);
      }
    }
  };

  const handleAddCategory = async (catName) => {
    setCategories(prev => {
      const next = [...prev, catName];
      try { localStorage.setItem('viva_categories', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
        body: JSON.stringify({ name: catName })
      });
      const data = await res.json();
      const updatedCats = data.categories || [...categories, catName];
      setCategories(updatedCats);
      try { localStorage.setItem('viva_categories', JSON.stringify(updatedCats)); } catch (e) {}

      if (isFirebaseConfigured()) {
        saveCategoriesToFirestore(updatedCats);
      }
    } catch (err) {
      console.error('Erro ao adicionar categoria no servidor:', err);
      if (isFirebaseConfigured()) {
        saveCategoriesToFirestore([...categories, catName]);
      }
    }
  };

  const handleDeleteCategory = async (catName) => {
    const updated = categories.filter(c => c !== catName);
    setCategories(updated);
    try { localStorage.setItem('viva_categories', JSON.stringify(updated)); } catch (e) {}

    try {
      await fetch(`${API_BASE}/categories/${encodeURIComponent(catName)}`, {
        method: 'DELETE',
        headers: { 'X-Client-Id': clientIdRef.current }
      });
    } catch (err) {
      console.error('Erro ao excluir categoria no backend:', err);
    }

    if (isFirebaseConfigured()) {
      saveCategoriesToFirestore(updated);
    }
  };

  const handleAddUser = async (userData) => {
    const tempUser = { id: 'usr-' + Date.now(), name: userData.name };
    setUsers(prev => {
      const next = [...prev, tempUser];
      try { localStorage.setItem('viva_users', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setCurrentUserId(tempUser.id);

    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      const savedUser = data.user || tempUser;
      setUsers(prev => {
        const next = prev.map(u => u.id === tempUser.id ? savedUser : u);
        try { localStorage.setItem('viva_users', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setCurrentUserId(savedUser.id);

      if (isFirebaseConfigured()) {
        saveUserToFirestore(savedUser);
      }
    } catch (err) {
      console.error('Erro ao adicionar usuário no servidor:', err);
      if (isFirebaseConfigured()) {
        saveUserToFirestore(tempUser);
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    setUsers(prev => {
      const remaining = prev.filter(u => u.id !== userId);
      try { localStorage.setItem('viva_users', JSON.stringify(remaining)); } catch (e) {}
      if (currentUserId === userId && remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
      }
      return remaining;
    });

    try {
      await fetch(`${API_BASE}/users/${userId}`, { 
        method: 'DELETE',
        headers: { 'X-Client-Id': clientIdRef.current }
      });
    } catch (err) {
      console.error('Erro ao excluir usuário no backend:', err);
    }

    if (isFirebaseConfigured()) {
      deleteUserFromFirestore(userId);
    }
  };

  // Supplier management handlers
  const handleSaveSupplier = async (supplierData) => {
    let savedSup = supplierData;
    if (!savedSup.id) {
      savedSup = { ...savedSup, id: 'sup-' + Date.now() };
    }

    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === savedSup.id);
      const next = [...prev];
      if (idx !== -1) {
        next[idx] = savedSup;
      } else {
        next.push(savedSup);
      }
      try { localStorage.setItem('viva_suppliers', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
        body: JSON.stringify(supplierData)
      });
      const data = await res.json();
      if (data.supplier) {
        savedSup = data.supplier;
        setSuppliers(prev => {
          const next = prev.map(s => s.id === savedSup.id ? savedSup : s);
          try { localStorage.setItem('viva_suppliers', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }
      if (isFirebaseConfigured()) {
        saveSupplierToFirestore(savedSup);
      }
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      if (isFirebaseConfigured()) {
        saveSupplierToFirestore(savedSup);
      }
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    setSuppliers(prev => {
      const next = prev.filter(s => s.id !== supplierId);
      try { localStorage.setItem('viva_suppliers', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      await fetch(`${API_BASE}/suppliers/${supplierId}`, {
        method: 'DELETE',
        headers: { 'X-Client-Id': clientIdRef.current }
      });
      if (isFirebaseConfigured()) {
        deleteSupplierFromFirestore(supplierId);
      }
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err);
      if (isFirebaseConfigured()) {
        deleteSupplierFromFirestore(supplierId);
      }
    }
  };

  const handleAssignProductsToSupplier = async (supplierId, supplierName, productIds) => {
    const targetSet = new Set(productIds || []);
    let updatedProducts = [];

    setProducts(prev => {
      const next = prev.map(p => {
        if (targetSet.has(p.id)) {
          return { ...p, supplierId, supplierName };
        } else if (p.supplierId === supplierId) {
          // Unlinked
          return { ...p, supplierId: null, supplierName: null };
        }
        return p;
      });
      updatedProducts = next;
      try { localStorage.setItem('viva_products', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      await fetch(`${API_BASE}/products/batch-supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
        body: JSON.stringify({
          syncForSupplier: true,
          supplierId,
          supplierName,
          productIds
        })
      });

      if (isFirebaseConfigured()) {
        updatedProducts.forEach(p => {
          if (targetSet.has(p.id) || p.supplierId === supplierId) {
            saveProductToFirestore(p);
          }
        });
      }
    } catch (err) {
      console.error('Erro ao vincular produtos ao fornecedor:', err);
    }
  };

  const handleBatchAssignSupplierCategory = async (category, supplierId, supplierName) => {
    setProducts(prev => {
      const next = prev.map(p => {
        if (p.category === category) {
          return { ...p, supplierId, supplierName };
        }
        return p;
      });
      try { localStorage.setItem('viva_products', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    try {
      await fetch(`${API_BASE}/products/batch-supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientIdRef.current
        },
        body: JSON.stringify({ category, supplierId, supplierName })
      });
      if (isFirebaseConfigured()) {
        products.forEach(p => {
          if (p.category === category) {
            saveProductToFirestore({ ...p, supplierId, supplierName });
          }
        });
      }
    } catch (err) {
      console.error('Erro ao vincular categoria ao fornecedor:', err);
    }
  };

  const handleResetAllValues = async () => {
    if (!window.confirm('Tem certeza que deseja zerar todos os estoques e contagens de todos os produtos? Todos os cadastros serão mantidos, mas todos os valores serão zerados a partir de agora.')) {
      return;
    }

    try {
      localStorage.removeItem('viva_counts_history');
      setProducts(prev => {
        const updated = prev.map(p => ({ ...p, currentStock: 0 }));
        try { localStorage.setItem('viva_products', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
      setCountsHistory({ loja: {}, deposito: {} });

      await fetch(`${API_BASE}/reset-clean`, {
        method: 'POST',
        headers: { 'X-Client-Id': clientIdRef.current }
      });

      if (isFirebaseConfigured()) {
        await resetAllStockAndCountsInFirestore();
      }

      alert('Todos os valores foram zerados com sucesso! As novas informações serão salvas a partir de agora.');
    } catch (err) {
      console.error('Erro ao zerar valores:', err);
    }
  };

  // Stats calculation - Saída é a diferença (o que foi vendido)
  const summaryStats = useMemo(() => {
    const session = countsHistory.loja?.[selectedDate];
    let checkedCount = 0;
    let totalOutputToday = 0;

    if (session && session.items) {
      Object.values(session.items).forEach(it => {
        if (it.checked) checkedCount++;
        // No dashboard/resumo de saída, considerar apenas a diferença como o que foi vendido
        const saida = Math.abs(Number(it.difference) || 0);
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
        const saida = Math.abs(Number(it.difference) || 0);
        totalOutputToday += saida;
      });
    }

    return {
      totalItems: products.length,
      checkedCount,
      totalOutputToday
    };
  }, [countsHistory.deposito, selectedDate, products]);

  // General Stock & Critical Alert Calculation (Alimentado por Loja + Depósito)
  const generalStockStats = useMemo(() => {
    const lojaSession = countsHistory.loja?.[selectedDate]?.items || {};
    const depSession = countsHistory.deposito?.[selectedDate]?.items || {};

    let criticalCount = 0;
    let totalLoja = 0;
    let totalDeposito = 0;

    products.forEach(p => {
      // 1. Loja Stock
      const lojaItem = lojaSession[p.id];
      let estoqueLoja = p.currentStock || 0;
      if (lojaItem) {
        const hasCount = lojaItem.countedStock !== null && lojaItem.countedStock !== undefined && lojaItem.countedStock !== '';
        if (hasCount) {
          estoqueLoja = Number(lojaItem.countedStock);
        } else {
          const cur = Number(lojaItem.currentStock ?? p.currentStock) || 0;
          const ent = Number(lojaItem.entries) || 0;
          const diff = Math.abs(Number(lojaItem.difference) || 0);
          estoqueLoja = Math.max(0, cur + ent - diff);
        }
      }

      // 2. Depósito Stock
      const depItem = depSession[p.id];
      let estoqueDeposito = 0;
      if (depItem) {
        const baseDep = Number(depItem.currentStock ?? p.currentStock) || 0;
        const entriesDep = Number(depItem.entries) || 0;
        estoqueDeposito = baseDep + entriesDep;
      } else {
        estoqueDeposito = p.currentStock || 0;
      }

      // 3. Estoque Geral
      const totalGeral = estoqueLoja + estoqueDeposito;
      const minStock = Number(p.minStock) || 0;

      if (totalGeral <= minStock) {
        criticalCount++;
      }

      totalLoja += estoqueLoja;
      totalDeposito += estoqueDeposito;
    });

    return {
      criticalCount,
      hasLowStock: criticalCount > 0,
      totalLoja,
      totalDeposito,
      totalGeral: totalLoja + totalDeposito
    };
  }, [products, countsHistory, selectedDate]);

  // Total items needing replenishment (Estoque Geral <= minStock OU Estoque Depósito <= minStock)
  const ordersCount = useMemo(() => {
    const lojaSession = countsHistory.loja?.[selectedDate]?.items || {};
    const depSession = countsHistory.deposito?.[selectedDate]?.items || {};

    return products.filter(p => {
      // Loja
      const lojaItem = lojaSession[p.id];
      let estoqueLoja = p.currentStock || 0;
      if (lojaItem) {
        const hasCount = lojaItem.countedStock !== null && lojaItem.countedStock !== undefined && lojaItem.countedStock !== '';
        if (hasCount) {
          estoqueLoja = Number(lojaItem.countedStock);
        } else {
          const cur = Number(lojaItem.currentStock ?? p.currentStock) || 0;
          const ent = Number(lojaItem.entries) || 0;
          const diff = Math.abs(Number(lojaItem.difference) || 0);
          estoqueLoja = Math.max(0, cur + ent - diff);
        }
      }

      // Depósito
      const depItem = depSession[p.id];
      let estoqueDep = p.currentStock || 0;
      let entriesDep = 0;
      if (depItem) {
        estoqueDep = Number(depItem.currentStock ?? p.currentStock) || 0;
        entriesDep = Number(depItem.entries) || 0;
      }
      const totalDep = estoqueDep + entriesDep;

      const totalGeral = estoqueLoja + totalDep;
      const minStock = Number(p.minStock) || 0;

      return totalGeral <= minStock || totalDep <= minStock;
    }).length;
  }, [products, countsHistory, selectedDate]);

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
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50">
      {/* Menu Lateral (Sidebar) com todos os menus reunidos na lateral */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        users={users}
        currentUserId={currentUserId}
        setCurrentUserId={handleUserChange}
        summaryStats={summaryStats}
        depositoStats={depositoStats}
        ordersCount={ordersCount}
        criticalGeneralCount={generalStockStats.criticalCount}
        hasLowGeneralStock={generalStockStats.hasLowStock}
        isFirebaseActive={isFirebaseActive}
        onOpenProducts={() => setIsProductsModalOpen(true)}
        onOpenUsers={() => setIsUsersModalOpen(true)}
        onOpenSuppliers={() => setIsSuppliersModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenFirebase={() => setIsFirebaseModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        navRef={sidebarNavRef}
      />

      {/* Conteúdo Principal com Barra Superior Limpa */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <TopNavbar
          activeTab={activeTab}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          saveStatus={saveStatus}
          users={users}
          currentUserId={currentUserId}
          setCurrentUserId={setCurrentUserId}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Main container: Full Width utilizing all left and right margins, auto-scrolling sidebar menu in sync */}
        <main 
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 py-4 scroll-smooth"
        >
        {activeTab === 'count' ? (
          <DailyCountView
            key={`loja-${selectedDate}`}
            selectedDate={selectedDate}
            location="loja"
            products={sortedProducts}
            categories={sortedCategories}
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
            products={sortedProducts}
            categories={sortedCategories}
            users={users}
            currentUserId={currentUserId}
            countData={currentCountData}
            onUpdateItem={handleUpdateItem}
            onToggleCheck={handleToggleCheck}
            onBatchCheck={handleBatchCheck}
            onSaveProduct={handleSaveProduct}
          />
        ) : activeTab === 'general_stock' ? (
          <GeneralStockView
            products={sortedProducts}
            categories={sortedCategories}
            counts={countsHistory}
            selectedDate={selectedDate}
            onNavigateToOrders={() => setActiveTab('orders')}
          />
        ) : activeTab === 'orders' ? (
          <OrdersView
            products={sortedProducts}
            categories={sortedCategories}
            suppliers={suppliers}
            counts={countsHistory}
            selectedDate={selectedDate}
            onOpenSuppliersModal={() => setIsSuppliersModalOpen(true)}
            onSaveProduct={handleSaveProduct}
          />
        ) : activeTab === 'suppliers' ? (
          <SupplierManagementModal
            isModal={false}
            isOpen={true}
            onClose={() => setActiveTab('orders')}
            suppliers={suppliers}
            categories={sortedCategories}
            products={sortedProducts}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onBatchAssignCategory={handleBatchAssignSupplierCategory}
            onAssignProductsToSupplier={handleAssignProductsToSupplier}
          />
        ) : activeTab === 'reports' ? (
          <ReportsView
            products={sortedProducts}
            categories={sortedCategories}
            suppliers={suppliers}
            counts={countsHistory}
            selectedDate={selectedDate}
            users={users}
            currentUserId={currentUserId}
          />
        ) : (
          <DashboardView
            products={sortedProducts}
            categories={sortedCategories}
            countsHistory={countsHistory.loja || {}}
            selectedDate={selectedDate}
          />
        )}
      </main>

      {/* Modals */}
      <ProductManagementModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
        products={sortedProducts}
        categories={sortedCategories}
        suppliers={suppliers}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetAllValues={handleResetAllValues}
      />

      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={users}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
      />

      <SupplierManagementModal
        isOpen={isSuppliersModalOpen}
        onClose={() => setIsSuppliersModalOpen(false)}
        suppliers={suppliers}
        categories={sortedCategories}
        products={sortedProducts}
        onSaveSupplier={handleSaveSupplier}
        onDeleteSupplier={handleDeleteSupplier}
        onBatchAssignCategory={handleBatchAssignSupplierCategory}
        onAssignProductsToSupplier={handleAssignProductsToSupplier}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedDate={selectedDate}
        products={sortedProducts}
        countData={currentCountData}
        users={users}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => {
          setIsFirebaseModalOpen(false);
          setIsFirebaseActive(isFirebaseConfigured());
        }}
        products={sortedProducts}
        categories={sortedCategories}
        users={users}
        suppliers={suppliers}
        countsHistory={countsHistory}
        onReloadData={loadData}
      />
      </div>
    </div>
  );
}
