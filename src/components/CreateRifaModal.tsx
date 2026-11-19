import React, { useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { createRifa } from '../lib/api/rifas';
import { DEFAULT_RIFA_PALETTE, getRifaPalette } from '../lib/rifaPalettes';
import {
  BLUEPRINT_LIMITS,
  formatTicketNumber,
  type EligibilityRule,
  type RifaColorPalette,
} from '../types/numera';
import { RifaColorPalettePicker } from './RifaColorPalettePicker';

interface CreateRifaModalProps {
  user: User;
  onClose: () => void;
  onCreated: (rifaId: string) => void;
}

const MAX_NUMERO_INICIAL = 100000;

function parseStrictInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

export const CreateRifaModal: React.FC<CreateRifaModalProps> = ({
  user,
  onClose,
  onCreated,
}) => {
  const [titulo, setTitulo] = useState('');
  const [premio, setPremio] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [status, setStatus] = useState<'ativa' | 'rascunho'>('ativa');
  const [numeroInicialStr, setNumeroInicialStr] = useState('1');
  const [numeroFinalStr, setNumeroFinalStr] = useState('100');
  const [digitos, setDigitos] = useState(3);
  const [dataPrevista, setDataPrevista] = useState('');
  const [regraElegibilidade, setRegraElegibilidade] =
    useState<EligibilityRule>('confirmados');
  const [permitirMultiplosPremios, setPermitirMultiplosPremios] =
    useState(false);
  const [duracaoReservaMinutosStr, setDuracaoReservaMinutosStr] =
    useState('1440');
  const [valorNumero, setValorNumero] = useState('');
  const [corPrimaria, setCorPrimaria] = useState<RifaColorPalette>(
    DEFAULT_RIFA_PALETTE
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedRange, setTouchedRange] = useState(false);

  const selectedPalette = getRifaPalette(corPrimaria);

  const rangeValidation = useMemo(() => {
    const ini = parseStrictInt(numeroInicialStr);
    const fim = parseStrictInt(numeroFinalStr);

    if (ini === null || fim === null) {
      return {
        valid: false,
        ini: ini ?? 0,
        fim: fim ?? 0,
        total: 0,
        message: 'Informe números inteiros válidos para início e fim.',
      };
    }

    if (ini < 0 || fim < 0) {
      return {
        valid: false,
        ini,
        fim,
        total: 0,
        message: 'Os números inicial e final não podem ser negativos.',
      };
    }

    if (ini > MAX_NUMERO_INICIAL) {
      return {
        valid: false,
        ini,
        fim,
        total: 0,
        message: `O número inicial não pode ultrapassar ${MAX_NUMERO_INICIAL.toLocaleString('pt-BR')}.`,
      };
    }

    if (ini > fim) {
      return {
        valid: false,
        ini,
        fim,
        total: 0,
        message:
          'O número inicial não pode ser superior ao número final.',
      };
    }

    const total = fim - ini + 1;
    if (total > BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA) {
      return {
        valid: false,
        ini,
        fim,
        total,
        message: `A faixa informada gera ${total.toLocaleString('pt-BR')} números e excede o limite de ${BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA.toLocaleString('pt-BR')} números por rifa.`,
      };
    }

    return {
      valid: true,
      ini,
      fim,
      total,
      message: null as string | null,
    };
  }, [numeroInicialStr, numeroFinalStr]);

  const minNeededDigits = useMemo(
    () => String(Math.max(0, rangeValidation.fim)).length,
    [rangeValidation.fim]
  );

  const effectiveDigits = useMemo(
    () => Math.min(8, Math.max(minNeededDigits, digitos)),
    [minNeededDigits, digitos]
  );

  const previewSample = useMemo(() => {
    if (!rangeValidation.valid || rangeValidation.total <= 0) return [];
    const items: string[] = [];
    for (let i = 0; i < Math.min(3, rangeValidation.total); i++) {
      items.push(
        formatTicketNumber(rangeValidation.ini + i, effectiveDigits)
      );
    }
    return items;
  }, [rangeValidation, effectiveDigits]);

  const reservaValidation = useMemo(() => {
    const mins = parseStrictInt(duracaoReservaMinutosStr);
    if (mins === null || mins < 5 || mins > 43200) {
      return {
        valid: false,
        value: 1440,
        message: 'A duração da reserva deve ficar entre 5 e 43.200 minutos.',
      };
    }
    return { valid: true, value: mins, message: null as string | null };
  }, [duracaoReservaMinutosStr]);

  const valorValidation = useMemo(() => {
    const trimmed = valorNumero.trim();
    if (!trimmed) {
      return { valid: true, value: 0, message: null as string | null };
    }
    const parsed = Number(trimmed.replace(',', '.'));
    if (
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > BLUEPRINT_LIMITS.VALOR_NUMERO_MAX
    ) {
      return {
        valid: false,
        value: 0,
        message: `O valor por número deve estar entre R$ 0,00 e R$ ${BLUEPRINT_LIMITS.VALOR_NUMERO_MAX.toLocaleString('pt-BR')}.`,
      };
    }
    return { valid: true, value: parsed, message: null as string | null };
  }, [valorNumero]);

  const imagemValidation = useMemo(() => {
    const trimmed = imagemUrl.trim();
    if (!trimmed) return { valid: true, message: null as string | null };
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          message: 'A URL da imagem deve começar com http:// ou https://.',
        };
      }
      return { valid: true, message: null as string | null };
    } catch {
      return {
        valid: false,
        message: 'Informe uma URL válida para a imagem do prêmio.',
      };
    }
  }, [imagemUrl]);

  const canSubmit =
    rangeValidation.valid &&
    reservaValidation.valid &&
    valorValidation.valid &&
    imagemValidation.valid &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedRange(true);
    setError(null);

    const trimmedTitulo = titulo.trim();
    const trimmedPremio = premio.trim();

    if (trimmedTitulo.length < BLUEPRINT_LIMITS.TITULO_MIN) {
      setError('O título da rifa precisa ter pelo menos 2 caracteres.');
      return;
    }

    if (trimmedPremio.length < BLUEPRINT_LIMITS.PREMIO_MIN) {
      setError('O prêmio principal precisa ter pelo menos 2 caracteres.');
      return;
    }

    if (!rangeValidation.valid) {
      setError(rangeValidation.message || 'Faixa de números inválida.');
      return;
    }

    if (!reservaValidation.valid) {
      setError(reservaValidation.message);
      return;
    }

    if (!valorValidation.valid) {
      setError(valorValidation.message);
      return;
    }

    if (!imagemValidation.valid) {
      setError(imagemValidation.message);
      return;
    }

    setSubmitting(true);
    try {
      const rifaId = await createRifa(
        {
          titulo: trimmedTitulo,
          premio: trimmedPremio,
          descricao,
          imagemUrl,
          corPrimaria,
          status,
          numeroInicial: rangeValidation.ini,
          numeroFinal: rangeValidation.fim,
          digitos: effectiveDigits,
          dataPrevista,
          regraElegibilidade,
          permitirMultiplosPremios,
          duracaoReservaMinutos: reservaValidation.value,
          valorNumero: valorValidation.value,
        },
        user
      );
      onCreated(rifaId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao criar a rifa.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E6E4DD] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E6E4DD] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#14171A]">
              Criar nova rifa
            </h2>
            <p className="text-xs text-[#64686E]">
              Os números sequenciais serão gerados automaticamente e vinculados à
              rifa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#64686E] hover:bg-[#F3F1EC] hover:text-[#14171A]"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151]">
                Título da rifa *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={BLUEPRINT_LIMITS.TITULO_MAX}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Rifa da Bicicleta Elétrica"
                className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151]">
                Prêmio principal *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={BLUEPRINT_LIMITS.PREMIO_MAX}
                value={premio}
                onChange={(e) => setPremio(e.target.value)}
                placeholder="Ex.: Bicicleta Aro 29 + Kit Capacete"
                className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151]">
                Descrição e regras gerais
              </label>
              <textarea
                rows={2}
                maxLength={BLUEPRINT_LIMITS.DESCRICAO_MAX}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes da campanha, entrega do prêmio ou canal de confirmação..."
                className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151]">
                Situação inicial
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'ativa' | 'rascunho')
                }
                className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
              >
                <option value="ativa">Ativa (pronta para atribuir)</option>
                <option value="rascunho">Rascunho (em preparação)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151]">
                Data prevista do sorteio
              </label>
              <input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-[#F0EFE9] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#14171A]">
                Geração de números sequenciais
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-[#64686E]">
                Máximo: {BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA.toLocaleString('pt-BR')} números
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="create-rifa-num-ini"
                  className="block text-xs font-medium text-[#374151]"
                >
                  Número inicial
                </label>
                <input
                  id="create-rifa-num-ini"
                  type="number"
                  min={0}
                  max={MAX_NUMERO_INICIAL}
                  step={1}
                  value={numeroInicialStr}
                  aria-invalid={!rangeValidation.valid}
                  onChange={(e) => {
                    setTouchedRange(true);
                    setNumeroInicialStr(e.target.value);
                  }}
                  className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:outline-none ${
                    !rangeValidation.valid
                      ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                      : 'border-[#D8D5CD] bg-white focus:border-emerald-700'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="create-rifa-num-fim"
                  className="block text-xs font-medium text-[#374151]"
                >
                  Número final
                </label>
                <input
                  id="create-rifa-num-fim"
                  type="number"
                  min={0}
                  max={MAX_NUMERO_INICIAL + BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA - 1}
                  step={1}
                  value={numeroFinalStr}
                  aria-invalid={!rangeValidation.valid}
                  onChange={(e) => {
                    setTouchedRange(true);
                    setNumeroFinalStr(e.target.value);
                  }}
                  className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:outline-none ${
                    !rangeValidation.valid
                      ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                      : 'border-[#D8D5CD] bg-white focus:border-emerald-700'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="create-rifa-digitos"
                  className="block text-xs font-medium text-[#374151]"
                >
                  Dígitos de formatação
                </label>
                <select
                  id="create-rifa-digitos"
                  value={effectiveDigits}
                  onChange={(e) => setDigitos(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm font-mono text-[#14171A] focus:border-emerald-700 focus:outline-none"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((d) => (
                    <option key={d} value={d} disabled={d < minNeededDigits}>
                      {d} dígitos ({formatTicketNumber(1, d)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!rangeValidation.valid && (touchedRange || rangeValidation.total > BLUEPRINT_LIMITS.MAX_NUMBERS_PER_RIFA || rangeValidation.ini > rangeValidation.fim) ? (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                <span>{rangeValidation.message}</span>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] px-4 py-2.5 text-xs text-[#4B5563]">
                <span>
                  Total:{' '}
                  <strong className="font-mono tabular-nums text-[#14171A]">
                    {rangeValidation.total.toLocaleString('pt-BR')}
                  </strong>{' '}
                  {rangeValidation.total === 1 ? 'número' : 'números'}
                </span>
                {previewSample.length > 0 && (
                  <span className="font-mono tabular-nums text-[#374151]">
                    Prévia: {previewSample.join(', ')}
                    {rangeValidation.total > 3 ? ', ... ' : ''}
                    {rangeValidation.total > 3
                      ? formatTicketNumber(rangeValidation.fim, effectiveDigits)
                      : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-[#F0EFE9] pt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#374151]">
                Elegibilidade para sorteio
              </label>
              <select
                value={regraElegibilidade}
                onChange={(e) =>
                  setRegraElegibilidade(e.target.value as EligibilityRule)
                }
                className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
              >
                <option value="confirmados">Apenas números confirmados</option>
                <option value="atribuidos_e_confirmados">
                  Atribuídos e confirmados
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151]">
                Validade padrão da reserva (minutos)
              </label>
              <input
                type="number"
                min={5}
                max={43200}
                step={1}
                value={duracaoReservaMinutosStr}
                aria-invalid={!reservaValidation.valid}
                onChange={(e) => setDuracaoReservaMinutosStr(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:outline-none ${
                  !reservaValidation.valid
                    ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                    : 'border-[#D8D5CD] bg-white focus:border-emerald-700'
                }`}
              />
              {!reservaValidation.valid && (
                <p className="mt-1 text-[11px] text-red-700">
                  {reservaValidation.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151]">
                Valor de referência por número (R$, opcional)
              </label>
              <input
                type="number"
                min={0}
                max={BLUEPRINT_LIMITS.VALOR_NUMERO_MAX}
                step="0.01"
                value={valorNumero}
                aria-invalid={!valorValidation.valid}
                onChange={(e) => setValorNumero(e.target.value)}
                placeholder="Ex.: 10.00"
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:outline-none ${
                  !valorValidation.valid
                    ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                    : 'border-[#D8D5CD] bg-white focus:border-emerald-700'
                }`}
              />
              {!valorValidation.valid ? (
                <p className="mt-1 text-[11px] text-red-700">
                  {valorValidation.message}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[#64686E]">
                  Usado apenas para cálculo do valor arrecadado no resumo.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151]">
                URL da imagem do prêmio (opcional)
              </label>
              <input
                type="url"
                maxLength={BLUEPRINT_LIMITS.IMAGEM_URL_MAX}
                value={imagemUrl}
                aria-invalid={!imagemValidation.valid}
                onChange={(e) => setImagemUrl(e.target.value)}
                placeholder="https://..."
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#14171A] focus:outline-none ${
                  !imagemValidation.valid
                    ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                    : 'border-[#D8D5CD] bg-white focus:border-emerald-700'
                }`}
              />
              {!imagemValidation.valid && (
                <p className="mt-1 text-[11px] text-red-700">
                  {imagemValidation.message}
                </p>
              )}
            </div>

            <label className="sm:col-span-2 flex items-center gap-2.5 text-sm text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={permitirMultiplosPremios}
                onChange={(e) => setPermitirMultiplosPremios(e.target.checked)}
                className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
              />
              <span>
                Permitir que o mesmo participante ganhe múltiplos prêmios em um
                sorteio
              </span>
            </label>
          </div>

          <div className="border-t border-[#F0EFE9] pt-5">
            <RifaColorPalettePicker
              value={corPrimaria}
              onChange={setCorPrimaria}
              previewTitle={titulo}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#F0EFE9] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#D8D5CD] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 transition-colors min-h-[44px] ${selectedPalette.accentBg} ${selectedPalette.accentBgHover}`}
            >
              {submitting ? 'Gerando números...' : 'Criar rifa e gerar números'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
