import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Grid3X3,
  History,
  LayoutDashboard,
  Settings,
  Trophy,
  UsersRound,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { subscribeRifaDoc } from '../lib/api/rifas';
import {
  subscribeRifaAtribuicoes,
  subscribeRifaNumeros,
} from '../lib/api/numeros';
import { subscribeRifaParticipantes } from '../lib/api/participantes';
import {
  subscribeRifaConvites,
  subscribeRifaMembros,
} from '../lib/api/equipe';
import {
  subscribeRifaEventos,
  subscribeRifaSorteios,
} from '../lib/api/sorteios';
import {
  computeRoleCapabilities,
  formatTicketNumber,
  getRoleLabel,
  getStatusLabel,
  type Atribuicao,
  type Convite,
  type Evento,
  type Membro,
  type Numero,
  type Participante,
  type Rifa,
  type Sorteio,
} from '../types/numera';
import { getRifaPalette } from '../lib/rifaPalettes';
import { RifaSummaryDashboard } from '../components/RifaSummaryDashboard';
import { RifaShortcutCards } from '../components/RifaShortcutCards';
import { RifaResumoTab, type RifaNavTab } from '../components/RifaResumoTab';
import { RifaNumerosTab } from '../components/RifaNumerosTab';
import {
  RifaEquipeTab,
  type EquipeSection,
} from '../components/RifaEquipeTab';
import { RifaSorteioTab } from '../components/RifaSorteioTab';
import {
  RifaConfiguracoesTab,
  RifaHistoricoTab,
} from '../components/RifaHistoricoConfigTabs';

type RifaTabId =
  | 'resumo'
  | 'numeros'
  | 'equipe'
  | 'sorteio'
  | 'historico'
  | 'configuracoes';

interface RifaDetailViewProps {
  rifaId: string;
  initialRifa?: Rifa | null;
  user: User;
  onBack: () => void;
}

