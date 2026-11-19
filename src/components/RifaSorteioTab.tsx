import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Dices,
  MessageCircle,
  Share2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { executarSorteio, getEligibleNumbers } from '../lib/api/sorteios';
import {
  formatTimestampPt,
  type Numero,
  type Participante,
  type Rifa,
  type RoleCapabilities,
  type Sorteio,
} from '../types/numera';
import { SorteioShareScreen } from './SorteioShareScreen';

interface RifaSorteioTabProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  sorteios: Sorteio[];
  capabilities: RoleCapabilities;
  user: User;
}

export const RifaSorteioTab: React.FC<RifaSorteioTabProps> = ({
  rifa,
  numeros,
  participantes,
  sorteios,
  capabilities,
  user,
}) => {
  const [quantidadePremios, setQuantidadePremios] = useState(1);
  const [premiosNomes, setPremiosNomes] = useState<string[]>([rifa.premio]);
  const [finalizarRifa, setFinalizarRifa] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoSorteio, setUltimoSorteio] = useState<Sorteio | null>(null);
  const [shareTarget, setShareTarget] = useState<Sorteio | null>(null);

  const eligibleNumbers = useMemo(
    () => getEligibleNumbers(rifa, numeros),
    [rifa, numeros]
  );

  const uniqueEligibleParticipants = useMemo(() => {
    const ids = new Set(
      eligibleNumbers.map((n) => n.participanteId).filter(Boolean)
    );
    return ids.size;
  }, [eligibleNumbers]);

  const handlePrizeCountChange = (count: number) => {
    const safeCount = Math.min(10, Math.max(1, count));
    setQuantidadePremios(safeCount);
    setPremiosNomes((prev) => {
      const next = [...prev];
      while (next.length < safeCount) {
        next.push(
          next.length === 0 ? rifa.premio : `${next.length + 1}º Prêmio`
        );
      }
      return next.slice(0, safeCount);
    });
  };

  const handleRunDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      const result = await executarSorteio({
        rifa,
        numeros,
        participantes,
        premiosDescricoes: premiosNomes.slice(0, quantidadePremios),
        finalizarRifa,
        user,
      });
      setUltimoSorteio(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao executar sorteio.'
      );
    } finally {
      setRunning(false);
    }
  };

  const canDrawHere =
    capabilities.canRunDraw &&
    rifa.status !== 'arquivada' &&
    eligibleNumbers.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E6E4DD] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#F0EFE9] pb-5">
          <div>
            <h2 className="text-lg font-bold text-[#14171A]">
              Elegibilidade para o sorteio
            </h2>
            <p className="mt-1 text-xs text-[#4B5563]">
              Regra ativa:{' '}
              <strong className="text-[#14171A]">
                {rifa.regraElegibilidade === 'confirmados'
                  ? 'Somente números confirmados'
                  : 'Números atribuídos e confirmados'}
              </strong>{' '}
              ·{' '}
              {rifa.permitirMultiplosPremios
                ? 'Participante pode ganhar múltiplos prêmios'
                : 'Máximo 1 prêmio por participante'}
            </p>
          </div>

          <div className="flex items-center gap-6 font-mono tabular-nums">
            <div>
              <p className="text-2xl font-bold text-emerald-700">
                {eligibleNumbers.length}
              </p>
              <p className="text-xs font-sans text-[#64686E]">
                Números elegíveis
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#14171A]">
                {uniqueEligibleParticipants}
              </p>
              <p className="text-xs font-sans text-[#64686E]">Participantes</p>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {!capabilities.canRunDraw ? (
          <p className="mt-5 text-sm text-[#4B5563]">
            Apenas o proprietário ou colaboradores autorizados podem executar
            sorteios nesta rifa.
          </p>
        ) : rifa.status === 'arquivada' ? (
          <p className="mt-5 text-sm text-[#4B5563]">
            Rifas arquivadas não permitem novos sorteios.
          </p>
        ) : (
          <form onSubmit={handleRunDraw} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-[#374151]">
                  Quantidade de prêmios a sortear
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantidadePremios}
                  onChange={(e) =>
                    handlePrizeCountChange(Number(e.target.value))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-[#374151]">
                  Descrição dos prêmios
                </label>
                {Array.from({ length: quantidadePremios }).map((_, idx) => (
                  <input
                    key={idx}
                    type="text"
                    required
                    maxLength={200}
                    value={premiosNomes[idx] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPremiosNomes((prev) => {
                        const copy = [...prev];
                        copy[idx] = val;
                        return copy;
                      });
                    }}
                    placeholder={`${idx + 1}º Prêmio`}
                    className="w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none"
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={finalizarRifa}
                onChange={(e) => setFinalizarRifa(e.target.checked)}
                className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
              />
              <span>Marcar situação da rifa como Finalizada após o sorteio</span>
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canDrawHere || running}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <Dices className="h-4 w-4" />
                {running
                  ? 'Sorteando...'
                  : eligibleNumbers.length === 0
                    ? 'Sem números elegíveis'
                    : 'Realizar sorteio agora'}
              </button>
            </div>
          </form>
        )}
      </section>

      {ultimoSorteio && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-emerald-950">
              <Award className="h-5 w-5 text-emerald-700" />
              <h3>Resultado registrado agora</h3>
            </div>
            <button
              type="button"
              onClick={() => setShareTarget(ultimoSorteio)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar nas redes
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ultimoSorteio.resultados.map((res) => (
              <div
                key={`${res.ordem}-${res.numero}`}
                className="rounded-xl border border-emerald-200 bg-white p-4"
              >
                <p className="text-xs font-medium text-emerald-800">
                  {res.ordem}º lugar · {res.premioDescricao}
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[#14171A]">
                  #{res.numero}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#14171A]">
                  {res.participanteNome}
                </p>
                {res.participanteTelefone && (
                  <a
                    href={`https://wa.me/${res.participanteTelefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {res.participanteTelefone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#E6E4DD] bg-white overflow-hidden">
        <div className="border-b border-[#F0EFE9] px-6 py-4">
          <h2 className="text-base font-bold text-[#14171A]">
            Sorteios realizados ({sorteios.length})
          </h2>
        </div>

        {sorteios.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64686E]">
            Nenhum sorteio realizado ainda para esta rifa.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EFE9]">
            {sorteios.map((s) => (
              <div key={s.id} className="p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64686E]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluído
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatTimestampPt(s.realizadoEm)} · por{' '}
                      {s.realizadoPorNome} · {s.totalElegiveis} elegíveis
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShareTarget(s)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#14171A] hover:bg-[#F3F1EC] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
                  >
                    <Share2 className="h-3.5 w-3.5 text-emerald-700" />
                    Compartilhar resultado
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {s.resultados.map((res) => (
                    <div
                      key={`${s.id}-${res.ordem}-${res.numero}`}
                      className="rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] p-3.5"
                    >
                      <p className="text-xs text-[#64686E]">
                        {res.ordem}º · {res.premioDescricao}
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#14171A]">
                        #{res.numero} — {res.participanteNome}
                      </p>
                      {res.participanteTelefone && (
                        <p className="mt-0.5 text-xs font-mono text-[#4B5563]">
                          {res.participanteTelefone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {shareTarget && (
        <SorteioShareScreen
          rifa={rifa}
          sorteio={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
};
