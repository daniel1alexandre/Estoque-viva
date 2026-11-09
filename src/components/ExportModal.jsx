import React from 'react';
import { X, Download, Printer, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { exportCountToCSV, formatDateBR } from '../utils/formatters';

export default function ExportModal({
  isOpen,
  onClose,
  selectedDate,
  products,
  countData,
  users
}) {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportCountToCSV(selectedDate, products, countData?.items || {}, users);
    onClose();
  };

  const handleExportXLM = () => {
    const items = countData?.items || {};
    const escapeXml = (unsafe) => {
      if (unsafe === null || unsafe === undefined) return '';
      return String(unsafe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Number">
   <Alignment ss:Horizontal="Center"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="Text">
   <Alignment ss:Horizontal="Left"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Contagem_${selectedDate}">
  <Table>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Column ss:Width="200"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="160"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Categoria</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Código</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Produto</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Estoque Inicial</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Entradas</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Contagem Tarde</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Última Contagem</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Estoque Final</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Diferença</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Observações</Data></Cell>
   </Row>
`;

    products.forEach(p => {
      const it = items[p.id] || {};
      const initial = it.currentStock ?? p.currentStock ?? 0;
      const entries = it.entries || 0;
      const tarde = it.outputCount ?? '';
      const counted = it.countedStock !== null && it.countedStock !== undefined ? it.countedStock : '';
      const finalVal = counted !== '' ? counted : initial;
      const diff = it.difference || 0;
      const obs = it.observation || '';

      xml += `   <Row>
    <Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(p.category)}</Data></Cell>
    <Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(p.code)}</Data></Cell>
    <Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(p.name)}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${Number(initial)}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${Number(entries)}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="${tarde !== '' ? 'Number' : 'String'}">${tarde !== '' ? Number(tarde) : ''}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="${counted !== '' ? 'Number' : 'String'}">${counted !== '' ? Number(counted) : ''}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${Number(finalVal)}</Data></Cell>
    <Cell ss:StyleID="Number"><Data ss:Type="Number">${Number(diff)}</Data></Cell>
    <Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXml(obs)}</Data></Cell>
   </Row>
`;
    });

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contagem_viva_${selectedDate}.xlm`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exportar Relatório</h3>
              <p className="text-xs text-slate-500">Contagem de {formatDateBR(selectedDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecione o formato desejado para exportar a conferência física e a contagem diária dos itens:
          </p>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleExportXLM}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/40 hover:border-emerald-600 hover:bg-emerald-100/50 transition text-left group cursor-pointer shadow-xs"
            >
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Planilha Excel .xlm (Recomendado)</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">.xlm</span>
                </div>
                <div className="text-xs text-slate-600">
                  Exporta como planilha formatada para Excel com títulos, larguras ajustadas e dados alinhados
                </div>
              </div>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition text-left group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Planilha Excel / CSV</div>
                <div className="text-xs text-slate-500">
                  Exporta com todas as colunas: entradas, saídas, contagem física e divergências
                </div>
              </div>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition text-left group"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 group-hover:scale-105 transition">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Imprimir Folha de Conferência</div>
                <div className="text-xs text-slate-500">
                  Gera versão limpa para prancheta ou relatório em PDF
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

