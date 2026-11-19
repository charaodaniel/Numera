import {
  formatTicketNumber,
  type Rifa,
  type Sorteio,
} from '../types/numera';

export type ShareCardFormat = 'story' | 'portrait' | 'square';
export type ShareCardTheme =
  | 'claro'
  | 'obsidiana'
  | 'esmeralda'
  | 'marinho'
  | 'ouro'
  | 'bordo';
export type ShareCardTemplate =
  | 'editorial'
  | 'bilhete'
  | 'holofote'
  | 'cartaz';

export type ShareLogoMode = 'numera' | 'custom' | 'none';
export type ShareLogoPlacement = 'header' | 'footer';

export interface ShareBrandConfig {
  showLogo: boolean;
  logoMode: ShareLogoMode;
  customLogoDataUrl: string | null;
  brandName: string;
  subtitle: string;
  logoPlacement: ShareLogoPlacement;
}

export interface ShareCardOptions {
  format: ShareCardFormat;
  theme: ShareCardTheme;
  template: ShareCardTemplate;
  brand: ShareBrandConfig;
  hidePhone: boolean;
  showAuditMeta: boolean;
}

export const DEFAULT_BRAND_CONFIG: ShareBrandConfig = {
  showLogo: true,
  logoMode: 'numera',
  customLogoDataUrl: null,
  brandName: 'Numera',
  subtitle: 'Resultado oficial',
  logoPlacement: 'header',
};

export const FORMAT_SPECS: Record<
  ShareCardFormat,
  { label: string; ratioLabel: string; width: number; height: number }
> = {
  story: {
    label: 'Stories / Status',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
  },
  portrait: {
    label: 'Feed Retrato',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
  },
  square: {
    label: 'Quadrado',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
  },
};

export const TEMPLATE_SPECS: {
  id: ShareCardTemplate;
  label: string;
  description: string;
}[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Moldura clássica e limpa',
  },
  {
    id: 'bilhete',
    label: 'Bilhete',
    description: 'Picote de talão moderno',
  },
  {
    id: 'holofote',
    label: 'Holofote',
    description: 'Tipografia ampla sem bordas',
  },
  {
    id: 'cartaz',
    label: 'Cartaz',
    description: 'Faixa superior em destaque',
  },
];

export function formatDrawDatePt(sorteio: Sorteio): string {
  try {
    const date = sorteio.realizadoEm?.toDate
      ? sorteio.realizadoEm.toDate()
      : new Date();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
  }
}

export function buildSorteioCaption(
  rifa: Rifa,
  sorteio: Sorteio,
  hidePhone: boolean,
  brandName?: string
): string {
  const dateStr = formatDrawDatePt(sorteio);
  const orgLabel = (brandName || '').trim() || 'Numera';
  const lines: string[] = [
    `RESULTADO OFICIAL DO SORTEIO`,
    `${rifa.titulo}`,
    `Prêmio: ${rifa.premio}`,
    '',
  ];

  sorteio.resultados.forEach((res) => {
    const phonePart =
      !hidePhone && res.participanteTelefone
        ? ` (${res.participanteTelefone})`
        : '';
    lines.push(
      `${res.ordem}º lugar · Nº #${res.numero} — ${res.participanteNome}${phonePart}`
    );
    if (res.premioDescricao && res.premioDescricao !== rifa.premio) {
      lines.push(`Prêmio: ${res.premioDescricao}`);
    }
  });

  lines.push(
    '',
    `Realizado em ${dateStr} · ${sorteio.totalElegiveis} números elegíveis (faixa ${formatTicketNumber(rifa.numeroInicial, rifa.digitos)} a ${formatTicketNumber(rifa.numeroFinal, rifa.digitos)}).`,
    `Organizado com ${orgLabel}.`
  );

  return lines.join('\n');
}

interface ThemePalette {
  bg: string;
  card: string;
  cardBorder: string;
  headerBand: string;
  ink: string;
  muted: string;
  subtle: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  ticketBg: string;
  ticketBorder: string;
}

