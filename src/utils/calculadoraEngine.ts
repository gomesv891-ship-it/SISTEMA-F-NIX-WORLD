import { MaterialRow } from '../types';
import { getOfficialProducts, getOfficialCategories } from '../data/productCatalog';

export const NO_PRODUCTS_LABEL = 'Nenhum produto cadastrado nesta categoria.';

// ==========================================
// CATEGORY MATCHING & NORMALIZATION
// ==========================================
export function normalizeCatName(name?: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Checks if a product belongs strictly to target categories by categoryId or categoryName.
 * Never checks product name to guess category.
 */
export function isProductInTargetCategory(
  p: { categoryId?: string; categoryName?: string },
  targetIds: string[],
  targetNames: string[]
): boolean {
  const pCatId = (p.categoryId || '').trim();
  const pCatName = normalizeCatName(p.categoryName);

  if (pCatId && targetIds.some((id) => id.trim().toLowerCase() === pCatId.toLowerCase())) {
    return true;
  }
  if (pCatName && targetNames.some((n) => normalizeCatName(n) === pCatName)) {
    return true;
  }
  return false;
}

// ==========================================
// 1. PISO VINÍLICO
// ==========================================
export interface PisoProduct {
  name: string;
  defaultM2PerBox: number;
  type: 'colado' | 'clicado';
}

export function getLivePisoProducts(): PisoProduct[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['0368b74c-2647-4e35-aeee-a3a5667561fd', 'cat_pisos_vinilicos'],
        ['PISOS VINÍLICOS', 'PISOS VINILICOS', 'PISO VINÍLICO', 'PISO VINILICO']
      )
    );

    if (matches.length > 0) {
      return matches.map((p) => {
        let m2 = 3.34;
        const matchBox = p.name.match(/\[cx\s*([0-9]+[.,][0-9]+)\s*m[²2]\]/i);
        if (matchBox) {
          m2 = parseFloat(matchBox[1].replace(',', '.')) || 3.34;
        } else {
          const matchGeneral = p.name.match(/([0-9]+[.,][0-9]+)\s*m[²2]/i);
          if (matchGeneral) {
            m2 = parseFloat(matchGeneral[1].replace(',', '.')) || 3.34;
          }
        }
        const isClicado =
          p.name.toLowerCase().includes('clicado') ||
          p.name.toLowerCase().includes('clicad');
        return {
          name: p.name,
          defaultM2PerBox: m2,
          type: isClicado ? 'clicado' : 'colado',
        };
      });
    }
  } catch {}
  return [];
}

export const PISO_PRODUCTS: PisoProduct[] = getLivePisoProducts();

/**
 * Decompõe o nome do produto de Piso Vinílico em:
 * - mainTitle: Nome principal (ex: "Piso FLEXFLOOR PREMIUM")
 * - specSubtitle: Especificações técnicas (ex: "2mm (capa 0,20mm) [cx 5,70m²]")
 */
export function parsePisoVinilicoName(fullProductName: string): {
  mainTitle: string;
  specSubtitle: string;
} {
  const clean = (fullProductName || '').trim();
  if (!clean) return { mainTitle: '', specSubtitle: '' };

  // Caso 1: Especificação completa com mm, capa e/ou caixa
  // Ex: "Piso FLEXFLOOR PREMIUM 2mm (capa 0,20mm) [cx 5,70m²] - NOVA LINHA"
  // Ex: "Piso Vinílico Flexfloor Premium 2mm (capa 0,20mm) [cx 4,72m²]"
  const matchFull = clean.match(
    /^(.*?)(?:\s+)(\d+(?:[.,]\d+)?\s*mm(?:\s*\(.*?\))?(?:\s*\[cx\s*[^\]]+\])?)(.*)$/i
  );
  if (matchFull) {
    return {
      mainTitle: matchFull[1].trim(),
      specSubtitle: matchFull[2].trim(),
    };
  }

  // Caso 2: Se só contiver [cx ...] no nome
  const matchBox = clean.match(/^(.*?)(?:\s+)(\[cx\s*[^\]]+\])(.*)$/i);
  if (matchBox) {
    return {
      mainTitle: matchBox[1].trim(),
      specSubtitle: matchBox[2].trim(),
    };
  }

  return {
    mainTitle: clean,
    specSubtitle: '',
  };
}

// ==========================================
// 2. RODAPÉ
// ==========================================
export interface RodapeProduct {
  name: string;
  barLengthMeters: number; // e.g., 2.40 m
  heightCm: number;
  categoryType?: 'poliestireno' | 'mdf';
}

function mapToRodapeProduct(p: { name: string }, defaultBar: number = 2.4): RodapeProduct {
  let bar = defaultBar;
  const matchBar = p.name.match(/(\d+[.,]\d+)\s*m/i);
  if (matchBar) {
    bar = parseFloat(matchBar[1].replace(',', '.')) || defaultBar;
  }
  let height = 10;
  const matchHeight = p.name.match(/(\d+)\s*cm/i);
  if (matchHeight) {
    height = parseInt(matchHeight[1], 10) || 10;
  }
  return {
    name: p.name,
    barLengthMeters: bar,
    heightCm: height,
  };
}

export function getLiveRodapePoliestirenoProducts(): RodapeProduct[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['54ff2da7-1c77-458d-834e-77acaf3063f8', 'cat_rodapes_poliestireno'],
        ['RODAPÉS POLIESTIRENO', 'RODAPES POLIESTIRENO', 'RODAPÉ POLIESTIRENO', 'RODAPE POLIESTIRENO']
      )
    );
    if (matches.length > 0) {
      return matches.map((p) => ({
        ...mapToRodapeProduct(p, 2.4),
        categoryType: 'poliestireno',
      }));
    }
  } catch {}
  return [];
}

export function getLiveRodapeMDFProducts(): RodapeProduct[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['5359db09-6718-4c3d-908f-59317607d223', 'cat_rodapes_mdf'],
        ['RODAPÉS MDF', 'RODAPES MDF', 'RODAPÉ MDF', 'RODAPE MDF']
      )
    );
    if (matches.length > 0) {
      return matches.map((p) => ({
        ...mapToRodapeProduct(p, 2.4),
        categoryType: 'mdf',
      }));
    }
  } catch {}
  return [];
}

export function getLiveRodapeProducts(subCategory?: string): RodapeProduct[] {
  if (subCategory === 'Rodapé Poliestireno' || subCategory === 'RODAPÉS POLIESTIRENO') {
    return getLiveRodapePoliestirenoProducts();
  }
  if (subCategory === 'Rodapé MDF' || subCategory === 'RODAPÉS MDF') {
    return getLiveRodapeMDFProducts();
  }
  const pol = getLiveRodapePoliestirenoProducts();
  const mdf = getLiveRodapeMDFProducts();
  return [...pol, ...mdf];
}

export const RODAPE_PRODUCTS: RodapeProduct[] = getLiveRodapeProducts();

