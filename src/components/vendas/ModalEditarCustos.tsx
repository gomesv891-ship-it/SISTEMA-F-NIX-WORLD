import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Lock,
  Percent,
  Calculator,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { VendaGerencial, TipoCustoVenda, VendaCustoItem } from '../../types';
import { isEderPerez } from '../../utils/auth';
import {
  extrairNumeroPuroPedido,
  getTaxasConfiguradasDiretor,
  gerarCustosItensIniciais,
  recalcularCustosELucro,
  atualizarCustosCompletosVenda,
} from '../../utils/vendasService';

interface ModalEditarCustosProps {
  venda: VendaGerencial | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onSuccess: () => void;
}

const TIPOS_CUSTO: TipoCustoVenda[] = [
  'Produto',
  'Nota Fiscal',
  'Taxa de Pagamento',
  'Frete',
  'Comercial',
  'Desconto',
  'Operacional',
  'Outros',
];

export const ModalEditarCustos: React.FC<ModalEditarCustosProps> = ({
  venda,
  isOpen,
  onClose,
  currentUserName,
  onSuccess,
}) => {
  const isDirector = isEderPerez(currentUserName);

  // Lista local de itens de custos para edição em tempo real
  const [custos, setCustos] = useState<VendaCustoItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Formulário para adicionar novo custo
  const [novoTipo, setNovoTipo] = useState<TipoCustoVenda>('Outros');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');

  // Taxas configuradas pela Diretoria
  const taxasDiretor = useMemo(() => getTaxasConfiguradasDiretor(), []);

  useEffect(() => {
    if (venda) {
      setErrorMessage('');
      if (Array.isArray(venda.custosItens) && venda.custosItens.length > 0) {
        setCustos(venda.custosItens.map((c) => ({ ...c })));
      } else {
        const iniciais = gerarCustosItensIniciais(
          venda.valorVenda,
          venda.custoProdutos,
          venda.desconto || 0,
          venda.frete || 0,
          venda.formaPagamento || 'Pix'
        );
        setCustos(iniciais);
      }
    }
  }, [venda, isOpen]);

  if (!isOpen || !venda) return null;

  const numPedido = extrairNumeroPuroPedido(venda.numeroPedido);
  const valorVenda = Number(venda.valorVenda) || 0;

  // Recálculo imediato em tempo real
  const { custoTotal, lucro, margem } = recalcularCustosELucro(valorVenda, custos);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleRemoverCusto = (id: string) => {
    setCustos((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAlterarValor = (id: string, novoVal: number) => {
    setCustos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, valor: Math.max(0, novoVal) } : c))
    );
  };

  const handleAdicionarCusto = (e: React.FormEvent) => {
    e.preventDefault();
    const valNum = parseFloat(novoValor.replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) {
      setErrorMessage('Informe um valor válido maior que zero.');
      return;
    }

    const item: VendaCustoItem = {
      id: `custo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tipo: novoTipo,
      descricao: novaDescricao.trim() || `Custo de ${novoTipo}`,
      valor: Number(valNum.toFixed(2)),
    };

    setCustos((prev) => [...prev, item]);
    setNovaDescricao('');
    setNovoValor('');
    setErrorMessage('');
  };

  // Aplicação rápida de Taxa de NF configurada pelo Diretor
  const handleAplicarTaxaNF = () => {
    if (taxasDiretor.taxaNotaFiscalPercent <= 0) return;
    const calc = Number(((valorVenda * taxasDiretor.taxaNotaFiscalPercent) / 100).toFixed(2));
    const existingIndex = custos.findIndex((c) => c.tipo === 'Nota Fiscal');
    if (existingIndex >= 0) {
      setCustos((prev) =>
        prev.map((c, i) =>
          i === existingIndex
            ? {
                ...c,
                descricao: `Impostos s/ NF (${taxasDiretor.taxaNotaFiscalPercent}%)`,
                valor: calc,
              }
            : c
        )
      );
    } else {
      setCustos((prev) => [
        ...prev,
        {
          id: `custo-nf-${Date.now()}`,
          tipo: 'Nota Fiscal',
          descricao: `Impostos s/ NF (${taxasDiretor.taxaNotaFiscalPercent}%)`,
          valor: calc,
        },
      ]);
    }
  };

  // Aplicação rápida de Taxa de Maquininha configurada pelo Diretor
  const handleAplicarTaxaMaquininha = () => {
    if (taxasDiretor.taxaMaquininhaPercent <= 0) return;
    const calc = Number(((valorVenda * taxasDiretor.taxaMaquininhaPercent) / 100).toFixed(2));
    const existingIndex = custos.findIndex((c) => c.tipo === 'Taxa de Pagamento');
    if (existingIndex >= 0) {
      setCustos((prev) =>
        prev.map((c, i) =>
          i === existingIndex
            ? {
                ...c,
                descricao: `Taxa Maquininha (${taxasDiretor.taxaMaquininhaPercent}%)`,
                valor: calc,
              }
            : c
        )
      );
    } else {
      setCustos((prev) => [
        ...prev,
        {
          id: `custo-maq-${Date.now()}`,
          tipo: 'Taxa de Pagamento',
          descricao: `Taxa Maquininha (${taxasDiretor.taxaMaquininhaPercent}%)`,
          valor: calc,
        },
      ]);
    }
  };

  const handleSalvarCustos = async () => {
    if (!isDirector) {
      setErrorMessage('Apenas o Diretor Éder Perez tem permissão para salvar custos.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      const res = await atualizarCustosCompletosVenda(venda.id, custos, currentUserName);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Erro ao atualizar custos.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao persistir custos no Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // Bloqueio se não for o Diretor Éder Perez
  if (!isDirector) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center space-y-4 border border-rose-200 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Acesso Restrito à Diretoria</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Somente o Diretor <strong>Éder Perez</strong> possui autorização para editar, adicionar ou excluir custos de pedidos.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-[#0B2046] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Editar Custos do Pedido {numPedido}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Exclusivo Diretor
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Cliente: {venda.cliente} • Faturamento: {formatBRL(valorVenda)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Card de Recálculo Imediato */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Custo Total
              </span>
              <span className="text-lg font-black text-rose-400">{formatBRL(custoTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Lucro Líquido
              </span>
              <span className="text-lg font-black text-emerald-400">{formatBRL(lucro)}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Margem Líquida
              </span>
              <span className="text-lg font-black text-purple-400">{margem.toFixed(1)}%</span>
            </div>
          </div>

          {/* Atalhos Rápidos de Taxas da Diretoria */}
          {(taxasDiretor.taxaNotaFiscalPercent > 0 || taxasDiretor.taxaMaquininhaPercent > 0) && (
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-blue-900">
                Taxas oficiais cadastradas pelo Diretor:
              </span>
              <div className="flex items-center gap-2">
                {taxasDiretor.taxaNotaFiscalPercent > 0 && (
                  <button
                    type="button"
                    onClick={handleAplicarTaxaNF}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition"
                  >
                    NF ({taxasDiretor.taxaNotaFiscalPercent}%)
                  </button>
                )}
                {taxasDiretor.taxaMaquininhaPercent > 0 && (
                  <button
                    type="button"
                    onClick={handleAplicarTaxaMaquininha}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition"
                  >
                    Maquininha ({taxasDiretor.taxaMaquininhaPercent}%)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista de Custos Atuais */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itens de Custo do Pedido ({custos.length})
              </h4>
              <span className="text-xs text-slate-500">Alterações recalculam automaticamente</span>
            </div>

            {custos.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                Nenhum custo adicionado a este pedido. Utilize o formulário abaixo para incluir custos.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {custos.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                          {item.tipo}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {item.descricao || item.tipo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-28">
                        <span className="absolute left-2 top-2 text-xs text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.valor || ''}
                          onChange={(e) =>
                            handleAlterarValor(item.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverCusto(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Excluir custo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário: Adicionar Novo Custo */}
          <form
            onSubmit={handleAdicionarCusto}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
          >
            <span className="text-xs font-bold text-slate-800 block">
              Adicionar Novo Custo
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Tipo de Custo
                </label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as TipoCustoVenda)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                >
                  {TIPOS_CUSTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Embalagem / Frete terceirizado"
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Valor (R$)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Inserir
                  </button>
                </div>
              </div>
            </div>
          </form>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvarCustos}
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Salvando no Supabase...' : 'Salvar e Recalcular Custos'}
          </button>
        </div>
      </div>
    </div>
  );
};
