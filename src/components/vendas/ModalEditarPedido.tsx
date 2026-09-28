import React, { useState, useEffect } from 'react';
import {
  X,
  FileEdit,
  User,
  Tag,
  Calendar,
  CreditCard,
  Truck,
  DollarSign,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  Package,
  Hash,
  Sparkles,
} from 'lucide-react';
import { VendaGerencial, ClientRecord, VendaItemProduto, FormaPagamentoItem } from '../../types';
import {
  extrairNumeroPuroPedido,
  salvarVendaGerencial,
} from '../../utils/vendasService';
import { resolveClientType } from '../../utils/clientTypes';
import { ProductSelectionModal } from '../ProductSelectionModal';
import { getPriceTierFromClientType } from '../../data/productCatalog';
import {
  PaymentSplitManager,
  summarizePayments,
  isFormaCartaoCredito,
  isPaymentSplitComplete,
} from '../common/PaymentSplitManager';

interface ModalEditarPedidoProps {
  venda: VendaGerencial | null;
  clientes?: ClientRecord[];
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onSuccess: () => void;
}

const BASE_TIPOS_CLIENTE = [
  'Cliente Final',
  'Revenda',
  'Construtora',
  'Instalador',
  'Arquiteto',
  'Engenheiro',
  'Distribuidor',
];

const RESPONSAVEIS_OPCOES = [
  'Éder Perez',
  'Vanessa Gomes',
  'Jhessica Camargo',
  'Jeferson Trolesi',
];

const FORMAS_PAGAMENTO = [
  'Pix / À Vista',
  'Boleto Faturado 30 dias',
  'Boleto Parcelado',
  'Cartão de Crédito 1x',
  'Cartão de Crédito até 6x',
  'Cartão de Crédito até 12x',
  'Transferência / TED',
  'Dinheiro',
];

interface FormProdutoItem {
  id: string;
  produto: string;
  unidade: string;
  quantidade: string | number;
  valorUnitario: string | number;
  valorTotal: number;
}

