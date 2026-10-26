import { BingoCard, BoardSize, WinTierType } from '../types/bingo';
import { ApiGame } from './api';
import { evaluateCard } from './bingoLogic';

export interface WinnerResult {
  rank: number;
  pilotName: string;
  avatarUrl?: string;
  prizeTier: string;
  prizeBadge: string;
  tierType?: WinTierType;
  allTiers: { tier: WinTierType; title: string; badge: string; count: number }[];
  completedSquares: number;
  totalSquares: number;
  percentage: number;
  winningLines: string[];
  cardId: string;
  isTopWinner: boolean;
}

const TIER_WEIGHTS: Record<WinTierType, number> = {
  TOP_PRIZE: 500,
  TIER_4: 400,
  TIER_3: 300,
  TIER_2: 200,
  TIER_1: 100,
};

const TIER_TITLES: Record<WinTierType, { title: string; badge: string }> = {
  TOP_PRIZE: { title: 'TOP PRIZE (Full House)', badge: 'TOP PRIZE' },
  TIER_4: { title: 'TIER 4 (4 Corners)', badge: 'TIER 4' },
  TIER_3: { title: 'TIER 3 (Center Diagonal)', badge: 'TIER 3' },
  TIER_2: { title: 'TIER 2 (Center Line)', badge: 'TIER 2' },
  TIER_1: { title: 'TIER 1 (Line Win)', badge: 'TIER 1' },
};

/**
 * Evaluates all registered cards for a game and selects sorted winners with prize tiers.
 */
