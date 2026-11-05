import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  onSnapshot
} from 'firebase/firestore';

const STORAGE_KEY = 'viva_firebase_config';

// Retrieve config from Vite Env variables or localStorage
export function getFirebaseConfig() {
  const localSaved = localStorage.getItem(STORAGE_KEY);
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler config do Firebase do localStorage:', e);
    }
  }

  // Fallback to Vite environment variables
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
}

export function saveFirebaseConfig(config) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

let appInstance = null;
let dbInstance = null;

export function initFirebase() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }
    dbInstance = getFirestore(appInstance);
    return dbInstance;
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
    return null;
  }
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return !!(config.apiKey && config.projectId);
}

export function getDb() {
  if (!dbInstance) {
    return initFirebase();
  }
  return dbInstance;
}

// ----------------- FIRESTORE DATA METHODS -----------------

// Load complete app data from Firestore
export async function loadDataFromFirestore() {
  const db = getDb();
  if (!db) return null;

  try {
    // 1. Meta (Categories)
    const metaRef = doc(db, 'settings', 'metadata');
    const metaSnap = await getDoc(metaRef);
    let categories = [];
    if (metaSnap.exists()) {
      categories = metaSnap.data().categories || [];
    }

    // 2. Users
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    let users = [];
    usersSnap.forEach(d => {
      users.push({ id: d.id, ...d.data() });
    });

    // 3. Products
    const prodsCol = collection(db, 'products');
    const prodsSnap = await getDocs(prodsCol);
    let products = [];
    prodsSnap.forEach(d => {
      products.push({ id: d.id, ...d.data() });
    });

    // 4. Suppliers
    const supsCol = collection(db, 'suppliers');
    const supsSnap = await getDocs(supsCol);
    let suppliers = [];
    supsSnap.forEach(d => {
      suppliers.push({ id: d.id, ...d.data() });
    });

    // 5. Counts (Daily sessions: documents with id `loja_{date}` or `deposito_{date}`)
    const countsCol = collection(db, 'counts');
    const countsSnap = await getDocs(countsCol);
    const counts = { loja: {}, deposito: {} };
    countsSnap.forEach(d => {
      const data = d.data();
      const loc = data.location || (d.id.startsWith('deposito') ? 'deposito' : 'loja');
      const date = data.date || d.id.replace(`${loc}_`, '');
      if (!counts[loc]) counts[loc] = {};
      counts[loc][date] = {
        date,
        items: data.items || {}
      };
    });

    return {
      products,
      categories,
      users,
      suppliers,
      counts
    };
  } catch (err) {
    console.error('Erro ao carregar dados do Firestore:', err);
    throw err;
  }
}

// Save single count item to Firestore (Atomic nested merge)
export async function saveCountItemToFirestore(location, date, productId, itemData) {
  const db = getDb();
  if (!db) return;

  try {
    const docId = `${location}_${date}`;
    const docRef = doc(db, 'counts', docId);

    const now = new Date().toISOString();
    const itemToSave = {
      ...itemData,
      productId,
      lastModified: itemData.lastModified || now
    };

    await setDoc(docRef, {
      location,
      date,
      items: {
        [productId]: itemToSave
      },
      updatedAt: now
    }, { merge: true });
  } catch (err) {
    console.error(`Erro ao salvar item ${productId} no Firestore:`, err);
  }
}

// Batch check items in Firestore (Atomic nested merge)
export async function batchCheckInFirestore(location, date, productIds, checkState, countedBy) {
  const db = getDb();
  if (!db) return;

  try {
    const docId = `${location}_${date}`;
    const docRef = doc(db, 'counts', docId);
    const now = new Date().toISOString();

    const itemsPatch = {};
    productIds.forEach(id => {
      itemsPatch[id] = {
        checked: checkState,
        checkedAt: checkState ? now : null,
        countedBy: countedBy || undefined,
        lastModified: now
      };
    });

    await setDoc(docRef, {
      location,
      date,
      items: itemsPatch,
      updatedAt: now
    }, { merge: true });
  } catch (err) {
    console.error('Erro ao realizar batch check no Firestore:', err);
  }
}

// Product CRUD
export async function saveProductToFirestore(product) {
  const db = getDb();
  if (!db) return;
  const prodId = product.id || 'prod-' + Date.now();
  const prodRef = doc(db, 'products', prodId);
  await setDoc(prodRef, { ...product, id: prodId }, { merge: true });
  return { ...product, id: prodId };
}

export async function deleteProductFromFirestore(productId) {
  const db = getDb();
  if (!db) return;
  const prodRef = doc(db, 'products', productId);
  await deleteDoc(prodRef);
}

// Categories
export async function saveCategoriesToFirestore(categories) {
  const db = getDb();
  if (!db) return;
  const metaRef = doc(db, 'settings', 'metadata');
  await setDoc(metaRef, { categories, updatedAt: new Date().toISOString() }, { merge: true });
}

// Users
export async function saveUserToFirestore(user) {
  const db = getDb();
  if (!db) return;
  const userId = user.id || 'usr-' + Date.now();
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { ...user, id: userId }, { merge: true });
  return { ...user, id: userId };
}

export async function deleteUserFromFirestore(userId) {
  const db = getDb();
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}

// Suppliers CRUD
export async function saveSupplierToFirestore(supplier) {
  const db = getDb();
  if (!db) return;
  const supId = supplier.id || 'sup-' + Date.now();
  const supRef = doc(db, 'suppliers', supId);
  await setDoc(supRef, { ...supplier, id: supId }, { merge: true });
  return { ...supplier, id: supId };
}

