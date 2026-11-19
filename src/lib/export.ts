import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type {
  Atribuicao,
  Evento,
  Numero,
  Participante,
  Rifa,
  Sorteio,
} from '../types/numera';
import {
  formatCurrencyBrl,
  formatTicketNumber,
  formatTimestampPt,
  getNumberStatusLabel,
  getStatusLabel,
} from '../types/numera';
import { getRifaPalette } from './rifaPalettes';

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[";\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getRifaSlug(rifa: Rifa): string {
  return rifa.titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [4, 120, 87];
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return [4, 120, 87];
  return [r, g, b];
}

export function exportRifaCsv(
  rifa: Rifa,
  numeros: Numero[],
  participantes: Participante[]
): void {
  const participanteMap = new Map(participantes.map((p) => [p.id, p]));
  const headers = [
    'Numero',
    'Situacao',
    'Participante',
    'Telefone',
    'WhatsApp',
    'Responsavel_Atribuicao',
    'Data_Atribuicao',
    'Data_Confirmacao',
  ];

  const rows = [...numeros]
    .sort((a, b) => a.indice - b.indice)
    .map((num) => {
      const part = num.participanteId ? participanteMap.get(num.participanteId) : undefined;
      return [
        num.valor,
        getNumberStatusLabel(num.status),
        part?.nome ?? num.participanteNome ?? '',
        part?.telefone ?? '',
        part?.whatsapp ?? '',
        num.assignedByName ?? '',
        formatTimestampPt(num.assignedAt),
        formatTimestampPt(num.confirmedAt),
      ]
        .map(escapeCsvCell)
        .join(';');
    });

  const bom = '\uFEFF';
  const csv = `${bom}${headers.join(';')}\n${rows.join('\n')}`;
  const slug = getRifaSlug(rifa);
  triggerDownload(`numera-${slug || rifa.id}-numeros.csv`, csv, 'text/csv;charset=utf-8');
}

