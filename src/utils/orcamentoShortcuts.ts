import {
  CatalogProduct,
  getDynamicProductCatalog,
  getOfficialCategories,
  getOfficialProducts,
  getProductTierPrice,
  safeParsePrice,
} from '../data/productCatalog';
import { GroupProductItem, ProductCategory } from '../data/initialProductsSeed';
import { saveItemToSupabase } from './supabaseClient';

export interface UserProductShortcut {
  id: string;
  name: string;
  category: string;
  unit: string;
  count: number;
  lastUsed: number;
}

export interface UserCategoryShortcut {
  id: string;
  name: string;
  count: number;
}

interface StoredUsageMap {
  [key: string]: {
    productId?: string;
    productName: string;
    categoryName?: string;
    count: number;
    lastUsed: number;
  };
}

const getUsageStorageKey = (userName?: string): string => {
  const cleanUser = (userName || 'default')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `fenix_user_product_usage_${cleanUser}`;
};

/**
 * Normaliza strings para comparação segura de nomes e categorias
 */
export const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Registra o uso de um produto pelo usuário no orçamento atual
 */
export function recordProductUsage(
  userName: string,
  product: { id?: string; name: string; category?: string }
): void {
  if (typeof window === 'undefined' || !product.name) return;
  try {
    const key = getUsageStorageKey(userName);
    const raw = localStorage.getItem(key);
    const usageMap: StoredUsageMap = raw ? JSON.parse(raw) : {};

    const normName = normalizeText(product.name);
    const existing = usageMap[normName] || {
      productId: product.id,
      productName: product.name,
      categoryName: product.category || 'Geral',
      count: 0,
      lastUsed: Date.now(),
    };

    existing.count = (existing.count || 0) + 1;
    existing.lastUsed = Date.now();
    if (product.id) existing.productId = product.id;
    if (product.category) existing.categoryName = product.category;

    usageMap[normName] = existing;
    localStorage.setItem(key, JSON.stringify(usageMap));
  } catch (err) {
    console.error('Erro ao registrar uso de produto para atalhos:', err);
  }
}

/**
 * Obtém os atalhos reais e dinâmicos específicos do usuário conectado
 * Somente produtos/categorias cadastrados e realmente existentes no catálogo.
 * Se for excluído do catálogo, remove automaticamente dos atalhos.
 * Considera frequência e uso recente no ranking.
 * Não usa exemplos fictícios.
 */
