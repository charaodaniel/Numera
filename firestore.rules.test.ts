/**
 * Security Rule & Blueprint Contract Verification — Numera
 * Maps the 12 "Dirty Dozen" adversarial payloads to expected rule rejections.
 */

export interface DirtyDozenCase {
  id: string;
  description: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  enforcingGate: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    description: 'Shadow ghost field (isAdmin: true) on rifa creation',
    targetPath: 'rifas/rifa_test_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isValidRifa -> data.keys().hasOnly(...)',
  },
  {
    id: 'DD-02',
    description: 'Owner spoofing (ownerId != request.auth.uid) on rifa creation',
    targetPath: 'rifas/rifa_test_2',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().ownerId == request.auth.uid',
  },
  {
    id: 'DD-03',
    description: 'Unverified email user attempting database write',
    targetPath: 'users/user_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isVerifiedSignedIn()',
  },
  {
    id: 'DD-04',
    description: 'Cross-user PII read on /users/{otherUid}',
    targetPath: 'users/other_uid',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'request.auth.uid == uid',
  },
  {
    id: 'DD-05',
    description: 'Path variable ID poisoning with invalid characters',
    targetPath: 'rifas/bad$id!payload',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'isValidId(rifaId)',
  },
  {
    id: 'DD-06',
    description: 'Vendedor attempting self-promotion to proprietario',
    targetPath: 'rifas/rifa_1/membros/vendedor_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'canManageTeam(rifaId) && incoming().role in ["colaborador", "vendedor"]',
  },
  {
    id: 'DD-07',
    description: 'Uninvited user creating membership record',
    targetPath: 'rifas/rifa_1/membros/intruder_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'exists(convites/inviteId) && invite.email == request.auth.token.email.lower()',
  },
  {
    id: 'DD-08',
    description: 'Updating archived raffle document',
    targetPath: 'rifas/rifa_archived',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: "existing().status != 'arquivada'",
  },
  {
    id: 'DD-09',
    description: 'Client-forged createdAt timestamp on assignment',
    targetPath: 'rifas/rifa_1/atribuicoes/atr_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'incoming().createdAt == request.time',
  },
  {
    id: 'DD-10',
    description: 'Vendedor without confirmarLiberar releasing another seller number',
    targetPath: 'rifas/rifa_1/numeros/001',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'canConfirmOrRelease(rifaId) || existing().assignedBy == request.auth.uid',
  },
  {
    id: 'DD-11',
    description: 'Audit trail tampering on sorteios or eventos',
    targetPath: 'rifas/rifa_1/sorteios/sorteio_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'allow update: if false; allow delete: if false;',
  },
  {
    id: 'DD-12',
    description: 'Unfiltered blanket list query on /rifas',
    targetPath: 'rifas',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    enforcingGate: 'resource.data.ownerId == request.auth.uid',
  },
];
