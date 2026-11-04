import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialProducts, initialCategories, initialUsers } from './data/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper to get formatted date string YYYY-MM-DD
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate some sample historical counts so the dashboard has rich data right away
function generateInitialHistory(products, users) {
  const history = {};
  const today = new Date();

  // Create last 6 days of data
  for (let i = 5; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const items = {};
    products.forEach((p, idx) => {
      // Simulate realistic daily activity
      const baseStock = p.currentStock + (i * 2);
      const entries = idx % 3 === 0 ? Math.floor(Math.random() * 15) + 5 : 0;
      const outputCount = Math.floor(Math.random() * 18) + 2;
      const expected = baseStock + entries - outputCount;
      // occasionally a small divergence
      const divergence = (idx === 2 || idx === 8) ? -1 : (idx === 5 ? 1 : 0);
      const countedStock = expected + divergence;
      const randomUser = users[idx % users.length];

      items[p.id] = {
        productId: p.id,
        currentStock: baseStock,
        entries: entries,
        outputCount: outputCount,
        countedStock: countedStock,
        difference: divergence,
        checked: true,
        checkedAt: new Date(d.setHours(17, 30, 0)).toISOString(),
        countedBy: randomUser.name,
        lastModified: new Date(d.setHours(17, 30, 0)).toISOString()
      };
    });

    history[dateStr] = {
      date: dateStr,
      defaultUserId: users[0].id,
      items
    };
  }

  // Today's count session (partially done to show realistic interactive state)
  const todayStr = getTodayString();
  const todayItems = {};
  products.forEach((p, idx) => {
    const isDone = idx < 6; // first 6 items already counted today
    const entries = idx % 4 === 0 ? 10 : 0;
    const outputCount = isDone ? Math.floor(Math.random() * 12) + 1 : 0;
    const expected = p.currentStock + entries - outputCount;
    const countedStock = isDone ? expected : null;
    const difference = isDone ? 0 : 0;
    const assignedUser = users[idx % users.length];

    todayItems[p.id] = {
      productId: p.id,
      currentStock: p.currentStock,
      entries: entries,
      outputCount: outputCount,
      countedStock: countedStock,
      difference: difference,
      checked: isDone,
      checkedAt: isDone ? new Date().toISOString() : null,
      countedBy: assignedUser.name,
      lastModified: new Date().toISOString()
    };
  });

  history[todayStr] = {
    date: todayStr,
    defaultUserId: users[0].id,
    items: todayItems
  };

  return history;
}

// Load or initialize DB
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }

  // Fallback to fresh initial data
  const initialHistory = generateInitialHistory(initialProducts, initialUsers);
  const initialData = {
    products: initialProducts,
    categories: initialCategories,
    users: initialUsers,
    counts: initialHistory
  };

  saveDatabase(initialData);
  return initialData;
}

function saveDatabase(data) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

let db = loadDatabase();

// ---------------- ROUTES ----------------

// Get complete state
app.get('/api/data', (req, res) => {
  res.json(db);
});

// Get or ensure count session for a specific date
app.get('/api/counts/:date', (req, res) => {
  const { date } = req.params;
  if (!db.counts[date]) {
    // Initialize day with latest products
    const items = {};
    db.products.forEach(p => {
      items[p.id] = {
        productId: p.id,
        currentStock: p.currentStock,
        entries: 0,
        outputCount: 0,
        countedStock: null,
        difference: 0,
        checked: false,
        checkedAt: null,
        countedBy: db.users[0]?.name || 'Usuário Padrão',
        lastModified: new Date().toISOString()
      };
    });

    db.counts[date] = {
      date,
      defaultUserId: db.users[0]?.id || '',
      items
    };
    saveDatabase(db);
  }

  res.json(db.counts[date]);
});

