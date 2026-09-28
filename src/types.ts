export interface LoginFormState {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface FormErrors {
  username?: string;
  password?: string;
  general?: string;
}

export type ClientType =
  | 'Arquiteto'
  | 'Cliente Final'
  | 'Consumidor Final'
  | 'Construtora'
  | 'Distribuidor'
  | 'Engenheiro'
  | 'Instalador'
  | 'Revenda';

export type PriceTableTier =
  | 'Cliente Final'
  | 'Consumidor Final'
  | 'Revenda'
  | 'Construtora'
  | 'Distribuidor';

export interface ClientFormData {
  name: string;
  whatsapp: string;
  clientType: ClientType | '';
  email?: string;
  document?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address?: string;
  isImportant: boolean;
  notes: string;
}

export interface ClientRecord extends ClientFormData {
  id: string;
  registeredAt: string;
  registeredBy: string;
  vendedorId?: string | null;
  responsavel?: string;
  responsavelId?: string | null;
  atribuidoA?: string;
  criadoPor?: string;
  status?: 'ativo' | 'inativo';
}

export type ActivityType =
  | 'cadastro'
  | 'orcamento_criado'
  | 'orcamento_atualizado'
  | 'orcamento_enviado'
  | 'followup_realizado'
  | 'tarefa_criada'
  | 'tarefa_concluida'
  | 'venda_realizada'
  | 'pos_venda_criado'
  | 'pos_venda_atualizado'
  | 'nota_adicionada'
  | 'pendencia_criada'
  | 'pendencia_resolvida'
  | 'calculo_realizado'
  | 'contato_registrado'
  | 'cadastro_atualizado'
  | 'status_alterado'
  | 'boleto_cadastrado'
  | 'boleto_enviado'
  | 'boleto_atendido';

export interface ClientActivity {
  id: string;
  clientId: string;
  type: ActivityType;
  title: string;
  description: string;
  date: string;
  time?: string;
  userName?: string;
  relevantInfo?: string;
  timestamp: number;
}

export interface MaterialRow {
  id: string;
  typeKey: string;
  included: boolean;
  selectedProduct: string;
  productOptions: string[];
  quantity: string;
  unit: string;
  isCustomQuantity?: boolean;
}

export type OrcamentoStatus =
  | 'Em aberto'
  | 'Aguardando retorno'
  | 'Fechados'
  | 'Fechado'
  | 'Perdidos'
  | 'Perdido';

export interface SavedOrcamento {
  id: string;
  clientId: string;
  clientName: string;
  clientType: string;
  clientContact: string;
  nomeOrcamento: string;
  consultoraName: string;
  registeredBy?: string;
  vendedorId?: string | null;
  responsavel?: string;
  responsavelId?: string | null;
  atribuidoA?: string;
  criadoPor?: string;
  dataOrcamento: string;
  observacoes: string;
  observacoesRodape?: string;
  isChildRow?: boolean;
  parentId?: string;
  items: {
    id: string;
    qtd: string;
    qtdDetalhe?: string;
    descricao: string;
    subtitulo?: string;
    unidade: string;
    precoUnitario: number;
    total: number;
  }[];
  freteAtivo?: boolean;
  freteValor: number;
  freteEndereco: string;
  freteCep?: string;
  freteLogradouro?: string;
  freteNumero?: string;
  freteComplemento?: string;
  freteBairro?: string;
  freteCidade?: string;
  freteUf?: string;
  descontoValor: number;
  descontoTexto?: string;
  totalFinal: number;
  status: OrcamentoStatus;
  savedAt: string;
}

export type TaskType = 'ligacao' | 'proposta' | 'reuniao' | 'entrega' | 'medicao' | 'outro';
export type TaskPriority = 'Baixa' | 'Normal' | 'Alta';
export type TaskStatus = 'Pendente' | 'Atrasada' | 'Concluída';

export interface TaskItem {
  id: string;
  title: string;
  type: TaskType;
  description?: string;
  clientId: string;
  clientName: string;
  clientCompanyOrSegment?: string;
  clientPhone?: string;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
  observation?: string;
  criadoPor?: string;
  criadoPorId?: string | null;
  creatorId?: string | null;
  atribuidoA?: string;
  atribuidoAId?: string | null;
  responsavel?: string;
  responsavelId?: string | null;
  vendedor?: string;
  createdAt: string;
  notifiedAtScheduledTime?: boolean;
  notifiedAtTenMinutesDelayed?: boolean;
}

export type BoletoStatus = 'Aguardando boleto' | 'Boleto recebido' | 'Atendido';

export interface BoletoParcela {
  numero: number | string;
  dataVencimento: string;
  valor: number;
  status?: string;
}

export interface BoletoItem {
  id: string;
  orderNumber: string; // Ex: "1042"
  clientName: string; // Ex: "Construtora Almeida"
  clientId?: string;
  clientPhone?: string;
  dataCadastro?: string; // YYYY-MM-DD - mês em que foi cadastrado (mantém o boleto neste mês)
  firstDueDate: string; // YYYY-MM-DD - vencimento da 1ª parcela (pode ser mês seguinte)
  amount?: number;
  valorTotal?: number;
  qtdParcelas?: number;
  parcelas?: BoletoParcela[];
  installmentsCount?: number;
  quantidadeParcelas?: number;
  numeroParcela?: number;
  intervaloDias?: number;
  valorParcela?: number;
  status: BoletoStatus;
  fileName?: string;
  fileSize?: string;
  notes?: string;
  sentAt?: string;
  attendedAt?: string;
  criadoPor?: string; // Colaborador que cadastrou (Vanessa Gomes, Jhessica Camargo, Eder Perez)
  criadoPorId?: string | null;
  creatorId?: string | null;
  destinadoA?: string; // Para quem o boleto foi destinado/atribuído (Eder Perez, Vanessa Gomes, Jhessica Camargo, Geral)
  destinadoAId?: string | null;
  responsavel?: string; // Responsável pelo acompanhamento/atendimento do boleto
  responsavelId?: string | null; // ID do responsável
  createdAt: string;
}

export type NoteColor = 'amarelo' | 'azul' | 'rosa' | 'verde' | 'roxo' | 'cinza';
export type NoteCategory =
  | 'Geral'
  | 'Cliente'
  | 'Fornecedor'
  | 'Marketing'
  | 'Equipe'
  | 'Visita'
  | 'Metas'
  | 'Estoque';

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  color: NoteColor;
  category: NoteCategory;
  isPinned?: boolean;
  isFavorite?: boolean;
  isShared?: boolean;
  shareScope?: 'all' | 'specific';
  sharedWith?: string[];
  author: string;
  authorId?: string | null;
  creatorId?: string | null;
  authorInitials: string;
  createdAt: string;
  updatedAt?: string;
}