export function exportRifaJson(params: {
  rifa: Rifa;
  numeros: Numero[];
  participantes: Participante[];
  atribuicoes: Atribuicao[];
  sorteios: Sorteio[];
  eventos: Evento[];
}): void {
  const { rifa, numeros, participantes, atribuicoes, sorteios, eventos } = params;
  const payload = {
    exportadoEm: new Date().toISOString(),
    plataforma: 'Numera',
    rifa: {
      id: rifa.id,
      titulo: rifa.titulo,
      descricao: rifa.descricao ?? '',
      premio: rifa.premio,
      status: getStatusLabel(rifa.status),
      faixa: `${rifa.numeroInicial}..${rifa.numeroFinal}`,
      digitos: rifa.digitos,
      regraElegibilidade: rifa.regraElegibilidade,
      dataPrevista: rifa.dataPrevista ?? null,
      valorNumero: rifa.valorNumero ?? 0,
      contagens: {
        total: rifa.totalNumeros,
        disponiveis: rifa.contagemDisponiveis,
        reservados: rifa.contagemReservados,
        atribuidos: rifa.contagemAtribuidos,
        confirmados: rifa.contagemConfirmados,
      },
    },
    participantes: participantes.map((p) => ({
      id: p.id,
      nome: p.nome,
      telefone: p.telefone,
      whatsapp: p.whatsapp,
      observacoes: p.observacoes,
    })),
    numeros: [...numeros]
      .sort((a, b) => a.indice - b.indice)
      .map((n) => ({
        valor: n.valor,
        status: n.status,
        participanteId: n.participanteId ?? null,
        participanteNome: n.participanteNome ?? null,
        assignedByName: n.assignedByName ?? null,
        assignedAt: n.assignedAt ? n.assignedAt.toDate().toISOString() : null,
        confirmedAt: n.confirmedAt ? n.confirmedAt.toDate().toISOString() : null,
      })),
    atribuicoes: atribuicoes.map((a) => ({
      id: a.id,
      participanteNome: a.participanteNome,
      numeros: a.numeros,
      status: a.status,
      createdByName: a.createdByName,
      createdAt: a.createdAt ? a.createdAt.toDate().toISOString() : null,
    })),
    sorteios: sorteios.map((s) => ({
      id: s.id,
      regraElegibilidade: s.regraElegibilidade,
      totalElegiveis: s.totalElegiveis,
      resultados: s.resultados,
      realizadoPorNome: s.realizadoPorNome,
      realizadoEm: s.realizadoEm ? s.realizadoEm.toDate().toISOString() : null,
    })),
    eventos: eventos.map((e) => ({
      id: e.id,
      type: e.type,
      actorName: e.actorName,
      summary: e.summary,
      createdAt: e.createdAt ? e.createdAt.toDate().toISOString() : null,
    })),
  };

  const slug = getRifaSlug(rifa);
  triggerDownload(
    `numera-${slug || rifa.id}-auditoria.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8'
  );
}

interface ParticipantPaymentRow {
  nome: string;
  contato: string;
  numerosTexto: string;
  qtdResumo: string;
  statusPagamento: string;
  statusCategory: 'pago' | 'parcial' | 'pendente' | 'reservado' | 'sem_numeros';
  valoresTexto: string;
}

export function exportParticipantesPagamentosPdf(
  rifa: Rifa,
  numeros: Numero[],
  participantes: Participante[]
): void {
  const palette = getRifaPalette(rifa.corPrimaria);
  const accentRgb = hexToRgb(palette.hex);
  const valorUnitario =
    typeof rifa.valorNumero === 'number' && rifa.valorNumero > 0
      ? rifa.valorNumero
      : 0;

  // Group all occupied numbers by participanteId (keeping fallback entries if a participant record is absent)
  const numsByParticipante = new Map<string, Numero[]>();
  const orphanNames = new Map<string, string>();
  for (const num of numeros) {
    if (num.status === 'disponivel' || !num.participanteId) continue;
    const list = numsByParticipante.get(num.participanteId) || [];
    list.push(num);
    numsByParticipante.set(num.participanteId, list);
    if (num.participanteNome && !orphanNames.has(num.participanteId)) {
      orphanNames.set(num.participanteId, num.participanteNome);
    }
  }

  const knownIds = new Set(participantes.map((p) => p.id));
  const combinedParticipants: {
    id: string;
    nome: string;
    telefone: string;
    whatsapp: string;
    observacoes: string;
  }[] = participantes.map((p) => ({
    id: p.id,
    nome: p.nome,
    telefone: p.telefone,
    whatsapp: p.whatsapp,
    observacoes: p.observacoes,
  }));

  for (const [pid, list] of numsByParticipante.entries()) {
    if (!knownIds.has(pid) && list.length > 0) {
      combinedParticipants.push({
        id: pid,
        nome: orphanNames.get(pid) || 'Participante vinculado',
        telefone: '',
        whatsapp: '',
        observacoes: '',
      });
    }
  }

  combinedParticipants.sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );

  let totalParticipantesPagos = 0;
  let totalParticipantesPendentes = 0;
  let totalParticipantesSemNumeros = 0;
  let totalConfirmados = 0;
  let totalAtribuidos = 0;
  let totalReservados = 0;

  const rows: ParticipantPaymentRow[] = combinedParticipants.map((p) => {
    const pNums = [...(numsByParticipante.get(p.id) || [])].sort(
      (a, b) => a.indice - b.indice
    );

    const confNums = pNums.filter((n) => n.status === 'confirmado');
    const atrNums = pNums.filter((n) => n.status === 'atribuido');
    const resNums = pNums.filter((n) => n.status === 'reservado');

    totalConfirmados += confNums.length;
    totalAtribuidos += atrNums.length;
    totalReservados += resNums.length;

    const tel = p.telefone.trim();
    const wa = p.whatsapp.trim();
    let contato = 'Não informado';
    if (tel && wa) {
      contato = tel === wa ? `Tel/WA: ${tel}` : `Tel: ${tel}\nWA: ${wa}`;
    } else if (tel) {
      contato = `Tel: ${tel}`;
    } else if (wa) {
      contato = `WA: ${wa}`;
    }

    const numerosTexto =
      pNums.length > 0 ? pNums.map((n) => n.valor).join(', ') : 'Nenhum número';

    let statusPagamento = 'Sem números';
    let statusCategory: ParticipantPaymentRow['statusCategory'] = 'sem_numeros';

    if (pNums.length === 0) {
      totalParticipantesSemNumeros += 1;
    } else if (confNums.length === pNums.length) {
      statusPagamento = 'Pago (Confirmado)';
      statusCategory = 'pago';
      totalParticipantesPagos += 1;
    } else if (confNums.length > 0) {
      const pendentesCount = atrNums.length + resNums.length;
      statusPagamento = `Parcial (${confNums.length} pago / ${pendentesCount} pend.)`;
      statusCategory = 'parcial';
      totalParticipantesPendentes += 1;
    } else if (atrNums.length > 0) {
      statusPagamento =
        resNums.length > 0
          ? `Pendente (${atrNums.length} atr. / ${resNums.length} res.)`
          : 'Pendente (Atribuído)';
      statusCategory = 'pendente';
      totalParticipantesPendentes += 1;
    } else {
      statusPagamento = 'Reservado';
      statusCategory = 'reservado';
      totalParticipantesPendentes += 1;
    }

    const qtdParts: string[] = [];
    if (confNums.length > 0) qtdParts.push(`${confNums.length} conf.`);
    if (atrNums.length > 0) qtdParts.push(`${atrNums.length} atr.`);
    if (resNums.length > 0) qtdParts.push(`${resNums.length} res.`);
    const qtdResumo =
      pNums.length === 0
        ? '0'
        : `${pNums.length} (${qtdParts.join(' / ')})`;

    let valoresTexto = '—';
    if (valorUnitario > 0 && pNums.length > 0) {
      const valorPago = confNums.length * valorUnitario;
      const valorPendente = (atrNums.length + resNums.length) * valorUnitario;
      if (valorPendente === 0) {
        valoresTexto = `Pago: ${formatCurrencyBrl(valorPago)}`;
      } else if (valorPago === 0) {
        valoresTexto = `Pend.: ${formatCurrencyBrl(valorPendente)}`;
      } else {
        valoresTexto = `Pago: ${formatCurrencyBrl(valorPago)}\nPend.: ${formatCurrencyBrl(valorPendente)}`;
      }
    }

    return {
      nome: p.observacoes.trim()
        ? `${p.nome}\nObs.: ${p.observacoes.trim().slice(0, 70)}`
        : p.nome,
      contato,
      numerosTexto,
      qtdResumo,
      statusPagamento,
      statusCategory,
      valoresTexto,
    };
  });

  // Fallback to rifa aggregate counts if numbers collection hasn't finished loading
  if (numeros.length === 0) {
    totalConfirmados = rifa.contagemConfirmados;
    totalAtribuidos = rifa.contagemAtribuidos;
    totalReservados = rifa.contagemReservados;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Top accent bar matching raffle palette
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Header metadata
  const nowStr = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.text('NUMERA | RELATÓRIO DE PARTICIPANTES E PAGAMENTOS', marginX, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 104, 110);
  doc.text(`Emitido em ${nowStr}`, pageWidth - marginX, 12, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 23, 26);
  const titleLines = doc.splitTextToSize(rifa.titulo, contentWidth);
  doc.text(titleLines, marginX, 19);
  let cursorY = 19 + titleLines.length * 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(75, 85, 99);
  const rangeLabel = `${formatTicketNumber(rifa.numeroInicial, rifa.digitos)} a ${formatTicketNumber(rifa.numeroFinal, rifa.digitos)}`;
  const infoText = `Prêmio: ${rifa.premio}  |  Situação: ${getStatusLabel(rifa.status)}  |  Faixa: ${rangeLabel} (${rifa.totalNumeros} números)`;
  const infoLines = doc.splitTextToSize(infoText, contentWidth);
  doc.text(infoLines, marginX, cursorY);
  cursorY += infoLines.length * 4.5 + 3;

  // Summary box
  const summaryHeight = 19;
  doc.setFillColor(250, 249, 246);
  doc.setDrawColor(230, 228, 221);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cursorY, contentWidth, summaryHeight, 2, 2, 'FD');

  const colW = contentWidth / 4;
  const totalArrecadado = totalConfirmados * valorUnitario;
  const totalPendente = (totalAtribuidos + totalReservados) * valorUnitario;
  const occupiedCount = totalConfirmados + totalAtribuidos + totalReservados;
  const occupiedPct =
    rifa.totalNumeros > 0
      ? Math.round((occupiedCount / rifa.totalNumeros) * 100)
      : 0;

  const summaryItems: { label: string; value: string; sub: string }[] = [
    {
      label: 'Participantes',
      value: String(combinedParticipants.length),
      sub: `${totalParticipantesPagos} pago(s) | ${totalParticipantesPendentes} pend.`,
    },
    {
      label: 'Números confirmados',
      value: `${totalConfirmados} / ${rifa.totalNumeros}`,
      sub: `${totalAtribuidos} atribuído(s) | ${totalReservados} res.`,
    },
    valorUnitario > 0
      ? {
          label: 'Total arrecadado',
          value: formatCurrencyBrl(totalArrecadado),
          sub: `Valor unit.: ${formatCurrencyBrl(valorUnitario)}`,
        }
      : {
          label: 'Ocupação da rifa',
          value: `${occupiedPct}%`,
          sub: `${rifa.contagemDisponiveis} disponível(is)`,
        },
    valorUnitario > 0
      ? {
          label: 'Saldo pendente',
          value: formatCurrencyBrl(totalPendente),
          sub: `${totalParticipantesSemNumeros} sem números`,
        }
      : {
          label: 'Sem números',
          value: String(totalParticipantesSemNumeros),
          sub: 'Aguardando atribuição',
        },
  ];

  summaryItems.forEach((item, idx) => {
    const x = marginX + colW * idx + 3.5;
    if (idx > 0) {
      doc.setDrawColor(230, 228, 221);
      doc.line(marginX + colW * idx, cursorY + 3, marginX + colW * idx, cursorY + summaryHeight - 3);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 104, 110);
    doc.text(item.label, x, cursorY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 23, 26);
    doc.text(item.value, x, cursorY + 11.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 104, 110);
    doc.text(item.sub, x, cursorY + 15.8);
  });

  cursorY += summaryHeight + 5;

  const headColumns =
    valorUnitario > 0
      ? [['Participante', 'Contato', 'Números', 'Qtd.', 'Status pagamento', 'Valores']]
      : [['Participante', 'Contato', 'Números', 'Qtd. / Situação', 'Status pagamento']];

  const bodyRows: RowInput[] =
    rows.length > 0
      ? rows.map((row) =>
          valorUnitario > 0
            ? [
                row.nome,
                row.contato,
                row.numerosTexto,
                row.qtdResumo,
                row.statusPagamento,
                row.valoresTexto,
              ]
            : [
                row.nome,
                row.contato,
                row.numerosTexto,
                row.qtdResumo,
                row.statusPagamento,
              ]
        )
      : [
          [
            {
              content: 'Nenhum participante cadastrado nesta rifa até o momento.',
              colSpan: valorUnitario > 0 ? 6 : 5,
              styles: {
                halign: 'center',
                textColor: [100, 104, 110],
              },
            },
          ],
        ];

  const statusColumnIndex = 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX, top: 14, bottom: 16 },
    head: headColumns,
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [20, 23, 26],
      lineColor: [230, 228, 221],
      lineWidth: 0.2,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: accentRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 249, 246],
    },
    columnStyles:
      valorUnitario > 0
        ? {
            0: { cellWidth: 38 },
            1: { cellWidth: 32 },
            2: { cellWidth: 34 },
            3: { cellWidth: 23 },
            4: { cellWidth: 28 },
            5: { cellWidth: 27 },
          }
        : {
            0: { cellWidth: 42 },
            1: { cellWidth: 36 },
            2: { cellWidth: 44 },
            3: { cellWidth: 28 },
            4: { cellWidth: 32 },
          },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === statusColumnIndex && rows[data.row.index]) {
        const cat = rows[data.row.index].statusCategory;
        data.cell.styles.fontStyle = 'bold';
        if (cat === 'pago') {
          data.cell.styles.textColor = [4, 120, 87];
        } else if (cat === 'parcial') {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (cat === 'pendente') {
          data.cell.styles.textColor = [3, 105, 161];
        } else if (cat === 'reservado') {
          data.cell.styles.textColor = [146, 64, 14];
        } else {
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.textColor = [107, 114, 128];
        }
      }
    },
  });

  // Render consistent page footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(230, 228, 221);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 104, 110);
    doc.text(`Numera | ${rifa.titulo}`, marginX, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, {
      align: 'right',
    });
  }

  const slug = getRifaSlug(rifa);
  doc.save(`numera-${slug || rifa.id}-participantes-pagamentos.pdf`);
}
