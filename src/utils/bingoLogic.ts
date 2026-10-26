import { BingoCallItem } from '../data/defaultCalls';
import {
  BingoCard,
  BingoSquare,
  BoardSize,
  EvaluationResult,
  WinningLine,
  WinTierInfo,
  WinTierType,
} from '../types/bingo';

export function generateCard(
  size: BoardSize,
  activeCalls: BingoCallItem[],
  pilotName: string,
  fleetName: string,
  cardId?: string
): BingoCard {
  const totalCells = size * size;
  const mid = Math.floor(size / 2);

  // Shuffle active calls
  const pool = [...activeCalls.filter((c) => c.isActive)];
  const shuffled = pool.sort(() => Math.random() - 0.5);

  let callIndex = 0;
  const squares: BingoSquare[][] = [];

  for (let r = 0; r < size; r++) {
    const row: BingoSquare[] = [];
    for (let c = 0; c < size; c++) {
      const isCenter = r === mid && c === mid;
      const isUndockedFree = r === 0 && c === 0;

      if (isCenter) {
        row.push({
          id: `sq-${r}-${c}-${Date.now()}`,
          text: 'FREE SQUARE, NPSI.ROCKS!',
          isChecked: true,
          isFree: true,
          freeLabel: 'free square, npsi.rocks!',
          row: r,
          col: c,
        });
      } else if (isUndockedFree) {
        row.push({
          id: `sq-${r}-${c}-${Date.now()}`,
          text: 'YOU UNDOCKED!',
          isChecked: true,
          isFree: true,
          freeLabel: 'you undocked!',
          row: r,
          col: c,
        });
      } else {
        const item = shuffled[callIndex % shuffled.length];
        callIndex++;
        row.push({
          id: `sq-${r}-${c}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: item ? item.text : `FLEET CALL #${callIndex}`,
          isChecked: false,
          isFree: false,
          row: r,
          col: c,
        });
      }
    }
    squares.push(row);
  }

  const id = cardId || `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    pilotName: pilotName || 'Capsuleer',
    fleetName: fleetName || 'NPSI Roam #1',
    size,
    squares,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    checkedCount: 2, // 2 free squares
    wins: [],
  };
}

export function evaluateCard(squares: BingoSquare[][]): EvaluationResult {
  const size = squares.length;
  const mid = Math.floor(size / 2);
  const winningLines: WinningLine[] = [];

  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let tier4Achieved = false;
  let fullHouseAchieved = true;
  let completedSquares = 0;
  const totalSquares = size * size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (squares[r][c].isChecked) {
        completedSquares++;
      } else {
        fullHouseAchieved = false;
      }
    }
  }

  // 1. Horizontal Rows
  for (let r = 0; r < size; r++) {
    const isComplete = squares[r].every((sq) => sq.isChecked);
    if (isComplete) {
      const isThroughCenter = r === mid;
      const tier: WinTierType = isThroughCenter ? 'TIER_2' : 'TIER_1';
      if (isThroughCenter) tier2Count++;
      else tier1Count++;

      winningLines.push({
        type: 'ROW',
        tier,
        indices: squares[r].map((_, c) => [r, c] as [number, number]),
        label: isThroughCenter ? `Center Row ${r + 1}` : `Row ${r + 1}`,
      });
    }
  }

  // 2. Vertical Columns
  for (let c = 0; c < size; c++) {
    const isComplete = squares.every((row) => row[c].isChecked);
    if (isComplete) {
      const isThroughCenter = c === mid;
      const tier: WinTierType = isThroughCenter ? 'TIER_2' : 'TIER_1';
      if (isThroughCenter) tier2Count++;
      else tier1Count++;

      winningLines.push({
        type: 'COL',
        tier,
        indices: squares.map((_, r) => [r, c] as [number, number]),
        label: isThroughCenter ? `Center Col ${c + 1}` : `Column ${c + 1}`,
      });
    }
  }

  // 3. Diagonal lines through center (Main & Anti diagonals)
  const mainDiagComplete = squares.every((row, idx) => row[idx].isChecked);
  if (mainDiagComplete) {
    tier3Count++;
    winningLines.push({
      type: 'DIAG',
      tier: 'TIER_3',
      indices: squares.map((_, idx) => [idx, idx] as [number, number]),
      label: 'Main Diagonal',
    });
  }

  const antiDiagComplete = squares.every((row, idx) => row[size - 1 - idx].isChecked);
  if (antiDiagComplete) {
    tier3Count++;
    winningLines.push({
      type: 'DIAG',
      tier: 'TIER_3',
      indices: squares.map((_, idx) => [idx, size - 1 - idx] as [number, number]),
      label: 'Anti Diagonal',
    });
  }

  // 4. 4 Corners (Tier 4)
  const corners = [
    [0, 0],
    [0, size - 1],
    [size - 1, 0],
    [size - 1, size - 1],
  ] as [number, number][];

  const cornersComplete = corners.every(([r, c]) => squares[r][c].isChecked);
  if (cornersComplete) {
    tier4Achieved = true;
    winningLines.push({
      type: 'CORNERS',
      tier: 'TIER_4',
      indices: corners,
      label: '4 Corners',
    });
  }

  // 5. Full House (Top Prize)
  if (fullHouseAchieved) {
    const allIndices: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allIndices.push([r, c]);
      }
    }
    winningLines.push({
      type: 'FULL_HOUSE',
      tier: 'TOP_PRIZE',
      indices: allIndices,
      label: 'Full House',
    });
  }

  const tiers: WinTierInfo[] = [
    {
      tier: 'TIER_1',
      title: 'Tier 1 Prize',
      badge: 'TIER 1',
      description: 'Vertical line or horizontal line wins a tier 1 prize (max 1 per player)',
      achievedCount: tier1Count > 0 ? 1 : 0,
      unlocked: tier1Count > 0,
    },
    {
      tier: 'TIER_2',
      title: 'Tier 2 Prize',
      badge: 'TIER 2',
      description: 'Horizontal or vertical line through center (single winner)',
      achievedCount: tier2Count > 0 ? 1 : 0,
      unlocked: tier2Count > 0,
    },
    {
      tier: 'TIER_3',
      title: 'Tier 3 Prize',
      badge: 'TIER 3',
      description: 'Diagonal line through center (single winner)',
      achievedCount: tier3Count > 0 ? 1 : 0,
      unlocked: tier3Count > 0,
    },
    {
      tier: 'TIER_4',
      title: 'Tier 4 Prize',
      badge: 'TIER 4',
      description: 'All 4 corners checked off',
      achievedCount: tier4Achieved ? 1 : 0,
      unlocked: tier4Achieved,
    },
    {
      tier: 'TOP_PRIZE',
      title: 'Top Prize',
      badge: 'JACKPOT',
      description: 'All squares checked off (Full House!)',
      achievedCount: fullHouseAchieved ? 1 : 0,
      unlocked: fullHouseAchieved,
    },
  ];

  let highestTier: WinTierType | undefined;
  if (fullHouseAchieved) highestTier = 'TOP_PRIZE';
  else if (tier4Achieved) highestTier = 'TIER_4';
  else if (tier3Count > 0) highestTier = 'TIER_3';
  else if (tier2Count > 0) highestTier = 'TIER_2';
  else if (tier1Count > 0) highestTier = 'TIER_1';

  return {
    tiers,
    winningLines,
    hasNewWin: false,
    highestTier,
    completedSquares,
    totalSquares,
  };
}
