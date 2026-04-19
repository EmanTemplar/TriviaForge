/**
 * TriviaForge - PDF Export Service
 *
 * Generates richly formatted PDF session reports using pdfkit.
 * Structure:
 *   Page 1  - Executive summary: session info, podium (top 3), leaderboard, accuracy chart
 *   Page 2+ - Per-question breakdown: question text, image, choices, stats, player answer grid
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import sharp from 'sharp';

// ─── Brand & Palette ──────────────────────────────────────────────────────────

const BRAND = {
  primary: '#4F8EF7',    // TriviaForge blue
  gold:    '#F5C518',
  silver:  '#C0C0C0',
  bronze:  '#CD7F32',
  success: '#22C55E',
  danger:  '#EF4444',
  muted:   '#6B7280',
  border:  '#E5E7EB',
  bg:      '#F9FAFB',
  text:    '#111827',
  white:   '#FFFFFF',
};

const PAGE = { margin: 40, width: 595, height: 842 };  // A4 points
const CONTENT_W = PAGE.width - PAGE.margin * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function pct(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function accuracyColor(accuracy) {
  if (accuracy >= 75) return BRAND.success;
  if (accuracy >= 50) return '#F59E0B';
  return BRAND.danger;
}

/**
 * Fetch a remote image into a Buffer, following redirects with a 5-second timeout.
 * Returns raw bytes regardless of format — conversion happens in resolveImage.
 */
async function fetchImageBuffer(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

/**
 * Convert any image buffer to PNG using sharp.
 * Handles WebP, GIF, AVIF, TIFF, BMP etc. — anything sharp can read.
 * Returns the original buffer unchanged if it's already JPEG or PNG.
 */
async function toPdfCompatibleBuffer(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.format === 'jpeg' || meta.format === 'png') return buffer;
    return await sharp(buffer).png().toBuffer();
  } catch {
    return null;
  }
}

/**
 * Resolve a question imageUrl to a PDF-compatible Buffer.
 * Fetches remote URLs, reads local uploads, and converts any format to PNG via sharp.
 */
async function resolveImage(imageUrl) {
  if (!imageUrl) return null;
  try {
    let raw = null;
    if (imageUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', imageUrl);
      if (fs.existsSync(localPath)) raw = fs.readFileSync(localPath);
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      raw = await fetchImageBuffer(imageUrl);
    }
    if (!raw) return null;
    return await toPdfCompatibleBuffer(raw);
  } catch {
    return null;
  }
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

function drawRect(doc, x, y, w, h, color, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).fill(color).restore();
}

function drawBorder(doc, x, y, w, h, color, radius = 4) {
  doc.save().roundedRect(x, y, w, h, radius).stroke(color).restore();
}

/** Horizontal bar: background track + filled portion */
function drawBar(doc, x, y, w, h, value, max, fillColor) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  drawRect(doc, x, y, w, h, BRAND.border, 2);
  if (ratio > 0) drawRect(doc, x, y, Math.max(ratio * w, 2), h, fillColor, 2);
}

/** Page header strip — drawn at the top of every page */
function drawPageHeader(doc, sessionData) {
  drawRect(doc, 0, 0, PAGE.width, 36, BRAND.primary);
  doc.fontSize(9).fillColor(BRAND.white)
    .text('TriviaForge  ·  Session Report', PAGE.margin, 12, { lineBreak: false });
  doc.text(formatDate(new Date()), PAGE.margin, 12, {
    width: CONTENT_W, align: 'right', lineBreak: false,
  });
}

/** Thin divider line */
function divider(doc, y, color = BRAND.border) {
  doc.save().moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y)
    .strokeColor(color).lineWidth(0.5).stroke().restore();
}

// ─── Page 1: Summary ──────────────────────────────────────────────────────────