const PALETTES: Record<ShareCardTheme, ThemePalette> = {
  claro: {
    bg: '#FAF9F6',
    card: '#FFFFFF',
    cardBorder: '#E6E4DD',
    headerBand: '#F3F1EC',
    ink: '#14171A',
    muted: '#4B5563',
    subtle: '#64686E',
    accent: '#047857',
    accentSoft: '#ECFDF5',
    accentInk: '#065F46',
    ticketBg: '#FAF9F6',
    ticketBorder: '#D8D5CD',
  },
  obsidiana: {
    bg: '#111417',
    card: '#191D22',
    cardBorder: '#2A3037',
    headerBand: '#14171A',
    ink: '#FAF9F6',
    muted: '#CBD5E1',
    subtle: '#94A3B8',
    accent: '#10B981',
    accentSoft: '#064E3B',
    accentInk: '#A7F3D0',
    ticketBg: '#14171A',
    ticketBorder: '#2E363E',
  },
  esmeralda: {
    bg: '#064E3B',
    card: '#065F46',
    cardBorder: '#0D7A5F',
    headerBand: '#044232',
    ink: '#FFFFFF',
    muted: '#D1FAE5',
    subtle: '#A7F3D0',
    accent: '#34D399',
    accentSoft: '#047857',
    accentInk: '#ECFDF5',
    ticketBg: '#044232',
    ticketBorder: '#0F8A6B',
  },
  marinho: {
    bg: '#0F172A',
    card: '#1E293B',
    cardBorder: '#334155',
    headerBand: '#0B1221',
    ink: '#F8FAFC',
    muted: '#CBD5E1',
    subtle: '#94A3B8',
    accent: '#38BDF8',
    accentSoft: '#0C4A6E',
    accentInk: '#BAE6FD',
    ticketBg: '#0F172A',
    ticketBorder: '#334155',
  },
  ouro: {
    bg: '#1C1917',
    card: '#292524',
    cardBorder: '#44403C',
    headerBand: '#171412',
    ink: '#FAF7F2',
    muted: '#E7E5E4',
    subtle: '#D6D3D1',
    accent: '#F59E0B',
    accentSoft: '#451A03',
    accentInk: '#FDE68A',
    ticketBg: '#1C1917',
    ticketBorder: '#57534E',
  },
  bordo: {
    bg: '#3B0A18',
    card: '#4C0D20',
    cardBorder: '#701A33',
    headerBand: '#2D0712',
    ink: '#FFF8F9',
    muted: '#FFE4E6',
    subtle: '#FECDD3',
    accent: '#FB7185',
    accentSoft: '#881337',
    accentInk: '#FFE4E6',
    ticketBg: '#360916',
    ticketBorder: '#881337',
  },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawTopRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(' ');
        let clipped = rest;
        while (
          clipped.length > 1 &&
          ctx.measureText(`${clipped}…`).width > maxWidth
        ) {
          clipped = clipped.slice(0, -1).trimEnd();
        }
        lines.push(clipped === rest ? rest : `${clipped}…`);
        return lines;
      }
    }
  }

  lines.push(current);
  return lines.slice(0, maxLines);
}

function drawNumeraVectorMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const scale = size / 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Outer badge
  drawRoundedRect(ctx, 0, 0, 512, 512, 112);
  ctx.fillStyle = '#0F172A';
  ctx.fill();

  // Emerald ticket
  drawRoundedRect(ctx, 96, 132, 320, 248, 36);
  ctx.fillStyle = '#059669';
  ctx.fill();

  // Ticket side notches
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(96, 256, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(416, 256, 28, 0, Math.PI * 2);
  ctx.fill();

  // 3x2 grid cells
  const cells = [
    { cx: 164, cy: 192, alpha: 1 },
    { cx: 230, cy: 192, alpha: 0.72 },
    { cx: 296, cy: 192, alpha: 0.4 },
    { cx: 164, cy: 258, alpha: 0.4 },
    { cx: 230, cy: 258, alpha: 1 },
    { cx: 296, cy: 258, alpha: 0.85 },
  ];
  for (const c of cells) {
    ctx.fillStyle = `rgba(236, 253, 245, ${c.alpha})`;
    drawRoundedRect(ctx, c.cx, c.cy, 52, 52, 10);
    ctx.fill();
  }

  ctx.restore();
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawBrandLockup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: ThemePalette,
  brand: ShareBrandConfig,
  customImg: HTMLImageElement | null,
  compact = false
) {
  if (!brand.showLogo) return;
  const iconSize = compact ? 38 : 48;
  let textStartX = x;

  if (brand.logoMode === 'custom' && customImg) {
    ctx.save();
    drawRoundedRect(ctx, x, y, iconSize, iconSize, 10);
    ctx.clip();
    const ratio = Math.min(
      iconSize / customImg.width,
      iconSize / customImg.height
    );
    const dw = customImg.width * ratio;
    const dh = customImg.height * ratio;
    ctx.drawImage(
      customImg,
      x + (iconSize - dw) / 2,
      y + (iconSize - dh) / 2,
      dw,
      dh
    );
    ctx.restore();
    textStartX = x + iconSize + 14;
  } else if (
    brand.logoMode === 'numera' ||
    (brand.logoMode === 'custom' && !customImg)
  ) {
    drawNumeraVectorMark(ctx, x, y, iconSize);
    textStartX = x + iconSize + 14;
  }

  const label = brand.brandName.trim();
  if (label) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.ink;
    ctx.font = compact
      ? '800 26px "Plus Jakarta Sans", system-ui, sans-serif'
      : '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(label, textStartX, y + iconSize / 2);
    ctx.textBaseline = 'top';
  }
}

