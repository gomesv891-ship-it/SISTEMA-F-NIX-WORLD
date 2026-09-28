import React, { useState, useEffect, useMemo } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { FenixLogo } from './FenixLogo';
import { LoginFormState, FormErrors } from '../types';
import {
  validateLoginAttempt,
  validateLoginAttemptAsync,
  completeFirstLoginPasswordChange,
  completeFirstLoginPasswordChangeAsync,
  setCurrentAuthSession,
  getActiveAuthorizedUsers,
  AuthorizedUserName,
  UserAccount,
} from '../utils/auth';

interface LoginFormProps {
  onOpenForgotPassword: () => void;
  onLoginSuccess?: (username: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onOpenForgotPassword, onLoginSuccess }) => {
  const [formData, setFormData] = useState<LoginFormState>({
    username: '',
    password: '',
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Active authorized users only (com atualização dinâmica)
  const [activeUsers, setActiveUsers] = useState<UserAccount[]>(() => getActiveAuthorizedUsers());

  useEffect(() => {
    const refreshUsers = () => {
      setActiveUsers(getActiveAuthorizedUsers());
    };
    refreshUsers();
    window.addEventListener('fenix_auth_updated', refreshUsers);
    window.addEventListener('storage', refreshUsers);
    return () => {
      window.removeEventListener('fenix_auth_updated', refreshUsers);
      window.removeEventListener('storage', refreshUsers);
    };
  }, []);

  // State for mandatory first-login password change
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [targetUser, setTargetUser] = useState<AuthorizedUserName | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!formData.username.trim() || !formData.password) {
      setErrors({ general: 'Usuário e/ou senha incorretos.' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await validateLoginAttemptAsync(formData.username, formData.password);

      if (!result.success) {
        setIsLoading(false);
        setErrors({ general: result.error || 'Usuário e/ou senha incorretos.' });
        return;
      }

      if (result.requiresPasswordChange && result.user) {
        setIsLoading(false);
        setTargetUser(result.user.name);
        setIsChangingPassword(true);
        setPasswordChangeError(null);
        return;
      }

      // Normal login success
      if (result.user) {
        try {
          if (formData.rememberMe) {
            localStorage.setItem('fenix_saved_username', result.user.name);
          } else {
            localStorage.removeItem('fenix_saved_username');
          }
        } catch {
          // ignore
        }
        setCurrentAuthSession(result.user.name);
        setAuthSuccess(true);
        setIsLoading(false);
        if (onLoginSuccess) {
          setTimeout(() => {
            onLoginSuccess(result.user!.name);
          }, 300);
        }
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
      setErrors({ general: 'Não foi possível conectar ao banco de dados. Tente novamente.' });
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);

    if (!newPassword.trim()) {
      setPasswordChangeError('Digite a nova senha.');
      return;
    }
    if (newPassword.trim() === '1234') {
      setPasswordChangeError('A nova senha deve ser diferente da senha provisória inicial 1234.');
      return;
    }
    if (newPassword.trim().length < 4) {
      setPasswordChangeError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('A confirmação de senha não confere. Digite a mesma senha nos dois campos.');
      return;
    }

    if (!targetUser) return;

    setIsLoading(true);
    try {
      const res = await completeFirstLoginPasswordChangeAsync(targetUser, newPassword);
      if (!res.success) {
        setIsLoading(false);
        setPasswordChangeError(res.error || 'Não foi possível salvar. Verifique sua conexão e tente novamente.');
        return;
      }

      try {
        if (formData.rememberMe) {
          localStorage.setItem('fenix_saved_username', targetUser);
        }
      } catch {
        // ignore
      }

      setAuthSuccess(true);
      setIsLoading(false);
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess(targetUser);
        }, 400);
      }
    } catch {
      setIsLoading(false);
      setPasswordChangeError('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    }
  };

  // =========================================================
  // VIEW: MANDATORY FIRST LOGIN PASSWORD CHANGE
  // =========================================================
  if (isChangingPassword && targetUser) {
    return (
      <div className="w-full max-w-[500px] bg-white/98 sm:bg-white rounded-[32px] sm:rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] border border-white/60 relative backdrop-blur-md sm:backdrop-blur-none">
        {/* Logotipo Oficial Fênix World integrado elegantemente ao card */}
        <div className="mb-6 sm:mb-7 flex items-center justify-start">
          <FenixLogo size="lg" />
        </div>

        {/* Title & Subtitle */}
        <div className="text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0057ff] text-xs font-bold mb-3">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Primeiro Acesso ao Sistema</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-[#0a192f] tracking-tight leading-tight">
            Criar Nova Senha
          </h1>
          <p className="text-[14px] sm:text-[15px] text-slate-500 font-normal mt-2 leading-relaxed">
            Olá, <strong className="text-slate-800">{targetUser}</strong>! Como este é seu primeiro login com a senha provisória (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">1234</code>), cadastre agora sua nova senha de uso pessoal.
          </p>
        </div>

        {/* Success Alert */}
        {authSuccess && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-sm animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Nova senha cadastrada com sucesso!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Entrando no SISTEMA FÊNIX WORLD...
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {passwordChangeError && (
          <div className="mt-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{passwordChangeError}</span>
          </div>
        )}

        {/* Password Change Form */}
        <form onSubmit={handleSaveNewPassword} className="mt-6 space-y-4">
          {/* New Password input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 ml-1">Nova Senha</label>
            <div className="h-14 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10 flex items-center px-4 transition-all">
              <Lock className="w-5 h-5 text-slate-600 mr-3 flex-shrink-0 stroke-[1.8]" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordChangeError(null);
                }}
                placeholder="Digite sua nova senha"
                className="w-full bg-transparent text-slate-900 text-[15px] font-normal placeholder:text-slate-400 outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Ver nova senha"
              >
                {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 ml-1">Confirmar Nova Senha</label>
            <div className="h-14 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10 flex items-center px-4 transition-all">
              <ShieldCheck className="w-5 h-5 text-slate-600 mr-3 flex-shrink-0 stroke-[1.8]" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordChangeError(null);
                }}
                placeholder="Repita a nova senha para confirmar"
                className="w-full bg-transparent text-slate-900 text-[15px] font-normal placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Ver confirmação de senha"
              >
                {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <div className="pt-3 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-full bg-gradient-to-r from-[#0047fa] to-[#0070ff] hover:from-[#003edc] hover:to-[#0062f0] active:scale-[0.99] text-white font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-85"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha e Entrar</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.2]" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsChangingPassword(false);
                setPasswordChangeError(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer"
            >
              Cancelar e voltar
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px bg-slate-200 flex-1 max-w-[50px]"></div>
          <p className="text-[12px] text-slate-400 font-normal text-center">
            Acesso exclusivo Fênix World
          </p>
          <div className="h-px bg-slate-200 flex-1 max-w-[50px]"></div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW: REGULAR LOGIN FORM
  // =========================================================
  return (
    <div className="w-full max-w-[500px] bg-white/98 sm:bg-white rounded-[32px] sm:rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] border border-white/60 relative backdrop-blur-md sm:backdrop-blur-none">
      {/* Logotipo Oficial Fênix World integrado elegantemente ao card */}
      <div className="mb-6 sm:mb-7 flex items-center justify-start">
        <FenixLogo size="lg" />
      </div>

      {/* Title & Subtitle */}
      <div className="text-left">
        <h1 className="text-[32px] sm:text-[38px] font-extrabold text-[#0a192f] tracking-tight leading-tight">
          Bem-vinda(o)
        </h1>
        <p className="text-[16px] sm:text-[18px] text-slate-500 font-normal mt-1.5">
          Acesse seu sistema
        </p>
      </div>

      {/* Success Notification Alert */}
      {authSuccess && (
        <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-sm animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Credenciais validadas com sucesso!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Acessando o SISTEMA FÊNIX WORLD...
            </p>
          </div>
        </div>
      )}

      {/* General Error message */}
      {errors.general && (
        <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{errors.general}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-8 sm:mt-9 space-y-4 sm:space-y-4.5">
        {/* Username select dropdown */}
        <div>
          <div
            className="h-14 sm:h-15 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10 flex items-center px-4.5 transition-all"
          >
            <User className="w-5 h-5 text-slate-700 mr-3.5 flex-shrink-0 stroke-[1.8]" />
            <select
              id="login-username-select"
              value={formData.username}
              onChange={(e) => {
                setFormData({ ...formData, username: e.target.value });
                if (errors.general) setErrors({});
              }}
              className="w-full bg-transparent text-slate-900 text-[15px] sm:text-base font-medium outline-none cursor-pointer"
            >
              <option value="" disabled className="text-slate-400">
                Selecione o usuário...
              </option>
              {activeUsers.map((user) => (
                <option key={user.name} value={user.name} className="text-slate-900 font-medium">
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Password input */}
        <div>
          <div
            className="h-14 sm:h-15 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#0057ff] focus-within:ring-4 focus-within:ring-[#0057ff]/10 flex items-center px-4.5 transition-all"
          >
            <Lock className="w-5 h-5 text-slate-700 mr-3.5 flex-shrink-0 stroke-[1.8]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.general) setErrors({});
              }}
              placeholder="Digite sua senha"
              className="w-full bg-transparent text-slate-900 text-[15px] sm:text-base font-normal placeholder:text-slate-400 outline-none"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 stroke-[1.8]" />
              ) : (
                <Eye className="w-5 h-5 stroke-[1.8]" />
              )}
            </button>
          </div>
        </div>

        {/* Checkbox & Forgot Password Row */}
        <div className="pt-2 flex items-center justify-between text-sm">
          {/* Remember me checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                formData.rememberMe
                  ? 'bg-[#0057ff] text-white shadow-sm'
                  : 'border border-slate-300 bg-white group-hover:border-slate-400'
              }`}
            >
              {formData.rememberMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
            />
            <span className="text-[14px] text-slate-700 font-medium group-hover:text-slate-900">
              Lembrar meu login
            </span>
          </label>

          {/* Forgot Password link */}
          <button
            type="button"
            onClick={onOpenForgotPassword}
            className="text-[14px] text-[#0062ff] font-medium hover:underline cursor-pointer focus:outline-none focus:underline"
          >
            Esqueceu sua senha?
          </button>
        </div>

        {/* Primary Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 sm:h-15 rounded-full bg-gradient-to-r from-[#0047fa] to-[#0070ff] hover:from-[#003edc] hover:to-[#0062f0] active:scale-[0.99] text-white font-bold text-base sm:text-[17px] tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-85"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <span>ENTRAR</span>
                <ArrowRight className="w-5 h-5 stroke-[2.2]" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer message with divider */}
      <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3">
        <div className="h-px bg-slate-200 flex-1 max-w-[50px] sm:max-w-[70px]"></div>
        <p className="text-[12px] sm:text-[13px] text-slate-400 font-normal text-center whitespace-nowrap">
          Trabalhando juntos por grandes conquistas
        </p>
        <div className="h-px bg-slate-200 flex-1 max-w-[50px] sm:max-w-[70px]"></div>
      </div>
    </div>
  );
};
