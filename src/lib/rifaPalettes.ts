import type { ShareCardTheme } from './shareSorteio';
import type { RifaColorPalette } from '../types/numera';

export interface RifaPaletteSpec {
  id: RifaColorPalette;
  label: string;
  subtitle: string;
  hex: string;
  accentBg: string;
  accentBgHover: string;
  accentText: string;
  accentTextStrong: string;
  softBg: string;
  softHoverBg: string;
  softBorder: string;
  selectedCard: string;
  cardHoverBorder: string;
  titleGroupHover: string;
  arrowGroupHover: string;
  tabBorder: string;
  ringClass: string;
  shareTheme: ShareCardTheme;
}

export const DEFAULT_RIFA_PALETTE: RifaColorPalette = 'esmeralda';

export const RIFA_PALETTES: Record<RifaColorPalette, RifaPaletteSpec> = {
  esmeralda: {
    id: 'esmeralda',
    label: 'Esmeralda',
    subtitle: 'Verde editorial',
    hex: '#047857',
    accentBg: 'bg-emerald-700',
    accentBgHover: 'hover:bg-emerald-800',
    accentText: 'text-emerald-700',
    accentTextStrong: 'text-emerald-800',
    softBg: 'bg-emerald-50',
    softHoverBg: 'hover:bg-emerald-50/40',
    softBorder: 'border-emerald-200',
    selectedCard: 'border-emerald-700 bg-emerald-50/70 text-emerald-950',
    cardHoverBorder: 'hover:border-emerald-300',
    titleGroupHover: 'group-hover:text-emerald-800',
    arrowGroupHover: 'group-hover:text-emerald-700',
    tabBorder: 'border-emerald-700',
    ringClass: 'focus-visible:ring-emerald-700',
    shareTheme: 'esmeralda',
  },
  marinho: {
    id: 'marinho',
    label: 'Marinho',
    subtitle: 'Azul clássico',
    hex: '#1E40AF',
    accentBg: 'bg-blue-800',
    accentBgHover: 'hover:bg-blue-900',
    accentText: 'text-blue-800',
    accentTextStrong: 'text-blue-900',
    softBg: 'bg-blue-50',
    softHoverBg: 'hover:bg-blue-50/40',
    softBorder: 'border-blue-200',
    selectedCard: 'border-blue-800 bg-blue-50/70 text-blue-950',
    cardHoverBorder: 'hover:border-blue-300',
    titleGroupHover: 'group-hover:text-blue-900',
    arrowGroupHover: 'group-hover:text-blue-800',
    tabBorder: 'border-blue-800',
    ringClass: 'focus-visible:ring-blue-800',
    shareTheme: 'marinho',
  },
  carvao: {
    id: 'carvao',
    label: 'Carvão',
    subtitle: 'Grafite neutro',
    hex: '#14171A',
    accentBg: 'bg-[#14171A]',
    accentBgHover: 'hover:bg-[#272B30]',
    accentText: 'text-[#14171A]',
    accentTextStrong: 'text-[#14171A]',
    softBg: 'bg-[#F3F1EC]',
    softHoverBg: 'hover:bg-[#FAF9F6]',
    softBorder: 'border-[#D8D5CD]',
    selectedCard: 'border-[#14171A] bg-[#F3F1EC] text-[#14171A]',
    cardHoverBorder: 'hover:border-[#9CA3AF]',
    titleGroupHover: 'group-hover:text-[#14171A]',
    arrowGroupHover: 'group-hover:text-[#14171A]',
    tabBorder: 'border-[#14171A]',
    ringClass: 'focus-visible:ring-[#14171A]',
    shareTheme: 'obsidiana',
  },
  ambar: {
    id: 'ambar',
    label: 'Âmbar',
    subtitle: 'Ouro quente',
    hex: '#B45309',
    accentBg: 'bg-amber-700',
    accentBgHover: 'hover:bg-amber-800',
    accentText: 'text-amber-800',
    accentTextStrong: 'text-amber-900',
    softBg: 'bg-amber-50',
    softHoverBg: 'hover:bg-amber-50/40',
    softBorder: 'border-amber-200',
    selectedCard: 'border-amber-700 bg-amber-50/70 text-amber-950',
    cardHoverBorder: 'hover:border-amber-300',
    titleGroupHover: 'group-hover:text-amber-900',
    arrowGroupHover: 'group-hover:text-amber-700',
    tabBorder: 'border-amber-700',
    ringClass: 'focus-visible:ring-amber-700',
    shareTheme: 'ouro',
  },
  vinho: {
    id: 'vinho',
    label: 'Vinho',
    subtitle: 'Carmim profundo',
    hex: '#9F1239',
    accentBg: 'bg-rose-800',
    accentBgHover: 'hover:bg-rose-900',
    accentText: 'text-rose-800',
    accentTextStrong: 'text-rose-900',
    softBg: 'bg-rose-50',
    softHoverBg: 'hover:bg-rose-50/40',
    softBorder: 'border-rose-200',
    selectedCard: 'border-rose-800 bg-rose-50/70 text-rose-950',
    cardHoverBorder: 'hover:border-rose-300',
    titleGroupHover: 'group-hover:text-rose-900',
    arrowGroupHover: 'group-hover:text-rose-800',
    tabBorder: 'border-rose-800',
    ringClass: 'focus-visible:ring-rose-800',
    shareTheme: 'bordo',
  },
  petroleo: {
    id: 'petroleo',
    label: 'Petróleo',
    subtitle: 'Teal moderno',
    hex: '#0F766E',
    accentBg: 'bg-teal-700',
    accentBgHover: 'hover:bg-teal-800',
    accentText: 'text-teal-700',
    accentTextStrong: 'text-teal-800',
    softBg: 'bg-teal-50',
    softHoverBg: 'hover:bg-teal-50/40',
    softBorder: 'border-teal-200',
    selectedCard: 'border-teal-700 bg-teal-50/70 text-teal-950',
    cardHoverBorder: 'hover:border-teal-300',
    titleGroupHover: 'group-hover:text-teal-800',
    arrowGroupHover: 'group-hover:text-teal-700',
    tabBorder: 'border-teal-700',
    ringClass: 'focus-visible:ring-teal-700',
    shareTheme: 'esmeralda',
  },
};

export const RIFA_PALETTE_LIST: RifaPaletteSpec[] = [
  RIFA_PALETTES.esmeralda,
  RIFA_PALETTES.marinho,
  RIFA_PALETTES.carvao,
  RIFA_PALETTES.ambar,
  RIFA_PALETTES.vinho,
  RIFA_PALETTES.petroleo,
];

export const RIFA_PALETTE_IDS: RifaColorPalette[] = RIFA_PALETTE_LIST.map(
  (p) => p.id
);

export function sanitizeRifaPalette(value: unknown): RifaColorPalette {
  if (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(RIFA_PALETTES, value)
  ) {
    return value as RifaColorPalette;
  }
  return DEFAULT_RIFA_PALETTE;
}

export function getRifaPalette(
  value?: RifaColorPalette | string | null
): RifaPaletteSpec {
  return RIFA_PALETTES[sanitizeRifaPalette(value)];
}
