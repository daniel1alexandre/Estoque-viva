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
  const [activeTab, setActiveTab] = useState('count'); // 'count' | 'dashboard'
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [countsHistory, setCountsHistory] = useState({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [loading, setLoading] = useState(true);

  // Modals
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Debounce timers map for auto-saving
  const saveTimeoutsRef = useRef({});

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
        setCountsHistory(data.counts || {});
        if (data.users && data.users.length > 0) {
          setCurrentUserId(data.users[0].id);
        }
        // Save to local cache as backup
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
            setCountsHistory(data.counts || {});
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

  // Ensure count session exists for the selectedDate
  useEffect(() => {
    if (!loading && products.length > 0) {
      if (!countsHistory[selectedDate]) {
        // Initialize day in local state & server
        const defaultUser = users.find(u => u.id === currentUserId) || users[0];
        const newItems = {};
        products.forEach(p => {
          newItems[p.id] = {
            productId: p.id,
            currentStock: p.currentStock,
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
          defaultUserId: currentUserId,
          items: newItems
        };

        setCountsHistory(prev => ({
          ...prev,
          [selectedDate]: newSession
        }));

        // Inform backend
        fetch(`${API_BASE}/counts/${selectedDate}`).catch(console.error);
      }
    }
  }, [selectedDate, loading, products, users, currentUserId, countsHistory]);

  // Current session count data
  const currentCountData = countsHistory[selectedDate] || {
    date: selectedDate,
    defaultUserId: currentUserId,
    items: {}
  };

  // Immediate local update + debounced auto-save to backend
  const handleUpdateItem = useCallback((productId, partialChanges) => {
    const currentUser = users.find(u => u.id === currentUserId) || users[0];
    const prevSession = countsHistory[selectedDate] || { date: selectedDate, items: {} };
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

    // Recalculate difference
    const numCurrent = Number(updatedItem.currentStock) || 0;
    const numEntries = Number(updatedItem.entries) || 0;
    const numOutput = Number(updatedItem.outputCount) || 0;
    const hasCount = updatedItem.countedStock !== null && updatedItem.countedStock !== undefined && updatedItem.countedStock !== '';
    const expected = numCurrent + numEntries - numOutput;
    updatedItem.difference = hasCount ? (Number(updatedItem.countedStock) - expected) : 0;

    // Update UI state immediately with no lag
    setCountsHistory(prev => ({
      ...prev,
      [selectedDate]: {
        ...prev[selectedDate],
        items: {
          ...(prev[selectedDate]?.items || {}),
          [productId]: updatedItem
        }
      }
    }));

    // Trigger visual saving status
    setSaveStatus('saving');

    // Debounce backend request by 350ms
    if (saveTimeoutsRef.current[productId]) {
      clearTimeout(saveTimeoutsRef.current[productId]);
    }

    saveTimeoutsRef.current[productId] = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/counts/save-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
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
  }, [countsHistory, selectedDate, users, currentUserId, products]);

  // Toggle Check status for an item
  const handleToggleCheck = useCallback(async (productId, newCheckState) => {
    const currentUser = users.find(u => u.id === currentUserId) || users[0];
    
    // Update local immediately
    setCountsHistory(prev => {
      const session = prev[selectedDate] || { date: selectedDate, items: {} };
      const item = session.items[productId] || {};
      const updated = {
        ...item,
        checked: newCheckState,
        checkedAt: newCheckState ? new Date().toISOString() : null,
        countedBy: currentUser ? currentUser.name : item.countedBy
      };

      return {
        ...prev,
        [selectedDate]: {
          ...session,
          items: {
            ...session.items,
            [productId]: updated
          }
        }
      };
    });

    setSaveStatus('saving');
    try {
      await fetch(`${API_BASE}/counts/toggle-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
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
  }, [selectedDate, users, currentUserId]);

  // Batch check multiple items
  const handleBatchCheck = useCallback(async (productIds, checkState) => {
    const currentUser = users.find(u => u.id === currentUserId) || users[0];
    const now = new Date().toISOString();

    setCountsHistory(prev => {
      const session = prev[selectedDate] || { date: selectedDate, items: {} };
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
        [selectedDate]: {
          ...session,
          items: updatedItems
        }
      };
    });

    try {
      await fetch(`${API_BASE}/counts/batch-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          productIds,
          checked: checkState,
          countedBy: currentUser ? currentUser.name : undefined
        })
      });
    } catch (err) {
      console.error('Erro no batch check:', err);
    }
  }, [selectedDate, users, currentUserId]);

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

  // Header quick summary stats
  const summaryStats = useMemo(() => {
    const session = countsHistory[selectedDate];
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
  }, [countsHistory, selectedDate, products]);

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        users={users}
        currentUserId={currentUserId}
        setCurrentUserId={setCurrentUserId}
        saveStatus={saveStatus}
        onOpenProducts={() => setIsProductsModalOpen(true)}
        onOpenUsers={() => setIsUsersModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        summaryStats={summaryStats}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'count' ? (
          <DailyCountView
            selectedDate={selectedDate}
            products={products}
            categories={categories}
            users={users}
            currentUserId={currentUserId}
            countData={currentCountData}
            onUpdateItem={handleUpdateItem}
            onToggleCheck={handleToggleCheck}
            onBatchCheck={handleBatchCheck}
          />
        ) : (
          <DashboardView
            products={products}
            categories={categories}
            countsHistory={countsHistory}
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