export function selectGameWinners(cards: BingoCard[], _gridSize: BoardSize): WinnerResult[] {
  if (!cards || cards.length === 0) {
    return [];
  }

  const evaluated = cards.map((card) => {
    const evalRes = evaluateCard(card.squares);
    const flat = card.squares.flat();
    const completed = flat.filter((s) => s.isChecked).length;
    const total = flat.length;
    const pct = Math.round((completed / total) * 100);
    const highestTier = evalRes.highestTier;

    // Priority mapping for sorting wins
    const tierPriority: Record<string, number> = {
      TOP_PRIZE: 5,
      TIER_4: 4,
      TIER_3: 3,
      TIER_2: 2,
      TIER_1: 1,
    };

    // Collect all unlocked tiers with their counts, ordered highest tier first
    const allTiers = evalRes.tiers
      .filter((t) => t.unlocked && t.achievedCount > 0)
      .map((t) => ({
        tier: t.tier,
        title: t.title,
        badge: t.badge,
        count: t.achievedCount,
      }))
      .sort((a, b) => (tierPriority[b.tier] || 0) - (tierPriority[a.tier] || 0));

    let score = 0;
    if (highestTier) {
      score += TIER_WEIGHTS[highestTier];
    }
    // Add score for all tiers achieved
    allTiers.forEach((t) => {
      score += (TIER_WEIGHTS[t.tier] || 0) * 0.1 * t.count;
    });
    score += evalRes.winningLines.length * 10;
    score += completed;

    const lineLabels = evalRes.winningLines.map((l) => l.label);

    let prizeTier = 'RUNNER UP';
    let prizeBadge = 'RUNNER UP';

    if (allTiers.length > 0) {
      prizeTier = allTiers.map((t) => (t.count > 1 ? `${t.badge} (x${t.count})` : t.badge)).join(', ');
      prizeBadge = allTiers[0].badge;
    } else if (completed > 0) {
      prizeTier = `PARTICIPANT (${completed}/${total} Marked)`;
      prizeBadge = 'PARTICIPANT';
    }

    return {
      cardId: card.id,
      pilotName: card.pilotName || 'Anonymous Pilot',
      avatarUrl: card.avatarUrl,
      highestTier,
      prizeTier,
      prizeBadge,
      allTiers,
      completedSquares: completed,
      totalSquares: total,
      percentage: pct,
      winningLines: lineLabels,
      score,
      lastUpdated: card.lastUpdated || 0,
    };
  });

  // Sort by score descending, then tie-break by earliest lastUpdated
  evaluated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.completedSquares !== a.completedSquares) return b.completedSquares - a.completedSquares;
    return a.lastUpdated - b.lastUpdated;
  });

  // Single-winner rules for TOP_PRIZE, TIER_4, TIER_3, TIER_2
  // And Tier 1: anyone can win, but once a player has 1 line, cannot be awarded other lines (max 1)
  let fullHouseAwarded = false;
  let tier4Awarded = false;
  let tier3Awarded = false;
  let tier2Awarded = false;

  evaluated.forEach((item) => {
    // 1. Full House: only one person can win
    if (item.allTiers.some((t) => t.tier === 'TOP_PRIZE')) {
      if (!fullHouseAwarded) {
        fullHouseAwarded = true;
      } else {
        item.allTiers = item.allTiers.filter((t) => t.tier !== 'TOP_PRIZE');
      }
    }

    // 2. Tier 4: only one person can win
    if (item.allTiers.some((t) => t.tier === 'TIER_4')) {
      if (!tier4Awarded) {
        tier4Awarded = true;
      } else {
        item.allTiers = item.allTiers.filter((t) => t.tier !== 'TIER_4');
      }
    }

    // 3. Tier 3: only one person can win
    if (item.allTiers.some((t) => t.tier === 'TIER_3')) {
      if (!tier3Awarded) {
        tier3Awarded = true;
      } else {
        item.allTiers = item.allTiers.filter((t) => t.tier !== 'TIER_3');
      }
    }

    // 4. Tier 2: only one person can win
    if (item.allTiers.some((t) => t.tier === 'TIER_2')) {
      if (!tier2Awarded) {
        tier2Awarded = true;
      } else {
        item.allTiers = item.allTiers.filter((t) => t.tier !== 'TIER_2');
      }
    }

    // 5. Tier 1: anyone can win, but max 1 horizontal or vertical line awarded per player
    const tier1 = item.allTiers.find((t) => t.tier === 'TIER_1');
    if (tier1) {
      tier1.count = 1;
    }

    // Recompute highest tier and prize badge after single-winner filter
    if (item.allTiers.length > 0) {
      item.highestTier = item.allTiers[0].tier;
      item.prizeBadge = item.allTiers[0].badge;
      item.prizeTier = item.allTiers.map((t) => (t.count > 1 ? `${t.badge} (x${t.count})` : t.badge)).join(', ');
    } else {
      item.highestTier = undefined;
      if (item.completedSquares > 0) {
        item.prizeTier = `PARTICIPANT (${item.completedSquares}/${item.totalSquares} Marked)`;
        item.prizeBadge = 'PARTICIPANT';
      } else {
        item.prizeTier = 'RUNNER UP';
        item.prizeBadge = 'RUNNER UP';
      }
    }
  });

  return evaluated.map((item, index) => ({
    rank: index + 1,
    pilotName: item.pilotName,
    avatarUrl: item.avatarUrl,
    prizeTier: item.prizeTier,
    prizeBadge: item.prizeBadge,
    tierType: item.highestTier,
    allTiers: item.allTiers,
    completedSquares: item.completedSquares,
    totalSquares: item.totalSquares,
    percentage: item.percentage,
    winningLines: item.winningLines,
    cardId: item.cardId,
    isTopWinner: index < 3 || !!item.highestTier,
  }));
}

/**
 * Creates and downloads a high-resolution PNG image file displaying the fleet winners with their prize tiers.
 */