export async function renderSorteioPosterBlob(
  rifa: Rifa,
  sorteio: Sorteio,
  options: ShareCardOptions
): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback fonts
    }
  }

  let customImg: HTMLImageElement | null = null;
  if (
    options.brand.showLogo &&
    options.brand.logoMode === 'custom' &&
    options.brand.customLogoDataUrl
  ) {
    customImg = await loadImageElement(options.brand.customLogoDataUrl);
  }

  const spec = FORMAT_SPECS[options.format];
  const palette = PALETTES[options.theme];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível inicializar o gerador de imagem.');
  }

  const W = spec.width;
  const H = spec.height;
  const isStory = options.format === 'story';
  const isSquare = options.format === 'square';
  const template = options.template;

  // Base Canvas Background
  ctx.fillStyle = template === 'holofote' ? palette.card : palette.bg;
  ctx.fillRect(0, 0, W, H);

  if (template !== 'holofote') {
    ctx.fillStyle =
      options.theme === 'claro'
        ? 'rgba(20, 23, 26, 0.045)'
        : 'rgba(255, 255, 255, 0.05)';
    const step = 36;
    for (let gx = 48; gx < W - 24; gx += step) {
      for (let gy = 48; gy < H - 24; gy += step) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Geometry per template
  const padX = template === 'holofote' ? 0 : 72;
  const padY = template === 'holofote' ? 0 : isStory ? 110 : 68;
  const frameW = W - padX * 2;
  const frameH = H - padY * 2;
  const innerPad = template === 'holofote' ? 84 : 64;
  const contentX = padX + innerPad;
  const contentW = frameW - innerPad * 2;

  if (template === 'holofote') {
    // Top Accent Bar
    ctx.fillStyle = palette.accent;
    ctx.fillRect(0, 0, W, 14);
  } else {
    drawRoundedRect(ctx, padX, padY, frameW, frameH, 36);
    ctx.fillStyle = palette.card;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.cardBorder;
    ctx.stroke();
  }

  let cursorY = padY + innerPad;
  const subtitleText = options.brand.subtitle.trim() || 'Resultado oficial';

  if (template === 'cartaz') {
    // Top tinted band
    const bandH = isStory ? 350 : isSquare ? 270 : 300;
    drawTopRoundedRect(ctx, padX + 1, padY + 1, frameW - 2, bandH, 35);
    ctx.fillStyle = palette.headerBand;
    ctx.fill();

    // Accent strip separating header band
    ctx.fillStyle = palette.accent;
    ctx.fillRect(padX + 1, padY + bandH, frameW - 2, 4);

    // Top lockup inside header band
    if (options.brand.showLogo && options.brand.logoPlacement === 'header') {
      drawBrandLockup(
        ctx,
        contentX,
        cursorY,
        palette,
        options.brand,
        customImg
      );
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = palette.accentInk;
    ctx.font = '700 22px "DM Sans", system-ui, sans-serif';
    ctx.fillText(subtitleText, contentX + contentW, cursorY + 11);
    ctx.textAlign = 'left';

    cursorY += 76;

    // Title & prize inside band
    ctx.fillStyle = palette.ink;
    ctx.font = isSquare
      ? '800 42px "Plus Jakarta Sans", system-ui, sans-serif'
      : '800 48px "Plus Jakarta Sans", system-ui, sans-serif';
    const titleLines = wrapTextLines(ctx, rifa.titulo, contentW, 2);
    const titleLineH = isSquare ? 50 : 56;
    for (const line of titleLines) {
      ctx.fillText(line, contentX, cursorY);
      cursorY += titleLineH;
    }

    cursorY += 6;
    ctx.fillStyle = palette.muted;
    ctx.font = '500 24px "DM Sans", system-ui, sans-serif';
    const premioLines = wrapTextLines(
      ctx,
      `Prêmio principal: ${rifa.premio}`,
      contentW,
      1
    );
    for (const line of premioLines) {
      ctx.fillText(line, contentX, cursorY);
    }

    cursorY = padY + bandH + (isStory ? 44 : 28);
  } else {
    // Editorial, Bilhete, Holofote Top Bar
    ctx.textBaseline = 'top';
    if (options.brand.showLogo && options.brand.logoPlacement === 'header') {
      drawBrandLockup(
        ctx,
        contentX,
        cursorY,
        palette,
        options.brand,
        customImg
      );
    } else {
      ctx.fillStyle = palette.accentInk;
      ctx.font = '700 24px "DM Sans", system-ui, sans-serif';
      ctx.fillText(subtitleText, contentX, cursorY + 10);
    }

    if (options.brand.showLogo && options.brand.logoPlacement === 'header') {
      ctx.textAlign = 'right';
      ctx.fillStyle = palette.accentInk;
      ctx.font = '600 22px "DM Sans", system-ui, sans-serif';
      ctx.fillText(subtitleText, contentX + contentW, cursorY + 12);
      ctx.textAlign = 'left';
    }

    cursorY += 68;

    if (template === 'bilhete') {
      // Perforated ticket line + side punch-out circles
      const notchY = cursorY;
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padX + 26, notchY);
      ctx.lineTo(padX + frameW - 26, notchY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = palette.bg;
      ctx.beginPath();
      ctx.arc(padX, notchY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(padX + frameW, notchY, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(padX, notchY, 22, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(padX + frameW, notchY, 22, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = palette.cardBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentX, cursorY);
      ctx.lineTo(contentX + contentW, cursorY);
      ctx.stroke();
    }

    cursorY += isStory ? 44 : 28;

    // Raffle Title & Prize
    ctx.fillStyle = palette.ink;
    ctx.font = isSquare
      ? '800 44px "Plus Jakarta Sans", system-ui, sans-serif'
      : '800 50px "Plus Jakarta Sans", system-ui, sans-serif';
    const titleLines = wrapTextLines(ctx, rifa.titulo, contentW, 2);
    const titleLineH = isSquare ? 54 : 60;
    for (const line of titleLines) {
      ctx.fillText(line, contentX, cursorY);
      cursorY += titleLineH;
    }

    cursorY += 8;
    ctx.fillStyle = palette.muted;
    ctx.font = '500 26px "DM Sans", system-ui, sans-serif';
    const premioLines = wrapTextLines(
      ctx,
      `Prêmio principal: ${rifa.premio}`,
      contentW,
      2
    );
    for (const line of premioLines) {
      ctx.fillText(line, contentX, cursorY);
      cursorY += 34;
    }

    cursorY += isStory ? 40 : 24;
  }

  // Footer Reserve calculation
  const hasFooterLogo =
    options.brand.showLogo && options.brand.logoPlacement === 'footer';
  const footerReserve =
    options.showAuditMeta && hasFooterLogo
      ? 164
      : options.showAuditMeta
        ? 136
        : hasFooterLogo
          ? 110
          : 82;
  const availableH = padY + frameH - innerPad - footerReserve - cursorY;
  const winners = sorteio.resultados;

  if (winners.length === 1) {
    const win = winners[0];
    const boxH = Math.min(availableH, isStory ? 740 : isSquare ? 410 : 520);
    const boxY = cursorY + Math.max(0, (availableH - boxH) / 2);

    if (template === 'holofote') {
      // Minimalist full-width spotlight without nested box border
      const centerX = contentX + contentW / 2;
      ctx.textAlign = 'center';

      const labelY = boxY + (isSquare ? 36 : 64);
      ctx.fillStyle = palette.accentInk;
      ctx.font = '700 25px "DM Sans", system-ui, sans-serif';
      ctx.fillText(
        `1º lugar · ${(win.premioDescricao || rifa.premio).slice(0, 42)}`,
        centerX,
        labelY
      );

      const numY = labelY + (isSquare ? 58 : 88);
      ctx.fillStyle = palette.ink;
      ctx.font = isSquare
        ? '800 156px "JetBrains Mono", monospace'
        : '800 184px "JetBrains Mono", monospace';
      ctx.fillText(`#${win.numero}`, centerX, numY);

      const nameY = numY + (isSquare ? 182 : 218);
      ctx.fillStyle = palette.ink;
      ctx.font = '700 44px "Plus Jakarta Sans", system-ui, sans-serif';
      const nameLines = wrapTextLines(
        ctx,
        win.participanteNome,
        contentW - 40,
        2
      );
      nameLines.forEach((line, i) => {
        ctx.fillText(line, centerX, nameY + i * 52);
      });

      if (!options.hidePhone && win.participanteTelefone) {
        const phoneY = nameY + nameLines.length * 52 + 16;
        ctx.fillStyle = palette.subtle;
        ctx.font = '500 24px "JetBrains Mono", monospace';
        ctx.fillText(win.participanteTelefone, centerX, phoneY);
      }
      ctx.textAlign = 'left';
    } else {
      drawRoundedRect(ctx, contentX, boxY, contentW, boxH, 28);
      ctx.fillStyle = palette.ticketBg;
      ctx.fill();
      ctx.lineWidth = template === 'bilhete' ? 3 : 2;
      ctx.strokeStyle =
        template === 'bilhete' ? palette.accent : palette.ticketBorder;
      ctx.stroke();

      if (template === 'bilhete') {
        // Double inner border stub aesthetic
        drawRoundedRect(
          ctx,
          contentX + 12,
          boxY + 12,
          contentW - 24,
          boxH - 24,
          20
        );
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = palette.cardBorder;
        ctx.stroke();
      }

      const centerX = contentX + contentW / 2;
      ctx.textAlign = 'center';

      const labelY = boxY + (isSquare ? 42 : 70);
      ctx.fillStyle = palette.accentInk;
      ctx.font = '700 24px "DM Sans", system-ui, sans-serif';
      ctx.fillText(
        `1º lugar · ${(win.premioDescricao || rifa.premio).slice(0, 40)}`,
        centerX,
        labelY
      );

      const numY = labelY + (isSquare ? 54 : 82);
      ctx.fillStyle = palette.ink;
      ctx.font = isSquare
        ? '800 124px "JetBrains Mono", monospace'
        : '800 152px "JetBrains Mono", monospace';
      ctx.fillText(`#${win.numero}`, centerX, numY);

      const nameY = numY + (isSquare ? 152 : 188);
      ctx.fillStyle = palette.ink;
      ctx.font = '700 40px "Plus Jakarta Sans", system-ui, sans-serif';
      const nameLines = wrapTextLines(
        ctx,
        win.participanteNome,
        contentW - 80,
        2
      );
      nameLines.forEach((line, i) => {
        ctx.fillText(line, centerX, nameY + i * 48);
      });

      if (!options.hidePhone && win.participanteTelefone) {
        const phoneY = nameY + nameLines.length * 48 + 16;
        ctx.fillStyle = palette.subtle;
        ctx.font = '500 24px "JetBrains Mono", monospace';
        ctx.fillText(win.participanteTelefone, centerX, phoneY);
      }

      ctx.textAlign = 'left';
    }
  } else {
    const maxVisible = isStory ? 5 : isSquare ? 3 : 4;
    const displayed = winners.slice(0, maxVisible);
    const gap = 16;
    const rowH = Math.min(
      144,
      Math.floor((availableH - gap * (displayed.length - 1)) / displayed.length)
    );

    displayed.forEach((win, idx) => {
      const rowY = cursorY + idx * (rowH + gap);
      drawRoundedRect(ctx, contentX, rowY, contentW, rowH, 22);
      ctx.fillStyle = idx === 0 ? palette.accentSoft : palette.ticketBg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle =
        idx === 0 ? palette.accent : palette.ticketBorder;
      ctx.stroke();

      const numBlockW = 210;
      ctx.fillStyle = palette.ink;
      ctx.font = '800 44px "JetBrains Mono", monospace';
      ctx.fillText(`#${win.numero}`, contentX + 28, rowY + rowH / 2 - 24);

      const infoX = contentX + numBlockW;
      const infoW = contentW - numBlockW - 28;
      ctx.fillStyle = idx === 0 ? palette.accentInk : palette.subtle;
      ctx.font = '600 20px "DM Sans", system-ui, sans-serif';
      const prizeTag = wrapTextLines(
        ctx,
        `${win.ordem}º lugar · ${win.premioDescricao}`,
        infoW,
        1
      )[0];
      ctx.fillText(prizeTag || `${win.ordem}º lugar`, infoX, rowY + rowH / 2 - 34);

      ctx.fillStyle = palette.ink;
      ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
      const winnerName = wrapTextLines(ctx, win.participanteNome, infoW, 1)[0];
      ctx.fillText(winnerName || win.participanteNome, infoX, rowY + rowH / 2 - 2);

      if (!options.hidePhone && win.participanteTelefone && rowH >= 120) {
        ctx.fillStyle = palette.subtle;
        ctx.font = '500 18px "JetBrains Mono", monospace';
        ctx.fillText(win.participanteTelefone, infoX, rowY + rowH / 2 + 34);
      }
    });

    if (winners.length > maxVisible) {
      const moreY = cursorY + displayed.length * (rowH + gap) + 6;
      ctx.fillStyle = palette.subtle;
      ctx.font = '600 22px "DM Sans", system-ui, sans-serif';
      ctx.fillText(
        `+ ${winners.length - maxVisible} outro(s) ganhador(es) no registro completo`,
        contentX,
        moreY
      );
    }
  }

  // Footer
  const footerLineY = padY + frameH - innerPad - (footerReserve - 24);
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, footerLineY);
  ctx.lineTo(contentX + contentW, footerLineY);
  ctx.stroke();

  const footerTopY = footerLineY + 22;

  if (hasFooterLogo) {
    drawBrandLockup(
      ctx,
      contentX,
      footerTopY,
      palette,
      options.brand,
      customImg,
      true
    );
  }

  const metaStartY =
    hasFooterLogo && options.showAuditMeta ? footerTopY + 54 : footerTopY;

  if (options.showAuditMeta) {
    const dateStr = formatDrawDatePt(sorteio);
    const rangeStr = `${formatTicketNumber(rifa.numeroInicial, rifa.digitos)}–${formatTicketNumber(rifa.numeroFinal, rifa.digitos)}`;

    ctx.fillStyle = palette.muted;
    ctx.font = '500 21px "JetBrains Mono", monospace';
    ctx.fillText(
      `${dateStr} · ${sorteio.totalElegiveis} elegíveis · Faixa ${rangeStr}`,
      contentX,
      metaStartY
    );

    ctx.fillStyle = palette.subtle;
    ctx.font = '500 19px "DM Sans", system-ui, sans-serif';
    const orgFooter = options.brand.brandName.trim() || 'Numera';
    ctx.fillText(
      `Sorteio por ${sorteio.realizadoPorNome} · Registrado via ${orgFooter}`,
      contentX,
      metaStartY + 32
    );
  } else if (!hasFooterLogo) {
    const orgFooter = options.brand.brandName.trim() || 'Numera';
    ctx.fillStyle = palette.subtle;
    ctx.font = '500 20px "DM Sans", system-ui, sans-serif';
    ctx.fillText(
      `Organização centralizada de rifas · ${orgFooter}`,
      contentX,
      footerTopY
    );
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar arquivo PNG do resultado.'));
      },
      'image/png',
      1
    );
  });
}
