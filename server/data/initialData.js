export const initialUsers = [
  { id: 'usr-1', name: 'Carlos Eduardo', role: 'Almoxarife Líder' },
  { id: 'usr-2', name: 'Mariana Santos', role: 'Conferente' },
  { id: 'usr-3', name: 'Lucas Oliveira', role: 'Supervisor de Estoque' },
  { id: 'usr-4', name: 'Juliana Costa', role: 'Auxiliar de Logística' }
];

export const initialCategories = [
  'Bebidas & Laticínios',
  'Alimentos Secos',
  'Embalagens',
  'Higiene & Limpeza',
  'Descartáveis & Escritório',
  'Matéria-Prima'
];

export const initialProducts = [
  {
    id: 'prod-1',
    code: 'BEB-001',
    name: 'Leite Integral 1L',
    category: 'Bebidas & Laticínios',
    unit: 'CX 12x1L',
    minStock: 20,
    currentStock: 85
  },
  {
    id: 'prod-2',
    code: 'BEB-002',
    name: 'Suco de Laranja Natural 1L',
    category: 'Bebidas & Laticínios',
    unit: 'UN',
    minStock: 30,
    currentStock: 120
  },
  {
    id: 'prod-3',
    code: 'BEB-003',
    name: 'Café Torrado Especial 500g',
    category: 'Bebidas & Laticínios',
    unit: 'PCT',
    minStock: 15,
    currentStock: 48
  },
  {
    id: 'prod-4',
    code: 'ALI-001',
    name: 'Arroz Tipo 1 - Fardo 6x5kg',
    category: 'Alimentos Secos',
    unit: 'FARDO',
    minStock: 25,
    currentStock: 64
  },
  {
    id: 'prod-5',
    code: 'ALI-002',
    name: 'Feijão Carioca 1kg',
    category: 'Alimentos Secos',
    unit: 'FARDO 10x1kg',
    minStock: 20,
    currentStock: 50
  },
  {
    id: 'prod-6',
    code: 'ALI-003',
    name: 'Açúcar Cristal 5kg',
    category: 'Alimentos Secos',
    unit: 'FARDO 6x5kg',
    minStock: 15,
    currentStock: 40
  },
  {
    id: 'prod-7',
    code: 'ALI-004',
    name: 'Óleo de Soja 900ml',
    category: 'Alimentos Secos',
    unit: 'CX 20x900ml',
    minStock: 10,
    currentStock: 32
  },
  {
    id: 'prod-8',
    code: 'EMB-001',
    name: 'Caixa de Papelão Padrão M (40x30x25)',
    category: 'Embalagens',
    unit: 'FARDO 50UN',
    minStock: 50,
    currentStock: 210
  },
  {
    id: 'prod-9',
    code: 'EMB-002',
    name: 'Fita Adesiva Transparente 48mm x 100m',
    category: 'Embalagens',
    unit: 'ROLO',
    minStock: 40,
    currentStock: 135
  },
  {
    id: 'prod-10',
    code: 'EMB-003',
    name: 'Plástico Bolha 1.20m x 100m',
    category: 'Embalagens',
    unit: 'BOBINA',
    minStock: 8,
    currentStock: 18
  },
  {
    id: 'prod-11',
    code: 'LIM-001',
    name: 'Detergente Neutro Concentrado 5L',
    category: 'Higiene & Limpeza',
    unit: 'GL 5L',
    minStock: 15,
    currentStock: 45
  },
  {
    id: 'prod-12',
    code: 'LIM-002',
    name: 'Desinfetante Hospitalar 5L',
    category: 'Higiene & Limpeza',
    unit: 'GL 5L',
    minStock: 12,
    currentStock: 28
  },
  {
    id: 'prod-13',
    code: 'LIM-003',
    name: 'Papel Toalha Interfolha 2 Dobras',
    category: 'Higiene & Limpeza',
    unit: 'CX 1000FL',
    minStock: 30,
    currentStock: 75
  },
  {
    id: 'prod-14',
    code: 'ESC-001',
    name: 'Copo Descartável 200ml',
    category: 'Descartáveis & Escritório',
    unit: 'CX 2500UN',
    minStock: 10,
    currentStock: 38
  },
  {
    id: 'prod-15',
    code: 'ESC-002',
    name: 'Papel A4 Sulfite 75g (Resma)',
    category: 'Descartáveis & Escritório',
    unit: 'CX 10 RESMAS',
    minStock: 15,
    currentStock: 42
  },
  {
    id: 'prod-16',
    code: 'MP-001',
    name: 'Bobina Filme Stretch Manual 500mm',
    category: 'Matéria-Prima',
    unit: 'BOBINA',
    minStock: 20,
    currentStock: 62
  }
];

