import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  X,
  Minimize2,
  Maximize2,
  Check,
  CheckCheck,
  Search,
  ArrowLeft,
  Smile,
  Circle,
  Clock,
  ShieldCheck,
  Plus,
  Lock,
  UserPlus,
  Paperclip,
  FileText,
  Download,
  Trash2,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import { ChatMessage, ConversationSummary } from '../../types/chat';
import {
  TEAM_MEMBERS,
  normalizeChatUserName,
  getChatDisplayName,
  getConversationsForUser,
  getMessagesForConversation,
  sendChatMessage,
  deleteChatMessage,
  deleteMultipleChatMessages,
  ChatAttachment,
  markConversationAsRead,
  isUserOnline,
  getAvailableUsersForNewConversation,
  getDirectConversationId,
  isUserParticipant,
} from '../../utils/chatService';
import { UserAvatar } from '../UserAvatar';
import { playNotificationSound } from '../../utils/soundAlerts';
import { playUserCustomSound, playUserCustomSoundForCategory } from '../../utils/userNotificationPreferences';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Frequentes & Trabalho',
    emojis: ['👍', '👏', '✅', '🤝', '🎯', '🔥', '💪', '🙏', '💼', '📊', '📈', '📅', '📌', '🚀', '💡', '⭐', '🏆', '🎉'],
  },
  {
    name: 'Expressões',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😎', '🧐', '🤔', '🤐', '😐', '😏', '😮', '😴'],
  },
  {
    name: 'Gestos',
    emojis: ['👋', '🙌', '👐', '🤲', '👌', '✌️', '🤞', '🤙', '👈', '👉', '👆', '👇', '✋', '✍️', '💯', '✨', '⚡', '💥', '❤️', '💙', '👀'],
  },
  {
    name: 'Status & Ações',
    emojis: ['📁', '📄', '📝', '✉️', '📦', '🏷️', '⏰', '⏱️', '⏳', '🔔', '📢', '💬', '💭', '🔒', '⚠️', '❌', '🆗', '🆒'],
  },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  currentUserName,
  isMinimized,
  onToggleMinimize,
}) => {
  const [extraActiveIds, setExtraActiveIds] = useState<string[]>(() => {
    try {
      const s = sessionStorage.getItem(`fenix_chat_active_directs_${currentUserName}`);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('equipe');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

  // Estados de anexo, emoji picker e exclusão
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  // Estados do recurso "Selecionar mensagens"
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Fecha o seletor de emojis ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Carrega e atualiza conversas
  const refreshConversations = () => {
    const list = getConversationsForUser(currentUserName, extraActiveIds);
    setConversations(list);
  };

  // Carrega e atualiza mensagens da conversa ativa (com validação estrita de participante)
  const refreshMessages = () => {
    if (!selectedConvId) return;

    if (!isUserParticipant(selectedConvId, currentUserName)) {
      setSelectedConvId('equipe');
      return;
    }

    const msgs = getMessagesForConversation(selectedConvId, currentUserName);
    setMessages(msgs);
  };

  // Efeito de escuta de eventos do chat e presença
  useEffect(() => {
    refreshConversations();
    refreshMessages();

    const handleChatUpdated = () => {
      refreshConversations();
      refreshMessages();
    };

    const handlePresenceUpdated = () => {
      refreshConversations();
    };

    const handleMessageReceived = (e: any) => {
      refreshConversations();
      refreshMessages();
    };

    const handleMessageDeleted = () => {
      refreshConversations();
      refreshMessages();
    };

    const handleMessagesBulkDeleted = () => {
      refreshConversations();
      refreshMessages();
    };

    const handleSelectConversation = (e: any) => {
      const convId = e?.detail?.conversationId;
      if (convId) {
        setExtraActiveIds((prev) => {
          if (!prev.includes(convId)) {
            const next = [...prev, convId];
            try {
              sessionStorage.setItem(`fenix_chat_active_directs_${currentUserName}`, JSON.stringify(next));
            } catch {}
            return next;
          }
          return prev;
        });
        setSelectedConvId(convId);
      }
    };

    window.addEventListener('fenix_chat_updated', handleChatUpdated);
    window.addEventListener('fenix_presence_updated', handlePresenceUpdated);
    window.addEventListener('fenix_chat_message_received', handleMessageReceived);
    window.addEventListener('fenix_chat_message_deleted', handleMessageDeleted);
    window.addEventListener('fenix_chat_messages_deleted', handleMessagesBulkDeleted);
    window.addEventListener('fenix_select_chat_conversation', handleSelectConversation);

    return () => {
      window.removeEventListener('fenix_chat_updated', handleChatUpdated);
      window.removeEventListener('fenix_presence_updated', handlePresenceUpdated);
      window.removeEventListener('fenix_chat_message_received', handleMessageReceived);
      window.removeEventListener('fenix_chat_message_deleted', handleMessageDeleted);
      window.removeEventListener('fenix_chat_messages_deleted', handleMessagesBulkDeleted);
      window.removeEventListener('fenix_select_chat_conversation', handleSelectConversation);
    };
  }, [currentUserName, selectedConvId, extraActiveIds]);

  // Rola para a mensagem mais recente
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, selectedConvId]);

  // Conversa ativa selecionada
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0];
  }, [conversations, selectedConvId]);

  // Filtragem de conversas
  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return conversations;
    const q = searchFilter.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    );
  }, [conversations, searchFilter]);

  // Usuários disponíveis para nova conversa
  const availableUsersForNewChat = useMemo(() => {
    const list = getAvailableUsersForNewConversation(currentUserName);
    if (!newChatSearch.trim()) return list;
    const q = newChatSearch.toLowerCase();
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.cargo.toLowerCase().includes(q)
    );
  }, [currentUserName, newChatSearch]);

  // Iniciar nova conversa com usuário selecionado
  const handleStartConversationWithUser = (targetCanonicalName: string) => {
    const directId = getDirectConversationId(currentUserName, targetCanonicalName);
    if (!extraActiveIds.includes(directId)) {
      const updated = [...extraActiveIds, directId];
      setExtraActiveIds(updated);
      try {
        sessionStorage.setItem(
          `fenix_chat_active_directs_${currentUserName}`,
          JSON.stringify(updated)
        );
      } catch {}
    }
    setSelectedConvId(directId);
    setIsNewChatModalOpen(false);
    setNewChatSearch('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Seleção e upload de arquivo/imagem
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('O arquivo selecionado excede o limite máximo de 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImg = file.type.startsWith('image/');
      setSelectedAttachment({
        fileUrl: dataUrl,
        fileName: file.name,
        fileType: isImg ? 'image' : 'file',
        fileSize: file.size,
      });
      setIsUploading(false);
      inputRef.current?.focus();
    };
    reader.onerror = () => {
      console.error('Erro ao ler o arquivo selecionado.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Inserção direta de emoji no campo de texto
  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Excluir mensagem do próprio usuário com confirmação
  const handleConfirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    setIsDeletingMessage(true);
    try {
      await deleteChatMessage(messageToDelete.id, currentUserName);
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
      refreshConversations();
      setMessageToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir mensagem:', err);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  // Funções do recurso "Selecionar mensagens"
  const handleToggleSelectAll = () => {
    if (selectedMessageIds.length === messages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(messages.map((m) => m.id));
    }
  };

  const handleToggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setIsConfirmBulkDeleteOpen(false);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedMessageIds.length === 0 || !activeConversation) return;

    // Garante que o usuário só possa excluir mensagens das conversas às quais possui acesso
    if (!isUserParticipant(activeConversation.id, currentUserName)) {
      alert('Acesso negado: você só pode gerenciar mensagens das conversas às quais possui acesso.');
      setIsConfirmBulkDeleteOpen(false);
      setIsSelectionMode(false);
      setSelectedMessageIds([]);
      return;
    }

    setIsDeletingBulk(true);
    try {
      await deleteMultipleChatMessages(selectedMessageIds, activeConversation.id, currentUserName);
      // Atualização imediata do estado local
      const deletedIds = new Set(selectedMessageIds);
      setMessages((prev) => prev.filter((m) => !deletedIds.has(m.id)));
      setSelectedMessageIds([]);
      setIsSelectionMode(false);
      setIsConfirmBulkDeleteOpen(false);
      refreshConversations();
      refreshMessages();
    } catch (err: any) {
      console.error('Erro ao excluir mensagens selecionadas:', err);
      alert(err?.message || 'Erro ao excluir mensagens selecionadas. Tente novamente.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Enviar mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedAttachment) || isSending || !activeConversation) return;

    const textToSend = inputText.trim();
    const attachmentToSend = selectedAttachment;

    setInputText('');
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowEmojiPicker(false);
    setIsSending(true);

    try {
      const recipientName = activeConversation.type === 'direct' ? activeConversation.title : undefined;
      await sendChatMessage(
        activeConversation.id,
        currentUserName,
        textToSend,
        recipientName,
        attachmentToSend || undefined
      );
      refreshMessages();
      refreshConversations();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // Se não estiver aberto, não renderiza nada
  if (!isOpen) return null;

  // Total não lido
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  // Se minimizado, mostra barra flutuante compacta
  if (isMinimized) {
    return (
      <div
        id="fenix-chat-minimized-pill"
        onClick={onToggleMinimize}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3 bg-[#0B2046] hover:bg-[#081836] text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/20 cursor-pointer transition-all hover:scale-105 active:scale-95 group animate-in fade-in slide-in-from-bottom-3"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0B2046]">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold leading-tight">Chat Fênix World</span>
          <span className="text-[10px] text-slate-300">
            {totalUnread > 0 ? `${totalUnread} nova(s) mensagem(ns)` : 'Clique para expandir'}
          </span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-1" />
      </div>
    );
  }

  // Formatação de data/hora
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateDivider = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hoje';
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  // Cores de avatar para cada usuário
  const getUserColor = (name: string) => {
    const norm = normalizeChatUserName(name);
    if (norm === 'Eder Perez') return 'bg-emerald-600 text-white';
    if (norm === 'Vanessa Gomes') return 'bg-blue-600 text-white';
    if (norm === 'Jhessica Camargo') return 'bg-purple-600 text-white';
    if (norm === 'Jeferson Trolesi') return 'bg-orange-600 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div
      id="fenix-chat-floating-panel"
      className="fixed bottom-2 right-2 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-16px)] sm:w-[560px] md:w-[740px] lg:w-[820px] h-[86vh] max-h-[660px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 text-slate-800"
      style={{ boxShadow: '0 25px 60px -15px rgba(11, 32, 70, 0.35)' }}
    >
      {/* Top Main Bar */}
      <div className="px-4 py-3 bg-[#0B2046] text-white flex items-center justify-between border-b border-white/10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-wide text-white">Chat Interno Fênix World</h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Tempo Real
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Conectado como <strong className="text-white">{getChatDisplayName(currentUserName)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Minimizar Chat"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Fechar Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body: Grid 2 colunas em desktop, view alternada em mobile */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50 relative">
        {/* ============================================================
            MODAL / POPOVER: "+ NOVA CONVERSA" PRIVADA
           ============================================================ */}
        {isNewChatModalOpen && (
          <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              {/* Header do modal */}
              <div className="px-4 py-3.5 bg-[#0B2046] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-300">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm leading-tight text-white">Nova Conversa Privada</h4>
                    <p className="text-[10px] text-slate-300">Selecione uma pessoa da equipe</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Campo de filtro */}
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    placeholder="Filtrar por nome ou cargo..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de usuários disponíveis */}
              <div className="p-2 space-y-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                {availableUsersForNewChat.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  availableUsersForNewChat.map((user) => {
                    const online = isUserOnline(user.canonical, currentUserName);
                    return (
                      <button
                        key={user.canonical}
                        type="button"
                        onClick={() => handleStartConversationWithUser(user.canonical)}
                        className="w-full p-2.5 rounded-xl hover:bg-blue-50/80 border border-transparent hover:border-blue-200 flex items-center justify-between transition-all cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${getUserColor(
                              user.name
                            )}`}
                          >
                            {user.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 group-hover:text-blue-900 truncate">
                              {user.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 truncate">{user.cargo}</p>
                          </div>
                        </div>

                        {/* Status visual explícito: ● Online ou ○ Offline */}
                        <div className="flex-shrink-0 ml-2">
                          {online ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              ● Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full border border-slate-400" />
                              ○ Offline
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Rodapé informativo */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Privado: somente os 2 terão acesso
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            COLUNA ESQUERDA: LISTA DE CONVERSAS (Equipe + Chats Privados)
           ============================================================ */}
        <div
          className={`w-full sm:w-[250px] md:w-[290px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 ${
            activeConversation && window.innerWidth < 640 ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Topo da lista: Botão "+ Nova conversa" e Busca */}
          <div className="p-3 border-b border-slate-100 flex flex-col gap-2.5 bg-slate-50/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Conversas
              </span>
              <button
                type="button"
                id="btn-nova-conversa-chat"
                onClick={() => setIsNewChatModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0052cc] hover:bg-[#0747a6] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-sm"
                title="Iniciar conversa privada com outro usuário"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nova conversa</span>
              </button>
            </div>

            {/* Busca interna de conversas */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-8 pr-3 py-1.5 bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Canais e Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar p-1.5 space-y-1">
            {filteredConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              const isGroup = conv.type === 'group';
              const targetStatus = conv.targetUser?.status;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    markConversationAsRead(conv.id, currentUserName);
                    setIsSelectionMode(false);
                    setSelectedMessageIds([]);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/90 text-slate-900 shadow-xs border border-blue-200/80'
                      : conv.unreadCount > 0
                      ? 'bg-blue-50/50 border-l-4 border-l-blue-600 hover:bg-blue-50/80 text-slate-900 shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {/* Avatar / Ícone */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    {isGroup ? (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B2046] to-[#1D4ED8] text-white flex items-center justify-center shadow-xs">
                        <Users className="w-4 h-4" />
                      </div>
                    ) : (
                      <UserAvatar userName={conv.title} size="sm" />
                    )}

                    {/* Bolinha Online/Offline para conversas individuais */}
                    {!isGroup && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          targetStatus === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={targetStatus}
                      />
                    )}
                  </div>

                  {/* Informações da conversa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-bold text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-950 font-black' : ''}`}>
                          {conv.title}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" title="Mensagens novas" />
                        )}
                      </div>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {/* Status ou subtítulo */}
                    {!isGroup && conv.targetUser && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[9px] font-bold ${
                            targetStatus === 'Online' ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {targetStatus === 'Online' ? '● Online' : '○ Offline'}
                        </span>
                        <span className="text-slate-300 text-[8px]">•</span>
                        <span className="text-[10px] text-slate-400 truncate">{conv.subtitle}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-[11px] text-slate-500 truncate">
                        {conv.lastMessage ? (
                          <>
                            {conv.type === 'group' && (
                              <span className="font-semibold text-slate-700">
                                {conv.lastMessage.senderName.split(' ')[0]}:{' '}
                              </span>
                            )}
                            {conv.lastMessage.text}
                          </>
                        ) : (
                          <span className="text-blue-500 text-[10px] font-medium italic">Conversa iniciada</span>
                        )}
                      </p>

                      {/* Contador de não lidas com destaque */}
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-[20px] px-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rodapé da Coluna Esquerda com Informações de Segurança */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Chat Seguro e Privado
            </span>
            <span className="text-slate-400">4 Membros</span>
          </div>
        </div>

        {/* ============================================================
            COLUNA DIREITA: CONVERSA ATIVA & ÁREA DE MENSAGENS
           ============================================================ */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {activeConversation ? (
            <>
              {/* Header da conversa ativa */}
              <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Botão voltar no mobile */}
                  <button
                    type="button"
                    onClick={() => setSelectedConvId('')}
                    className="sm:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Avatar do cabeçalho da conversa */}
                  <div className="relative flex-shrink-0">
                    {activeConversation.type === 'group' ? (
                      <div className="w-8 h-8 rounded-xl bg-[#0B2046] text-white flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    ) : (
                      <UserAvatar userName={activeConversation.title} size="sm" />
                    )}
                    {activeConversation.type === 'direct' && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          activeConversation.targetUser?.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {activeConversation.title}
                      </h4>
                      {activeConversation.type === 'direct' && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            activeConversation.targetUser?.status === 'Online'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {activeConversation.targetUser?.status === 'Online' ? '● Online' : '○ Offline'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {activeConversation.type === 'group'
                        ? 'Éder Perez, Vanessa Gomes, Jhessica Camargo, Jeferson Trolesi'
                        : `${activeConversation.targetUser?.cargo || ''} • Conversa 100% privada`}
                    </p>
                  </div>
                </div>

                {/* Controles do modo "Selecionar mensagens" */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isSelectionMode ? (
                    <div className="flex items-center gap-2">
                      {/* Botão Selecionar todas */}
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        title={
                          selectedMessageIds.length === messages.length && messages.length > 0
                            ? 'Desmarcar todas as mensagens'
                            : 'Selecionar todas as mensagens da conversa'
                        }
                      >
                        <CheckSquare
                          className={`w-3.5 h-3.5 ${
                            selectedMessageIds.length === messages.length && messages.length > 0
                              ? 'text-[#0052cc]'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="hidden sm:inline">
                          {selectedMessageIds.length === messages.length && messages.length > 0
                            ? 'Desmarcar todas'
                            : 'Selecionar todas'}
                        </span>
                        <span className="sm:hidden">Todas</span>
                      </button>

                      {/* Contador de selecionadas */}
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                        {selectedMessageIds.length}{' '}
                        <span className="hidden sm:inline">
                          {selectedMessageIds.length === 1 ? 'selecionada' : 'selecionadas'}
                        </span>
                      </span>

                      {/* Botão Cancelar */}
                      <button
                        type="button"
                        onClick={handleCancelSelection}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      {/* Botão Excluir */}
                      <button
                        type="button"
                        disabled={selectedMessageIds.length === 0}
                        onClick={() => setIsConfirmBulkDeleteOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                        title="Excluir mensagens selecionadas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ) : (
                    messages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectionMode(true);
                          setSelectedMessageIds([]);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        title="Selecionar mensagens para gerenciar"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Selecionar mensagens</span>
                        <span className="sm:hidden">Selecionar</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Barra informativa no topo quando em modo de seleção no mobile */}
              {isSelectionMode && (
                <div className="sm:hidden px-4 py-2 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
                  <span>Toque nas mensagens para selecionar</span>
                  <span className="font-bold">{selectedMessageIds.length} marcada(s)</span>
                </div>
              )}

              {/* Banner de mensagens não lidas nesta conversa */}
              {activeConversation && activeConversation.unreadCount > 0 && (
                <div className="px-4 py-2 bg-rose-50 border-b border-rose-200/80 flex items-center justify-between text-xs text-rose-950 flex-shrink-0 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                    <span className="font-semibold">
                      Você tem <strong>{activeConversation.unreadCount}</strong> {activeConversation.unreadCount === 1 ? 'mensagem nova não lida' : 'mensagens novas não lidas'}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => markConversationAsRead(activeConversation.id, currentUserName)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-all cursor-pointer"
                  >
                    Marcar como lida
                  </button>
                </div>
              )}

              {/* Área com rolagem de mensagens */}
              <div
                onClick={() => {
                  if (activeConversation && activeConversation.unreadCount > 0) {
                    markConversationAsRead(activeConversation.id, currentUserName);
                  }
                }}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] custom-scrollbar"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-xs text-slate-400">
                      <MessageSquare className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {activeConversation.type === 'direct'
                        ? `Inicie sua conversa privada com ${activeConversation.title}`
                        : 'Nenhuma mensagem nesta conversa ainda'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                      {activeConversation.type === 'direct'
                        ? 'Somente você e esta pessoa têm acesso a essas mensagens.'
                        : 'Envie uma mensagem abaixo para iniciar o diálogo em tempo real.'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const normSender = normalizeChatUserName(msg.senderName);
                    const normCurrent = normalizeChatUserName(currentUserName);
                    const isMe = normSender === normCurrent;

                    // Exibir divisor de data se mudou de dia
                    const prevMsg = messages[index - 1];
                    const showDateDivider =
                      !prevMsg ||
                      new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                    // Status de leitura
                    const isRead =
                      msg.readBy &&
                      msg.readBy.filter((u) => normalizeChatUserName(u) !== normSender).length > 0;

                    const isSelected = selectedMessageIds.includes(msg.id);

                    return (
                      <React.Fragment key={msg.id || `msg-${index}`}>
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-2">
                            <span className="bg-white/80 border border-slate-200 px-3 py-0.5 rounded-full text-[10px] font-bold text-slate-500 shadow-2xs">
                              {formatDateDivider(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex items-center gap-2.5 ${
                            isMe ? 'justify-end' : 'justify-start'
                          } ${isSelectionMode ? 'cursor-pointer select-none group/select-row' : ''}`}
                          onClick={isSelectionMode ? () => handleToggleMessageSelection(msg.id) : undefined}
                        >
                          {/* Checkbox quando em modo de seleção */}
                          {isSelectionMode && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMessageSelection(msg.id);
                              }}
                              className={`order-first flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0052cc] border-[#0052cc] text-white shadow-xs'
                                  : 'bg-white border-slate-300 hover:border-[#0052cc] text-transparent'
                              }`}
                              title={isSelected ? 'Desmarcar mensagem' : 'Selecionar mensagem'}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}

                          {/* Avatar do remetente (apenas se não for eu) */}
                          {!isMe && (
                            <div className="flex-shrink-0 self-end mb-1">
                              <UserAvatar userName={msg.senderName} size="xs" title={msg.senderName} />
                            </div>
                          )}

                          {/* Balão de Mensagem */}
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs relative transition-all group/msg ${
                              isSelected ? 'ring-2 ring-[#0052cc] ring-offset-2 shadow-md' : ''
                            } ${
                              isMe
                                ? 'bg-[#0052cc] text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                            }`}
                          >
                            {/* Nome do remetente em conversas em grupo */}
                            {!isMe && activeConversation.type === 'group' && (
                              <p className="text-[10px] font-extrabold text-[#0B2046] mb-1">
                                {msg.senderName}
                              </p>
                            )}

                            {/* Anexo de Imagem */}
                            {msg.fileUrl && msg.fileType === 'image' && (
                              <div className="mb-2 overflow-hidden rounded-xl border border-black/10 max-w-xs">
                                <img
                                  src={msg.fileUrl}
                                  alt={msg.fileName || 'Imagem anexada'}
                                  className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => window.open(msg.fileUrl, '_blank')}
                                />
                              </div>
                            )}

                            {/* Anexo de Arquivo/Documento */}
                            {msg.fileUrl && msg.fileType !== 'image' && (
                              <a
                                href={msg.fileUrl}
                                download={msg.fileName || 'anexo'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 p-2.5 mb-2 rounded-xl border transition-colors ${
                                  isMe
                                    ? 'bg-blue-600/70 hover:bg-blue-600 text-white border-blue-400/40'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                <FileText className={`w-5 h-5 shrink-0 ${isMe ? 'text-blue-200' : 'text-blue-600'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{msg.fileName || 'Documento'}</p>
                                  {msg.fileSize && (
                                    <p className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                      {(msg.fileSize / 1024).toFixed(1)} KB
                                    </p>
                                  )}
                                </div>
                                <Download className="w-4 h-4 shrink-0 opacity-75 hover:opacity-100" />
                              </a>
                            )}

                            {/* Conteúdo do texto */}
                            {msg.text && (
                              <p className="text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                                {msg.text}
                              </p>
                            )}

                            {/* Rodapé com Horário, Status de Leitura e Botão de Excluir */}
                            <div
                              className={`flex items-center justify-end gap-1.5 mt-1.5 text-[9px] ${
                                isMe ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {/* Botão de Excluir (somente para mensagens do próprio usuário) */}
                              {isMe && (
                                <button
                                  type="button"
                                  onClick={() => setMessageToDelete(msg)}
                                  className="opacity-70 hover:opacity-100 hover:text-rose-200 p-0.5 rounded transition-all cursor-pointer"
                                  title="Excluir minha mensagem"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}

                              <span>{formatTime(msg.createdAt)}</span>
                              {isMe && (
                                <span title={isRead ? 'Lida' : 'Enviada'}>
                                  {isRead ? (
                                    <CheckCheck className="w-3 h-3 text-cyan-300 stroke-[2.5]" />
                                  ) : (
                                    <Check className="w-3 h-3 text-blue-200" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Preview de Anexo Selecionado */}
              {selectedAttachment && (
                <div className="px-3.5 py-2 bg-blue-50/90 border-t border-blue-100 flex items-center justify-between text-xs text-blue-950 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedAttachment.fileType === 'image' ? (
                      <img
                        src={selectedAttachment.fileUrl}
                        alt="preview"
                        className="w-8 h-8 object-cover rounded-lg border border-blue-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-semibold text-xs truncate max-w-[200px] sm:max-w-xs text-blue-900">
                        {selectedAttachment.fileName}
                      </p>
                      {selectedAttachment.fileSize && (
                        <p className="text-[10px] text-blue-600">
                          {(selectedAttachment.fileSize / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded-lg text-blue-400 hover:text-rose-600 hover:bg-blue-100/50 transition-colors cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Campo de Envio de Mensagem com Anexo e Emojis embutidos */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 relative"
              >
                {/* Input de Arquivo oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Botão de Anexo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-9 h-9 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Anexar imagem ou arquivo"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>

                {/* Campo de Texto com Seletor de Emojis dentro */}
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef as any}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => {
                      if (activeConversation && activeConversation.unreadCount > 0) {
                        markConversationAsRead(activeConversation.id, currentUserName);
                      }
                    }}
                    placeholder={`Escreva uma mensagem para ${activeConversation.title}...`}
                    className="w-full pl-3.5 pr-9 py-2.5 bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  {/* Seletor de Emojis embutido */}
                  <div className="absolute right-2" ref={emojiPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-slate-200/50 transition-colors cursor-pointer"
                      title="Inserir emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-700">Seletor de Emojis</span>
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-3 pr-1 text-xs">
                          {EMOJI_CATEGORIES.map((cat) => (
                            <div key={cat.name}>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {cat.name}
                              </p>
                              <div className="grid grid-cols-7 gap-1">
                                {cat.emojis.map((em) => (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => handleInsertEmoji(em)}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm transition-colors cursor-pointer"
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !selectedAttachment) || isSending}
                  className="h-10 px-4 rounded-xl bg-[#0052cc] hover:bg-[#0747a6] disabled:opacity-40 disabled:hover:bg-[#0052cc] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Selecione uma conversa ao lado para começar.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Mensagem Individual */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Excluir Mensagem</h3>
                <p className="text-[11px] text-slate-500">Sincronização permanente no banco</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Tem certeza que deseja excluir esta mensagem? Ela será removida da conversa e sincronizada no banco de dados.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingMessage}
                onClick={() => setMessageToDelete(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingMessage}
                onClick={handleConfirmDeleteMessage}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingMessage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Massa (Selecionar mensagens) */}
      {isConfirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Excluir Mensagens Selecionadas</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedMessageIds.length} {selectedMessageIds.length === 1 ? 'mensagem selecionada' : 'mensagens selecionadas'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Tem certeza que deseja apagar as <strong>{selectedMessageIds.length}</strong> mensagens selecionadas desta conversa? Elas serão excluídas permanentemente do chat e do banco de dados para todos os participantes.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingBulk ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo ({selectedMessageIds.length})...</span>
                  </>
                ) : (
                  <span>Sim, Excluir ({selectedMessageIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
