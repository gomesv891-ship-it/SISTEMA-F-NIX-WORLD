import React, { useState, useEffect } from 'react';
import { X, Check, ShieldAlert, Sparkles, UserCheck, Palette } from 'lucide-react';
import {
  COLOR_OPTIONS,
  UserAvatar,
  getColorOption,
} from './UserAvatar';
import {
  getStoredAccounts,
  getCurrentAuthUser,
  updateSelfProfile,
  UserAccount,
} from '../utils/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
  onProfileUpdated?: (updated: UserAccount) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUserName,
  onProfileUpdated,
}) => {
  const activeName = currentUserName || getCurrentAuthUser();
  const accounts = getStoredAccounts();
  const currentUser: UserAccount = accounts[activeName] || {
    name: activeName,
    id: 'user-default',
    email: '',
    cargo: 'Consultora Comercial',
    password: '1234',
    mustChangePassword: false,
    avatarInitials: activeName.slice(0, 2).toUpperCase(),
    active: true,
    avatarId: 'oficial',
    avatarColor: '#0066FF',
    displayName: activeName,
  };

  const defaultUserColor =
    currentUser.avatarColor ||
    (activeName.toLowerCase().includes('eder')
      ? '#10B981'
      : activeName.toLowerCase().includes('jhessica')
      ? '#8B5CF6'
      : activeName.toLowerCase().includes('jeferson')
      ? '#F97316'
      : '#0066FF');

  const [displayName, setDisplayName] = useState(currentUser.displayName || currentUser.name);
  const [cargo, setCargo] = useState(currentUser.cargo || 'Consultora Comercial');
  const [selectedColorHex, setSelectedColorHex] = useState(defaultUserColor);
  const [customColor, setCustomColor] = useState(defaultUserColor);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state whenever modal opens or active user changes
  useEffect(() => {
    if (isOpen) {
      const freshAccounts = getStoredAccounts();
      const user: UserAccount = freshAccounts[activeName] || accounts[activeName] || currentUser;
      const initialColor =
        user.avatarColor ||
        (activeName.toLowerCase().includes('eder')
          ? '#10B981'
          : activeName.toLowerCase().includes('jhessica')
          ? '#8B5CF6'
          : activeName.toLowerCase().includes('jeferson')
          ? '#F97316'
          : '#0066FF');

      setDisplayName(user.displayName || user.name);
      setCargo(user.cargo || 'Consultora Comercial');
      setSelectedColorHex(initialColor);
      setCustomColor(initialColor);
      setSaveSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, activeName]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      const result = await updateSelfProfile({
        displayName: displayName.trim(),
        cargo: cargo.trim(),
        avatarId: 'oficial',
        avatarColor: selectedColorHex,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Erro ao salvar alterações do perfil.');
        setSaving(false);
        return;
      }

      setSaveSuccess(true);
      if (onProfileUpdated && result.updatedUser) {
        onProfileUpdated(result.updatedUser);
      }

      setTimeout(() => {
        setSaving(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado ao salvar perfil.');
      setSaving(false);
    }
  };

  const selectedColor = getColorOption(selectedColorHex);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#071a52] to-[#0057ff] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Meu Perfil — Avatar Oficial
              </h2>
              <p className="text-xs text-blue-100/90 font-medium">
                Personalize a cor do seu avatar e os seus dados de identificação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário do Perfil */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {/* Alerta de Sucesso ou Erro */}
          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs sm:text-sm font-bold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Perfil salvo com sucesso no Supabase! Atualizando todo o sistema...</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-800 text-xs sm:text-sm font-bold animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pré-visualização do Avatar Oficial com a Cor Escolhida */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              <UserAvatar
                avatarColor={selectedColorHex}
                size="2xl"
                className="shadow-lg ring-4 ring-white"
              />
              <div
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-xs"
                style={{ backgroundColor: selectedColor.hex }}
                title={`Cor selecionada: ${selectedColor.name}`}
              >
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                  {displayName || 'Seu Nome'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-[#0057ff] border border-blue-200">
                  {cargo || 'Cargo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                E-mail de acesso: <span className="font-semibold text-slate-700">{currentUser.email || 'comercialfenix2620@gmail.com'}</span>
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedColor.hex }}
                  />
                  <span>Cor ativa: <strong>{selectedColor.name}</strong></span>
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  Avatar Oficial SISTEMA FÊNIX WORLD
                </span>
              </div>
            </div>
          </div>

          {/* Seção Central: ESCOLHA A COR DO AVATAR OFICIAL */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#0057ff]" />
                  <span>Escolha a cor do seu Avatar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  A silhueta é oficial e única para todos. Escolha a sua cor de identificação:
                </p>
              </div>
            </div>

            {/* Paleta de Cores Pré-definidas */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColorHex.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setSelectedColorHex(c.hex);
                      setCustomColor(c.hex);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0057ff] bg-white ring-2 ring-[#0057ff]/40 shadow-sm scale-105'
                        : 'border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-xs" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold text-center leading-tight truncate max-w-full ${
                        isSelected ? 'text-[#0057ff]' : 'text-slate-600'
                      }`}
                    >
                      {c.name.split('/')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Seletor de Cor Livre / Hex Personalizado */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                <span>Personalizar cor:</span>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setSelectedColorHex(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
              </label>
              <span className="font-mono text-slate-500 uppercase font-semibold">
                {selectedColorHex}
              </span>
              <span className="text-[11px] text-slate-400 ml-auto">
                Vinculada ao seu ID único
              </span>
            </div>
          </div>

          {/* Seção: Dados de Exibição (Nome e Cargo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
            {/* Nome de Exibição */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Nome de exibição</span>
                <span className="text-[10px] text-slate-400 font-normal">Como aparece no sistema</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Ex: Vanessa Gomes"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-medium focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
              />
            </div>

            {/* Cargo / Função Exibido */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Cargo / Função exibido</span>
                <span className="text-[10px] text-amber-600 font-semibold">Informativo</span>
              </label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ex: Consultora Comercial"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-medium focus:border-[#0057ff] focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
              />
            </div>
          </div>

          {/* Aviso Explícito de Escopo do Cargo */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Importante:</strong> O cargo/função exibido possui finalidade exclusivamente informativa e <strong>NÃO altera</strong> role, permissões ou nível de acesso às funcionalidades do sistema.
            </p>
          </div>

          {/* Botões de Ação no Rodapé */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0057ff] hover:bg-[#0047db] disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
