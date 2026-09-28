import React from 'react';
import { FENIX_OFFICIAL_LOGO_BASE64 } from '../assets/fenixLogoBase64';

interface FenixOfficialLogoProps {
  className?: string;
  height?: number | string;
  showBackground?: boolean;
}

/**
 * Logotipo Oficial Fênix World
 * Reprodução exata da logo oficial fornecida:
 * - "FÊNIX" em azul corporativo sólido
 * - "WORLD" espaçado em cinza elegante
 * - Emblema da Ave Fênix (penas azuis + pássaro/cauda em cinza)
 * - Fundo transparente com renderização em alta fidelidade
 */
export const FenixOfficialLogo: React.FC<FenixOfficialLogoProps> = ({
  className = '',
  height = 60,
}) => {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ height: heightStyle }}
    >
      <img
        src={FENIX_OFFICIAL_LOGO_BASE64}
        alt="Fênix World Distribuidora"
        className="h-full w-auto object-contain block"
        style={{
          maxHeight: heightStyle,
          display: 'block',
        }}
      />
    </div>
  );
};

