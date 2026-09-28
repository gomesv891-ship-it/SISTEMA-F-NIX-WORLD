import React from 'react';
import {
  Home,
  User,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  LucideIcon,
} from 'lucide-react';

export interface ClientTypeVisualInfo {
  cardBorder: string;
  cardBg: string;
  headerHover: string;
  badgeBg: string;
  iconBg: string;
  Icon: LucideIcon;
  dotColor: string;
  colorName: string;
}

/**
 * Retorna estilos visuais do card de acordo com o tipo de cliente:
 * - Cliente Final / Residencial: azul
 * - Revenda: roxo
 * - Construtora: verde
 * - Instalador: laranja
 * - Arquiteto: lilás
 * - Engenheiro: azul céu
 */
export const getClientTypeVisual = (type?: string): ClientTypeVisualInfo => {
  const t = (type || '').toLowerCase();

  if (t.includes('revenda') || t.includes('comercial') || t.includes('loja')) {
    return {
      cardBorder: 'border-purple-200 hover:border-purple-300',
      cardBg: 'bg-purple-50/70',
      headerHover: 'hover:bg-purple-100/40',
      badgeBg: 'bg-purple-100/80 text-purple-700 border border-purple-200',
      iconBg: 'bg-white text-purple-600 border border-purple-100 shadow-2xs',
      Icon: Store,
      dotColor: 'bg-purple-600',
      colorName: 'roxo',
    };
  }

  if (t.includes('construtora') || t.includes('edif') || t.includes('pred')) {
    return {
      cardBorder: 'border-emerald-200 hover:border-emerald-300',
      cardBg: 'bg-emerald-50/70',
      headerHover: 'hover:bg-emerald-100/40',
      badgeBg: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200',
      iconBg: 'bg-white text-emerald-600 border border-emerald-100 shadow-2xs',
      Icon: Building2,
      dotColor: 'bg-emerald-600',
      colorName: 'verde',
    };
  }

  if (t.includes('instalador') || t.includes('técnico') || t.includes('tecnico')) {
    return {
      cardBorder: 'border-orange-200 hover:border-orange-300',
      cardBg: 'bg-orange-50/70',
      headerHover: 'hover:bg-orange-100/40',
      badgeBg: 'bg-orange-100/80 text-orange-700 border border-orange-200',
      iconBg: 'bg-white text-orange-600 border border-orange-100 shadow-2xs',
      Icon: Wrench,
      dotColor: 'bg-orange-600',
      colorName: 'laranja',
    };
  }

  if (t.includes('arquiteto') || t.includes('design') || t.includes('arquiteta')) {
    return {
      cardBorder: 'border-violet-200 hover:border-violet-300',
      cardBg: 'bg-violet-50/70',
      headerHover: 'hover:bg-violet-100/40',
      badgeBg: 'bg-violet-100/80 text-violet-700 border border-violet-200',
      iconBg: 'bg-white text-violet-600 border border-violet-100 shadow-2xs',
      Icon: PenTool,
      dotColor: 'bg-violet-600',
      colorName: 'lilás',
    };
  }

  if (t.includes('engenheiro') || t.includes('engenheira') || t.includes('eng')) {
    return {
      cardBorder: 'border-sky-200 hover:border-sky-300',
      cardBg: 'bg-sky-50/70',
      headerHover: 'hover:bg-sky-100/40',
      badgeBg: 'bg-sky-100/80 text-sky-700 border border-sky-200',
      iconBg: 'bg-white text-sky-600 border border-sky-100 shadow-2xs',
      Icon: HardHat,
      dotColor: 'bg-sky-600',
      colorName: 'azul',
    };
  }

  // Default: Cliente Final / Residencial
  return {
    cardBorder: 'border-blue-200 hover:border-blue-300',
    cardBg: 'bg-blue-50/70',
    headerHover: 'hover:bg-blue-100/40',
    badgeBg: 'bg-blue-100/80 text-[#0052cc] border border-blue-200',
    iconBg: 'bg-white text-[#0052cc] border border-blue-100 shadow-2xs',
    Icon: User,
    dotColor: 'bg-[#0052cc]',
    colorName: 'azul',
  };
};
