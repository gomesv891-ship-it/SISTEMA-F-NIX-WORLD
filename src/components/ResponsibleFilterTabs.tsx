import React from 'react';
import { Users, ShieldCheck } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export interface ResponsibleFilterTabsProps {
  activeTab: string; // 'Todos' | 'Éder Perez' | 'Vanessa Gomes' | 'Jhessica Camargo' | 'Jeferson Trolesi' | string
  onSelectTab: (tab: string) => void;
  counts?: {
    todos?: number;
    eder?: number;
    vanessa?: number;
    jhessica?: number;
    jeferson?: number;
    demais?: number;
    [key: string]: number | undefined;
  };
  includeJeferson?: boolean;
  otherUsers?: string[];
  className?: string;
  label?: string;
}

export const ResponsibleFilterTabs: React.FC<ResponsibleFilterTabsProps> = ({
  activeTab = 'Todos',
  onSelectTab,
  counts,
  includeJeferson = false,
  otherUsers = [],
  className = '',
  label = 'Filtrar por Responsável',
}) => {
  const baseTabs = [
    { id: 'Todos', label: 'Todos', isAll: true, countKey: 'todos' },
    { id: 'Éder Perez', label: 'Éder Perez', userName: 'Éder Perez', isAll: false, countKey: 'eder' },
    { id: 'Vanessa Gomes', label: 'Vanessa Gomes', userName: 'Vanessa Gomes', isAll: false, countKey: 'vanessa' },
    { id: 'Jhessica Camargo', label: 'Jhessica Camargo', userName: 'Jhessica Camargo', isAll: false, countKey: 'jhessica' },
    ...(includeJeferson
      ? [
          {
            id: 'Jeferson Trolesi',
            label: 'Jeferson Trolesi',
            userName: 'Jeferson Trolesi',
            isAll: false,
            countKey: 'jeferson',
          },
        ]
      : []),
  ];

  return (
    <div
      id="responsible-filter-tabs-container"
      className={`bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs mb-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 text-[#0052cc]">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
            Visão da Diretoria
          </span>
        </div>
        <span className="text-[11px] text-slate-600 font-medium">
          Responsável ativo:{' '}
          <strong className="text-slate-800 font-bold">{activeTab}</strong>
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {baseTabs.map((tab) => {
          const activeLower = (activeTab || '').toLowerCase();
          const isActive =
            activeLower === tab.id.toLowerCase() ||
            (tab.countKey === 'todos' && activeLower === 'todos') ||
            (tab.countKey === 'eder' && activeLower.includes('eder')) ||
            (tab.countKey === 'vanessa' && activeLower.includes('vanessa')) ||
            (tab.countKey === 'jhessica' && (activeLower.includes('jhes') || activeLower.includes('jess'))) ||
            (tab.countKey === 'jeferson' && (activeLower.includes('jeferson') || activeLower.includes('troles')));
          const count = counts ? counts[tab.countKey] : undefined;

          return (
            <button
              key={tab.id}
              id={`tab-responsible-${tab.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-700/20 ring-1 ring-blue-600'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {tab.isAll ? (
                <Users
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                />
              ) : (
                <UserAvatar userName={tab.userName || tab.id} size="xs" />
              )}
              <span>{tab.label}</span>
              {typeof count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Dynamic tabs for any custom registered users if passed */}
        {otherUsers.map((userName) => {
          const isActive = activeTab.toLowerCase() === userName.toLowerCase();
          const count = counts ? counts[userName.toLowerCase()] : undefined;

          return (
            <button
              key={userName}
              id={`tab-responsible-custom-${userName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              type="button"
              onClick={() => onSelectTab(userName)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-700/20 ring-1 ring-blue-600'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              <UserAvatar userName={userName} size="xs" />
              <span>{userName}</span>
              {typeof count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
