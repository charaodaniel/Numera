import React from 'react';
import { Check } from 'lucide-react';
import {
  getRifaPalette,
  RIFA_PALETTE_LIST,
} from '../lib/rifaPalettes';
import type { RifaColorPalette } from '../types/numera';

interface RifaColorPalettePickerProps {
  value: RifaColorPalette;
  onChange: (palette: RifaColorPalette) => void;
  disabled?: boolean;
  previewTitle?: string;
}

export const RifaColorPalettePicker: React.FC<RifaColorPalettePickerProps> = ({
  value,
  onChange,
  disabled = false,
  previewTitle,
}) => {
  const activePalette = getRifaPalette(value);
  const sampleTitle = previewTitle?.trim() || 'Cartão da rifa';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="block text-xs font-medium text-[#374151]">
            Cor primária dos cartões
          </span>
          <p className="mt-0.5 text-[11px] text-[#64686E]">
            Define o destaque dos cartões, barras de progresso e atalhos desta
            rifa.
          </p>
        </div>
        <span
          className={`text-xs font-semibold ${activePalette.accentText}`}
        >
          {activePalette.label}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Cor primária dos cartões da rifa"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
      >
        {RIFA_PALETTE_LIST.map((palette) => {
          const isSelected = palette.id === activePalette.id;
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(palette.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors min-h-[52px] focus-visible:outline-none focus-visible:ring-2 ${
                palette.ringClass
              } ${
                isSelected
                  ? palette.selectedCard
                  : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#374151] hover:bg-[#F3F1EC]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${palette.accentBg} text-white shadow-xs`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold leading-tight truncate">
                  {palette.label}
                </span>
                <span className="block text-[10px] text-[#64686E] truncate">
                  {palette.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-xl border border-[#E6E4DD] bg-white"
      >
        <div className={`h-1 w-full ${activePalette.accentBg}`} />
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold ${activePalette.accentText}`}>
              Prévia do cartão · Ativa
            </p>
            <p className="truncate text-xs font-bold text-[#14171A]">
              {sampleTitle}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-[#F3F1EC]">
              <div className={`h-full w-2/3 rounded-full ${activePalette.accentBg}`} />
            </div>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-[#14171A]">
              67%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
