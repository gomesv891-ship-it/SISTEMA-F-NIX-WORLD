/**
 * Formata o nome do arquivo para exportação de orçamentos (PDF ou imagem):
 * Formato oficial exigido:
 * "Orçamento - Nome do Cliente - DD/MM"
 * Exemplo: "Orçamento - João da Silva - 12/09"
 *
 * NÃO incluir:
 * - Ano
 * - Fênix World
 * - Phoenix World
 * - “teste”
 * - Números extras
 * - Informações internas
 */
export function getOrcamentoExportFileName(
  clientName?: string | null,
  dateStr?: string | null,
  extension: 'pdf' | 'png' = 'pdf'
): string {
  // 1. Limpar nome do cliente
  let cleanName = (clientName || 'Cliente').trim();

  // Remover menções de marcas, termos de teste ou extras
  cleanName = cleanName
    .replace(/\b(fenix|fênix|phoenix)\s*world\b/gi, '')
    .replace(/\bteste\b/gi, '')
    .replace(/["'“”]/g, '')
    .replace(/\s*-\s*$/, '')
    .replace(/^\s*-\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanName) {
    cleanName = 'Cliente';
  }

  // 2. Extrair dia e mês (DD/MM)
  let dd = '';
  let mm = '';

  if (dateStr) {
    const str = dateStr.trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      dd = (parts[0] || '').replace(/\D/g, '').padStart(2, '0');
      mm = (parts[1] || '').replace(/\D/g, '').padStart(2, '0');
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts[0]?.length === 4) {
        // YYYY-MM-DD
        dd = (parts[2] || '').replace(/\D/g, '').slice(0, 2).padStart(2, '0');
        mm = (parts[1] || '').replace(/\D/g, '').padStart(2, '0');
      } else {
        // DD-MM-YYYY
        dd = (parts[0] || '').replace(/\D/g, '').padStart(2, '0');
        mm = (parts[1] || '').replace(/\D/g, '').padStart(2, '0');
      }
    }
  }

  // Fallback para dia e mês atual se não houver ou for inválido
  if (!dd || !mm || isNaN(Number(dd)) || isNaN(Number(mm))) {
    const now = new Date();
    dd = String(now.getDate()).padStart(2, '0');
    mm = String(now.getMonth() + 1).padStart(2, '0');
  }

  return `Orçamento - ${cleanName} - ${dd}/${mm}.${extension}`;
}
