export type BoardSize = 3 | 5 | 7;

export type WinTierType = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TOP_PRIZE';

export interface PendingPrizeClaim {
  id: string;
  gameId: string;
  cardId: string;
  pilotName: string;
  avatarUrl?: string;
  tier: WinTierType;
  tierTitle: string;
  tierBadge: string;
  lineLabel: string;
  submittedAt: number;
}

export interface ApprovedPrize {
  id: string;
  pilotName: string;
  avatarUrl?: string;
  tier: WinTierType;
  tierTitle: string;
  tierBadge: string;
  lineLabel: string;
  approvedAt: number;
}

export interface BingoGame {
  id: string;
  referenceNumber: string;
  fleetName: string;
  fcName: string;
  date: string;
  gridSize: BoardSize;
  status: 'ACTIVE' | 'FORMING' | 'CONCLUDED';
  createdAt: number;
  tier2Winner?: string;
  tier2WinnerAvatar?: string;
  tier3Winner?: string;
  tier3WinnerAvatar?: string;
  tier4Winner?: string;
  tier4WinnerAvatar?: string;
  fullHouseWinner?: string;
  fullHouseWinnerAvatar?: string;
  finishedAt?: number;
  isPausedForApproval?: boolean;
  pendingPrizeClaims?: PendingPrizeClaim[];
  approvedPrizes?: ApprovedPrize[];
  winners?: {
    rank: number;
    pilotName: string;
    avatarUrl?: string;
    prizeTier: string;
    prizeBadge: string;
    tierType?: WinTierType;
    completedSquares: number;
    totalSquares: number;
    winningLines: string[];
    allTiers?: { tier: WinTierType; title: string; count: number; badge?: string }[];
  }[];
  outcome?: GameOutcome;
}

export interface GameOutcome {
  concludedAt: number;
  totalPilots: number;
  totalSquaresMarked: number;
  fullHouseWinner?: string;
  fullHouseWinnerAvatar?: string;
  approvedPrizes: ApprovedPrize[];
  winners: {
    rank: number;
    pilotName: string;
    avatarUrl?: string;
    prizeTier: string;
    prizeBadge: string;
    tierType?: WinTierType;
    completedSquares: number;
    totalSquares: number;
    winningLines: string[];
    allTiers?: { tier: WinTierType; title: string; count: number; badge?: string }[];
  }[];
  summary: {
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier4Count: number;
    fullHouseCount: number;
  };
}

export interface BingoSquare {
  id: string;
  text: string;
  isChecked: boolean;
  isFree: boolean;
  freeLabel?: 'free square, npsi.rocks!' | 'you undocked!';
  row: number;
  col: number;
}

export interface WinTierInfo {
  tier: WinTierType;
  title: string;
  badge: string;
  description: string;
  achievedCount: number;
  unlocked: boolean;
}

export interface WinningLine {
  type: 'ROW' | 'COL' | 'DIAG' | 'CORNERS' | 'FULL_HOUSE';
  tier: WinTierType;
  indices: [number, number][];
  label: string;
}

export interface EvaluationResult {
  tiers: WinTierInfo[];
  winningLines: WinningLine[];
  hasNewWin: boolean;
  highestTier?: WinTierType;
  completedSquares: number;
  totalSquares: number;
}

export interface BingoCard {
  id: string;
  gameId?: string;
  pilotName: string;
  avatarUrl?: string;
  fleetName: string;
  size: BoardSize;
  squares: BingoSquare[][];
  createdAt: number;
  lastUpdated: number;
  checkedCount: number;
  wins: WinTierType[];
  rejectedCount?: number;
  isClosed?: boolean;
  closedReason?: string;
}

export interface FleetPlayer {
  id: string;
  pilotName: string;
  avatarUrl?: string;
  fleetName: string;
  shipType: string;
  size: BoardSize;
  card: BingoCard;
  checkedCount: number;
  totalSquares: number;
  highestTier?: WinTierType;
  lastActive: string;
  isCurrentUser: boolean;
  rejectedCount?: number;
  isClosed?: boolean;
}