export function getLiveRodapeColaProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['17e0cbc7-9c53-4284-ae38-a33e9d64cc18', 'cat_cola_rodape'],
        ['COLA PARA RODAPÉ', 'COLA PARA RODAPE', 'COLAS PARA RODAPÉ', 'COLAS PARA RODAPE']
      )
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const RODAPE_COLA_PRODUCTS: string[] = getLiveRodapeColaProducts();

export function getLiveRodapeCola5KgProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['17e0cbc7-9c53-4284-ae38-a33e9d64cc18', 'cat_cola_rodape'],
          ['COLA PARA RODAPÉ', 'COLA PARA RODAPE', 'COLAS PARA RODAPÉ', 'COLAS PARA RODAPE']
        ) && (p.name.includes('5 kg') || p.name.includes('5kg') || p.name.includes('5Kg') || p.name.includes('5KG'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return ['Cola para Rodapé FLEXFLOOR — Balde 5 kg'];
}

export const RODAPE_COLA_5KG_PRODUCTS: string[] = getLiveRodapeCola5KgProducts();

export function getLiveRodapeCola15KgProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['17e0cbc7-9c53-4284-ae38-a33e9d64cc18', 'cat_cola_rodape'],
          ['COLA PARA RODAPÉ', 'COLA PARA RODAPE', 'COLAS PARA RODAPÉ', 'COLAS PARA RODAPE']
        ) && (p.name.includes('1,5') || p.name.includes('1.5'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return ['Cola para Rodapé FLEXFLOOR — Balde 1,5 kg'];
}

export const RODAPE_COLA_15KG_PRODUCTS: string[] = getLiveRodapeCola15KgProducts();

export function getLiveRodapeBisnagaProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['17e0cbc7-9c53-4284-ae38-a33e9d64cc18', 'cat_cola_rodape'],
          ['COLA PARA RODAPÉ', 'COLA PARA RODAPE', 'COLAS PARA RODAPÉ', 'COLAS PARA RODAPE']
        ) && (p.name.toLowerCase().includes('bisnaga') || (p.unit && p.unit.toLowerCase() === 'bisnaga') || p.name.includes('0,400') || p.name.includes('400g'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return ['Cola para Rodapé FLEXFLOOR — bisnaga 0,400g'];
}

export const RODAPE_BISNAGA_PRODUCTS: string[] = getLiveRodapeBisnagaProducts();
export const RODAPE_COLA_INSTALACAO_PRODUCTS: string[] = RODAPE_COLA_PRODUCTS;
export const RODAPE_COLA_ACABAMENTO_PRODUCTS: string[] = RODAPE_COLA_PRODUCTS;

// ==========================================
// 3. TETO VINÍLICO
// ==========================================
export function getLiveTetoProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const cats = getOfficialCategories();
    const catMap = new Map(cats.map((c) => [c.id.toLowerCase(), normalizeCatName(c.name)]));

    const matches = prods.filter((p) => {
      const pNameNorm = normalizeCatName(p.name);
      // Excluir perfis e acabamentos do teto primário
      const isFinishing =
        pNameNorm.includes('PERFIL') ||
        pNameNorm.includes('ACABAMENTO') ||
        pNameNorm.startsWith('CANTONEIRA');

      if (isFinishing) return false;

      // 1. Categoria direta ou mapeada por id
      const catName =
        normalizeCatName(p.categoryName) ||
        (p.categoryId ? catMap.get(p.categoryId.toLowerCase()) || '' : '');
      const isTargetCat =
        catName.includes('TETO') ||
        catName.includes('FORRO');

      if (isTargetCat) return true;

      // 2. Nome do produto contém "Teto Vinílico" ou "Teto Vinilico" ou começa com "Teto"
      if (pNameNorm.includes('TETO VINILICO') || pNameNorm.startsWith('TETO')) {
        return true;
      }

      return false;
    });

    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const TETO_PRODUCTS: string[] = getLiveTetoProducts();

export function getLiveTetoPerfilProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const cats = getOfficialCategories();
    const catMap = new Map(cats.map((c) => [c.id.toLowerCase(), normalizeCatName(c.name)]));

    const matches = prods.filter((p) => {
      const pNameNorm = normalizeCatName(p.name);
      const catName =
        normalizeCatName(p.categoryName) ||
        (p.categoryId ? catMap.get(p.categoryId.toLowerCase()) || '' : '');

      // 1. Nome do produto é "Acabamento" ou contém "Acabamento" ou "Perfil"
      const nameMatch =
        pNameNorm.includes('ACABAMENTO') ||
        pNameNorm.includes('PERFIL');

      // 2. Categoria contém Acabamento, Perfil ou Teto
      const catMatch =
        catName.includes('ACABAMENTO') ||
        catName.includes('PERFIL') ||
        catName.includes('TETO');

      if (nameMatch) {
        return true;
      }

      if (catMatch && (pNameNorm.includes('ACABAMENTO') || pNameNorm.includes('PERFIL') || pNameNorm.includes('BARRA'))) {
        return true;
      }

      return false;
    });

    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const TETO_PERFIL_PRODUCTS: string[] = getLiveTetoPerfilProducts();

// ==========================================
// 4. RIPADO
// ==========================================
export interface RipadoProduct {
  name: string;
  barLengthMeters: number;
  barWidthMeters: number; // useful width in meters
  categoryType?: 'poliestireno' | 'mdf';
}

function mapToRipadoProduct(p: { name: string }, defaultBar: number = 2.85): RipadoProduct {
  let bar = defaultBar;
  const matchBar = p.name.match(/(\d+[.,]\d+)\s*m/i);
  if (matchBar) {
    bar = parseFloat(matchBar[1].replace(',', '.')) || defaultBar;
  }
  let width = 0.12;
  const matchWidth = p.name.match(/Larg:\s*(\d+[.,]\d+)\s*cm/i) || p.name.match(/Lar:\s*(\d+[.,]\d+)\s*cm/i) || p.name.match(/(\d+[.,]?\d*)\s*cm/i);
  if (matchWidth) {
    const cm = parseFloat(matchWidth[1].replace(',', '.')) || 12;
    width = cm / 100;
  }
  return {
    name: p.name,
    barLengthMeters: bar,
    barWidthMeters: width,
  };
}

export function getLiveRipadoPoliestirenoProducts(): RipadoProduct[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['6f1a358c-63c6-4422-8066-d71e5938fbf3', 'cat_ripado_poliestireno'],
        ['RIPADO POLIESTIRENO', 'RIPADOS POLIESTIRENO']
      ) &&
      !p.name.toLowerCase().includes('acabamento') &&
      !p.name.toLowerCase().includes('perfil')
    );
    if (matches.length > 0) {
      return matches.map((p) => ({
        ...mapToRipadoProduct(p, 2.85),
        categoryType: 'poliestireno',
      }));
    }
  } catch {}
  return [];
}