function drawSummaryPage(doc, sessionData) {
  drawPageHeader(doc);

  let y = 50;

  // ── Quiz title & metadata ──
  doc.fontSize(20).fillColor(BRAND.text)
    .font('Helvetica-Bold')
    .text(sessionData.quizTitle, PAGE.margin, y, { width: CONTENT_W });
  y = doc.y + 6;

  const statusColor = sessionData.status === 'completed' ? BRAND.success : '#F59E0B';
  const statusLabel = sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1);

  doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
    .text(
      `Room: ${sessionData.roomCode}  ·  ${statusLabel}  ·  Started: ${formatDate(sessionData.createdAt)}${sessionData.completedAt ? '  ·  Ended: ' + formatDate(sessionData.completedAt) : ''}`,
      PAGE.margin, y, { width: CONTENT_W },
    );
  y = doc.y + 4;
  divider(doc, y);
  y += 12;

  // ── Summary stat pills ──
  const sortedPlayers = [...sessionData.playerResults].sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    return pct(b.correct, b.answered) - pct(a.correct, a.answered);
  });
  const totalPlayers = sortedPlayers.length;
  const totalQuestions = sessionData.questions.length;
  const classAccuracy = totalPlayers > 0
    ? Math.round(sortedPlayers.reduce((s, p) => s + pct(p.correct, p.answered), 0) / totalPlayers)
    : 0;

  const pills = [
    { label: 'Players',      value: totalPlayers },
    { label: 'Questions',    value: totalQuestions },
    { label: 'Class Avg',    value: `${classAccuracy}%` },
  ];
  const pillW = Math.floor(CONTENT_W / pills.length) - 8;
  pills.forEach((pill, i) => {
    const px = PAGE.margin + i * (pillW + 8);
    drawRect(doc, px, y, pillW, 46, BRAND.bg, 6);
    drawBorder(doc, px, y, pillW, 46, BRAND.border, 6);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(BRAND.primary)
      .text(String(pill.value), px, y + 6, { width: pillW, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor(BRAND.muted)
      .text(pill.label, px, y + 30, { width: pillW, align: 'center' });
  });
  y += 60;

  // ── Podium (top 3) ──
  if (sortedPlayers.length > 0) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND.text)
      .text('Top Performers', PAGE.margin, y);
    y += 16;

    const podiumColors = [BRAND.gold, BRAND.silver, BRAND.bronze];
    const podiumLabels = ['1st', '2nd', '3rd'];
    const podiumHeights = [72, 56, 44];
    const podiumW = Math.min(Math.floor(CONTENT_W / 3) - 6, 150);
    const podiumTop = y + 10;
    const baseY = podiumTop + 80;

    const top3 = sortedPlayers.slice(0, Math.min(3, sortedPlayers.length));

    top3.forEach((player, i) => {
      const px = PAGE.margin + i * (podiumW + 10);
      const ph = podiumHeights[i];
      const py = baseY - ph;

      drawRect(doc, px, py, podiumW, ph, podiumColors[i], 4);

      // Rank badge
      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.text)
        .text(podiumLabels[i], px, py + 6, { width: podiumW, align: 'center' });

      // Player name (below podium block)
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND.text)
        .text(player.name, px, baseY + 4, { width: podiumW, align: 'center', lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor(BRAND.muted)
        .text(`${player.correct}/${player.answered} correct  (${pct(player.correct, player.answered)}%)`,
          px, baseY + 16, { width: podiumW, align: 'center' });
    });

    y = baseY + 34;
  }

  // ── Full leaderboard table ──
  if (sortedPlayers.length > 3) {
    y += 4;
    divider(doc, y);
    y += 8;

    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND.text)
      .text('Full Leaderboard', PAGE.margin, y);
    y += 14;

    // Column headers
    const cols = { rank: 36, name: 200, correct: 60, answered: 60, accuracy: 70 };
    const hBg = y;
    drawRect(doc, PAGE.margin, hBg, CONTENT_W, 18, BRAND.bg, 3);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND.muted);
    let cx = PAGE.margin + 4;
    doc.text('Rank', cx, hBg + 5, { width: cols.rank });
    cx += cols.rank;
    doc.text('Player', cx, hBg + 5, { width: cols.name });
    cx += cols.name;
    doc.text('Correct', cx, hBg + 5, { width: cols.correct, align: 'center' });
    cx += cols.correct;
    doc.text('Answered', cx, hBg + 5, { width: cols.answered, align: 'center' });
    cx += cols.answered;
    doc.text('Accuracy', cx, hBg + 5, { width: cols.accuracy, align: 'right' });
    y += 20;

    sortedPlayers.forEach((player, i) => {
      if (y > PAGE.height - 60) {
        doc.addPage();
        drawPageHeader(doc);
        y = 50;
      }
      const rowY = y;
      if (i % 2 === 0) drawRect(doc, PAGE.margin, rowY, CONTENT_W, 16, '#F3F4F6', 2);
      const accuracy = pct(player.correct, player.answered);
      cx = PAGE.margin + 4;
      doc.fontSize(8).font('Helvetica').fillColor(BRAND.text);
      doc.text(`#${i + 1}`, cx, rowY + 4, { width: cols.rank });
      cx += cols.rank;
      doc.text(player.name, cx, rowY + 4, { width: cols.name, lineBreak: false });
      cx += cols.name;
      doc.text(String(player.correct), cx, rowY + 4, { width: cols.correct, align: 'center' });
      cx += cols.correct;
      doc.text(String(player.answered), cx, rowY + 4, { width: cols.answered, align: 'center' });
      cx += cols.answered;
      doc.fillColor(accuracyColor(accuracy))
        .text(`${accuracy}%`, cx, rowY + 4, { width: cols.accuracy, align: 'right' });
      doc.fillColor(BRAND.text);
      y += 17;
    });
  }

  // ── Per-question accuracy chart ──
  if (sessionData.questions.length > 0) {
    y += 10;
    if (y > PAGE.height - 120) { doc.addPage(); drawPageHeader(doc); y = 50; }

    divider(doc, y);
    y += 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND.text)
      .text('Question Accuracy Overview', PAGE.margin, y);
    y += 14;

    const barH = 12;
    const barGap = 5;
    const labelW = 22;
    const barAreaW = CONTENT_W - labelW - 44;

    sessionData.questions.forEach((q, qi) => {
      if (y > PAGE.height - 50) { doc.addPage(); drawPageHeader(doc); y = 50; }
      let correct = 0;
      let total = 0;
      sessionData.playerResults.forEach((p) => {
        const ans = p.answers[qi];
        if (ans !== undefined) {
          total++;
          if (ans === q.correctChoice) correct++;
        }
      });
      const accuracy = pct(correct, total);
      const bx = PAGE.margin + labelW;

      doc.fontSize(7.5).font('Helvetica').fillColor(BRAND.muted)
        .text(`Q${qi + 1}`, PAGE.margin, y + 2, { width: labelW });
      drawBar(doc, bx, y, barAreaW, barH, accuracy, 100, accuracyColor(accuracy));
      doc.fontSize(7.5).fillColor(BRAND.text)
        .text(`${accuracy}%  (${correct}/${total === 0 ? sessionData.playerResults.length : total})`,
          bx + barAreaW + 4, y + 2, { width: 40 });
      y += barH + barGap;
    });
  }
}

