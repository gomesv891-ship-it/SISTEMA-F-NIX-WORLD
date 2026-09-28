import { ClientRecord, SavedOrcamento } from '../types';
import { AuthorizedUserName, getUserIdByName } from './auth';

export const SELLER_IDS = {
  VANESSA_GOMES: '5ebedc87-ef20-4abc-9613-7e8503c75c54',
  JHESSICA_CAMARGO: '9d86d050-72fb-49ed-8994-5b2681f559ff',
  EDER_PEREZ: '622d2e97-914d-4dc0-9327-a4a56b045744',
  JEFERSON_TROLESI: 'd19c3b8a-4421-482a-a924-d92e8c201732',
} as const;

export const SELLER_NAME_BY_ID: Record<string, string> = {
  '5ebedc87-ef20-4abc-9613-7e8503c75c54': 'Vanessa Gomes',
  '9d86d050-72fb-49ed-8994-5b2681f559ff': 'Jhessica Camargo',
  '622d2e97-914d-4dc0-9327-a4a56b045744': 'Éder Perez',
  'c8f7d6a5-1234-4567-89ab-cdef01234567': 'Éder Perez',
  'd19c3b8a-4421-482a-a924-d92e8c201732': 'Jeferson Trolesi',
};

export const SELLER_ID_BY_NAME: Record<string, string> = {
  'Vanessa Gomes': '5ebedc87-ef20-4abc-9613-7e8503c75c54',
  'Jhessica Camargo': '9d86d050-72fb-49ed-8994-5b2681f559ff',
  'Eder Perez': '622d2e97-914d-4dc0-9327-a4a56b045744',
  'Jeferson Trolesi': 'd19c3b8a-4421-482a-a924-d92e8c201732',
};

/**
 * Returns the official database seller UUID for an authorized CRM user
 */
