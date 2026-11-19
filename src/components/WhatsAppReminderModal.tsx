import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';
import { formatCurrencyBrl, type Numero, type Participante, type Rifa } from '../types/numera';
import { getRifaPalette } from '../lib/rifaPalettes';

interface WhatsAppReminderModalProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  onClose: () => void;
}

interface ParticipantReminderItem {
  participante: Participante;
  numerosPendentes: Numero[];
  valorTotalPendente: number;
  whatsappDigits: string;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  rifa,
  numeros,
  participantes,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const palette = getRifaPalette(rifa.corPrimaria);
  const valorUnitario =
    typeof rifa.valorNumero === 'number' && rifa.valorNumero > 0
      ? rifa.valorNumero
      : 0;

  const reminderList = useMemo(() => {
    const numsByPart = new Map<string, Numero[]>();
    for (const n of numeros) {
      if ((n.status === 'reservado' || n.status === 'atribuido') && n.participanteId) {
        const list = numsByPart.get(n.participanteId) || [];
        list.push(n);
        numsByPart.set(n.participanteId, list);
      }
    }

    const items: ParticipantReminderItem[] = [];
    for (const p of participantes) {
      const pNums = numsByPart.get(p.id) || [];
      if (pNums.length === 0) continue;
      const wa = (p.whatsapp || p.telefone).replace(/\D/g, '');
      if (!wa) continue;

      pNums.sort((a, b) => a.indice - b.indice);
      const valorTotalPendente = pNums.length * valorUnitario;

      items.push({
        participante: p,
        numerosPendentes: pNums,
        valorTotalPendente,
        whatsappDigits: wa,
      });
    }

    return items.sort((a, b) =>
      a.participante.nome.localeCompare(b.participante.nome, 'pt-BR', {
        sensitivity: 'base',
      })
    );
  }, [numeros, participantes, valorUnitario]);

  const buildReminderText = (item: ParticipantReminderItem): string => {
    const numerosStr = item.numerosPendentes.map((n) => n.valor).join(', ');
    const valorStr =
      item.valorTotalPendente > 0
        ? ` no valor de *${formatCurrencyBrl(item.valorTotalPendente)}*`
        : '';
    return `Olá, ${item.participante.nome}! Passando para lembrar sobre a reserva do(s) número(s) *${numerosStr}* da rifa *"${rifa.titulo}"* (${rifa.premio})${valorStr}. Caso já tenha realizado o pagamento, desconsidere esta mensagem ou envie o comprovante por aqui. Obrigado!`;
  };

  const buildWhatsAppHref = (item: ParticipantReminderItem): string => {
    const text = buildReminderText(item);
    return `https://wa.me/${item.whatsappDigits}?text=${encodeURIComponent(text)}`;
  };

  const handleCopyText = async (item: ParticipantReminderItem) => {
    const text = buildReminderText(item);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.participante.id);
      setTimeout(() => {
        setCopiedId((curr) => (curr === item.participante.id ? null : curr));
      }, 2500);
    } catch {
      // Ignore clipboard write failures
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14171A]/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E6E4DD] bg-white shadow-xl flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E6E4DD] bg-white px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[#14171A]">
              Lembretes de pagamento via WhatsApp
            </h3>
            <p className="text-xs text-[#64686E]">
              Participantes com números reservados ou atribuídos pendentes (
              {reminderList.length} com contato).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-xl p-2 text-[#64686E] hover:bg-[#F3F1EC] hover:text-[#14171A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {reminderList.length === 0 ? (
            <div className="rounded-2xl border border-[#E6E4DD] bg-[#FAF9F6] p-10 text-center">
              <MessageCircle className="mx-auto h-9 w-9 text-[#8E9299]" />
              <h4 className="mt-3 text-sm font-bold text-[#14171A]">
                Nenhum participante com pendências e WhatsApp
              </h4>
              <p className="mt-1 text-xs text-[#64686E]">
                Todos os números reservados/atribuidos já foram confirmados ou não possuem número de WhatsApp cadastrado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminderList.map((item) => {
                const isCopied = copiedId === item.participante.id;
                const numbersStr = item.numerosPendentes.map((n) => n.valor).join(', ');

                return (
                  <div
                    key={item.participante.id}
                    className="rounded-xl border border-[#E6E4DD] bg-white p-4 space-y-3 hover:border-[#D8D5CD] transition-colors"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#14171A] truncate">
                            {item.participante.nome}
                          </h4>
                          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-800 shrink-0">
                            {item.numerosPendentes.length} núm. pendente(s)
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-[#64686E]">
                          Números: <strong className="text-[#14171A]">{numbersStr}</strong>
                          {item.valorTotalPendente > 0 && (
                            <> · Total: <strong className="text-emerald-700">{formatCurrencyBrl(item.valorTotalPendente)}</strong></>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#8E9299]">
                          WhatsApp: {item.participante.whatsapp || item.participante.telefone}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyText(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D5CD] bg-[#FAF9F6] px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F3F1EC] transition-colors min-h-[38px]"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-700" />
                              Texto copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-[#64686E]" />
                              Copiar texto
                            </>
                          )}
                        </button>

                        <a
                          href={buildWhatsAppHref(item)}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors min-h-[38px] ${palette.accentBg} ${palette.accentBgHover}`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Enviar no WhatsApp
                        </a>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#FAF9F6] p-2.5 font-sans text-xs text-[#4B5563] italic border border-[#F0EFE9]">
                      "{buildReminderText(item)}"
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-[#F0EFE9] px-6 py-4 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#D8D5CD] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] min-h-[42px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
