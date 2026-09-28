import React, { useState } from 'react';
import { X, Mail, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-[28px] p-7 sm:p-9 shadow-2xl border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              Recuperar Acesso
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Informe seu e-mail corporativo para receber as instruções de redefinição de senha do SISTEMA FÊNIX WORLD.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="h-14 rounded-2xl border border-slate-200 flex items-center px-4 bg-slate-50/50 focus-within:border-[#0057ff] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0057ff]/10 transition-all">
                <Mail className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@fenixworld.com"
                  className="w-full bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full h-13 rounded-full bg-gradient-to-r from-[#0052ff] to-[#0070f3] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                <span>Enviar Instruções</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-[#0057ff] mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-900">E-mail Enviado!</h3>
            <p className="text-sm text-slate-500 mt-2">
              Se o endereço existir no sistema corporativo, você receberá um link seguro para cadastrar uma nova senha.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
                onClose();
              }}
              className="mt-6 w-full h-12 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