export function getUserShortcuts(userName: string): {
  products: CatalogProduct[];
  categories: UserCategoryShortcut[];
} {
  const catalog = getDynamicProductCatalog();
  const officialCats = getOfficialCategories();

  if (catalog.length === 0 || !userName) {
    return { products: [], categories: [] };
  }

  // 1. Carrega dados de uso do usuário
  let usageEntries: {
    normName: string;
    productId?: string;
    count: number;
    lastUsed: number;
    score: number;
  }[] = [];

  try {
    const key = getUsageStorageKey(userName);
    const raw = localStorage.getItem(key);
    let parsed: StoredUsageMap = raw ? JSON.parse(raw) : {};

    // Se o usuário ainda não tiver registros locais de atalhos, analisa orçamentos reais anteriores deste usuário
    if (Object.keys(parsed).length === 0) {
      try {
        const historyRaw =
          localStorage.getItem('fenix_orcamentos_history') ||
          localStorage.getItem('fenix_saved_orcamentos');
        if (historyRaw) {
          const historyList = JSON.parse(historyRaw);
          if (Array.isArray(historyList) && historyList.length > 0) {
            const userNorm = normalizeText(userName);
            for (const orc of historyList) {
              const orcUser = normalizeText(
                orc.consultoraName || orc.registeredBy || orc.vendedor || orc.usuario || ''
              );
              if (orcUser && (orcUser.includes(userNorm) || userNorm.includes(orcUser))) {
                if (Array.isArray(orc.items)) {
                  for (const it of orc.items) {
                    const desc = it.descricao || it.name || '';
                    if (!desc) continue;
                    const normDesc = normalizeText(desc);
                    const matchedCatalogProd = catalog.find(
                      (p) => normalizeText(p.name) === normDesc || (it.id && p.id === it.id)
                    );
                    if (matchedCatalogProd) {
                      const orcTime = orc.savedAt ? new Date(orc.savedAt).getTime() : Date.now();
                      const existing = parsed[normDesc] || {
                        productId: matchedCatalogProd.id,
                        productName: matchedCatalogProd.name,
                        categoryName: matchedCatalogProd.category,
                        count: 0,
                        lastUsed: orcTime,
                      };
                      existing.count += 1;
                      if (orcTime > existing.lastUsed) existing.lastUsed = orcTime;
                      parsed[normDesc] = existing;
                    }
                  }
                }
              }
            }
            if (Object.keys(parsed).length > 0) {
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        }
      } catch (errHistory) {
        console.error('Erro ao analisar histórico de orçamentos para atalhos:', errHistory);
      }
    }

    if (Object.keys(parsed).length > 0) {
      let needsPrune = false;
      const now = Date.now();

      for (const [normName, val] of Object.entries(parsed)) {
        // Se o produto não existe mais ou foi excluído do catálogo, não mostrar e limpar automaticamente
        const inCatalog = catalog.some(
          (p) => (val.productId && p.id === val.productId) || normalizeText(p.name) === normName
        );

        if (!inCatalog) {
          delete parsed[normName];
          needsPrune = true;
          continue;
        }

        // Pontuação inteligente considerando frequência e uso recente
        const count = val.count || 1;
        const lastUsed = val.lastUsed || now;
        const hoursAgo = Math.max(0, (now - lastUsed) / (1000 * 60 * 60));
        const recencyFactor = 1 / (1 + hoursAgo / 48); // peso maior nas últimas 48h
        const score = count * 3 + recencyFactor * 10;

        usageEntries.push({
          normName,
          productId: val.productId,
          count,
          lastUsed,
          score,
        });
      }

      if (needsPrune) {
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.error('Erro ao ler atalhos do usuário:', err);
  }

  // 2. Atalhos de Produtos do Usuário:
  // Casamos estritamente com produtos que realmente existem no catálogo e foram utilizados pelo usuário
  const matchedProducts: { product: CatalogProduct; score: number }[] = [];

  if (usageEntries.length > 0) {
    // Ordena pelo maior score (frequência + uso recente)
    usageEntries.sort((a, b) => b.score - a.score || b.lastUsed - a.lastUsed);

    for (const item of usageEntries) {
      const found = catalog.find(
        (p) => (item.productId && p.id === item.productId) || normalizeText(p.name) === item.normName
      );
      if (found && !matchedProducts.some((m) => m.product.id === found.id)) {
        matchedProducts.push({
          product: found,
          score: item.score,
        });
      }
    }
  }

  // Se o usuário ainda não tiver utilizado produtos reais, NÃO usamos exemplos fictícios
  // Retorna somente os produtos reais que o usuário utilizou (até 5 produtos)
  const finalProducts = matchedProducts.slice(0, 5).map((m) => m.product);

  // 3. Atalhos de Categorias do Usuário:
  // Mostra automaticamente as categorias reais dos produtos mais utilizados por aquele usuário
  const catUsageScore: Record<string, number> = {};
  for (const item of matchedProducts) {
    const normCat = normalizeText(item.product.category || 'Geral');
    catUsageScore[normCat] = (catUsageScore[normCat] || 0) + (item.score || 1);
  }

  const activeCategories: UserCategoryShortcut[] = officialCats
    .map((cat) => {
      const countInCatalog = catalog.filter(
        (p) => p.categoryId === cat.id || normalizeText(p.category) === normalizeText(cat.name)
      ).length;
      const score = catUsageScore[normalizeText(cat.name)] || 0;
      return {
        id: cat.id,
        name: cat.name,
        count: countInCatalog,
        score,
      };
    })
    // Somente categorias que existem no catálogo E que o usuário realmente utilizou
    .filter((cat) => cat.count > 0 && cat.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.count - a.count;
    });

  return {
    products: finalProducts,
    categories: activeCategories.slice(0, 4),
  };
}

/**
 * Cadastra um novo produto no catálogo e adiciona ao orçamento:
 * - Salva no catálogo oficial (localStorage e Supabase)
 * - Evita duplicidades (se já existir com o mesmo nome, reutiliza o existente)
 * - Retorna o CatalogProduct pronto para ser inserido no orçamento
 */
export async function registerNewProductInCatalog({
  name,
  categoryName,
  unit,
  priceClienteFinal,
  priceRevenda,
  priceConstrutora,
  currentUserName = 'Vanessa Gomes',
}: {
  name: string;
  categoryName: string;
  unit: string;
  priceClienteFinal: number;
  priceRevenda?: number;
  priceConstrutora?: number;
  currentUserName?: string;
}): Promise<{ product: CatalogProduct; isNew: boolean }> {
  const trimmedName = name.trim();
  const normName = normalizeText(trimmedName);

  // 1. Conferir se já existe produto cadastrado com este nome (sem criar duplicados)
  const officialProducts = getOfficialProducts();
  const existingItem = officialProducts.find(
    (p) => normalizeText(p.name) === normName
  );

  if (existingItem) {
    const pCF = safeParsePrice(existingItem.priceClienteFinal) || safeParsePrice(existingItem.price);
    const existingCatalogProd: CatalogProduct = {
      id: existingItem.id,
      name: existingItem.name,
      category: existingItem.categoryName || categoryName || 'Geral',
      categoryId: existingItem.categoryId,
      unit: existingItem.unit || unit || 'un',
      price: pCF,
      priceClienteFinal: pCF,
      priceRevenda: safeParsePrice(existingItem.priceRevenda) || Math.round(pCF * 0.82 * 100) / 100,
      priceConstrutora: safeParsePrice(existingItem.priceConstrutora) || Math.round(pCF * 0.90 * 100) / 100,
      priceDistribuidor: safeParsePrice(existingItem.priceDistribuidor) || Math.round(pCF * 0.78 * 100) / 100,
    };

    recordProductUsage(currentUserName, existingCatalogProd);
    return { product: existingCatalogProd, isNew: false };
  }

  // 2. Garantir ou criar a categoria informada
  const categories = getOfficialCategories();
  const cleanCatName = categoryName.trim() || 'Geral';
  let targetCat = categories.find((c) => normalizeText(c.name) === normalizeText(cleanCatName));

  if (!targetCat) {
    targetCat = {
      id: `cat-${Date.now()}`,
      name: cleanCatName,
    };
    const updatedCats = [...categories, targetCat];
    try {
      localStorage.setItem('fenix_product_categories_data', JSON.stringify(updatedCats));
      saveItemToSupabase('fenix_product_categories_data', targetCat, 'id', currentUserName).catch(() => {});
    } catch {}
  }

  // 3. Montar novo GroupProductItem
  const pCF = priceClienteFinal > 0 ? priceClienteFinal : 0;
  const pRev = priceRevenda !== undefined && priceRevenda > 0 ? priceRevenda : Math.round(pCF * 0.82 * 100) / 100;
  const pConst = priceConstrutora !== undefined && priceConstrutora > 0 ? priceConstrutora : Math.round(pCF * 0.90 * 100) / 100;
  const pDist = Math.round(pRev * 0.95 * 100) / 100;

  const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const cleanUnit = unit.trim() || 'un';

  const newProductItem: GroupProductItem = {
    id: newId,
    name: trimmedName,
    categoryId: targetCat.id,
    categoryName: targetCat.name,
    groupId: targetCat.id,
    unit: cleanUnit,
    priceClienteFinal: pCF,
    priceRevenda: pRev,
    priceConstrutora: pConst,
    priceDistribuidor: pDist,
    price: pCF,
    active: true,
  };

  const updatedProducts = [...officialProducts, newProductItem];
  try {
    localStorage.setItem('fenix_product_items_data', JSON.stringify(updatedProducts));
    saveItemToSupabase('fenix_product_items_data', newProductItem, 'id', currentUserName).catch(() => {});
  } catch (err) {
    console.error('Erro ao salvar novo produto:', err);
  }

  // Notificar outros componentes da aplicação
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fenix_products_updated', { detail: newProductItem }));
  }

  const catalogProd: CatalogProduct = {
    id: newId,
    name: trimmedName,
    category: targetCat.name,
    categoryId: targetCat.id,
    unit: cleanUnit,
    price: pCF,
    priceClienteFinal: pCF,
    priceRevenda: pRev,
    priceConstrutora: pConst,
    priceDistribuidor: pDist,
  };

  // Registra no uso do usuário para entrar nos seus atalhos
  recordProductUsage(currentUserName, catalogProd);

  return { product: catalogProd, isNew: true };
}
