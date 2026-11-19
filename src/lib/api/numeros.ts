import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  clampString,
  generateSafeId,
  type Atribuicao,
  type Numero,
  type Participante,
  type Rifa,
} from '../../types/numera';

export function subscribeRifaNumeros(
  rifaId: string,
  onChange: (numeros: Numero[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/numeros`;
  const q = query(
    collection(db, 'rifas', rifaId, 'numeros'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Numero)
        .sort((a, b) => a.indice - b.indice);
      onChange(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeRifaAtribuicoes(
  rifaId: string,
  onChange: (atribuicoes: Atribuicao[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/atribuicoes`;
  const q = query(
    collection(db, 'rifas', rifaId, 'atribuicoes'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Atribuicao)
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      onChange(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function assignOrReserveNumbers(params: {
  rifa: Rifa;
  numerosValores: string[];
  participante: Participante;
  mode: 'reservado' | 'atribuido' | 'confirmado';
  observacoes?: string;
  user: User;
}): Promise<void> {
  const { rifa, numerosValores, participante, mode, observacoes, user } = params;
  if (numerosValores.length === 0) {
    throw new Error('Selecione ao menos um número.');
  }
  if (numerosValores.length > BLUEPRINT_LIMITS.MAX_NUMBERS_PER_BATCH) {
    throw new Error(
      `Selecione no máximo ${BLUEPRINT_LIMITS.MAX_NUMBERS_PER_BATCH} números por operação.`
    );
  }

  const uniqueValores = Array.from(new Set(numerosValores));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Equipe',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const participanteNome = clampString(
    participante.nome,
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const cleanObs = clampString(
    observacoes || '',
    BLUEPRINT_LIMITS.OBSERVACOES_MAX
  );

  const atribuicaoId = generateSafeId('atr');
  const eventoId = generateSafeId('evt');
  const path = `rifas/${rifa.id}/numeros`;

  try {
    await runTransaction(db, async (tx) => {
      const rifaRef = doc(db, 'rifas', rifa.id);
      const rifaSnap = await tx.get(rifaRef);
      if (!rifaSnap.exists()) {
        throw new Error('Rifa não encontrada.');
      }
      const rifaData = rifaSnap.data() as Rifa;
      if (rifaData.status !== 'ativa' && rifaData.status !== 'rascunho') {
        throw new Error(
          'Esta rifa não aceita novas atribuições na situação atual.'
        );
      }

      const numRefs = uniqueValores.map((val) =>
        doc(db, 'rifas', rifa.id, 'numeros', val)
      );
      const numSnaps = await Promise.all(numRefs.map((ref) => tx.get(ref)));

      for (let i = 0; i < numSnaps.length; i++) {
        const snap = numSnaps[i];
        if (!snap.exists()) {
          throw new Error(`Número ${uniqueValores[i]} não encontrado.`);
        }
        const data = snap.data() as Numero;
        if (data.status !== 'disponivel') {
          throw new Error(
            `O número ${data.valor} não está mais disponível (situação atual: ${data.status}).`
          );
        }
      }

      const count = uniqueValores.length;
      const newDisp = Math.max(0, rifaData.contagemDisponiveis - count);
      const newRes =
        mode === 'reservado'
          ? rifaData.contagemReservados + count
          : rifaData.contagemReservados;
      const newAtr =
        mode === 'atribuido'
          ? rifaData.contagemAtribuidos + count
          : rifaData.contagemAtribuidos;
      const newConf =
        mode === 'confirmado'
          ? rifaData.contagemConfirmados + count
          : rifaData.contagemConfirmados;

      const reservedUntil =
        mode === 'reservado'
          ? Timestamp.fromMillis(
              Date.now() + (rifaData.duracaoReservaMinutos || 1440) * 60_000
            )
          : null;

      for (const ref of numRefs) {
        tx.update(ref, {
          status: mode,
          participanteId: participante.id,
          participanteNome,
          atribuicaoId,
          assignedBy: user.uid,
          assignedByName: actorName,
          assignedAt: serverTimestamp(),
          confirmedBy: mode === 'confirmado' ? user.uid : null,
          confirmedAt: mode === 'confirmado' ? serverTimestamp() : null,
          reservedUntil,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(rifaRef, {
        contagemDisponiveis: newDisp,
        contagemReservados: newRes,
        contagemAtribuidos: newAtr,
        contagemConfirmados: newConf,
        updatedAt: serverTimestamp(),
      });

      const atrStatus =
        mode === 'reservado'
          ? 'reservada'
          : mode === 'confirmado'
            ? 'confirmada'
            : 'atribuida';

      tx.set(doc(db, 'rifas', rifa.id, 'atribuicoes', atribuicaoId), {
        rifaId: rifa.id,
        participanteId: participante.id,
        participanteNome,
        numeros: uniqueValores,
        status: atrStatus,
        ...(cleanObs ? { observacoes: cleanObs } : {}),
        createdBy: user.uid,
        createdByName: actorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const eventType =
        mode === 'reservado'
          ? 'numeros_reservados'
          : mode === 'confirmado'
            ? 'numeros_confirmados'
            : 'numeros_atribuidos';
      const actionVerb =
        mode === 'reservado'
          ? 'Reservou'
          : mode === 'confirmado'
            ? 'Atribuiu e confirmou'
            : 'Atribuiu';

      const listaPreview =
        uniqueValores.length <= 5
          ? uniqueValores.join(', ')
          : `${uniqueValores.slice(0, 4).join(', ')} e +${uniqueValores.length - 4}`;

      tx.set(doc(db, 'rifas', rifa.id, 'eventos', eventoId), {
        rifaId: rifa.id,
        type: eventType,
        actorUid: user.uid,
        actorName,
        targetId: atribuicaoId,
        summary: clampString(
          `${actionVerb} ${count} número(s) (${listaPreview}) para ${participanteNome}.`,
          BLUEPRINT_LIMITS.SUMMARY_MAX
        ),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('não está mais disponível') ||
        error.message.includes('não encontrada') ||
        error.message.includes('não aceita'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function confirmNumbers(params: {
  rifaId: string;
  numerosValores: string[];
  user: User;
}): Promise<void> {
  const { rifaId, numerosValores, user } = params;
  const uniqueValores = Array.from(new Set(numerosValores));
  if (uniqueValores.length === 0) return;

  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Equipe',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const path = `rifas/${rifaId}/numeros`;

  try {
    await runTransaction(db, async (tx) => {
      const rifaRef = doc(db, 'rifas', rifaId);
      const rifaSnap = await tx.get(rifaRef);
      if (!rifaSnap.exists()) throw new Error('Rifa não encontrada.');
      const rifaData = rifaSnap.data() as Rifa;

      const numRefs = uniqueValores.map((v) =>
        doc(db, 'rifas', rifaId, 'numeros', v)
      );
      const numSnaps = await Promise.all(numRefs.map((r) => tx.get(r)));

      let fromReservado = 0;
      let fromAtribuido = 0;
      const toConfirmRefs: typeof numRefs = [];

      for (let i = 0; i < numSnaps.length; i++) {
        const snap = numSnaps[i];
        if (!snap.exists()) continue;
        const data = snap.data() as Numero;
        if (data.status === 'reservado') {
          fromReservado++;
          toConfirmRefs.push(numRefs[i]);
        } else if (data.status === 'atribuido') {
          fromAtribuido++;
          toConfirmRefs.push(numRefs[i]);
        }
      }

      if (toConfirmRefs.length === 0) {
        throw new Error('Nenhum número selecionado pode ser confirmado.');
      }

      for (const ref of toConfirmRefs) {
        tx.update(ref, {
          status: 'confirmado',
          confirmedBy: user.uid,
          confirmedAt: serverTimestamp(),
          reservedUntil: null,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(rifaRef, {
        contagemReservados: Math.max(
          0,
          rifaData.contagemReservados - fromReservado
        ),
        contagemAtribuidos: Math.max(
          0,
          rifaData.contagemAtribuidos - fromAtribuido
        ),
        contagemConfirmados:
          rifaData.contagemConfirmados + toConfirmRefs.length,
        updatedAt: serverTimestamp(),
      });

      const listaPreview =
        uniqueValores.length <= 5
          ? uniqueValores.join(', ')
          : `${uniqueValores.slice(0, 4).join(', ')} e +${uniqueValores.length - 4}`;

      tx.set(doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt')), {
        rifaId,
        type: 'numeros_confirmados',
        actorUid: user.uid,
        actorName,
        summary: clampString(
          `Confirmou ${toConfirmRefs.length} número(s): ${listaPreview}.`,
          BLUEPRINT_LIMITS.SUMMARY_MAX
        ),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Nenhum número')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function promoteReservationToAssigned(params: {
  rifaId: string;
  numerosValores: string[];
  user: User;
}): Promise<void> {
  const { rifaId, numerosValores, user } = params;
  const uniqueValores = Array.from(new Set(numerosValores));
  if (uniqueValores.length === 0) return;

  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Equipe',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const path = `rifas/${rifaId}/numeros`;

  try {
    await runTransaction(db, async (tx) => {
      const rifaRef = doc(db, 'rifas', rifaId);
      const rifaSnap = await tx.get(rifaRef);
      if (!rifaSnap.exists()) throw new Error('Rifa não encontrada.');
      const rifaData = rifaSnap.data() as Rifa;

      const numRefs = uniqueValores.map((v) =>
        doc(db, 'rifas', rifaId, 'numeros', v)
      );
      const numSnaps = await Promise.all(numRefs.map((r) => tx.get(r)));

      const toAssignRefs: typeof numRefs = [];
      for (let i = 0; i < numSnaps.length; i++) {
        const snap = numSnaps[i];
        if (snap.exists() && (snap.data() as Numero).status === 'reservado') {
          toAssignRefs.push(numRefs[i]);
        }
      }

      if (toAssignRefs.length === 0) {
        throw new Error('Nenhuma reserva selecionada para atribuir.');
      }

      for (const ref of toAssignRefs) {
        tx.update(ref, {
          status: 'atribuido',
          reservedUntil: null,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(rifaRef, {
        contagemReservados: Math.max(
          0,
          rifaData.contagemReservados - toAssignRefs.length
        ),
        contagemAtribuidos: rifaData.contagemAtribuidos + toAssignRefs.length,
        updatedAt: serverTimestamp(),
      });

      const listaPreview =
        uniqueValores.length <= 5
          ? uniqueValores.join(', ')
          : `${uniqueValores.slice(0, 4).join(', ')} e +${uniqueValores.length - 4}`;

      tx.set(doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt')), {
        rifaId,
        type: 'numeros_atribuidos',
        actorUid: user.uid,
        actorName,
        summary: clampString(
          `Converteu reserva em atribuição (${toAssignRefs.length} número(s)): ${listaPreview}.`,
          BLUEPRINT_LIMITS.SUMMARY_MAX
        ),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Nenhuma reserva')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function releaseNumbers(params: {
  rifaId: string;
  numerosValores: string[];
  user: User;
}): Promise<void> {
  const { rifaId, numerosValores, user } = params;
  const uniqueValores = Array.from(new Set(numerosValores));
  if (uniqueValores.length === 0) return;

  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Equipe',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const path = `rifas/${rifaId}/numeros`;

  try {
    await runTransaction(db, async (tx) => {
      const rifaRef = doc(db, 'rifas', rifaId);
      const rifaSnap = await tx.get(rifaRef);
      if (!rifaSnap.exists()) throw new Error('Rifa não encontrada.');
      const rifaData = rifaSnap.data() as Rifa;

      const numRefs = uniqueValores.map((v) =>
        doc(db, 'rifas', rifaId, 'numeros', v)
      );
      const numSnaps = await Promise.all(numRefs.map((r) => tx.get(r)));

      let fromReservado = 0;
      let fromAtribuido = 0;
      let fromConfirmado = 0;
      const toReleaseRefs: typeof numRefs = [];

      for (let i = 0; i < numSnaps.length; i++) {
        const snap = numSnaps[i];
        if (!snap.exists()) continue;
        const data = snap.data() as Numero;
        if (data.status === 'disponivel') continue;
        if (data.status === 'reservado') fromReservado++;
        else if (data.status === 'atribuido') fromAtribuido++;
        else if (data.status === 'confirmado') fromConfirmado++;
        toReleaseRefs.push(numRefs[i]);
      }

      if (toReleaseRefs.length === 0) {
        throw new Error('Os números selecionados já estão disponíveis.');
      }

      for (const ref of toReleaseRefs) {
        tx.update(ref, {
          status: 'disponivel',
          participanteId: null,
          participanteNome: null,
          atribuicaoId: null,
          assignedBy: null,
          assignedByName: null,
          assignedAt: null,
          confirmedBy: null,
          confirmedAt: null,
          reservedUntil: null,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(rifaRef, {
        contagemDisponiveis:
          rifaData.contagemDisponiveis + toReleaseRefs.length,
        contagemReservados: Math.max(
          0,
          rifaData.contagemReservados - fromReservado
        ),
        contagemAtribuidos: Math.max(
          0,
          rifaData.contagemAtribuidos - fromAtribuido
        ),
        contagemConfirmados: Math.max(
          0,
          rifaData.contagemConfirmados - fromConfirmado
        ),
        updatedAt: serverTimestamp(),
      });

      const listaPreview =
        uniqueValores.length <= 5
          ? uniqueValores.join(', ')
          : `${uniqueValores.slice(0, 4).join(', ')} e +${uniqueValores.length - 4}`;

      tx.set(doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt')), {
        rifaId,
        type: 'numeros_liberados',
        actorUid: user.uid,
        actorName,
        summary: clampString(
          `Liberou ${toReleaseRefs.length} número(s) de volta para disponíveis: ${listaPreview}.`,
          BLUEPRINT_LIMITS.SUMMARY_MAX
        ),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('já estão disponíveis')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
