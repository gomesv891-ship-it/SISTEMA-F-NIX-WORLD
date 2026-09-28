export interface ProductCategory {
  id: string;
  name: string;
}

export interface ProductGroup {
  id: string;
  name: string;
  categoryId: string;
  color: string;
}

export interface GroupProductItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  groupId: string;
  groupName?: string;
  unit: string;
  priceClienteFinal: number;
  priceRevenda: number;
  priceConstrutora: number;
  priceDistribuidor?: number;
  price?: number;
  active?: boolean;
}

export {
  OFFICIAL_CATEGORIES as INITIAL_PRODUCT_CATEGORIES,
  OFFICIAL_GROUPS as INITIAL_PRODUCT_GROUPS,
  OFFICIAL_PRODUCTS as INITIAL_PRODUCT_ITEMS,
} from './databaseSeed';
