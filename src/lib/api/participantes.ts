import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  clampString,
  generateSafeId,
  type Participante,
} from '../../types/numera';

export function subscribeRifaParticipantes(
  rifaId: string,
  onChange: (participantes: Participante[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/participantes`;
  const q = query(
    collection(db, 'rifas', rifaId, 'participantes'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Participante)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      onChange(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export interface ParticipanteInput {
  nome: string;
  telefone: string;
  whatsapp: string;
  observacoes: string;
}

export async function createParticipante(
  rifaId: string,
  input: ParticipanteInput,
  user: User
): Promise<Participante> {
  const nome = clampString(input.nome, BLUEPRINT_LIMITS.NAME_MAX);
  const telefone = clampString(input.telefone, BLUEPRINT_LIMITS.TELEFONE_MAX);
  const whatsapp = clampString(input.whatsapp, BLUEPRINT_LIMITS.TELEFONE_MAX);
  const observacoes = clampString(
    input.observacoes,
    BLUEPRINT_LIMITS.OBSERVACOES_MAX
  );

  if (nome.length < 2) {
    throw new Error('O nome do participante precisa ter pelo menos 2 caracteres.');
  }

  const participanteId = generateSafeId('part');
  const partRef = doc(db, 'rifas', rifaId, 'participantes', participanteId);
  const eventoRef = doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt'));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Equipe',
    BLUEPRINT_LIMITS.NAME_MAX
  );

  try {
    const batch = writeBatch(db);
    batch.set(partRef, {
      rifaId,
      nome,
      telefone,
      whatsapp,
      observacoes,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(eventoRef, {
      rifaId,
      type: 'participante_criado',
      actorUid: user.uid,
      actorName,
      targetId: participanteId,
      summary: clampString(
        `Cadastrou o participante ${nome}.`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      id: participanteId,
      rifaId,
      nome,
      telefone,
      whatsapp,
      observacoes,
      createdBy: user.uid,
      createdAt: null as unknown as Participante['createdAt'],
      updatedAt: null as unknown as Participante['updatedAt'],
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `rifas/${rifaId}/participantes/${participanteId}`
    );
  }
}

export async function updateParticipante(
  rifaId: string,
  participanteId: string,
  input: ParticipanteInput,
  user: User
): Promise<void> {
  const nome = clampString(input.nome, BLUEPRINT_LIMITS.NAME_MAX);
  const telefone = clampString(input.telefone, BLUEPRINT_LIMITS.TELEFONE_MAX);
  const whatsapp = clampString(input.whatsapp, BLUEPRINT_LIMITS.TELEFONE_MAX);
  const observacoes = clampString(
    input.observacoes,
    BLUEPRINT_LIMITS.OBSERVACOES_MAX
  );

  if (nome.length < 2) {
    throw new Error('O nome do participante precisa ter pelo menos 2 caracteres.');
  }

  const partRef = doc(db, 'rifas', rifaId, 'participantes', participanteId);
  const eventoRef = doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt'));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Equipe',
    BLUEPRINT_LIMITS.NAME_MAX
  );

  try {
    const batch = writeBatch(db);
    batch.update(partRef, {
      nome,
      telefone,
      whatsapp,
      observacoes,
      updatedAt: serverTimestamp(),
    });
    batch.set(eventoRef, {
      rifaId,
      type: 'participante_atualizado',
      actorUid: user.uid,
      actorName,
      targetId: participanteId,
      summary: clampString(
        `Atualizou o cadastro de ${nome}.`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `rifas/${rifaId}/participantes/${participanteId}`
    );
  }
}
