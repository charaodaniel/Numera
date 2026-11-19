import React, { useEffect, useState } from 'react';
import { Archive, Download, FileJson, FileText, History, Save } from 'lucide-react';
import type { User } from 'firebase/auth';
import { archiveRifa, updateRifaConfig } from '../lib/api/rifas';
import {
  exportParticipantesPagamentosPdf,
  exportRifaCsv,
  exportRifaJson,
} from '../lib/export';
import { getRifaPalette, sanitizeRifaPalette } from '../lib/rifaPalettes';
import {
  BLUEPRINT_LIMITS,
  formatTimestampPt,
  type Atribuicao,
  type EligibilityRule,
  type Evento,
  type Numero,
  type Participante,
  type Rifa,
  type RifaColorPalette,
  type RifaStatus,
  type RoleCapabilities,
  type Sorteio,
} from '../types/numera';
import { RifaColorPalettePicker } from './RifaColorPalettePicker';

interface RifaHistoricoTabProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  atribuicoes: Atribuicao[];
  sorteios: Sorteio[];
  eventos: Evento[];
}

export const RifaHistoricoTab: React.FC<RifaHistoricoTabProps> = ({
  rifa,
  numeros,
  participantes,
  atribuicoes,
  sorteios,
  eventos,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E6E4DD] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#14171A]">
            Exportação e auditoria
          </h2>
          <p className="mt-0.5 text-xs text-[#4B5563]">
            Gere o relatório em PDF com participantes e pagamentos ou baixe a
            planilha CSV e o registro auditável em JSON.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportParticipantesPagamentosPdf(rifa, numeros, participantes)
            }
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors min-h-[40px] ${
              getRifaPalette(rifa.corPrimaria).softBorder
            } ${getRifaPalette(rifa.corPrimaria).softBg} ${
              getRifaPalette(rifa.corPrimaria).accentTextStrong
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Relatório PDF
          </button>
          <button
            type="button"
            onClick={() => exportRifaCsv(rifa, numeros, participantes)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D5CD] bg-white px-4 py-2 text-xs font-semibold text-[#14171A] hover:bg-[#F3F1EC] transition-colors min-h-[40px]"
          >
            <Download className="h-3.5 w-3.5 text-emerald-700" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportRifaJson({
                rifa,
                numeros,
                participantes,
                atribuicoes,
                sorteios,
                eventos,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D5CD] bg-white px-4 py-2 text-xs font-semibold text-[#14171A] hover:bg-[#F3F1EC] transition-colors min-h-[40px]"
          >
            <FileJson className="h-3.5 w-3.5 text-sky-700" />
            Exportar JSON
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white">
        <div className="flex items-center gap-2 border-b border-[#F0EFE9] px-6 py-4">
          <History className="h-4 w-4 text-[#64686E]" />
          <h3 className="text-base font-bold text-[#14171A]">
            Linha do tempo ({eventos.length})
          </h3>
        </div>

        {eventos.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64686E]">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EFE9]">
            {eventos.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col gap-1 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#14171A]">{ev.summary}</p>
                  <p className="text-xs text-[#64686E]">Por {ev.actorName}</p>
                </div>
                <span className="font-mono text-xs tabular-nums text-[#8E9299] shrink-0">
                  {formatTimestampPt(ev.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface RifaConfiguracoesTabProps {
  rifa: Rifa;
  capabilities: RoleCapabilities;
  user: User;
}

export const RifaConfiguracoesTab: React.FC<RifaConfiguracoesTabProps> = ({
  rifa,
  capabilities,
  user,
}) => {
  const [titulo, setTitulo] = useState(rifa.titulo);
  const [premio, setPremio] = useState(rifa.premio);
  const [descricao, setDescricao] = useState(rifa.descricao || '');
  const [imagemUrl, setImagemUrl] = useState(rifa.imagemUrl || '');
  const [status, setStatus] = useState<RifaStatus>(rifa.status);
  const [dataPrevista, setDataPrevista] = useState(rifa.dataPrevista || '');
  const [regraElegibilidade, setRegraElegibilidade] = useState<EligibilityRule>(
    rifa.regraElegibilidade
  );
  const [permitirMultiplosPremios, setPermitirMultiplosPremios] = useState(
    rifa.permitirMultiplosPremios
  );
  const [duracaoReservaMinutos, setDuracaoReservaMinutos] = useState(
    rifa.duracaoReservaMinutos
  );
  const [valorNumero, setValorNumero] = useState(
    rifa.valorNumero && rifa.valorNumero > 0 ? String(rifa.valorNumero) : ''
  );
  const [corPrimaria, setCorPrimaria] = useState<RifaColorPalette>(() =>
    sanitizeRifaPalette(rifa.corPrimaria)
  );
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    setCorPrimaria(sanitizeRifaPalette(rifa.corPrimaria));
  }, [rifa.id, rifa.corPrimaria]);

  const isArchived = rifa.status === 'arquivada';
  const canEdit = capabilities.canConfigure && !isArchived;
  const selectedPalette = getRifaPalette(corPrimaria);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const parsedValor = Number(valorNumero.replace(',', '.'));
    const safeValor =
      valorNumero.trim() !== '' && Number.isFinite(parsedValor) && parsedValor >= 0
        ? parsedValor
        : 0;
    try {
      await updateRifaConfig(
        rifa.id,
        {
          titulo,
          premio,
          descricao,
          imagemUrl,
          corPrimaria,
          status: status === 'arquivada' && !capabilities.canArchive ? rifa.status : status,
          dataPrevista,
          regraElegibilidade,
          permitirMultiplosPremios,
          duracaoReservaMinutos,
          valorNumero: safeValor,
        },
        user
      );
      setFeedback({
        type: 'success',
        text: 'Configurações da rifa atualizadas.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'Erro ao salvar configurações.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await archiveRifa(rifa, user);
      setConfirmArchive(false);
      setFeedback({
        type: 'success',
        text: 'Rifa arquivada permanentemente para leitura.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao arquivar rifa.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[#E6E4DD] bg-white p-6 space-y-5"
      >
        <div>
          <h2 className="text-base font-bold text-[#14171A]">
            Dados gerais e regras da rifa
          </h2>
          <p className="mt-0.5 text-xs text-[#64686E]">
            Faixa de números fixa: {rifa.numeroInicial} até {rifa.numeroFinal} (
            {rifa.totalNumeros} números · {rifa.digitos} dígitos).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#374151]">
              Título
            </label>
            <input
              type="text"
              disabled={!canEdit}
              required
              minLength={2}
              maxLength={BLUEPRINT_LIMITS.TITULO_MAX}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#374151]">
              Prêmio
            </label>
            <input
              type="text"
              disabled={!canEdit}
              required
              minLength={2}
              maxLength={BLUEPRINT_LIMITS.PREMIO_MAX}
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#374151]">
              Descrição
            </label>
            <textarea
              rows={3}
              disabled={!canEdit}
              maxLength={BLUEPRINT_LIMITS.DESCRICAO_MAX}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151]">
              Situação
            </label>
            <select
              disabled={!canEdit}
              value={status}
              onChange={(e) => setStatus(e.target.value as RifaStatus)}
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            >
              <option value="rascunho">Rascunho</option>
              <option value="ativa">Ativa</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151]">
              Data prevista
            </label>
            <input
              type="date"
              disabled={!canEdit}
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151]">
              Elegibilidade para sorteio
            </label>
            <select
              disabled={!canEdit}
              value={regraElegibilidade}
              onChange={(e) =>
                setRegraElegibilidade(e.target.value as EligibilityRule)
              }
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            >
              <option value="confirmados">Apenas confirmados</option>
              <option value="atribuidos_e_confirmados">
                Atribuídos e confirmados
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151]">
              Duração da reserva (minutos)
            </label>
            <input
              type="number"
              disabled={!canEdit}
              min={5}
              max={43200}
              value={duracaoReservaMinutos}
              onChange={(e) =>
                setDuracaoReservaMinutos(Number(e.target.value))
              }
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151]">
              Valor de referência por número (R$)
            </label>
            <input
              type="number"
              disabled={!canEdit}
              min={0}
              max={BLUEPRINT_LIMITS.VALOR_NUMERO_MAX}
              step="0.01"
              value={valorNumero}
              onChange={(e) => setValorNumero(e.target.value)}
              placeholder="Ex.: 10.00"
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
            <p className="mt-1 text-[11px] text-[#64686E]">
              Referência externa para exibir o valor arrecadado no Resumo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151]">
              URL da imagem do prêmio
            </label>
            <input
              type="url"
              disabled={!canEdit}
              maxLength={BLUEPRINT_LIMITS.IMAGEM_URL_MAX}
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none disabled:bg-[#F3F1EC] disabled:text-[#64686E]"
            />
          </div>

          <label className="sm:col-span-2 flex items-center gap-2.5 text-sm text-[#374151] cursor-pointer">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={permitirMultiplosPremios}
              onChange={(e) => setPermitirMultiplosPremios(e.target.checked)}
              className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
            />
            <span>Permitir múltiplos prêmios por participante</span>
          </label>

          <div className="sm:col-span-2 border-t border-[#F0EFE9] pt-4">
            <RifaColorPalettePicker
              value={corPrimaria}
              onChange={setCorPrimaria}
              disabled={!canEdit}
              previewTitle={titulo}
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end border-t border-[#F0EFE9] pt-4">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 min-h-[44px] transition-colors ${selectedPalette.accentBg} ${selectedPalette.accentBgHover}`}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}
      </form>

      {capabilities.canArchive && !isArchived && (
        <section className="rounded-2xl border border-red-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#14171A]">
                Arquivar rifa
              </h3>
              <p className="mt-0.5 text-xs text-[#4B5563]">
                Torna a rifa somente leitura preservando todo o histórico e
                sorteios.
              </p>
            </div>
            {!confirmArchive ? (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 shrink-0 min-h-[40px]"
              >
                <Archive className="h-3.5 w-3.5" />
                Arquivar rifa
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmArchive(false)}
                  className="rounded-xl border border-[#D8D5CD] px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F3F1EC] min-h-[40px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleArchive}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 min-h-[40px]"
                >
                  Confirmar arquivamento
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
