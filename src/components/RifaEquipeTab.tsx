import React, { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  MailPlus,
  MessageCircle,
  Shield,
  Trash2,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  createConvite,
  revokeConvite,
  updateMembro,
} from '../lib/api/equipe';
import {
  formatTimestampPt,
  getDefaultPermissionsForRole,
  getRoleLabel,
  type Convite,
  type ConviteTipo,
  type MemberPermissions,
  type Membro,
  type Numero,
  type Participante,
  type Rifa,
  type RoleCapabilities,
} from '../types/numera';
import { RifaParticipantesTab } from './RifaParticipantesTab';

export type EquipeSection = 'membros' | 'participantes';

interface RifaEquipeTabProps {
  rifa: Rifa;
  membros: Membro[];
  convites: Convite[];
  participantes: Participante[];
  numeros: Numero[];
  capabilities: RoleCapabilities;
  user: User;
  activeSection?: EquipeSection;
  onSectionChange?: (section: EquipeSection) => void;
}

function buildInviteUrl(conviteId: string): string {
  if (typeof window === 'undefined') return `/?convite=${conviteId}`;
  return `${window.location.origin}/?convite=${encodeURIComponent(conviteId)}`;
}

function buildWhatsAppShareHref(
  inviteUrl: string,
  rifaTitulo: string,
  roleLabel: string
): string {
  const message = `Olá! Você recebeu um convite para atuar como ${roleLabel} na rifa "${rifaTitulo}" no Numera. Abra o link e conecte sua conta Google para entrar na equipe: ${inviteUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function getInviteStatusLabel(status: Convite['status']): string {
  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'aceito':
      return 'Aceito';
    case 'revogado':
      return 'Revogado';
  }
}

export const RifaEquipeTab: React.FC<RifaEquipeTabProps> = ({
  rifa,
  membros,
  convites,
  participantes,
  numeros,
  capabilities,
  user,
  activeSection,
  onSectionChange,
}) => {
  const [internalSection, setInternalSection] =
    useState<EquipeSection>('membros');
  const currentSection = activeSection ?? internalSection;
  const setSection = (next: EquipeSection) => {
    setInternalSection(next);
    onSectionChange?.(next);
  };

  const [inviteMode, setInviteMode] = useState<ConviteTipo>('link');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'colaborador' | 'vendedor'>(
    'vendedor'
  );
  const [invitePerms, setInvitePerms] = useState<MemberPermissions>(
    getDefaultPermissionsForRole('vendedor')
  );
  const [busy, setBusy] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{
    id: string;
    url: string;
    role: 'colaborador' | 'vendedor';
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const handleRoleChange = (role: 'colaborador' | 'vendedor') => {
    setInviteRole(role);
    setInvitePerms(getDefaultPermissionsForRole(role));
  };

  const handleCopyLink = async (conviteId: string) => {
    const url = buildInviteUrl(conviteId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(conviteId);
      setTimeout(() => {
        setCopiedId((current) => (current === conviteId ? null : current));
      }, 2500);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Não foi possível copiar automaticamente. Copie o link exibido na tela.',
      });
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const conviteId = await createConvite({
        rifaId: rifa.id,
        rifaTitulo: rifa.titulo,
        tipo: inviteMode,
        email: inviteMode === 'email' ? inviteEmail : '',
        role: inviteRole,
        permissions: invitePerms,
        user,
      });

      const url = buildInviteUrl(conviteId);
      setGeneratedLink({
        id: conviteId,
        url,
        role: inviteRole,
      });

      if (inviteMode === 'email') {
        const sentTo = inviteEmail.trim().toLowerCase();
        setInviteEmail('');
        setFeedback({
          type: 'success',
          text: `Convite enviado para ${sentTo}. A pessoa verá na tela inicial ao entrar com esse e-mail Google ou pode acessar pelo link gerado abaixo.`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'Link de convite gerado. Quem abrir o link e entrar com uma conta Google será vinculado à equipe.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao criar convite.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePermission = async (
    membro: Membro,
    key: keyof MemberPermissions
  ) => {
    if (membro.role === 'proprietario') return;
    setBusy(true);
    setFeedback(null);
    try {
      await updateMembro({
        rifaId: rifa.id,
        targetMembro: membro,
        role: membro.role,
        permissions: {
          ...membro.permissions,
          [key]: !membro.permissions[key],
        },
        status: 'ativo',
        user,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Erro ao atualizar permissão.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (membro: Membro) => {
    if (membro.role === 'proprietario') return;
    setBusy(true);
    setFeedback(null);
    try {
      await updateMembro({
        rifaId: rifa.id,
        targetMembro: membro,
        role: membro.role,
        permissions: membro.permissions,
        status: 'removido',
        user,
      });
      setFeedback({
        type: 'success',
        text: `${membro.name} foi removido da rifa.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Erro ao remover integrante.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (conviteId: string) => {
    setBusy(true);
    try {
      await revokeConvite(rifa.id, conviteId, user);
      if (generatedLink?.id === conviteId) {
        setGeneratedLink(null);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Erro ao revogar convite.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E6E4DD] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#14171A]">
            Equipe e participantes
          </h2>
          <p className="text-xs text-[#64686E]">
            Gerencie colaboradores, vendedores, links de convite e o cadastro de
            participantes da rifa.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Seções dentro de Equipe"
          className="inline-flex items-center gap-1 rounded-xl border border-[#E6E4DD] bg-[#F3F1EC] p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentSection === 'membros'}
            onClick={() => setSection('membros')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
              currentSection === 'membros'
                ? 'bg-white text-[#14171A] shadow-xs'
                : 'text-[#4B5563] hover:text-[#14171A]'
            }`}
          >
            <UsersRound className="h-3.5 w-3.5" />
            <span>Integrantes e convites</span>
            <span className="font-mono tabular-nums text-[#64686E]">
              ({membros.length})
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentSection === 'participantes'}
            onClick={() => setSection('participantes')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
              currentSection === 'participantes'
                ? 'bg-white text-[#14171A] shadow-xs'
                : 'text-[#4B5563] hover:text-[#14171A]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Participantes</span>
            <span className="font-mono tabular-nums text-[#64686E]">
              ({participantes.length})
            </span>
          </button>
        </div>
      </div>

      {currentSection === 'participantes' ? (
        <RifaParticipantesTab
          rifa={rifa}
          participantes={participantes}
          numeros={numeros}
          capabilities={capabilities}
          user={user}
        />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-[#14171A]">
              <Shield className="h-4 w-4 text-emerald-700" />
              <span>Seu papel nesta rifa: {getRoleLabel(capabilities.role)}</span>
            </div>
            <p className="mt-1.5 text-xs text-[#4B5563] leading-relaxed">
              {capabilities.isOwner
                ? 'Você tem controle total sobre configurações, equipe, números, confirmações, sorteios e arquivamento.'
                : capabilities.role === 'colaborador'
                  ? 'Como colaborador, você pode cadastrar participantes, atribuir, gerenciar e confirmar números, além das permissões extras habilitadas pelo proprietário.'
                  : 'Como vendedor, você pode cadastrar participantes, atribuir números disponíveis e gerenciar suas próprias atribuições.'}
            </p>
          </section>

          {feedback && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-950'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {capabilities.canManageTeam && rifa.status !== 'arquivada' && (
            <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-base font-bold text-[#14171A]">
                  {inviteMode === 'link' ? (
                    <Link2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <MailPlus className="h-4 w-4 text-emerald-700" />
                  )}
                  <h2>Convidar colaborador ou vendedor</h2>
                </div>

                <div className="inline-flex items-center gap-1 rounded-xl border border-[#E6E4DD] bg-[#F3F1EC] p-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteMode('link');
                      setFeedback(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      inviteMode === 'link'
                        ? 'bg-white text-[#14171A] shadow-xs'
                        : 'text-[#4B5563] hover:text-[#14171A]'
                    }`}
                  >
                    Link de convite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteMode('email');
                      setFeedback(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      inviteMode === 'email'
                        ? 'bg-white text-[#14171A] shadow-xs'
                        : 'text-[#4B5563] hover:text-[#14171A]'
                    }`}
                  >
                    Por e-mail Google
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateInvite} className="mt-5 space-y-4">
                {inviteMode === 'link' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-[#374151]">
                        Convite aberto por link (uso único)
                      </p>
                      <p className="mt-1 text-xs text-[#64686E] leading-relaxed">
                        Gere um link exclusivo para enviar pelo WhatsApp. A
                        pessoa acessa o link, entra com a conta Google dela e
                        fica vinculada automaticamente à equipe desta rifa.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151]">
                        Papel na rifa
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          handleRoleChange(
                            e.target.value as 'colaborador' | 'vendedor'
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="colaborador">Colaborador</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#374151]">
                        E-mail Google do integrante *
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="pessoa@gmail.com"
                        className="mt-1.5 w-full rounded-lg border border-[#D8D5CD] px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151]">
                        Papel na rifa
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          handleRoleChange(
                            e.target.value as 'colaborador' | 'vendedor'
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="colaborador">Colaborador</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-[#FAF9F6] p-4">
                  <p className="text-xs font-semibold text-[#14171A]">
                    Permissões opcionais para este convite
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs text-[#374151]">
                    {inviteRole === 'vendedor' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={invitePerms.confirmarLiberar}
                          onChange={(e) =>
                            setInvitePerms((p) => ({
                              ...p,
                              confirmarLiberar: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                        />
                        <span>Confirmar ou liberar números</span>
                      </label>
                    )}

                    {inviteRole === 'colaborador' && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={invitePerms.configurarRifa}
                            onChange={(e) =>
                              setInvitePerms((p) => ({
                                ...p,
                                configurarRifa: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                          />
                          <span>Configurar dados da rifa</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={invitePerms.gerenciarEquipe}
                            onChange={(e) =>
                              setInvitePerms((p) => ({
                                ...p,
                                gerenciarEquipe: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                          />
                          <span>Gerenciar integrantes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={invitePerms.realizarSorteio}
                            onChange={(e) =>
                              setInvitePerms((p) => ({
                                ...p,
                                realizarSorteio: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                          />
                          <span>Realizar sorteios</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                  >
                    {inviteMode === 'link' ? (
                      <Link2 className="h-4 w-4" />
                    ) : (
                      <MailPlus className="h-4 w-4" />
                    )}
                    {busy
                      ? inviteMode === 'link'
                        ? 'Gerando link...'
                        : 'Enviando...'
                      : inviteMode === 'link'
                        ? 'Gerar link de convite'
                        : 'Enviar convite'}
                  </button>
                </div>
              </form>

              {generatedLink && (
                <div className="mt-6 border-t border-[#F0EFE9] pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#14171A]">
                        Link pronto para compartilhar ·{' '}
                        {getRoleLabel(generatedLink.role)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64686E]">
                        Uso único · Válido por 7 dias · Vincula à conta Google
                        de quem aceitar
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(generatedLink.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E4DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-[#FAF9F6] whitespace-nowrap shrink-0"
                      >
                        {copiedId === generatedLink.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Link copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-[#64686E]" />
                            <span>Copiar link</span>
                          </>
                        )}
                      </button>
                      <a
                        href={buildWhatsAppShareHref(
                          generatedLink.url,
                          rifa.titulo,
                          getRoleLabel(generatedLink.role)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>Enviar no WhatsApp</span>
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-[#FAF9F6] px-3.5 py-2.5 font-mono text-xs text-[#374151] break-all select-all">
                    {generatedLink.url}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white">
            <div className="border-b border-[#E6E4DD] px-6 py-4">
              <h2 className="text-base font-bold text-[#14171A]">
                Integrantes ativos ({membros.length})
              </h2>
            </div>

            <div className="divide-y divide-[#F0EFE9]">
              {membros.map((m) => (
                <div
                  key={m.uid}
                  className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-700" />
                      <span className="text-sm font-bold text-[#14171A]">
                        {m.name}
                      </span>
                      <span className="text-xs font-medium text-[#64686E]">
                        · {getRoleLabel(m.role)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64686E]">
                      {m.email} · Entrou em {formatTimestampPt(m.joinedAt)}
                    </p>
                  </div>

                  {capabilities.canManageTeam &&
                    m.role !== 'proprietario' &&
                    rifa.status !== 'arquivada' && (
                      <div className="flex flex-wrap items-center gap-3">
                        {m.role === 'vendedor' && (
                          <label className="flex items-center gap-1.5 text-xs text-[#374151] cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={busy}
                              checked={m.permissions.confirmarLiberar}
                              onChange={() =>
                                handleTogglePermission(m, 'confirmarLiberar')
                              }
                              className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                            />
                            <span>Confirmar/Liberar</span>
                          </label>
                        )}

                        {m.role === 'colaborador' && (
                          <>
                            <label className="flex items-center gap-1.5 text-xs text-[#374151] cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={busy}
                                checked={m.permissions.configurarRifa}
                                onChange={() =>
                                  handleTogglePermission(m, 'configurarRifa')
                                }
                                className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                              />
                              <span>Configurar</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-[#374151] cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={busy}
                                checked={m.permissions.gerenciarEquipe}
                                onChange={() =>
                                  handleTogglePermission(m, 'gerenciarEquipe')
                                }
                                className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                              />
                              <span>Equipe</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-[#374151] cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={busy}
                                checked={m.permissions.realizarSorteio}
                                onChange={() =>
                                  handleTogglePermission(m, 'realizarSorteio')
                                }
                                className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700"
                              />
                              <span>Sortear</span>
                            </label>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRemoveMember(m)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </section>

          {capabilities.canManageTeam && convites.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white">
              <div className="border-b border-[#E6E4DD] px-6 py-4">
                <h2 className="text-base font-bold text-[#14171A]">
                  Convites e links gerados ({convites.length})
                </h2>
              </div>
              <div className="divide-y divide-[#F0EFE9]">
                {convites.map((c) => {
                  const isLinkInvite = c.tipo === 'link' || !c.email;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#14171A]">
                          {isLinkInvite
                            ? 'Link de convite (vínculo por conta Google)'
                            : c.email}
                        </p>
                        <p className="text-xs text-[#64686E]">
                          {getRoleLabel(c.role)}
                          <span aria-hidden="true"> · </span>
                          <span
                            className={
                              c.status === 'aceito'
                                ? 'text-emerald-700 font-medium'
                                : c.status === 'revogado'
                                  ? 'text-[#8E9299]'
                                  : 'text-amber-700 font-medium'
                            }
                          >
                            {getInviteStatusLabel(c.status)}
                          </span>
                          <span aria-hidden="true"> · </span>
                          Criado em {formatTimestampPt(c.createdAt)}
                        </p>
                      </div>

                      {c.status === 'pendente' && (
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleCopyLink(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E4DD] px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#FAF9F6] whitespace-nowrap shrink-0"
                          >
                            {copiedId === c.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-[#64686E]" />
                                <span>Copiar link</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRevoke(c.id)}
                            className="rounded-lg border border-[#E6E4DD] px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#FAF9F6] whitespace-nowrap shrink-0"
                          >
                            Revogar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
