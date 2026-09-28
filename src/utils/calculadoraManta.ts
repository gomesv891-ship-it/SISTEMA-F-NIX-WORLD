import { MaterialRow } from '../types';

export const MANTA_PRODUCTS = [
  'Manta Hospitalar Tarkett 2,0 mm – Rolo 40 m²',
  'Manta Hospitalar iQ Toro SC Tarkett',
  'Manta Hospitalar Paviflex Arquitetura',
  'Manta Hospitalar Vinílica Eclipse Premium',
];

export const AUTONIVELANTE_PRODUCTS = [
  'Autonivelante PisoFlex',
  'Argamassa Autonivelante Quartzolit 20 kg',
  'Autonivelante Weber Floor Top 20 kg',
];

export const PRIMER_18L_PRODUCTS = [
  'Primer 18 L',
  'Primer Acrílico Quartzolit 18 L',
  'Primer Epóxi Base Água 18 L',
];

export const PRIMER_36L_PRODUCTS = [
  'Primer 3,6 L',
  'Primer Acrílico Quartzolit 3,6 L',
  'Primer Promotor de Aderência 3,6 L',
];

export const COLA_18KG_PRODUCTS = [
  'Cola para Vinílico 18 kg',
  'Adesivo Acrílico Globalfix 18 kg',
  'Cola Piso Vinílico Mapei 18 kg',
];

export const COLA_4KG_PRODUCTS = [
  'Cola para Piso Vinílico 4 kg',
  'Adesivo Acrílico Globalfix 4 kg',
  'Cola Piso Vinílico Mapei 4 kg',
];

export const CORDAO_PRODUCTS = [
  'Cordão de Solda',
  'Cordão de Solda Térmica Tarkett 4 mm',
  'Cordão de Solda Vinílica Flexível',
];

export const SUPORTE_CANTO_PRODUCTS = [
  'Suporte Canto Curvo',
  'Suporte Canto Curvo PVC 25 mm',
  'Canto Curvo Hospitalar Flexível',
];

export const PERFIL_ARREMATE_PRODUCTS = [
  'Perfil de Arremate',
  'Perfil de Arremate Alumínio Anodizado',
  'Perfil de Arremate Vinílico Flexível',
];

/**
 * Optimizes Primer packages (18 L with 175 m² and 3.6 L with 35 m²)
 * to minimize leftover (menor sobra).
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
          // If sobra is tied, pick fewer total containers, favoring 18L
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
 * Optimizes Cola packages (18 kg with 60 m² and 4 kg with 13 m²)
 * to choose the best combination seeking the smallest sobra.
 */
export function calculateCola(area: number): {
  cola18Qty: number;
  cola4Qty: number;
} {
  if (area <= 0) return { cola18Qty: 0, cola4Qty: 0 };

  // Option 1: all 18kg buckets
  const all18Qty = Math.ceil(area / 60);
  const all18Coverage = all18Qty * 60;
  const all18Sobra = all18Coverage - area;

  // Option 2: base 18kg buckets + 4kg complement
  const base18Qty = Math.floor(area / 60);
  const rem = area - base18Qty * 60;
  const comp4Qty = rem > 0 ? Math.ceil(rem / 13) : 0;
  const compCoverage = base18Qty * 60 + comp4Qty * 13;
  const compSobra = compCoverage - area;

  // Option 3: all 4kg if area is small
  const all4Qty = Math.ceil(area / 13);
  const all4Coverage = all4Qty * 13;
  const all4Sobra = all4Coverage - area;

  let best18 = all18Qty;
  let best4 = 0;

  if (compSobra < all18Sobra && comp4Qty > 0) {
    best18 = base18Qty;
    best4 = comp4Qty;
  }

  if (area < 50 && all4Sobra < all18Sobra && all4Sobra < compSobra) {
    best18 = 0;
    best4 = all4Qty;
  }

  return { cola18Qty: best18, cola4Qty: best4 };
}

export function formatBRLNumber(val?: number | null, decimals: number = 2): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Generates the material rows for Manta Hospitalar based on area and metroLinear.
 */
