import React from 'react';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { VendaGerencial, ClientRecord } from '../../types';
import { extrairNumeroPuroPedido } from '../../utils/vendasService';
import { resolveClientType } from '../../utils/clientTypes';

interface ModalImprimirExportarProps {
  venda: VendaGerencial | null;
  clientes?: ClientRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const ModalImprimirExportar: React.FC<ModalImprimirExportarProps> = ({
  venda,
  clientes = [],
  isOpen,
  onClose,
}) => {
  if (!isOpen || !venda) return null;

  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);
  const clientTypeInfo = resolveClientType(
    venda.cliente,
    venda.clienteId,
    clientes,
    venda.tipoCliente
  );
  const tipoCliente = clientTypeInfo.name;

  const formatBRL = (val?: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Pedido',
      'Data',
      'Cliente',
      'Tipo de Cliente',
      'Vendedor',
      'Valor Venda',
      'Desconto',
      'Frete',
      'Forma Pagamento',
      'Custo Total',
      'Lucro',
      'Margem',
      'Status',
    ];

    const custoTotal =
      venda.custoTotal !== undefined
        ? Number(venda.custoTotal)
        : (Number(venda.custoProdutos) || 0) + (Number(venda.custosAdicionais) || 0);

    const row = [
      numPedido,
      venda.data,
      `"${venda.cliente.replace(/"/g, '""')}"`,
      tipoCliente,
      `"${venda.vendedor || ''}"`,
      venda.valorVenda,
      venda.desconto || 0,
      venda.frete || 0,
      `"${venda.formaPagamento || ''}"`,
      custoTotal,
      venda.lucro,
      `${venda.margem}%`,
      'Concluído',
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers.join(';') + '\n' + row.join(';');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pedido_${numPedido}_fenix_world.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        <div className="bg-[#0B2046] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Printer className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Imprimir / Exportar</h3>
              <p className="text-xs text-slate-300">Pedido {numPedido}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <p className="text-slate-500">Cliente: <strong className="text-slate-800">{venda.cliente}</strong></p>
            <p className="text-slate-500">Valor Total: <strong className="text-slate-800">{formatBRL(venda.valorVenda)}</strong></p>
            <p className="text-slate-500">Data: <strong className="text-slate-800">{venda.data}</strong></p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full p-3.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700 block">
                    Imprimir Espelho do Pedido
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Gera visualização pronta para impressão ou salvar como PDF
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 block">
                    Exportar Pedido em CSV / Planilha
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Arquivo compatível com Excel, Google Sheets e LibreOffice
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
