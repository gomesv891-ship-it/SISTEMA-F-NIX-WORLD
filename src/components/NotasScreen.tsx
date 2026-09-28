import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  StickyNote,
  Plus,
  Search,
  Filter,
  Pin,
  Heart,
  MoreVertical,
  Calendar,
  Users,
  User,
  Cloud,
  Check,
  X,
  Edit3,
  Trash2,
  Copy,
  CheckSquare,
  ChevronDown,
  Sparkles,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { NoteItem, NoteColor, NoteCategory, NoteChecklistItem } from '../types';
import { NoteRichTextEditor, convertMarkdownToHtml } from './NoteRichTextEditor';
import { UserAvatar } from './UserAvatar';
import { getActiveTeamUsers, getUserIdByName } from '../utils/auth';
import { areUsersEqualOrRelated } from '../utils/userDataFilter';
import { sendUserNotification } from '../utils/notifications';
import {
  saveItemToSupabase,
  deleteItemFromSupabase,
  pullDataFromSupabase,
  deduplicateListById,
} from '../utils/supabaseClient';

interface NotasScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const COLOR_MAP: Record<
  NoteColor,
  {
    name: string;
    bg: string;
    border: string;
    headerIconColor: string;
    badgeBg: string;
    badgeText: string;
    pickerClass: string;
  }
> = {
  amarelo: {
    name: 'Amarelo suave',
    bg: 'bg-amber-50',
    border: 'border-amber-100 hover:border-amber-200',
    headerIconColor: 'text-amber-600',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-700',
    pickerClass: 'bg-amber-200 border-amber-300',
  },
  azul: {
    name: 'Azul claro',
    bg: 'bg-blue-50',
    border: 'border-blue-100 hover:border-blue-200',
    headerIconColor: 'text-blue-600',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-700',
    pickerClass: 'bg-blue-200 border-blue-300',
  },
  rosa: {
    name: 'Rosa suave',
    bg: 'bg-rose-50',
    border: 'border-rose-100 hover:border-rose-200',
    headerIconColor: 'text-rose-600',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-700',
    pickerClass: 'bg-rose-200 border-rose-300',
  },
  verde: {
    name: 'Verde suave',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100 hover:border-emerald-200',
    headerIconColor: 'text-emerald-600',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-700',
    pickerClass: 'bg-emerald-200 border-emerald-300',
  },
  roxo: {
    name: 'Roxo suave',
    bg: 'bg-purple-50',
    border: 'border-purple-100 hover:border-purple-200',
    headerIconColor: 'text-purple-600',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-700',
    pickerClass: 'bg-purple-200 border-purple-300',
  },
  cinza: {
    name: 'Cinza neutro',
    bg: 'bg-slate-50',
    border: 'border-slate-200 hover:border-slate-300',
    headerIconColor: 'text-slate-600',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-700',
    pickerClass: 'bg-slate-300 border-slate-400',
  },
};

const CATEGORIES: NoteCategory[] = [
  'Geral',
  'Cliente',
  'Fornecedor',
  'Marketing',
  'Equipe',
  'Visita',
  'Metas',
  'Estoque',
];

const INITIAL_NOTES: NoteItem[] = [];

