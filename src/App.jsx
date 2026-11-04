import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import DailyCountView from './components/DailyCountView';
import DashboardView from './components/DashboardView';
import ProductManagementModal from './components/ProductManagementModal';
import UserManagementModal from './components/UserManagementModal';
import ExportModal from './components/ExportModal';
import { getTodayDateString } from './utils/formatters';

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

  const saveTimeoutsRef = useRef({});

  // Active location: 'loja' or 'deposito'
  const currentLocation = activeTab === 'deposito' ? 'deposito' : 'loja';

  // Fetch full data on initial mount
  useEffect(() => {
    async function loadData() {
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
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
      if (data.product) {
        setProducts(prev => {
          const index = prev.findIndex(p => p.id === data.product.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = data.product;
            return next;
          }
          return [...prev, data.product];
        });
      }
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== productId));
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
      if (data.categories) {
        setCategories(data.categories);
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
      if (data.user) {
        setUsers(prev => [...prev, data.user]);
        setCurrentUserId(data.user.id);
      }
    } catch (err) {
      console.error('Erro ao adicionar usuário:', err);
    }
  };

  // Stats calculation
  const summaryStats = useMemo(() => {
    const session = countsHistory.loja?.[selectedDate];
    let checkedCount = 0;
    let totalOutputToday = 0;

    if (session && session.items) {
      Object.values(session.items).forEach(it => {
        if (it.checked) checkedCount++;
        totalOutputToday += Number(it.outputCount) || 0;
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
        totalOutputToday += Number(it.outputCount) || 0;
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
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedDate={selectedDate}
        products={products}
        countData={currentCountData}
        users={users}
      />
    </div>
  );
}