export type PosVendaStatus =
  | 'Aguardando Entrega'
  | 'Aguardando Confirmação'
  | 'Aguardando Contato'
  | 'Aguardando Retorno'
  | 'Instalador Indicado'
  | 'Aguardando Pós-Instalação'
  | 'Pronto para Finalizar'
  | 'Finalizado'
  // Compatibilidade com registros legados
  | 'Vendido'
  | 'Instalação Pendente'
  | 'Vistoria Agendada'
  | 'Assistência Aberta'
  | 'Finalizado / Satisfeito';

export interface PosVendaHistoricoItem {
  id: string;
  dataHora: string;
  usuario: string;
  acao: string;
  detalhes?: string;
}

export type PosVendaTipo =
  | 'Contato de Satisfação'
  | 'Vistoria Final'
  | 'Instalação'
  | 'Assistência Técnica'
  | 'Garantia e Follow-up';

export interface PosVendaItem {
  id: string;
  orderNumber: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientType?: ClientType | string;
  projectDescription: string;

  // 1. RECEBIMENTO E LOGÍSTICA (Entrega ou Retirada)
  formaRecebimento?: 'Entrega' | 'Retirada'; // Forma de recebimento: Entrega ou Retirada
  // Se Entrega:
  dataPrevisaoEntrega?: string; // Data prevista de entrega
  dataEntrega?: string; // Data de entrega
  dataRecebimento?: string; // Sinônimo mantido para compatibilidade
  statusEntrega?:
    | 'Aguardando'
    | 'Realizado'
    | 'Realizado com divergência'
    | 'Material faltante'
    | 'Material danificado'
    | 'Cliente ainda não retirou / recebeu'
    | 'Pendente'
    | 'Em Trânsito'
    | 'Entregue'
    | 'Atrasada'
    | string;
  observacaoEntrega?: string;

