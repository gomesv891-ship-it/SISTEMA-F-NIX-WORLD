import { getCachedAccessToken, setCachedAccessToken, clearCachedAccessToken } from './googleAuth';

export class GoogleAuthExpiredError extends Error {
  constructor(message = 'Sessão Google expirada ou credenciais inválidas.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

function handleAuthFailure(): never {
  clearCachedAccessToken();
  currentSyncStatus.connected = false;
  currentSyncStatus.isSyncing = false;
  currentSyncStatus.error = 'Sessão Google expirada. Conecte-se novamente nas Configurações.';
  notifyStatus();
  throw new GoogleAuthExpiredError();
}
import { normalizeAuthorizedName } from './auth';

export const SPREADSHEET_NAME = 'Fênix World — Banco de Dados CRM';
export const SPREADSHEET_ID_STORAGE_KEY = 'fenix_google_sheet_id';

// As 15 abas requeridas com suas colunas estruturadas
export const SHEET_SCHEMAS: Record<string, string[]> = {
  USUARIOS: [
    'id',
    'name',
    'email',
    'cargo',
    'password',
    'mustChangePassword',
    'avatarInitials',
    'active',
    'lastLogin',
    'modulos',
    'loginSugerido',
    'updatedAt',
  ],
  CLIENTES: [
    'id',
    'name',
    'tradeName',
    'clientType',
    'documentType',
    'cpfCnpj',
    'phone',
    'email',
    'contactPerson',
    'sellerId',
    'sellerName',
    'status',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'zipCode',
    'notes',
    'createdAt',
    'updatedAt',
  ],
  PRODUTOS: [
    'id',
    'name',
    'categoryId',
    'categoryName',
    'groupId',
    'groupName',
    'unit',
    'price',
    'priceClienteFinal',
    'priceRevenda',
    'priceConstrutora',
    'active',
    'updatedAt',
  ],
  CATEGORIAS: ['id', 'name', 'updatedAt'],
  ORCAMENTOS: [
    'id',
    'numero',
    'clienteId',
    'clienteNome',
    'vendedorId',
    'vendedorNome',
    'dataOrcamento',
    'totalFinal',
    'freteValor',
    'freteEndereco',
    'descontoValor',
    'status',
    'observacoes',
    'savedAt',
    'updatedAt',
  ],
  ITENS_ORCAMENTO: [
    'id',
    'orcamentoId',
    'produtoId',
    'descricao',
    'qtd',
    'unidade',
    'precoUnitario',
    'total',
    'categoriaNome',
    'updatedAt',
  ],
  FOLLOWUPS_ORCAMENTOS: [
    'id',
    'orcamentoId',
    'cliente',
    'clienteId',
    'produtos',
    'valor',
    'status',
    'dataCadastro',
    'horaCadastro',
    'ultimaAtualizacao',
    'horaAtualizacao',
    'consultora',
    'observacoes',
    'tipoFollowup', // 'orcamento' ou 'prospeccao'
    'historicoJson',
    'updatedAt',
  ],
  TAREFAS: [
    'id',
    'titulo',
    'descricao',
    'tipo',
    'data',
    'hora',
    'responsavel',
    'clienteId',
    'clienteNome',
    'status',
    'prioridade',
    'createdAt',
    'updatedAt',
  ],
  POS_VENDAS: [
    'id',
    'orcamentoId',
    'clienteNome',
    'clienteId',
    'dataVenda',
    'status',
    'avaliacao',
    'feedback',
    'responsavel',
    'dataContato',
    'observacoes',
    'updatedAt',
  ],
  BOLETOS: [
    'id',
    'numero',
    'orcamentoId',
    'clienteId',
    'clienteNome',
    'valor',
    'vencimento',
    'status', // 'Pendente' | 'Liquidado' | 'Vencido'
    'dataEmissao',
    'linkBoleto',
    'observacoes',
    'updatedAt',
  ],
  PENDENCIAS: [
    'id',
    'titulo',
    'descricao',
    'categoria',
    'clienteId',
    'clienteNome',
    'status',
    'data',
    'responsavel',
    'updatedAt',
  ],
  NOTAS: [
    'id',
    'titulo',
    'conteudo',
    'clienteId',
    'clienteNome',
    'autor',
    'categoria',
    'data',
    'hora',
    'tags',
    'updatedAt',
  ],
  CHAT: [
    'id',
    'remetente',
    'destinatario',
    'mensagem',
    'dataHora',
    'lida',
    'tipo',
  ],
  CONFIGURACOES: [
    'chave',
    'valor',
    'descricao',
    'updatedBy',
    'updatedAt',
  ],
  LOGS: [
    'id',
    'timestamp',
    'usuario',
    'acao',
    'entidade',
    'entidadeId',
    'detalhes',
  ],
};

export interface SyncStatus {
  connected: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncTime: string | null;
  isSyncing: boolean;
  error: string | null;
}

let currentSyncStatus: SyncStatus = {
  connected: false,
  spreadsheetId: null,
  spreadsheetUrl: null,
  lastSyncTime: null,
  isSyncing: false,
  error: null,
};

// Listeners para atualizar status em tempo real na UI
const listeners: ((status: SyncStatus) => void)[] = [];

export const getSyncStatus = (): SyncStatus => {
  if (!currentSyncStatus.spreadsheetId) {
    const savedId = localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
    if (savedId) {
      currentSyncStatus.spreadsheetId = savedId;
      currentSyncStatus.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${savedId}`;
      currentSyncStatus.connected = !!getCachedAccessToken();
    }
  }
  return { ...currentSyncStatus };
};

const notifyStatus = () => {
  const status = getSyncStatus();
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      // ignore
    }
  });
  window.dispatchEvent(new CustomEvent('fenix_sheets_sync_status', { detail: status }));
};

export const subscribeSyncStatus = (fn: (status: SyncStatus) => void) => {
  listeners.push(fn);
  fn(getSyncStatus());
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
};

/**
 * Busca por uma planilha existente pelo nome no Google Drive do usuário
 */
export async function findSpreadsheetByName(name: string, token: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    handleAuthFailure();
  }

  if (!response.ok) {
    const errText = await response.text();
    console.warn('Aviso ao buscar planilha no Drive:', errText);
    return null;
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Cria a planilha inicial com todas as abas e cabeçalhos requeridos
 */
export async function createSpreadsheetWithTabs(name: string, token: string): Promise<string> {
  const sheetTitles = Object.keys(SHEET_SCHEMAS);
  
  // Criação da planilha com as abas
  const createPayload = {
    properties: {
      title: name,
    },
    sheets: sheetTitles.map((title) => ({
      properties: {
        title,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    })),
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (createRes.status === 401 || createRes.status === 403) {
    handleAuthFailure();
  }

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Falha ao criar planilha: ${err}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Inserir cabeçalhos em cada aba
  const headerData = sheetTitles.map((title) => ({
    range: `'${title}'!A1:${getColumnLetter(SHEET_SCHEMAS[title].length)}1`,
    values: [SHEET_SCHEMAS[title]],
  }));

  const batchHeaderRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData,
      }),
    }
  );

  if (batchHeaderRes.status === 401 || batchHeaderRes.status === 403) {
    handleAuthFailure();
  }

  if (!batchHeaderRes.ok) {
    console.warn('Aviso ao preencher cabeçalhos:', await batchHeaderRes.text());
  }

  return spreadsheetId;
}

function getColumnLetter(colIndex: number): string {
  let temp,
    letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter || 'A';
}

/**
 * Garante que a planilha existe e está pronta, retornando seu ID
 */
export async function ensureSpreadsheetReady(token: string): Promise<string> {
  let savedId = localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);

  if (savedId) {
    // Verifica se ainda existe e é acessível
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${savedId}?fields=spreadsheetId,sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (checkRes.status === 401 || checkRes.status === 403) {
      handleAuthFailure();
    }

    if (checkRes.ok) {
      const info = await checkRes.json();
      const existingSheets: string[] = (info.sheets || []).map((s: any) => s.properties.title);
      // Cria abas faltantes se houver
      const missingSheets = Object.keys(SHEET_SCHEMAS).filter((name) => !existingSheets.includes(name));
      if (missingSheets.length > 0) {
        await addMissingSheets(savedId, missingSheets, token);
      }
      return savedId;
    }
  }

  // Se não tem ID salvo ou o anterior não foi encontrado, busca pelo nome no Drive
  const existingId = await findSpreadsheetByName(SPREADSHEET_NAME, token);
  if (existingId) {
    localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, existingId);
    return existingId;
  }

  // Cria uma nova planilha oficial
  const newId = await createSpreadsheetWithTabs(SPREADSHEET_NAME, token);
  localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, newId);
  return newId;
}

async function addMissingSheets(spreadsheetId: string, sheetTitles: string[], token: string) {
  const requests = sheetTitles.map((title) => ({
    addSheet: {
      properties: {
        title,
        gridProperties: { frozenRowCount: 1 },
      },
    },
  }));

  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (batchRes.status === 401 || batchRes.status === 403) {
    handleAuthFailure();
  }

  const headerData = sheetTitles.map((title) => ({
    range: `'${title}'!A1:${getColumnLetter(SHEET_SCHEMAS[title].length)}1`,
    values: [SHEET_SCHEMAS[title]],
  }));

  const batchHeaderRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerData,
      }),
    }
  );

  if (batchHeaderRes.status === 401 || batchHeaderRes.status === 403) {
    handleAuthFailure();
  }
}

/**
 * Lê todas as linhas de uma aba (convertidas em array de objetos baseado no schema)
 */
export async function readSheetRecords<T = Record<string, any>>(
  sheetName: string,
  token: string,
  spreadsheetId: string
): Promise<T[]> {
  const schema = SHEET_SCHEMAS[sheetName];
  if (!schema) return [];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A2:${getColumnLetter(schema.length)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    handleAuthFailure();
  }

  if (!res.ok) {
    console.warn(`Aviso ao ler aba ${sheetName}:`, await res.text());
    return [];
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows.map((row) => {
    const item: Record<string, any> = {};
    schema.forEach((col, idx) => {
      let val = row[idx] !== undefined ? row[idx] : '';
      if (typeof val === 'string') {
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (val.startsWith('[') || val.startsWith('{')) {
          try {
            val = JSON.parse(val);
          } catch {
            // keep as string
          }
        }
      }
      item[col] = val;
    });
    return item as T;
  });
}

/**
 * Escreve (substitui) todos os dados de uma aba, preservando o cabeçalho
 */
export async function writeSheetRecords(
  sheetName: string,
  records: Record<string, any>[],
  token: string,
  spreadsheetId: string
): Promise<boolean> {
  const schema = SHEET_SCHEMAS[sheetName];
  if (!schema) return false;

  // Monta as linhas na ordem do schema
  const rows = records.map((rec) => {
    return schema.map((col) => {
      const val = rec[col];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
  });

  // Limpa os dados existentes a partir da linha 2
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A2:${getColumnLetter(schema.length)}10000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (clearRes.status === 401 || clearRes.status === 403) {
    handleAuthFailure();
  }

  if (rows.length === 0) return true;

  // Escreve os novos registros
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A2:${getColumnLetter(schema.length)}${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${sheetName}'!A2:${getColumnLetter(schema.length)}${rows.length + 1}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (writeRes.status === 401 || writeRes.status === 403) {
    handleAuthFailure();
  }

  return writeRes.ok;
}

/**
 * Salva uma linha específica imediatamente na planilha sem esperar sincronização global
 */
export async function saveRecordToSheet(sheetName: string, record: Record<string, any>): Promise<void> {
  const token = getCachedAccessToken();
  const spreadsheetId = localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
  if (!token || !spreadsheetId) return;

  try {
    const existing = await readSheetRecords(sheetName, token, spreadsheetId);
    const key = record.id ? 'id' : 'chave';
    const idx = existing.findIndex((r: any) => r[key] === record[key]);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...record };
    } else {
      existing.unshift(record);
    }
    await writeSheetRecords(sheetName, existing, token, spreadsheetId);
  } catch (err) {
    console.warn(`Aviso ao salvar registro imediato na aba ${sheetName}:`, err);
  }
}

/**
 * Exclui uma linha específica imediatamente da planilha pelo id
 */
export async function deleteRecordFromSheet(sheetName: string, recordId: string): Promise<void> {
  const token = getCachedAccessToken();
  const spreadsheetId = localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
  if (!token || !spreadsheetId) return;

  try {
    const existing = await readSheetRecords(sheetName, token, spreadsheetId);
    const updated = existing.filter((r: any) => r.id !== recordId && r.numero !== recordId && r.orderNumber !== recordId);
    await writeSheetRecords(sheetName, updated, token, spreadsheetId);
  } catch (err) {
    console.warn(`Aviso ao excluir registro na aba ${sheetName}:`, err);
  }
}

/**
 * Faz a sincronização bidirecional completa entre o CRM e a Google Planilha
 */
export async function syncAllDataWithSheets(forcePush = false): Promise<{ success: boolean; message: string }> {
  const token = getCachedAccessToken();
  if (!token) {
    currentSyncStatus.connected = false;
    currentSyncStatus.isSyncing = false;
    currentSyncStatus.error = null;
    notifyStatus();
    return { success: false, message: 'Google Sheets desconectado. Conecte nas Configurações.' };
  }

  currentSyncStatus.isSyncing = true;
  notifyStatus();

  try {
    const spreadsheetId = await ensureSpreadsheetReady(token);
    currentSyncStatus.spreadsheetId = spreadsheetId;
    currentSyncStatus.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    currentSyncStatus.connected = true;

    // 1. Mapeamento dos módulos locais para as abas correspondentes
    await syncModule('USUARIOS', 'fenix_auth_users_v2', spreadsheetId, token, forcePush, formatUsersForSheet, parseUsersFromSheet);
    await syncModule('CLIENTES', 'fenix_clients_db', spreadsheetId, token, forcePush);
    await syncModule('PRODUTOS', 'fenix_product_items_data', spreadsheetId, token, forcePush);
    await syncModule('CATEGORIAS', 'fenix_product_categories_data', spreadsheetId, token, forcePush);
    await syncModule('ORCAMENTOS', 'fenix_orcamentos_history', spreadsheetId, token, forcePush, formatOrcamentosForSheet, parseOrcamentosFromSheet);
    await syncModule('FOLLOWUPS_ORCAMENTOS', 'fenix_followup_cards_v2', spreadsheetId, token, forcePush);
    await syncModule('TAREFAS', 'fenix_tarefas_db', spreadsheetId, token, forcePush);
    await syncModule('POS_VENDAS', 'fenix_pos_vendas_db', spreadsheetId, token, forcePush);
    await syncModule('BOLETOS', 'fenix_boletos_db', spreadsheetId, token, forcePush);
    await syncModule('PENDENCIAS', 'fenix_pendencias_v1', spreadsheetId, token, forcePush);
    await syncModule('NOTAS', 'fenix_notes_db', spreadsheetId, token, forcePush);

    // Extrair itens de orçamentos para a aba ITENS_ORCAMENTO
    await syncOrcamentoItems(spreadsheetId, token, forcePush);

    currentSyncStatus.lastSyncTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    currentSyncStatus.isSyncing = false;
    currentSyncStatus.error = null;
    notifyStatus();

    // Notifica o app para re-renderizar todas as telas com os dados atualizados
    window.dispatchEvent(new Event('fenix_clients_updated'));
    window.dispatchEvent(new Event('fenix_orcamentos_updated'));
    window.dispatchEvent(new Event('fenix_auth_updated'));
    window.dispatchEvent(new Event('fenix_notes_updated'));
    window.dispatchEvent(new Event('fenix_tarefas_updated'));
    window.dispatchEvent(new Event('storage'));

    return { success: true, message: 'Dados sincronizados com sucesso na Google Planilha!' };
  } catch (err: any) {
    currentSyncStatus.isSyncing = false;
    if (
      err instanceof GoogleAuthExpiredError ||
      err?.name === 'GoogleAuthExpiredError' ||
      err?.message?.includes('UNAUTHENTICATED') ||
      err?.message?.includes('401')
    ) {
      clearCachedAccessToken();
      currentSyncStatus.connected = false;
      currentSyncStatus.error = 'Sessão Google expirada. Conecte-se novamente nas Configurações.';
      notifyStatus();
      return { success: false, message: currentSyncStatus.error };
    }
    console.warn('Aviso na sincronização com Google Sheets:', err);
    currentSyncStatus.error = err?.message || 'Erro ao sincronizar com Google Sheets.';
    notifyStatus();
    return { success: false, message: currentSyncStatus.error };
  }
}

// Helpers para transformar dados específicos entre formato de objeto/array do CRM e linhas do Sheets
function formatUsersForSheet(localData: any): any[] {
  if (!localData) return [];
  if (typeof localData === 'object' && !Array.isArray(localData)) {
    return Object.values(localData);
  }
  return Array.isArray(localData) ? localData : [];
}

function parseUsersFromSheet(rows: any[]): any {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const map: Record<string, any> = {};
  rows.forEach((u) => {
    if (!u) return;
    const rawName = u.name || u.nome || '';
    if (!rawName) return;
    const canonical = normalizeAuthorizedName(rawName) || rawName;
    const isActive =
      u.active === true ||
      u.active === 'true' ||
      u.active === 'TRUE' ||
      u.active === 'Ativo' ||
      u.active === 'ativo' ||
      u.active === 1 ||
      u.active === '1' ||
      canonical === 'Eder Perez';

    map[canonical] = {
      ...u,
      name: canonical,
      active: isActive,
      cargo: u.cargo || (canonical === 'Eder Perez' ? 'Diretor' : 'Consultora Comercial'),
      password: u.password ? String(u.password) : '1234',
    };
  });

  // Garante que o Diretor Eder Perez conste sempre ativo e válido
  if (!map['Eder Perez']) {
    map['Eder Perez'] = {
      id: 'c8f7d6a5-1234-4567-89ab-cdef01234567',
      name: 'Eder Perez',
      email: 'eder@fenixworld.com.br',
      cargo: 'Diretor',
      password: '1234',
      mustChangePassword: true,
      avatarInitials: 'EP',
      active: true,
      updatedAt: new Date().toISOString(),
    };
  } else {
    map['Eder Perez'].cargo = 'Diretor';
    map['Eder Perez'].active = true;
  }

  // Notificar a tela de login que os usuários foram atualizados da planilha
  try {
    window.dispatchEvent(new Event('fenix_auth_updated'));
  } catch {}

  return Object.keys(map).length > 0 ? map : null;
}

function formatOrcamentosForSheet(localData: any): any[] {
  return Array.isArray(localData) ? localData : [];
}

function parseOrcamentosFromSheet(rows: any[]): any {
  return rows;
}

async function syncOrcamentoItems(spreadsheetId: string, token: string, forcePush: boolean) {
  const orcsRaw = localStorage.getItem('fenix_orcamentos_history');
  if (!orcsRaw) return;
  try {
    const orcs: any[] = JSON.parse(orcsRaw);
    const allItems: any[] = [];
    orcs.forEach((orc) => {
      if (Array.isArray(orc.items)) {
        orc.items.forEach((item: any, idx: number) => {
          allItems.push({
            id: item.id || `${orc.id}_item_${idx}`,
            orcamentoId: orc.id,
            produtoId: item.produtoId || item.id || '',
            descricao: item.descricao || item.nome || '',
            qtd: item.qtd || item.quantidade || 0,
            unidade: item.unidade || 'm²',
            precoUnitario: item.precoUnitario || item.valorUnitario || 0,
            total: item.total || item.valorTotal || 0,
            categoriaNome: item.categoriaNome || item.categoria || '',
            updatedAt: new Date().toISOString(),
          });
        });
      }
    });

    const sheetItems = await readSheetRecords('ITENS_ORCAMENTO', token, spreadsheetId);
    if (forcePush || sheetItems.length === 0) {
      if (allItems.length > 0) {
        await writeSheetRecords('ITENS_ORCAMENTO', allItems, token, spreadsheetId);
      }
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar ITENS_ORCAMENTO:', err);
  }
}

async function syncModule(
  sheetName: string,
  storageKey: string,
  spreadsheetId: string,
  token: string,
  forcePush: boolean,
  formatter?: (data: any) => any[],
  parser?: (rows: any[]) => any
) {
  const localRaw = localStorage.getItem(storageKey);
  let localData: any = null;
  try {
    localData = localRaw ? JSON.parse(localRaw) : null;
  } catch {
    localData = null;
  }

  const sheetRows = await readSheetRecords(sheetName, token, spreadsheetId);

  if (forcePush || (sheetRows.length === 0 && localData)) {
    // Sobe os dados locais para a planilha
    const toUpload = formatter ? formatter(localData) : (Array.isArray(localData) ? localData : []);
    if (toUpload.length > 0) {
      await writeSheetRecords(sheetName, toUpload, token, spreadsheetId);
    }
  } else if (sheetRows.length > 0) {
    // A planilha é a autoridade central: puxa os dados para o CRM
    const parsedData = parser ? parser(sheetRows) : sheetRows;
    if (parsedData) {
      localStorage.setItem(storageKey, JSON.stringify(parsedData));
    }
  }
}