export function getSellerIdForUser(userName: string): string | null {
  if (!userName) return null;
  const clean = userName.trim();
  if (clean === 'Vanessa Gomes') {
    return SELLER_IDS.VANESSA_GOMES;
  }
  if (clean === 'Jhessica Camargo') {
    return SELLER_IDS.JHESSICA_CAMARGO;
  }
  if (clean.toLowerCase().includes('eder')) {
    return SELLER_IDS.EDER_PEREZ;
  }
  if (clean.toLowerCase().includes('jeferson')) {
    return SELLER_IDS.JEFERSON_TROLESI;
  }
  return `seller-${clean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

/**
 * Checks if a client record belongs strictly to the given user
 */
export function isClientOwnedByUser(client: ClientRecord, activeUserName: string): boolean {
  if (!client) return false;
  if (!activeUserName) return true;
  if (activeUserName.toLowerCase().includes('eder')) return true;

  const targetSellerId = getSellerIdForUser(activeUserName);
  const clientSellerId = client.vendedorId;
  const clientResponsavelId = client.responsavelId;
  const registeredBy = (client.registeredBy || client.criadoPor || '').trim().toLowerCase();
  const vendedor = ((client as any).vendedor || '').trim().toLowerCase();
  const responsavel = (client.responsavel || client.atribuidoA || '').trim().toLowerCase();
  const userLower = activeUserName.trim().toLowerCase();

  // 1. Criador mantém propriedade do cadastro
  if (registeredBy && (registeredBy === userLower || registeredBy.includes(userLower) || userLower.includes(registeredBy))) return true;
  // 2. Responsável atribuído
  if (responsavel && (responsavel === userLower || responsavel.includes(userLower) || userLower.includes(responsavel))) return true;
  if (targetSellerId && (clientSellerId === targetSellerId || clientResponsavelId === targetSellerId)) return true;
  if (vendedor && (vendedor === userLower || vendedor.includes(userLower) || userLower.includes(vendedor))) return true;

  return false;
}

/**
 * Checks if a client record is accessible by the active logged-in user.
 * 
 * REGRA FUNDAMENTAL:
 * Quando um registro for atribuído a outro usuário, ele NÃO deve desaparecer
 * do sistema do usuário que criou ou cadastrou o registro.
 * - Diretor Éder Perez possui visão global de acompanhamento.
 * - Quem cadastrou continua vendo e acompanhando o registro com status e histórico.
 * - Quem é o responsável atribuído também vê no seu sistema.
 */
export function isClientAccessibleByUser(client: ClientRecord, activeUserName: string): boolean {
  if (!client) return false;
  if (!activeUserName || activeUserName.toLowerCase().includes('eder')) return true;

  const userLower = activeUserName.trim().toLowerCase();
  const targetSellerId = getSellerIdForUser(activeUserName);
  const clientSellerId = client.vendedorId;
  const clientResponsavelId = client.responsavelId;
  const registeredBy = (client.registeredBy || client.criadoPor || '').trim().toLowerCase();
  const vendedor = ((client as any).vendedor || '').trim().toLowerCase();
  const responsavel = (client.responsavel || client.atribuidoA || '').trim().toLowerCase();

  // 1. O CRIADOR SEMPRE CONTINUA VENDO O CLIENTE QUE CADASTROU
  if (registeredBy && (registeredBy === userLower || registeredBy.includes(userLower) || userLower.includes(registeredBy))) {
    return true;
  }

  // 2. O RESPONSÁVEL ATRIBUÍDO TAMBÉM VÊ NO SISTEMA DELE
  if (responsavel && (responsavel === userLower || responsavel.includes(userLower) || userLower.includes(responsavel))) {
    return true;
  }
  if (vendedor && (vendedor === userLower || vendedor.includes(userLower) || userLower.includes(vendedor))) {
    return true;
  }
  if (targetSellerId && (clientSellerId === targetSellerId || clientResponsavelId === targetSellerId)) {
    return true;
  }

  // Registros com escopo geral ou livre
  if (responsavel === 'geral' || client.atribuidoA === 'Geral') {
    return true;
  }

  return false;
}

/**
 * Filters a client list to only return records belonging to the active user
 */
export function filterClientsForUser(clients: ClientRecord[], activeUserName: string): ClientRecord[] {
  if (!Array.isArray(clients)) return [];
  return clients.filter((client) => isClientAccessibleByUser(client, activeUserName));
}

/**
 * Checks if an orçamento belongs strictly to the given user
 */
export function isOrcamentoOwnedByUser(orc: SavedOrcamento, activeUserName: string): boolean {
  if (!orc) return false;
  if (!activeUserName) return true;
  if (activeUserName.toLowerCase().includes('eder')) return true;

  const targetSellerId = getSellerIdForUser(activeUserName);
  const orcSellerId = orc.vendedorId;
  const orcResponsavelId = orc.responsavelId;
  const consultora = (orc.consultoraName || '').trim().toLowerCase();
  const registeredBy = (orc.registeredBy || orc.criadoPor || '').trim().toLowerCase();
  const responsavel = (orc.responsavel || orc.atribuidoA || '').trim().toLowerCase();
  const userLower = activeUserName.trim().toLowerCase();

  // 1. Criador mantém propriedade
  if (registeredBy && (registeredBy === userLower || registeredBy.includes(userLower) || userLower.includes(registeredBy))) return true;
  // 2. Responsável atribuído
  if (consultora && (consultora === userLower || consultora.includes(userLower) || userLower.includes(consultora))) return true;
  if (responsavel && (responsavel === userLower || responsavel.includes(userLower) || userLower.includes(responsavel))) return true;
  if (targetSellerId && (orcSellerId === targetSellerId || orcResponsavelId === targetSellerId)) return true;

  return false;
}

/**
 * Checks if an orçamento belongs to the active logged-in user.
 * - Diretor Éder Perez has global oversight over all orçamentos.
 * - Quem cadastrou continua vendo o orçamento.
 * - Quem foi atribuído como responsável também visualiza.
 */
export function isOrcamentoAccessibleByUser(orc: SavedOrcamento, activeUserName: string): boolean {
  if (!orc) return false;

  // Diretor Éder Perez possui visão global de acompanhamento de todos os orçamentos
  if (!activeUserName || activeUserName.toLowerCase().includes('eder')) {
    return true;
  }

  const targetSellerId = getSellerIdForUser(activeUserName);
  const orcSellerId = orc.vendedorId;
  const orcResponsavelId = orc.responsavelId;
  const consultora = (orc.consultoraName || '').trim().toLowerCase();
  const registeredBy = (orc.registeredBy || orc.criadoPor || '').trim().toLowerCase();
  const responsavel = (orc.responsavel || orc.atribuidoA || '').trim().toLowerCase();
  const userLower = activeUserName.trim().toLowerCase();

  // 1. O CRIADOR SEMPRE CONTINUA VENDO O ORÇAMENTO QUE CADASTROU
  if (registeredBy && (registeredBy === userLower || registeredBy.includes(userLower) || userLower.includes(registeredBy))) {
    return true;
  }

  // 2. O RESPONSÁVEL ATRIBUÍDO TAMBÉM VÊ NO SISTEMA DELE
  if (consultora && (consultora === userLower || consultora.includes(userLower) || userLower.includes(consultora))) {
    return true;
  }
  if (responsavel && (responsavel === userLower || responsavel.includes(userLower) || userLower.includes(responsavel))) {
    return true;
  }
  if (targetSellerId && (orcSellerId === targetSellerId || orcResponsavelId === targetSellerId)) {
    return true;
  }

  return false;
}

/**
 * Filters an orçamentos list to only return records belonging to the active user
 */
export function filterOrcamentosForUser(orcamentos: SavedOrcamento[], activeUserName: string): SavedOrcamento[] {
  if (!Array.isArray(orcamentos)) return [];
  return orcamentos.filter((orc) => isOrcamentoAccessibleByUser(orc, activeUserName));
}

/**
 * Checks if a generic record belongs to a specific responsible tab in Director view
 * Tabs supported: 'Todos' | 'Éder' | 'Vanessa' | 'Jhessica' | 'demais usuários' | specific names
 */
export function isRecordOfResponsible(
  record: {
    registeredBy?: string;
    vendedor?: string;
    consultoraName?: string;
    vendedorId?: string | null;
    responsavelId?: string | null;
    criadoPor?: string;
    atribuidoA?: string;
    destinadoA?: string;
    usuario?: string;
    responsavel?: string;
    agendadaPor?: string;
    cadastradaPor?: string;
    author?: string;
  },
  targetResponsible: string
): boolean {
  if (!targetResponsible || targetResponsible === 'Todos') return true;

  const target = targetResponsible.toLowerCase().trim();
  const targetNorm = target.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const values = [
    record.registeredBy,
    record.vendedor,
    record.consultoraName,
    record.criadoPor,
    record.atribuidoA,
    record.destinadoA,
    record.usuario,
    record.responsavel,
    record.agendadaPor,
    record.cadastradaPor,
    record.author,
  ]
    .filter(Boolean)
    .map((v) => (v as string).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  const sellerIds = [record.vendedorId, record.responsavelId].filter(Boolean) as string[];

  const isEder =
    values.some((v) => v.includes('eder') || v.includes('diretor')) ||
    sellerIds.includes(SELLER_IDS.EDER_PEREZ);

  const isVanessa =
    values.some((v) => v.includes('vanessa')) ||
    sellerIds.includes(SELLER_IDS.VANESSA_GOMES);

  const isJhessica =
    values.some(
      (v) =>
        v.includes('jhessica') ||
        v.includes('jessica') ||
        v.includes('jess') ||
        v.includes('jhess')
    ) || sellerIds.includes(SELLER_IDS.JHESSICA_CAMARGO);

  if (
    targetNorm === 'eder' ||
    targetNorm === 'diretor' ||
    targetNorm.includes('eder') ||
    targetNorm.includes('diretor')
  ) {
    return isEder;
  }
  if (targetNorm === 'vanessa' || targetNorm.includes('vanessa')) {
    return isVanessa;
  }
  if (
    targetNorm.includes('jhessica') ||
    targetNorm.includes('jessica') ||
    targetNorm.includes('jhess') ||
    targetNorm.includes('jess')
  ) {
    return isJhessica;
  }
  if (target === 'demais' || target === 'demais usuários' || target === 'outros') {
    return !isEder && !isVanessa && !isJhessica;
  }

  // Match direto por nome
  return values.some((v) => {
    const vNorm = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return vNorm.includes(targetNorm) || targetNorm.includes(vNorm);
  });
}

/**
 * Utilitário central de comparação e equivalência de usuários do CRM Fênix.
 * Trata variações de escrita, acentuação e apelidos/nomes curtos:
 * - Vanessa / Vanessa Gomes
 * - Jéssica / Jessica / Jhessica / Jhessica Camargo / Jéssica Camargo
 * - Éder / Eder / Éder Perez / Eder Perez
 * - Jeferson / Jeferson Trolesi
 * - IDs oficiais do sistema
 */
export function areUsersEqualOrRelated(
  nameA?: string | null,
  nameB?: string | null
): boolean {
  if (!nameA || !nameB) return false;
  const aRaw = nameA.trim();
  const bRaw = nameB.trim();
  if (!aRaw || !bRaw) return false;

  const a = aRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const b = bRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Equivalências conhecidas de equipe Fênix:
  // Vanessa
  if (a.includes('vanessa') && b.includes('vanessa')) return true;

  // Éder / Eder
  if (a.includes('eder') && b.includes('eder')) return true;

  // Jéssica / Jhessica
  const isJhesA = a.includes('jhes') || a.includes('jess');
  const isJhesB = b.includes('jhes') || b.includes('jess');
  if (isJhesA && isJhesB) return true;

  // Jeferson
  if (a.includes('jeferson') && b.includes('jeferson')) return true;

  // Comparação por IDs cadastrados
  const idA = getUserIdByName(aRaw) || getSellerIdForUser(aRaw);
  const idB = getUserIdByName(bRaw) || getSellerIdForUser(bRaw);
  if (idA && idB && idA === idB) return true;

  return false;
}

/**
 * REGRA UNIVERSAL DE ATRIBUIÇÕES E VISIBILIDADE:
 * "O usuário que CRIOU um registro deve continuar vendo esse registro,
 * mesmo depois de atribuí-lo ou compartilhá-lo com outro usuário.
 * O usuário que recebeu a atribuição/compartilhamento também deve visualizar o mesmo registro.
 * A atribuição NÃO deve fazer o registro desaparecer de quem o criou."
 *
 * Aplica-se a: Pendências, Tarefas, Boletos, Notas compartilhadas, etc.
 */
export function isRecordVisibleToUser(
  record: {
    registeredBy?: string;
    criadoPor?: string;
    criadoPorId?: string;
    creatorId?: string | null;
    agendadaPor?: string;
    cadastradaPor?: string;
    author?: string;
    authorId?: string;
    responsavel?: string;
    responsavelId?: string | null;
    atribuidoA?: string;
    destinadoA?: string;
    vendedor?: string;
    consultoraName?: string;
    vendedorId?: string | null;
  },
  activeUserName: string
): boolean {
  if (!record) return false;
  if (!activeUserName) return true;

  const targetSellerId = getSellerIdForUser(activeUserName);
  const myUserId = getUserIdByName(activeUserName);

  // 1. CRIADOR NUNCA PERDE A VISÃO DO REGISTRO CADASTRADO
  const creatorFields = [
    record.registeredBy,
    record.criadoPor,
    record.agendadaPor,
    record.cadastradaPor,
    record.author,
  ].filter(Boolean) as string[];

  const isCreator = creatorFields.some((c) => areUsersEqualOrRelated(c, activeUserName));
  if (isCreator) return true;

  // Verificação por ID do criador
  if (
    myUserId &&
    ((record as any).criadoPorId === myUserId || (record as any).authorId === myUserId)
  ) {
    return true;
  }

  // 2. RESPONSÁVEL ATRIBUÍDO TAMBÉM VÊ NO SEU SISTEMA
  const responsibleFields = [
    record.responsavel,
    record.atribuidoA,
    record.destinadoA,
    record.vendedor,
    record.consultoraName,
  ].filter(Boolean) as string[];

  const isResponsible = responsibleFields.some((r) => areUsersEqualOrRelated(r, activeUserName));
  if (isResponsible) return true;

  // 3. Match por ID de Vendedor / Responsável
  if (
    (targetSellerId &&
      (record.vendedorId === targetSellerId || record.responsavelId === targetSellerId)) ||
    (myUserId && record.responsavelId === myUserId)
  ) {
    return true;
  }

  // 4. Registro destinado a 'Geral', 'Todos' ou sem restrição
  const isGeneral = responsibleFields.some((r) => {
    const lower = r.toLowerCase().trim();
    return (
      lower === 'geral' ||
      lower === 'equipe' ||
      lower === 'todos' ||
      lower === 'todos da equipe'
    );
  });
  if (isGeneral) return true;

  // 5. Se não houver criador nem responsável especificados, mantém visível
  if (creatorFields.length === 0 && responsibleFields.length === 0) return true;

  return false;
}

/**
 * REGRA ESTRITA DE VISIBILIDADE DE PENDÊNCIAS:
 * Uma pendência deve aparecer SOMENTE para:
 * 1. Quem criou a pendência;
 * 2. Quem recebeu a pendência / foi atribuído como responsável.
 * Todos os demais usuários do CRM NÃO devem visualizar essa pendência.
 *
 * EXEMPLO:
 * Se Vanessa criar uma pendência e atribuí-la para Jhessica:
 * - Vanessa (criou) → vê a pendência.
 * - Jhessica (recebeu/responsável) → vê a pendência.
 * - Éder → NÃO vê.
 * - Jeferson → NÃO vê.
 */
export function isPendenciaVisibleToUser(
  item: {
    criadoPor?: string;
    criadoPorId?: string | null;
    creatorId?: string | null;
    author?: string;
    atribuidoA?: string;
    atribuidoAId?: string | null;
    responsavel?: string;
    responsavelId?: string | null;
    destinadoA?: string;
  },
  activeUserName: string
): boolean {
  if (!item || !activeUserName) return false;

  const currentUserId = getUserIdByName(activeUserName);
  const currentSellerId = getSellerIdForUser(activeUserName);

  // 1. Quem CRIOU a pendência
  const creatorNames = [item.criadoPor, item.author].filter(Boolean) as string[];
  const isCreatorByName = creatorNames.some((name) => areUsersEqualOrRelated(name, activeUserName));

  const creatorIds = [item.criadoPorId, item.creatorId].filter(Boolean) as string[];
  const isCreatorById = Boolean(
    (currentUserId && creatorIds.includes(currentUserId)) ||
    (currentSellerId && creatorIds.includes(currentSellerId))
  );

  const isCreator = isCreatorByName || isCreatorById;

  // 2. Quem RECEBEU a pendência / foi atribuído como responsável
  const assignedNames = [item.atribuidoA, item.responsavel, item.destinadoA].filter(Boolean) as string[];
  const isAssigneeByName = assignedNames.some((name) => areUsersEqualOrRelated(name, activeUserName));

  const assignedIds = [item.atribuidoAId, item.responsavelId].filter(Boolean) as string[];
  const isAssigneeById = Boolean(
    (currentUserId && assignedIds.includes(currentUserId)) ||
    (currentSellerId && assignedIds.includes(currentSellerId))
  );

  const isAssignee = isAssigneeByName || isAssigneeById;

  // Visível SOMENTE para as pessoas envolvidas (criador ou responsável atribuído)
  return isCreator || isAssignee;
}

/**
 * REGRA ESTRITA DE VISIBILIDADE DE TAREFAS:
 * Uma tarefa deve aparecer para o CRIADOR e para o RESPONSÁVEL.
 * Exemplo: Vanessa atribui uma tarefa ao Éder:
 * - Vanessa continua vendo a tarefa (Criadora).
 * - Éder recebe a notificação e também vê a mesma tarefa na aba Tarefas (Responsável).
 * - Deve existir apenas UMA tarefa, sem duplicação.
 * - Qualquer alteração feita pelo responsável (status, prazo, observação) aparece para o criador e vice-versa.
 * - Sincronização preservada após logout e novo login.
 */
export function isTaskVisibleToUser(
  task: {
    criadoPor?: string;
    criadoPorId?: string | null;
    creatorId?: string | null;
    responsavel?: string;
    responsavelId?: string | null;
    atribuidoA?: string;
    atribuidoAId?: string | null;
    registeredBy?: string;
  },
  activeUserName: string
): boolean {
  if (!task || !activeUserName) return false;

  const currentUserId = getUserIdByName(activeUserName);
  const currentSellerId = getSellerIdForUser(activeUserName);

  // 1. Quem CRIOU a tarefa
  const creatorNames = [task.criadoPor, task.registeredBy].filter(Boolean) as string[];
  const isCreatorByName = creatorNames.some((name) => areUsersEqualOrRelated(name, activeUserName));

  const creatorIds = [task.criadoPorId, task.creatorId].filter(Boolean) as string[];
  const isCreatorById = Boolean(
    (currentUserId && creatorIds.includes(currentUserId)) ||
    (currentSellerId && creatorIds.includes(currentSellerId))
  );

  const isCreator = isCreatorByName || isCreatorById;

  // 2. Quem RECEBEU a tarefa / é o RESPONSÁVEL
  const assignedNames = [task.responsavel, task.atribuidoA].filter(Boolean) as string[];
  const isAssigneeByName = assignedNames.some((name) => areUsersEqualOrRelated(name, activeUserName));

  const assignedIds = [task.responsavelId, task.atribuidoAId].filter(Boolean) as string[];
  const isAssigneeById = Boolean(
    (currentUserId && assignedIds.includes(currentUserId)) ||
    (currentSellerId && assignedIds.includes(currentSellerId))
  );

  const isAssignee = isAssigneeByName || isAssigneeById;

  // 3. Destinado à equipe inteira / geral
  const isGeneral = assignedNames.some((name) => {
    const l = name.toLowerCase().trim();
    return l === 'geral' || l === 'equipe' || l === 'todos' || l === 'todos da equipe';
  });

  // Requisito estrito: Éder Perez tem acesso geral removido em Tarefas.
  // Éder deve visualizar SOMENTE tarefas que criou ou que foram atribuídas a ele.
  // Não alterar a regra dos demais usuários (que mantêm acesso geral/equipe).
  const isEder = areUsersEqualOrRelated(activeUserName, 'Éder Perez') || activeUserName.toLowerCase().includes('eder');
  if (isEder) {
    return isCreator || isAssignee;
  }

  // Demais usuários: criador, responsável ou geral/equipe
  return isCreator || isAssignee || isGeneral;
}

/**
 * Ensures a new client record is properly bound to the logged-in user
 */
export function bindClientToActiveUser(client: ClientRecord, activeUserName: AuthorizedUserName): ClientRecord {
  const sellerId = SELLER_ID_BY_NAME[activeUserName] || getSellerIdForUser(activeUserName);
  return {
    ...client,
    registeredBy: activeUserName,
    vendedorId: sellerId,
  };
}

/**
 * Ensures a new orçamento is properly bound to the logged-in user
 */
export function bindOrcamentoToActiveUser(orc: SavedOrcamento, activeUserName: AuthorizedUserName): SavedOrcamento {
  const sellerId = SELLER_ID_BY_NAME[activeUserName] || getSellerIdForUser(activeUserName);
  return {
    ...orc,
    consultoraName: activeUserName,
    registeredBy: activeUserName,
    vendedorId: sellerId,
  };
}
