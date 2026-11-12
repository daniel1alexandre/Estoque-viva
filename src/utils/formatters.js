export function formatDateBR(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBR(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function exportCountToCSV(date, products, countItems, users) {
  const headers = [
    'Data',
    'Categoria',
    'Produto',
    'Estoque Inicial',
    'Entradas (+)',
    'Contagem da Tarde',
    'Última Contagem',
    'Estoque Final',
    'Diferença',
    'Status Conferência',
    'Conferente',
    'Horário Conferência'
  ];

  const rows = products.map(prod => {
    const item = countItems[prod.id] || {};
    const currentStock = Number(item.currentStock ?? prod.currentStock) || 0;
    const entries = Number(item.entries) || 0;
    const tardeCount = Number(item.outputCount) || 0;
    const hasCount = item.countedStock !== null && item.countedStock !== undefined && item.countedStock !== '';
    const countedStock = hasCount ? Number(item.countedStock) : '';
    // Formulas requested:
    // Estoque Final = Última Contagem
    const estoqueFinal = hasCount ? countedStock : currentStock;
    // Diferença = (ultima contagem - contagem da tarde)
    const diff = hasCount ? (Number(countedStock) - tardeCount) : 0;
    const checked = item.checked ? 'Conferido' : 'Pendente';
    const countedBy = item.countedBy || '';
    const checkedAt = item.checkedAt ? new Date(item.checkedAt).toLocaleTimeString('pt-BR') : '';

    return [
      date,
      `"${prod.category}"`,
      `"${prod.name}"`,
      currentStock,
      entries,
      tardeCount,
      countedStock,
      estoqueFinal,
      diff,
      checked,
      `"${countedBy}"`,
      `"${checkedAt}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `contagem-estoque-${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Canonical category normalizer to prevent accent/spelling mismatches across devices and lists
export function normalizeCategoryName(cat) {
  if (!cat || typeof cat !== 'string') return '';
  const trimmed = cat.trim();
  const unaccented = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  
  if (
    unaccented === 'BARRA DE PROTEINA' || 
    unaccented === 'BARRA DE PROTEINAS' || 
    unaccented === 'BARRAS DE PROTEINAS' || 
    unaccented === 'BARRAS DE PROTEINA'
  ) {
    return 'BARRA DE PROTEÍNAS';
  }
  if (unaccented === 'AGUA') return 'ÁGUA';
  if (unaccented === 'ENERGETICO' || unaccented === 'ENERGETICOS') return 'ENERGÉTICOS';
  if (unaccented === 'ISOTONICO' || unaccented === 'ISOTONICOS') return 'ISOTONICOS';
  if (unaccented === 'CHA') return 'CHA';

  return trimmed;
}

// Robust matcher that ALWAYS returns an exact string present in catList if there is a match
export function matchCategoryInList(cat, catList) {
  if (!cat) return (catList && catList[0]) || '';
  if (!catList || !Array.isArray(catList) || catList.length === 0) return cat;

  // 1. Direct exact match
  if (catList.includes(cat)) return cat;

  // 2. Direct case-insensitive match
  const lower = cat.toLowerCase();
  const foundCase = catList.find(c => (c || '').toLowerCase() === lower);
  if (foundCase) return foundCase;

  // 3. Normalized canonical match
  const norm = normalizeCategoryName(cat).toUpperCase();
  const foundNorm = catList.find(c => normalizeCategoryName(c).toUpperCase() === norm);
  if (foundNorm) return foundNorm;

  // 4. Unaccented match
  const unaccent = cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const foundUnaccent = catList.find(c => 
    (c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase() === unaccent
  );
  if (foundUnaccent) return foundUnaccent;

  // Fallback: return the normalized category string
  return normalizeCategoryName(cat);
}

