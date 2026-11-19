import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sanitizeRifaPalette } from '../rifaPalettes';
import {
  BLUEPRINT_LIMITS,
  clampString,
  formatTicketNumber,
  generateSafeId,
  getDefaultPermissionsForRole,
  type EligibilityRule,
  type Rifa,
  type RifaColorPalette,
  type RifaStatus,
} from '../../types/numera';

export interface CreateRifaInput {
  titulo: string;
  descricao: string;
  premio: string;
  imagemUrl: string;
  corPrimaria?: RifaColorPalette;
  status: 'rascunho' | 'ativa';
  numeroInicial: number;
  numeroFinal: number;
  digitos: number;
  dataPrevista: string;
  regraElegibilidade: EligibilityRule;
  permitirMultiplosPremios: boolean;
  duracaoReservaMinutos: number;
  valorNumero?: number;
}

function sanitizeValorNumero(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  const clamped = Math.min(BLUEPRINT_LIMITS.VALOR_NUMERO_MAX, Math.max(0, value));
  return Math.round(clamped * 100) / 100;
}

export async function createRifa(
  input: CreateRifaInput,
  user: User
): Promise<string> {
  const titulo = clampString(input.titulo, BLUEPRINT_LIMITS.TITULO_MAX);
  const premio = clampString(input.premio, BLUEPRINT_LIMITS.PREMIO_MAX);
  const descricao = clampString(input.descricao, BLUEPRINT_LIMITS.DESCRICAO_MAX);
  const imagemUrl = clampString(input.imagemUrl, BLUEPRINT_LIMITS.IMAGEM_URL_MAX);
  const dataPrevista = clampString(
    input.dataPrevista,
    BLUEPRINT_LIMITS.DATA_PREVISTA_MAX
  );

  if (titulo.length < BLUEPRINT_LIMITS.TITULO_MIN) {
    throw new Error('Informe um título com pelo menos 2 caracteres.');
  }
  if (premio.length < BLUEPRINT_LIMITS.PREMIO_MIN) {
    throw new Error('Informe o prêmio da rifa com pelo menos 2 caracteres.');
  }

  if (
    !Number.isFinite(input.numeroInicial) ||
    !Number.isFinite(input.numeroFinal) ||
    !Number.isInteger(input.numeroInicial) ||
    !Number.isInteger(input.numeroFinal)
  ) {
    throw new Error('Os números inicial e final devem ser inteiros válidos.');
  }

  if (input.numeroInicial < 0 || input.numeroFinal < 0) {
    throw new Error('Os números inicial e final não podem ser negativos.');
  }

  if (input.numeroInicial > 100000) {
    throw new Error('O número inicial não pode ultrapassar 100.000.');
  }

  if (input.numeroInicial > input.numeroFinal) {
    throw new Error('O número inicial não pode ser superior ao número final.');
  }

  const numeroInicial = input.numeroInicial;
  const numeroFinal = input.numeroFinal;
  const totalNumeros = numeroFinal - numeroInicial + 1;

  if (totalNumeros < 1 || totalNumeros > BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA) {
    throw new Error(
      `A quantidade total de números (${totalNumeros}) deve ficar entre 1 e ${BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA}.`
    );
  }

  const minDigitos = String(numeroFinal).length;
  const digitos = Math.min(8, Math.max(minDigitos, Math.floor(input.digitos)));
  const duracaoReservaMinutos = Math.min(
    43200,
    Math.max(5, Math.floor(input.duracaoReservaMinutos || 1440))
  );

  const rifaId = generateSafeId('rifa');
  const rifaRef = doc(db, 'rifas', rifaId);
  const membroRef = doc(db, 'rifas', rifaId, 'membros', user.uid);
  const eventoId = generateSafeId('evt');
  const eventoRef = doc(db, 'rifas', rifaId, 'eventos', eventoId);

  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Proprietário',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const actorEmail = clampString(
    (user.email || '').toLowerCase(),
    BLUEPRINT_LIMITS.EMAIL_MAX
  );

  const numbersToCreate: { valor: string; indice: number }[] = [];
  for (let i = numeroInicial; i <= numeroFinal; i++) {
    numbersToCreate.push({
      valor: formatTicketNumber(i, digitos),
      indice: i,
    });
  }

  try {
    const batch1 = writeBatch(db);

    const valorNumero = sanitizeValorNumero(input.valorNumero);
    const corPrimaria = sanitizeRifaPalette(input.corPrimaria);

    batch1.set(rifaRef, {
      ownerId: user.uid,
      titulo,
      ...(descricao ? { descricao } : {}),
      premio,
      ...(imagemUrl ? { imagemUrl } : {}),
      corPrimaria,
      status: input.status,
      numeroInicial,
      numeroFinal,
      digitos,
      ...(dataPrevista ? { dataPrevista } : {}),
      regraElegibilidade: input.regraElegibilidade,
      permitirMultiplosPremios: input.permitirMultiplosPremios,
      duracaoReservaMinutos,
      ...(valorNumero > 0 ? { valorNumero } : {}),
      totalNumeros,
      contagemDisponiveis: totalNumeros,
      contagemReservados: 0,
      contagemAtribuidos: 0,
      contagemConfirmados: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch1.set(membroRef, {
      uid: user.uid,
      rifaId,
      name: actorName,
      email: actorEmail,
      role: 'proprietario',
      permissions: getDefaultPermissionsForRole('proprietario'),
      status: 'ativo',
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch1.set(eventoRef, {
      rifaId,
      type: 'rifa_criada',
      actorUid: user.uid,
      actorName,
      targetId: rifaId,
      summary: clampString(
        `Criou a rifa "${titulo}" com ${totalNumeros} números (${formatTicketNumber(numeroInicial, digitos)}–${formatTicketNumber(numeroFinal, digitos)}).`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });

    await batch1.commit();

    // Commit sequential ticket numbers in chunks of 400 after parent rifa exists
    for (let offset = 0; offset < numbersToCreate.length; offset += 400) {
      const chunk = numbersToCreate.slice(offset, offset + 400);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const numRef = doc(db, 'rifas', rifaId, 'numeros', item.valor);
        batch.set(numRef, {
          rifaId,
          valor: item.valor,
          indice: item.indice,
          status: 'disponivel',
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return rifaId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rifas/${rifaId}`);
  }
}

export interface UpdateRifaConfigInput {
  titulo: string;
  descricao: string;
  premio: string;
  imagemUrl: string;
  corPrimaria?: RifaColorPalette;
  status: RifaStatus;
  dataPrevista: string;
  regraElegibilidade: EligibilityRule;
  permitirMultiplosPremios: boolean;
  duracaoReservaMinutos: number;
  valorNumero?: number;
}

export async function updateRifaConfig(
  rifaId: string,
  input: UpdateRifaConfigInput,
  user: User
): Promise<void> {
  const path = `rifas/${rifaId}`;
  const rifaRef = doc(db, 'rifas', rifaId);
  const eventoId = generateSafeId('evt');
  const eventoRef = doc(db, 'rifas', rifaId, 'eventos', eventoId);
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Usuário',
    BLUEPRINT_LIMITS.NAME_MAX
  );

  const payload = {
    titulo: clampString(input.titulo, BLUEPRINT_LIMITS.TITULO_MAX),
    descricao: clampString(input.descricao, BLUEPRINT_LIMITS.DESCRICAO_MAX),
    premio: clampString(input.premio, BLUEPRINT_LIMITS.PREMIO_MAX),
    imagemUrl: clampString(input.imagemUrl, BLUEPRINT_LIMITS.IMAGEM_URL_MAX),
    corPrimaria: sanitizeRifaPalette(input.corPrimaria),
    status: input.status,
    dataPrevista: clampString(
      input.dataPrevista,
      BLUEPRINT_LIMITS.DATA_PREVISTA_MAX
    ),
    regraElegibilidade: input.regraElegibilidade,
    permitirMultiplosPremios: input.permitirMultiplosPremios,
    duracaoReservaMinutos: Math.min(
      43200,
      Math.max(5, Math.floor(input.duracaoReservaMinutos || 1440))
    ),
    valorNumero: sanitizeValorNumero(input.valorNumero),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.update(rifaRef, payload);
    batch.set(eventoRef, {
      rifaId,
      type: 'rifa_atualizada',
      actorUid: user.uid,
      actorName,
      targetId: rifaId,
      summary:
        input.status === 'arquivada'
          ? `Arquivou a rifa "${payload.titulo}".`
          : `Atualizou as configurações da rifa "${payload.titulo}".`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveRifa(rifa: Rifa, user: User): Promise<void> {
  const path = `rifas/${rifa.id}`;
  const rifaRef = doc(db, 'rifas', rifa.id);
  const eventoRef = doc(db, 'rifas', rifa.id, 'eventos', generateSafeId('evt'));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Proprietário',
    BLUEPRINT_LIMITS.NAME_MAX
  );

  try {
    const batch = writeBatch(db);
    batch.update(rifaRef, {
      status: 'arquivada',
      updatedAt: serverTimestamp(),
    });
    batch.set(eventoRef, {
      rifaId: rifa.id,
      type: 'rifa_atualizada',
      actorUid: user.uid,
      actorName,
      targetId: rifa.id,
      summary: `Arquivou a rifa "${rifa.titulo}".`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserRifas(
  uid: string,
  onChange: (rifas: Rifa[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  let ownedRifas: Rifa[] = [];
  let sharedRifas: Rifa[] = [];

  const emit = () => {
    const map = new Map<string, Rifa>();
    for (const r of sharedRifas) map.set(r.id, r);
    for (const r of ownedRifas) map.set(r.id, r);
    const merged = Array.from(map.values()).sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() ?? 0;
      const tb = b.updatedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    onChange(merged);
  };

  const ownedQ = query(collection(db, 'rifas'), where('ownerId', '==', uid));
  const unsubOwned = onSnapshot(
    ownedQ,
    (snap) => {
      ownedRifas = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Rifa
      );
      emit();
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'rifas');
    }
  );

  const sharedCol = query(
    collection(db, 'users', uid, 'rifas_compartilhadas'),
    where('uid', '==', uid)
  );
  const unsubShared = onSnapshot(
    sharedCol,
    async (snap) => {
      try {
        const docs = await Promise.all(
          snap.docs.map(async (pointer) => {
            const rifaId = pointer.id;
            try {
              const rifaSnap = await getDoc(doc(db, 'rifas', rifaId));
              if (!rifaSnap.exists()) return null;
              return { id: rifaSnap.id, ...rifaSnap.data() } as Rifa;
            } catch {
              return null;
            }
          })
        );
        sharedRifas = docs.filter((r): r is Rifa => r !== null);
        emit();
      } catch (err) {
        if (onError) onError(err);
      }
    },
    (err) => {
      if (onError) onError(err);
      else
        handleFirestoreError(
          err,
          OperationType.LIST,
          `users/${uid}/rifas_compartilhadas`
        );
    }
  );

  return () => {
    unsubOwned();
    unsubShared();
  };
}

export async function refreshSharedRifa(rifaId: string): Promise<Rifa | null> {
  const path = `rifas/${rifaId}`;
  try {
    const snap = await getDoc(doc(db, 'rifas', rifaId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Rifa;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeRifaDoc(
  rifaId: string,
  onChange: (rifa: Rifa | null) => void
): Unsubscribe {
  const path = `rifas/${rifaId}`;
  return onSnapshot(
    doc(db, 'rifas', rifaId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
      } else {
        onChange({ id: snap.id, ...snap.data() } as Rifa);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function updateRifaStatusQuick(
  rifaId: string,
  status: RifaStatus,
  user: User
): Promise<void> {
  const path = `rifas/${rifaId}`;
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Usuário',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  try {
    await updateDoc(doc(db, 'rifas', rifaId), {
      status,
      updatedAt: serverTimestamp(),
    });
    const batch = writeBatch(db);
    batch.set(doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt')), {
      rifaId,
      type: 'rifa_atualizada',
      actorUid: user.uid,
      actorName,
      targetId: rifaId,
      summary: `Alterou a situação da rifa para "${status}".`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
