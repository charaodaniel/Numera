import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
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
  type Convite,
  type ConviteInbox,
  type ConviteTipo,
  type MemberPermissions,
  type Membro,
} from '../../types/numera';

export function subscribeRifaMembros(
  rifaId: string,
  onChange: (membros: Membro[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/membros`;
  const q = query(
    collection(db, 'rifas', rifaId, 'membros'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ ...d.data() }) as Membro)
        .filter((m) => m.status === 'ativo');
      onChange(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeRifaConvites(
  rifaId: string,
  onChange: (convites: Convite[]) => void
): Unsubscribe {
  const path = `rifas/${rifaId}/convites`;
  const q = query(
    collection(db, 'rifas', rifaId, 'convites'),
    where('rifaId', '==', rifaId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Convite)
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      onChange(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeMyPendingInvites(
  email: string,
  onChange: (convites: ConviteInbox[]) => void
): Unsubscribe {
  const normalized = email.trim().toLowerCase();
  const q = query(
    collection(db, 'convites_inbox'),
    where('email', '==', normalized)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as ConviteInbox)
        .filter((c) => c.status === 'pendente');
      onChange(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'convites_inbox')
  );
}

export async function getConviteById(
  conviteId: string
): Promise<{ convite: ConviteInbox | null; denied?: boolean }> {
  const cleanId = conviteId.trim();
  if (!cleanId || !BLUEPRINT_LIMITS.ID_PATTERN.test(cleanId)) {
    return { convite: null };
  }
  const path = `convites_inbox/${cleanId}`;
  try {
    const snap = await getDoc(doc(db, 'convites_inbox', cleanId));
    if (!snap.exists()) {
      return { convite: null };
    }
    return {
      convite: { id: snap.id, ...snap.data() } as ConviteInbox,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'permission-denied') {
      return { convite: null, denied: true };
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createConvite(params: {
  rifaId: string;
  rifaTitulo: string;
  tipo?: ConviteTipo;
  email?: string;
  role: 'colaborador' | 'vendedor';
  permissions: MemberPermissions;
  user: User;
}): Promise<string> {
  const {
    rifaId,
    rifaTitulo,
    tipo = 'email',
    email = '',
    role,
    permissions,
    user,
  } = params;

  const normalizedEmail =
    tipo === 'link'
      ? ''
      : clampString(email.toLowerCase(), BLUEPRINT_LIMITS.EMAIL_MAX);

  if (
    tipo === 'email' &&
    (!normalizedEmail.includes('@') || normalizedEmail.length < 5)
  ) {
    throw new Error('Informe um endereço de e-mail Google válido.');
  }

  const conviteId = generateSafeId('conv', tipo === 'link' ? 12 : 8);
  const conviteRef = doc(db, 'rifas', rifaId, 'convites', conviteId);
  const inboxRef = doc(db, 'convites_inbox', conviteId);
  const eventoRef = doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt'));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Proprietário',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const safeTitulo = clampString(rifaTitulo, BLUEPRINT_LIMITS.TITULO_MAX);

  try {
    const batch = writeBatch(db);
    batch.set(conviteRef, {
      rifaId,
      rifaTitulo: safeTitulo,
      email: normalizedEmail,
      tipo,
      role,
      permissions,
      status: 'pendente',
      createdBy: user.uid,
      expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(inboxRef, {
      conviteId,
      rifaId,
      rifaTitulo: safeTitulo,
      email: normalizedEmail,
      tipo,
      role,
      permissions,
      status: 'pendente',
      createdBy: user.uid,
      expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(eventoRef, {
      rifaId,
      type: 'convite_enviado',
      actorUid: user.uid,
      actorName,
      targetId: conviteId,
      summary: clampString(
        tipo === 'link'
          ? `Gerou link de convite como ${role}.`
          : `Convidou ${normalizedEmail} como ${role}.`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return conviteId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `rifas/${rifaId}/convites/${conviteId}`
    );
  }
}

export async function acceptConvite(
  convite: ConviteInbox,
  user: User
): Promise<void> {
  const conviteId = convite.conviteId || convite.id;
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Integrante',
    BLUEPRINT_LIMITS.NAME_MAX
  );
  const actorEmail = clampString(
    (user.email || '').toLowerCase(),
    BLUEPRINT_LIMITS.EMAIL_MAX
  );

  if (!actorEmail || !user.emailVerified) {
    throw new Error(
      'É necessário estar conectado com uma conta Google verificada para aceitar o convite.'
    );
  }

  if (
    convite.tipo !== 'link' &&
    convite.email &&
    convite.email.toLowerCase() !== actorEmail
  ) {
    throw new Error(
      `Este convite foi enviado para ${convite.email}. Você está conectado como ${actorEmail}.`
    );
  }

  const conviteRef = doc(db, 'rifas', convite.rifaId, 'convites', conviteId);
  const inboxRef = doc(db, 'convites_inbox', conviteId);
  const membroRef = doc(db, 'rifas', convite.rifaId, 'membros', user.uid);
  const pointerRef = doc(
    db,
    'users',
    user.uid,
    'rifas_compartilhadas',
    convite.rifaId
  );
  const eventoRef = doc(
    db,
    'rifas',
    convite.rifaId,
    'eventos',
    generateSafeId('evt')
  );

  try {
    const batch = writeBatch(db);
    batch.update(conviteRef, {
      status: 'aceito',
      acceptedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(inboxRef, {
      status: 'aceito',
      acceptedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.set(membroRef, {
      uid: user.uid,
      rifaId: convite.rifaId,
      name: actorName,
      email: actorEmail,
      role: convite.role,
      permissions: convite.permissions,
      status: 'ativo',
      inviteId: conviteId,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(pointerRef, {
      uid: user.uid,
      rifaId: convite.rifaId,
      role: convite.role,
      inviteId: conviteId,
      joinedAt: serverTimestamp(),
    });
    batch.set(eventoRef, {
      rifaId: convite.rifaId,
      type: 'convite_aceito',
      actorUid: user.uid,
      actorName,
      targetId: conviteId,
      summary: clampString(
        convite.tipo === 'link'
          ? `${actorName} (${actorEmail}) entrou por link de convite como ${convite.role}.`
          : `${actorName} aceitou o convite como ${convite.role}.`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `rifas/${convite.rifaId}/convites/${conviteId}`
    );
  }
}

export async function revokeConvite(
  rifaId: string,
  conviteId: string,
  user: User
): Promise<void> {
  const conviteRef = doc(db, 'rifas', rifaId, 'convites', conviteId);
  const inboxRef = doc(db, 'convites_inbox', conviteId);
  try {
    const batch = writeBatch(db);
    batch.update(conviteRef, {
      status: 'revogado',
      updatedAt: serverTimestamp(),
    });
    batch.update(inboxRef, {
      status: 'revogado',
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `rifas/${rifaId}/convites/${conviteId}`
    );
  }
}

export async function updateMembro(params: {
  rifaId: string;
  targetMembro: Membro;
  role: 'colaborador' | 'vendedor';
  permissions: MemberPermissions;
  status: 'ativo' | 'removido';
  user: User;
}): Promise<void> {
  const { rifaId, targetMembro, role, permissions, status, user } = params;
  const membroRef = doc(db, 'rifas', rifaId, 'membros', targetMembro.uid);
  const eventoRef = doc(db, 'rifas', rifaId, 'eventos', generateSafeId('evt'));
  const actorName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Gestor',
    BLUEPRINT_LIMITS.NAME_MAX
  );

  try {
    const batch = writeBatch(db);
    batch.update(membroRef, {
      role,
      permissions,
      status,
      updatedAt: serverTimestamp(),
    });
    batch.set(eventoRef, {
      rifaId,
      type: 'membro_atualizado',
      actorUid: user.uid,
      actorName,
      targetId: targetMembro.uid,
      summary: clampString(
        status === 'removido'
          ? `Removeu ${targetMembro.name} da equipe.`
          : `Atualizou permissões de ${targetMembro.name} (${role}).`,
        BLUEPRINT_LIMITS.SUMMARY_MAX
      ),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `rifas/${rifaId}/membros/${targetMembro.uid}`
    );
  }
}
