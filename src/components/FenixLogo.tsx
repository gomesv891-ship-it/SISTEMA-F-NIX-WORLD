import React from 'react';
import { FENIX_OFFICIAL_LOGO_BASE64 } from '../assets/fenixLogoBase64';

export interface FenixLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  height?: number | string;
  showText?: boolean;
}

/**
 * Logotipo Oficial Fênix World
 * Renderiza fielmente a identidade visual corporativa da empresa:
 * - "FÊNIX" em azul corporativo
 * - "WORLD" em cinza prata
 * - Símbolo da Fênix com asas azuis e corpo/cauda prateados
 * - Fundo 100% transparente para integração nativa no cabeçalho do menu e tela de login
 */
export const FenixLogo: React.FC<FenixLogoProps> = ({
  className = '',
  size = 'md',
  height,
}) => {
  // Proporções otimizadas para cada contexto de visualização
  const sizeMap: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
    sm: 38, // Cabeçalho do menu principal (Sidebar do CRM)
    md: 44, // Padrão
    lg: 52, // Tela de Login (destaque proporcional e elegante)
    xl: 64, // Telas de impressão e relatórios
  };

  const calculatedHeight = height ?? sizeMap[size];
  const heightStyle = typeof calculatedHeight === 'number' ? `${calculatedHeight}px` : calculatedHeight;

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ height: heightStyle }}
      title="Fênix World"
    >
      <img
        src={FENIX_OFFICIAL_LOGO_BASE64 || '/fenix_official_logo.png'}
        alt="Fênix World"
        className="h-full w-auto object-contain block select-none pointer-events-none"
        style={{
          maxHeight: heightStyle,
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
};