export function getLiveRipadoMDFProducts(): RipadoProduct[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['839e7b87-10d8-40d4-8f51-9fd294252b42', 'cat_ripado_mdf'],
        ['RIPADO MDF', 'RIPADOS MDF']
      ) &&
      !p.name.toLowerCase().includes('acabamento') &&
      !p.name.toLowerCase().includes('perfil')
    );
    if (matches.length > 0) {
      return matches.map((p) => ({
        ...mapToRipadoProduct(p, 2.70),
        categoryType: 'mdf',
      }));
    }
  } catch {}
  return [];
}

export function getLiveRipadoProducts(subCategory?: string): RipadoProduct[] {
  if (subCategory === 'Ripado Poliestireno' || subCategory === 'RIPADO POLIESTIRENO') {
    return getLiveRipadoPoliestirenoProducts();
  }
  if (subCategory === 'Ripado MDF' || subCategory === 'RIPADO MDF') {
    return getLiveRipadoMDFProducts();
  }
  const pol = getLiveRipadoPoliestirenoProducts();
  const mdf = getLiveRipadoMDFProducts();
  return [...pol, ...mdf];
}

export const RIPADO_PRODUCTS: RipadoProduct[] = getLiveRipadoProducts();

export function getLiveRipadoPerfilProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        [
          '6f1a358c-63c6-4422-8066-d71e5938fbf3',
          '839e7b87-10d8-40d4-8f51-9fd294252b42',
          'cat_ripado_poliestireno',
          'cat_ripado_mdf',
        ],
        ['RIPADO POLIESTIRENO', 'RIPADO MDF']
      ) &&
      (p.name.toLowerCase().includes('acabamento') || p.name.toLowerCase().includes('perfil'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const RIPADO_PERFIL_PRODUCTS: string[] = getLiveRipadoPerfilProducts();

export function getLiveRipadoColaProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['cat_cola_ripado', 'cat_adesivo_ripado'],
        ['COLA PARA RIPADO', 'COLAS PARA RIPADO', 'ADESIVO PARA RIPADO']
      )
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const RIPADO_COLA_PRODUCTS: string[] = getLiveRipadoColaProducts();

// ==========================================
// 5. MANTA HOSPITALAR
// ==========================================
export function getLiveMantaProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['83c3e2f0-dfa2-4e09-a233-ce0222b78d3b', 'cat_manta_hospitalar'],
        ['MANTA HOSPITALAR', 'MANTAS HOSPITALARES']
      ) &&
      !p.name.toLowerCase().includes('cordão') &&
      !p.name.toLowerCase().includes('cordao') &&
      !p.name.toLowerCase().includes('suporte') &&
      !p.name.toLowerCase().includes('canto') &&
      !p.name.toLowerCase().includes('arremate') &&
      !p.name.toLowerCase().includes('perfil')
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const MANTA_PRODUCTS: string[] = getLiveMantaProducts();

