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

// Generate sample history for a location
function generateLocationHistory(products, users, locationMultiplier = 1) {
  const history = {};
  const today = new Date();

  for (let i = 5; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const items = {};
    products.forEach((p, idx) => {
      // Deposito has more stock than loja
      const baseStock = Math.round(p.currentStock * locationMultiplier);
      const entries = idx % 5 === 0 ? 10 * locationMultiplier : 0;
      const outputCount = (idx % 2 === 0) ? Math.floor(Math.random() * 6) + 1 : Math.floor(Math.random() * 3);
      const expected = baseStock + entries - outputCount;
      const diff = idx === 12 ? -1 : (idx === 25 ? 1 : 0);
      const countedStock = expected + diff;

      items[p.id] = {
        productId: p.id,
        currentStock: baseStock,
        entries: entries,
        outputCount: outputCount,
        countedStock: countedStock,
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

  // Today's count
  const todayStr = getTodayString();
  const todayItems = {};
  products.forEach((p, idx) => {
    const isDone = idx < 15;
    // Chain rule: initial stock of today is the counted stock of yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];
    const prevCounted = history[yestStr]?.items?.[p.id]?.countedStock;
    const baseStock = prevCounted !== null && prevCounted !== undefined 
      ? prevCounted 
      : Math.round(p.currentStock * locationMultiplier);

    const entries = idx % 6 === 0 ? 12 : 0;
    const outputCount = isDone ? Math.floor(Math.random() * 5) + 1 : 0;
    const expected = baseStock + entries - outputCount;
    const countedStock = isDone ? expected : null;

    todayItems[p.id] = {
      productId: p.id,
      currentStock: baseStock,
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

// Find previous day's counted stock for a product
function getPreviousDayCountedStock(locationCounts, targetDateStr, productId, defaultStock) {
  if (!locationCounts) return defaultStock;
  const priorDates = Object.keys(locationCounts)
    .filter(d => d < targetDateStr)
    .sort((a, b) => b.localeCompare(a)); // Descending order (closest previous day first)

  if (priorDates.length > 0) {
    const prevDate = priorDates[0];
    const prevItem = locationCounts[prevDate]?.items?.[productId];
    if (prevItem) {
      if (prevItem.countedStock !== null && prevItem.countedStock !== undefined && prevItem.countedStock !== '') {
        return Number(prevItem.countedStock);
      }
      // If not physically counted, use the previous day's Estoque Geral
      const exp = (Number(prevItem.currentStock) || 0) + (Number(prevItem.entries) || 0) - (Number(prevItem.outputCount) || 0);
      return exp;
    }
  }

  return defaultStock;
}

// Propagate Estoque Final to next day as initial stock
function propagateToNextDay(locationCounts, currentDateStr, productId, newCountedStock, isChecked, calculatedStock) {
  if (!locationCounts) return;
  const futureDates = Object.keys(locationCounts)
    .filter(d => d > currentDateStr)
    .sort((a, b) => a.localeCompare(b)); // Ascending order (closest next day first)

  if (futureDates.length > 0) {
    const nextDate = futureDates[0];
    const nextItem = locationCounts[nextDate]?.items?.[productId];
    if (nextItem) {
      // If checked and physically counted, count assumes Estoque Final and propagates to next day
      const finalStock = (isChecked && newCountedStock !== null && newCountedStock !== undefined)
        ? Number(newCountedStock)
        : Number(calculatedStock);

      nextItem.currentStock = finalStock;
      const expected = nextItem.currentStock + (Number(nextItem.entries) || 0) - (Number(nextItem.outputCount) || 0);
      if (nextItem.countedStock !== null && nextItem.countedStock !== undefined && nextItem.countedStock !== '') {
        nextItem.difference = Number(nextItem.countedStock) - expected;
      }
    }
  }
}

// Load or initialize DB
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Ensure structure has loja and deposito
      if (!parsed.counts || !parsed.counts.loja) {
        parsed.counts = {
          loja: parsed.counts || {},
          deposito: generateLocationHistory(parsed.products || initialProducts, parsed.users || initialUsers, 2.5)
        };
      }
      if (!parsed.counts.deposito) {
        parsed.counts.deposito = generateLocationHistory(parsed.products || initialProducts, parsed.users || initialUsers, 2.5);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }

  const initialData = {
    products: initialProducts,
    categories: initialCategories,
    users: initialUsers,
    counts: {
      loja: generateLocationHistory(initialProducts, initialUsers, 1),
      deposito: generateLocationHistory(initialProducts, initialUsers, 2.5)
    }
  };

  saveDatabase(initialData);
  return initialData;
}

let dbVersion = Date.now();
const sseClients = new Set();

function notifyClients(originClientId) {
  dbVersion = Date.now();
  const payload = JSON.stringify({ version: dbVersion, origin: originClientId });
  sseClients.forEach(client => {
    // Only notify other clients, avoid notifying the client that made the change
    if (originClientId && client.id === originClientId) {
      return;
    }
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

function saveDatabase(data, originClientId) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    notifyClients(originClientId);
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

let db = loadDatabase();

// ---------------- ROUTES ----------------

app.get('/api/version', (req, res) => {
  res.json({ version: dbVersion });
});

// Server-Sent Events (SSE) for instantaneous multi-device synchronization
app.get('/api/sync-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = req.query.clientId || req.headers['x-client-id'] || 'client_' + Date.now();
  const client = { id: clientId, res };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ version: dbVersion, initial: true })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

app.get('/api/data', (req, res) => {
  res.json(db);
});

// Get count session for date & location
app.get('/api/counts/:date', (req, res) => {
  const { date } = req.params;
  const location = req.query.location === 'deposito' ? 'deposito' : 'loja';

  if (!db.counts[location]) {
    db.counts[location] = {};
  }

  if (!db.counts[location][date]) {
    const items = {};
    const mult = location === 'deposito' ? 2.5 : 1;
    db.products.forEach(p => {
      // Chained rule: initial stock of this date is the counted stock of previous day
      const initialStock = getPreviousDayCountedStock(
        db.counts[location],
        date,
        p.id,
        Math.round(p.currentStock * mult)
      );

      items[p.id] = {
        productId: p.id,
        currentStock: initialStock,
        entries: 0,
        outputCount: 0,
        countedStock: null,
        difference: 0,
        checked: false,
        checkedAt: null,
        countedBy: db.users[0]?.name || 'Conferente',
        observation: '',
        lastModified: new Date().toISOString()
      };
    });

    db.counts[location][date] = {
      date,
      location,
      defaultUserId: db.users[0]?.id || '',
      items
    };
    saveDatabase(db);
  }

  res.json(db.counts[location][date]);
});

// Auto-save item count
app.post('/api/counts/save-item', (req, res) => {
  const { date, productId, currentStock, entries, outputCount, countedStock, checked, countedBy, observation, location = 'loja' } = req.body;
  const loc = location === 'deposito' ? 'deposito' : 'loja';

  if (!date || !productId) {
    return res.status(400).json({ error: 'Date and productId are required' });
  }

  if (!db.counts[loc]) {
    db.counts[loc] = {};
  }

  if (!db.counts[loc][date]) {
    db.counts[loc][date] = {
      date,
      location: loc,
      defaultUserId: db.users[0]?.id || '',
      items: {}
    };
  }

  const numCurrent = Number(currentStock) || 0;
  const numEntries = Number(entries) || 0;
  const numOutput = Number(outputCount) || 0;
  const hasCount = countedStock !== null && countedStock !== undefined && countedStock !== '';
  const numCounted = hasCount ? Number(countedStock) : null;

  // Formulas requested by user:
  // For Depósito: Estoque Final = currentStock + entries (somando as entradas ao estoque)
  // For Loja: Estoque Final = hasCount ? numCounted : numCurrent
  const estoqueFinal = loc === 'deposito'
    ? (numCurrent + numEntries)
    : (hasCount ? numCounted : numCurrent);

  // Diferença = (ultima contagem - contagem da tarde)
  const difference = loc === 'deposito'
    ? 0
    : (hasCount ? (numCounted - numOutput) : 0);

  const prevItem = db.counts[loc][date].items[productId] || {};
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
    observation: observation !== undefined ? observation : (prevItem.observation || ''),
    lastModified: new Date().toISOString()
  };

  db.counts[loc][date].items[productId] = updatedItem;

  // Chain rule: propagate Estoque Final to next day!
  propagateToNextDay(db.counts[loc], date, productId, numCounted, isChecked, estoqueFinal);

  const clientId = req.headers['x-client-id'] || req.body.clientId;
  saveDatabase(db, clientId);
  res.json({ success: true, item: updatedItem, date, location: loc });
});

app.post('/api/counts/toggle-check', (req, res) => {
  const { date, productId, checked, countedBy, location = 'loja' } = req.body;
  const loc = location === 'deposito' ? 'deposito' : 'loja';

  if (!db.counts[loc] || !db.counts[loc][date] || !db.counts[loc][date].items[productId]) {
    return res.status(404).json({ error: 'Item count not found' });
  }

  const item = db.counts[loc][date].items[productId];
  item.checked = checked;
  item.checkedAt = checked ? new Date().toISOString() : null;
  if (countedBy) {
    item.countedBy = countedBy;
  }
  item.lastModified = new Date().toISOString();

  // Propagate to next day because check changes Estoque Final if divergence exists
  const exp = (Number(item.currentStock) || 0) + (Number(item.entries) || 0) - (Number(item.outputCount) || 0);
  propagateToNextDay(db.counts[loc], date, productId, item.countedStock, item.checked, exp);

  const clientId = req.headers['x-client-id'] || req.body.clientId;
  saveDatabase(db, clientId);
  res.json({ success: true, item });
});

app.post('/api/counts/batch-check', (req, res) => {
  const { date, productIds, checked, countedBy, location = 'loja' } = req.body;
  const loc = location === 'deposito' ? 'deposito' : 'loja';

  if (!db.counts[loc] || !db.counts[loc][date]) {
    return res.status(404).json({ error: 'Date not found' });
  }

  const now = new Date().toISOString();
  productIds.forEach(pId => {
    if (db.counts[loc][date].items[pId]) {
      db.counts[loc][date].items[pId].checked = checked;
      db.counts[loc][date].items[pId].checkedAt = checked ? now : null;
      if (countedBy) {
        db.counts[loc][date].items[pId].countedBy = countedBy;
      }
      db.counts[loc][date].items[pId].lastModified = now;
    }
  });

  const clientId = req.headers['x-client-id'] || req.body.clientId;
  saveDatabase(db, clientId);
  res.json({ success: true, count: productIds.length });
});

app.post('/api/products', (req, res) => {
  const { id, code, name, category, unit, minStock, currentStock } = req.body;
  const clientId = req.headers['x-client-id'] || req.body.clientId;
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
      saveDatabase(db, clientId);
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
  saveDatabase(db, clientId);
  res.status(201).json({ success: true, product: newProduct });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'];
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase(db, clientId);
  res.json({ success: true, message: 'Produto excluído' });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  const clientId = req.headers['x-client-id'] || req.body.clientId;
  if (!name || db.categories.includes(name)) {
    return res.status(400).json({ error: 'Categoria inválida ou já existente' });
  }
  db.categories.push(name.trim());
  saveDatabase(db, clientId);
  res.json({ success: true, categories: db.categories });
});

app.delete('/api/categories/:name', (req, res) => {
  const catName = decodeURIComponent(req.params.name);
  const clientId = req.headers['x-client-id'];
  db.categories = db.categories.filter(c => c !== catName);
  saveDatabase(db, clientId);
  res.json({ success: true, categories: db.categories });
});

app.post('/api/users', (req, res) => {
  const { name } = req.body;
  const clientId = req.headers['x-client-id'] || req.body.clientId;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  const newUser = {
    id: 'usr-' + Date.now(),
    name: name.trim()
  };
  db.users.push(newUser);
  saveDatabase(db, clientId);
  res.status(201).json({ success: true, user: newUser });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'];
  db.users = db.users.filter(u => u.id !== id);
  saveDatabase(db, clientId);
  res.json({ success: true, message: 'Usuário excluído com sucesso' });
});

app.post('/api/reset-demo', (req, res) => {
  db = {
    products: initialProducts,
    categories: initialCategories,
    users: initialUsers,
    counts: {
      loja: generateLocationHistory(initialProducts, initialUsers, 1),
      deposito: generateLocationHistory(initialProducts, initialUsers, 2.5)
    }
  };
  saveDatabase(db);
  res.json({ success: true, message: 'Dados de demonstração restaurados com sucesso!' });
});

export default app;
