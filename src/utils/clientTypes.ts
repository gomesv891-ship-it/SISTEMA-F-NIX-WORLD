import React from 'react';
import {
  User,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  Tag,
} from 'lucide-react';
import { ClientRecord } from '../types';

export interface ClientTypeVisualInfo {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badgeClass: string;
  bgClass: string;
}

/**
 * Mapeamento visual dinâmico com base nos Tipos de Cliente cadastrados no módulo Clientes
 * (Ícone, cor do ícone e cor de fundo/borda do badge)
 */
export function getVisualInfoForClientType(tipo?: string): ClientTypeVisualInfo {
  const rawType = (tipo || 'Cliente Final').trim();
  const lower = rawType.toLowerCase();

  // Instalador
  if (lower.includes('instalad') || lower.includes('montad')) {
    return {
      name: rawType || 'Instalador',
      Icon: Wrench,
      iconColor: 'text-orange-600',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      bgClass: 'bg-orange-50 text-orange-600 border-orange-100',
    };
  }

  // Revenda / Loja
  if (lower.includes('revend') || lower.includes('loja') || lower.includes('varejo') || lower.includes('comércio') || lower.includes('comercio')) {
    return {
      name: rawType || 'Revenda',
      Icon: Store,
      iconColor: 'text-purple-600',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      bgClass: 'bg-purple-50 text-purple-600 border-purple-100',
    };
  }

  // Construtora / Obra
  if (lower.includes('construt') || lower.includes('incorpor') || lower.includes('empreend')) {
    return {
      name: rawType || 'Construtora',
      Icon: Building2,
      iconColor: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
  }

  // Arquiteto / Arquitetura / Design
  if (lower.includes('arquit') || lower.includes('design') || lower.includes('decor')) {
    return {
      name: rawType || 'Arquiteto',
      Icon: PenTool,
      iconColor: 'text-violet-600',
      badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
      bgClass: 'bg-violet-50 text-violet-600 border-violet-100',
    };
  }

  // Engenheiro / Engenharia
  if (lower.includes('engenh')) {
    return {
      name: rawType || 'Engenheiro',
      Icon: HardHat,
      iconColor: 'text-sky-600',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      bgClass: 'bg-sky-50 text-sky-700 border-sky-100',
    };
  }

  // Distribuidor / Atacadista
  if (lower.includes('distrib') || lower.includes('atacad')) {
    return {
      name: rawType || 'Distribuidor',
      Icon: Store,
      iconColor: 'text-amber-700',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      bgClass: 'bg-amber-50 text-amber-700 border-amber-100',
    };
  }

  // Cliente Final / Consumidor / Residencial
  if (lower.includes('final') || lower.includes('residenc') || lower.includes('particular') || lower.includes('consumid')) {
    return {
      name: rawType || 'Cliente Final',
      Icon: User,
      iconColor: 'text-[#0052cc]',
      badgeClass: 'bg-blue-50 text-[#0052cc] border-blue-200',
      bgClass: 'bg-blue-50 text-[#0052cc] border-blue-100',
    };
  }

  // Qualquer outro tipo personalizado cadastrado em Clientes
  return {
    name: rawType || 'Cliente Final',
    Icon: Tag,
    iconColor: 'text-slate-600',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

/**
 * Puxa diretamente de CLIENTES → TIPO DE CLIENTE.
 * Localiza o cliente na lista oficial de Clientes (por ID ou correspondência de Nome,
 * por exemplo: se "Malta Forros" estiver cadastrado como "Instalador", busca e retorna "Instalador").
 */
export function resolveClientType(
  clientName?: string,
  clientId?: string,
  clientsList?: ClientRecord[],
  fallbackType?: string
): ClientTypeVisualInfo {
  let resolvedType = fallbackType?.trim() || '';

  if (clientsList && clientsList.length > 0) {
    // 1. Busca por ID exato
    if (clientId) {
      const byId = clientsList.find((c) => c.id === clientId);
      if (byId && byId.clientType) {
        resolvedType = byId.clientType;
      }
    }

    // 2. Busca por Nome
    if (!resolvedType && clientName) {
      const term = clientName.toLowerCase().trim();

      // Correspondência exata de nome
      const exactMatch = clientsList.find(
        (c) => c.name.toLowerCase().trim() === term
      );
      if (exactMatch && exactMatch.clientType) {
        resolvedType = exactMatch.clientType;
      } else {
        // Correspondência por inclusão (ex: "Malta Forros" dentro de "Tiago | Malta Forros")
        const includedMatch = clientsList.find((c) => {
          const cName = c.name.toLowerCase().trim();
          return cName.includes(term) || term.includes(cName);
        });
        if (includedMatch && includedMatch.clientType) {
          resolvedType = includedMatch.clientType;
        } else {
          // Correspondência por tokens principais (ex: "malta" e "forros")
          const cleanTokens = term
            .split(/[\s|/\\-]+/)
            .map((t) => t.trim())
            .filter((t) => t.length >= 3);

          if (cleanTokens.length > 0) {
            const tokenMatch = clientsList.find((c) => {
              const cName = c.name.toLowerCase();
              return cleanTokens.every((tok) => cName.includes(tok));
            });
            if (tokenMatch && tokenMatch.clientType) {
              resolvedType = tokenMatch.clientType;
            }
          }
        }
      }
    }
  }

  if (!resolvedType) {
    resolvedType = fallbackType?.trim() || 'Cliente Final';
  }

  return getVisualInfoForClientType(resolvedType);
}