export const RifaDetailView: React.FC<RifaDetailViewProps> = ({
  rifaId,
  initialRifa,
  user,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<RifaTabId>('resumo');
  const [equipeSection, setEquipeSection] = useState<EquipeSection>('membros');
  const [rifa, setRifa] = useState<Rifa | null>(initialRifa || null);
  const [numeros, setNumeros] = useState<Numero[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [sorteios, setSorteios] = useState<Sorteio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeRifaDoc(rifaId, setRifa),
      subscribeRifaNumeros(rifaId, setNumeros),
      subscribeRifaParticipantes(rifaId, setParticipantes),
      subscribeRifaAtribuicoes(rifaId, setAtribuicoes),
      subscribeRifaMembros(rifaId, setMembros),
      subscribeRifaSorteios(rifaId, setSorteios),
      subscribeRifaEventos(rifaId, setEventos),
    ];
    return () => unsubs.forEach((u) => u());
  }, [rifaId]);

  const currentMembro = useMemo(
    () => membros.find((m) => m.uid === user.uid) || null,
    [membros, user.uid]
  );

  const capabilities = useMemo(() => {
    if (!rifa) return null;
    return computeRoleCapabilities(rifa, user.uid, currentMembro);
  }, [rifa, user.uid, currentMembro]);

  useEffect(() => {
    if (!capabilities?.canManageTeam) {
      setConvites([]);
      return;
    }
    return subscribeRifaConvites(rifaId, setConvites);
  }, [rifaId, capabilities?.canManageTeam]);

  if (!rifa || !capabilities) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5563] hover:text-[#14171A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Minhas rifas
        </button>
        <div className="h-52 animate-pulse rounded-2xl border border-[#E6E4DD] bg-white p-6" />
      </div>
    );
  }

  const handleOpenTab = (tab: RifaNavTab) => {
    if (tab === 'participantes') {
      setEquipeSection('participantes');
      setActiveTab('equipe');
      return;
    }
    if (tab === 'equipe') {
      setEquipeSection('membros');
    }
    setActiveTab(tab);
  };

  const tabs: {
    id: RifaTabId;
    label: string;
    meta?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'resumo',
      label: 'Resumo',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'numeros',
      label: 'Números',
      meta: String(rifa.totalNumeros),
      icon: <Grid3X3 className="h-4 w-4" />,
    },
    {
      id: 'equipe',
      label: 'Equipe',
      meta: String(membros.length + participantes.length),
      icon: <UsersRound className="h-4 w-4" />,
    },
    {
      id: 'sorteio',
      label: 'Sorteio',
      meta: sorteios.length > 0 ? String(sorteios.length) : undefined,
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      id: 'historico',
      label: 'Histórico',
      meta: eventos.length > 0 ? String(eventos.length) : undefined,
      icon: <History className="h-4 w-4" />,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const occupiedCount =
    rifa.contagemReservados +
    rifa.contagemAtribuidos +
    rifa.contagemConfirmados;
  const occupiedPct =
    rifa.totalNumeros > 0
      ? Math.round((occupiedCount / rifa.totalNumeros) * 100)
      : 0;
  const palette = getRifaPalette(rifa.corPrimaria);

  return (
    <div className="space-y-6">
      {/* Contextual Breadcrumb & Raffle Title */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs text-[#64686E]">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-semibold text-[#4B5563] hover:text-[#14171A] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Minhas rifas
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" />
          <span className="truncate font-medium text-[#14171A]">
            {rifa.titulo}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#14171A] sm:text-3xl">
              {rifa.titulo}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4B5563]">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-xs shrink-0 ${palette.accentBg}`}
              />
              <span
                className={
                  rifa.status === 'ativa'
                    ? `font-semibold ${palette.accentText}`
                    : 'font-semibold text-[#14171A]'
                }
              >
                {getStatusLabel(rifa.status)}
              </span>
              <span aria-hidden="true">·</span>
              <span>Prêmio: {rifa.premio}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatTicketNumber(rifa.numeroInicial, rifa.digitos)}–
                {formatTicketNumber(rifa.numeroFinal, rifa.digitos)}
              </span>
              <span aria-hidden="true">·</span>
              <span>Seu papel: {getRoleLabel(capabilities.role)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#64686E] font-mono tabular-nums shrink-0">
            <span>
              Ocupação:{' '}
              <strong className="text-[#14171A]">{occupiedPct}%</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className={palette.accentText}>
                {rifa.contagemConfirmados}
              </strong>{' '}
              conf. / {rifa.totalNumeros}
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary Dashboard */}
      <RifaSummaryDashboard
        rifa={rifa}
        numeros={numeros}
        capabilities={capabilities}
        onOpenNumeros={() => setActiveTab('numeros')}
        onOpenConfiguracoes={() => setActiveTab('configuracoes')}
      />

      {/* Quick Action Cards */}
      <RifaShortcutCards
        rifa={rifa}
        numeros={numeros}
        participantes={participantes}
        atribuicoes={atribuicoes}
        sorteios={sorteios}
        eventos={eventos}
        capabilities={capabilities}
        user={user}
        onGoToSorteio={() => setActiveTab('sorteio')}
      />

      {/* Mobile / Tablet Compact Tab Strip */}
      <nav
        aria-label="Seções da rifa"
        className="flex lg:hidden items-center gap-1 overflow-x-auto border-b border-[#E6E4DD] pb-px"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                active
                  ? `${palette.tabBorder} ${palette.accentTextStrong}`
                  : 'border-transparent text-[#4B5563] hover:text-[#14171A]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop 2-Column Workspace Layout: Left Sidebar + Viewport */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <aside
          aria-label="Navegação da rifa"
          className="hidden lg:block lg:col-span-3 lg:sticky lg:top-20"
        >
          <div className="rounded-2xl border border-[#E6E4DD] bg-white p-2.5">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#F3F1EC] text-[#14171A] font-semibold'
                        : 'text-[#4B5563] hover:bg-[#FAF9F6] hover:text-[#14171A]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={
                          active ? palette.accentText : 'text-[#64686E]'
                        }
                      >
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </span>
                    {tab.meta && (
                      <span className="font-mono text-xs tabular-nums text-[#64686E]">
                        {tab.meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-[#F0EFE9] px-3 pt-3 pb-1 text-xs space-y-1.5">
              <p className="font-medium text-[#64686E]">
                Progresso dos números
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3F1EC]">
                <div
                  className={`h-full rounded-full ${palette.accentBg} transition-all`}
                  style={{ width: `${occupiedPct}%` }}
                />
              </div>
              <p className="font-mono text-[11px] tabular-nums text-[#4B5563]">
                {rifa.contagemDisponiveis} disponíveis · {occupiedCount}{' '}
                ocupados
              </p>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-9 min-w-0">
          {activeTab === 'resumo' && (
            <RifaResumoTab
              rifa={rifa}
              numeros={numeros}
              participantes={participantes}
              membros={membros}
              sorteios={sorteios}
              eventos={eventos}
              capabilities={capabilities}
              onOpenTab={handleOpenTab}
            />
          )}

          {activeTab === 'numeros' && (
            <RifaNumerosTab
              rifa={rifa}
              numeros={numeros}
              participantes={participantes}
              capabilities={capabilities}
              user={user}
            />
          )}

          {activeTab === 'equipe' && (
            <RifaEquipeTab
              rifa={rifa}
              membros={membros}
              convites={convites}
              participantes={participantes}
              numeros={numeros}
              capabilities={capabilities}
              user={user}
              activeSection={equipeSection}
              onSectionChange={setEquipeSection}
            />
          )}

          {activeTab === 'sorteio' && (
            <RifaSorteioTab
              rifa={rifa}
              numeros={numeros}
              participantes={participantes}
              sorteios={sorteios}
              capabilities={capabilities}
              user={user}
            />
          )}

          {activeTab === 'historico' && (
            <RifaHistoricoTab
              rifa={rifa}
              numeros={numeros}
              participantes={participantes}
              atribuicoes={atribuicoes}
              sorteios={sorteios}
              eventos={eventos}
            />
          )}

          {activeTab === 'configuracoes' && (
            <RifaConfiguracoesTab
              rifa={rifa}
              capabilities={capabilities}
              user={user}
            />
          )}
        </div>
      </div>
    </div>
  );
};
