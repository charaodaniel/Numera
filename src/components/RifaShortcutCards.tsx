import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Download,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { createParticipante } from '../lib/api/participantes';
import { getRifaPalette } from '../lib/rifaPalettes';
import {
  BLUEPRINT_LIMITS,
  type Atribuicao,
  type Evento,
  type Numero,
  type Participante,
  type Rifa,
  type RoleCapabilities,
  type Sorteio,
} from '../types/numera';
import { ExportRifaMenu } from './ExportRifaMenu';
import { ParticipantContactFields } from './ParticipantContactFields';

interface RifaShortcutCardsProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  atribuicoes: Atribuicao[];
  sorteios: Sorteio[];
  eventos: Evento[];
  capabilities: RoleCapabilities;
  user: User;
  onGoToSorteio: () => void;
  onParticipantCreated?: () => void;
}

export const RifaShortcutCards: React.FC<RifaShortcutCardsProps> = ({
  rifa,
  numeros,
  participantes,
  atribuicoes,
  sorteios,
  eventos,
  capabilities,
  user,
  onGoToSorteio,
  onParticipantCreated,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived = rifa.status === 'arquivada';
  const palette = getRifaPalette(rifa.corPrimaria);

  const eligibleCount = useMemo(() => {
    if (numeros.length === 0) {
      return rifa.regraElegibilidade === 'confirmados'
        ? rifa.contagemConfirmados
        : rifa.contagemConfirmados + rifa.contagemAtribuidos;
    }
    if (rifa.regraElegibilidade === 'confirmados') {
      return numeros.filter((n) => n.status === 'confirmado').length;
    }
    return numeros.filter(
      (n) => n.status === 'confirmado' || n.status === 'atribuido'
    ).length;
  }, [numeros, rifa]);

  const openModal = () => {
    if (isArchived) return;
    setNome('');
    setTelefone('');
    setWhatsapp('');
    setSameAsPhone(false);
    setObservacoes('');
    setError(null);
    setShowAddModal(true);
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const effectiveWhatsapp = sameAsPhone ? telefone : whatsapp;
    try {
      await createParticipante(
        rifa.id,
        { nome, telefone, whatsapp: effectiveWhatsapp, observacoes },
        user
      );
      setShowAddModal(false);
      onParticipantCreated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao cadastrar participante.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section
        aria-label="Atalhos rápidos da rifa"
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <button
          type="button"
          onClick={openModal}
          disabled={isArchived}
          className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white text-left transition-colors ${palette.cardHoverBorder} ${palette.softHoverBg} disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 ${palette.ringClass} min-h-[76px]`}
        >
          <div aria-hidden="true" className={`h-1 w-full ${palette.accentBg}`} />
          <div className="flex w-full items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.softBg} ${palette.accentText}`}
              >
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold text-[#14171A] ${palette.titleGroupHover} transition-colors truncate`}
                >
                  Adicionar Participante
                </p>
                <p className="mt-0.5 text-xs text-[#64686E] font-mono tabular-nums">
                  {isArchived
                    ? 'Rifa arquivada'
                    : `${participantes.length} cadastrado(s)`}
                </p>
              </div>
            </div>
            {!isArchived && (
              <ArrowRight
                className={`h-4 w-4 shrink-0 text-[#8E9299] transition-transform group-hover:translate-x-0.5 ${palette.arrowGroupHover}`}
              />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToSorteio}
          className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white text-left transition-colors ${palette.cardHoverBorder} ${palette.softHoverBg} focus-visible:outline-none focus-visible:ring-2 ${palette.ringClass} min-h-[76px]`}
        >
          <div aria-hidden="true" className={`h-1 w-full ${palette.accentBg}`} />
          <div className="flex w-full items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.softBg} ${palette.accentText}`}
              >
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold text-[#14171A] ${palette.titleGroupHover} transition-colors truncate`}
                >
                  {capabilities.canRunDraw && !isArchived
                    ? 'Realizar Sorteio'
                    : 'Ver Sorteios'}
                </p>
                <p className="mt-0.5 text-xs text-[#64686E] font-mono tabular-nums">
                  {eligibleCount} elegível(is) · {sorteios.length} sorteio(s)
                </p>
              </div>
            </div>
            <ArrowRight
              className={`h-4 w-4 shrink-0 text-[#8E9299] transition-transform group-hover:translate-x-0.5 ${palette.arrowGroupHover}`}
            />
          </div>
        </button>

        <div className="relative flex flex-col justify-between rounded-2xl border border-[#E6E4DD] bg-white min-h-[76px]">
          <div aria-hidden="true" className="overflow-hidden rounded-t-2xl">
            <div className={`h-1 w-full ${palette.accentBg}`} />
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.softBg} ${palette.accentText}`}
              >
                <Download className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#14171A] truncate">
                  Exportar Dados
                </p>
                <p className="mt-0.5 text-xs text-[#64686E] font-mono tabular-nums">
                  {rifa.totalNumeros} núm. · {eventos.length} evento(s)
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <ExportRifaMenu
                rifa={rifa}
                numeros={numeros}
                participantes={participantes}
                atribuicoes={atribuicoes}
                sorteios={sorteios}
                eventos={eventos}
              />
            </div>
          </div>
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#14171A]">
                  Adicionar participante
                </h3>
                <p className="text-xs text-[#64686E]">
                  Cadastro rápido vinculado à rifa {rifa.titulo}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Fechar modal"
                className="rounded-lg p-1.5 text-[#8E9299] hover:bg-[#F3F1EC] hover:text-[#14171A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParticipant} className="mt-4 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                >
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#374151]">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={BLUEPRINT_LIMITS.NAME_MAX}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Maria Oliveira"
                  className="mt-1.5 w-full rounded-lg border border-[#D8D5CD] px-3.5 py-2 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <ParticipantContactFields
                telefone={telefone}
                whatsapp={whatsapp}
                sameAsPhone={sameAsPhone}
                onTelefoneChange={setTelefone}
                onWhatsappChange={setWhatsapp}
                onSameAsPhoneChange={setSameAsPhone}
              />

              <div>
                <label className="block text-xs font-medium text-[#374151]">
                  Observações
                </label>
                <textarea
                  rows={2}
                  maxLength={BLUEPRINT_LIMITS.OBSERVACOES_MAX}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Referência, grupo do WhatsApp, observações..."
                  className="mt-1.5 w-full rounded-lg border border-[#D8D5CD] px-3.5 py-2 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#F0EFE9] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${palette.accentBg} ${palette.accentBgHover}`}
                >
                  {saving ? 'Salvando...' : 'Salvar participante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
