import React from 'react';
import {
  Users,
  Calculator,
  FileText,
  Calendar,
  HardHat,
  Boxes,
  PhoneCall,
  Target,
  Package,
  CheckSquare,
  HeartHandshake,
  Barcode,
  AlertCircle,
  FileEdit,
  Settings,
  X,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import { FenixLogo } from './FenixLogo';
import { isEderPerez } from '../utils/auth';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  currentUserName?: string;
  allowedTabs?: string[];
}

interface MenuSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'COMERCIAL',
    items: [
      { id: 'Clientes', label: 'Clientes', icon: Users },
      { id: 'Calculadora', label: 'Calculadora', icon: Calculator },
      { id: 'Orçamentos', label: 'Orçamentos', icon: FileText },
      { id: 'Vendas', label: 'Vendas', icon: TrendingUp },
      { id: 'Follow-up', label: 'Follow-up', icon: PhoneCall },
      { id: 'Metas', label: 'Metas', icon: Target },
    ],
  },
  {
    title: 'OPERAÇÃO',
    items: [
      { id: 'Estoque', label: 'Estoque', icon: Boxes },
      { id: 'Produtos', label: 'Produtos', icon: Package },
      { id: 'Tarefas', label: 'Tarefas', icon: CheckSquare },
      { id: 'Pós Vendas', label: 'Pós Vendas', icon: HeartHandshake },
    ],
  },
  {
    title: 'FINANCEIRO & CONTROLE',
    items: [
      { id: 'Boletos', label: 'Boletos', icon: Barcode },
      { id: 'Pendências', label: 'Pendências', icon: AlertCircle },
      { id: 'Notas', label: 'Notas', icon: FileEdit },
      { id: 'Configurações', label: 'Configurações', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab = 'Clientes',
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onLogout,
  currentUserName = '',
  allowedTabs,
}) => {
  const isDirector = isEderPerez(currentUserName);

  // Filter menu items by user permissions
  const filteredSections = MENU_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => {
      // Requisito estrito: Aba Vendas é exclusiva da Diretoria (Éder Perez)
      if (item.id === 'Vendas') {
        return isDirector;
      }

      // Diretor Éder Perez has full unrestricted access to everything
      if (isDirector) return true;

      if (!allowedTabs || allowedTabs.length === 0) return false;

      // Normalization check (e.g. 'Pós Vendas' === 'Pós-Vendas', 'Configurações' === 'Configuracoes')
      const normItemId = item.id
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_\s]/g, '');

      return allowedTabs.some((tab) => {
        const normTab = tab
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[-_\s]/g, '');
        return normTab === normItemId;
      });
    });

    return {
      ...section,
      items: visibleItems,
    };
  }).filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Dark Sophisticated Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-60 xl:w-64 bg-[#091122] text-slate-300 flex flex-col justify-between transition-transform duration-250 ease-out border-r border-slate-800/80 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo FÊNIX WORLD */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/5 flex-shrink-0">
            <FenixLogo size="sm" showText={true} />
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu List grouped into structured blocks */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3 custom-scrollbar">
            {filteredSections.map((section) => (
              <div key={section.title} className="space-y-0.5">
                {/* Block Section Title */}
                <p className="text-[10px] font-bold tracking-wider text-slate-400/70 uppercase px-3 pt-1 pb-1 select-none">
                  {section.title}
                </p>

                {/* Section Items with py-1.5 */}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.id === currentTab ||
                    (item.id === 'Tarefas' && (currentTab === 'Agenda' || currentTab === 'Tarefas')) ||
                    (item.id === 'Pós Vendas' && (currentTab === 'Obras' || currentTab === 'Pós-Vendas' || currentTab === 'PosVendas' || currentTab === 'Pos Vendas' || currentTab === 'Pós Vendas')) ||
                    (item.id === 'Estoque' && (currentTab === 'Materiais' || currentTab === 'Controle de Estoque' || currentTab === 'Estoque')) ||
                    (item.id === 'Metas' && (currentTab === 'Meta' || currentTab === 'Metas')) ||
                    (item.id === 'Pendências' && (currentTab === 'Pendencias' || currentTab === 'Pendências')) ||
                    (item.id === 'Follow-up' && (currentTab === 'FollowUp' || currentTab === 'Follow-up'));

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer select-none ${
                        isActive
                          ? 'bg-[#0052cc] text-white font-semibold shadow-sm shadow-blue-600/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Tagline & Sair */}
        <div className="p-3 border-t border-white/5 bg-[#070e1c]/90 flex-shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do sistema</span>
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-normal tracking-tight">
            Trabalhando juntos por grandes conquistas
          </p>
        </div>
      </aside>
    </>
  );
};
