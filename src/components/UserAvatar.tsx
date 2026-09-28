import React from 'react';
import { getUserDetails } from '../utils/auth';

/**
 * AVATAR OFICIAL DO SISTEMA FÊNIX WORLD
 * Regras:
 * - O desenho da silhueta é ÚNICO e FIXO para todos os usuários.
 * - Não existem outros modelos de avatar ou variações por cargo.
 * - Não há símbolos, acessórios, coroas ou carrinhos.
 * - A única coisa que o usuário pode alterar é a COR.
 */

export interface AvatarDefinition {
  id: string;
  name: string;
  subtitle?: string;
  category: string;
  defaultBg: string;
  defaultColor: string;
}

export const AVATAR_OPTIONS: AvatarDefinition[] = [
  {
    id: 'oficial',
    name: 'Avatar Oficial Fênix World',
    category: 'Oficial',
    defaultBg: '#CCE5FF',
    defaultColor: '#0066FF',
  },
];

export interface ColorOption {
  key: string;
  name: string;
  hex: string;
  bgPastel: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { key: 'blue', name: 'Azul Oficial Fênix', hex: '#0066FF', bgPastel: '#CCE5FF' },
  { key: 'purple', name: 'Roxo Real', hex: '#8B5CF6', bgPastel: '#EDE9FE' },
  { key: 'green', name: 'Verde Esmeralda', hex: '#10B981', bgPastel: '#D1FAE5' },
  { key: 'pink', name: 'Rosa / Magenta', hex: '#EC4899', bgPastel: '#FCE7F3' },
  { key: 'orange', name: 'Laranja Solar', hex: '#F97316', bgPastel: '#FFEDD5' },
  { key: 'yellow', name: 'Amarelo Ouro', hex: '#EAB308', bgPastel: '#FEF9C3' },
  { key: 'cyan', name: 'Ciano Oceano', hex: '#06B6D4', bgPastel: '#CFFAFE' },
  { key: 'coral', name: 'Vermelho Coral', hex: '#EF4444', bgPastel: '#FEE2E2' },
  { key: 'sky', name: 'Azul Céu', hex: '#0284C7', bgPastel: '#E0F2FE' },
  { key: 'teal', name: 'Verde Menta', hex: '#14B8A6', bgPastel: '#CCFBF1' },
  { key: 'indigo', name: 'Índigo Nobre', hex: '#6366F1', bgPastel: '#E0E7FF' },
  { key: 'slate', name: 'Cinza Ardósia', hex: '#475569', bgPastel: '#F1F5F9' },
];

/**
 * Retorna o tom pastel claro correspondente a qualquer cor hexadecimal
 */
export function getPastelBgForColor(hex?: string): string {
  if (!hex) return '#CCE5FF';
  const cleanHex = hex.trim().toLowerCase();
  const found = COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === cleanHex);
  if (found) return found.bgPastel;

  // Fallback seguro gerando um tom transparente suave com o mesmo matiz
  if (cleanHex.startsWith('#') && (cleanHex.length === 7 || cleanHex.length === 4)) {
    return `${cleanHex}24`; // ~14% opacidade
  }
  return '#CCE5FF';
}

export function getColorOption(colorHexOrKey?: string): ColorOption {
  if (!colorHexOrKey) return COLOR_OPTIONS[0];
  const target = colorHexOrKey.trim().toLowerCase();
  const found = COLOR_OPTIONS.find(
    (c) => c.hex.toLowerCase() === target || c.key.toLowerCase() === target
  );
  if (found) return found;

  return {
    key: 'custom',
    name: 'Personalizado',
    hex: colorHexOrKey,
    bgPastel: getPastelBgForColor(colorHexOrKey),
  };
}

/**
 * Desenho vetorial da Silhueta Oficial do SISTEMA FÊNIX WORLD
 * Exatamente proporcional à imagem enviada de referência
 */
export const FenixOfficialAvatarSvg: React.FC<{
  color: string;
  className?: string;
}> = ({ color, className = 'w-full h-full' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Cabeça do Avatar Oficial (círculo proporcional) */}
      <circle cx="50" cy="35" r="17.5" fill={color} />

      {/* Busto e Ombros do Avatar Oficial (curva contínua limpa e sólida) */}
      <path
        d="M 21.5 83.5 C 21.5 71.5 29 57.5 50 57.5 C 71 57.5 78.5 71.5 78.5 83.5 C 78.5 85.5 75.5 86.5 71 86.5 L 29 86.5 C 24.5 86.5 21.5 85.5 21.5 83.5 Z"
        fill={color}
      />
    </svg>
  );
};

/**
 * Componente de compatibilidade para renderização do ícone único
 */
export const AvatarIconSvg: React.FC<{
  avatarId?: string;
  color: string;
  initials?: string;
}> = ({ color }) => {
  return <FenixOfficialAvatarSvg color={color} />;
};

export interface UserAvatarProps {
  avatarId?: string;
  avatarColor?: string;
  userName?: string;
  userId?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  title?: string;
  useDefaultColors?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarColor,
  userName,
  size = 'md',
  className = '',
  title,
}) => {
  // Se não foi passada cor explicitamente, busca a cor configurada para o usuário
  let resolvedColor = avatarColor;
  if (!resolvedColor && userName) {
    try {
      const details = getUserDetails(userName);
      resolvedColor = details.avatarColor;
    } catch {}
  }

  // Cor padrão do sistema Fênix (Azul Oficial) se nenhuma foi especificada
  if (!resolvedColor) {
    if (userName) {
      const norm = userName.toLowerCase();
      if (norm.includes('eder')) resolvedColor = '#10B981'; // Verde
      else if (norm.includes('jhessica')) resolvedColor = '#8B5CF6'; // Roxo
      else if (norm.includes('jeferson')) resolvedColor = '#F97316'; // Laranja
      else resolvedColor = '#0066FF'; // Vanessa / Geral: Azul Oficial
    } else {
      resolvedColor = '#0066FF';
    }
  }

  const selectedColor = getColorOption(resolvedColor);
  const finalBg = selectedColor.bgPastel;
  const finalColor = selectedColor.hex;

  const sizeClasses = {
    xs: 'w-6 h-6 min-w-[24px]',
    sm: 'w-8 h-8 min-w-[32px]',
    md: 'w-10 h-10 min-w-[40px]',
    lg: 'w-14 h-14 min-w-[56px]',
    xl: 'w-20 h-20 min-w-[80px]',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28 min-w-[96px]',
    '3xl': 'w-32 h-32 min-w-[128px]',
  }[size];

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all select-none ${sizeClasses} ${className}`}
      style={{ backgroundColor: finalBg }}
      title={title || (userName ? `Avatar de ${userName}` : 'Avatar Oficial SISTEMA FÊNIX WORLD')}
    >
      <div className="w-[82%] h-[82%] flex items-center justify-center">
        <FenixOfficialAvatarSvg color={finalColor} />
      </div>
    </div>
  );
};
