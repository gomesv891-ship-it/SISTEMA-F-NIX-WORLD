import {
  INITIAL_PRODUCT_CATEGORIES,
  INITIAL_PRODUCT_ITEMS,
  GroupProductItem,
  ProductCategory,
} from './initialProductsSeed';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  unit: string;
  price: number; // Base / Consumidor Final
  priceClienteFinal: number;
  priceRevenda: number;
  priceConstrutora: number;
  priceDistribuidor: number;
  custo?: number; // Custo do produto (salvo separadamente, visão exclusiva da Diretoria)
  defaultSubtitle?: string;
}

/**
 * REGRA OFICIAL FÊNIX WORLD — TIPO DE CLIENTE E TABELA DE PREÇO
 * O Tipo de Cliente determina automaticamente qual tabela de preço deve ser utilizada nos produtos.
 *
 * REGRAS OFICIAIS:
 * - Cliente Final → Preço Cliente Final
 * - Engenheiro → Preço Cliente Final
 * - Arquiteto → Preço Cliente Final
 * - Revenda → Preço Revenda
 * - Instalador → Preço Revenda
 * - Construtora → Preço Construtora
 */
export type OfficialPriceTier = 'Cliente Final' | 'Revenda' | 'Construtora' | 'Distribuidor';

export function getPriceTierFromClientType(
  tierOrClientType?: string
): OfficialPriceTier {
  if (!tierOrClientType) return 'Cliente Final';
  const clean = tierOrClientType.trim().toLowerCase();

  // Construtora → Preço Construtora
  if (clean.includes('construtor') || clean.includes('construtora')) {
    return 'Construtora';
  }

  // Revenda & Instalador → Preço Revenda
  if (
    clean.includes('revenda') ||
    clean.includes('instalador') ||
    clean.includes('instalac') ||
    clean.includes('instalaç')
  ) {
    return 'Revenda';
  }

  // Distribuidor (se presente em cadastros específicos)
  if (clean.includes('distribuidor')) {
    return 'Distribuidor';
  }

  // Cliente Final, Engenheiro, Arquiteto, Consumidor Final → Preço Cliente Final
  return 'Cliente Final';
}

/**
 * Normalizes client type or tier string into standard price tier
 */
export function normalizePriceTier(
  tierOrClientType?: string
): OfficialPriceTier {
  return getPriceTierFromClientType(tierOrClientType);
}

/**
 * Retorna o rótulo oficial da tabela de preço para exibição no sistema
 */
export function getOfficialPriceTableLabel(tierOrClientType?: string): string {
  const tier = getPriceTierFromClientType(tierOrClientType);
  switch (tier) {
    case 'Construtora':
      return 'Preço Construtora';
    case 'Revenda':
      return 'Preço Revenda';
    case 'Distribuidor':
      return 'Preço Distribuidor';
    case 'Cliente Final':
    default:
      return 'Preço Cliente Final';
  }
}

/**
 * Returns all active products directly from the official PRODUTOS database (localStorage).
 * Always reflects live changes made by the user in the PRODUTOS tab!
 */
export function getOfficialProducts(): GroupProductItem[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCT_ITEMS;
  try {
    const raw = localStorage.getItem('fenix_product_items_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((p) => p.active !== false);
      }
    }
  } catch (err) {
    console.error('Erro ao ler produtos do localStorage:', err);
  }
  return INITIAL_PRODUCT_ITEMS;
}

/**
 * Returns all official categories from PRODUTOS database
 */
export function getOfficialCategories(): ProductCategory[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCT_CATEGORIES;
  try {
    const raw = localStorage.getItem('fenix_product_categories_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler categorias do localStorage:', err);
  }
  return INITIAL_PRODUCT_CATEGORIES;
}

/**
 * Safely parses any number, numeric string, or BRL currency string to a clean number
 */