// ─── Page 2+: Per-question breakdown ─────────────────────────────────────────

async function drawQuestionPages(doc, sessionData) {
  const totalPlayers = sessionData.playerResults.length;

  for (let qi = 0; qi < sessionData.questions.length; qi++) {
    const q = sessionData.questions[qi];

    doc.addPage();
    drawPageHeader(doc);
    let y = 50;

    // ── Question header ──
    const qNum = `Question ${qi + 1} of ${sessionData.questions.length}`;
    drawRect(doc, PAGE.margin, y, CONTENT_W, 22, BRAND.primary, 4);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.white)
      .text(qNum, PAGE.margin + 8, y + 7, { width: CONTENT_W - 16 });
    y += 28;

    // ── Question text ──
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text)
      .text(q.text, PAGE.margin, y, { width: CONTENT_W });
    y = doc.y + 10;

    // ── Question image ──
    if (q.imageUrl) {
      const imgBuf = await resolveImage(q.imageUrl);
      if (imgBuf) {
        const maxImgW = Math.min(CONTENT_W, 380);
        const maxImgH = 180;
        // Use sharp metadata for exact dimensions so we advance y explicitly —
        // doc.y after doc.image() with absolute coords is unreliable with fit scaling.
        const meta = await sharp(imgBuf).metadata();
        const srcW = meta.width || maxImgW;
        const srcH = meta.height || maxImgH;
        const scale = Math.min(maxImgW / srcW, maxImgH / srcH, 1);
        const drawW = Math.round(srcW * scale);
        const drawH = Math.round(srcH * scale);
        doc.image(imgBuf, PAGE.margin, y, { width: drawW, height: drawH });
        y += drawH + 12;
      } else {
        drawRect(doc, PAGE.margin, y, CONTENT_W, 32, BRAND.bg, 4);
        drawBorder(doc, PAGE.margin, y, CONTENT_W, 32, BRAND.border, 4);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND.muted)
          .text('Image unavailable', PAGE.margin + 10, y + 6, { width: CONTENT_W - 20, lineBreak: false });
        doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted)
          .text(q.imageUrl, PAGE.margin + 10, y + 18, { width: CONTENT_W - 20, lineBreak: false });
        y += 40;
      }
    }

    // ── Answer choices ──
    // Layout: [6px pad] [18px letter] [choice text ... ] [68px correct badge] [6px pad]
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const BADGE_W = 68;
    const choiceTextW = CONTENT_W - 18 - BADGE_W - 20; // letter + badge + padding

    q.choices.forEach((choice, ci) => {
      if (y > PAGE.height - 60) { doc.addPage(); drawPageHeader(doc); y = 50; }
      const isCorrect = ci === q.correctChoice;
      const bgColor = isCorrect ? '#D1FAE5' : BRAND.bg;
      const borderColor = isCorrect ? BRAND.success : BRAND.border;
      const textColor = isCorrect ? '#065F46' : BRAND.text;

      drawRect(doc, PAGE.margin, y, CONTENT_W, 20, bgColor, 3);
      drawBorder(doc, PAGE.margin, y, CONTENT_W, 20, borderColor, 3);

      // Letter label
      doc.fontSize(9).font('Helvetica-Bold').fillColor(textColor)
        .text(`${letters[ci]}.`, PAGE.margin + 6, y + 6, { width: 18, lineBreak: false });

      // Choice text — width capped so it never reaches the badge column
      doc.font('Helvetica').fillColor(textColor)
        .text(choice, PAGE.margin + 24, y + 6, { width: choiceTextW, lineBreak: false });

      // Correct badge — pinned to the right edge
      if (isCorrect) {
        const badgeX = PAGE.margin + CONTENT_W - BADGE_W - 4;
        doc.font('Helvetica-Bold').fillColor(BRAND.success)
          .text('Correct', badgeX, y + 6, { width: BADGE_W, align: 'right', lineBreak: false });
      }
      y += 23;
    });

    y += 8;

    // ── Per-question stats ──
    let correct = 0, incorrect = 0, unanswered = 0;
    sessionData.playerResults.forEach((p) => {
      const ans = p.answers[qi];
      if (ans === undefined) unanswered++;
      else if (ans === q.correctChoice) correct++;
      else incorrect++;
    });
    const accuracy = pct(correct, totalPlayers);

    divider(doc, y);
    y += 8;

    const statCols = [
      { label: 'Correct',    value: correct,    color: BRAND.success },
      { label: 'Incorrect',  value: incorrect,  color: BRAND.danger },
      { label: 'Unanswered', value: unanswered, color: BRAND.muted },
      { label: 'Accuracy',   value: `${accuracy}%`, color: accuracyColor(accuracy) },
    ];
    const statW = Math.floor(CONTENT_W / statCols.length) - 4;
    statCols.forEach((s, i) => {
      const sx = PAGE.margin + i * (statW + 4);
      drawRect(doc, sx, y, statW, 36, BRAND.bg, 4);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(s.color)
        .text(String(s.value), sx, y + 4, { width: statW, align: 'center' });
      doc.fontSize(7.5).font('Helvetica').fillColor(BRAND.muted)
        .text(s.label, sx, y + 24, { width: statW, align: 'center' });
    });
    y += 44;

    // ── Accuracy bar ──
    drawBar(doc, PAGE.margin, y, CONTENT_W, 10, accuracy, 100, accuracyColor(accuracy));
    y += 18;

    // ── Player answer grid ──
    divider(doc, y);
    y += 8;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.text)
      .text('Player Responses', PAGE.margin, y);
    y += 12;

    const sorted = [...sessionData.playerResults].sort((a, b) => {
      const aCorrect = a.answers[qi] === q.correctChoice;
      const bCorrect = b.answers[qi] === q.correctChoice;
      if (bCorrect !== aCorrect) return bCorrect ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    // Row layout constants — all elements share midY so nothing drifts off-axis
    const ROW_H = 20;
    const CELL_GAP = 6;
    const colW = Math.floor((CONTENT_W - CELL_GAP) / 2);
    const r = 5;                       // circle radius
    const CIRCLE_X_PAD = 6;            // left pad before circle
    const NAME_X_PAD = CIRCLE_X_PAD + r * 2 + 5; // name starts after circle + gap
    const LETTER_W = 28;               // answer letter column width on right

    let col = 0;
    let rowY = y;

    sorted.forEach((player, idx) => {
      if (rowY > PAGE.height - 40) {
        doc.addPage(); drawPageHeader(doc);
        rowY = 50; col = 0;
      }
      const px = PAGE.margin + col * (colW + CELL_GAP);

      // Cell background — alternating per logical row (every 2 players)
      const rowIndex = Math.floor(idx / 2);
      const cellBg = rowIndex % 2 === 0 ? BRAND.bg : '#F0F2F5';
      drawRect(doc, px, rowY, colW, ROW_H, cellBg, 3);
      drawBorder(doc, px, rowY, colW, ROW_H, BRAND.border, 3);

      const ans = player.answers[qi];
      const answered = ans !== undefined;
      const isCorrect = ans === q.correctChoice;
      const dotColor = !answered ? BRAND.muted : isCorrect ? BRAND.success : BRAND.danger;
      const dotLabel = !answered ? '-' : isCorrect ? '+' : 'x';
      const answerLetter = answered ? letters[ans] || '?' : '-';

      // All elements share this vertical centre
      const midY = rowY + ROW_H / 2;

      // Filled circle — centred on midY
      const circleCX = px + CIRCLE_X_PAD + r;
      doc.save().circle(circleCX, midY, r).fill(dotColor).restore();

      // Symbol inside circle — 7pt Helvetica-Bold ascender sits ~3.5pt below text-top,
      // so set text-top to midY - 3.5 to land the visual glyph centre on midY
      doc.fontSize(7).font('Helvetica-Bold').fillColor(BRAND.white)
        .text(dotLabel, circleCX - r, midY - 3.5, { width: r * 2, align: 'center', lineBreak: false });

      // Player name — 8pt, text-top at midY - 4 centres the glyph on midY
      const nameW = colW - NAME_X_PAD - LETTER_W - 6;
      doc.fontSize(8).font('Helvetica').fillColor(BRAND.text)
        .text(player.name, px + NAME_X_PAD, midY - 4, { width: nameW, lineBreak: false });

      // Answer letter — right edge of cell, same text-top
      doc.fillColor(BRAND.muted)
        .text(`(${answerLetter})`, px + colW - LETTER_W - 4, midY - 4, {
          width: LETTER_W, align: 'right', lineBreak: false,
        });

      col++;
      if (col >= 2) { col = 0; rowY += ROW_H; }
    });

    // Flush the last partial row
    if (col === 1) rowY += ROW_H;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a rich PDF report for a single session.
 * @param {Object} sessionData - Same shape as getFullSessionData()
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
export async function generatePDF(sessionData) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, autoFirstPage: false });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.addPage();

    drawSummaryPage(doc, sessionData);
    await drawQuestionPages(doc, sessionData);

    doc.end();
  });
}

export default { generatePDF };
