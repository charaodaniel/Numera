import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import {
  exportParticipantesPagamentosPdf,
  exportRifaCsv,
  exportRifaJson,
} from '../lib/export';
import { getRifaPalette } from '../lib/rifaPalettes';
import type {
  Atribuicao,
  Evento,
  Numero,
  Participante,
  Rifa,
  Sorteio,
} from '../types/numera';

interface ExportRifaMenuProps {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  atribuicoes: Atribuicao[];
  sorteios: Sorteio[];
  eventos: Evento[];
  buttonLabel?: string;
}

export const ExportRifaMenu: React.FC<ExportRifaMenuProps> = ({
  rifa,
  numeros,
  participantes,
  atribuicoes,
  sorteios,
  eventos,
  buttonLabel = 'Exportar',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const palette = getRifaPalette(rifa.corPrimaria);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-[#14171A] ${palette.cardHoverBorder} ${palette.softHoverBg} transition-colors whitespace-nowrap min-h-[40px] focus-visible:outline-none focus-visible:ring-2 ${palette.ringClass}`}
      >
        <Download className={`h-3.5 w-3.5 ${palette.accentText}`} />
        <span>{buttonLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#64686E] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Opções de exportação da rifa"
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-[#E6E4DD] bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              exportParticipantesPagamentosPdf(rifa, numeros, participantes);
              setOpen(false);
            }}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-[#FAF9F6] transition-colors min-h-[44px]"
          >
            <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${palette.accentText}`} />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[#14171A]">
                Relatório em PDF
              </span>
              <span className="block text-[11px] text-[#64686E]">
                Lista completa de participantes e pagamentos
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              exportRifaCsv(rifa, numeros, participantes);
              setOpen(false);
            }}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-[#FAF9F6] transition-colors min-h-[44px]"
          >
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[#14171A]">
                Planilha CSV
              </span>
              <span className="block text-[11px] text-[#64686E]">
                Números, situações e contatos
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              exportRifaJson({
                rifa,
                numeros,
                participantes,
                atribuicoes,
                sorteios,
                eventos,
              });
              setOpen(false);
            }}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-[#FAF9F6] transition-colors min-h-[44px]"
          >
            <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[#14171A]">
                Auditoria JSON
              </span>
              <span className="block text-[11px] text-[#64686E]">
                Dados estruturados, sorteios e histórico
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
