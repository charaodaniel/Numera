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
  type Evento,
  type Numero,
  type Participante,
  type Rifa,
  type Sorteio,
  type SorteioResultado,
} from '../../types/numera';

export function subscribeRifaSorteios(
  rifaId: string,
  onChange: (sorteios: Sorteio[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/sorteios`;
  const q = query(
    collection(db, 'rifas', rifaId, 'sorteios'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Sorteio)
        .sort((a, b) => {
          const ta = a.realizadoEm?.toMillis?.() ?? 0;
          const tb = b.realizadoEm?.toMillis?.() ?? 0;
          return tb - ta;
        });
      onChange(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeRifaEventos(
  rifaId: string,
  onChange: (eventos: Evento[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/eventos`;
  const q = query(
    collection(db, 'rifas', rifaId, 'eventos'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Evento)
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

function secureRandomIndex(maxExclusive: number): number {
  const array = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
  let rand: number;
  do {
    crypto.getRandomValues(array);
    rand = array[0];
  } while (rand >= limit);
  return rand % maxExclusive;
}

export function getEligibleNumbers(rifa: Rifa, numeros: Numero[]): Numero[] {
  if (rifa.regraElegibilidade === 'confirmados') {
    return numeros.filter((n) => n.status === 'confirmado');
  }
  return numeros.filter(
    (n) => n.status === 'confirmado' || n.status === 'atribuido'
  );
}

export async function executarSorteio(params: {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  premiosDescricoes: string[];
  finalizarRifa: boolean;
  user: User;
}): Promise<Sorteio> {
  const {
    rifa,
    numeros,
    participantes,
    premiosDescricoes,
    finalizarRifa,
    user,
  } = params;

  const eligible = getEligibleNumbers(rifa, numeros);
  if (eligible.length === 0) {
    throw new Error(
      'Não há números elegíveis para realizar o sorteio com a regra atual.'
    );
  }

  const premiosCount = Math.min(20, Math.max(1, premiosDescricoes.length));
  const participanteMap = new Map(participantes.map((p) => [p.id, p]));

  let pool = [...eligible];
  const resultados: SorteioResultado[] = [];

  for (let i = 0; i < premiosCount; i++) {
    if (pool.length === 0) break;
    const idx = secureRandomIndex(pool.length);
    const chosen = pool[idx];
    const partId = chosen.participanteId || '';
    const part = partId ? participanteMap.get(partId) : undefined;

    resultados.push({
      ordem: i + 1,
      premioDescricao: clampString(
        premiosDescricoes[i] || (i === 0 ? rifa.premio : `${i + 1}º Prêmio`),
        200
      ),
      numero: chosen.valor,
      participanteId: partId,
      participanteNome:
        part?.nome ?? chosen.participanteNome ?? 'Participante não identificado',
      participanteTelefone: part?.whatsapp || part?.telefone || '',
    });

    if (rifa.permitirMultiplosPremios) {
      pool = pool.filter((n) => n.valor !== chosen.valor);
    } else {
      pool = pool.filter((n) =>
        partId ? n.participanteId !== partId : n.valor !== chosen.valor
      );
    }
  }

  if (resultados.length === 0) {
    throw new Error('Não foi possível selecionar ganhadores elegíveis.');
  }

  const sorteioId = generateSafeId('sort');
  const sorteioRef = doc(db, 'rifas', rifa.id, 'sorteios', sorteioId);
  const eventoRef = doc(db, 'rifas', rifa.id, 'eventos', generateSafeId('evt'));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Responsável',
    BLUEPRINT_LIMITS.NAME_MAX
  );

  try {
    const batch = writeBatch(db);
    batch.set(sorteioRef, {
      rifaId: rifa.id,
      regraElegibilidade: rifa.regraElegibilidade,
      totalElegiveis: eligible.length,
      quantidadePremios: resultados.length,
      resultados,
      realizadoPor: user.uid,
      realizadoPorNome: actorName,
      realizadoEm: serverTimestamp(),
      status: 'concluido',
    });

    if (finalizarRifa && rifa.status !== 'arquivada') {
      batch.update(doc(db, 'rifas', rifa.id), {
        status: 'finalizada',
        updatedAt: serverTimestamp(),
      });
    }

    const winnersSummary = resultados
      .map((r) => `#${r.numero} (${r.participanteNome})`)
      .join(', ');

    batch.set(eventoRef, {
      rifaId: rifa.id,
      type: 'sorteio_realizado',
      actorUid: user.uid,
      actorName,
      targetId: sorteioId,
      summary: clampString(
        `Realizou sorteio (${eligible.length} elegíveis). Ganhador(es): ${winnersSummary}.`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      id: sorteioId,
      rifaId: rifa.id,
      regraElegibilidade: rifa.regraElegibilidade,
      totalElegiveis: eligible.length,
      quantidadePremios: resultados.length,
      resultados,
      realizadoPor: user.uid,
      realizadoPorNome: actorName,
      realizadoEm: null as unknown as Sorteio['realizadoEm'],
      status: 'concluido',
    };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `rifas/${rifa.id}/sorteios/${sorteioId}`
    );
  }
}