  // Se Retirada:
  dataPrevisaoRetirada?: string; // Data prevista para retirada
  dataRetirada?: string; // Data da retirada
  statusRetirada?:
    | 'Aguardando'
    | 'Realizado'
    | 'Realizado com divergência'
    | 'Material faltante'
    | 'Material danificado'
    | 'Cliente ainda não retirou / recebeu'
    | string;
  observacaoRetirada?: string;

  // 2. INSTALADOR
  precisaInstalador?: 'Sim' | 'Não' | 'Já possui instalador';
  nomeInstaladorManual?: string; // CAMPO DE TEXTO LIVRE, digitado manualmente
  dataIndicacaoInstalador?: string; // Data da indicação
  clienteContatouInstalador?: 'Sim' | 'Não' | 'Aguardando';

  // 3. ACOMPANHAMENTO
  clienteRecebeuMaterial?: 'Sim' | 'Não' | 'Parcialmente';
  jaInstalou?: 'Sim' | 'Não' | 'Em andamento';
  deuTudoCerto?: 'Sim' | 'Não' | 'Com ressalvas';
  comentarioCliente?: string;

  // 4. NOVA VENDA / OPORTUNIDADE
  interesseNovaCompra?: 'Sim' | 'Não' | 'Futuramente';
  tipoOportunidadeNovaCompra?: string;

  // 5. FINALIZAÇÃO
  finalizadoEm?: string; // ISO timestamp
  finalizadoPor?: string; // Nome do usuário
  observacaoFinal?: string; // Observação final de encerramento
  historico?: PosVendaHistoricoItem[];

