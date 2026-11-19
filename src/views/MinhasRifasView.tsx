import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  MailCheck,
  Plus,
  Search,
  Ticket,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  getRoleLabel,
  getStatusLabel,
  type ConviteInbox,
  type Rifa,
  type RifaStatus,
} from '../types/numera';
import { getRifaPalette } from '../lib/rifaPalettes';
import { acceptConvite } from '../lib/api/equipe';

interface MinhasRifasViewProps {
  user: User;
  rifas: Rifa[];
  pendingInvites: ConviteInbox[];
  loading: boolean;
  onOpenRifa: (rifaId: string) => void;
  onOpenCreate: () => void;
}

type FilterOption = 'todas' | RifaStatus;

export const MinhasRifasView: React.FC<MinhasRifasViewProps> = ({
  user,
  rifas,
  pendingInvites,
  loading,
  onOpenRifa,
  onOpenCreate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('todas');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const overviewStats = useMemo(() => {
    let ativas = 0;
    let totalNumeros = 0;
    let distribuidos = 0;
    let compartilhadas = 0;

    for (const r of rifas) {
      if (r.status === 'ativa') ativas += 1;
      if (r.ownerId !== user.uid) compartilhadas += 1;
      totalNumeros += r.totalNumeros;
      distribuidos +=
        r.contagemReservados + r.contagemAtribuidos + r.contagemConfirmados;
    }
    return { ativas, totalNumeros, distribuidos, compartilhadas };
  }, [rifas, user.uid]);

  const filteredRifas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rifas.filter((r) => {
      if (statusFilter !== 'todas' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.titulo.toLowerCase().includes(q) ||
        r.premio.toLowerCase().includes(q) ||
        (r.descricao || '').toLowerCase().includes(q)
      );
    });
  }, [rifas, search, statusFilter]);

  const handleAcceptInvite = async (invite: ConviteInbox) => {
    setAcceptingId(invite.conviteId || invite.id);
    setInviteError(null);
    try {
      await acceptConvite(invite, user);
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : 'Erro ao aceitar convite.'
      );
    } finally {
      setAcceptingId(null);
    }
  };

  const filterTabs: { id: FilterOption; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'ativa', label: 'Ativas' },
    { id: 'rascunho', label: 'Rascunhos' },
    { id: 'finalizada', label: 'Finalizadas' },
    { id: 'arquivada', label: 'Arquivadas' },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#14171A] sm:text-3xl">
            Minhas rifas
          </h1>
          <p className="mt-1 text-sm text-[#4B5563]">
            Gerencie suas campanhas ativas, grades de números e equipes em um só
            painel.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Criar nova rifa
        </button>
      </div>

      {!loading && rifas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E6E4DD] bg-white px-5 py-4">
            <p className="text-xs font-medium text-[#64686E]">Rifas ativas</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#14171A]">
              {overviewStats.ativas}
            </p>
            <p className="mt-0.5 text-xs text-[#64686E] font-mono tabular-nums">
              De {rifas.length} cadastrada(s)
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E4DD] bg-white px-5 py-4">
            <p className="text-xs font-medium text-[#64686E]">
              Números distribuídos
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700">
              {overviewStats.distribuidos}
            </p>
            <p className="mt-0.5 text-xs text-[#64686E] font-mono tabular-nums">
              De {overviewStats.totalNumeros.toLocaleString('pt-BR')} totais
            </p>
          </div>

          <div className="rounded-2xl border border-[#E6E4DD] bg-white px-5 py-4">
            <p className="text-xs font-medium text-[#64686E]">
              Rifas compartilhadas
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#14171A]">
              {overviewStats.compartilhadas}
            </p>
            <p className="mt-0.5 text-xs text-[#64686E]">
              Como colaborador ou vendedor
            </p>
          </div>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <section
          aria-label="Convites pendentes"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <MailCheck className="h-4 w-4 text-emerald-700" />
            <span>
              Você tem {pendingInvites.length} convite(s) pendente(s) de equipe
            </span>
          </div>
          {inviteError && (
            <p className="mt-2 text-xs text-red-700">{inviteError}</p>
          )}
          <div className="mt-3 divide-y divide-emerald-200/70">
            {pendingInvites.map((inv) => {
              const id = inv.conviteId || inv.id;
              return (
                <div
                  key={id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#14171A]">
                      {inv.rifaTitulo}
                    </p>
                    <p className="text-xs text-[#4B5563]">
                      Papel: {getRoleLabel(inv.role)} · Enviado para {inv.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={acceptingId === id}
                    onClick={() => handleAcceptInvite(inv)}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                  >
                    {acceptingId === id ? 'Aceitando...' : 'Aceitar acesso'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64686E]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar rifa por título ou prêmio..."
            className="w-full rounded-xl border border-[#E6E4DD] bg-white py-2.5 pl-10 pr-4 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filtrar rifas por situação"
          className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#E6E4DD] bg-[#F3F1EC] p-1"
        >
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                  active
                    ? 'bg-white text-[#14171A] shadow-xs'
                    : 'text-[#4B5563] hover:text-[#14171A]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-[#E6E4DD] bg-white p-6"
            >
              <div className="h-5 w-2/3 rounded bg-[#F3F1EC]" />
              <div className="mt-3 h-4 w-1/2 rounded bg-[#F3F1EC]" />
              <div className="mt-10 h-2 w-full rounded bg-[#F3F1EC]" />
            </div>
          ))}
        </div>
      ) : filteredRifas.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-12 text-center">
          <Ticket className="mx-auto h-10 w-10 text-[#9CA3AF]" />
          <h2 className="mt-4 text-base font-bold text-[#14171A]">
            {rifas.length === 0
              ? 'Nenhuma rifa cadastrada ainda'
              : 'Nenhuma rifa corresponde ao filtro'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#4B5563]">
            {rifas.length === 0
              ? 'Crie sua primeira rifa para gerar números sequenciais, cadastrar participantes e organizar sua equipe.'
              : 'Limpe a busca ou selecione outra situação no filtro acima.'}
          </p>
          {rifas.length === 0 && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Criar nova rifa
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredRifas.map((rifa) => {
            const ocupados =
              rifa.contagemReservados +
              rifa.contagemAtribuidos +
              rifa.contagemConfirmados;
            const pct =
              rifa.totalNumeros > 0
                ? Math.round((ocupados / rifa.totalNumeros) * 100)
                : 0;
            const isOwner = rifa.ownerId === user.uid;
            const palette = getRifaPalette(rifa.corPrimaria);

            return (
              <button
                key={rifa.id}
                type="button"
                onClick={() => onOpenRifa(rifa.id)}
                className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white text-left transition-colors ${palette.cardHoverBorder} focus-visible:outline-none focus-visible:ring-2 ${palette.ringClass}`}
              >
                <div
                  aria-hidden="true"
                  className={`h-1.5 w-full ${palette.accentBg}`}
                />
                <div className="flex flex-1 flex-col justify-between w-full p-6 pt-5">
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-[#64686E]">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-xs shrink-0 ${palette.accentBg}`}
                          />
                          <span
                            className={
                              rifa.status === 'ativa'
                                ? `${palette.accentText} font-semibold`
                                : rifa.status === 'finalizada'
                                  ? 'text-sky-700 font-semibold'
                                  : 'text-[#4B5563] font-semibold'
                            }
                          >
                            {getStatusLabel(rifa.status)}
                          </span>
                          {!isOwner && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Compartilhada</span>
                            </>
                          )}
                        </p>
                        <h2
                          className={`mt-1 text-lg font-bold text-[#14171A] ${palette.titleGroupHover} transition-colors line-clamp-1`}
                        >
                          {rifa.titulo}
                        </h2>
                      </div>
                      <ArrowRight
                        className={`h-4 w-4 text-[#8E9299] group-hover:translate-x-0.5 ${palette.arrowGroupHover} transition-transform shrink-0 mt-1`}
                      />
                    </div>

                    <p className="mt-1.5 text-sm text-[#4B5563] line-clamp-1">
                      Prêmio: {rifa.premio}
                    </p>

                    <p className="mt-3 text-xs text-[#64686E] font-mono tabular-nums">
                      {rifa.totalNumeros} números · {ocupados} distribuídos
                    </p>
                  </div>

                  <div className="mt-5 w-full space-y-2.5 border-t border-[#F0EFE9] pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#4B5563] font-mono tabular-nums">
                        {rifa.contagemDisponiveis} disponíveis
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[#14171A]">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F1EC]">
                      <div
                        className={`h-full rounded-full ${palette.accentBg} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {rifa.dataPrevista && (
                      <div className="flex items-center gap-1.5 pt-0.5 text-xs text-[#64686E]">
                        <Calendar className="h-3.5 w-3.5 text-[#8E9299]" />
                        <span className="font-mono tabular-nums">
                          Prevista: {rifa.dataPrevista}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
