import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialProducts, initialCategories, initialUsers } from './data/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In serverless / Vercel, use /tmp if root is read-only
const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel 
  ? path.join('/tmp', 'db.json')
  : path.join(__dirname, 'data', 'db.json');

const app = express();

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

// Generate some sample historical counts
function generateInitialHistory(products, users) {
  const history = {};
  const today = new Date();

  for (let i = 5; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const items = {};
    products.forEach((p, idx) => {
      const baseStock = p.currentStock;
      const entries = idx % 5 === 0 ? 10 : 0;
      const outputCount = (idx % 2 === 0) ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 4);
      const expected = baseStock + entries - outputCount;
      const diff = idx === 12 ? -1 : (idx === 25 ? 1 : 0);
      items[p.id] = {
        productId: p.id,
        currentStock: baseStock,
        entries: entries,
        outputCount: outputCount,
        countedStock: expected + diff,
        difference: diff,
        checked: true,
        checkedAt: new Date(d.setHours(17, 30, 0)).toISOString(),
        countedBy: users[idx % users.length]?.name || 'Conferente',
        lastModified: new Date().toISOString()
      };
    });

    history[dateStr] = {
      date: dateStr,
      defaultUserId: users[0]?.id || 'usr-1',
      items
    };
  }

  const todayStr = getTodayString();
  const todayItems = {};
  products.forEach((p, idx) => {
    const isDone = idx < 15;
    const entries = idx % 6 === 0 ? 12 : 0;
    const outputCount = isDone ? Math.floor(Math.random() * 5) + 1 : 0;
    const expected = p.currentStock + entries - outputCount;
    const countedStock = isDone ? expected : null;

    todayItems[p.id] = {
      productId: p.id,
      currentStock: p.currentStock,
      entries: entries,
      outputCount: outputCount,
      countedStock: countedStock,
      difference: 0,
      checked: isDone,
      checkedAt: isDone ? new Date().toISOString() : null,
      countedBy: users[idx % users.length]?.name || 'Conferente',
      lastModified: new Date().toISOString()
    };
  });

  history[todayStr] = {
    date: todayStr,
    defaultUserId: users[0]?.id || 'usr-1',
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

app.get('/api/data', (req, res) => {
  res.json(db);
});

app.get('/api/counts/:date', (req, res) => {
  const { date } = req.params;
  if (!db.counts[date]) {
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
        countedBy: db.users[0]?.name || 'Conferente',
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

  const expectedStock = numCurrent + numEntries - numOutput;
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
    countedBy: countedBy || prevItem.countedBy || db.users[0]?.name || 'Conferente',
    lastModified: new Date().toISOString()
  };

  db.counts[date].items[productId] = updatedItem;
  saveDatabase(db);

  res.json({ success: true, item: updatedItem, date });
});

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

app.post('/api/products', (req, res) => {
  const { id, code, name, category, unit, minStock, currentStock } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
  }

  if (id) {
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

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name || db.categories.includes(name)) {
    return res.status(400).json({ error: 'Categoria inválida ou já existente' });
  }
  db.categories.push(name.trim());
  saveDatabase(db);
  res.json({ success: true, categories: db.categories });
});

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

export default app;
