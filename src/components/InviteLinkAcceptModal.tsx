import React, { useEffect, useState } from 'react';
import { Check, Link2, LogOut, ShieldCheck, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { getConviteById, acceptConvite } from '../lib/api/equipe';
import { signOutUser } from '../lib/auth';
import {
  formatTimestampPt,
  getRoleLabel,
  type ConviteInbox,
  type Rifa,
} from '../types/numera';

interface InviteLinkAcceptModalProps {
  conviteId: string;
  user: User;
  rifas: Rifa[];
  rifasLoading: boolean;
  onAccepted: (rifaId: string) => void;
  onClose: () => void;
}

export const InviteLinkAcceptModal: React.FC<InviteLinkAcceptModalProps> = ({
  conviteId,
  user,
  rifas,
  rifasLoading,
  onAccepted,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [convite, setConvite] = useState<ConviteInbox | null>(null);
  const [denied, setDenied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDenied(false);

    getConviteById(conviteId)
      .then((res) => {
        if (!active) return;
        setConvite(res.convite);
        setDenied(Boolean(res.denied));
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os dados do convite.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [conviteId, user.uid]);

  const userEmail = (user.email || '').toLowerCase();
  const isWaitingForData = loading || rifasLoading;

  const isExpired =
    Boolean(convite?.expiresAt?.toMillis) &&
    convite!.expiresAt.toMillis() < Date.now();

  const alreadyRifa = convite
    ? rifas.find((r) => r.id === convite.rifaId) || null
    : null;

  const isEmailMismatch =
    Boolean(convite) &&
    convite!.tipo !== 'link' &&
    Boolean(convite!.email) &&
    convite!.email.toLowerCase() !== userEmail;

  const isUnavailable =
    !isWaitingForData &&
    (!convite ||
      denied ||
      convite.status !== 'pendente' ||
      isExpired);

  const handleAccept = async () => {
    if (!convite) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptConvite(convite, user);
      onAccepted(convite.rifaId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível vincular sua conta Google ao convite.'
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await signOutUser();
  };

  const permissionItems: string[] = ['Cadastrar participantes', 'Atribuir números disponíveis'];
  if (convite) {
    if (convite.role === 'colaborador') {
      permissionItems.push('Confirmar ou liberar números');
      if (convite.permissions.configurarRifa) {
        permissionItems.push('Configurar dados da rifa');
      }
      if (convite.permissions.gerenciarEquipe) {
        permissionItems.push('Gerenciar integrantes da equipe');
      }
      if (convite.permissions.realizarSorteio) {
        permissionItems.push('Realizar sorteios');
      }
    } else if (convite.permissions.confirmarLiberar) {
      permissionItems.push('Confirmar ou liberar números');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 px-4 py-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-accept-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#F0EFE9] pb-4">
          <div className="flex items-center gap-2.5">
            <Link2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <div>
              <h2
                id="invite-accept-title"
                className="text-base font-bold text-[#14171A]"
              >
                Convite para equipe da rifa
              </h2>
              <p className="text-xs text-[#64686E]">
                Vínculo de acesso com conta Google
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de convite"
            className="rounded-xl p-1.5 text-[#64686E] hover:bg-[#F3F1EC] hover:text-[#14171A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {isWaitingForData ? (
            <div className="py-8 text-center text-sm text-[#64686E]">
              Verificando link de convite...
            </div>
          ) : alreadyRifa ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <p className="font-semibold">
                  Sua conta Google já faz parte desta rifa.
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  Você já tem acesso à rifa <strong>{alreadyRifa.titulo}</strong>{' '}
                  com a conta {user.email}.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#D8D5CD] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] min-h-[44px]"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => onAccepted(alreadyRifa.id)}
                  className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 min-h-[44px]"
                >
                  Abrir rifa
                </button>
              </div>
            </div>
          ) : isUnavailable ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Convite indisponível</p>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  {convite?.status === 'revogado'
                    ? 'Este link de convite foi revogado pelo responsável da rifa.'
                    : convite?.status === 'aceito'
                      ? 'Este convite já foi utilizado.'
                      : isExpired
                        ? 'Este link de convite expirou.'
                        : 'Este link de convite é inválido, já foi utilizado ou foi revogado.'}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-[#14171A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#272B30] min-h-[44px]"
                >
                  Ir para Minhas rifas
                </button>
              </div>
            </div>
          ) : convite && isEmailMismatch ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">
                  Convite restrito a outro e-mail Google
                </p>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  Este convite foi emitido para <strong>{convite.email}</strong>,
                  mas você está conectado como <strong>{user.email}</strong>.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#D8D5CD] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#14171A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#272B30] min-h-[44px]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Trocar conta Google
                </button>
              </div>
            </div>
          ) : (
            convite && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#64686E]">
                    Rifa convidada
                  </p>
                  <p className="text-lg font-bold text-[#14171A]">
                    {convite.rifaTitulo}
                  </p>
                  <p className="text-xs text-[#64686E]">
                    Papel: <strong className="text-[#14171A]">{getRoleLabel(convite.role)}</strong>
                    <span aria-hidden="true"> · </span>
                    Válido até {formatTimestampPt(convite.expiresAt)}
                  </p>
                </div>

                <div className="border-t border-[#F0EFE9] pt-4">
                  <p className="text-xs font-semibold text-[#374151]">
                    Permissões incluídas neste acesso
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-[#4B5563]">
                    {permissionItems.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#14171A]">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Conta Google que será vinculada</span>
                  </div>
                  <p className="mt-1 text-xs text-[#4B5563]">
                    {user.displayName || 'Usuário Google'} ·{' '}
                    <span className="font-mono">{user.email}</span>
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                  >
                    {error}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-1">
                  <button
                    type="button"
                    disabled={accepting}
                    onClick={onClose}
                    className="rounded-xl border border-[#D8D5CD] px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] disabled:opacity-50 min-h-[44px]"
                  >
                    Agora não
                  </button>
                  <button
                    type="button"
                    disabled={accepting}
                    onClick={handleAccept}
                    className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors min-h-[44px]"
                  >
                    {accepting
                      ? 'Vinculando conta...'
                      : 'Vincular conta Google e aceitar'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