export function safeParsePrice(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (!val) return 0;
  if (typeof val === 'string') {
    const clean = val.replace('R$', '').trim();
    if (clean.includes(',')) {
      const normalized = clean.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(normalized);
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Calculates the exact price for a product according to client type / table tier:
 * - Construtora → aplicar preço da Construtora
 * - Consumidor Final → aplicar preço do Consumidor Final
 * - Revenda → aplicar preço de Revenda
 * - Distribuidor → aplicar preço de Distribuidor
 */
export function getProductTierPrice(
  prod: {
    price?: number | string;
    priceClienteFinal?: number | string;
    priceRevenda?: number | string;
    priceConstrutora?: number | string;
    priceDistribuidor?: number | string;
  },
  tierOrClientType: string = 'Cliente Final'
): number {
  const tier = normalizePriceTier(tierOrClientType);
  const pCF = safeParsePrice(prod.priceClienteFinal);
  const pBase = safeParsePrice(prod.price);
  const baseClienteFinal = pCF > 0 ? pCF : (pBase > 0 ? pBase : 0);

  if (tier === 'Construtora') {
    const pConst = safeParsePrice(prod.priceConstrutora);
    if (pConst > 0) {
      return pConst;
    }
    // Fallback se não configurado
    return Math.round(baseClienteFinal * 0.90 * 100) / 100;
  }

  if (tier === 'Distribuidor') {
    const pDist = safeParsePrice(prod.priceDistribuidor);
    if (pDist > 0) {
      return pDist;
    }
    const pRev = safeParsePrice(prod.priceRevenda);
    if (pRev > 0) {
      return Math.round(pRev * 0.95 * 100) / 100;
    }
    return Math.round(baseClienteFinal * 0.78 * 100) / 100;
  }

  if (tier === 'Revenda') {
    const pRev = safeParsePrice(prod.priceRevenda);
    if (pRev > 0) {
      return pRev;
    }
    return Math.round(baseClienteFinal * 0.82 * 100) / 100;
  }

  // Preço Cliente Final (Cliente Final, Engenheiro, Arquiteto, Consumidor Final)
  return baseClienteFinal;
}

/**
 * Returns dynamic product catalog array mapped for select inputs and search
 */
export function getDynamicProductCatalog(): CatalogProduct[] {
  const officialList = getOfficialProducts();
  const categories = getOfficialCategories();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return officialList.map((item) => {
    const categoryName = item.categoryName || catMap.get(item.categoryId) || 'Geral';
    const pCF = safeParsePrice(item.priceClienteFinal);
    const pBase = safeParsePrice(item.price);
    const priceCF = pCF > 0 ? pCF : (pBase > 0 ? pBase : 0);

    const pRev = safeParsePrice(item.priceRevenda);
    const priceRev = pRev > 0 ? pRev : Math.round(priceCF * 0.82 * 100) / 100;

    const pConst = safeParsePrice(item.priceConstrutora);
    const priceConst = pConst > 0 ? pConst : Math.round(priceCF * 0.90 * 100) / 100;

    const pDist = safeParsePrice(item.priceDistribuidor);
    const priceDist = pDist > 0 ? pDist : Math.round(priceRev * 0.95 * 100) / 100;

    return {
      id: item.id,
      name: item.name,
      category: categoryName,
      categoryId: item.categoryId,
      unit: item.unit || 'unidades',
      price: priceCF,
      priceClienteFinal: priceCF,
      priceRevenda: priceRev,
      priceConstrutora: priceConst,
      priceDistribuidor: priceDist,
    };
  });
}

// Legacy static export compatibility
export const CRM_PRODUCT_CATALOG: CatalogProduct[] = getDynamicProductCatalog();

/**
 * Finds price, category and default unit for a product from the official PRODUTOS database.
 */
export function getProductDetailsFromCatalog(
  productName: string,
  tierOrClientType: string = 'Cliente Final'
): {
  id?: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  defaultSubtitle?: string;
} {
  const cleanName = productName.trim().toLowerCase();
  const catalog = getDynamicProductCatalog();

  // 1. Exact name match
  const exact = catalog.find((p) => p.name.trim().toLowerCase() === cleanName);
  if (exact) {
    return {
      id: exact.id,
      name: exact.name,
      category: exact.category,
      unit: exact.unit,
      price: safeParsePrice(getProductTierPrice(exact, tierOrClientType)),
      defaultSubtitle: exact.defaultSubtitle,
    };
  }

  // 2. Exact match on id
  const byId = catalog.find((p) => p.id === productName);
  if (byId) {
    return {
      id: byId.id,
      name: byId.name,
      category: byId.category,
      unit: byId.unit,
      price: safeParsePrice(getProductTierPrice(byId, tierOrClientType)),
      defaultSubtitle: byId.defaultSubtitle,
    };
  }

  // 3. Partial match
  const partial = catalog.find((p) => {
    const pName = p.name.toLowerCase();
    return cleanName.includes(pName) || pName.includes(cleanName);
  });
  if (partial) {
    return {
      id: partial.id,
      name: partial.name,
      category: partial.category,
      unit: partial.unit,
      price: safeParsePrice(getProductTierPrice(partial, tierOrClientType)),
      defaultSubtitle: partial.defaultSubtitle,
    };
  }

  // 4. Fallback search by words
  const words = cleanName.split(/\s+/).filter((w) => w.length > 3);
  if (words.length > 0) {
    const matchByWords = catalog.find((p) => {
      const pLow = p.name.toLowerCase();
      return words.filter((w) => pLow.includes(w)).length >= 2;
    });
    if (matchByWords) {
      return {
        id: matchByWords.id,
        name: matchByWords.name,
        category: matchByWords.category,
        unit: matchByWords.unit,
        price: safeParsePrice(getProductTierPrice(matchByWords, tierOrClientType)),
        defaultSubtitle: matchByWords.defaultSubtitle,
      };
    }
  }

  return {
    name: productName,
    category: 'Geral',
    unit: 'unidades',
    price: 0,
  };
}