export function getLiveCordaoProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['83c3e2f0-dfa2-4e09-a233-ce0222b78d3b', 'cat_manta_hospitalar'],
        ['MANTA HOSPITALAR', 'MANTAS HOSPITALARES']
      ) &&
      (p.name.toLowerCase().includes('cordão') || p.name.toLowerCase().includes('cordao') || p.name.toLowerCase().includes('solda'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const CORDAO_PRODUCTS: string[] = getLiveCordaoProducts();

export function getLiveSuporteCantoProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['83c3e2f0-dfa2-4e09-a233-ce0222b78d3b', 'cat_manta_hospitalar'],
        ['MANTA HOSPITALAR', 'MANTAS HOSPITALARES']
      ) &&
      (p.name.toLowerCase().includes('suporte') || p.name.toLowerCase().includes('canto curvo'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const SUPORTE_CANTO_PRODUCTS: string[] = getLiveSuporteCantoProducts();

export function getLivePerfilArremateMantaProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['83c3e2f0-dfa2-4e09-a233-ce0222b78d3b', 'cat_manta_hospitalar'],
        ['MANTA HOSPITALAR', 'MANTAS HOSPITALARES']
      ) &&
      (p.name.toLowerCase().includes('arremate') || p.name.toLowerCase().includes('perfil'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const PERFIL_ARREMATE_PRODUCTS: string[] = getLivePerfilArremateMantaProducts();

// ==========================================
// 6. INSUMOS DE INSTALAÇÃO
// ==========================================
export interface AutonivelanteProduct {
  name: string;
  yieldM2PerBag: number;
}

export function getLiveAutonivelanteProducts(): AutonivelanteProduct[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter((p) =>
      isProductInTargetCategory(
        p,
        ['49e104a4-8b26-4902-97cf-2394b3f4c27c', 'cat_autonivelantes'],
        ['AUTONIVELANTES E MASSAS', 'AUTONIVELANTES', 'AUTONIVELANTE']
      )
    );
    if (matches.length > 0) {
      return matches.map((p) => ({
        name: p.name,
        yieldM2PerBag: 5.0,
      }));
    }
  } catch {}
  return [];
}

export const AUTONIVELANTE_CATALOG: AutonivelanteProduct[] = getLiveAutonivelanteProducts();
export const AUTONIVELANTE_PRODUCTS: string[] = AUTONIVELANTE_CATALOG.map((p) => p.name);

export function getLivePrimer18LProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['7aa1fd4b-f99d-48e0-9a76-f3ccacd2b2e8', 'cat_primers'],
          ['PRIMERS', 'PRIMER']
        ) && (p.name.includes('18') || p.name.toLowerCase().includes('18l') || p.name.toLowerCase().includes('18 l'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const PRIMER_18L_PRODUCTS: string[] = getLivePrimer18LProducts();

export function getLivePrimer36LProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['7aa1fd4b-f99d-48e0-9a76-f3ccacd2b2e8', 'cat_primers'],
          ['PRIMERS', 'PRIMER']
        ) &&
        (p.name.includes('3,6') ||
          p.name.includes('3.6') ||
          p.name.toLowerCase().includes('3,6l') ||
          p.name.toLowerCase().includes('4kg'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const PRIMER_36L_PRODUCTS: string[] = getLivePrimer36LProducts();

export function getLiveCola18KgProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['6f8094a3-3698-4e50-adbf-f8d5a5262698', 'cat_cola_piso_vinilico'],
          ['COLA PARA PISO VINÍLICO', 'COLA PARA PISO VINILICO', 'COLAS PARA PISO VINÍLICO']
        ) && (p.name.includes('18') || p.name.includes('20') || p.name.includes('23'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const COLA_18KG_PRODUCTS: string[] = getLiveCola18KgProducts();

export function getLiveCola4KgProducts(): string[] {
  try {
    const prods = getOfficialProducts();
    const matches = prods.filter(
      (p) =>
        isProductInTargetCategory(
          p,
          ['6f8094a3-3698-4e50-adbf-f8d5a5262698', 'cat_cola_piso_vinilico'],
          ['COLA PARA PISO VINÍLICO', 'COLA PARA PISO VINILICO', 'COLAS PARA PISO VINÍLICO']
        ) && (p.name.includes('4') || p.name.includes('3,6') || p.name.includes('3.6'))
    );
    if (matches.length > 0) return matches.map((p) => p.name);
  } catch {}
  return [];
}

export const COLA_4KG_PRODUCTS: string[] = getLiveCola4KgProducts();

// ==========================================
// HELPER NUMBERS & OPTIMIZATION FUNCTIONS
// ==========================================
export function formatBRL(val?: number | null, decimals: number = 2): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseBRLNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Optimizes Primer packages (18 L: 175 m² | 3.6 L: 35 m²)
 * to choose combination seeking smallest leftover (menor sobra).
 */
export function calculatePrimer(area: number): {
  primer18Qty: number;
  primer36Qty: number;
} {
  if (area <= 0) return { primer18Qty: 0, primer36Qty: 0 };

  let bestSobra = Infinity;
  let best18 = 0;
  let best36 = 0;

  const max18 = Math.ceil(area / 175) + 1;
  const max36 = Math.ceil(area / 35) + 1;

  for (let n18 = 0; n18 <= max18; n18++) {
    for (let n36 = 0; n36 <= max36; n36++) {
      const coverage = n18 * 175 + n36 * 35;
      if (coverage >= area) {
        const sobra = coverage - area;
        if (sobra < bestSobra) {
          bestSobra = sobra;
          best18 = n18;
          best36 = n36;
        } else if (sobra === bestSobra) {
          if (n18 + n36 < best18 + best36) {
            best18 = n18;
            best36 = n36;
          } else if (n18 + n36 === best18 + best36 && n18 > best18) {
            best18 = n18;
            best36 = n36;
          }
        }
      }
    }
  }

  return { primer18Qty: best18, primer36Qty: best36 };
}

/**
 * Optimizes Cola packages (18 kg: 60 m² | 4 kg: 13 m²)
 * to choose combination seeking smallest leftover (menor sobra).
 */
export function calculateCola(area: number): {
  cola18Qty: number;
  cola4Qty: number;
} {
  if (area <= 0) return { cola18Qty: 0, cola4Qty: 0 };

  let bestSobra = Infinity;
  let best18 = 0;
  let best4 = 0;

  const max18 = Math.ceil(area / 60) + 1;
  const max4 = Math.ceil(area / 13) + 1;

  for (let n18 = 0; n18 <= max18; n18++) {
    for (let n4 = 0; n4 <= max4; n4++) {
      const coverage = n18 * 60 + n4 * 13;
      if (coverage >= area) {
        const sobra = coverage - area;
        if (sobra < bestSobra) {
          bestSobra = sobra;
          best18 = n18;
          best4 = n4;
        } else if (sobra === bestSobra) {
          if (n18 + n4 < best18 + best4) {
            best18 = n18;
            best4 = n4;
          } else if (n18 + n4 === best18 + best4 && n18 > best18) {
            best18 = n18;
            best4 = n4;
          }
        }
      }
    }
  }

  return { cola18Qty: best18, cola4Qty: best4 };
}

/**
 * Optimizes Cola para Rodapé packages (Balde 5 kg | Balde 1.5 kg)
 * Rule: 1 kg covers 8 ml (ml_total / 8 = kgNeeded).
 * Chooses combination seeking smallest leftover (menor sobra em kg).
 * In case of tie, chooses the combination with fewest total packages.
 * Sobra is used ONLY internally to pick the best combination, never shown to user.
 */
export function calculateColaRodape(mlTotal: number): {
  cola5Qty: number;
  cola15Qty: number;
  kgNeeded: number;
  sobraKg: number;
} {
  if (mlTotal <= 0) return { cola5Qty: 0, cola15Qty: 0, kgNeeded: 0, sobraKg: 0 };

  const kgNeeded = mlTotal / 8;
  let bestSobra = Infinity;
  let best5 = 0;
  let best15 = 0;
  let bestPacks = Infinity;

  const max5 = Math.ceil(kgNeeded / 5) + 1;
  const max15 = Math.ceil(kgNeeded / 1.5) + 1;

  for (let n5 = 0; n5 <= max5; n5++) {
    for (let n15 = 0; n15 <= max15; n15++) {
      const provided = n5 * 5 + n15 * 1.5;
      if (provided >= kgNeeded - 1e-6) {
        const sobra = Math.round((provided - kgNeeded) * 1000) / 1000;
        const totalPacks = n5 + n15;
        if (sobra < bestSobra - 1e-6) {
          bestSobra = sobra;
          best5 = n5;
          best15 = n15;
          bestPacks = totalPacks;
        } else if (Math.abs(sobra - bestSobra) < 1e-6) {
          if (totalPacks < bestPacks) {
            bestSobra = sobra;
            best5 = n5;
            best15 = n15;
            bestPacks = totalPacks;
          } else if (totalPacks === bestPacks && n5 > best5) {
            best5 = n5;
            best15 = n15;
          }
        }
      }
    }
  }

  return {
    cola5Qty: best5,
    cola15Qty: best15,
    kgNeeded,
    sobraKg: bestSobra === Infinity ? 0 : bestSobra,
  };
}

/**
 * Calculates Bisnaga (Cola / Fixação / Acabamento):
 * Rule: 1 bisnaga covers 3 ml (ml_total / 3, arredondar para cima).
 */
export function calculateBisnaga(mlTotal: number): {
  bisnagaQty: number;
} {
  if (mlTotal <= 0) return { bisnagaQty: 0 };
  const bisnagaQty = Math.ceil(mlTotal / 3);
  return { bisnagaQty };
}

// ==========================================
// UNIFIED MATERIALS GENERATOR
// ==========================================
export interface PisoState {
  enabled: boolean;
  selectedProduct: string;
  isManualProduct: boolean;
  manualProductName: string;
  installationType: 'colado' | 'clicado';
  incluirInsumosClicado?: boolean;
  areaM2: number;
  m2PerBox: number;
}

export interface RodapeState {
  enabled: boolean;
  selectedProduct: string;
  metroLinear: number;
  barLength?: number;
  selectedColaProduct?: string;
  selectedColaInstalacaoProduct?: string;
  selectedColaAcabamentoProduct?: string;
}

export interface TetoState {
  enabled: boolean;
  selectedProduct: string;
  areaM2: number;
  selectedPerfilProduct: string;
}

export interface RipadoState {
  enabled: boolean;
  selectedProduct: string;
  isManualProduct: boolean;
  manualProductName: string;
  calcMode: 'm2' | 'medidas';
  areaM2: number;
  wallWidthMeters: number;
  wallHeightMeters: number;
  selectedPerfilProduct: string;
  selectedColaProduct: string;
}

export interface MantaState {
  enabled: boolean;
  selectedProduct: string;
  isManualProduct: boolean;
  manualProductName: string;
  areaM2: number;
  metroLinear: number;
}

export function generateAllMaterialRows(
  piso: PisoState,
  rodape: RodapeState,
  teto: TetoState,
  ripado: RipadoState,
  manta: MantaState,
  existingRows?: MaterialRow[]
): MaterialRow[] {
  const rows: MaterialRow[] = [];
  const getExisting = (id: string) => existingRows?.find((r) => r.id === id);

  // Dynamic products directly from CRM
  const livePisoProds = getLivePisoProducts();
  const liveRodapeProds = getLiveRodapeProducts();
  const liveRodapeColaProds = getLiveRodapeColaProducts();
  const liveTetoProds = getLiveTetoProducts();
  const liveTetoPerfilProds = getLiveTetoPerfilProducts();
  const liveRipadoProds = getLiveRipadoProducts();
  const liveRipadoPerfilProds = getLiveRipadoPerfilProducts();
  const liveRipadoColaProds = getLiveRipadoColaProducts();
  const liveMantaProds = getLiveMantaProducts();
  const liveCordaoProds = getLiveCordaoProducts();
  const liveSuporteProds = getLiveSuporteCantoProducts();
  const livePerfilArremateProds = getLivePerfilArremateMantaProducts();
  const liveAutoCatalog = getLiveAutonivelanteProducts();
  const liveAutoProds = liveAutoCatalog.map((p) => p.name);
  const liveP18Prods = getLivePrimer18LProducts();
  const liveP36Prods = getLivePrimer36LProducts();
  const liveC18Prods = getLiveCola18KgProducts();
  const liveC4Prods = getLiveCola4KgProducts();

  // ----------------------------------------------------
  // 1. PISO VINÍLICO E INSUMOS
  // ----------------------------------------------------
  if (piso.enabled) {
    const hasPisoProds = livePisoProds.length > 0;
    const effectivePisoName = piso.isManualProduct
      ? piso.manualProductName.trim() || 'Piso Vinílico Personalizado'
      : hasPisoProds
      ? (piso.selectedProduct && livePisoProds.some((p) => p.name === piso.selectedProduct)
          ? piso.selectedProduct
          : livePisoProds[0].name)
      : NO_PRODUCTS_LABEL;

    const m2Box = piso.m2PerBox > 0 ? piso.m2PerBox : 3.34;
    const boxes = Math.ceil(piso.areaM2 / m2Box);
    const totalM2Calc = boxes * m2Box;

    const prevPiso = getExisting('mat_piso_prod');
    rows.push({
      id: 'mat_piso_prod',
      typeKey: 'piso',
      included: hasPisoProds ? (prevPiso ? prevPiso.included : true) : false,
      selectedProduct: effectivePisoName,
      productOptions: hasPisoProds ? livePisoProds.map((p) => p.name) : [NO_PRODUCTS_LABEL],
      quantity: prevPiso?.isCustomQuantity ? prevPiso.quantity : String(boxes),
      unit: 'caixas',
      isCustomQuantity: prevPiso?.isCustomQuantity,
    });

    const shouldCalculateInsumos =
      piso.installationType === 'colado' ||
      (piso.installationType === 'clicado' && piso.incluirInsumosClicado);

    if (shouldCalculateInsumos) {
      // Autonivelante (Fórmula: m² informado * 0,255 arredondar para cima)
      // REGRA OBRIGATÓRIA: Usar piso.areaM2 (m² informado) e NUNCA totalM2Calc
      if (liveAutoProds.length > 0) {
        const prevAuto = getExisting('mat_piso_autonivelante');
        const selectedAutoProd =
          prevAuto?.selectedProduct && liveAutoProds.includes(prevAuto.selectedProduct)
            ? prevAuto.selectedProduct
            : liveAutoProds[0];
        const autoBags =
          piso.areaM2 > 0 ? Math.ceil(piso.areaM2 * 0.255) : 0;

        rows.push({
          id: 'mat_piso_autonivelante',
          typeKey: 'piso_autonivelante',
          included: prevAuto ? prevAuto.included : true,
          selectedProduct: selectedAutoProd,
          productOptions: liveAutoProds,
          quantity: prevAuto?.isCustomQuantity ? prevAuto.quantity : String(autoBags),
          unit: 'sacos',
          isCustomQuantity: prevAuto?.isCustomQuantity,
        });
      }

      // Primer (menor sobra calculada internamente sobre m² informado piso.areaM2)
      const { primer18Qty, primer36Qty } = calculatePrimer(piso.areaM2);
      const prevP18 = getExisting('mat_piso_primer_18');
      const prevP36 = getExisting('mat_piso_primer_36');

      if (liveP18Prods.length > 0 && (primer18Qty > 0 || prevP18?.isCustomQuantity)) {
        rows.push({
          id: 'mat_piso_primer_18',
          typeKey: 'piso_primer_18',
          included: prevP18 ? prevP18.included : true,
          selectedProduct:
            prevP18?.selectedProduct && liveP18Prods.includes(prevP18.selectedProduct)
              ? prevP18.selectedProduct
              : liveP18Prods[0],
          productOptions: liveP18Prods,
          quantity: prevP18?.isCustomQuantity ? prevP18.quantity : String(primer18Qty),
          unit: 'baldes',
          isCustomQuantity: prevP18?.isCustomQuantity,
        });
      }

      if (liveP36Prods.length > 0 && (primer36Qty > 0 || prevP36?.isCustomQuantity)) {
        rows.push({
          id: 'mat_piso_primer_36',
          typeKey: 'piso_primer_36',
          included: prevP36 ? prevP36.included : true,
          selectedProduct:
            prevP36?.selectedProduct && liveP36Prods.includes(prevP36.selectedProduct)
              ? prevP36.selectedProduct
              : liveP36Prods[0],
          productOptions: liveP36Prods,
          quantity: prevP36?.isCustomQuantity ? prevP36.quantity : String(primer36Qty),
          unit: 'baldes',
          isCustomQuantity: prevP36?.isCustomQuantity,
        });
      }

      // Cola Piso Vinílico (apenas para instalação colada, clicado não utiliza adesivo)
      if (piso.installationType === 'colado') {
        const { cola18Qty, cola4Qty } = calculateCola(piso.areaM2);
        const prevC18 = getExisting('mat_piso_cola_18');
        const prevC4 = getExisting('mat_piso_cola_4');

        if (liveC18Prods.length > 0 && (cola18Qty > 0 || prevC18?.isCustomQuantity)) {
          rows.push({
            id: 'mat_piso_cola_18',
            typeKey: 'piso_cola_18',
            included: prevC18 ? prevC18.included : true,
            selectedProduct:
              prevC18?.selectedProduct && liveC18Prods.includes(prevC18.selectedProduct)
                ? prevC18.selectedProduct
                : liveC18Prods[0],
            productOptions: liveC18Prods,
            quantity: prevC18?.isCustomQuantity ? prevC18.quantity : String(cola18Qty),
            unit: 'baldes',
            isCustomQuantity: prevC18?.isCustomQuantity,
          });
        }

        if (liveC4Prods.length > 0 && (cola4Qty > 0 || prevC4?.isCustomQuantity)) {
          rows.push({
            id: 'mat_piso_cola_4',
            typeKey: 'piso_cola_4',
            included: prevC4 ? prevC4.included : true,
            selectedProduct:
              prevC4?.selectedProduct && liveC4Prods.includes(prevC4.selectedProduct)
                ? prevC4.selectedProduct
                : liveC4Prods[0],
            productOptions: liveC4Prods,
            quantity: prevC4?.isCustomQuantity ? prevC4.quantity : String(cola4Qty),
            unit: 'baldes',
            isCustomQuantity: prevC4?.isCustomQuantity,
          });
        }
      }
    }
  }

  // ----------------------------------------------------
  // 2. RODAPÉ
  // ----------------------------------------------------
  if (rodape.enabled) {
    const hasRodapeProds = liveRodapeProds.length > 0;
    const rodapeObj =
      liveRodapeProds.find((r) => r.name === rodape.selectedProduct) ||
      liveRodapeProds[0];
    const barLength =
      rodape.barLength && rodape.barLength > 0
        ? rodape.barLength
        : rodapeObj?.barLengthMeters || 2.4;
    const barrasCalculadas =
      rodape.metroLinear > 0 ? Math.ceil(rodape.metroLinear / barLength) : 0;
    const mlTotal = barrasCalculadas * barLength;

    const prevRodape = getExisting('mat_rodape_prod');
    rows.push({
      id: 'mat_rodape_prod',
      typeKey: 'rodape',
      included: hasRodapeProds ? (prevRodape ? prevRodape.included : true) : false,
      selectedProduct: hasRodapeProds
        ? (rodape.selectedProduct && liveRodapeProds.some((r) => r.name === rodape.selectedProduct)
            ? rodape.selectedProduct
            : liveRodapeProds[0].name)
        : NO_PRODUCTS_LABEL,
      productOptions: hasRodapeProds ? liveRodapeProds.map((r) => r.name) : [NO_PRODUCTS_LABEL],
      quantity: prevRodape?.isCustomQuantity ? prevRodape.quantity : String(barrasCalculadas),
      unit: 'barras',
      isCustomQuantity: prevRodape?.isCustomQuantity,
    });

    // Cola Rodapé (Otimização Menor Sobra para Balde 5kg e 1,5kg calculada internamente)
    // Fórmula: mlTotal / 8 = kg de cola necessária
    const { cola5Qty, cola15Qty } = calculateColaRodape(mlTotal);
    const liveC5Prods = getLiveRodapeCola5KgProducts();
    const liveC15Prods = getLiveRodapeCola15KgProducts();
    const liveBisnagas = getLiveRodapeBisnagaProducts();
    const prevC5 =
      getExisting('mat_rodape_cola_5') ||
      getExisting('mat_rodape_cola_inst') ||
      getExisting('mat_rodape_cola');
    const prevC15 = getExisting('mat_rodape_cola_15');

    // Balde 5 kg
    if (liveC5Prods.length > 0 && (cola5Qty > 0 || prevC5?.isCustomQuantity)) {
      rows.push({
        id: 'mat_rodape_cola_5',
        typeKey: 'rodape_cola_5',
        included: prevC5 ? prevC5.included : true,
        selectedProduct:
          prevC5?.selectedProduct && liveC5Prods.includes(prevC5.selectedProduct)
            ? prevC5.selectedProduct
            : liveC5Prods[0],
        productOptions: liveC5Prods,
        quantity: prevC5?.isCustomQuantity ? prevC5.quantity : String(cola5Qty),
        unit: 'baldes',
        isCustomQuantity: prevC5?.isCustomQuantity,
      });
    }

    // Balde 1,5 kg (IMPORTANTE: Nunca duplicar linha; se forem 2 baldes, quantidade = 2)
    if (liveC15Prods.length > 0 && (cola15Qty > 0 || prevC15?.isCustomQuantity)) {
      rows.push({
        id: 'mat_rodape_cola_15',
        typeKey: 'rodape_cola_15',
        included: prevC15 ? prevC15.included : true,
        selectedProduct:
          prevC15?.selectedProduct && liveC15Prods.includes(prevC15.selectedProduct)
            ? prevC15.selectedProduct
            : liveC15Prods[0],
        productOptions: liveC15Prods,
        quantity: prevC15?.isCustomQuantity ? prevC15.quantity : String(cola15Qty),
        unit: 'baldes',
        isCustomQuantity: prevC15?.isCustomQuantity,
      });
    }

    // Bisnaga / Selante (Fórmula: mlTotal / 3, arredondar para cima)
    const { bisnagaQty } = calculateBisnaga(mlTotal);
    const prevBisnaga =
      getExisting('mat_rodape_bisnaga') || getExisting('mat_rodape_cola_acab');

    if (liveBisnagas.length > 0 && (bisnagaQty > 0 || prevBisnaga?.isCustomQuantity)) {
      rows.push({
        id: 'mat_rodape_bisnaga',
        typeKey: 'rodape_bisnaga',
        included: prevBisnaga ? prevBisnaga.included : true,
        selectedProduct:
          prevBisnaga?.selectedProduct && liveBisnagas.includes(prevBisnaga.selectedProduct)
            ? prevBisnaga.selectedProduct
            : liveBisnagas[0],
        productOptions: liveBisnagas,
        quantity: prevBisnaga?.isCustomQuantity ? prevBisnaga.quantity : String(bisnagaQty),
        unit: 'bisnagas',
        isCustomQuantity: prevBisnaga?.isCustomQuantity,
      });
    }
  }

  // ----------------------------------------------------
  // 3. TETO VINÍLICO
  // ----------------------------------------------------
  if (teto.enabled) {
    const hasTetoProds = liveTetoProds.length > 0;
    const reguas = teto.areaM2 > 0 ? Math.ceil(teto.areaM2 / 1.19) : 0;
    const perfisBarras = teto.areaM2 > 0 ? Math.ceil((Math.sqrt(teto.areaM2) * 4) / 3) : 0;

    const prevTeto = getExisting('mat_teto_prod');
    rows.push({
      id: 'mat_teto_prod',
      typeKey: 'teto',
      included: hasTetoProds ? (prevTeto ? prevTeto.included : true) : false,
      selectedProduct: hasTetoProds
        ? (teto.selectedProduct && liveTetoProds.includes(teto.selectedProduct)
            ? teto.selectedProduct
            : liveTetoProds[0])
        : NO_PRODUCTS_LABEL,
      productOptions: hasTetoProds ? liveTetoProds : [NO_PRODUCTS_LABEL],
      quantity: prevTeto?.isCustomQuantity ? prevTeto.quantity : String(reguas),
      unit: 'réguas',
      isCustomQuantity: prevTeto?.isCustomQuantity,
    });

    if (liveTetoPerfilProds.length > 0) {
      const prevPerfilTeto = getExisting('mat_teto_perfil');
      rows.push({
        id: 'mat_teto_perfil',
        typeKey: 'teto_perfil',
        included: prevPerfilTeto ? prevPerfilTeto.included : true,
        selectedProduct:
          teto.selectedPerfilProduct && liveTetoPerfilProds.includes(teto.selectedPerfilProduct)
            ? teto.selectedPerfilProduct
            : prevPerfilTeto?.selectedProduct &&
              liveTetoPerfilProds.includes(prevPerfilTeto.selectedProduct)
            ? prevPerfilTeto.selectedProduct
            : liveTetoPerfilProds[0],
        productOptions: liveTetoPerfilProds,
        quantity: prevPerfilTeto?.isCustomQuantity
          ? prevPerfilTeto.quantity
          : String(perfisBarras > 0 ? perfisBarras : 4),
        unit: 'barras',
        isCustomQuantity: prevPerfilTeto?.isCustomQuantity,
      });
    }
  }

  // ----------------------------------------------------
  // 4. RIPADO
  // ----------------------------------------------------
  if (ripado.enabled) {
    const hasRipadoProds = liveRipadoProds.length > 0;
    const ripadoObj =
      liveRipadoProds.find((r) => r.name === ripado.selectedProduct) ||
      liveRipadoProds[0];
    const barArea = ripadoObj ? ripadoObj.barLengthMeters * ripadoObj.barWidthMeters : 0.34;

    let calculatedBars = 0;
    if (ripadoObj && barArea > 0) {
      if (ripado.calcMode === 'm2') {
        calculatedBars = ripado.areaM2 > 0 ? Math.ceil(ripado.areaM2 / barArea) : 0;
      } else {
        if (ripado.wallWidthMeters > 0) {
          calculatedBars = Math.ceil(ripado.wallWidthMeters / ripadoObj.barWidthMeters);
          if (ripado.wallHeightMeters > ripadoObj.barLengthMeters) {
            calculatedBars *= Math.ceil(ripado.wallHeightMeters / ripadoObj.barLengthMeters);
          }
        }
      }
    }

    const effectiveRipadoName = ripado.isManualProduct
      ? ripado.manualProductName.trim() || 'Painel Ripado Personalizado'
      : hasRipadoProds
      ? (ripado.selectedProduct && liveRipadoProds.some((r) => r.name === ripado.selectedProduct)
          ? ripado.selectedProduct
          : liveRipadoProds[0].name)
      : NO_PRODUCTS_LABEL;

    const prevRipado = getExisting('mat_ripado_prod');
    rows.push({
      id: 'mat_ripado_prod',
      typeKey: 'ripado',
      included: hasRipadoProds ? (prevRipado ? prevRipado.included : true) : false,
      selectedProduct: effectiveRipadoName,
      productOptions: hasRipadoProds ? liveRipadoProds.map((r) => r.name) : [NO_PRODUCTS_LABEL],
      quantity: prevRipado?.isCustomQuantity ? prevRipado.quantity : String(calculatedBars),
      unit: 'barras',
      isCustomQuantity: prevRipado?.isCustomQuantity,
    });

    if (liveRipadoPerfilProds.length > 0) {
      const prevPerfilRip = getExisting('mat_ripado_perfil');
      rows.push({
        id: 'mat_ripado_perfil',
        typeKey: 'ripado_perfil',
        included: prevPerfilRip ? prevPerfilRip.included : true,
        selectedProduct:
          ripado.selectedPerfilProduct &&
          liveRipadoPerfilProds.includes(ripado.selectedPerfilProduct)
            ? ripado.selectedPerfilProduct
            : prevPerfilRip?.selectedProduct &&
              liveRipadoPerfilProds.includes(prevPerfilRip.selectedProduct)
            ? prevPerfilRip.selectedProduct
            : liveRipadoPerfilProds[0],
        productOptions: liveRipadoPerfilProds,
        quantity: prevPerfilRip?.isCustomQuantity
          ? prevPerfilRip.quantity
          : String(Math.max(2, Math.ceil(calculatedBars / 10))),
        unit: 'barras',
        isCustomQuantity: prevPerfilRip?.isCustomQuantity,
      });
    }

    if (liveRipadoColaProds.length > 0) {
      const colaRipadoTubos = calculatedBars > 0 ? Math.ceil(calculatedBars / 3) : 0;
      const prevColaRip = getExisting('mat_ripado_cola');
      rows.push({
        id: 'mat_ripado_cola',
        typeKey: 'ripado_cola',
        included: prevColaRip ? prevColaRip.included : true,
        selectedProduct:
          ripado.selectedColaProduct && liveRipadoColaProds.includes(ripado.selectedColaProduct)
            ? ripado.selectedColaProduct
            : prevColaRip?.selectedProduct &&
              liveRipadoColaProds.includes(prevColaRip.selectedProduct)
            ? prevColaRip.selectedProduct
            : liveRipadoColaProds[0],
        productOptions: liveRipadoColaProds,
        quantity: prevColaRip?.isCustomQuantity
          ? prevColaRip.quantity
          : String(colaRipadoTubos),
        unit: 'tubos',
        isCustomQuantity: prevColaRip?.isCustomQuantity,
      });
    }
  }

  // ----------------------------------------------------
  // 5. MANTA HOSPITALAR
  // ----------------------------------------------------
  if (manta.enabled) {
    const hasMantaProds = liveMantaProds.length > 0;
    const effectiveMantaName = manta.isManualProduct
      ? manta.manualProductName.trim() || 'Manta Hospitalar Personalizada'
      : hasMantaProds
      ? (manta.selectedProduct && liveMantaProds.includes(manta.selectedProduct)
          ? manta.selectedProduct
          : liveMantaProds[0])
      : NO_PRODUCTS_LABEL;

    const prevManta = getExisting('mat_manta_prod');
    rows.push({
      id: 'mat_manta_prod',
      typeKey: 'manta',
      included: hasMantaProds ? (prevManta ? prevManta.included : true) : false,
      selectedProduct: effectiveMantaName,
      productOptions: hasMantaProds ? liveMantaProds : [NO_PRODUCTS_LABEL],
      quantity: prevManta?.isCustomQuantity ? prevManta.quantity : formatBRL(manta.areaM2, 2),
      unit: 'm²',
      isCustomQuantity: prevManta?.isCustomQuantity,
    });

    // Autonivelante
    if (liveAutoProds.length > 0) {
      const prevAutoM = getExisting('mat_manta_autonivelante');
      const selectedAutoMProd =
        prevAutoM?.selectedProduct && liveAutoProds.includes(prevAutoM.selectedProduct)
          ? prevAutoM.selectedProduct
          : liveAutoProds[0];
      const autoMBags =
        manta.areaM2 > 0 ? Math.ceil(manta.areaM2 * 0.255) : 0;

      rows.push({
        id: 'mat_manta_autonivelante',
        typeKey: 'manta_autonivelante',
        included: prevAutoM ? prevAutoM.included : true,
        selectedProduct: selectedAutoMProd,
        productOptions: liveAutoProds,
        quantity: prevAutoM?.isCustomQuantity ? prevAutoM.quantity : String(autoMBags),
        unit: 'sacos',
        isCustomQuantity: prevAutoM?.isCustomQuantity,
      });
    }

    // Primer (menor sobra)
    const { primer18Qty, primer36Qty } = calculatePrimer(manta.areaM2);
    const prevMantaP18 = getExisting('mat_manta_primer_18');
    const prevMantaP36 = getExisting('mat_manta_primer_36');

    if (liveP18Prods.length > 0 && (primer18Qty > 0 || prevMantaP18?.isCustomQuantity || (manta.areaM2 === 0 && !prevMantaP36))) {
      rows.push({
        id: 'mat_manta_primer_18',
        typeKey: 'manta_primer_18',
        included: prevMantaP18 ? prevMantaP18.included : true,
        selectedProduct:
          prevMantaP18?.selectedProduct && liveP18Prods.includes(prevMantaP18.selectedProduct)
            ? prevMantaP18.selectedProduct
            : liveP18Prods[0],
        productOptions: liveP18Prods,
        quantity: prevMantaP18?.isCustomQuantity ? prevMantaP18.quantity : String(primer18Qty),
        unit: 'baldes',
        isCustomQuantity: prevMantaP18?.isCustomQuantity,
      });
    }

    if (liveP36Prods.length > 0 && (primer36Qty > 0 || prevMantaP36?.isCustomQuantity)) {
      rows.push({
        id: 'mat_manta_primer_36',
        typeKey: 'manta_primer_36',
        included: prevMantaP36 ? prevMantaP36.included : true,
        selectedProduct:
          prevMantaP36?.selectedProduct && liveP36Prods.includes(prevMantaP36.selectedProduct)
            ? prevMantaP36.selectedProduct
            : liveP36Prods[0],
        productOptions: liveP36Prods,
        quantity: prevMantaP36?.isCustomQuantity ? prevMantaP36.quantity : String(primer36Qty),
        unit: 'baldes',
        isCustomQuantity: prevMantaP36?.isCustomQuantity,
      });
    }

    // Cola (menor sobra)
    const { cola18Qty, cola4Qty } = calculateCola(manta.areaM2);
    const prevMantaC18 = getExisting('mat_manta_cola_18');
    const prevMantaC4 = getExisting('mat_manta_cola_4');

    if (liveC18Prods.length > 0 && (cola18Qty > 0 || prevMantaC18?.isCustomQuantity || (manta.areaM2 === 0 && !prevMantaC4))) {
      rows.push({
        id: 'mat_manta_cola_18',
        typeKey: 'manta_cola_18',
        included: prevMantaC18 ? prevMantaC18.included : true,
        selectedProduct:
          prevMantaC18?.selectedProduct && liveC18Prods.includes(prevMantaC18.selectedProduct)
            ? prevMantaC18.selectedProduct
            : liveC18Prods[0],
        productOptions: liveC18Prods,
        quantity: prevMantaC18?.isCustomQuantity ? prevMantaC18.quantity : String(cola18Qty),
        unit: 'baldes',
        isCustomQuantity: prevMantaC18?.isCustomQuantity,
      });
    }

    if (liveC4Prods.length > 0 && (cola4Qty > 0 || prevMantaC4?.isCustomQuantity)) {
      rows.push({
        id: 'mat_manta_cola_4',
        typeKey: 'manta_cola_4',
        included: prevMantaC4 ? prevMantaC4.included : true,
        selectedProduct:
          prevMantaC4?.selectedProduct && liveC4Prods.includes(prevMantaC4.selectedProduct)
            ? prevMantaC4.selectedProduct
            : liveC4Prods[0],
        productOptions: liveC4Prods,
        quantity: prevMantaC4?.isCustomQuantity ? prevMantaC4.quantity : String(cola4Qty),
        unit: 'baldes',
        isCustomQuantity: prevMantaC4?.isCustomQuantity,
      });
    }

    // Cordão de Solda (pertencente a Manta Hospitalar)
    if (liveCordaoProds.length > 0) {
      const prevCordao = getExisting('mat_manta_cordao');
      rows.push({
        id: 'mat_manta_cordao',
        typeKey: 'manta_cordao',
        included: prevCordao ? prevCordao.included : true,
        selectedProduct:
          prevCordao?.selectedProduct && liveCordaoProds.includes(prevCordao.selectedProduct)
            ? prevCordao.selectedProduct
            : liveCordaoProds[0],
        productOptions: liveCordaoProds,
        quantity: prevCordao?.isCustomQuantity
          ? prevCordao.quantity
          : formatBRL(manta.metroLinear, 2),
        unit: 'metros',
        isCustomQuantity: prevCordao?.isCustomQuantity,
      });
    }

    // Suporte Canto Curvo (pertencente a Manta Hospitalar)
    if (liveSuporteProds.length > 0) {
      const prevSuporte = getExisting('mat_manta_suporte');
      rows.push({
        id: 'mat_manta_suporte',
        typeKey: 'manta_suporte',
        included: prevSuporte ? prevSuporte.included : true,
        selectedProduct:
          prevSuporte?.selectedProduct && liveSuporteProds.includes(prevSuporte.selectedProduct)
            ? prevSuporte.selectedProduct
            : liveSuporteProds[0],
        productOptions: liveSuporteProds,
        quantity: prevSuporte?.isCustomQuantity
          ? prevSuporte.quantity
          : formatBRL(manta.metroLinear, 2),
        unit: 'metros',
        isCustomQuantity: prevSuporte?.isCustomQuantity,
      });
    }

    // Perfil de Arremate (pertencente a Manta Hospitalar)
    if (livePerfilArremateProds.length > 0) {
      const prevPerfilManta = getExisting('mat_manta_perfil');
      rows.push({
        id: 'mat_manta_perfil',
        typeKey: 'manta_perfil',
        included: prevPerfilManta ? prevPerfilManta.included : true,
        selectedProduct:
          prevPerfilManta?.selectedProduct &&
          livePerfilArremateProds.includes(prevPerfilManta.selectedProduct)
            ? prevPerfilManta.selectedProduct
            : livePerfilArremateProds[0],
        productOptions: livePerfilArremateProds,
        quantity: prevPerfilManta?.isCustomQuantity
          ? prevPerfilManta.quantity
          : formatBRL(manta.metroLinear, 2),
        unit: 'metros',
        isCustomQuantity: prevPerfilManta?.isCustomQuantity,
      });
    }
  }

  // Deduplicação garantida: impede linhas duplicadas ou com mesmo ID
  const dedupedRows: MaterialRow[] = [];
  const seenIds = new Set<string>();
  for (const r of rows) {
    if (seenIds.has(r.id)) continue;
    seenIds.add(r.id);
    dedupedRows.push(r);
  }

  return dedupedRows;
}
