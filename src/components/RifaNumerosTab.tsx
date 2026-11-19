import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Lock,
  MessageCircle,
  RotateCcw,
  Search,
  Tag,
  UserPlus,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  assignOrReserveNumbers,
  confirmNumbers,
  promoteReservationToAssigned,
  releaseNumbers,
} from '../lib/api/numeros';
import { createParticipante } from '../lib/api/participantes';
import {
  formatTimestampPt,
  getNumberStatusLabel,
  type NumberStatus,
  type Numero,
  type Participante,
  type Rifa,
  type RoleCapabilities,
} from '../types/numera';
import { ParticipantContactFields } from './ParticipantContactFields';

interface RifaNumerosTabProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  capabilities: RoleCapabilities;
  user: User;
}

type GridFilter = 'todos' | NumberStatus;

export const RifaNumerosTab: React.FC<RifaNumerosTabProps> = ({
  rifa,
  numeros,
  participantes,
  capabilities,
  user,
}) => {
  const [filter, setFilter] = useState<GridFilter>('todos');
  const [search, setSearch] = useState('');
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedValores, setSelectedValores] = useState<string[]>([]);
  const [inspectedNumero, setInspectedNumero] = useState<Numero | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [assignMode, setAssignMode] = useState<
    'atribuido' | 'reservado' | 'confirmado'
  >('atribuido');
  const [selectedParticipanteId, setSelectedParticipanteId] = useState('');
  const [inlineNewPart, setInlineNewPart] = useState(false);
  const [newPartNome, setNewPartNome] = useState('');
  const [newPartTelefone, setNewPartTelefone] = useState('');
  const [newPartWhatsapp, setNewPartWhatsapp] = useState('');
  const [newPartSameWhatsapp, setNewPartSameWhatsapp] = useState(false);
  const [newPartObs, setNewPartObs] = useState('');
  const [assignObs, setAssignObs] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const isLocked =
    rifa.status === 'finalizada' || rifa.status === 'arquivada';

  const participanteMap = useMemo(
    () => new Map(participantes.map((p) => [p.id, p])),
    [participantes]
  );

  const filteredNumeros = useMemo(() => {
    const q = search.trim().toLowerCase();
    return numeros.filter((n) => {
      if (filter !== 'todos' && n.status !== filter) return false;
      if (!q) return true;
      return (
        n.valor.toLowerCase().includes(q) ||
        (n.participanteNome || '').toLowerCase().includes(q) ||
        (n.assignedByName || '').toLowerCase().includes(q)
      );
    });
  }, [numeros, filter, search]);

  const selectedNumerosObjects = useMemo(() => {
    const set = new Set(selectedValores);
    return numeros.filter((n) => set.has(n.valor));
  }, [numeros, selectedValores]);

  const allSelectedDisponiveis =
    selectedNumerosObjects.length > 0 &&
    selectedNumerosObjects.every((n) => n.status === 'disponivel');

  const anySelectedConfirmable = selectedNumerosObjects.some(
    (n) => n.status === 'reservado' || n.status === 'atribuido'
  );

  const anySelectedReservado = selectedNumerosObjects.some(
    (n) => n.status === 'reservado'
  );

  const anySelectedReleasable = selectedNumerosObjects.some((n) => {
    if (n.status === 'disponivel') return false;
    if (capabilities.canConfirmOrRelease) return true;
    return (
      (n.status === 'reservado' || n.status === 'atribuido') &&
      n.assignedBy === user.uid
    );
  });

  const toggleNumberSelection = (num: Numero) => {
    setFeedback(null);
    if (!multiSelect) {
      if (num.status === 'disponivel' && !isLocked) {
        setSelectedValores([num.valor]);
        setShowAssignModal(true);
      } else {
        setInspectedNumero(num);
      }
      return;
    }

    setSelectedValores((prev) =>
      prev.includes(num.valor)
        ? prev.filter((v) => v !== num.valor)
        : prev.length >= 100
          ? prev
          : [...prev, num.valor]
    );
  };

  const selectNextAvailable = (count: number) => {
    setMultiSelect(true);
    const available = numeros
      .filter((n) => n.status === 'disponivel')
      .slice(0, count)
      .map((n) => n.valor);
    setSelectedValores(available);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);

    try {
      let targetParticipante: Participante | undefined;
      if (inlineNewPart || participantes.length === 0) {
        const effectiveWhatsapp = newPartSameWhatsapp
          ? newPartTelefone
          : newPartWhatsapp;
        targetParticipante = await createParticipante(
          rifa.id,
          {
            nome: newPartNome,
            telefone: newPartTelefone,
            whatsapp: effectiveWhatsapp,
            observacoes: newPartObs,
          },
          user
        );
      } else {
        targetParticipante = participanteMap.get(selectedParticipanteId);
      }

      if (!targetParticipante) {
        throw new Error('Selecione ou cadastre um participante.');
      }

      await assignOrReserveNumbers({
        rifa,
        numerosValores: selectedValores,
        participante: targetParticipante,
        mode: assignMode,
        observacoes: assignObs,
        user,
      });

      setShowAssignModal(false);
      setSelectedValores([]);
      setMultiSelect(false);
      setNewPartNome('');
      setNewPartTelefone('');
      setNewPartWhatsapp('');
      setNewPartSameWhatsapp(false);
      setNewPartObs('');
      setAssignObs('');
      setInlineNewPart(false);
      setFeedback({
        type: 'success',
        text: `${selectedValores.length} número(s) registrado(s) para ${targetParticipante.nome}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível concluir a operação.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (valores: string[]) => {
    setBusy(true);
    setFeedback(null);
    try {
      await confirmNumbers({ rifaId: rifa.id, numerosValores: valores, user });
      setInspectedNumero(null);
      setSelectedValores([]);
      setFeedback({
        type: 'success',
        text: `${valores.length} número(s) confirmado(s).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao confirmar números.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePromoteReservation = async (valores: string[]) => {
    setBusy(true);
    setFeedback(null);
    try {
      await promoteReservationToAssigned({
        rifaId: rifa.id,
        numerosValores: valores,
        user,
      });
      setInspectedNumero(null);
      setSelectedValores([]);
      setFeedback({
        type: 'success',
        text: 'Reserva convertida em atribuição.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar reserva.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async (valores: string[]) => {
    setBusy(true);
    setFeedback(null);
    try {
      await releaseNumbers({ rifaId: rifa.id, numerosValores: valores, user });
      setInspectedNumero(null);
      setSelectedValores([]);
      setFeedback({
        type: 'success',
        text: `${valores.length} número(s) liberado(s) novamente.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao liberar números.',
      });
    } finally {
      setBusy(false);
    }
  };

  const filterButtons: { id: GridFilter; label: string; count: number }[] = [
    { id: 'todos', label: 'Todos', count: rifa.totalNumeros },
    { id: 'disponivel', label: 'Disponíveis', count: rifa.contagemDisponiveis },
    { id: 'reservado', label: 'Reservados', count: rifa.contagemReservados },
    { id: 'atribuido', label: 'Atribuídos', count: rifa.contagemAtribuidos },
    { id: 'confirmado', label: 'Confirmados', count: rifa.contagemConfirmados },
  ];

  const isExpiredReservation = (num: Numero) => {
    if (num.status !== 'reservado' || !num.reservedUntil) return false;
    return num.reservedUntil.toMillis() < Date.now();
  };

  return (
    <div className="space-y-5 pb-24">
      {isLocked && (
        <div className="flex items-center gap-2 rounded-xl border border-[#E6E4DD] bg-[#F3F1EC] px-4 py-3 text-xs text-[#374151]">
          <Lock className="h-4 w-4 text-[#64686E] shrink-0" />
          <span>
            Esta rifa está <strong>{rifa.status}</strong>. Novas atribuições e
            alterações na grade estão bloqueadas.
          </span>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-current opacity-70 hover:opacity-100"
            aria-label="Dispensar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[#E6E4DD] bg-white p-4 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64686E]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Número ou participante..."
                className="w-full rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] py-2 pl-9 pr-3 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:bg-white focus:outline-none"
              />
            </div>

            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMultiSelect((m) => !m);
                    setSelectedValores([]);
                  }}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap min-h-[38px] ${
                    multiSelect
                      ? 'border-[#14171A] bg-[#14171A] text-white'
                      : 'border-[#E6E4DD] bg-white text-[#374151] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {multiSelect
                    ? 'Sair da seleção múltipla'
                    : 'Seleção múltipla'}
                </button>

                <button
                  type="button"
                  onClick={() => selectNextAvailable(5)}
                  className="rounded-xl border border-[#E6E4DD] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#FAF9F6] transition-colors whitespace-nowrap min-h-[38px]"
                >
                  +5 livres
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#E6E4DD] bg-[#F3F1EC] p-1">
            {filterButtons.map((btn) => {
              const active = filter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilter(btn.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#14171A] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#14171A]'
                  }`}
                >
                  {btn.label}{' '}
                  <span className="font-mono tabular-nums opacity-75">
                    ({btn.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-[#F0EFE9] pt-3 text-xs text-[#4B5563]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-[#D8D5CD] bg-[#FAF9F6]" />
            Disponível
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            Reservado
          </span>
          <span className="inline-flex items-center gap-1.5 text-sky-800">
            <Tag className="h-3.5 w-3.5 text-sky-700" />
            Atribuído
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
            Confirmado
          </span>
        </div>
      </div>

      {filteredNumeros.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-8 text-center text-sm text-[#4B5563]">
          Nenhum número encontrado para esse filtro.
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-4 sm:p-5">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {filteredNumeros.map((num) => {
              const isSelected = selectedValores.includes(num.valor);
              const expired = isExpiredReservation(num);

              const statusClasses =
                num.status === 'confirmado'
                  ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950 hover:bg-emerald-100/70'
                  : num.status === 'atribuido'
                    ? 'border-sky-200 bg-sky-50/90 text-sky-950 hover:bg-sky-100/70'
                    : num.status === 'reservado'
                      ? 'border-amber-200 bg-amber-50/90 text-amber-950 hover:bg-amber-100/70'
                      : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#14171A] hover:border-[#CFCBC0] hover:bg-white';

              return (
                <button
                  key={num.valor}
                  type="button"
                  onClick={() => toggleNumberSelection(num)}
                  title={
                    num.participanteNome
                      ? `#${num.valor} · ${getNumberStatusLabel(num.status)} · ${num.participanteNome}`
                      : `#${num.valor} · Disponível`
                  }
                  className={`relative flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 transition-colors min-h-[56px] ${statusClasses} ${
                    isSelected
                      ? 'ring-2 ring-[#14171A] ring-offset-1 border-[#14171A]'
                      : ''
                  }`}
                >
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {num.valor}
                  </span>
                  <span className="mt-0.5 flex items-center gap-0.5 text-[10px] leading-none truncate max-w-full opacity-90">
                    {num.status === 'confirmado' && (
                      <Check className="h-2.5 w-2.5 text-emerald-700 shrink-0" />
                    )}
                    {num.status === 'reservado' && (
                      <Clock className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                    )}
                    {num.status === 'atribuido' && (
                      <Tag className="h-2.5 w-2.5 text-sky-700 shrink-0" />
                    )}
                    <span className="truncate">
                      {num.participanteNome
                        ? num.participanteNome.split(' ')[0]
                        : 'Livre'}
                    </span>
                  </span>
                  {expired && (
                    <span
                      className="absolute right-1.5 top-1 text-[10px] font-bold text-red-700"
                      title="Reserva vencida"
                    >
                      !
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {multiSelect && selectedValores.length > 0 && !isLocked && (
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#272B30] bg-[#14171A] px-5 py-3.5 text-white shadow-xl">
          <div className="text-sm">
            <strong className="font-mono tabular-nums">
              {selectedValores.length}
            </strong>{' '}
            número(s) selecionado(s)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {allSelectedDisponiveis && (
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                Atribuir / Reservar
              </button>
            )}
            {anySelectedReservado && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handlePromoteReservation(
                    selectedNumerosObjects
                      .filter((n) => n.status === 'reservado')
                      .map((n) => n.valor)
                  )
                }
                className="rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
              >
                Marcar atribuído
              </button>
            )}
            {anySelectedConfirmable && capabilities.canConfirmOrRelease && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleConfirm(
                    selectedNumerosObjects
                      .filter(
                        (n) =>
                          n.status === 'reservado' || n.status === 'atribuido'
                      )
                      .map((n) => n.valor)
                  )
                }
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Confirmar
              </button>
            )}
            {anySelectedReleasable && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleRelease(
                    selectedNumerosObjects
                      .filter((n) => n.status !== 'disponivel')
                      .map((n) => n.valor)
                  )
                }
                className="rounded-lg border border-[#374151] bg-[#272B30] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#374151] disabled:opacity-50"
              >
                Liberar
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedValores([])}
              className="rounded-lg px-2.5 py-2 text-xs text-slate-300 hover:text-white"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Single Number Inspector Modal */}
      {inspectedNumero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#F0EFE9] pb-4">
              <div>
                <p className="text-xs font-medium text-[#64686E]">
                  Número da rifa
                </p>
                <h3 className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-[#14171A]">
                  #{inspectedNumero.valor}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedNumero(null)}
                className="rounded-lg p-1.5 text-[#8E9299] hover:bg-[#F3F1EC] hover:text-[#14171A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64686E]">Situação</span>
                <span className="font-semibold text-[#14171A]">
                  {getNumberStatusLabel(inspectedNumero.status)}
                  {isExpiredReservation(inspectedNumero) && ' (prazo vencido)'}
                </span>
              </div>

              {inspectedNumero.participanteNome && (
                <div className="flex justify-between">
                  <span className="text-[#64686E]">Participante</span>
                  <span className="font-medium text-[#14171A]">
                    {inspectedNumero.participanteNome}
                  </span>
                </div>
              )}

              {inspectedNumero.participanteId &&
                participanteMap.get(inspectedNumero.participanteId)?.whatsapp && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#64686E]">WhatsApp</span>
                    <a
                      href={`https://wa.me/${participanteMap
                        .get(inspectedNumero.participanteId)!
                        .whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-medium font-mono text-xs tabular-nums"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {
                        participanteMap.get(inspectedNumero.participanteId)!
                          .whatsapp
                      }
                    </a>
                  </div>
                )}

              {inspectedNumero.assignedByName && (
                <div className="flex justify-between">
                  <span className="text-[#64686E]">Registrado por</span>
                  <span className="text-[#374151]">
                    {inspectedNumero.assignedByName}
                  </span>
                </div>
              )}

              {inspectedNumero.assignedAt && (
                <div className="flex justify-between">
                  <span className="text-[#64686E]">Atribuído em</span>
                  <span className="font-mono text-xs tabular-nums text-[#374151]">
                    {formatTimestampPt(inspectedNumero.assignedAt)}
                  </span>
                </div>
              )}

              {inspectedNumero.confirmedAt && (
                <div className="flex justify-between">
                  <span className="text-[#64686E]">Confirmado em</span>
                  <span className="font-mono text-xs tabular-nums text-emerald-700">
                    {formatTimestampPt(inspectedNumero.confirmedAt)}
                  </span>
                </div>
              )}
            </div>

            {!isLocked && (
              <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[#F0EFE9] pt-4">
                {inspectedNumero.status === 'disponivel' && (
                  <button
                    type="button"
                    onClick={() => {
                      const val = inspectedNumero.valor;
                      setInspectedNumero(null);
                      setSelectedValores([val]);
                      setShowAssignModal(true);
                    }}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Atribuir número
                  </button>
                )}

                {inspectedNumero.status === 'reservado' &&
                  (capabilities.canManageOthersAssignments ||
                    inspectedNumero.assignedBy === user.uid) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handlePromoteReservation([inspectedNumero.valor])
                      }
                      className="rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                    >
                      Marcar como atribuído
                    </button>
                  )}

                {(inspectedNumero.status === 'reservado' ||
                  inspectedNumero.status === 'atribuido') &&
                  capabilities.canConfirmOrRelease && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleConfirm([inspectedNumero.valor])}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Confirmar
                    </button>
                  )}

                {inspectedNumero.status !== 'disponivel' &&
                  (capabilities.canConfirmOrRelease ||
                    ((inspectedNumero.status === 'reservado' ||
                      inspectedNumero.status === 'atribuido') &&
                      inspectedNumero.assignedBy === user.uid)) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRelease([inspectedNumero.valor])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Liberar número
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign / Reserve Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#F0EFE9] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#14171A]">
                  Registrar {selectedValores.length} número(s)
                </h3>
                <p className="mt-1 font-mono text-xs text-[#4B5563]">
                  {selectedValores.slice(0, 8).join(', ')}
                  {selectedValores.length > 8
                    ? ` e +${selectedValores.length - 8}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg p-1.5 text-[#8E9299] hover:bg-[#F3F1EC]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#374151]">
                  Tipo de registro
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setAssignMode('atribuido')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      assignMode === 'atribuido'
                        ? 'border-sky-700 bg-sky-50 text-sky-950'
                        : 'border-[#E6E4DD] bg-white text-[#374151]'
                    }`}
                  >
                    Atribuído
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('reservado')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      assignMode === 'reservado'
                        ? 'border-amber-700 bg-amber-50 text-amber-950'
                        : 'border-[#E6E4DD] bg-white text-[#374151]'
                    }`}
                  >
                    Reservado
                  </button>
                  {capabilities.canConfirmOrRelease && (
                    <button
                      type="button"
                      onClick={() => setAssignMode('confirmado')}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        assignMode === 'confirmado'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                          : 'border-[#E6E4DD] bg-white text-[#374151]'
                      }`}
                    >
                      Já confirmado
                    </button>
                  )}
                </div>
              </div>

              {participantes.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#374151]">
                    Participante
                  </span>
                  <button
                    type="button"
                    onClick={() => setInlineNewPart((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {inlineNewPart
                      ? 'Selecionar participante existente'
                      : 'Cadastrar novo participante'}
                  </button>
                </div>
              )}

              {!inlineNewPart && participantes.length > 0 ? (
                <select
                  required
                  value={selectedParticipanteId}
                  onChange={(e) => setSelectedParticipanteId(e.target.value)}
                  className="w-full rounded-lg border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                >
                  <option value="">Escolha um participante...</option>
                  {participantes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {p.whatsapp || p.telefone
                        ? ` (${p.whatsapp || p.telefone})`
                        : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3 rounded-xl border border-[#E6E4DD] bg-[#FAF9F6] p-4">
                  <p className="text-xs font-semibold text-[#14171A]">
                    Novo participante
                  </p>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={newPartNome}
                    onChange={(e) => setNewPartNome(e.target.value)}
                    placeholder="Nome completo *"
                    className="w-full rounded-lg border border-[#D8D5CD] bg-white px-3 py-2 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                  />
                  <ParticipantContactFields
                    compact
                    telefone={newPartTelefone}
                    whatsapp={newPartWhatsapp}
                    sameAsPhone={newPartSameWhatsapp}
                    onTelefoneChange={setNewPartTelefone}
                    onWhatsappChange={setNewPartWhatsapp}
                    onSameAsPhoneChange={setNewPartSameWhatsapp}
                  />
                  <input
                    type="text"
                    maxLength={500}
                    value={newPartObs}
                    onChange={(e) => setNewPartObs(e.target.value)}
                    placeholder="Observações do contato"
                    className="w-full rounded-lg border border-[#D8D5CD] bg-white px-3 py-2 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#374151]">
                  Observação da atribuição (opcional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={assignObs}
                  onChange={(e) => setAssignObs(e.target.value)}
                  placeholder="Ex.: Combinado pelo WhatsApp, aguardando confirmação..."
                  className="mt-1.5 w-full rounded-lg border border-[#D8D5CD] px-3.5 py-2 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#F0EFE9] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {busy ? 'Salvando...' : 'Confirmar registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
