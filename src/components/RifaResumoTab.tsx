import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Gift,
  PieChart,
  Share2,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import {
  formatCurrencyBrl,
  formatTimestampPt,
  type Evento,
  type Membro,
  type Numero,
  type Participante,
  type Rifa,
  type RoleCapabilities,
  type Sorteio,
} from '../types/numera';
import { getRifaPalette } from '../lib/rifaPalettes';
import { SorteioShareScreen } from './SorteioShareScreen';

export type RifaNavTab =
  | 'resumo'
  | 'numeros'
  | 'participantes'
  | 'equipe'
  | 'sorteio'
  | 'historico'
  | 'configuracoes';

interface RifaResumoTabProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  membros: Membro[];
  sorteios: Sorteio[];
  eventos: Evento[];
  capabilities: RoleCapabilities;
  onOpenTab: (tab: RifaNavTab) => void;
}

type StatusKey = 'confirmado' | 'atribuido' | 'reservado' | 'disponivel';

interface StatusSegment {
  key: StatusKey;
  label: string;
  count: number;
  pct: number;
  valor: number;
  colorHex: string;
  barClass: string;
  dotClass: string;
  textClass: string;
}

interface SellerPerformance {
  uid: string;
  name: string;
  confirmados: number;
  atribuidos: number;
  reservados: number;
  total: number;
  valorConfirmado: number;
}

function formatPct(value: number, total: number): string {
  if (total <= 0) return '0%';
  const raw = (value / total) * 100;
  return raw >= 10 || raw === 0 || Number.isInteger(raw)
    ? `${Math.round(raw)}%`
    : `${raw.toFixed(1).replace('.', ',')}%`;
}