export async function deleteSupplierFromFirestore(supplierId) {
  const db = getDb();
  if (!db) return;
  const supRef = doc(db, 'suppliers', supplierId);
  await deleteDoc(supRef);
}

// Seed initial data to Firebase Cloud Firestore (1-click sync)
export async function seedDataToFirestore(products, categories, users, counts, suppliers = []) {
  const db = getDb();
  if (!db) throw new Error('Firebase não está inicializado.');

  try {
    const batch = writeBatch(db);

    // Save categories metadata
    const metaRef = doc(db, 'settings', 'metadata');
    batch.set(metaRef, { categories, updatedAt: new Date().toISOString() });

    // Save users
    users.forEach(u => {
      const uRef = doc(db, 'users', u.id);
      batch.set(uRef, { id: u.id, name: u.name });
    });

    // Save suppliers
    if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
      suppliers.forEach(s => {
        const sRef = doc(db, 'suppliers', s.id);
        batch.set(sRef, s);
      });
    }

    // Save products (in chunks if needed)
    products.forEach(p => {
      const pRef = doc(db, 'products', p.id);
      batch.set(pRef, p);
    });

    await batch.commit();

    // Save counts
    for (const [location, sessions] of Object.entries(counts || {})) {
      for (const [date, session] of Object.entries(sessions || {})) {
        if (session && session.items) {
          const cRef = doc(db, 'counts', `${location}_${date}`);
          await setDoc(cRef, {
            location,
            date,
            items: session.items,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Erro ao popular dados no Firestore:', err);
    throw err;
  }
}

// Reset all stock and counts in Firestore to 0
export async function resetAllStockAndCountsInFirestore() {
  const db = getDb();
  if (!db) return;
  try {
    // 1. Delete all counts documents
    const countsCol = collection(db, 'counts');
    const countsSnap = await getDocs(countsCol);
    for (const d of countsSnap.docs) {
      await deleteDoc(d.ref);
    }
    // 2. Set currentStock = 0 for all products in Firestore
    const prodsCol = collection(db, 'products');
    const prodsSnap = await getDocs(prodsCol);
    for (const d of prodsSnap.docs) {
      await updateDoc(d.ref, { currentStock: 0 });
    }
  } catch (err) {
    console.warn('Erro ao zerar dados no Firestore:', err);
  }
}

// Real-time synchronization across devices via Firestore onSnapshot
export function subscribeToRealtimeFirestore({ onCounts, onProducts, onCategories, onUsers, onSuppliers }) {
  const db = getDb();
  if (!db) return () => {};

  const unsubs = [];

  // 1. Listen to counts collection for instant live updates across devices
  if (onCounts) {
    try {
      const countsCol = collection(db, 'counts');
      const unsubCounts = onSnapshot(countsCol, (snap) => {
        const counts = { loja: {}, deposito: {} };
        snap.forEach(d => {
          const data = d.data();
          const loc = data.location || (d.id.startsWith('deposito') ? 'deposito' : 'loja');
          const date = data.date || d.id.replace(`${loc}_`, '');
          if (!counts[loc]) counts[loc] = {};
          counts[loc][date] = {
            date,
            items: data.items || {}
          };
        });
        onCounts(counts);
      }, (err) => {
        console.warn('Aviso: listener de contagens Firestore:', err);
      });
      unsubs.push(unsubCounts);
    } catch (e) {
      console.warn('Erro ao registrar listener de contagens:', e);
    }
  }

  // 2. Listen to products collection
  if (onProducts) {
    try {
      const prodsCol = collection(db, 'products');
      const unsubProds = onSnapshot(prodsCol, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          onProducts(list);
        }
      }, (err) => {
        console.warn('Aviso: listener de produtos Firestore:', err);
      });
      unsubs.push(unsubProds);
    } catch (e) {
      console.warn('Erro ao registrar listener de produtos:', e);
    }
  }

  // 3. Listen to users collection
  if (onUsers) {
    try {
      const usersCol = collection(db, 'users');
      const unsubUsers = onSnapshot(usersCol, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          onUsers(list);
        }
      }, (err) => {
        console.warn('Aviso: listener de usuários Firestore:', err);
      });
      unsubs.push(unsubUsers);
    } catch (e) {
      console.warn('Erro ao registrar listener de usuários:', e);
    }
  }

  // 4. Listen to suppliers collection
  if (onSuppliers) {
    try {
      const supsCol = collection(db, 'suppliers');
      const unsubSups = onSnapshot(supsCol, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          onSuppliers(list);
        }
      }, (err) => {
        console.warn('Aviso: listener de fornecedores Firestore:', err);
      });
      unsubs.push(unsubSups);
    } catch (e) {
      console.warn('Erro ao registrar listener de fornecedores:', e);
    }
  }

  // 5. Listen to categories metadata
  if (onCategories) {
    try {
      const metaRef = doc(db, 'settings', 'metadata');
      const unsubMeta = onSnapshot(metaRef, (snap) => {
        if (snap.exists() && snap.data().categories) {
          onCategories(snap.data().categories);
        }
      }, (err) => {
        console.warn('Aviso: listener de categorias Firestore:', err);
      });
      unsubs.push(unsubMeta);
    } catch (e) {
      console.warn('Erro ao registrar listener de categorias:', e);
    }
  }

  return () => {
    unsubs.forEach(unsub => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}