export async function createWinnersPngFile(game: ApiGame, winners: WinnerResult[]): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const width = 1200;
  // Calculate dynamic height based on winners count
  const rowHeight = 56;
  const headerHeight = 290;
  const footerHeight = 110;
  const rowsCount = Math.max(winners.length, 1);
  const height = Math.max(680, headerHeight + rowsCount * rowHeight + footerHeight + 40);

  canvas.width = width;
  canvas.height = height;

  // 1. Cosmic Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090515');
  bgGrad.addColorStop(0.5, '#120824');
  bgGrad.addColorStop(1, '#06030c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle radial glow near top
  const radialGlow = ctx.createRadialGradient(width / 2, 100, 10, width / 2, 100, 600);
  radialGlow.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
  radialGlow.addColorStop(0.6, 'rgba(6, 182, 212, 0.08)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // Outer Neon Purple Frame
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Inner Subtle Border
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  // Corner Accent Marks
  const drawCorner = (x: number, y: number, dx: number, dy: number) => {
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 20);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 20, y);
    ctx.stroke();
  };
  drawCorner(16, 16, 1, 1);
  drawCorner(width - 16, 16, -1, 1);
  drawCorner(16, height - 16, 1, -1);
  drawCorner(width - 16, height - 16, -1, -1);

  // 2. Header Section
  // App Title / Brand
  ctx.fillStyle = '#e879f9';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText('NPSI.ROCKS // FLEET COMMAND OPERATIONS', 50, 62);

  // Big Trophy / Title Banner
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('OFFICIAL FLEET BINGO WINNERS', 50, 106);

  // Subtitle
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.fillText('WINNER ALLOCATION & PRIZE TIER RESULTS', 50, 132);

  // Operation Details Card Banner (top right / across)
  const metaY = 160;
  ctx.fillStyle = 'rgba(21, 13, 34, 0.85)';
  ctx.fillRect(50, metaY, width - 100, 80);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(50, metaY, width - 100, 80);

  // Meta items
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('OPERATION REF', 75, metaY + 28);
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText(game.referenceNumber || 'NPSI-01', 75, metaY + 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('FLEET NAME', 260, metaY + 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText(game.fleetName, 260, metaY + 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('FLEET COMMANDER', 570, metaY + 28);
  ctx.fillStyle = '#e879f9';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText(game.fcName || 'FC Boba', 570, metaY + 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('DATE / GRID', 830, metaY + 28);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText(`${game.gridSize}x${game.gridSize} Grid · ${game.date}`, 830, metaY + 54);

  // 3. Winners Table Headers
  const tableTop = metaY + 105;
  ctx.fillStyle = 'rgba(30, 16, 53, 0.9)';
  ctx.fillRect(50, tableTop, width - 100, 36);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
  ctx.strokeRect(50, tableTop, width - 100, 36);

  ctx.fillStyle = '#c084fc';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('RANK', 75, tableTop + 23);
  ctx.fillText('PILOT (CAPSULEER)', 170, tableTop + 23);
  ctx.fillText('PRIZE TIER ALLOCATION (ALL WINS ACHIEVED)', 450, tableTop + 23);
  ctx.fillText('SQUARES', 1010, tableTop + 23);

  // 4. Winners Rows
  let currentY = tableTop + 42;

  if (winners.length === 0) {
    ctx.fillStyle = 'rgba(21, 13, 34, 0.6)';
    ctx.fillRect(50, currentY, width - 100, 60);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('No registered cards participated in this operation.', 75, currentY + 36);
    currentY += 70;
  } else {
    winners.forEach((winner, idx) => {
      const isEven = idx % 2 === 0;
      ctx.fillStyle = isEven ? 'rgba(21, 13, 34, 0.7)' : 'rgba(14, 9, 24, 0.7)';
      ctx.fillRect(50, currentY, width - 100, rowHeight - 6);

      // Subtle row border
      ctx.strokeStyle = winner.rank === 1 ? 'rgba(234, 179, 8, 0.5)' : 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = winner.rank === 1 ? 1.5 : 1;
      ctx.strokeRect(50, currentY, width - 100, rowHeight - 6);

      // Rank Badge
      if (winner.rank === 1) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(72, currentY + 12, 54, 26);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText('★ #1', 82, currentY + 30);
      } else if (winner.rank === 2) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(72, currentY + 12, 54, 26);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText('◆ #2', 82, currentY + 30);
      } else if (winner.rank === 3) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(72, currentY + 12, 54, 26);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText('▲ #3', 82, currentY + 30);
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(`#${winner.rank}`, 86, currentY + 30);
      }

      // Pilot Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Inter", sans-serif';
      ctx.fillText(winner.pilotName, 170, currentY + 30);

      // Draw Badge Pills for All Wins
      let badgeX = 450;
      if (winner.allTiers && winner.allTiers.length > 0) {
        winner.allTiers.forEach((tierItem) => {
          let bg = '#6b21a8';
          let textColor = '#ffffff';
          if (tierItem.tier === 'TOP_PRIZE') {
            bg = '#eab308';
            textColor = '#090515';
          } else if (tierItem.tier === 'TIER_4') {
            bg = '#10b981';
            textColor = '#ffffff';
          } else if (tierItem.tier === 'TIER_3') {
            bg = '#06b6d4';
            textColor = '#090515';
          } else if (tierItem.tier === 'TIER_2') {
            bg = '#d946ef';
            textColor = '#ffffff';
          } else if (tierItem.tier === 'TIER_1') {
            bg = '#8b5cf6';
            textColor = '#ffffff';
          }

          const label = tierItem.count > 1 ? `${tierItem.badge} (x${tierItem.count})` : tierItem.badge;
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(label).width;
          const pillW = textWidth + 16;

          if (badgeX + pillW < 990) {
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.roundRect(badgeX, currentY + 13, pillW, 24, 5);
            ctx.fill();

            ctx.fillStyle = textColor;
            ctx.fillText(label, badgeX + 8, currentY + 29);
            badgeX += pillW + 8;
          }
        });
      } else {
        // Participant or Runner Up badge
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(450, currentY + 13, 200, 24, 5);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(winner.prizeTier, 460, currentY + 29);
      }

      // Marked Squares Count
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `${winner.completedSquares} / ${winner.totalSquares} (${winner.percentage}%)`,
        1010,
        currentY + 30
      );

      currentY += rowHeight;
    });
  }

  // 5. Footer Section
  const footY = height - 55;
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, footY - 15);
  ctx.lineTo(width - 50, footY - 15);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('FUN INC · NPSI.ROCKS · NOT PURPLE, SHOOT IT · BINGO RECALL TRANSMISSION', 50, footY + 10);

  const timestamp = new Date().toUTCString();
  ctx.fillStyle = '#22d3ee';
  ctx.fillText(`CONCLUDED: ${timestamp}`, 840, footY + 10);

  // Return base64 png
  const dataUrl = canvas.toDataURL('image/png');

  // Automatically trigger download
  const link = document.createElement('a');
  const safeRef = (game.referenceNumber || 'NPSI').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `FC_Bingo_Winners_${safeRef}_${Date.now()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}

export function formatDiscordWinnersReport(game: ApiGame, winners: WinnerResult[]): string {
  let text = `🏆 **${game.fleetName} (${game.referenceNumber}) - OFFICIAL BINGO OUTCOMES & WINNERS** 🏆\n`;
  text += `FC: ${game.fcName} · Grid: ${game.gridSize}x${game.gridSize} · ${game.date}\n`;
  if (game.fullHouseWinner) {
    text += `🌟 **Top Prize Full House Winner: ${game.fullHouseWinner}**\n`;
  }
  text += `\n`;

  if (!winners || winners.length === 0) {
    text += `No registered pilot cards found for this fleet operation.\n`;
  } else {
    winners.forEach((w) => {
      const medal = w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : w.rank === 3 ? '🥉' : '🎖️';
      const allWins =
        w.allTiers && w.allTiers.length > 0
          ? w.allTiers.map((t) => (t.count > 1 ? `${t.badge} (x${t.count})` : t.badge)).join(', ')
          : w.prizeTier;
      text += `${medal} **#${w.rank} ${w.pilotName}** — **Prize Tier: ${allWins}** [${w.completedSquares}/${w.totalSquares} marked]\n`;
    });
  }
  text += `\no7 FUN inc & NPSI.ROCKS — Not Purple, Shoot It!`;
  return text;
}