export const RifaResumoTab: React.FC<RifaResumoTabProps> = ({
  rifa,
  numeros,
  participantes,
  membros,
  sorteios,
  eventos,
  capabilities,
  onOpenTab,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<StatusKey | null>(null);
  const [chartMode, setChartMode] = useState<'status' | 'equipe'>('status');
  const [showShareLatest, setShowShareLatest] = useState(false);
  const palette = getRifaPalette(rifa.corPrimaria);

  const stats = useMemo(() => {
    const hasLoadedNumbers = numeros.length > 0;
    let confirmados = rifa.contagemConfirmados;
    let atribuidos = rifa.contagemAtribuidos;
    let reservados = rifa.contagemReservados;
    let disponiveis = rifa.contagemDisponiveis;

    if (hasLoadedNumbers) {
      confirmados = 0;
      atribuidos = 0;
      reservados = 0;
      disponiveis = 0;
      for (const n of numeros) {
        if (n.status === 'confirmado') confirmados += 1;
        else if (n.status === 'atribuido') atribuidos += 1;
        else if (n.status === 'reservado') reservados += 1;
        else disponiveis += 1;
      }
    }

    const total = Math.max(
      1,
      hasLoadedNumbers ? numeros.length : rifa.totalNumeros
    );
    const vendidosTotal = confirmados + atribuidos;
    const ocupadosTotal = confirmados + atribuidos + reservados;
    const valorUnitario =
      typeof rifa.valorNumero === 'number' && rifa.valorNumero > 0
        ? rifa.valorNumero
        : 0;

    const valorArrecadadoConfirmado = confirmados * valorUnitario;
    const valorAtribuidoPendente = atribuidos * valorUnitario;
    const valorReservado = reservados * valorUnitario;
    const valorPrevistoTotal = vendidosTotal * valorUnitario;
    const valorMetaTotal = total * valorUnitario;

    const segments: StatusSegment[] = [
      {
        key: 'confirmado',
        label: 'Confirmados',
        count: confirmados,
        pct: (confirmados / total) * 100,
        valor: valorArrecadadoConfirmado,
        colorHex: '#047857',
        barClass: 'bg-emerald-700',
        dotClass: 'bg-emerald-700',
        textClass: 'text-emerald-800',
      },
      {
        key: 'atribuido',
        label: 'Atribuídos',
        count: atribuidos,
        pct: (atribuidos / total) * 100,
        valor: valorAtribuidoPendente,
        colorHex: '#0369A1',
        barClass: 'bg-sky-700',
        dotClass: 'bg-sky-700',
        textClass: 'text-sky-800',
      },
      {
        key: 'reservado',
        label: 'Reservados',
        count: reservados,
        pct: (reservados / total) * 100,
        valor: valorReservado,
        colorHex: '#B45309',
        barClass: 'bg-amber-600',
        dotClass: 'bg-amber-600',
        textClass: 'text-amber-800',
      },
      {
        key: 'disponivel',
        label: 'Disponíveis',
        count: disponiveis,
        pct: (disponiveis / total) * 100,
        valor: disponiveis * valorUnitario,
        colorHex: '#D6D3CB',
        barClass: 'bg-[#E6E4DD]',
        dotClass: 'bg-[#CFCBC0]',
        textClass: 'text-[#4B5563]',
      },
    ];

    const sellerMap = new Map<string, SellerPerformance>();
    for (const n of numeros) {
      if (n.status === 'disponivel') continue;
      const uid = n.assignedBy || 'sem_responsavel';
      const name = n.assignedByName || 'Responsável não informado';
      const existing = sellerMap.get(uid) || {
        uid,
        name,
        confirmados: 0,
        atribuidos: 0,
        reservados: 0,
        total: 0,
        valorConfirmado: 0,
      };
      if (n.status === 'confirmado') {
        existing.confirmados += 1;
        existing.valorConfirmado += valorUnitario;
      } else if (n.status === 'atribuido') {
        existing.atribuidos += 1;
      } else if (n.status === 'reservado') {
        existing.reservados += 1;
      }
      existing.total += 1;
      sellerMap.set(uid, existing);
    }

    const sellerStats = Array.from(sellerMap.values()).sort(
      (a, b) => b.total - a.total || b.confirmados - a.confirmados
    );

    return {
      total,
      confirmados,
      atribuidos,
      reservados,
      disponiveis,
      vendidosTotal,
      ocupadosTotal,
      valorUnitario,
      valorArrecadadoConfirmado,
      valorAtribuidoPendente,
      valorReservado,
      valorPrevistoTotal,
      valorMetaTotal,
      segments,
      sellerStats,
    };
  }, [rifa, numeros]);

  const donutSize = 188;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const donutArcs = useMemo(() => {
    let cumulativeFraction = 0;
    return stats.segments.map((seg) => {
      const fraction = stats.total > 0 ? seg.count / stats.total : 0;
      const length = fraction * circumference;
      const offset = -cumulativeFraction * circumference;
      cumulativeFraction += fraction;
      return {
        ...seg,
        fraction,
        length,
        offset,
      };
    });
  }, [stats.segments, stats.total, circumference]);

  const activeSegment = hoveredSlice
    ? stats.segments.find((s) => s.key === hoveredSlice) || null
    : null;

  const maxSellerTotal =
    stats.sellerStats.length > 0 ? stats.sellerStats[0].total : 1;

  const maxSegmentCount = Math.max(
    1,
    ...stats.segments.map((s) => s.count)
  );

  return (
    <div className="space-y-6">
      {/* Real-time KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white">
          <div aria-hidden="true" className={`h-1 w-full ${palette.accentBg}`} />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#64686E]">
                Números vendidos
              </p>
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${palette.accentText}`}
              >
                {formatPct(stats.vendidosTotal, stats.total)}
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#14171A]">
              {stats.vendidosTotal}
            </p>
            <p className="mt-1.5 text-xs text-[#64686E] font-mono tabular-nums">
              {stats.confirmados} confirmados · {stats.atribuidos} atribuídos
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64686E]">Disponíveis</p>
            <span className="font-mono text-xs font-semibold tabular-nums text-[#4B5563]">
              {formatPct(stats.disponiveis, stats.total)}
            </span>
          </div>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#14171A]">
            {stats.disponiveis}
          </p>
          <p className="mt-1.5 text-xs text-[#64686E] font-mono tabular-nums">
            {stats.reservados > 0
              ? `${stats.reservados} em reserva`
              : `De ${stats.total} gerados`}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white">
          <div aria-hidden="true" className={`h-1 w-full ${palette.accentBg}`} />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#64686E]">
                Valor arrecadado
              </p>
              <Wallet className={`h-4 w-4 ${palette.accentText}`} />
            </div>
            {stats.valorUnitario > 0 ? (
              <>
                <p
                  className={`mt-2 font-mono text-2xl font-bold tabular-nums ${palette.accentText}`}
                >
                  {formatCurrencyBrl(stats.valorArrecadadoConfirmado)}
                </p>
                <p className="mt-1.5 text-xs text-[#64686E] font-mono tabular-nums">
                  Previsto: {formatCurrencyBrl(stats.valorPrevistoTotal)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 font-mono text-xl font-bold tabular-nums text-[#9CA3AF]">
                  Não definido
                </p>
                {capabilities.canConfigure ? (
                  <button
                    type="button"
                    onClick={() => onOpenTab('configuracoes')}
                    className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${palette.accentText}`}
                  >
                    Definir valor
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <p className="mt-1.5 text-xs text-[#64686E]">
                    Valor unitário não definido
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64686E]">
              Participantes e equipe
            </p>
            <Users className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#14171A]">
            {participantes.length}
          </p>
          <p className="mt-1.5 text-xs text-[#64686E] font-mono tabular-nums">
            {membros.filter((m) => m.status === 'ativo').length} integrante(s) ·{' '}
            {sorteios.length} sorteio(s)
          </p>
        </div>
      </div>

      {/* Occupation Visualizations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section
          aria-label="Gráfico de ocupação dos números"
          className="rounded-2xl border border-[#E6E4DD] bg-white p-6 xl:col-span-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-bold text-[#14171A]">
                Ocupação dos números
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#64686E]">
              {stats.ocupadosTotal}/{stats.total} ocupados
            </span>
          </div>

          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col">
            <div className="relative flex items-center justify-center shrink-0">
              <svg
                width={donutSize}
                height={donutSize}
                viewBox={`0 0 ${donutSize} ${donutSize}`}
                role="img"
                aria-label={`Ocupação total de ${formatPct(stats.ocupadosTotal, stats.total)}`}
                className="-rotate-90"
              >
                <circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  fill="none"
                  stroke="#F3F1EC"
                  strokeWidth={22}
                />
                {donutArcs.map((arc) => {
                  if (arc.count <= 0) return null;
                  const isHighlighted = hoveredSlice === arc.key;
                  return (
                    <circle
                      key={arc.key}
                      cx={donutSize / 2}
                      cy={donutSize / 2}
                      r={radius}
                      fill="none"
                      stroke={arc.colorHex}
                      strokeWidth={isHighlighted ? 26 : 22}
                      strokeDasharray={`${arc.length} ${circumference}`}
                      strokeDashoffset={arc.offset}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredSlice(arc.key)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <span className="text-[11px] font-medium text-[#64686E]">
                  {activeSegment ? activeSegment.label : 'Ocupação'}
                </span>
                <span className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-[#14171A]">
                  {activeSegment
                    ? formatPct(activeSegment.count, stats.total)
                    : formatPct(stats.ocupadosTotal, stats.total)}
                </span>
                <span className="mt-0.5 font-mono text-[11px] tabular-nums text-[#64686E]">
                  {activeSegment
                    ? `${activeSegment.count} núm.`
                    : `${stats.confirmados} conf.`}
                </span>
              </div>
            </div>

            <div className="w-full space-y-1.5">
              {stats.segments.map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  onMouseEnter={() => setHoveredSlice(seg.key)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onFocus={() => setHoveredSlice(seg.key)}
                  onBlur={() => setHoveredSlice(null)}
                  onClick={() => onOpenTab('numeros')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                    hoveredSlice === seg.key
                      ? 'bg-[#FAF9F6]'
                      : 'hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-xs shrink-0 ${seg.dotClass}`}
                    />
                    <span className="text-xs font-medium text-[#374151] truncate">
                      {seg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-xs tabular-nums shrink-0">
                    <span className="font-semibold text-[#14171A]">
                      {seg.count}
                    </span>
                    <span className="w-11 text-right text-[#64686E]">
                      {formatPct(seg.count, stats.total)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bar Charts */}
        <section
          aria-label="Gráficos de barras de distribuição e equipe"
          className="rounded-2xl border border-[#E6E4DD] bg-white p-6 xl:col-span-7 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-700" />
                <h2 className="text-base font-bold text-[#14171A]">
                  {chartMode === 'status'
                    ? 'Distribuição por situação'
                    : 'Distribuição por vendedor'}
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="Modo de visualização do gráfico de barras"
                className="inline-flex items-center rounded-xl border border-[#E6E4DD] bg-[#F3F1EC] p-0.5 self-start sm:self-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartMode === 'status'}
                  onClick={() => setChartMode('status')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    chartMode === 'status'
                      ? 'bg-white text-[#14171A] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#14171A]'
                  }`}
                >
                  Por situação
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartMode === 'equipe'}
                  onClick={() => setChartMode('equipe')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    chartMode === 'equipe'
                      ? 'bg-white text-[#14171A] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#14171A]'
                  }`}
                >
                  Por vendedor ({stats.sellerStats.length})
                </button>
              </div>
            </div>

            {chartMode === 'status' ? (
              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-[#64686E]">
                    <span>Proporção geral ({stats.total} números)</span>
                    <span className="font-mono tabular-nums font-medium text-[#14171A]">
                      {formatPct(stats.ocupadosTotal, stats.total)} ocupados
                    </span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F3F1EC]">
                    {stats.segments.map((seg) => {
                      if (seg.count <= 0) return null;
                      return (
                        <div
                          key={seg.key}
                          style={{ width: `${seg.pct}%` }}
                          className={`${seg.barClass} transition-all duration-300`}
                          title={`${seg.label}: ${seg.count} (${formatPct(seg.count, stats.total)})`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3.5">
                  {stats.segments.map((seg) => {
                    const widthPct = Math.round(
                      (seg.count / maxSegmentCount) * 100
                    );
                    return (
                      <div key={seg.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${seg.textClass}`}>
                            {seg.label}
                          </span>
                          <div className="flex items-center gap-3 font-mono tabular-nums">
                            {stats.valorUnitario > 0 && (
                              <span className="text-[#64686E]">
                                {formatCurrencyBrl(seg.valor)}
                              </span>
                            )}
                            <span className="font-semibold text-[#14171A]">
                              {seg.count}
                            </span>
                            <span className="w-10 text-right text-[#64686E]">
                              {formatPct(seg.count, stats.total)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-md bg-[#F3F1EC]">
                          <div
                            className={`h-full rounded-md transition-all duration-300 ${
                              seg.key === 'disponivel'
                                ? 'bg-[#9CA3AF]'
                                : seg.barClass
                            }`}
                            style={{
                              width: `${seg.count > 0 ? Math.max(2, widthPct) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                {stats.sellerStats.length === 0 ? (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] px-5 py-8 text-center">
                    <p className="text-sm font-semibold text-[#14171A]">
                      Nenhum número distribuído ainda
                    </p>
                    <p className="mt-1 text-xs text-[#64686E]">
                      Atribua ou reserve números para acompanhar o desempenho
                      por vendedor em tempo real.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenTab('numeros')}
                      className="mt-4 inline-flex items-center rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Ir para grade de números
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {stats.sellerStats.slice(0, 6).map((seller) => {
                      const confPct =
                        (seller.confirmados / maxSellerTotal) * 100;
                      const atrPct =
                        (seller.atribuidos / maxSellerTotal) * 100;
                      const resPct =
                        (seller.reservados / maxSellerTotal) * 100;
                      return (
                        <div key={seller.uid} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#14171A] truncate">
                              {seller.name}
                            </span>
                            <div className="flex items-center gap-2.5 font-mono tabular-nums shrink-0">
                              {stats.valorUnitario > 0 && (
                                <span className="text-emerald-700 font-medium">
                                  {formatCurrencyBrl(seller.valorConfirmado)}
                                </span>
                              )}
                              <span className="text-[#14171A] font-semibold">
                                {seller.total} núm.
                              </span>
                              <span className="text-[#64686E]">
                                ({seller.confirmados} conf.)
                              </span>
                            </div>
                          </div>
                          <div className="flex h-2.5 w-full overflow-hidden rounded-md bg-[#F3F1EC]">
                            {seller.confirmados > 0 && (
                              <div
                                style={{ width: `${confPct}%` }}
                                className="bg-emerald-700 transition-all duration-300"
                                title={`Confirmados: ${seller.confirmados}`}
                              />
                            )}
                            {seller.atribuidos > 0 && (
                              <div
                                style={{ width: `${atrPct}%` }}
                                className="bg-sky-700 transition-all duration-300"
                                title={`Atribuídos: ${seller.atribuidos}`}
                              />
                            )}
                            {seller.reservados > 0 && (
                              <div
                                style={{ width: `${resPct}%` }}
                                className="bg-amber-600 transition-all duration-300"
                                title={`Reservados: ${seller.reservados}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-[#64686E]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-emerald-700" />
                        Confirmados
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-sky-700" />
                        Atribuídos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-amber-600" />
                        Reservados
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {stats.valorUnitario > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EFE9] pt-4 text-xs text-[#4B5563]">
              <span>
                Valor unitário:{' '}
                <strong className="font-mono tabular-nums text-[#14171A]">
                  {formatCurrencyBrl(stats.valorUnitario)}
                </strong>
              </span>
              <span className="font-mono tabular-nums">
                Confirmado:{' '}
                <strong className="text-emerald-700">
                  {formatCurrencyBrl(stats.valorArrecadadoConfirmado)}
                </strong>{' '}
                · Em aberto:{' '}
                <strong className="text-sky-700">
                  {formatCurrencyBrl(
                    stats.valorAtribuidoPendente + stats.valorReservado
                  )}
                </strong>
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Campaign Details + Prize & Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-6 lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-[#14171A]">
            <Gift className={`h-4 w-4 ${palette.accentText}`} />
            <h2>Detalhes da campanha</h2>
          </div>

          <dl className="grid grid-cols-1 gap-3.5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#64686E]">Prêmio</dt>
              <dd className="mt-0.5 font-medium text-[#14171A]">
                {rifa.premio}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64686E]">Data prevista</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-[#14171A] font-mono text-xs tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-[#8E9299]" />
                {rifa.dataPrevista || 'Não definida'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64686E]">
                Elegibilidade no sorteio
              </dt>
              <dd className="mt-0.5 text-[#14171A]">
                {rifa.regraElegibilidade === 'confirmados'
                  ? 'Somente confirmados'
                  : 'Atribuídos e confirmados'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#64686E]">
                Valor por número
              </dt>
              <dd className="mt-0.5 font-mono tabular-nums text-[#14171A]">
                {stats.valorUnitario > 0
                  ? formatCurrencyBrl(stats.valorUnitario)
                  : 'Não informado'}
              </dd>
            </div>
          </dl>

          {rifa.descricao && (
            <div className="border-t border-[#F0EFE9] pt-4">
              <p className="text-xs font-medium text-[#64686E]">Descrição</p>
              <p className="mt-1 text-sm text-[#374151] leading-relaxed">
                {rifa.descricao}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 border-t border-[#F0EFE9] pt-4">
            <button
              type="button"
              onClick={() => onOpenTab('numeros')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${palette.accentBg} ${palette.accentBgHover}`}
            >
              Abrir grade de números
            </button>
            <button
              type="button"
              onClick={() => onOpenTab('participantes')}
              className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors"
            >
              Ver participantes
            </button>
            <button
              type="button"
              onClick={() => onOpenTab('sorteio')}
              className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors"
            >
              Ir para sorteio
            </button>
            {sorteios.length > 0 && (
              <button
                type="button"
                onClick={() => setShowShareLatest(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${palette.softBorder} ${palette.softBg} ${palette.accentTextStrong}`}
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar resultado
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-6 lg:col-span-5 space-y-4">
          {rifa.imagemUrl && !imgFailed ? (
            <img
              src={rifa.imagemUrl}
              alt={`Imagem do prêmio: ${rifa.premio}`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-44 w-full rounded-xl border border-[#E6E4DD] object-cover"
            />
          ) : (
            <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] p-4 text-center">
              <Ticket className={`h-8 w-8 ${palette.accentText}`} />
              <p className="mt-2 text-sm font-semibold text-[#14171A]">
                {rifa.premio}
              </p>
              <p className="text-xs text-[#64686E] font-mono tabular-nums">
                {stats.total} números gerados
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#64686E]">
                Últimas atividades
              </h3>
              {eventos.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenTab('historico')}
                  className={`text-xs font-semibold ${palette.accentText}`}
                >
                  Ver tudo
                </button>
              )}
            </div>
            <div className="mt-2 divide-y divide-[#F0EFE9]">
              {eventos.slice(0, 4).map((ev) => (
                <div key={ev.id} className="py-2 text-xs">
                  <p className="text-[#14171A]">{ev.summary}</p>
                  <p className="text-[#8E9299] font-mono tabular-nums">
                    {formatTimestampPt(ev.createdAt)}
                  </p>
                </div>
              ))}
              {eventos.length === 0 && (
                <p className="py-2 text-xs text-[#64686E]">
                  Nenhuma atividade recente.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showShareLatest && sorteios[0] && (
        <SorteioShareScreen
          rifa={rifa}
          sorteio={sorteios[0]}
          onClose={() => setShowShareLatest(false)}
        />
      )}
    </div>
  );
};