// Auto-save a single item row in a date's count session
app.post('/api/counts/save-item', (req, res) => {
  const { date, productId, currentStock, entries, outputCount, countedStock, checked, countedBy } = req.body;

  if (!date || !productId) {
    return res.status(400).json({ error: 'Date and productId are required' });
  }

  if (!db.counts[date]) {
    db.counts[date] = {
      date,
      defaultUserId: db.users[0]?.id || '',
      items: {}
    };
  }

  const numCurrent = Number(currentStock) || 0;
  const numEntries = Number(entries) || 0;
  const numOutput = Number(outputCount) || 0;
  const hasCount = countedStock !== null && countedStock !== undefined && countedStock !== '';
  const numCounted = hasCount ? Number(countedStock) : null;

  // Expected stock = current stock + entries - output
  const expectedStock = numCurrent + numEntries - numOutput;
  // Difference = counted stock - expected stock (if counted)
  const difference = hasCount ? (numCounted - expectedStock) : 0;

  const prevItem = db.counts[date].items[productId] || {};
  const isChecked = checked !== undefined ? checked : prevItem.checked || false;

  const updatedItem = {
    productId,
    currentStock: numCurrent,
    entries: numEntries,
    outputCount: numOutput,
    countedStock: numCounted,
    difference: difference,
    checked: isChecked,
    checkedAt: isChecked ? (prevItem.checkedAt || new Date().toISOString()) : null,
    countedBy: countedBy || prevItem.countedBy || db.users[0]?.name || 'Desconhecido',
    lastModified: new Date().toISOString()
  };

  db.counts[date].items[productId] = updatedItem;

  // Also if today's count, we can optionally synchronize currentStock for future days
  saveDatabase(db);

  res.json({ success: true, item: updatedItem, date });
});

// Toggle check status for an item
app.post('/api/counts/toggle-check', (req, res) => {
  const { date, productId, checked, countedBy } = req.body;
  if (!db.counts[date] || !db.counts[date].items[productId]) {
    return res.status(404).json({ error: 'Item count not found' });
  }

  const item = db.counts[date].items[productId];
  item.checked = checked;
  item.checkedAt = checked ? new Date().toISOString() : null;
  if (countedBy) {
    item.countedBy = countedBy;
  }
  item.lastModified = new Date().toISOString();

  saveDatabase(db);
  res.json({ success: true, item });
});

// Check/Uncheck all items for a category or all items of a day
app.post('/api/counts/batch-check', (req, res) => {
  const { date, productIds, checked, countedBy } = req.body;
  if (!db.counts[date]) {
    return res.status(404).json({ error: 'Date not found' });
  }

  const now = new Date().toISOString();
  productIds.forEach(pId => {
    if (db.counts[date].items[pId]) {
      db.counts[date].items[pId].checked = checked;
      db.counts[date].items[pId].checkedAt = checked ? now : null;
      if (countedBy) {
        db.counts[date].items[pId].countedBy = countedBy;
      }
      db.counts[date].items[pId].lastModified = now;
    }
  });

  saveDatabase(db);
  res.json({ success: true, count: productIds.length });
});

// Products CRUD
app.post('/api/products', (req, res) => {
  const { id, code, name, category, unit, minStock, currentStock } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
  }

  if (id) {
    // Edit existing
    const index = db.products.findIndex(p => p.id === id);
    if (index !== -1) {
      db.products[index] = {
        ...db.products[index],
        code: code || db.products[index].code,
        name,
        category,
        unit: unit || 'UN',
        minStock: Number(minStock) || 0,
        currentStock: Number(currentStock) || 0
      };
      saveDatabase(db);
      return res.json({ success: true, product: db.products[index] });
    }
  }

  // Create new
  const newProduct = {
    id: 'prod-' + Date.now(),
    code: code || `COD-${Math.floor(100 + Math.random() * 900)}`,
    name,
    category,
    unit: unit || 'UN',
    minStock: Number(minStock) || 0,
    currentStock: Number(currentStock) || 0
  };

  db.products.push(newProduct);
  saveDatabase(db);
  res.status(201).json({ success: true, product: newProduct });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true, message: 'Produto excluído' });
});

// Categories CRUD
app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name || db.categories.includes(name)) {
    return res.status(400).json({ error: 'Categoria inválida ou já existente' });
  }
  db.categories.push(name.trim());
  saveDatabase(db);
  res.json({ success: true, categories: db.categories });
});

// Users CRUD
app.post('/api/users', (req, res) => {
  const { name, role } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  const newUser = {
    id: 'usr-' + Date.now(),
    name: name.trim(),
    role: role || 'Conferente'
  };
  db.users.push(newUser);
  saveDatabase(db);
  res.status(201).json({ success: true, user: newUser });
});

// Reset demo data
app.post('/api/reset-demo', (req, res) => {
  db = {
    products: initialProducts,
    categories: initialCategories,
    users: initialUsers,
    counts: generateInitialHistory(initialProducts, initialUsers)
  };
  saveDatabase(db);
  res.json({ success: true, message: 'Dados de demonstração restaurados com sucesso!' });
});

// Serve frontend build if dist folder exists
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server rodando em http://localhost:${PORT}`);
});

