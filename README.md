# 🏖️ Controle de Estoque Viva Beach - Arena Viva

Sistema completo para controle de estoque diário, contagens físicas com conferência por check, acompanhamento de entradas, saídas, cálculo automático de divergências e dashboard analítico de saídas dos produtos.

---

## 🚀 Como Iniciar o Aplicativo

### Método Rápido (Recomendado):
Basta dar dois cliques no arquivo **`iniciar-sistema.bat`** na pasta do projeto. Ele iniciará o servidor e abrirá o aplicativo no navegador automaticamente.

### Método Manual via Terminal:
Abra o prompt de comando ou terminal na pasta e execute:
```bash
npm run dev
```
O aplicativo estará disponível em: **`http://localhost:5173`**

---

## 📋 Funcionalidades Principais

### 1. Classificação por Categorias
- Todos os itens da empresa agrupados por categorias (*Bebidas & Laticínios, Alimentos Secos, Embalagens, Higiene & Limpeza, Descartáveis & Escritório, Matéria-Prima*, etc.).
- Filtro rápido em abas por categoria com contagem de produtos em cada uma.
- Possibilidade de adicionar novas categorias e novos produtos com código, nome, unidade de medida e estoques mínimo e inicial.

### 2. Tabela de Contagem Diária Completa
Cada linha da tabela apresenta:
- **Botão de Check de Conferência**: Marcador interativo após a conferência física do item.
- **Item / Código / Unidade**: Nome do produto, código SKU e unidade de medida (UN, CX, FARDO, etc.).
- **Estoque Inicial / Sistema**: Quantidade registrada no sistema.
- **Entradas (+)**: Quantidades que deram entrada física ou fiscalmente no dia.
- **Saídas (-)**: Quantidades que saíram ou foram consumidas no dia.
- **Estoque Esperado**: Calculado automaticamente pela fórmula `Estoque Inicial + Entradas - Saídas`.
- **Última Contagem (Física)**: Campo de digitação rápida com destaque visual.
- **Diferença**: Cálculo instantâneo entre a contagem física e o estoque esperado:
  - 🟢 **0 (OK)**: Estoque alinhado perfeitamente.
  - 🔵 **+X (Sobra)**: Quantidade física superior à esperada.
  - 🔴 **-X (Falta)**: Quantidade física inferior à esperada (com alerta).
- **Conferente**: Seleção de qual usuário fez a contagem daquele item específico, com carimbo de data e hora da conferência.

### 3. Salvamento Automático em Tempo Real
- **Auto-save**: Assim que o usuário digita a contagem física, entradas ou saídas, o sistema salva automaticamente sem necessidade de botões manuais de salvar.
- Indicador visual no cabeçalho (*"Salvando..."* ➔ *"Salvo automaticamente"*).

### 4. Gestão de Usuários / Conferentes
- Seleção do conferente responsável pela sessão no cabeçalho.
- Permissão para alterar o usuário linha por linha se diferentes funcionários contarem setores distintos.
- Cadastro e edição de novos usuários e cargos (*Almoxarife, Conferente, Supervisor, etc.*).

### 5. Dashboard de Saídas dos Produtos
Painel gráfico completo para visualização do consumo:
- **Total de Saídas no Período**: Métricas consolidadas de baixas.
- **Média Diária de Saída**: Previsibilidade de consumo.
- **Produto Mais Movimentado**: Destaque para o item campeão de saídas.
- **Gráfico de Evolução Diária**: Linhas e áreas mostrando a movimentação diária de saídas versus entradas.
- **Gráfico de Saídas por Categoria**: Gráfico de rosca/pizza com o percentual de saídas por setor.
- **Ranking Top Produtos**: Gráfico comparativo dos produtos com maior volume de saída.
- **Auditoria de Divergências**: Relatório de itens que apresentaram falta ou sobra na contagem.
- Filtros por período (*Hoje, Últimos 7 dias, Últimos 30 dias ou Geral*).

### 6. Exportação e Impressão
- Exportação para planilha **Excel / CSV** com todas as colunas e dados da contagem diária.
- Impressão formatada para prancheta ou relatório em PDF.

