import React, { useMemo, useState } from 'react';
import {
  Edit3,
  FileText,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  createParticipante,
  updateParticipante,
} from '../lib/api/participantes';
import { exportParticipantesPagamentosPdf } from '../lib/export';
import { getRifaPalette } from '../lib/rifaPalettes';
import {
  BLUEPRINT_LIMITS,
  type Numero,
  type Participante,
  type Rifa,
  type RoleCapabilities,
} from '../types/numera';
import { ParticipantContactFields } from './ParticipantContactFields';
import { WhatsAppReminderModal } from './WhatsAppReminderModal';

interface RifaParticipantesTabProps {
  rifa: Rifa;
  participantes: Participante[];
  numeros: Numero[];
  capabilities: RoleCapabilities;
  user: User;
}

export const RifaParticipantesTab: React.FC<RifaParticipantesTabProps> = ({
  rifa,
  participantes,
  numeros,
  capabilities,
  user,
}) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editing, setEditing] = useState<Participante | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived = rifa.status === 'arquivada';
  const palette = getRifaPalette(rifa.corPrimaria);

  const numerosPorParticipante = useMemo(() => {
    const map = new Map<string, Numero[]>();
    for (const num of numeros) {
      if (!num.participanteId) continue;
      const list = map.get(num.participanteId) || [];
      list.push(num);
      map.set(num.participanteId, list);
    }
    return map;
  }, [numeros]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participantes;
    return participantes.filter((p) => {
      const nums = numerosPorParticipante.get(p.id) || [];
      const matchesNum = nums.some((n) => n.valor.includes(q));
      return (
        matchesNum ||
        p.nome.toLowerCase().includes(q) ||
        p.telefone.toLowerCase().includes(q) ||
        p.whatsapp.toLowerCase().includes(q)
      );
    });
  }, [participantes, search, numerosPorParticipante]);

  const openCreate = () => {
    setEditing(null);
    setNome('');
    setTelefone('');
    setWhatsapp('');
    setSameAsPhone(false);
    setObservacoes('');
    setError(null);
    setShowModal(true);
  };

  const openEdit = (p: Participante) => {
    setEditing(p);
    setNome(p.nome);
    setTelefone(p.telefone);
    setWhatsapp(p.whatsapp);
    setSameAsPhone(
      Boolean(p.telefone.trim()) && p.telefone.trim() === p.whatsapp.trim()
    );
    setObservacoes(p.observacoes);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const effectiveWhatsapp = sameAsPhone ? telefone : whatsapp;
    try {
      if (editing) {
        await updateParticipante(
          rifa.id,
          editing.id,
          { nome, telefone, whatsapp: effectiveWhatsapp, observacoes },
          user
        );
      } else {
        await createParticipante(
          rifa.id,
          { nome, telefone, whatsapp: effectiveWhatsapp, observacoes },
          user
        );
      }
      setShowModal(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar participante.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E6E4DD] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E9299]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar participante por nome, telefone ou número..."
              className="w-full rounded-xl border border-[#D8D5CD] bg-[#FAF9F6] py-2.5 pl-10 pr-4 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowReminderModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D5CD] bg-white px-4 py-2.5 text-sm font-semibold text-[#14171A] hover:bg-[#F3F1EC] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <MessageCircle className="h-4 w-4 text-emerald-700" />
              Lembretes WhatsApp
            </button>

            <button
              type="button"
              onClick={() =>
                exportParticipantesPagamentosPdf(rifa, numeros, participantes)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D5CD] bg-white px-4 py-2.5 text-sm font-semibold text-[#14171A] hover:bg-[#F3F1EC] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <FileText className={`h-4 w-4 ${palette.accentText}`} />
              Relatório PDF
            </button>

            {!isArchived && (
              <button
                type="button"
                onClick={openCreate}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${palette.accentBg} ${palette.accentBgHover}`}
              >
                <Plus className="h-4 w-4" />
                Novo participante
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E6E4DD] bg-white p-10 text-center">
          <Users className="mx-auto h-9 w-9 text-[#8E9299]" />
          <h3 className="mt-3 text-base font-bold text-[#14171A]">
            {participantes.length === 0
              ? 'Nenhum participante cadastrado'
              : 'Nenhum resultado encontrado'}
          </h3>
          <p className="mt-1 text-sm text-[#4B5563]">
            Cadastre os participantes para vincular múltiplos números e manter o
            contato organizado.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E6E4DD] bg-white">
          <div className="divide-y divide-[#F0EFE9]">
            {filtered.map((p) => {
              const pNums = numerosPorParticipante.get(p.id) || [];
              const confirmadosCount = pNums.filter(
                (n) => n.status === 'confirmado'
              ).length;
              const canEdit =
                !isArchived &&
                (capabilities.canManageOthersAssignments ||
                  p.createdBy === user.uid);
              const waDigits = (p.whatsapp || p.telefone).replace(/\D/g, '');

              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h3 className="text-sm font-bold text-[#14171A]">
                        {p.nome}
                      </h3>
                      <span className="text-xs text-[#64686E] font-mono tabular-nums">
                        {pNums.length} número(s) · {confirmadosCount} confirmado(s)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4B5563]">
                      {p.telefone && (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Phone className="h-3.5 w-3.5 text-[#8E9299]" />
                          {p.telefone}
                        </span>
                      )}
                      {p.whatsapp && (
                        <a
                          href={`https://wa.me/${waDigits}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono tabular-nums text-emerald-700 hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp: {p.whatsapp}
                        </a>
                      )}
                    </div>

                    {p.observacoes && (
                      <p className="text-xs text-[#64686E]">{p.observacoes}</p>
                    )}

                    {pNums.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-xs tabular-nums">
                        {pNums.map((n) => (
                          <span
                            key={n.valor}
                            className={`rounded-lg border px-2 py-0.5 ${
                              n.status === 'confirmado'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : n.status === 'reservado'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : 'border-sky-200 bg-sky-50 text-sky-800'
                            }`}
                          >
                            {n.valor}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2 text-xs font-semibold text-[#14171A] hover:bg-[#F3F1EC] sm:self-center shrink-0 min-h-[38px]"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#64686E]" />
                      Editar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showReminderModal && (
        <WhatsAppReminderModal
          rifa={rifa}
          numeros={numeros}
          participantes={participantes}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0EFE9] pb-4">
              <h3 className="text-base font-bold text-[#14171A]">
                {editing ? 'Editar participante' : 'Novo participante'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-1.5 text-[#64686E] hover:bg-[#F3F1EC] hover:text-[#14171A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
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
                  className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2.5 text-sm text-[#14171A] focus:border-emerald-700 focus:outline-none"
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
                  className="mt-1.5 w-full rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2 text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#F0EFE9] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-[#D8D5CD] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 min-h-[44px]"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
