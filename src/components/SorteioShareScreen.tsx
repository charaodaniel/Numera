import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Copy,
  Download,
  ImagePlus,
  MessageCircle,
  RotateCcw,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import {
  buildSorteioCaption,
  DEFAULT_BRAND_CONFIG,
  FORMAT_SPECS,
  formatDrawDatePt,
  renderSorteioPosterBlob,
  TEMPLATE_SPECS,
  type ShareBrandConfig,
  type ShareCardFormat,
  type ShareCardTemplate,
  type ShareCardTheme,
  type ShareLogoMode,
  type ShareLogoPlacement,
} from '../lib/shareSorteio';
import { getRifaPalette } from '../lib/rifaPalettes';
import {
  formatTicketNumber,
  type Rifa,
  type Sorteio,
} from '../types/numera';

interface SorteioShareScreenProps {
  rifa: Rifa;
  sorteio: Sorteio;
  onClose: () => void;
}

const BRAND_STORAGE_KEY = 'numera_share_brand_v1';

function loadSavedBrandConfig(): ShareBrandConfig {
  if (typeof window === 'undefined') return DEFAULT_BRAND_CONFIG;
  try {
    const raw = window.localStorage.getItem(BRAND_STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ShareBrandConfig>;
    return {
      showLogo:
        typeof parsed.showLogo === 'boolean'
          ? parsed.showLogo
          : DEFAULT_BRAND_CONFIG.showLogo,
      logoMode:
        parsed.logoMode === 'numera' ||
        parsed.logoMode === 'custom' ||
        parsed.logoMode === 'none'
          ? parsed.logoMode
          : DEFAULT_BRAND_CONFIG.logoMode,
      customLogoDataUrl:
        typeof parsed.customLogoDataUrl === 'string' &&
        parsed.customLogoDataUrl.startsWith('data:image/')
          ? parsed.customLogoDataUrl
          : null,
      brandName:
        typeof parsed.brandName === 'string'
          ? parsed.brandName
          : DEFAULT_BRAND_CONFIG.brandName,
      subtitle:
        typeof parsed.subtitle === 'string'
          ? parsed.subtitle
          : DEFAULT_BRAND_CONFIG.subtitle,
      logoPlacement:
        parsed.logoPlacement === 'header' || parsed.logoPlacement === 'footer'
          ? parsed.logoPlacement
          : DEFAULT_BRAND_CONFIG.logoPlacement,
    };
  } catch {
    return DEFAULT_BRAND_CONFIG;
  }
}

const THEME_OPTIONS: {
  id: ShareCardTheme;
  label: string;
  swatchClass: string;
}[] = [
  {
    id: 'claro',
    label: 'Claro',
    swatchClass: 'bg-[#FAF9F6] border-[#D8D5CD]',
  },
  {
    id: 'obsidiana',
    label: 'Obsidiana',
    swatchClass: 'bg-[#14171A] border-[#2A3037]',
  },
  {
    id: 'esmeralda',
    label: 'Esmeralda',
    swatchClass: 'bg-[#064E3B] border-[#0D7A5F]',
  },
  {
    id: 'marinho',
    label: 'Marinho',
    swatchClass: 'bg-[#0F172A] border-[#334155]',
  },
  {
    id: 'ouro',
    label: 'Ouro',
    swatchClass: 'bg-[#292524] border-[#F59E0B]',
  },
  {
    id: 'bordo',
    label: 'Vinho',
    swatchClass: 'bg-[#4C0D20] border-[#FB7185]',
  },
];

const THEME_PREVIEW_STYLES: Record<
  ShareCardTheme,
  {
    outerBg: string;
    notchBg: string;
    card: string;
    headerBand: string;
    muted: string;
    subtle: string;
    accentText: string;
    accentBg: string;
    accentBorder: string;
    divider: string;
    spotlight: string;
    rowFirst: string;
    rowOther: string;
  }
> = {
  claro: {
    outerBg: 'bg-[#FAF9F6]',
    notchBg: 'bg-[#FAF9F6]',
    card: 'bg-white border-[#E6E4DD] text-[#14171A]',
    headerBand: 'bg-[#F3F1EC]',
    muted: 'text-[#4B5563]',
    subtle: 'text-[#64686E]',
    accentText: 'text-emerald-800',
    accentBg: 'bg-emerald-700',
    accentBorder: 'border-emerald-700',
    divider: 'border-[#E6E4DD]',
    spotlight: 'bg-[#FAF9F6] border-[#D8D5CD]',
    rowFirst: 'bg-emerald-50 border-emerald-600',
    rowOther: 'bg-[#FAF9F6] border-[#D8D5CD]',
  },
  obsidiana: {
    outerBg: 'bg-[#111417]',
    notchBg: 'bg-[#111417]',
    card: 'bg-[#191D22] border-[#2A3037] text-[#FAF9F6]',
    headerBand: 'bg-[#14171A]',
    muted: 'text-slate-300',
    subtle: 'text-slate-400',
    accentText: 'text-emerald-300',
    accentBg: 'bg-emerald-500',
    accentBorder: 'border-emerald-500',
    divider: 'border-[#2A3037]',
    spotlight: 'bg-[#14171A] border-[#2E363E]',
    rowFirst: 'bg-[#064E3B] border-emerald-500',
    rowOther: 'bg-[#14171A] border-[#2E363E]',
  },
  esmeralda: {
    outerBg: 'bg-[#064E3B]',
    notchBg: 'bg-[#064E3B]',
    card: 'bg-[#065F46] border-[#0D7A5F] text-white',
    headerBand: 'bg-[#044232]',
    muted: 'text-emerald-100',
    subtle: 'text-emerald-200',
    accentText: 'text-emerald-200',
    accentBg: 'bg-emerald-300',
    accentBorder: 'border-emerald-300',
    divider: 'border-[#0D7A5F]',
    spotlight: 'bg-[#044232] border-[#0F8A6B]',
    rowFirst: 'bg-[#047857] border-emerald-300',
    rowOther: 'bg-[#044232] border-[#0F8A6B]',
  },
  marinho: {
    outerBg: 'bg-[#0F172A]',
    notchBg: 'bg-[#0F172A]',
    card: 'bg-[#1E293B] border-[#334155] text-slate-50',
    headerBand: 'bg-[#0B1221]',
    muted: 'text-slate-300',
    subtle: 'text-slate-400',
    accentText: 'text-sky-300',
    accentBg: 'bg-sky-400',
    accentBorder: 'border-sky-400',
    divider: 'border-[#334155]',
    spotlight: 'bg-[#0F172A] border-[#334155]',
    rowFirst: 'bg-sky-950 border-sky-400',
    rowOther: 'bg-[#0F172A] border-[#334155]',
  },
  ouro: {
    outerBg: 'bg-[#1C1917]',
    notchBg: 'bg-[#1C1917]',
    card: 'bg-[#292524] border-[#44403C] text-[#FAF7F2]',
    headerBand: 'bg-[#171412]',
    muted: 'text-stone-200',
    subtle: 'text-stone-300',
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-500',
    accentBorder: 'border-amber-500',
    divider: 'border-[#44403C]',
    spotlight: 'bg-[#1C1917] border-[#57534E]',
    rowFirst: 'bg-amber-950 border-amber-500',
    rowOther: 'bg-[#1C1917] border-[#57534E]',
  },
  bordo: {
    outerBg: 'bg-[#3B0A18]',
    notchBg: 'bg-[#3B0A18]',
    card: 'bg-[#4C0D20] border-[#701A33] text-[#FFF8F9]',
    headerBand: 'bg-[#2D0712]',
    muted: 'text-rose-100',
    subtle: 'text-rose-200',
    accentText: 'text-rose-200',
    accentBg: 'bg-rose-400',
    accentBorder: 'border-rose-400',
    divider: 'border-[#701A33]',
    spotlight: 'bg-[#360916] border-[#881337]',
    rowFirst: 'bg-rose-950 border-rose-400',
    rowOther: 'bg-[#360916] border-[#881337]',
  },
};

const NumeraVectorBadge: React.FC<{ sizeClass?: string }> = ({
  sizeClass = 'h-6 w-6',
}) => (
  <svg
    viewBox="0 0 512 512"
    fill="none"
    aria-hidden="true"
    className={`${sizeClass} shrink-0`}
  >
    <rect width="512" height="512" rx="112" fill="#0F172A" />
    <rect x="96" y="132" width="320" height="248" rx="36" fill="#059669" />
    <circle cx="96" cy="256" r="28" fill="#0F172A" />
    <circle cx="416" cy="256" r="28" fill="#0F172A" />
    <rect x="164" y="192" width="52" height="52" rx="10" fill="#ECFDF5" />
    <rect
      x="230"
      y="192"
      width="52"
      height="52"
      rx="10"
      fill="#ECFDF5"
      fillOpacity="0.72"
    />
    <rect
      x="296"
      y="192"
      width="52"
      height="52"
      rx="10"
      fill="#ECFDF5"
      fillOpacity="0.4"
    />
    <rect
      x="164"
      y="258"
      width="52"
      height="52"
      rx="10"
      fill="#ECFDF5"
      fillOpacity="0.4"
    />
    <rect x="230" y="258" width="52" height="52" rx="10" fill="#ECFDF5" />
    <rect
      x="296"
      y="258"
      width="52"
      height="52"
      rx="10"
      fill="#ECFDF5"
      fillOpacity="0.85"
    />
  </svg>
);

const BrandLockupPreview: React.FC<{
  brand: ShareBrandConfig;
  compact?: boolean;
}> = ({ brand, compact = false }) => {
  if (!brand.showLogo) return null;
  const sizeClass = compact ? 'h-5 w-5' : 'h-6 w-6';
  const showCustom = brand.logoMode === 'custom' && brand.customLogoDataUrl;
  const showNumera =
    brand.logoMode === 'numera' ||
    (brand.logoMode === 'custom' && !brand.customLogoDataUrl);

  return (
    <div className="inline-flex items-center gap-2 min-w-0">
      {showCustom && brand.customLogoDataUrl && (
        <img
          src={brand.customLogoDataUrl}
          alt={brand.brandName || 'Logo'}
          className={`${sizeClass} rounded-md object-contain shrink-0`}
        />
      )}
      {showNumera && <NumeraVectorBadge sizeClass={sizeClass} />}
      {brand.brandName.trim() && (
        <span
          className={`${compact ? 'text-xs' : 'text-sm'} font-extrabold tracking-tight truncate`}
        >
          {brand.brandName.trim()}
        </span>
      )}
    </div>
  );
};

export const SorteioShareScreen: React.FC<SorteioShareScreenProps> = ({
  rifa,
  sorteio,
  onClose,
}) => {
  const [format, setFormat] = useState<ShareCardFormat>('story');
  const [theme, setTheme] = useState<ShareCardTheme>(() =>
    rifa.corPrimaria ? getRifaPalette(rifa.corPrimaria).shareTheme : 'claro'
  );
  const [template, setTemplate] = useState<ShareCardTemplate>('editorial');
  const [brand, setBrand] = useState<ShareBrandConfig>(() =>
    loadSavedBrandConfig()
  );
  const [hidePhone, setHidePhone] = useState(true);
  const [showAuditMeta, setShowAuditMeta] = useState(true);
  const [busyAction, setBusyAction] = useState<'download' | 'share' | null>(
    null
  );
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brand));
    } catch {
      // Ignore storage quota errors
    }
  }, [brand]);

  const defaultCaption = useMemo(
    () => buildSorteioCaption(rifa, sorteio, hidePhone, brand.brandName),
    [rifa, sorteio, hidePhone, brand.brandName]
  );
  const [caption, setCaption] = useState(defaultCaption);

  useEffect(() => {
    setCaption(defaultCaption);
  }, [defaultCaption]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const spec = FORMAT_SPECS[format];
  const dateStr = formatDrawDatePt(sorteio);
  const rangeStr = `${formatTicketNumber(rifa.numeroInicial, rifa.digitos)}–${formatTicketNumber(rifa.numeroFinal, rifa.digitos)}`;

  const slugName = useMemo(() => {
    const base = rifa.titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return `resultado-${base || 'rifa'}-${template}-${format}.png`;
  }, [rifa.titulo, template, format]);

  const handleUploadCustomLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        text: 'Selecione um arquivo de imagem válido (PNG, JPG, WebP ou SVG).',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        text: 'A imagem da logo deve ter no máximo 2 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return;
      setBrand((prev) => ({
        ...prev,
        showLogo: true,
        logoMode: 'custom',
        customLogoDataUrl: result,
      }));
      setFeedback({
        type: 'success',
        text: 'Logo personalizada aplicada ao cartão.',
      });
    };
    reader.onerror = () => {
      setFeedback({
        type: 'error',
        text: 'Não foi possível ler a imagem selecionada.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPng = async () => {
    setBusyAction('download');
    setFeedback(null);
    try {
      const blob = await renderSorteioPosterBlob(rifa, sorteio, {
        format,
        theme,
        template,
        brand,
        hidePhone,
        showAuditMeta,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slugName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: `Imagem PNG (${spec.width}×${spec.height}px) baixada com sucesso.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível gerar a imagem.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleNativeShare = async () => {
    setBusyAction('share');
    setFeedback(null);
    try {
      const blob = await renderSorteioPosterBlob(rifa, sorteio, {
        format,
        theme,
        template,
        brand,
        hidePhone,
        showAuditMeta,
      });
      const file = new File([blob], slugName, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        const canShareFiles =
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        if (canShareFiles) {
          await navigator.share({
            title: `Resultado — ${rifa.titulo}`,
            text: caption,
            files: [file],
          });
          setFeedback({
            type: 'success',
            text: 'Resultado compartilhado.',
          });
          return;
        }

        await navigator.share({
          title: `Resultado — ${rifa.titulo}`,
          text: caption,
        });
        setFeedback({
          type: 'success',
          text: 'Legenda compartilhada. Você também pode baixar a imagem PNG ao lado.',
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slugName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(caption);
      }
      setFeedback({
        type: 'success',
        text: 'Imagem baixada e legenda copiada! Agora é só publicar no Instagram, Status ou grupo.',
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Não foi possível concluir o compartilhamento.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 2500);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Não foi possível copiar automaticamente. Selecione o texto abaixo.',
      });
    }
  };

  const themeStyles = THEME_PREVIEW_STYLES[theme];
  const aspectClass =
    format === 'story'
      ? 'aspect-[9/16] max-w-[340px]'
      : format === 'portrait'
        ? 'aspect-[4/5] max-w-[390px]'
        : 'aspect-square max-w-[420px]';

  const maxPreviewWinners =
    format === 'story' ? 5 : format === 'square' ? 3 : 4;
  const visibleWinners = sorteio.resultados.slice(0, maxPreviewWinners);
  const extraWinnersCount = Math.max(
    0,
    sorteio.resultados.length - visibleWinners.length
  );

  const subtitleLabel = brand.subtitle.trim() || 'Resultado oficial';
  const orgFooter = brand.brandName.trim() || 'Numera';
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(caption)}`;

  const renderWinnersBlock = () => {
    if (sorteio.resultados.length === 1) {
      const win = sorteio.resultados[0];
      if (template === 'holofote') {
        return (
          <div className="px-2 py-5 text-center">
            <p className={`text-[11px] font-bold tracking-wide ${themeStyles.accentText}`}>
              1º lugar · {win.premioDescricao || rifa.premio}
            </p>
            <p className="mt-3 font-mono text-6xl font-extrabold tabular-nums tracking-tight">
              #{win.numero}
            </p>
            <p className="mt-3 text-lg font-bold leading-snug">
              {win.participanteNome}
            </p>
            {!hidePhone && win.participanteTelefone && (
              <p className={`mt-1 font-mono text-xs tabular-nums ${themeStyles.subtle}`}>
                {win.participanteTelefone}
              </p>
            )}
          </div>
        );
      }

      return (
        <div
          className={`rounded-2xl border px-4 py-6 text-center ${themeStyles.spotlight} ${
            template === 'bilhete' ? `${themeStyles.accentBorder} border-2` : ''
          }`}
        >
          <p className={`text-[11px] font-bold tracking-wide ${themeStyles.accentText}`}>
            1º lugar · {win.premioDescricao || rifa.premio}
          </p>
          <p className="mt-3 font-mono text-5xl sm:text-6xl font-extrabold tabular-nums tracking-tight">
            #{win.numero}
          </p>
          <p className="mt-3 text-base sm:text-lg font-bold leading-snug">
            {win.participanteNome}
          </p>
          {!hidePhone && win.participanteTelefone && (
            <p className={`mt-1 font-mono text-xs tabular-nums ${themeStyles.subtle}`}>
              {win.participanteTelefone}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {visibleWinners.map((win, idx) => (
          <div
            key={`${win.ordem}-${win.numero}`}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
              idx === 0 ? themeStyles.rowFirst : themeStyles.rowOther
            }`}
          >
            <span className="font-mono text-lg sm:text-xl font-extrabold tabular-nums shrink-0">
              #{win.numero}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-[10px] font-semibold truncate ${
                  idx === 0 ? themeStyles.accentText : themeStyles.subtle
                }`}
              >
                {win.ordem}º lugar · {win.premioDescricao}
              </p>
              <p className="text-sm font-bold truncate">
                {win.participanteNome}
              </p>
              {!hidePhone && win.participanteTelefone && (
                <p className={`font-mono text-[10px] tabular-nums ${themeStyles.subtle}`}>
                  {win.participanteTelefone}
                </p>
              )}
            </div>
          </div>
        ))}
        {extraWinnersCount > 0 && (
          <p className={`text-[11px] font-medium ${themeStyles.subtle}`}>
            + {extraWinnersCount} outro(s) ganhador(es) no registro completo
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sorteio-title"
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF9F6] text-[#14171A] overflow-y-auto"
    >
      <header className="sticky top-0 z-20 border-b border-[#E6E4DD] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F1EC] hover:text-[#14171A] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao sorteio
          </button>

          <h1
            id="share-sorteio-title"
            className="hidden sm:block text-sm font-bold text-[#14171A] truncate"
          >
            Compartilhar resultado nas redes sociais
          </h1>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            {busyAction === 'download' ? 'Gerando PNG...' : 'Baixar imagem PNG'}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Preview Stage */}
          <section
            aria-label="Prévia do cartão para redes sociais"
            className="lg:col-span-7 space-y-4 lg:sticky lg:top-20"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#14171A]">
                  Prévia do cartão
                </h2>
                <p className="text-xs text-[#64686E] font-mono tabular-nums">
                  {spec.width} × {spec.height} px ({spec.ratioLabel}) · Modelo{' '}
                  {TEMPLATE_SPECS.find((t) => t.id === template)?.label}
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Formato para rede social"
                className="inline-flex items-center gap-1 rounded-xl bg-[#F3F1EC] p-1 self-start"
              >
                {(['story', 'portrait', 'square'] as ShareCardFormat[]).map(
                  (fmt) => {
                    const active = format === fmt;
                    const item = FORMAT_SPECS[fmt];
                    return (
                      <button
                        key={fmt}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setFormat(fmt)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                          active
                            ? 'bg-white text-[#14171A] shadow-xs'
                            : 'text-[#4B5563] hover:text-[#14171A]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="flex items-center justify-center rounded-2xl border border-[#E6E4DD] bg-[#F3F1EC]/70 p-4 sm:p-8">
              {template === 'holofote' ? (
                /* Holofote Full-Bleed Minimalist Poster */
                <div
                  className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl border ${themeStyles.card} flex flex-col justify-between shadow-sm`}
                >
                  <div className={`h-2 w-full ${themeStyles.accentBg}`} />
                  <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
                    <div>
                      <div
                        className={`flex items-center justify-between gap-2 border-b pb-3 ${themeStyles.divider}`}
                      >
                        {brand.showLogo && brand.logoPlacement === 'header' ? (
                          <BrandLockupPreview brand={brand} />
                        ) : (
                          <span className={`text-[11px] font-semibold ${themeStyles.accentText}`}>
                            {subtitleLabel}
                          </span>
                        )}
                        {brand.showLogo && brand.logoPlacement === 'header' && (
                          <span className={`text-[11px] font-semibold ${themeStyles.accentText} shrink-0`}>
                            {subtitleLabel}
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg sm:text-xl font-extrabold leading-tight [text-wrap:balance]">
                          {rifa.titulo}
                        </h3>
                        <p className={`mt-1 text-xs leading-snug ${themeStyles.muted}`}>
                          Prêmio principal: {rifa.premio}
                        </p>
                      </div>
                    </div>

                    <div className="my-4 flex-1 flex flex-col justify-center">
                      {renderWinnersBlock()}
                    </div>

                    <div
                      className={`border-t pt-3 text-[10px] leading-relaxed space-y-2 ${themeStyles.divider}`}
                    >
                      {brand.showLogo && brand.logoPlacement === 'footer' && (
                        <BrandLockupPreview brand={brand} compact />
                      )}
                      {showAuditMeta ? (
                        <div className="space-y-0.5">
                          <p className={`font-mono tabular-nums ${themeStyles.muted}`}>
                            {dateStr} · {sorteio.totalElegiveis} elegíveis ·
                            Faixa {rangeStr}
                          </p>
                          <p className={themeStyles.subtle}>
                            Sorteio por {sorteio.realizadoPorNome} · Registrado
                            via {orgFooter}
                          </p>
                        </div>
                      ) : (
                        !(brand.showLogo && brand.logoPlacement === 'footer') && (
                          <p className={themeStyles.subtle}>
                            Organização centralizada de rifas · {orgFooter}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : template === 'cartaz' ? (
                /* Cartaz Moderno com Faixa Superior */
                <div
                  className={`w-full ${aspectClass} ${themeStyles.outerBg} rounded-2xl border border-[#D8D5CD] p-5 sm:p-6 flex flex-col justify-between shadow-sm`}
                >
                  <div
                    className={`flex h-full flex-col justify-between overflow-hidden rounded-2xl border ${themeStyles.card}`}
                  >
                    <div
                      className={`${themeStyles.headerBand} border-b-2 ${themeStyles.accentBorder} p-5 sm:p-6`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {brand.showLogo && brand.logoPlacement === 'header' ? (
                          <BrandLockupPreview brand={brand} />
                        ) : (
                          <span className={`text-[11px] font-semibold ${themeStyles.accentText}`}>
                            {subtitleLabel}
                          </span>
                        )}
                        {brand.showLogo && brand.logoPlacement === 'header' && (
                          <span className={`text-[11px] font-semibold ${themeStyles.accentText} shrink-0`}>
                            {subtitleLabel}
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg sm:text-xl font-extrabold leading-tight [text-wrap:balance]">
                          {rifa.titulo}
                        </h3>
                        <p className={`mt-1 text-xs leading-snug ${themeStyles.muted}`}>
                          Prêmio principal: {rifa.premio}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                      <div className="my-auto py-2">{renderWinnersBlock()}</div>

                      <div
                        className={`border-t pt-3 text-[10px] leading-relaxed space-y-2 ${themeStyles.divider}`}
                      >
                        {brand.showLogo && brand.logoPlacement === 'footer' && (
                          <BrandLockupPreview brand={brand} compact />
                        )}
                        {showAuditMeta ? (
                          <div className="space-y-0.5">
                            <p className={`font-mono tabular-nums ${themeStyles.muted}`}>
                              {dateStr} · {sorteio.totalElegiveis} elegíveis ·
                              Faixa {rangeStr}
                            </p>
                            <p className={themeStyles.subtle}>
                              Sorteio por {sorteio.realizadoPorNome} ·
                              Registrado via {orgFooter}
                            </p>
                          </div>
                        ) : (
                          !(
                            brand.showLogo && brand.logoPlacement === 'footer'
                          ) && (
                            <p className={themeStyles.subtle}>
                              Organização centralizada de rifas · {orgFooter}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Editorial Clássico e Bilhete Picotado */
                <div
                  className={`w-full ${aspectClass} ${themeStyles.outerBg} rounded-2xl border border-[#D8D5CD] p-5 sm:p-6 flex flex-col justify-between shadow-sm`}
                >
                  <div
                    className={`relative flex h-full flex-col justify-between rounded-2xl border p-5 sm:p-6 ${themeStyles.card}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3">
                        {brand.showLogo && brand.logoPlacement === 'header' ? (
                          <BrandLockupPreview brand={brand} />
                        ) : (
                          <span className={`text-[11px] font-semibold ${themeStyles.accentText}`}>
                            {subtitleLabel}
                          </span>
                        )}
                        {brand.showLogo && brand.logoPlacement === 'header' && (
                          <span className={`text-[11px] font-semibold ${themeStyles.accentText} shrink-0`}>
                            {subtitleLabel}
                          </span>
                        )}
                      </div>

                      {template === 'bilhete' ? (
                        <div className="relative my-1 flex items-center">
                          <span
                            aria-hidden="true"
                            className={`-ml-7 h-5 w-5 rounded-full border-r ${themeStyles.divider} ${themeStyles.notchBg} shrink-0`}
                          />
                          <div
                            className={`flex-1 border-t-2 border-dashed ${themeStyles.divider}`}
                          />
                          <span
                            aria-hidden="true"
                            className={`-mr-7 h-5 w-5 rounded-full border-l ${themeStyles.divider} ${themeStyles.notchBg} shrink-0`}
                          />
                        </div>
                      ) : (
                        <div className={`border-t ${themeStyles.divider}`} />
                      )}

                      <div className="mt-4">
                        <h3 className="text-lg sm:text-xl font-extrabold leading-tight [text-wrap:balance]">
                          {rifa.titulo}
                        </h3>
                        <p className={`mt-1 text-xs leading-snug ${themeStyles.muted}`}>
                          Prêmio principal: {rifa.premio}
                        </p>
                      </div>
                    </div>

                    <div className="my-4 flex-1 flex flex-col justify-center">
                      {renderWinnersBlock()}
                    </div>

                    <div
                      className={`border-t pt-3 text-[10px] leading-relaxed space-y-2 ${themeStyles.divider}`}
                    >
                      {brand.showLogo && brand.logoPlacement === 'footer' && (
                        <BrandLockupPreview brand={brand} compact />
                      )}
                      {showAuditMeta ? (
                        <div className="space-y-0.5">
                          <p className={`font-mono tabular-nums ${themeStyles.muted}`}>
                            {dateStr} · {sorteio.totalElegiveis} elegíveis ·
                            Faixa {rangeStr}
                          </p>
                          <p className={themeStyles.subtle}>
                            Sorteio por {sorteio.realizadoPorNome} · Registrado
                            via {orgFooter}
                          </p>
                        </div>
                      ) : (
                        !(brand.showLogo && brand.logoPlacement === 'footer') && (
                          <p className={themeStyles.subtle}>
                            Organização centralizada de rifas · {orgFooter}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Controls & Share Actions */}
          <aside className="lg:col-span-5 space-y-5">
            {feedback && (
              <div
                role="status"
                className={`rounded-xl border px-4 py-3 text-xs font-medium ${
                  feedback.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* Template + Color Palette Card */}
            <div className="rounded-2xl border border-[#E6E4DD] bg-white p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-[#14171A]">
                  Modelo e paleta do cartão
                </h2>
                <p className="mt-0.5 text-xs text-[#64686E]">
                  Escolha o layout moderno e a combinação de cores.
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-[#374151]">
                  Modelo do layout
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_SPECS.map((tpl) => {
                    const active = template === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplate(tpl.id)}
                        className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors min-h-[54px] ${
                          active
                            ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                            : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#374151] hover:bg-[#F3F1EC]'
                        }`}
                      >
                        <p className="text-xs font-bold">{tpl.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#64686E] truncate">
                          {tpl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 border-t border-[#F0EFE9] pt-4">
                <span className="block text-xs font-medium text-[#374151]">
                  Paleta de cores
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {THEME_OPTIONS.map((item) => {
                    const active = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTheme(item.id)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                          active
                            ? 'border-emerald-700 bg-emerald-50/70 text-emerald-900'
                            : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#374151] hover:bg-[#F3F1EC]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 rounded-sm border shrink-0 ${item.swatchClass}`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Editable Platform / Custom Brand Logo Card */}
            <div className="rounded-2xl border border-[#E6E4DD] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#14171A]">
                    Logo e marca no cartão
                  </h2>
                  <p className="mt-0.5 text-xs text-[#64686E]">
                    Personalize o símbolo, nome e posição da plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBrand(DEFAULT_BRAND_CONFIG)}
                  title="Restaurar padrão Numera"
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#4B5563] hover:bg-[#F3F1EC] hover:text-[#14171A] shrink-0"
                >
                  <RotateCcw className="h-3 w-3" />
                  Padrão
                </button>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-medium text-[#14171A] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={brand.showLogo}
                  onChange={(e) =>
                    setBrand((prev) => ({
                      ...prev,
                      showLogo: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
                />
                <span>Exibir logo e marca no cartão</span>
              </label>

              {brand.showLogo && (
                <div className="space-y-4 border-t border-[#F0EFE9] pt-4">
                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-[#374151]">
                      Ícone da logo
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'numera', label: 'Logo Numera' },
                          { id: 'custom', label: 'Logo própria' },
                          { id: 'none', label: 'Só texto' },
                        ] as { id: ShareLogoMode; label: string }[]
                      ).map((mode) => {
                        const active = brand.logoMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              if (
                                mode.id === 'custom' &&
                                !brand.customLogoDataUrl
                              ) {
                                fileInputRef.current?.click();
                              } else {
                                setBrand((prev) => ({
                                  ...prev,
                                  logoMode: mode.id,
                                }));
                              }
                            }}
                            className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors min-h-[40px] ${
                              active
                                ? 'border-emerald-700 bg-emerald-50/70 text-emerald-900'
                                : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#374151] hover:bg-[#F3F1EC]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCustomLogo}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-xs font-semibold text-[#14171A] hover:bg-[#F3F1EC] min-h-[38px]"
                      >
                        <ImagePlus className="h-3.5 w-3.5 text-emerald-700" />
                        {brand.customLogoDataUrl
                          ? 'Trocar imagem da logo'
                          : 'Enviar imagem da logo'}
                      </button>

                      {brand.customLogoDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setBrand((prev) => ({
                              ...prev,
                              logoMode: 'numera',
                              customLogoDataUrl: null,
                            }))
                          }
                          className="rounded-xl px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 min-h-[38px]"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="share-brand-name"
                        className="block text-xs font-medium text-[#374151]"
                      >
                        Nome exibido
                      </label>
                      <input
                        id="share-brand-name"
                        type="text"
                        maxLength={40}
                        value={brand.brandName}
                        onChange={(e) =>
                          setBrand((prev) => ({
                            ...prev,
                            brandName: e.target.value,
                          }))
                        }
                        placeholder="Ex.: Numera"
                        className="mt-1 w-full rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-xs text-[#14171A] focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="share-brand-subtitle"
                        className="block text-xs font-medium text-[#374151]"
                      >
                        Texto do topo / @arroba
                      </label>
                      <input
                        id="share-brand-subtitle"
                        type="text"
                        maxLength={40}
                        value={brand.subtitle}
                        onChange={(e) =>
                          setBrand((prev) => ({
                            ...prev,
                            subtitle: e.target.value,
                          }))
                        }
                        placeholder="Resultado oficial"
                        className="mt-1 w-full rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-xs text-[#14171A] focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[#374151]">
                      Posição da logo
                    </span>
                    <div className="inline-flex items-center gap-1 rounded-xl bg-[#F3F1EC] p-1">
                      {(
                        [
                          { id: 'header', label: 'No topo' },
                          { id: 'footer', label: 'No rodapé' },
                        ] as { id: ShareLogoPlacement; label: string }[]
                      ).map((pos) => {
                        const active = brand.logoPlacement === pos.id;
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() =>
                              setBrand((prev) => ({
                                ...prev,
                                logoPlacement: pos.id,
                              }))
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-white text-[#14171A] shadow-xs'
                                : 'text-[#4B5563] hover:text-[#14171A]'
                            }`}
                          >
                            {pos.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t border-[#F0EFE9] pt-4">
                <label className="flex items-start gap-2.5 text-xs text-[#374151] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hidePhone}
                    onChange={(e) => setHidePhone(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>
                    <strong className="text-[#14171A] font-semibold block">
                      Ocultar telefone do ganhador
                    </strong>
                    Recomendado para proteger a privacidade ao postar em redes
                    públicas.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-[#374151] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAuditMeta}
                    onChange={(e) => setShowAuditMeta(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>
                    <strong className="text-[#14171A] font-semibold block">
                      Exibir data, elegíveis e faixa no rodapé
                    </strong>
                    Reforça a transparência do sorteio para os participantes.
                  </span>
                </label>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="rounded-2xl border border-[#E6E4DD] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-700 shrink-0" />
                <h2 className="text-sm font-bold text-[#14171A]">
                  Publicar ou enviar resultado
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={handleNativeShare}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors min-h-[46px]"
                >
                  <Share2 className="h-4 w-4" />
                  {busyAction === 'share'
                    ? 'Preparando...'
                    : 'Compartilhar imagem'}
                </button>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14171A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#272B30] transition-colors min-h-[46px]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar no WhatsApp
                </a>
              </div>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={handleDownloadPng}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8D5CD] bg-[#FAF9F6] px-4 py-2.5 text-sm font-semibold text-[#14171A] hover:bg-[#F3F1EC] disabled:opacity-60 transition-colors min-h-[44px]"
              >
                <Download className="h-4 w-4 text-emerald-700" />
                Baixar imagem PNG ({spec.width}×{spec.height}px)
              </button>
            </div>

            {/* Ready Caption Box */}
            <div className="rounded-2xl border border-[#E6E4DD] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#14171A]">
                    Legenda pronta para postagem
                  </h2>
                  <p className="text-xs text-[#64686E]">
                    Edite se desejar ou copie para Instagram, Facebook ou grupo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8D5CD] bg-white px-3.5 py-2 text-xs font-semibold text-[#14171A] hover:bg-[#F3F1EC] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      Copiada
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#64686E]" />
                      Copiar legenda
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={7}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                aria-label="Legenda do resultado para redes sociais"
                className="w-full rounded-xl border border-[#D8D5CD] bg-[#FAF9F6] p-3.5 text-xs leading-relaxed text-[#14171A] focus:border-emerald-700 focus:bg-white focus:outline-none"
              />

              <p className="flex items-center gap-1.5 text-[11px] text-[#64686E]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>
                  O número sorteado e os elegíveis permanecem salvos no
                  histórico da rifa.
                </span>
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
