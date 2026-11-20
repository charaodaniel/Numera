import React, { useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, Target, Ticket, Wallet } from 'lucide-react';
import {
  formatCurrencyBrl,
  type Numero,
  type Rifa,
  type RoleCapabilities,
} from '../types/numera';
import { getRifaPalette } from '../lib/rifaPalettes';

interface RifaSummaryDashboardProps {
  rifa: Rifa;
  numeros: Numero[];
  capabilities: RoleCapabilities;
  onOpenNumeros: () => void;
  onOpenConfiguracoes: () => void;
}

type SegmentKey = 'confirmado' | 'atribuido' | 'reservado' | 'disponivel';

interface DashboardSegment {
  key: SegmentKey;
  label: string;
  shortLabel: string;
  count: number;
  pct: number;
  revenue: number;
  colorHex: string;
  barBgClass: string;
  textClass: string;
}

function formatPct(value: number, total: number): string {
  if (total <= 0) return '0%';
  const raw = (value / total) * 100;
  return raw >= 10 || raw === 0 || Number.isInteger(raw)
    ? `${Math.round(raw)}%`
    : `${raw.toFixed(1).replace('.', ',')}%`;
}

export const RifaSummaryDashboard: React.FC<RifaSummaryDashboardProps> = ({
  rifa,
  numeros,
  capabilities,
  onOpenNumeros,
  onOpenConfiguracoes,
}) => {
  const [activeKey, setActiveKey] = useState<SegmentKey | null>(null);
  const palette = getRifaPalette(rifa.corPrimaria);

  const metrics = useMemo(() => {
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
    const ticketsSold = confirmados + atribuidos;
    const valorUnitario =
      typeof rifa.valorNumero === 'number' && rifa.valorNumero > 0
        ? rifa.valorNumero
        : 0;

    const currentRevenue = confirmados * valorUnitario;
    const projectedRevenue = ticketsSold * valorUnitario;
    const goalRevenue = total * valorUnitario;
    const soldPct = Math.min(100, (ticketsSold / total) * 100);
    const confirmedPct = Math.min(100, (confirmados / total) * 100);

    const segments: DashboardSegment[] = [
      {
        key: 'confirmado',
        label: 'Confirmados',
        shortLabel: 'Conf.',
        count: confirmados,
        pct: (confirmados / total) * 100,
        revenue: confirmados * valorUnitario,
        colorHex: '#047857',
        barBgClass: 'bg-emerald-700',
        textClass: 'text-emerald-800',
      },
      {
        key: 'atribuido',
        label: 'Atribuídos',
        shortLabel: 'Atrib.',
        count: atribuidos,
        pct: (atribuidos / total) * 100,
        revenue: atribuidos * valorUnitario,
        colorHex: '#0369A1',
        barBgClass: 'bg-sky-700',
        textClass: 'text-sky-800',
      },
      {
        key: 'reservado',
        label: 'Reservados',
        shortLabel: 'Reserv.',
        count: reservados,
        pct: (reservados / total) * 100,
        revenue: reservados * valorUnitario,
        colorHex: '#B45309',
        barBgClass: 'bg-amber-600',
        textClass: 'text-amber-800',
      },
      {
        key: 'disponivel',
        label: 'Disponíveis',
        shortLabel: 'Disp.',
        count: disponiveis,
        pct: (disponiveis / total) * 100,
        revenue: disponiveis * valorUnitario,
        colorHex: '#CFCBC0',
        barBgClass: 'bg-[#D6D3CB]',
        textClass: 'text-[#4B5563]',
      },
    ];

    return {
      total,
      confirmados,
      atribuidos,
      reservados,
      disponiveis,
      ticketsSold,
      valorUnitario,
      currentRevenue,
      projectedRevenue,
      goalRevenue,
      soldPct,
      confirmedPct,
      segments,
    };
  }, [rifa, numeros]);

  const activeSegment = activeKey
    ? metrics.segments.find((s) => s.key === activeKey) || null
    : null;

  // Simple SVG bar chart geometry
  const chartWidth = 360;
  const chartHeight = 148;
  const padLeft = 34;
  const padRight = 10;
  const padTop = 22;
  const padBottom = 26;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;
  const slotWidth = plotWidth / metrics.segments.length;
  const barWidth = Math.min(44, slotWidth * 0.54);

  const gridTicks = [0, 50, 100];

  return (
    <section
      aria-label="Painel de resumo da campanha"
      className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white"
    >
      <div aria-hidden="true" className={`h-1 w-full ${palette.accentBg}`} />

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Zone: Key Performance Metrics & Goal Progress */}
        <div className="lg:col-span-7 flex flex-col justify-between p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#F0EFE9]">
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${palette.accentText}`} />
              <h2 className="text-sm font-bold tracking-tight text-[#14171A] sm:text-base">
                Desempenho da campanha
              </h2>
            </div>

            <button
              type="button"
              onClick={onOpenNumeros}
              className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${palette.accentText} hover:underline`}
            >
              <span>Abrir grade de números</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 3 Primary KPI Columns */}
          <div className="grid grid-cols-1 divide-y divide-[#F0EFE9] sm:grid-cols-3 sm:divide-y-0 sm:divide-x py-4">
            <div className="pb-4 sm:pb-0 sm:pr-4">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#64686E]">
                <span>Números vendidos</span>
                <Ticket className="h-3.5 w-3.5 text-[#8E9299]" />
              </div>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#14171A] sm:text-3xl">
                {metrics.ticketsSold}
                <span className="ml-1.5 text-sm font-normal text-[#64686E]">
                  / {metrics.total}
                </span>
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-[#64686E]">
                {metrics.confirmados} conf. · {metrics.atribuidos} atrib.
              </p>
            </div>

            <div className="py-4 sm:py-0 sm:px-4">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#64686E]">
                <span>Receita atual</span>
                <Wallet className={`h-3.5 w-3.5 ${palette.accentText}`} />
              </div>
              {metrics.valorUnitario > 0 ? (
                <>
                  <p
                    className={`mt-1.5 font-mono text-xl font-bold tabular-nums sm:text-2xl ${palette.accentTextStrong}`}
                  >
                    {formatCurrencyBrl(metrics.currentRevenue)}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-[#64686E]">
                    Previsto: {formatCurrencyBrl(metrics.projectedRevenue)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-[#9CA3AF]">
                    Sem valor
                  </p>
                  {capabilities.canConfigure ? (
                    <button
                      type="button"
                      onClick={onOpenConfiguracoes}
                      className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${palette.accentText} hover:underline`}
                    >
                      Definir preço unitário
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <p className="mt-1 text-xs text-[#64686E]">
                      Preço não configurado
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-4">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#64686E]">
                <span>Progresso da meta</span>
                <span className="font-mono text-xs tabular-nums text-[#64686E]">
                  100%
                </span>
              </div>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#14171A] sm:text-3xl">
                {formatPct(metrics.ticketsSold, metrics.total)}
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-[#64686E]">
                {formatPct(metrics.confirmados, metrics.total)} conf. ·{' '}
                {metrics.disponiveis} disp.
              </p>
            </div>
          </div>

          {/* Goal Progress Track */}
          <div className="border-t border-[#F0EFE9] pt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#4B5563]">
                Avanço sobre {metrics.total} números
                {metrics.valorUnitario > 0
                  ? ` (meta de ${formatCurrencyBrl(metrics.goalRevenue)})`
                  : ''}
              </span>
              <span className="font-mono font-semibold tabular-nums text-[#14171A]">
                {metrics.ticketsSold} vendidos · {metrics.reservados} reservados
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Progresso de vendas em relação à meta"
              aria-valuenow={Math.round(metrics.soldPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="flex h-3 w-full overflow-hidden rounded-full bg-[#F3F1EC]"
            >
              {metrics.segments
                .filter((seg) => seg.key !== 'disponivel' && seg.count > 0)
                .map((seg) => (
                  <div
                    key={seg.key}
                    style={{ width: `${seg.pct}%` }}
                    className={`${seg.barBgClass} transition-all duration-300`}
                    title={`${seg.label}: ${seg.count} (${formatPct(seg.count, metrics.total)})`}
                  />
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#4B5563]">
              {metrics.segments.map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  onMouseEnter={() => setActiveKey(seg.key)}
                  onMouseLeave={() => setActiveKey(null)}
                  onFocus={() => setActiveKey(seg.key)}
                  onBlur={() => setActiveKey(null)}
                  onClick={onOpenNumeros}
                  className={`inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors whitespace-nowrap ${
                    activeKey === seg.key
                      ? 'bg-[#F3F1EC] text-[#14171A]'
                      : 'hover:text-[#14171A]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-xs shrink-0 ${seg.barBgClass}`}
                  />
                  <span>{seg.label}</span>
                  <span className="font-mono tabular-nums font-semibold text-[#14171A]">
                    {seg.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Zone: Simple Vertical Bar Chart */}
        <div className="lg:col-span-5 border-t border-[#F0EFE9] lg:border-t-0 lg:border-l bg-[#FAF9F6]/60 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className={`h-4 w-4 ${palette.accentText}`} />
              <h3 className="text-sm font-bold text-[#14171A]">
                Distribuição em relação à meta
              </h3>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[#64686E]">
              Base: {metrics.total}
            </span>
          </div>

          <div className="mt-3">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label={`Gráfico de barras da meta: ${metrics.confirmados} confirmados, ${metrics.atribuidos} atribuídos, ${metrics.reservados} reservados e ${metrics.disponiveis} disponíveis`}
            >
              {/* Horizontal reference lines */}
              {gridTicks.map((tick) => {
                const y = padTop + plotHeight - (tick / 100) * plotHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke={tick === 0 ? '#D8D5CD' : '#E6E4DD'}
                      strokeWidth={1}
                      strokeDasharray={tick === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-[#8E9299] text-[10px] font-mono tabular-nums"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {metrics.segments.map((seg, idx) => {
                const rawH = (seg.pct / 100) * plotHeight;
                const barH = seg.count > 0 ? Math.max(4, rawH) : 2;
                const x = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
                const y = padTop + plotHeight - barH;
                const isActive = activeKey === seg.key;
                const isDimmed = activeKey !== null && !isActive;

                return (
                  <g
                    key={seg.key}
                    role="button"
                    tabIndex={0}
                    aria-label={`${seg.label}: ${seg.count} números (${formatPct(seg.count, metrics.total)})`}
                    className="cursor-pointer focus:outline-none"
                    onMouseEnter={() => setActiveKey(seg.key)}
                    onMouseLeave={() => setActiveKey(null)}
                    onFocus={() => setActiveKey(seg.key)}
                    onBlur={() => setActiveKey(null)}
                    onClick={onOpenNumeros}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenNumeros();
                      }
                    }}
                  >
                    {/* Invisible hover hit area */}
                    <rect
                      x={padLeft + idx * slotWidth}
                      y={padTop - 8}
                      width={slotWidth}
                      height={plotHeight + 28}
                      fill="transparent"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(12, y - 6)}
                      textAnchor="middle"
                      className={`text-[10px] font-mono font-semibold tabular-nums transition-opacity ${
                        isActive ? 'fill-[#14171A]' : 'fill-[#4B5563]'
                      }`}
                      style={{ opacity: isDimmed ? 0.5 : 1 }}
                    >
                      {seg.count}
                    </text>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      rx={4}
                      fill={seg.colorHex}
                      style={{
                        opacity: isDimmed ? 0.35 : 1,
                        transition: 'opacity 150ms ease, y 250ms ease, height 250ms ease',
                      }}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 7}
                      textAnchor="middle"
                      className={`text-[10px] font-medium ${
                        isActive ? 'fill-[#14171A] font-semibold' : 'fill-[#64686E]'
                      }`}
                    >
                      {seg.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-2 border-t border-[#E6E4DD] pt-2.5 text-xs text-[#4B5563] min-h-[34px] flex items-center justify-between gap-2">
            {activeSegment ? (
              <>
                <span className="font-semibold text-[#14171A] truncate">
                  {activeSegment.label}:{' '}
                  <span className="font-mono tabular-nums">
                    {activeSegment.count} ({formatPct(activeSegment.count, metrics.total)})
                  </span>
                </span>
                {metrics.valorUnitario > 0 && (
                  <span className="font-mono tabular-nums font-semibold text-[#14171A] shrink-0">
                    {formatCurrencyBrl(activeSegment.revenue)}
                  </span>
                )}
              </>
            ) : (
              <>
                <span>
                  Meta:{' '}
                  <strong className="font-mono tabular-nums text-[#14171A]">
                    {metrics.total} números
                  </strong>
                </span>
                <span className="font-mono tabular-nums text-[#64686E] shrink-0">
                  {metrics.valorUnitario > 0
                    ? `${formatCurrencyBrl(metrics.currentRevenue)} / ${formatCurrencyBrl(metrics.goalRevenue)}`
                    : `${formatPct(metrics.ticketsSold, metrics.total)} concluído`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
