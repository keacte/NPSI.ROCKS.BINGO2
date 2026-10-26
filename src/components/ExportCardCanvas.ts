import { BingoCard, WinTierInfo } from '../types/bingo';

export async function exportCardAsPNG(
  card: BingoCard,
  activeWins: WinTierInfo[],
  pilotName: string,
  fleetName: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const size = card.size;

  const width = 1200;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background matching fleeting-eve-bingo #0A0612
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0A0612');
  bgGrad.addColorStop(0.5, '#150D22');
  bgGrad.addColorStop(1, '#0A0612');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer border with purple glow
  ctx.shadowColor = '#A855F7';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, width - 60, height - 60);
  ctx.shadowBlur = 0;

  // Top header brand: NPSI.ROCKS.BINGO
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Audiowide", "Inter", sans-serif';
  ctx.fillText('NPSI', 60, 95);

  ctx.fillStyle = '#A855F7';
  ctx.fillText('.', 165, 95);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('ROCKS', 180, 95);

  ctx.fillStyle = '#A855F7';
  ctx.fillText('.', 340, 95);

  // Chromatic text effect for BINGO
  const bingoGrad = ctx.createLinearGradient(360, 0, 520, 0);
  bingoGrad.addColorStop(0, '#C084FC');
  bingoGrad.addColorStop(0.5, '#E879F9');
  bingoGrad.addColorStop(1, '#A855F7');
  ctx.fillStyle = bingoGrad;
  ctx.fillText('BINGO', 360, 95);

  ctx.fillStyle = '#C084FC';
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText('// FC SURVIVAL CARD', 62, 128);

  // Top tier badge if won
  const highestWin = activeWins.find((w) => w.unlocked);
  if (highestWin) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.fillRect(width - 320, 60, 260, 48);
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width - 320, 60, 260, 48);
    ctx.fillStyle = '#E879F9';
    ctx.font = 'bold 16px "Audiowide", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`★ ${highestWin.badge} WINNER ★`, width - 190, 90);
    ctx.textAlign = 'left';
  }

  // Meta bar
  ctx.fillStyle = '#150D22';
  ctx.fillRect(60, 155, width - 120, 60);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 155, width - 120, 60);

  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#C084FC';
  ctx.fillText('PILOT:', 80, 190);
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(pilotName.toUpperCase(), 150, 190);

  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#C084FC';
  ctx.fillText('FLEET:', 460, 190);
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = '#E879F9';
  ctx.fillText(fleetName.toUpperCase(), 530, 190);

  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#C084FC';
  ctx.fillText('GRID:', 940, 190);
  ctx.font = 'bold 16px "Audiowide", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${size}x${size}`, 1000, 190);

  // Draw Grid
  const gridTop = 240;
  const gridLeft = 60;
  const gridWidth = width - 120;
  const gridHeight = 1000;
  const cellW = gridWidth / size;
  const cellH = gridHeight / size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const sq = card.squares[r][c];
      const cx = gridLeft + c * cellW;
      const cy = gridTop + r * cellH;

      if (sq.isChecked) {
        if (sq.isFree) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        } else {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
          ctx.strokeStyle = '#A855F7';
        }
      } else {
        ctx.fillStyle = '#1A1230';
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.18)';
      }
      ctx.fillRect(cx + 4, cy + 4, cellW - 8, cellH - 8);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 4, cy + 4, cellW - 8, cellH - 8);

      // Star mark for checked
      if (sq.isChecked) {
        ctx.fillStyle = sq.isFree ? '#FACC15' : '#E879F9';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('★', cx + cellW - 28, cy + 28);
      }

      // Text wrapping
      ctx.fillStyle = sq.isChecked ? '#ffffff' : '#CBD5E1';
      const fontSize = size === 3 ? 18 : size === 5 ? 13 : 10;
      ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
      ctx.textAlign = 'center';

      const words = sq.text.split(' ');
      let line = '';
      const lines: string[] = [];
      const maxWidth = cellW - 20;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const lineHeight = fontSize + 4;
      const totalTextH = lines.length * lineHeight;
      let startY = cy + (cellH - totalTextH) / 2 + fontSize;

      for (let k = 0; k < lines.length; k++) {
        ctx.fillText(lines[k].trim(), cx + cellW / 2, startY);
        startY += lineHeight;
      }
    }
  }

  // Footer
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText('Eyes down Capsuleers! o7 · NPSI.ROCKS.BINGO', 60, height - 48);

  ctx.textAlign = 'right';
  ctx.fillText(new Date().toUTCString(), width - 60, height - 48);

  // Trigger Download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const safePilot = (pilotName || 'capsuleer').replace(/[^a-zA-Z0-9]/g, '_');
  const safeFleet = (fleetName || 'fleet').replace(/[^a-zA-Z0-9]/g, '_');
  link.download = `NPSI_BINGO_${safePilot}_${safeFleet}.png`;
  link.href = dataUrl;
  link.click();
}
