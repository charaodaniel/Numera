import type { Timestamp } from 'firebase/firestore';

export type RifaStatus = 'rascunho' | 'ativa' | 'finalizada' | 'arquivada';
export type RifaColorPalette =
  | 'esmeralda'
  | 'marinho'
  | 'carvao'
  | 'ambar'
  | 'vinho'
  | 'petroleo';
export type NumberStatus = 'disponivel' | 'reservado' | 'atribuido' | 'confirmado';
export type AtribuicaoStatus = 'reservada' | 'atribuida' | 'confirmada' | 'liberada';
export type MemberRole = 'proprietario' | 'colaborador' | 'vendedor';
export type EligibilityRule = 'confirmados' | 'atribuidos_e_confirmados';
export type ConviteTipo = 'email' | 'link';

export type EventoType =
  | 'rifa_criada'
  | 'rifa_atualizada'
  | 'numeros_reservados'
  | 'numeros_atribuidos'
  | 'numeros_confirmados'
  | 'numeros_liberados'
  | 'participante_criado'
  | 'participante_atualizado'
  | 'convite_enviado'
  | 'convite_aceito'
  | 'membro_atualizado'
  | 'sorteio_realizado';

export interface MemberPermissions {
  configurarRifa: boolean;
  confirmarLiberar: boolean;
  gerenciarEquipe: boolean;
  realizarSorteio: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Rifa {
  id: string;
  ownerId: string;
  titulo: string;
  descricao?: string;
  premio: string;
  imagemUrl?: string;
  corPrimaria?: RifaColorPalette;
  status: RifaStatus;
  numeroInicial: number;
  numeroFinal: number;
  digitos: number;
  dataPrevista?: string;
  regraElegibilidade: EligibilityRule;
  permitirMultiplosPremios: boolean;
  duracaoReservaMinutos: number;
  totalNumeros: number;
  contagemDisponiveis: number;
  contagemReservados: number;
  contagemAtribuidos: number;
  contagemConfirmados: number;
  valorNumero?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Membro {
  uid: string;
  rifaId: string;
  name: string;
  email: string;
  role: MemberRole;
  permissions: MemberPermissions;
  status: 'ativo' | 'removido';
  inviteId?: string;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Convite {
  id: string;
  rifaId: string;
  rifaTitulo: string;
  email: string;
  tipo?: ConviteTipo;
  role: 'colaborador' | 'vendedor';
  permissions: MemberPermissions;
  status: 'pendente' | 'aceito' | 'revogado';
  createdBy: string;
  acceptedBy?: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ConviteInbox extends Convite {
  conviteId: string;
}

export interface Participante {
  id: string;
  rifaId: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  observacoes: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Numero {
  id: string;
  rifaId: string;
  valor: string;
  indice: number;
  status: NumberStatus;
  participanteId?: string | null;
  participanteNome?: string | null;
  atribuicaoId?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  assignedAt?: Timestamp | null;
  confirmedBy?: string | null;
  confirmedAt?: Timestamp | null;
  reservedUntil?: Timestamp | null;
  updatedAt: Timestamp;
}

export interface Atribuicao {
  id: string;
  rifaId: string;
  participanteId: string;
  participanteNome: string;
  numeros: string[];
  status: AtribuicaoStatus;
  observacoes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SorteioResultado {
  ordem: number;
  premioDescricao: string;
  numero: string;
  participanteId: string;
  participanteNome: string;
  participanteTelefone: string;
}

export interface Sorteio {
  id: string;
  rifaId: string;
  regraElegibilidade: EligibilityRule;
  totalElegiveis: number;
  quantidadePremios: number;
  resultados: SorteioResultado[];
  realizadoPor: string;
  realizadoPorNome: string;
  realizadoEm: Timestamp;
  status: 'concluido';
}

export interface Evento {
  id: string;
  rifaId: string;
  type: EventoType;
  actorUid: string;
  actorName: string;
  targetId?: string;
  summary: string;
  createdAt: Timestamp;
}

// Synchronized verbatim with firebase-blueprint.json maxLength & pattern limits
export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  NAME_MAX: 120,
  EMAIL_MAX: 254,
  TITULO_MIN: 2,
  TITULO_MAX: 120,
  DESCRICAO_MAX: 1000,
  PREMIO_MIN: 2,
  PREMIO_MAX: 200,
  IMAGEM_URL_MAX: 1500,
  DATA_PREVISTA_MAX: 40,
  TELEFONE_MAX: 40,
  OBSERVACOES_MAX: 500,
  SUMMARY_MAX: 300,
  MAX_NUMBERS_PER_RIFA: 2000,
  MAX_NUMBERS_PER_BATCH: 100,
  VALOR_NUMERO_MAX: 1000000,
} as const;

export function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function formatTicketNumber(indice: number, digitos: number): string {
  return String(indice).padStart(Math.max(1, digitos), '0');
}

export function generateSafeId(prefix = 'id', byteCount = 8): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${Date.now().toString(36)}_${hex}`;
}

export function getDefaultPermissionsForRole(role: MemberRole): MemberPermissions {
  if (role === 'proprietario') {
    return {
      configurarRifa: true,
      confirmarLiberar: true,
      gerenciarEquipe: true,
      realizarSorteio: true,
    };
  }
  if (role === 'colaborador') {
    return {
      configurarRifa: false,
      confirmarLiberar: true,
      gerenciarEquipe: false,
      realizarSorteio: false,
    };
  }
  return {
    configurarRifa: false,
    confirmarLiberar: false,
    gerenciarEquipe: false,
    realizarSorteio: false,
  };
}

export interface RoleCapabilities {
  isOwner: boolean;
  role: MemberRole;
  canConfigure: boolean;
  canRegisterParticipant: boolean;
  canAssignNumbers: boolean;
  canManageOthersAssignments: boolean;
  canConfirmOrRelease: boolean;
  canManageTeam: boolean;
  canRunDraw: boolean;
  canArchive: boolean;
}

export function computeRoleCapabilities(
  rifa: Rifa,
  uid: string,
  membro?: Membro | null
): RoleCapabilities {
  const isOwner = rifa.ownerId === uid;
  if (isOwner) {
    return {
      isOwner: true,
      role: 'proprietario',
      canConfigure: true,
      canRegisterParticipant: true,
      canAssignNumbers: true,
      canManageOthersAssignments: true,
      canConfirmOrRelease: true,
      canManageTeam: true,
      canRunDraw: true,
      canArchive: true,
    };
  }

  const role: MemberRole = membro?.role ?? 'vendedor';
  const perms = membro?.permissions ?? getDefaultPermissionsForRole(role);

  if (role === 'colaborador') {
    return {
      isOwner: false,
      role: 'colaborador',
      canConfigure: perms.configurarRifa,
      canRegisterParticipant: true,
      canAssignNumbers: true,
      canManageOthersAssignments: true,
      canConfirmOrRelease: true,
      canManageTeam: perms.gerenciarEquipe,
      canRunDraw: perms.realizarSorteio,
      canArchive: false,
    };
  }

  return {
    isOwner: false,
    role: 'vendedor',
    canConfigure: false,
    canRegisterParticipant: true,
    canAssignNumbers: true,
    canManageOthersAssignments: false,
    canConfirmOrRelease: perms.confirmarLiberar,
    canManageTeam: false,
    canRunDraw: false,
    canArchive: false,
  };
}

export function formatTimestampPt(ts?: Timestamp | null): string {
  if (!ts) return '—';
  try {
    const date = ts.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}

export function formatCurrencyBrl(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe);
}

export function getStatusLabel(status: RifaStatus): string {
  switch (status) {
    case 'rascunho':
      return 'Rascunho';
    case 'ativa':
      return 'Ativa';
    case 'finalizada':
      return 'Finalizada';
    case 'arquivada':
      return 'Arquivada';
  }
}

export function getNumberStatusLabel(status: NumberStatus): string {
  switch (status) {
    case 'disponivel':
      return 'Disponível';
    case 'reservado':
      return 'Reservado';
    case 'atribuido':
      return 'Atribuído';
    case 'confirmado':
      return 'Confirmado';
  }
}

export function getRoleLabel(role: MemberRole): string {
  switch (role) {
    case 'proprietario':
      return 'Proprietário';
    case 'colaborador':
      return 'Colaborador';
    case 'vendedor':
      return 'Vendedor';
  }
}
