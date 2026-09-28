import React, { useState, useEffect } from 'react';
import { X, Plus, Package, AlertCircle } from 'lucide-react';
import { EstoqueItem } from '../../types';
import { ProductCategory, ProductGroup } from '../../data/initialProductsSeed';
import {
  cadastrarItemEstoqueManual,
  fetchCategoriasFromDatabase,
  fetchGruposFromDatabase,
} from '../../utils/estoqueService';

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onSuccess: (novoItem?: EstoqueItem) => void;
}

export function NovoProdutoModal({
  isOpen,
  onClose,
  currentUserName,
  onSuccess,
}: NovoProdutoModalProps) {
  const [produto, setProduto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [grupo, setGrupo] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [estoqueAtual, setEstoqueAtual] = useState('0');
  const [estoqueMinimo, setEstoqueMinimo] = useState('10');
  const [observacoes, setObservacoes] = useState('');

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProduto('');
      setCodigo('');
      setCategoria('');
      setGrupo('');
      setUnidade('UN');
      setEstoqueAtual('0');
      setEstoqueMinimo('10');
      setObservacoes('');
      setError(null);

      // Carrega categorias e grupos disponíveis em Gerenciar Categorias
      Promise.all([fetchCategoriasFromDatabase(), fetchGruposFromDatabase()])
        .then(([cats, grps]) => {
          setCategories(cats);
          setGroups(grps);
          if (cats.length > 0) {
            setCategoria(cats[0].name);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto.trim()) {
      setError('Informe o nome do produto.');
      return;
    }

    if (!categoria.trim()) {
      setError('Selecione uma categoria para o produto.');
      return;
    }

    const estoqueAtualNum = parseFloat(estoqueAtual.replace(',', '.'));
    const estoqueMinimoNum = parseFloat(estoqueMinimo.replace(',', '.'));

    if (isNaN(estoqueAtualNum) || estoqueAtualNum < 0) {
      setError('Informe uma quantidade de estoque válida maior ou igual a zero.');
      return;
    }

    if (isNaN(estoqueMinimoNum) || estoqueMinimoNum < 0) {
      setError('Informe um estoque mínimo válido maior ou igual a zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await cadastrarItemEstoqueManual(
        {
          produto: produto.trim(),
          codigo: codigo.trim() || undefined,
          marca: 'Fênix',
          categoria: categoria.trim() || 'Geral',
          grupo: grupo.trim() || 'SEM GRUPO',
          unidade: unidade.trim() || 'UN',
          estoqueAtual: estoqueAtualNum,
          estoqueMinimo: estoqueMinimoNum,
          observacoes: observacoes.trim() || undefined,
        },
        currentUserName || 'Sistema Fênix'
      );

      if (!res.success) {
        setError(res.error || 'Erro ao cadastrar produto no estoque.');
        return;
      }

      onSuccess(res.item);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar cadastro do produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden my-6 transition-all">
        {/* Header Elegante */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/80 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2046] flex items-center justify-center border border-blue-100/60 shadow-2xs">
              <Package className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Novo Produto no Estoque</h2>
              <p className="text-xs text-slate-500">
                Cadastre um item no controle físico com controle de estoque e categoria.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome do Produto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              placeholder="Ex: Piso Vinílico Cola Carvalho 2mm"
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
          </div>

          {/* Código e Categoria (Dropdown) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Código <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: EST-001 (automático se vazio)"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-medium transition-all cursor-pointer"
              >
                <option value="" disabled>Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grupo e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Grupo <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-medium transition-all cursor-pointer"
              >
                <option value="">Sem grupo (padrão)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unidade de Medida
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-semibold transition-all cursor-pointer"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="M²">M² (Metro quadrado)</option>
                <option value="M">M (Metro linear)</option>
                <option value="KG">KG (Quilograma)</option>
                <option value="L">L (Litro)</option>
                <option value="CX">CX (Caixa)</option>
                <option value="PC">PC (Pacote)</option>
                <option value="KIT">KIT</option>
                <option value="ROLO">ROLO</option>
                <option value="SACO">SACO</option>
              </select>
            </div>
          </div>

          {/* Estoque Inicial e Estoque Mínimo */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Estoque Inicial Físico
              </label>
              <input
                type="text"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-blue-500 font-bold tabular-nums"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Saldo atual no galpão</span>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Estoque Mínimo (Alerta)
              </label>
              <input
                type="text"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-blue-500 font-bold tabular-nums"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Gatilho de reposição</span>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observações <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Localização no galpão, fornecedor, prateleira ou especificações técnicas..."
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none transition-all"
            />
          </div>

          {/* Rodapé e Ações */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0B2046] hover:bg-[#081836] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
