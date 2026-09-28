import React, { useState } from 'react';
import {
  Users,
  Percent,
  Lock,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import {
  ComissaoResponsavelConfig,
  saveComissoesConfig,
} from '../../utils/costsConfigService';

interface CustosComissoesTabProps {
  comissoes: ComissaoResponsavelConfig[];
  setComissoes: React.Dispatch<React.SetStateAction<ComissaoResponsavelConfig[]>>;
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosComissoesTab: React.FC<CustosComissoesTabProps> = ({
  comissoes,
  setComissoes,
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [localComissoes, setLocalComissoes] = useState<ComissaoResponsavelConfig[]>(comissoes);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePercentChange = (id: string, valStr: string) => {
    const clean = valStr.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    setLocalComissoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, comissaoPadraoPercent: isNaN(num) ? 0 : num } : c))
    );
  };

  const handleBaseChange = (id: string, base: 'Bruto' | 'Líquido') => {
    setLocalComissoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, tipoBase: base } : c))
    );
  };

  const handleToggleReducao = (id: string) => {
    setLocalComissoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, reduzirPorDesconto: !c.reduzirPorDesconto } : c))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setErrorMsg('Somente o Diretor Geral Éder Perez pode alterar as comissões de equipe.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const res = await saveComissoesConfig(localComissoes, currentUserName);
      if (res.success) {
        setComissoes(localComissoes);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (showToast) showToast('Comissões de equipe atualizadas no Supabase!', 'success');
      } else {
        setErrorMsg(res.error || 'Erro ao salvar no Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao persistir comissões.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Comissões por Responsável
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-100">
              Cálculo Individual por Vendedor
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure a alíquota percentual de comissão individual aplicada nas vendas de cada
            membro da equipe Fênix World.
          </p>
        </div>

        <div>
          {!isDirector && (
            <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Somente Diretor Éder pode editar
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid de Cards de Responsáveis */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localComissoes.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <UserAvatar userName={c.nome} size="md" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.nome}</h3>
                    <div className="text-xs text-slate-500">{c.cargo}</div>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {c.observacao || 'Equipe Fênix'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comissão Padrão (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isDirector}
                      value={c.comissaoPadraoPercent.toString().replace('.', ',')}
                      onChange={(e) => handlePercentChange(c.id, e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60 text-center"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Base de Cálculo
                  </label>
                  <select
                    disabled={!isDirector}
                    value={c.tipoBase}
                    onChange={(e) => handleBaseChange(c.id, e.target.value as 'Bruto' | 'Líquido')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden cursor-pointer disabled:opacity-60"
                  >
                    <option value="Bruto">Valor Faturado (Bruto)</option>
                    <option value="Líquido">Lucro Líquido</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isDirector}
                    checked={c.reduzirPorDesconto}
                    onChange={() => handleToggleReducao(c.id)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-60"
                  />
                  <span>Reduzir comissão proporcionalmente em caso de desconto comercial</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {isDirector && (
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Valores oficiais aplicados automaticamente no cálculo de novos pedidos.</span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                'Salvando...'
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> Salvo com Sucesso!
                </>
              ) : (
                'Salvar Comissões da Equipe'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