export const ModalEditarPedido: React.FC<ModalEditarPedidoProps> = ({
  venda,
  clientes = [],
  isOpen,
  onClose,
  currentUserName,
  onSuccess,
}) => {
  // 5. VENDAS — NOVA VENDA DO DIRETOR:
  // Campo "Pedido" sem o símbolo "#", que pode ser informado e alterado manualmente
  const [numeroPedido, setNumeroPedido] = useState('');
  const [cliente, setCliente] = useState('');
  const [tipoCliente, setTipoCliente] = useState('Cliente Final');
  const [vendedor, setVendedor] = useState('Éder Perez');
  const [data, setData] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix / À Vista');
  const [payments, setPayments] = useState<FormaPagamentoItem[]>([]);
  const [desconto, setDesconto] = useState('0');
  const [frete, setFrete] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  
  // Seção CADASTRAR PRODUTOS da venda
  const [produtos, setProdutos] = useState<FormProdutoItem[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const tiposClienteDisponiveis = React.useMemo(() => {
    const set = new Set<string>(BASE_TIPOS_CLIENTE);
    clientes.forEach((c) => {
      if (c.clientType && c.clientType.trim()) {
        set.add(c.clientType.trim());
      }
    });
    if (venda?.tipoCliente && venda.tipoCliente.trim()) {
      set.add(venda.tipoCliente.trim());
    }
    return Array.from(set);
  }, [clientes, venda]);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (venda && isOpen) {
      setError('');
      // Limpa símbolo # se houver no valor recebido
      const numPuro = extrairNumeroPuroPedido(venda.numeroPedido || '');
      setNumeroPedido(numPuro || String(Math.floor(100000 + Math.random() * 900000)));

      setCliente(venda.cliente || '');
      const resolved = resolveClientType(venda.cliente, venda.clienteId, clientes, venda.tipoCliente);
      setTipoCliente(resolved.name);
      setVendedor(venda.vendedor || (currentUserName.toLowerCase().includes('eder') ? 'Éder Perez' : 'Vanessa Gomes'));
      setData(venda.data || new Date().toISOString().split('T')[0]);
      setFormaPagamento(venda.formaPagamento || 'Pix / À Vista');
      setDesconto(String(venda.desconto || 0));
      setFrete(String(venda.frete || 0));
      setObservacoes(venda.observacoes || '');

      // Inicializa formas de pagamento (múltiplas formas com parcelas)
      if (venda.formasPagamento && Array.isArray(venda.formasPagamento) && venda.formasPagamento.length > 0) {
        setPayments(venda.formasPagamento);
      } else {
        const val = Number(venda.valorVenda) || 0;
        const rawForma = venda.formaPagamento || 'Pix';
        const isCard = isFormaCartaoCredito(rawForma);
        const resolvedForma = isCard
          ? 'Cartão de Crédito'
          : rawForma.toLowerCase().includes('boleto')
          ? 'Boleto Bancário'
          : rawForma.toLowerCase().includes('dinheiro')
          ? 'Dinheiro'
          : 'Pix';

        setPayments([
          {
            id: `pay_${Date.now()}`,
            forma: resolvedForma,
            valor: val,
            parcelas: isCard ? (venda.parcelas || '1x à vista') : undefined,
          },
        ]);
      }

      // Inicializa produtos
      if (venda.produtos && Array.isArray(venda.produtos) && venda.produtos.length > 0) {
        setProdutos(
          venda.produtos.map((p, idx) => {
            const qtd = typeof p.quantidade === 'number' ? p.quantidade : parseFloat(String(p.quantidade)) || 1;
            const unit = p.valorUnitario || 0;
            const tot = p.valorTotal || qtd * unit;
            return {
              id: p.id || `prod-${Date.now()}-${idx}`,
              produto: p.produto || '',
              unidade: p.unidade || 'm²',
              quantidade: qtd,
              valorUnitario: unit,
              valorTotal: tot,
            };
          })
        );
      } else if (venda.valorVenda && venda.valorVenda > 0) {
        // Se tinha valor mas sem lista estruturada, inicializa com 1 item padrão
        setProdutos([
          {
            id: `prod-${Date.now()}-1`,
            produto: venda.itensResumo || 'Produto Principal',
            unidade: 'm²',
            quantidade: 1,
            valorUnitario: venda.valorVenda,
            valorTotal: venda.valorVenda,
          },
        ]);
      } else {
        // Novo cadastro vazio: começa com 1 linha em branco pronta para preenchimento
        setProdutos([
          {
            id: `prod-${Date.now()}-1`,
            produto: '',
            unidade: 'm²',
            quantidade: 1,
            valorUnitario: 0,
            valorTotal: 0,
          },
        ]);
      }
    }
  }, [venda, isOpen, clientes, currentUserName]);

  if (!isOpen || !venda) return null;

  // Handlers para os produtos da venda
  const handleAddProduto = () => {
    const novoItem: FormProdutoItem = {
      id: `prod-${Date.now()}-${produtos.length + 1}`,
      produto: '',
      unidade: 'm²',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0,
    };
    setProdutos([...produtos, novoItem]);
  };

  const handleSelectProductFromModal = (prod: {
    name: string;
    category: string;
    unit: string;
    price: number;
    quantity: string;
    subtitulo?: string;
  }) => {
    const numQtd = parseFloat(prod.quantity.replace(/\./g, '').replace(',', '.')) || 1;
    const unitPrice = typeof prod.price === 'number' ? prod.price : parseFloat(String(prod.price)) || 0;
    const tot = Math.round(numQtd * unitPrice * 100) / 100;
    const novoItem: FormProdutoItem = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      produto: prod.name,
      unidade: prod.unit || 'm²',
      quantidade: numQtd,
      valorUnitario: unitPrice,
      valorTotal: tot,
    };
    setProdutos((prev) => {
      if (prev.length === 1 && !prev[0].produto.trim() && !prev[0].valorTotal) {
        return [novoItem];
      }
      return [...prev, novoItem];
    });
    setIsProductModalOpen(false);
  };

  const handleRemoveProduto = (id: string) => {
    if (produtos.length === 1) {
      // Limpa a linha caso reste apenas uma
      setProdutos([
        {
          id: `prod-${Date.now()}-1`,
          produto: '',
          unidade: 'm²',
          quantidade: 1,
          valorUnitario: 0,
          valorTotal: 0,
        },
      ]);
      return;
    }
    setProdutos(produtos.filter((p) => p.id !== id));
  };

  const handleUpdateProduto = (
    id: string,
    field: 'produto' | 'unidade' | 'quantidade' | 'valorUnitario',
    val: string
  ) => {
    setProdutos((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let updated = { ...item };
        if (field === 'produto') {
          updated.produto = val;
        } else if (field === 'unidade') {
          updated.unidade = val;
        } else if (field === 'quantidade') {
          updated.quantidade = val;
          const qtdNum = parseFloat(String(val).replace(',', '.')) || 0;
          const unitNum = parseFloat(String(item.valorUnitario).replace(',', '.')) || 0;
          updated.valorTotal = Number((qtdNum * unitNum).toFixed(2));
        } else if (field === 'valorUnitario') {
          updated.valorUnitario = val;
          const qtdNum = parseFloat(String(item.quantidade).replace(',', '.')) || 0;
          const unitNum = parseFloat(String(val).replace(',', '.')) || 0;
          updated.valorTotal = Number((qtdNum * unitNum).toFixed(2));
        }
        return updated;
      })
    );
  };

  // CÁLCULOS AUTOMÁTICOS:
  // Soma total de todos os produtos
  const somaTotalProdutos = produtos.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
  const numFrete = parseFloat(frete.replace(',', '.')) || 0;
  const numDesconto = parseFloat(desconto.replace(',', '.')) || 0;
  const valorTotalVenda = Math.max(0, Number((somaTotalProdutos + numFrete - numDesconto).toFixed(2)));

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pedidoLimpo = numeroPedido.trim().replace(/^#+/, '');
    if (!pedidoLimpo) {
      setError('Informe o número do Pedido.');
      return;
    }
    if (!cliente.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }

    // Valida se há pelo menos um produto com nome ou valor
    const produtosValidos: VendaItemProduto[] = produtos
      .filter((p) => p.produto.trim() || p.valorTotal > 0)
      .map((p) => ({
        id: p.id,
        produto: p.produto.trim() || 'Produto Diverso',
        unidade: (p.unidade || 'm²').trim(),
        quantidade: parseFloat(String(p.quantidade).replace(',', '.')) || 1,
        valorUnitario: parseFloat(String(p.valorUnitario).replace(',', '.')) || 0,
        valorTotal: p.valorTotal,
      }));

    if (produtosValidos.length === 0) {
      setError('Cadastre pelo menos 1 produto com quantidade e valor unitário.');
      return;
    }

    // 4. VENDAS — LOGIN EXCLUSIVO DO ÉDER:
    // Permitir mais de uma forma de pagamento na mesma venda, informar o valor de cada uma,
    // e validar que a soma das formas de pagamento seja igual ao valor total da venda.
    if (valorTotalVenda > 0) {
      if (payments.length === 0) {
        setError('Informe ao menos uma forma de pagamento para a venda.');
        return;
      }
      const totalPago = payments.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
      if (Math.abs(totalPago - valorTotalVenda) > 0.01) {
        setError(
          `A soma das formas de pagamento (${formatBRL(totalPago)}) deve ser igual ao valor total da venda (${formatBRL(valorTotalVenda)}). Diferença: ${formatBRL(Math.abs(totalPago - valorTotalVenda))}.`
        );
        return;
      }
    }

    setIsSaving(true);
    setError('');

    try {
      const resumoItens = produtosValidos
        .map((p) => `${p.quantidade}x ${p.produto}`)
        .join(', ');

      const paymentSummary = summarizePayments(payments);
      const cardPay = payments.find((p) => isFormaCartaoCredito(p.forma));
      const resolvedParcelas = cardPay?.parcelas;

      const res = await salvarVendaGerencial(
        {
          ...venda,
          numeroPedido: pedidoLimpo, // Salva número puro do pedido sem '#'
          cliente: cliente.trim(),
          tipoCliente,
          vendedor,
          data,
          formaPagamento: paymentSummary,
          formasPagamento: payments,
          parcelas: resolvedParcelas,
          desconto: numDesconto,
          frete: numFrete,
          valorVenda: valorTotalVenda,
          produtos: produtosValidos,
          itensResumo: resumoItens,
          observacoes: observacoes.trim(),
        },
        currentUserName
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Erro ao salvar a venda.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao conectar com o Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6">
        {/* Header - Utiliza o termo "Pedido", sem o símbolo "#" */}
        <div className="bg-[#0B2046] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileEdit className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {venda.id && !venda.id.startsWith('vnd-') ? `Pedido ${numeroPedido}` : 'Nova Venda'}
              </h3>
              <p className="text-xs text-slate-300">
                Cadastro e gestão de produtos da venda com cálculo automático
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Seção 1: Dados Gerais e Pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Campo Pedido (Manual, sem "#") */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pedido *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value.replace(/^#+/, ''))}
                  required
                  placeholder="Ex: 104520"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Número do pedido (editável manualmente)
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Data da Venda *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Responsável / Vendedor
              </label>
              <select
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {RESPONSAVEIS_OPCOES.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nome do Cliente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  required
                  placeholder="Nome do cliente ou empresa"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tipo de Cliente
              </label>
              <select
                value={tipoCliente}
                onChange={(e) => setTipoCliente(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {tiposClienteDisponiveis.map((tc) => (
                  <option key={tc} value={tc}>
                    {tc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SEÇÃO: CADASTRAR PRODUTOS                                */}
          {/* ======================================================== */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Produtos da Venda
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Selecione produtos do catálogo como no Orçamento ou adicione manualmente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0057ff] hover:bg-[#0047db] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Adicionar Produtos</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddProduto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Linha Manual</span>
                </button>
              </div>
            </div>

            {/* Cabeçalho das colunas dos produtos */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 px-1">
              <div className="col-span-4">Produto</div>
              <div className="col-span-1 text-center">UN</div>
              <div className="col-span-2 text-right">Quantidade</div>
              <div className="col-span-2 text-right">Valor Unitário (R$)</div>
              <div className="col-span-2 text-right">Valor Total (R$)</div>
              <div className="col-span-1 text-center">Ações</div>
            </div>

            {/* Lista dos Produtos */}
            <div className="space-y-3">
              {produtos.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 sm:p-2.5 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2 items-center"
                >
                  {/* Produto */}
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 sm:hidden block mb-0.5">
                      Produto {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={item.produto}
                      onChange={(e) => handleUpdateProduto(item.id, 'produto', e.target.value)}
                      placeholder="Nome / descrição do produto"
                      required
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* UN (Unidade) */}
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 sm:hidden block mb-0.5">
                      UN
                    </label>
                    <input
                      type="text"
                      value={item.unidade || 'm²'}
                      onChange={(e) => handleUpdateProduto(item.id, 'unidade', e.target.value)}
                      placeholder="UN"
                      title="Unidade de Medida (m², cx, un, barra, etc.)"
                      className="w-full px-1.5 py-1.5 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase"
                    />
                  </div>

                  {/* Quantidade */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 sm:hidden block mb-0.5">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantidade}
                      onChange={(e) => handleUpdateProduto(item.id, 'quantidade', e.target.value)}
                      placeholder="Qtd"
                      required
                      className="w-full px-2.5 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Valor Unitário */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 sm:hidden block mb-0.5">
                      Valor Unitário (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.valorUnitario}
                      onChange={(e) => handleUpdateProduto(item.id, 'valorUnitario', e.target.value)}
                      placeholder="0,00"
                      required
                      className="w-full px-2.5 py-1.5 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Valor Total Calculado */}
                  <div className="sm:col-span-2 text-right">
                    <label className="text-[10px] font-bold text-slate-500 sm:hidden block mb-0.5">
                      Valor Total
                    </label>
                    <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200/60 rounded-lg text-xs font-bold text-blue-900 text-right">
                      {formatBRL(item.valorTotal)}
                    </div>
                  </div>

                  {/* Botão Remover */}
                  <div className="sm:col-span-1 flex justify-end sm:justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveProduto(item.id)}
                      title="Remover produto"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo dos Produtos */}
            <div className="pt-2 flex flex-col sm:flex-row items-end sm:items-center justify-between border-t border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">
                Total de itens adicionados: <strong className="text-slate-800">{produtos.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">Subtotal Produtos:</span>
                <span className="text-sm font-black text-slate-900">{formatBRL(somaTotalProdutos)}</span>
              </div>
            </div>
          </div>

          {/* Desconto e Frete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Desconto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Frete (R$)
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={frete}
                  onChange={(e) => setFrete(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Banner de Total Geral com Destaque */}
          <div className="bg-gradient-to-r from-[#0B2046] to-[#1E3A8A] text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">
                Cálculo Automático da Venda
              </span>
              <p className="text-xs text-slate-200">
                Soma dos produtos ({formatBRL(somaTotalProdutos)})
                {numFrete > 0 ? ` + Frete (${formatBRL(numFrete)})` : ''}
                {numDesconto > 0 ? ` - Desconto (${formatBRL(numDesconto)})` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-blue-200 block">Valor Total Geral</span>
              <span className="text-2xl font-black text-emerald-300">
                {formatBRL(valorTotalVenda)}
              </span>
            </div>
          </div>

          {/* Formas de Pagamento (Múltiplas formas com parcelamento de Cartão de Crédito e validação) */}
          <div className="bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Formas de Pagamento da Venda
            </label>
            <PaymentSplitManager
              totalVenda={valorTotalVenda}
              payments={payments}
              onChange={setPayments}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre o pedido..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer inside form */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#0B2046] hover:bg-[#0B2046]/90 text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Salvando no Supabase...' : 'Salvar Venda'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Seleção de Produtos do Catálogo (mesmo padrão do Orçamento) */}
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        clientType={tipoCliente || 'Cliente Final'}
        priceTable={getPriceTierFromClientType(tipoCliente || 'Cliente Final')}
        onSelectProduct={handleSelectProductFromModal}
      />
    </div>
  );
};