// Helper para ler notas locais (com suporte a migração de versões antigas)
function loadLocalNotes(): NoteItem[] {
  try {
    const stored = localStorage.getItem('fenix_notes_db');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return deduplicateListById(parsed, 'id');
      }
    }
    // Fallback de migração se existirem notas na chave legada
    const legacy = localStorage.getItem('fenix_notes_v1');
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const dedupedLegacy = deduplicateListById(parsedLegacy, 'id');
        localStorage.setItem('fenix_notes_db', JSON.stringify(dedupedLegacy));
        return dedupedLegacy;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export const NotasScreen: React.FC<NotasScreenProps> = ({
  currentUserName = 'Vanessa Gomes',
  onBackToCadastro,
}) => {
  const isDirector = (currentUserName || '').toLowerCase().includes('eder');

  // State for notes with localStorage + Supabase persistence
  const [notes, setNotes] = useState<NoteItem[]>(loadLocalNotes);

  // Lista dinâmica de usuários reais do CRM para compartilhamento (sem usuários fake/mock)
  const [teamUsers, setTeamUsers] = useState(() => getActiveTeamUsers());

  // Atualiza usuários dinamicamente caso haja mudanças no CRM
  useEffect(() => {
    const updateUsers = () => setTeamUsers(getActiveTeamUsers());
    window.addEventListener('fenix_auth_updated', updateUsers);
    window.addEventListener('storage', updateUsers);
    return () => {
      window.removeEventListener('fenix_auth_updated', updateUsers);
      window.removeEventListener('storage', updateUsers);
    };
  }, []);

  // Sincronização e escuta de atualizações locais e remotas
  useEffect(() => {
    const handleNotesUpdate = () => {
      // Se o drawer estiver aberto (usuário digitando/editando), não interrompe a edição
      if (isDrawerOpenRef.current) return;
      const freshNotes = loadLocalNotes();
      setNotes((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(freshNotes)) return prev;
        return freshNotes;
      });
    };

    window.addEventListener('fenix_notes_updated', handleNotesUpdate);
    window.addEventListener('storage', handleNotesUpdate);

    return () => {
      window.removeEventListener('fenix_notes_updated', handleNotesUpdate);
      window.removeEventListener('storage', handleNotesUpdate);
    };
  }, []);

  // Tab View Filters
  // "Todas", "Minhas notas", "Compartilhadas comigo", "Notas compartilhadas"
  type TabFilter = 'todas' | 'minhas' | 'comigo' | 'compartilhadas';
  const [activeTab, setActiveTab] = useState<TabFilter>('todas');

  // Search keyword
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting: "recentes" | "antigas" | "titulo" | "fixadas"
  const [sortOption, setSortOption] = useState<'recentes' | 'antigas' | 'titulo' | 'fixadas'>('recentes');

  // Secondary menu popover in card
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-note-menu-wrapper]')) {
        setOpenCardMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // DRAWER LATERAL STATE
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isDrawerOpenRef = useRef(false);
  isDrawerOpenRef.current = isDrawerOpen;
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const draftNoteIdRef = useRef<string>('');

  // Form states in Drawer
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formColor, setFormColor] = useState<NoteColor>('amarelo');
  const [formCategory, setFormCategory] = useState<NoteCategory>('Geral');
  const [formIsShared, setFormIsShared] = useState(false);
  const [formShareScope, setFormShareScope] = useState<'all' | 'specific'>('all');
  const [formSharedUsers, setFormSharedUsers] = useState<string[]>([]);
  const [formChecklistItems, setFormChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [formNewChecklistInput, setFormNewChecklistInput] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Estados de salvamento explícitos
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal de confirmação de exclusão
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Open Drawer for new note
  const handleOpenNewNoteDrawer = () => {
    setEditingNoteId(null);
    draftNoteIdRef.current = `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setFormTitle('');
    setFormContent('');
    setFormColor('amarelo');
    setFormCategory('Geral');
    setFormIsShared(false);
    setFormShareScope('all');
    setFormSharedUsers([]);
    setFormChecklistItems([]);
    setFormNewChecklistInput('');
    setFormIsFavorite(false);
    setFormIsPinned(false);
    setFormErrors({});
    setSaveStatus('idle');
    setSaveError(null);
    setIsDrawerOpen(true);
  };

  // Open Drawer for edit note
  const handleEditNote = (note: NoteItem) => {
    setEditingNoteId(note.id);
    draftNoteIdRef.current = note.id;
    setFormTitle(note.title);
    setFormContent(note.content || '');
    setFormColor(note.color);
    setFormCategory(note.category);
    setFormIsShared(Boolean(note.isShared));
    setFormShareScope(note.shareScope || 'all');
    setFormSharedUsers(note.sharedWith || []);
    setFormChecklistItems(note.checklist ? [...note.checklist] : []);
    setFormNewChecklistInput('');
    setFormIsFavorite(Boolean(note.isFavorite));
    setFormIsPinned(Boolean(note.isPinned));
    setFormErrors({});
    setSaveStatus('idle');
    setSaveError(null);
    setOpenCardMenuId(null);
    setIsDrawerOpen(true);
  };

  // Duplicate note
  const handleDuplicateNote = async (note: NoteItem) => {
    const duplicated: NoteItem = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: `${note.title} (Cópia)`,
      createdAt:
        new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }) +
        ' ' +
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setNotes((prev) => [duplicated, ...prev]);
    setOpenCardMenuId(null);
    await saveItemToSupabase('fenix_notes_db', duplicated, 'id', currentUserName);
    showToast('Nota duplicada com sucesso!');
  };

  // Delete note com confirmação
  const handleDeleteNote = (id: string, title: string) => {
    setOpenCardMenuId(null);
    setNoteToDelete({ id, title: title || 'Anotação sem título' });
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;
    const { id, title } = noteToDelete;
    setIsDeletingNote(true);
    try {
      setNotes((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        try {
          localStorage.setItem('fenix_notes_db', JSON.stringify(updated));
        } catch (err) {
          console.warn('Erro ao atualizar localStorage:', err);
        }
        return updated;
      });

      if (editingNoteId === id) {
        setIsDrawerOpen(false);
        setEditingNoteId(null);
      }

      await deleteItemFromSupabase('fenix_notes_db', id, 'id', currentUserName);
      showToast(`✓ Anotação "${title}" excluída definitivamente.`);
    } catch (err) {
      console.error('Erro ao excluir anotação do banco:', err);
      showToast('Não foi possível excluir a anotação. Tente novamente.');
    } finally {
      setIsDeletingNote(false);
      setNoteToDelete(null);
    }
  };

  // Toggle checklist item in card directly
  const handleToggleChecklistItem = async (noteId: string, itemId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target || !target.checklist) return;

    const updatedChecklist = target.checklist.map((ci) =>
      ci.id === itemId ? { ...ci, completed: !ci.completed } : ci
    );
    const updatedNote = { ...target, checklist: updatedChecklist };

    setNotes((prev) => prev.map((n) => (n.id === noteId ? updatedNote : n)));
    await saveItemToSupabase('fenix_notes_db', updatedNote, 'id', currentUserName);
  };

  // Toggle Pin directly in card
  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notes.find((n) => n.id === id);
    if (!target) return;

    const updatedNote = { ...target, isPinned: !target.isPinned };
    setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
    await saveItemToSupabase('fenix_notes_db', updatedNote, 'id', currentUserName);
  };

  // Toggle Favorite directly in card
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notes.find((n) => n.id === id);
    if (!target) return;

    const updatedNote = { ...target, isFavorite: !target.isFavorite };
    setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
    await saveItemToSupabase('fenix_notes_db', updatedNote, 'id', currentUserName);
  };

  // Add checklist item in Drawer form
  const handleAddDrawerChecklistItem = () => {
    if (!formNewChecklistInput.trim()) return;
    const newItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      text: formNewChecklistInput.trim(),
      completed: false,
    };
    setFormChecklistItems((prev) => [...prev, newItem]);
    setFormNewChecklistInput('');
  };

  // Remove checklist item in Drawer form
  const handleRemoveDrawerChecklistItem = (itemId: string) => {
    setFormChecklistItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Save Drawer Form with states and Supabase database persistence
  const handleSaveDrawerNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saveStatus === 'saving') return;

    const errors: { [key: string]: string } = {};
    if (!formTitle.trim()) {
      errors.title = 'Informe o título da nota';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    const nowFormatted =
      new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let targetNote: NoteItem;

    if (editingNoteId) {
      const existing = notes.find((n) => n.id === editingNoteId);
      const myUserId = getUserIdByName(currentUserName) || undefined;
      targetNote = {
        id: editingNoteId,
        title: formTitle.trim(),
        content: formContent.trim(),
        color: formColor,
        category: formCategory,
        isShared: formIsShared,
        shareScope: formIsShared ? formShareScope : undefined,
        sharedWith:
          formIsShared && formShareScope === 'specific'
            ? formSharedUsers
            : formIsShared && formShareScope === 'all'
            ? ['Todos da equipe']
            : undefined,
        checklist: formChecklistItems.length > 0 ? formChecklistItems : undefined,
        isFavorite: formIsFavorite,
        isPinned: formIsPinned,
        author: existing?.author || currentUserName,
        authorId: (existing as any)?.authorId || (existing as any)?.creatorId || myUserId,
        creatorId: (existing as any)?.creatorId || (existing as any)?.authorId || myUserId,
        authorInitials:
          existing?.authorInitials ||
          currentUserName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        createdAt: existing?.createdAt || nowFormatted,
        updatedAt: nowFormatted,
      };
    } else {
      const draftId = draftNoteIdRef.current || `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      draftNoteIdRef.current = draftId;
      const myUserId = getUserIdByName(currentUserName) || undefined;
      targetNote = {
        id: draftId,
        title: formTitle.trim(),
        content: formContent.trim(),
        color: formColor,
        category: formCategory,
        isShared: formIsShared,
        shareScope: formIsShared ? formShareScope : undefined,
        sharedWith:
          formIsShared && formShareScope === 'specific'
            ? formSharedUsers
            : formIsShared && formShareScope === 'all'
            ? ['Todos da equipe']
            : undefined,
        checklist: formChecklistItems.length > 0 ? formChecklistItems : undefined,
        isFavorite: formIsFavorite,
        isPinned: formIsPinned,
        author: currentUserName,
        authorId: myUserId,
        creatorId: myUserId,
        authorInitials: currentUserName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        createdAt: nowFormatted,
      };
    }

    try {
      const res = await saveItemToSupabase('fenix_notes_db', targetNote, 'id', currentUserName);
      if (!res.success) {
        setSaveStatus('error');
        setSaveError(res.error || 'Não foi possível salvar a nota. Tente novamente.');
        return;
      }

      setSaveStatus('success');
      showToast('Salvo com sucesso.');

      // Notificar usuários quando a nota é compartilhada
      if (targetNote.isShared) {
        const recipients: string[] = targetNote.shareScope === 'all'
          ? teamUsers.filter((u) => u.name !== currentUserName).map((u) => u.name)
          : (targetNote.sharedWith || []).filter((u) => u !== currentUserName && u !== 'Todos da equipe');

        recipients.forEach((recipient) => {
          sendUserNotification({
            category: 'Notas',
            title: `Nota compartilhada por ${currentUserName}`,
            description: `"${targetNote.title || 'Nota'}" foi compartilhada com você.`,
            targetTab: 'Notas',
            recipientName: recipient,
            recipientId: getUserIdByName(recipient) || undefined,
            authorName: currentUserName,
            authorId: getUserIdByName(currentUserName) || undefined,
            metadata: { noteId: targetNote.id, noteTitle: targetNote.title },
          });
        });
      }

      draftNoteIdRef.current = '';

      // Atualiza estado local de forma atômica e deduplicada
      setNotes((prev) => deduplicateListById([targetNote, ...prev.filter((n) => n.id !== targetNote.id)], 'id'));

      // Fechar drawer após confirmação
      setTimeout(() => {
        setIsDrawerOpen(false);
        setSaveStatus('idle');
      }, 600);
    } catch {
      setSaveStatus('error');
      setSaveError('Não foi possível salvar a nota. Tente novamente.');
    }
  };

  // Filtered & Sorted Notes
  const displayedNotes = useMemo(() => {
    let list: NoteItem[] = deduplicateListById<NoteItem>(notes, 'id');

    // Helper para verificar se o usuário é o autor da nota
    const isAuthor = (n: NoteItem) => {
      return (
        areUsersEqualOrRelated(n.author, currentUserName) ||
        Boolean((n as any).authorId && (n as any).authorId === getUserIdByName(currentUserName))
      );
    };

    // Helper para verificar se a nota foi compartilhada com o usuário logado
    const isSharedWithMe = (n: NoteItem) => {
      if (!n.isShared) return false;
      if (n.shareScope === 'all' || n.sharedWith?.includes('Todos da equipe')) return true;
      if (n.sharedWith?.some((u) => areUsersEqualOrRelated(u, currentUserName))) return true;
      const myId = getUserIdByName(currentUserName);
      if (myId && (n as any).sharedWithIds?.some((id: string) => id === myId)) return true;
      return false;
    };

    // Filter by Tab:
    // "Todas": Minhas notas + notas compartilhadas comigo
    // "Minhas notas" (criadas pelo usuário logado)
    // "Compartilhadas comigo" (compartilhadas por outro usuário e destinadas a mim)
    // "Notas compartilhadas" (compartilhadas visíveis: criadas por mim ou compartilhadas comigo)
    if (activeTab === 'todas') {
      list = list.filter((n) => isAuthor(n) || isSharedWithMe(n));
    } else if (activeTab === 'minhas') {
      list = list.filter((n) => isAuthor(n));
    } else if (activeTab === 'comigo') {
      list = list.filter((n) => !isAuthor(n) && isSharedWithMe(n));
    } else if (activeTab === 'compartilhadas') {
      list = list.filter((n) => n.isShared && (isAuthor(n) || isSharedWithMe(n)));
    }

    // Filter by Search Keyword
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((n) => {
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content?.toLowerCase().includes(q);
        const matchCategory = n.category.toLowerCase().includes(q);
        const matchChecklist = n.checklist?.some((c) => c.text.toLowerCase().includes(q));
        return matchTitle || matchContent || matchCategory || matchChecklist;
      });
    }

    // Sort:
    // "recentes" | "antigas" | "titulo" | "fixadas"
    if (sortOption === 'fixadas') {
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    } else if (sortOption === 'titulo') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'antigas') {
      list.sort((a, b) => a.id.localeCompare(b.id));
    } else {
      // recentes (pinned on top, then newest)
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.id.localeCompare(a.id);
      });
    }

    return list;
  }, [notes, activeTab, searchTerm, sortOption, currentUserName, isDirector]);

  // Counts for tabs baseados nos registros visíveis
  const tabCounts = useMemo(() => {
    const list = deduplicateListById(notes, 'id');
    const isAuthor = (n: NoteItem) =>
      areUsersEqualOrRelated(n.author, currentUserName) ||
      Boolean((n as any).authorId && (n as any).authorId === getUserIdByName(currentUserName));

    const isSharedWithMe = (n: NoteItem) => {
      if (!n.isShared) return false;
      if (n.shareScope === 'all' || n.sharedWith?.includes('Todos da equipe')) return true;
      if (n.sharedWith?.some((u) => areUsersEqualOrRelated(u, currentUserName))) return true;
      const myId = getUserIdByName(currentUserName);
      if (myId && (n as any).sharedWithIds?.some((id: string) => id === myId)) return true;
      return false;
    };

    const visibleNotes = list.filter((n) => isAuthor(n) || isSharedWithMe(n));

    return {
      todas: visibleNotes.length,
      minhas: list.filter((n) => isAuthor(n)).length,
      comigo: list.filter((n) => !isAuthor(n) && isSharedWithMe(n)).length,
      compartilhadas: list.filter((n) => n.isShared && (isAuthor(n) || isSharedWithMe(n))).length,
    };
  }, [notes, currentUserName]);

  return (
    <div className="w-full px-4 sm:px-8 xl:px-10 py-6 space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-xl bg-[#0c1e3c] text-white shadow-xl flex items-center gap-3 animate-in fade-in duration-200 border border-slate-700">
          <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="space-y-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs sm:text-sm font-normal text-slate-500">
          <Home className="w-4 h-4 text-[#0052CC]" />
          <span
            onClick={onBackToCadastro}
            className="text-[#0052CC] font-medium cursor-pointer hover:underline"
          >
            Início
          </span>
          <span className="text-slate-400 font-normal">›</span>
          <span className="text-slate-800 font-medium">Notas</span>
        </nav>

        {/* Título, Subtítulo e Botão "+ Nova Nota" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Ícone da aba: Card quadrado com borda azul e ícone de bloco de notas */}
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center flex-shrink-0 border border-blue-200/80 shadow-xs">
              <StickyNote className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#071a52] tracking-tight">
                Notas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Suas anotações, ideias e lembretes em um só lugar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNewNoteDrawer}
            className="h-10 px-5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-all cursor-pointer self-start sm:self-center active:scale-95"
          >
            <span>Nova Nota</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS E ORDENAÇÃO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pílulas/Abas de visualização rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Todas */}
          <button
            type="button"
            onClick={() => setActiveTab('todas')}
            className={`h-9 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              activeTab === 'todas'
                ? 'bg-[#071a52] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <span>Todas</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
                activeTab === 'todas'
                  ? 'bg-blue-600/60 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tabCounts.todas}
            </span>
          </button>

          {/* Minhas notas */}
          <button
            type="button"
            onClick={() => setActiveTab('minhas')}
            className={`h-9 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              activeTab === 'minhas'
                ? 'bg-[#071a52] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <span>Minhas notas</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
                activeTab === 'minhas'
                  ? 'bg-blue-600/60 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tabCounts.minhas}
            </span>
          </button>

          {/* Compartilhadas comigo */}
          <button
            type="button"
            onClick={() => setActiveTab('comigo')}
            className={`h-9 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              activeTab === 'comigo'
                ? 'bg-[#071a52] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <span>Compartilhadas comigo</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
                activeTab === 'comigo'
                  ? 'bg-blue-600/60 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tabCounts.comigo}
            </span>
          </button>

          {/* Notas compartilhadas */}
          <button
            type="button"
            onClick={() => setActiveTab('compartilhadas')}
            className={`h-9 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              activeTab === 'compartilhadas'
                ? 'bg-[#071a52] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Notas compartilhadas</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold ${
                activeTab === 'compartilhadas'
                  ? 'bg-blue-600/60 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tabCounts.compartilhadas}
            </span>
          </button>
        </div>

        {/* Busca e Ordenação */}
        <div className="flex items-center gap-2.5 flex-1 lg:max-w-md justify-end">
          {/* Input de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nas notas..."
              className="w-full h-9 pl-9.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown de Ordenação */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-[#0052CC] transition-all cursor-pointer shadow-2xs appearance-none"
            >
              <option value="recentes">Mais recentes...</option>
              <option value="antigas">Mais antigas</option>
              <option value="titulo">Título (A-Z)</option>
              <option value="fixadas">Fixadas primeiro</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. GRID DE NOTAS (POST-IT 3 COLUNAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* LISTA DE CARDS DE NOTAS (POST-IT MODERNO) */}
        {displayedNotes.map((note) => {
          const colorCfg = COLOR_MAP[note.color] || COLOR_MAP.amarelo;
          const isMenuOpen = openCardMenuId === note.id;

          return (
            <div
              key={note.id}
              className={`rounded-2xl border ${colorCfg.border} ${colorCfg.bg} p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group/card h-auto`}
            >
              {/* Parte Superior do Card: Topo + Título + Corpo */}
              <div>
                {/* Linha Única do Topo: Alfinete/Pin Inclinado, Coração e Menu ⋮ */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {/* Alfinete/Pin fixador inclinado */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(note.id, e)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        note.isPinned
                          ? 'text-amber-600 bg-amber-200/60 rotate-[-25deg]'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-black/5 rotate-[-25deg]'
                      }`}
                      title={note.isPinned ? 'Desafixar nota' : 'Fixar no topo'}
                    >
                      <Pin
                        className={`w-4 h-4 ${
                          note.isPinned ? 'fill-amber-500 text-amber-600' : ''
                        }`}
                      />
                    </button>

                    {/* Coração (favorito) opcional */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(note.id, e)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        note.isFavorite
                          ? 'text-rose-500 bg-rose-200/50'
                          : 'text-slate-400 hover:text-rose-500 hover:bg-black/5'
                      }`}
                      title={note.isFavorite ? 'Remover dos favoritos' : 'Favoritar nota'}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          note.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>

                    {/* Indicador se é compartilhada */}
                    {note.isShared && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md ml-1"
                        title={
                          note.sharedWith && note.sharedWith.length > 0
                            ? `Compartilhada com: ${note.sharedWith.join(', ')}`
                            : 'Compartilhada'
                        }
                      >
                        <Share2 className="w-3 h-3" />
                        <span className="hidden sm:inline text-[11px]">Compartilhada</span>
                      </span>
                    )}
                  </div>

                  {/* Menu de três pontinhos verticais ⋮ */}
                  <div data-note-menu-wrapper="true" className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCardMenuId(isMenuOpen ? null : note.id)
                      }
                      className="w-7 h-7 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      title="Mais opções"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 space-y-1 animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={() => handleEditNote(note)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Editar anotação</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateNote(note)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Duplicar nota</span>
                        </button>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Título da Nota em Negrito */}
                <h3 className="text-slate-800 font-bold text-base leading-snug mb-2">
                  {note.title}
                </h3>

                {/* Conteúdo Formatado Real (Rich Text / Visual) */}
                {note.content && (
                  <div
                    className="note-rendered-content text-xs sm:text-sm text-slate-700/90 leading-relaxed mb-3 break-words"
                    dangerouslySetInnerHTML={{
                      __html: convertMarkdownToHtml(note.content),
                    }}
                  />
                )}

                {/* Checklist Interativo com Checkboxes customizados */}
                {note.checklist && note.checklist.length > 0 && (
                  <div className="space-y-2 my-3 pt-1 border-t border-black/5">
                    {note.checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2.5 text-xs sm:text-sm cursor-pointer select-none group/chk py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklistItem(note.id, item.id)}
                          className="mt-0.5 w-4 h-4 rounded text-[#0052CC] border-slate-300 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#0052CC]"
                        />
                        <span
                          className={`leading-relaxed transition-all ${
                            item.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-700 group-hover/chk:text-slate-900'
                          }`}
                        >
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Rodapé do Card (Alinhado na Base): Badge de categoria + Data/Hora e Avatares */}
              <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge de categoria */}
                  <span className="bg-white/80 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-medium border border-slate-200/40 shadow-2xs">
                    {note.category}
                  </span>

                  {/* Data e hora com ícone de calendário */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{note.createdAt}</span>
                  </div>
                </div>

                {/* Avatar Oficial do autor e compartilhamento */}
                <div className="flex items-center -space-x-1.5 flex-shrink-0">
                  <UserAvatar
                    userName={note.author}
                    size="xs"
                    className="border-2 border-white shadow-2xs"
                    title={`Criado por: ${note.author}`}
                  />
                  {note.isShared && note.sharedWith && note.sharedWith.length > 0 && (
                    <UserAvatar
                      userName={note.sharedWith[0]}
                      size="xs"
                      className="border-2 border-white shadow-2xs"
                      title={`Compartilhada com: ${note.sharedWith.join(', ')}`}
                    />
                  )}
                  {note.sharedWith && note.sharedWith.length > 1 && (
                    <div
                      className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-2xs"
                      title={note.sharedWith.join(', ')}
                    >
                      +{note.sharedWith.length - 1}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Estado vazio quando nenhum card corresponder aos filtros */}
        {displayedNotes.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white/50 rounded-2xl border border-slate-200/60 p-8">
            <StickyNote className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-base font-bold text-slate-700">Nenhuma anotação encontrada</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Não encontramos notas correspondentes a este filtro ou termo de busca.
            </p>
            <button
              type="button"
              onClick={handleOpenNewNoteDrawer}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0052CC] text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Criar nova nota</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. DRAWER LATERAL "NOVA NOTA" (ESTADO CONDICIONAL) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Escuro com Blur sutil */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsDrawerOpen(false);
              }
            }}
          />

          {/* Painel Lateral Deslizante da Direita */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center border border-blue-200/70">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                      {editingNoteId ? 'Editar Nota' : 'Nova Nota'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {editingNoteId
                        ? 'Modifique o conteúdo e preferências da anotação.'
                        : 'Crie uma anotação, checklist ou lembrete para a equipe.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Form Body */}
              <form
                onSubmit={handleSaveDrawerNote}
                className="flex-1 overflow-y-auto p-6 space-y-5 text-xs sm:text-sm"
              >
                {/* Campo: Título * */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">
                    Título <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (formErrors.title) {
                        setFormErrors((prev) => ({ ...prev, title: '' }));
                      }
                    }}
                    placeholder="Digite o título da nota..."
                    className={`w-full h-10 px-3.5 rounded-xl border bg-white text-slate-800 outline-none transition-all ${
                      formErrors.title
                        ? 'border-rose-300 ring-2 ring-rose-500/10'
                        : 'border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-blue-500/10'
                    }`}
                  />
                  {formErrors.title && (
                    <span className="text-[11px] text-rose-500 font-semibold block">
                      {formErrors.title}
                    </span>
                  )}
                </div>

                {/* Editor de Texto Rico (Formatação Visual Real) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Conteúdo da Nota</label>
                    <span className="text-[11px] text-slate-400">Editor com formatação visual</span>
                  </div>
                  <NoteRichTextEditor
                    value={formContent}
                    onChange={setFormContent}
                    placeholder="Escreva sua anotação aqui... Clique nos botões acima para aplicar Negrito visual, Itálico, Sublinhado, Marcadores, Numeração, Fontes e Cores."
                  />
                </div>

                {/* Construtor de Checklist estruturado */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-[#0052CC]" />
                      <span>Itens de Checklist interativo</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formChecklistItems.length} item(ns)
                    </span>
                  </div>

                  {/* Input para adicionar novo item */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formNewChecklistInput}
                      onChange={(e) => setFormNewChecklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDrawerChecklistItem();
                        }
                      }}
                      placeholder="Adicionar tarefa ao checklist (Pressione Enter)..."
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#0052CC]"
                    />
                    <button
                      type="button"
                      onClick={handleAddDrawerChecklistItem}
                      className="h-9 px-3 rounded-lg bg-blue-50 text-[#0052CC] hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {/* Lista de itens criados */}
                  {formChecklistItems.length > 0 && (
                    <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
                      {formChecklistItems.map((ci) => (
                        <div
                          key={ci.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200/60 text-xs"
                        >
                          <span className="text-slate-700 truncate">{ci.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDrawerChecklistItem(ci.id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seletor de Cor da Nota (Pílulas circulares com as 6 cores pastéis) */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">
                    Cor do Card (Post-it)
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {(
                      [
                        'amarelo',
                        'rosa',
                        'azul',
                        'verde',
                        'roxo',
                        'cinza',
                      ] as NoteColor[]
                    ).map((col) => {
                      const cfg = COLOR_MAP[col];
                      const isSelected = formColor === col;

                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setFormColor(col)}
                          className={`w-8 h-8 rounded-full ${cfg.pickerClass} border-2 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-[#0052CC] scale-110'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          title={cfg.name}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-slate-800 stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                    <span className="text-xs text-slate-500 font-medium ml-1">
                      {COLOR_MAP[formColor].name}
                    </span>
                  </div>
                </div>

                {/* Tipo de Nota / Categoria */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Tipo de Nota (Categoria)</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-[#0052CC] transition-all cursor-pointer font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compartilhamento */}
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Nota compartilhada
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Permitir que outros membros vejam esta anotação
                      </span>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setFormIsShared(!formIsShared)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        formIsShared ? 'bg-[#0052CC]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          formIsShared ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Se ativado compartilhamento: Opções de rádio */}
                  {formIsShared && (
                    <div className="pt-2 border-t border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="shareScope"
                            checked={formShareScope === 'all'}
                            onChange={() => setFormShareScope('all')}
                            className="text-[#0052CC] focus:ring-0 cursor-pointer"
                          />
                          <span>Todos da equipe</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="shareScope"
                            checked={formShareScope === 'specific'}
                            onChange={() => setFormShareScope('specific')}
                            className="text-[#0052CC] focus:ring-0 cursor-pointer"
                          />
                          <span>Selecionar pessoas</span>
                        </label>
                      </div>

                      {/* Multiselect se specific */}
                      {formShareScope === 'specific' && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] text-slate-500 block">
                            Pessoas com acesso:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {teamUsers.map((usr) => {
                              const isIncluded = formSharedUsers.includes(usr.name);
                              return (
                                <button
                                  key={usr.name}
                                  type="button"
                                  onClick={() => {
                                    if (isIncluded) {
                                      setFormSharedUsers((prev) =>
                                        prev.filter((u) => u !== usr.name)
                                      );
                                    } else {
                                      setFormSharedUsers((prev) => [...prev, usr.name]);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    isIncluded
                                      ? 'bg-blue-100 text-[#0052CC] border border-blue-200'
                                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <span>{usr.name}</span>
                                  {isIncluded && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Atalhos rápidos adicionais de rodapé */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!formIsPinned) {
                        setFormIsPinned(true);
                        showToast('Nota marcada para fixar no topo');
                      } else {
                        setFormIsPinned(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      formIsPinned
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{formIsPinned ? 'Fixada' : 'Fixar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormIsFavorite(!formIsFavorite)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      formIsFavorite
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${formIsFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{formIsFavorite ? 'Favoritada' : 'Favoritar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormContent((prev) => (prev ? `${prev} ⭐ ` : '⭐ '))
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⭐ Destaque</span>
                  </button>
                </div>

                {/* Feedback de Erro ou Confirmação */}
                {saveStatus === 'error' && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="flex-1 font-medium">
                      {saveError || 'Não foi possível salvar a nota. Tente novamente.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerNote()}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {saveStatus === 'success' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-semibold">Salvo com sucesso.</span>
                  </div>
                )}

                {/* Botões Finais de Ação */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
                  {editingNoteId ? (
                    <button
                      type="button"
                      disabled={saveStatus === 'saving' || isDeletingNote}
                      onClick={() => handleDeleteNote(editingNoteId, formTitle || 'esta anotação')}
                      className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Excluir anotação permanentemente"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Excluir Nota</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saveStatus === 'saving'}
                      onClick={() => setIsDrawerOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saveStatus === 'saving'}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                        saveStatus === 'saving'
                          ? 'bg-blue-400 text-white cursor-not-allowed'
                          : saveStatus === 'success'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0052CC] hover:bg-blue-700 text-white active:scale-95'
                      }`}
                    >
                      {saveStatus === 'saving' && (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      )}
                      {saveStatus === 'success' && (
                        <Check className="w-4 h-4 text-white stroke-[2.5]" />
                      )}
                      <span>
                        {saveStatus === 'saving'
                          ? 'Salvando...'
                          : saveStatus === 'success'
                          ? 'Salvo com sucesso.'
                          : editingNoteId
                          ? 'Salvar Alterações'
                          : 'Salvar Nota'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Nota */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Excluir Anotação</h3>
                <p className="text-xs text-slate-500">Confirmação de remoção permanente</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Tem certeza que deseja excluir definitivamente a anotação{' '}
              <strong className="text-slate-800 font-semibold">"{noteToDelete.title}"</strong>?
              Esta ação removerá o registro definitivamente do banco de dados e não poderá ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingNote}
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingNote}
                onClick={handleConfirmDeleteNote}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir Definitivamente</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