  // Campos legados mantidos para compatibilidade
  installerName?: string;
  installerContact?: string;
  installationStartDate?: string;
  dataInicioInstalacao?: string;
  completionDate: string;
  satisfactionRating?: number;
  status: PosVendaStatus;
  type?: PosVendaTipo;
  feedback?: string;
  nextFollowUpDate?: string;
  notes?: string;
  valor?: number;
  origem?: 'followup' | 'metas' | 'manual';
  orcamentoId?: string;
  vendedor?: string;
  vendedorId?: string | null;
  criadoPor?: string;
  criadoPorId?: string | null;
  creatorId?: string | null;
  registeredBy?: string;
  responsavel?: string;
  responsavelId?: string | null;
  atribuidoA?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendaMes {
  id: string;
  pedido: string; // sem '#'
  cliente: string;
  contato?: string;
  dataVenda: string; // YYYY-MM-DD
  produto: string;
  valor: number;
  vendedor?: string;
}

export type UserRole =
  | 'Diretor'
  | 'Consultor Comercial'
  | 'Marketplace'
  | 'Marketing'
  | 'Representante';

export type UserPermissionModule =
  | 'Clientes'
  | 'Calculadora'
  | 'Orçamentos'
  | 'Follow-up'
  | 'Metas'
  | 'Produtos'
  | 'Controle de Estoque'
  | 'Estoque'
  | 'Vendas'
  | 'Tarefas'
  | 'Pós-Vendas'
  | 'Boletos'
  | 'Pendências'
  | 'Notas'
  | 'Configurações';

export interface MetaMensal {
  mes: string;
  ano: number;
  label: string; // Ex: 'Setembro 2026'
  metaDefinida: number;
  totalVendido: number;
  restante: number;
  percentual: number;
  ticketMedio: number;
  orcamentos: number;
  vendasFechadas: number;
  conversao: number;
  vendas: VendaMes[];
}

export type FollowUpStatus =
  | 'Orçamento Enviado'
  | 'Aguardando Retorno'
  | 'Negociando'
  | 'Vendido'
  | 'Perdido'
  | 'Em Contato'
  | 'Negociação'
  | 'Aguardando Resposta';

export interface FollowUpHistoryEntry {
  id: string;
  data: string; // DD/MM/YYYY
  hora: string; // HH:mm
  statusAnterior?: string;
  novoStatus: string;
  observacao?: string;
  usuario?: string;
  timestamp?: number;
}

export type FollowUpCanal =
  | 'WhatsApp'
  | 'Ligação'
  | 'E-mail'
  | 'Reunião Presencial';

export interface FormaPagamentoItem {
  id: string;
  forma: string;
  valor: number;
  parcelas?: string;
}

export interface FollowUpItem {
  id: string;
  pedido: string; // sem '#' ex: '1042'
  orcamentoId?: string;
  nomeOrcamento?: string;
  clientId?: string;
  cliente: string;
  clientType?: string;
  isImportant?: boolean;
  produto?: string; // ex: 'Piso Vinílico Colado - Flexfloor'
  telefone?: string;
  valor: number;
  dataCriacao?: string; // YYYY-MM-DD ou DD/MM/YYYY
  dataEnvio?: string; // YYYY-MM-DD
  dataRetorno?: string; // YYYY-MM-DD
  dataEntradaFollowUp?: string; // Data ISO ou YYYY-MM-DD em que entrou na esteira
  dataUltimaCobranca?: string; // Data ISO da cobrança de retorno gerada
  dataUltimoContato?: string; // Data ISO do último contato com o cliente (inicia novo ciclo de 2 dias úteis)
  dataCicloAtual?: string; // Data de início do ciclo atual de 2 dias úteis
  cobrancaAutomaticaGerada?: boolean; // Se já teve cobrança de 2 dias disparada
  lembretesAtivos?: boolean; // Se lembretes no sino a cada 2 dias estão ativos (default: true)
  dataAtualizacao: string; // ISO ou formatada
  status: FollowUpStatus;
  observacao?: string;
  resumo?: string;
  vendedor?: string;
  vendedorId?: string | null;
  criadoPor?: string;
  criadoPorId?: string | null;
  creatorId?: string | null;
  registeredBy?: string;
  responsavel?: string;
  responsavelId?: string | null;
  atribuidoA?: string;
  createdAt: string;
  updatedAt?: string;
  formaPagamento?: 'Pix' | 'Boleto' | 'Cartão' | string;
  parcelas?: string;
  formasPagamento?: FormaPagamentoItem[];
  frete?: number;
  desconto?: number;
  produtos?: any[];
  historico?: FollowUpHistoryEntry[];
}

export type PendenciaStatus = 'Pendente' | 'Em andamento' | 'Resolvida';

export interface PendenciaItem {
  id: string;
  data: string; // YYYY-MM-DD ou formato ISO
  pendencia: string; // O que precisa ser resolvido
  cliente?: string; // Nome do cliente ou "-"
  pedido?: string; // Apenas número puro sem "#" ou "-"
  status: PendenciaStatus;
  observacao?: string;
  criadoPor?: string;
  criadoPorId?: string | null;
  creatorId?: string | null;
  atribuidoA?: string; // Atribuído para: 'Eder Perez' | 'Vanessa Gomes' | 'Jhessica Camargo' | 'Geral'
  atribuidoAId?: string | null;
  responsavel?: string;
  responsavelId?: string | null;
  notificadoDiretor?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// PROSPECÇÃO DE CLIENTES (FOLLOW-UP)
// ==========================================
export type ProspectStatus =
  | 'Novo'
  | 'Contatado'
  | 'Aguardando Retorno'
  | 'Negociando'
  | 'Vendido'
  | 'Perdido';

export interface ProspectHistoryEntry {
  id: string;
  dataHora: string; // Ex: 09/09/2026 14:30
  data: string; // Ex: 09/09/2026
  hora: string; // Ex: 14:30
  usuario: string; // Usuário responsável (ex: Vanessa Gomes)
  statusAnterior: string; // ex: Novo ou '-'
  novoStatus: string; // ex: Contatado
  observacao: string; // Comentário da movimentação
  proximoContato?: string; // Data do próximo contato (opcional)
  timestamp: number;
}

export interface ProspectClient {
  id: string;
  nome: string;
  whatsapp: string;
  tipoCliente: ClientType | string;
  status: ProspectStatus | string;
  dataCadastro: string;
  ultimaAtividade: string;
  responsavel: string;
  responsavelId?: string | null;
  criadoPor?: string;
  criadoPorId?: string | null;
  creatorId?: string | null;
  vendedorId?: string | null;
  observacaoInicial?: string;
  historico: ProspectHistoryEntry[];
}

// ==========================================
// CONTROLE DE ESTOQUE
// ==========================================
export type EstoqueStatus = 'Normal' | 'Atenção' | 'Estoque baixo' | 'Sem estoque' | 'Baixo' | 'Crítico';

export interface EstoqueItem {
  id: string;
  produto: string;
  codigo: string;
  marca: string;
  categoria: string;
  grupo?: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: string;
  ultimaMovimentacao?: string;
  ultimaMovimentacaoTipo?: 'ENTRADA' | 'SAIDA_VENDA' | 'SAIDA_FULL' | 'SAIDA_OUTRO' | 'INICIAL';
  status: EstoqueStatus;
  observacoes?: string;
  fornecedor?: string;
  manual?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA_VENDA' | 'SAIDA_FULL' | 'SAIDA_OUTRO';

export interface MovimentacaoEstoque {
  id: string;
  estoqueItemId: string;
  produtoNome: string;
  codigoProduto: string;
  tipo: TipoMovimentacaoEstoque;
  subtipo?: string; // Compra, Devolução, Full, Doação, Perda, Uso interno, Avaria, etc.
  quantidade: number;
  unidade?: string;
  data: string;
  hora?: string;
  observacao?: string;
  fornecedor?: string;
  vendaOrcamentoRelacionado?: string;
  clienteNome?: string;
  motivoSaida?: string;
  saldoAnterior: number;
  saldoPosterior: number;
  usuario: string;
  createdAt: string;
}

// ==========================================
// VENDAS (VISÃO GERENCIAL DIRETORIA)
// ==========================================
export interface VendaItemProduto {
  id: string;
  produto: string;
  quantidade: number | string;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  custoUnitario?: number;
  custoTotal?: number;
}

export interface VendaHistoricoEntry {
  id: string;
  data: string;
  hora?: string;
  usuario: string;
  acao: string;
  detalhes?: string;
  timestamp?: number;
}

export type TipoCustoVenda =
  | 'Produto'
  | 'Nota Fiscal'
  | 'Taxa de Pagamento'
  | 'Frete'
  | 'Comercial'
  | 'Desconto'
  | 'Operacional'
  | 'Outros';

export interface VendaCustoItem {
  id: string;
  tipo: TipoCustoVenda;
  descricao: string;
  valor: number;
}

export interface VendaGerencial {
  id: string;
  numeroPedido: string;
  data: string;
  cliente: string;
  clienteId?: string;
  tipoCliente?: string; // Construtora, Arquitetura, Loja/Varejo, Cliente Final, Outros
  vendedor: string;
  vendedorId?: string;
  valorVenda: number;
  custoProdutos: number;
  custosAdicionais: number;
  custoTotal?: number;
  lucro: number;
  margem: number;
  desconto?: number;
  frete?: number;
  formaPagamento?: string;
  formasPagamento?: any[];
  parcelas?: string;
  custosItens?: VendaCustoItem[];
  // Marketplace fields (para Jeferson Trolesi)
  isMarketplace?: boolean;
  canalMarketplace?: 'Shopee' | 'Mercado Livre' | string;
  taxasMarketplace?: number;
  comissaoMarketplace?: number;
  freteMarketplace?: number;
  subsidioMarketplace?: number;
  adsMarketplace?: number;
  outrosCustosMarketplace?: number;
  // Cancelamento
  motivoCancelamento?: string;
  dataCancelamento?: string;
  observacoes?: string;
  detalhesCustosAdicionais?: string;
  itensResumo?: string;
  produtos?: VendaItemProduto[];
  historico?: VendaHistoricoEntry[];
  orcamentoId?: string;
  followUpId?: string;
  metaId?: string;
  statusPedido?: string; // Concluído, Cancelada
  createdAt: string;
  updatedAt?: string;
  criadoPor: string;
}

// ==========================================
