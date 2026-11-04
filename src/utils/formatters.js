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
    'Unidade',
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
      `"${prod.unit}"`,
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

