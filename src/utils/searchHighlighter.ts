// Utilitário para direcionar exatamente para o item/registro selecionado na busca global
export function highlightAndScrollToRecord(recordId: string, keyword?: string) {
  if (!recordId && !keyword) return;

  const cleanId = String(recordId || '').trim();
  const cleanKeyword = String(keyword || '').trim().toLowerCase();

  const attempt = (retries = 6) => {
    // 1. Procura direta por seletores de ID específicos
    const selectors = [
      `[data-record-id="${cleanId}"]`,
      `[id="${cleanId}"]`,
      `[data-id="${cleanId}"]`,
      `[data-pedido="${cleanId}"]`,
      `[data-nome="${cleanId}"]`,
      cleanId.startsWith('cli_') ? `[data-record-id="${cleanId.replace('cli_', '')}"]` : '',
      cleanId.startsWith('orc_') ? `[data-record-id="${cleanId.replace('orc_', '')}"]` : '',
      cleanId.startsWith('fup_') ? `[data-record-id="${cleanId.replace('fup_', '')}"]` : '',
      cleanId.startsWith('tar_') ? `[data-record-id="${cleanId.replace('tar_', '')}"]` : '',
      cleanId.startsWith('bol_') ? `[data-record-id="${cleanId.replace('bol_', '')}"]` : '',
      cleanId.startsWith('not_') ? `[data-record-id="${cleanId.replace('not_', '')}"]` : '',
      cleanId.startsWith('pen_') ? `[data-record-id="${cleanId.replace('pen_', '')}"]` : '',
      cleanId.startsWith('prd_') ? `[data-record-id="${cleanId.replace('prd_', '')}"]` : '',
    ].filter(Boolean);

    let targetElement: HTMLElement | null = null;

    for (const sel of selectors) {
      try {
        const found = document.querySelector(sel) as HTMLElement | null;
        if (found) {
          targetElement = found;
          break;
        }
      } catch {}
    }

    // 2. Se não encontrou por atributo, procura em linhas de tabela, cards ou blocos
    if (!targetElement && cleanKeyword) {
      const candidates = document.querySelectorAll(
        'tr, [role="row"], .fenix-searchable-item, .card, [data-searchable="true"]'
      );
      for (const el of Array.from(candidates)) {
        if (el.textContent?.toLowerCase().includes(cleanKeyword)) {
          targetElement = el as HTMLElement;
          break;
        }
      }
    }

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add(
        'ring-4',
        'ring-[#0052cc]',
        'ring-offset-2',
        'bg-blue-50/90',
        'transition-all',
        'duration-700'
      );
      setTimeout(() => {
        targetElement?.classList.remove(
          'ring-4',
          'ring-[#0052cc]',
          'ring-offset-2',
          'bg-blue-50/90'
        );
      }, 3500);
    } else if (retries > 0) {
      setTimeout(() => attempt(retries - 1), 200);
    }
  };

  setTimeout(() => attempt(), 120);
}

// Ouvinte para inicializar a escuta do evento de destaque
export function setupGlobalSearchHighlighter() {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail) {
      const { id, item } = customEvent.detail;
      const term = item?.cliente || item?.name || item?.nome || item?.titulo || item?.title || '';
      highlightAndScrollToRecord(id, term);
    }
  };

  window.addEventListener('fenix_highlight_record', handler);
  return () => window.removeEventListener('fenix_highlight_record', handler);
}