export function generateMantaMaterialRows(
  area: number,
  metroLinear: number,
  selectedMantaProduct?: string,
  existingRows?: MaterialRow[]
): MaterialRow[] {
  const rows: MaterialRow[] = [];

  // 1. Manta Hospitalar
  const prevManta = existingRows?.find((r) => r.typeKey === 'manta');
  rows.push({
    id: 'mat_manta',
    typeKey: 'manta',
    included: prevManta ? prevManta.included : true,
    selectedProduct:
      selectedMantaProduct ||
      prevManta?.selectedProduct ||
      MANTA_PRODUCTS[0],
    productOptions: MANTA_PRODUCTS,
    quantity: formatBRLNumber(area > 0 ? area : 176, 2),
    unit: 'm²',
  });

  // 2. Autonivelante
  // Rule: Do not invent quantity until a rule exists -> display '—'
  const prevAuto = existingRows?.find((r) => r.typeKey === 'autonivelante');
  rows.push({
    id: 'mat_autonivelante',
    typeKey: 'autonivelante',
    included: prevAuto ? prevAuto.included : true,
    selectedProduct: prevAuto?.selectedProduct || AUTONIVELANTE_PRODUCTS[0],
    productOptions: AUTONIVELANTE_PRODUCTS,
    quantity: prevAuto?.isCustomQuantity ? prevAuto.quantity : '—',
    unit: 'sacos',
    isCustomQuantity: prevAuto?.isCustomQuantity,
  });

  // 3 & 4. Primer
  const { primer18Qty, primer36Qty } = calculatePrimer(area > 0 ? area : 176);
  const prevP18 = existingRows?.find((r) => r.typeKey === 'primer_18');
  const prevP36 = existingRows?.find((r) => r.typeKey === 'primer_36');

  if (primer18Qty > 0 || prevP18) {
    rows.push({
      id: 'mat_primer_18',
      typeKey: 'primer_18',
      included: prevP18 ? prevP18.included : true,
      selectedProduct: prevP18?.selectedProduct || PRIMER_18L_PRODUCTS[0],
      productOptions: PRIMER_18L_PRODUCTS,
      quantity: prevP18?.isCustomQuantity
        ? prevP18.quantity
        : String(primer18Qty),
      unit: primer18Qty === 1 ? 'balde' : 'balde',
      isCustomQuantity: prevP18?.isCustomQuantity,
    });
  }

  if (primer36Qty > 0 || prevP36) {
    rows.push({
      id: 'mat_primer_36',
      typeKey: 'primer_36',
      included: prevP36 ? prevP36.included : true,
      selectedProduct: prevP36?.selectedProduct || PRIMER_36L_PRODUCTS[0],
      productOptions: PRIMER_36L_PRODUCTS,
      quantity: prevP36?.isCustomQuantity
        ? prevP36.quantity
        : String(primer36Qty),
      unit: primer36Qty === 1 ? 'balde' : 'balde',
      isCustomQuantity: prevP36?.isCustomQuantity,
    });
  }

  // 5. Cola
  const { cola18Qty, cola4Qty } = calculateCola(area > 0 ? area : 176);
  const prevC18 = existingRows?.find((r) => r.typeKey === 'cola_18');
  const prevC4 = existingRows?.find((r) => r.typeKey === 'cola_4');

  if (cola18Qty > 0 || prevC18) {
    rows.push({
      id: 'mat_cola_18',
      typeKey: 'cola_18',
      included: prevC18 ? prevC18.included : true,
      selectedProduct: prevC18?.selectedProduct || COLA_18KG_PRODUCTS[0],
      productOptions: COLA_18KG_PRODUCTS,
      quantity: prevC18?.isCustomQuantity
        ? prevC18.quantity
        : String(cola18Qty),
      unit: 'baldes',
      isCustomQuantity: prevC18?.isCustomQuantity,
    });
  }

  if (cola4Qty > 0 || prevC4) {
    rows.push({
      id: 'mat_cola_4',
      typeKey: 'cola_4',
      included: prevC4 ? prevC4.included : true,
      selectedProduct: prevC4?.selectedProduct || COLA_4KG_PRODUCTS[0],
      productOptions: COLA_4KG_PRODUCTS,
      quantity: prevC4?.isCustomQuantity ? prevC4.quantity : String(cola4Qty),
      unit: cola4Qty === 1 ? 'balde' : 'baldes',
      isCustomQuantity: prevC4?.isCustomQuantity,
    });
  }

  // 6. Cordão de Solda (utiliza o Metro Linear informado)
  const prevCordao = existingRows?.find((r) => r.typeKey === 'cordao');
  rows.push({
    id: 'mat_cordao',
    typeKey: 'cordao',
    included: prevCordao ? prevCordao.included : true,
    selectedProduct: prevCordao?.selectedProduct || CORDAO_PRODUCTS[0],
    productOptions: CORDAO_PRODUCTS,
    quantity: prevCordao?.isCustomQuantity
      ? prevCordao.quantity
      : formatBRLNumber(metroLinear > 0 ? metroLinear : 30, 2),
    unit: 'metros',
    isCustomQuantity: prevCordao?.isCustomQuantity,
  });

  // 7. Suporte Canto Curvo (utiliza o Metro Linear informado)
  const prevSuporte = existingRows?.find((r) => r.typeKey === 'suporte_canto');
  rows.push({
    id: 'mat_suporte_canto',
    typeKey: 'suporte_canto',
    included: prevSuporte ? prevSuporte.included : true,
    selectedProduct: prevSuporte?.selectedProduct || SUPORTE_CANTO_PRODUCTS[0],
    productOptions: SUPORTE_CANTO_PRODUCTS,
    quantity: prevSuporte?.isCustomQuantity
      ? prevSuporte.quantity
      : formatBRLNumber(metroLinear > 0 ? metroLinear : 30, 2),
    unit: 'metros',
    isCustomQuantity: prevSuporte?.isCustomQuantity,
  });

  // 8. Perfil de Arremate (utiliza o Metro Linear informado)
  const prevPerfil = existingRows?.find((r) => r.typeKey === 'perfil_arremate');
  rows.push({
    id: 'mat_perfil_arremate',
    typeKey: 'perfil_arremate',
    included: prevPerfil ? prevPerfil.included : true,
    selectedProduct: prevPerfil?.selectedProduct || PERFIL_ARREMATE_PRODUCTS[0],
    productOptions: PERFIL_ARREMATE_PRODUCTS,
    quantity: prevPerfil?.isCustomQuantity
      ? prevPerfil.quantity
      : formatBRLNumber(metroLinear > 0 ? metroLinear : 30, 2),
    unit: 'metros',
    isCustomQuantity: prevPerfil?.isCustomQuantity,
  });

  return rows;
}
