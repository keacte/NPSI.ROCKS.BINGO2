import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { INITIAL_BINGO_CALLS, BingoCallItem } from './src/data/defaultCalls';
import { PendingPrizeClaim, ApprovedPrize, BingoSquare, GameOutcome } from './src/types/bingo';
import { evaluateCard } from './src/utils/bingoLogic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use('/audio', express.static(path.resolve(__dirname, 'public/audio')));

// Persistent Data Storage Path
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'app_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredGame {
  id: string;
  referenceNumber: string;
  fleetName: string;
  fcName: string;
  date: string;
  gridSize: 3 | 5 | 7;
  status: 'ACTIVE' | 'FORMING' | 'CONCLUDED' | 'COMPLETED';
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
  winners?: unknown[];
  isPausedForApproval?: boolean;
  pendingPrizeClaims?: PendingPrizeClaim[];
  approvedPrizes?: ApprovedPrize[];
  outcome?: GameOutcome;
}

interface StoredSquare {
  id: string;
  text: string;
  category: 'FC' | 'FLEET' | 'COMBAT' | 'MEMES';
  isChecked: boolean;
  isFree?: boolean;
}

interface StoredCard {
  id: string;
  gameId: string;
  pilotName: string;
  avatarUrl?: string;
  fleetName: string;
  shipType?: string;
  size: 3 | 5 | 7;
  squares: StoredSquare[][];
  checkedCount: number;
  lastUpdated: number;
  isCurrentUser?: boolean;
  rejectedCount?: number;
  isClosed?: boolean;
  closedReason?: string;
}

interface AppDataStore {
  adminPassword: string;
  adminTokens: string[];
  games: StoredGame[];
  cards: Record<string, StoredCard[]>; // gameId -> cards
  calls?: BingoCallItem[];
}

// Initial seed data
const DEFAULT_INITIAL_PASSWORD = 'passwordsrock1234';

function generateInitialSeedGames(): StoredGame[] {
  return [];
}

function generateInitialSeedCards(): Record<string, StoredCard[]> {
  return {};
}

function computeGameOutcome(
  game: StoredGame,
  cards: StoredCard[],
  winnersOverride?: any[]
): GameOutcome {
  const totalPilots = cards.length;
  let totalSquaresMarked = 0;
  for (const card of cards) {
    if (Array.isArray(card.squares)) {
      totalSquaresMarked += card.squares.flat().filter((sq) => sq && sq.isChecked).length;
    }
  }

  const approved = game.approvedPrizes || [];
  const tier1Count = approved.filter((p) => p.tier === 'TIER_1').length;
  const tier2Count = approved.filter((p) => p.tier === 'TIER_2').length;
  const tier3Count = approved.filter((p) => p.tier === 'TIER_3').length;
  const tier4Count = approved.filter((p) => p.tier === 'TIER_4').length;
  const fullHouseCount = approved.filter((p) => p.tier === 'TOP_PRIZE').length;

  const rawWinners = winnersOverride || (Array.isArray(game.winners) ? (game.winners as any[]) : []);
  const formattedWinners = rawWinners.map((w: any, idx: number) => ({
    rank: typeof w.rank === 'number' ? w.rank : idx + 1,
    pilotName: w.pilotName || 'Capsuleer',
    avatarUrl: w.avatarUrl,
    prizeTier: w.prizeTier || 'Participant',
    prizeBadge: w.prizeBadge || 'PARTICIPANT',
    tierType: w.tierType,
    completedSquares: typeof w.completedSquares === 'number' ? w.completedSquares : 0,
    totalSquares: typeof w.totalSquares === 'number' ? w.totalSquares : game.gridSize * game.gridSize,
    winningLines: Array.isArray(w.winningLines) ? w.winningLines : [],
    allTiers: Array.isArray(w.allTiers) ? w.allTiers : [],
  }));

  return {
    concludedAt: game.finishedAt || Date.now(),
    totalPilots,
    totalSquaresMarked,
    fullHouseWinner: game.fullHouseWinner,
    fullHouseWinnerAvatar: game.fullHouseWinnerAvatar,
    approvedPrizes: approved,
    winners: formattedWinners,
    summary: {
      tier1Count,
      tier2Count,
      tier3Count,
      tier4Count,
      fullHouseCount,
    },
  };
}

function loadAppData(): AppDataStore {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.adminPassword) {
        if (!parsed.calls || !Array.isArray(parsed.calls) || parsed.calls.length === 0) {
          parsed.calls = [...INITIAL_BINGO_CALLS];
          saveAppData(parsed);
        }
        if (parsed.games && Array.isArray(parsed.games)) {
          let updated = false;
          for (const g of parsed.games) {
            if ((g.status === 'CONCLUDED' || g.fullHouseWinner) && !g.outcome) {
              const cards = parsed.cards?.[g.id] || [];
              g.outcome = computeGameOutcome(g, cards);
              updated = true;
            }
          }
          if (updated) {
            saveAppData(parsed);
          }
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading app_data.json, reinitializing:', err);
    }
  }

  const initialStore: AppDataStore = {
    adminPassword: DEFAULT_INITIAL_PASSWORD,
    adminTokens: [],
    games: generateInitialSeedGames(),
    cards: generateInitialSeedCards(),
    calls: [...INITIAL_BINGO_CALLS],
  };

  saveAppData(initialStore);
  return initialStore;
}

function saveAppData(data: AppDataStore) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save app data:', err);
  }
}

// In-memory reference synced to disk
let store = loadAppData();

// Helper middleware to check admin authorization
function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-admin-token'] as string;
  const authHeader = req.headers.authorization;
  const providedToken = token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (providedToken && store.adminTokens.includes(providedToken)) {
    next();
    return;
  }

  res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
}

function checkIsAdmin(req: Request): boolean {
  const token = req.headers['x-admin-token'] as string;
  const authHeader = req.headers.authorization;
  const providedToken = token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  return Boolean(providedToken && store.adminTokens.includes(providedToken));
}

// ================= API ROUTES =================

// 1. Admin Login & Verification
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  if (password.trim() === store.adminPassword.trim()) {
    const token = crypto.randomBytes(24).toString('hex');
    store.adminTokens.push(token);
    saveAppData(store);
    res.json({ success: true, token });
    return;
  }

  res.status(401).json({ error: 'Invalid admin credentials' });
});

app.get('/api/admin/verify', (req: Request, res: Response) => {
  const token = (req.headers['x-admin-token'] as string) || (req.headers.authorization?.slice(7) ?? '');
  const isValid = !!token && store.adminTokens.includes(token);
  res.json({ authenticated: isValid });
});

app.post('/api/admin/change-password', requireAdminAuth, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    res.status(400).json({ error: 'New password must be at least 4 characters long' });
    return;
  }

  store.adminPassword = newPassword.trim();
  saveAppData(store);
  res.json({ success: true, message: 'Admin password updated and persisted directly in the backend' });
});

// 2. Games in Play & Past Games Review
app.get('/api/games', (_req: Request, res: Response) => {
  const gamesWithCardCount = store.games.map((g) => {
    const cards = store.cards[g.id] || [];
    const outcome = g.outcome || (g.status === 'CONCLUDED' ? computeGameOutcome(g, cards) : undefined);
    return {
      ...g,
      cardCount: cards.length,
      outcome,
    };
  });
  res.json({ games: gamesWithCardCount });
});

// Get a single game with outcome and cards count
app.get('/api/games/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const game = store.games.find((g) => g.id === id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  const cards = store.cards[id] || [];
  const outcome = game.outcome || (game.status === 'CONCLUDED' ? computeGameOutcome(game, cards) : undefined);
  res.json({
    game: {
      ...game,
      cardCount: cards.length,
      outcome,
    },
  });
});

// Review game outcome, results, winners, and pilot cards (no archival - permanently preserved)
app.get('/api/games/:id/outcome', (req: Request, res: Response) => {
  const { id } = req.params;
  const game = store.games.find((g) => g.id === id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  const cards = store.cards[id] || [];
  const outcome = game.outcome || computeGameOutcome(game, cards);
  res.json({
    success: true,
    game: {
      ...game,
      cardCount: cards.length,
      outcome,
    },
    outcome,
    winners: game.winners || outcome.winners || [],
    approvedPrizes: game.approvedPrizes || [],
    cards,
    cardCount: cards.length,
  });
});

app.post('/api/games', requireAdminAuth, (req: Request, res: Response) => {
  const { referenceNumber, fleetName, fcName, date, gridSize, status } = req.body;
  if (!referenceNumber || !fleetName) {
    res.status(400).json({ error: 'Reference number and fleet name are required' });
    return;
  }

  const newGame: StoredGame = {
    id: `game-${Date.now()}`,
    referenceNumber: referenceNumber.trim().toUpperCase(),
    fleetName: fleetName.trim(),
    fcName: (fcName || 'Fleet Commander').trim(),
    date: (date || new Date().toUTCString().slice(5, 22) + ' EVE').trim(),
    gridSize: [3, 5, 7].includes(Number(gridSize)) ? (Number(gridSize) as 3 | 5 | 7) : 3,
    status: status === 'FORMING' ? 'FORMING' : 'ACTIVE',
    createdAt: Date.now(),
  };

  store.games = [newGame, ...store.games];
  if (!store.cards[newGame.id]) {
    store.cards[newGame.id] = [];
  }
  saveAppData(store);

  res.status(201).json({ game: newGame });
});

// Admin-only: Update game status (e.g. CONCLUDED when ending game) & persist outcome
app.patch('/api/games/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, winners, outcome } = req.body;
  const game = store.games.find((g) => g.id === id);

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (status) {
    game.status = status;
    if (status === 'CONCLUDED' && !game.finishedAt) {
      game.finishedAt = Date.now();
    }
  }
  if (winners) {
    game.winners = winners;
  }
  if (status === 'CONCLUDED' || game.status === 'CONCLUDED') {
    game.outcome = outcome || computeGameOutcome(game, store.cards[id] || [], winners);
  }
  saveAppData(store);

  res.json({ success: true, game, outcome: game.outcome });
});

// Admin-only: Approve or Reject a Prize Claim (once approved, the game unpauses and can continue)
app.post('/api/games/:id/prize-approval', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { claimId, action, cardUpdate } = req.body; // action: 'approve' | 'reject'
  const game = store.games.find((g) => g.id === id);

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const claims = game.pendingPrizeClaims || [];
  if (claims.length === 0) {
    res.status(400).json({ error: 'No pending prize claims for this fleet game' });
    return;
  }

  const claimsToProcess =
    claimId === 'ALL'
      ? [...claims]
      : claims.filter((c) => c.id === claimId);

  if (claimsToProcess.length === 0) {
    res.status(404).json({ error: 'Prize claim not found' });
    return;
  }

  if (!game.approvedPrizes) {
    game.approvedPrizes = [];
  }

  for (const claim of claimsToProcess) {
    if (action === 'approve') {
      const alreadyApproved = game.approvedPrizes.some(
        (p) => p.pilotName.toLowerCase() === claim.pilotName.toLowerCase() && p.tier === claim.tier
      );
      if (!alreadyApproved) {
        game.approvedPrizes.push({
          id: claim.id,
          pilotName: claim.pilotName,
          avatarUrl: claim.avatarUrl,
          tier: claim.tier,
          tierTitle: claim.tierTitle,
          tierBadge: claim.tierBadge,
          lineLabel: claim.lineLabel,
          approvedAt: Date.now(),
        });
      }

      // Assign winner badges and complete game if Full House
      if (claim.tier === 'TOP_PRIZE') {
        game.fullHouseWinner = claim.pilotName;
        game.fullHouseWinnerAvatar = claim.avatarUrl;
        game.status = 'CONCLUDED';
        game.finishedAt = Date.now();

        const existingWinners = Array.isArray(game.winners) ? (game.winners as any[]) : [];
        const hasMe = existingWinners.some(
          (w: any) => w.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
        );
        if (!hasMe) {
          existingWinners.unshift({
            rank: 1,
            pilotName: claim.pilotName,
            avatarUrl: claim.avatarUrl,
            prizeTier: 'Top Prize "Full house"',
            prizeBadge: 'TOP PRIZE',
            tierType: 'TOP_PRIZE',
            completedSquares: game.gridSize * game.gridSize,
            totalSquares: game.gridSize * game.gridSize,
            winningLines: ['Full House (All Squares)'],
            allTiers: [
              { tier: 'TOP_PRIZE', title: 'Top Prize "Full house"', badge: 'TOP PRIZE', count: 1 },
            ],
          });
          game.winners = existingWinners;
        }
        game.outcome = computeGameOutcome(game, store.cards[id] || [], existingWinners);
      } else if (claim.tier === 'TIER_4') {
        game.tier4Winner = claim.pilotName;
        game.tier4WinnerAvatar = claim.avatarUrl;
        if (game.status === 'CONCLUDED' || game.outcome) {
          game.outcome = computeGameOutcome(game, store.cards[id] || []);
        }
      } else if (claim.tier === 'TIER_3') {
        game.tier3Winner = claim.pilotName;
        game.tier3WinnerAvatar = claim.avatarUrl;
        if (game.status === 'CONCLUDED' || game.outcome) {
          game.outcome = computeGameOutcome(game, store.cards[id] || []);
        }
      } else if (claim.tier === 'TIER_2') {
        game.tier2Winner = claim.pilotName;
        game.tier2WinnerAvatar = claim.avatarUrl;
        if (game.status === 'CONCLUDED' || game.outcome) {
          game.outcome = computeGameOutcome(game, store.cards[id] || []);
        }
      }
    } else if (action === 'reject') {
      // Find all cards associated with this claim / pilot in store.cards
      const gameCards = store.cards[id] || [];
      const matchingCards = gameCards.filter(
        (c) => c.id === claim.cardId || c.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
      );
      for (const card of matchingCards) {
        card.rejectedCount = (card.rejectedCount || 0) + 1;
        if (card.rejectedCount >= 3) {
          card.isClosed = true;
          card.closedReason = 'Card closed: 3 prize claims rejected by FC Admin.';
        }

        // Apply deselected squares to player card if provided
        if (cardUpdate && Array.isArray(cardUpdate.squares)) {
          card.squares = cardUpdate.squares;
          card.checkedCount =
            typeof cardUpdate.checkedCount === 'number'
              ? cardUpdate.checkedCount
              : cardUpdate.squares.flat().filter((sq: any) => sq.isChecked).length;
        }

        card.lastUpdated = Date.now();
      }

      // If any card for this pilot is closed, remove any remaining pending claims from this pilot
      const isPilotClosed = matchingCards.some((c) => c.isClosed || (c.rejectedCount || 0) >= 3);
      if (isPilotClosed && game.pendingPrizeClaims) {
        game.pendingPrizeClaims = game.pendingPrizeClaims.filter(
          (c) => c.pilotName.toLowerCase() !== claim.pilotName.toLowerCase()
        );
      }
    }

    // Remove processed claim from pending
    game.pendingPrizeClaims = game.pendingPrizeClaims?.filter((c) => c.id !== claim.id) || [];
  }

  // Once all pending claims are approved or rejected, unpause the game so it can continue!
  if (!game.pendingPrizeClaims || game.pendingPrizeClaims.length === 0) {
    game.isPausedForApproval = false;
  }

  saveAppData(store);
  res.json({
    success: true,
    game,
    cards: store.cards[id] || [],
    processedCount: claimsToProcess.length,
  });
});

// Admin-only: Delete games in play
app.delete('/api/games/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const gameIndex = store.games.findIndex((g) => g.id === id);

  if (gameIndex === -1) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const deletedGame = store.games[gameIndex];
  store.games.splice(gameIndex, 1);
  delete store.cards[id];
  saveAppData(store);

  res.json({ success: true, message: `Game ${deletedGame.referenceNumber} deleted`, deletedId: id });
});

// Cache for avatar lookups: name -> avatarUrl
const avatarCache: Record<string, { url: string; timestamp: number }> = {};

// Public: Look up capsuleer avatar from zKillboard
app.get('/api/avatar/lookup', async (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'Character name is required' });
    return;
  }

  const cacheKey = name.toLowerCase();
  const cached = avatarCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < 3600000 * 24) {
    res.json({ success: true, avatarUrl: cached.url, source: 'cache' });
    return;
  }

  try {
    const searchUrl = `https://zkillboard.com/search/${encodeURIComponent(name)}/`;
    let characterId: string | null = null;

    try {
      const zkillRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'NPSI-Bingo/1.0 (Capsuleer Avatar Lookup; keacte@gmail.com)',
        },
        redirect: 'follow',
      });

      // 1. If zKillboard redirected directly to character page: /character/12345/
      const urlMatch = zkillRes.url.match(/\/character\/([0-9]+)\/?/);
      if (urlMatch && urlMatch[1]) {
        characterId = urlMatch[1];
      } else if (zkillRes.ok) {
        const html = await zkillRes.text();
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Check for portrait image directly in the search results
        const exactRegex = new RegExp(`href="/character/([0-9]+)/"[^>]*>.*?alt="([^"]*${esc}[^"]*)"`, 'i');
        const exactMatch = html.match(exactRegex);

        if (exactMatch && exactMatch[1]) {
          characterId = exactMatch[1];
        } else {
          // Check for eve image URL pattern
          const imgMatch = html.match(/(?:images\.evetech\.net|image\.eveonline\.com)\/characters\/([0-9]+)\/portrait/i);
          if (imgMatch && imgMatch[1]) {
            characterId = imgMatch[1];
          } else {
            const generalMatch = html.match(/href="\/character\/([0-9]+)\/"[^>]*>.*?alt="([^"]+)"/i);
            if (generalMatch && generalMatch[1]) {
              characterId = generalMatch[1];
            }
          }
        }
      }
    } catch (zkillErr) {
      console.warn('zKillboard direct lookup warning:', zkillErr);
    }

    // 2. Reliable ESI fallback if character ID was not found on zKillboard
    if (!characterId) {
      try {
        const esiRes = await fetch('https://esi.evetech.net/latest/universe/ids/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([name]),
        });
        if (esiRes.ok) {
          const esiData = (await esiRes.json()) as { characters?: Array<{ id: number; name: string }> };
          if (esiData.characters && esiData.characters.length > 0) {
            characterId = String(esiData.characters[0].id);
          }
        }
      } catch (esiErr) {
        console.warn('ESI universe IDs lookup fallback warning:', esiErr);
      }
    }

    if (characterId) {
      const avatarUrl = `https://images.evetech.net/characters/${characterId}/portrait?size=128`;
      avatarCache[cacheKey] = { url: avatarUrl, timestamp: Date.now() };
      res.json({ success: true, characterId, avatarUrl, source: 'zkillboard' });
      return;
    }

    res.json({ success: false, error: 'Character not found on zKillboard' });
  } catch (err) {
    console.error('Avatar lookup error:', err);
    res.status(500).json({ success: false, error: 'Internal server error looking up avatar' });
  }
});

// 3. Cards on a Game
app.get('/api/games/:gameId/cards', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const cards = store.cards[gameId] || [];
  res.json({ cards });
});

// Register or join a card on a game
app.post('/api/games/:gameId/cards', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { card } = req.body;

  if (!card || !card.id || !card.pilotName) {
    res.status(400).json({ error: 'Invalid card payload' });
    return;
  }

  const game = store.games.find((g) => g.id === gameId);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  // Prevent joining a concluded game
  if (game.status === 'CONCLUDED' || (game as StoredGame & { fullHouseWinner?: string }).fullHouseWinner) {
    res.status(400).json({ error: 'Cannot join: This game has concluded.' });
    return;
  }

  if (!store.cards[gameId]) {
    store.cards[gameId] = [];
  }

  // Check if player has already had cards closed or accumulated 3 rejections in this game
  const existingPlayerCards = store.cards[gameId].filter(
    (c) => c.id === card.id || c.pilotName.toLowerCase() === card.pilotName.toLowerCase()
  );
  const existingRejections = existingPlayerCards.reduce(
    (max, c) => Math.max(max, c.rejectedCount || 0),
    0
  );
  const wasClosed = existingPlayerCards.some((c) => c.isClosed || (c.rejectedCount || 0) >= 3);

  if (wasClosed || existingRejections >= 3) {
    res.status(403).json({
      error: 'Cannot register card: You have 3 rejected prize claims on this fleet game. This card is closed.',
      isClosed: true,
      rejectedCount: Math.max(existingRejections, 3),
    });
    return;
  }

  // Remove previous card instance before storing new state
  store.cards[gameId] = store.cards[gameId].filter(
    (c) => c.id !== card.id && c.pilotName.toLowerCase() !== card.pilotName.toLowerCase()
  );

  const storedCard: StoredCard = {
    ...card,
    gameId,
    rejectedCount: Math.max(card.rejectedCount || 0, existingRejections),
    isClosed: card.isClosed || existingRejections >= 3,
    closedReason: card.closedReason || (existingRejections >= 3 ? 'Card closed: 3 prize claims rejected by FC Admin.' : undefined),
    lastUpdated: Date.now(),
  };

  store.cards[gameId].push(storedCard);
  saveAppData(store);

  res.status(201).json({ card: storedCard });
});

// Player updating their own card squares
app.put('/api/games/:gameId/cards/:cardId', (req: Request, res: Response) => {
  const { gameId, cardId } = req.params;
  const { squares, checkedCount } = req.body;

  const gameCards = store.cards[gameId];
  if (!gameCards) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const targetCard = gameCards.find((c) => c.id === cardId);
  if (!targetCard) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const game = store.games.find((g) => g.id === gameId);
  const isAdmin = checkIsAdmin(req);

  // If card is closed (e.g. 3 rejected claims), players cannot mark squares, but admin can uncheck/rollback
  if (!isAdmin && (targetCard.isClosed || (targetCard.rejectedCount || 0) >= 3)) {
    res.status(403).json({
      error: 'This bingo card has been closed: 3 prize claims were rejected by the FC Admin. No further squares can be marked.',
      isClosed: true,
      rejectedCount: targetCard.rejectedCount || 3,
      card: targetCard,
    });
    return;
  }

  // If game is concluded, only admin can roll back / modify squares
  if (!isAdmin && game && (game.status === 'CONCLUDED' || !!game.fullHouseWinner)) {
    res.status(400).json({
      error: 'This fleet game has concluded. No further squares can be marked.',
      gameFinished: true,
      fullHouseWinner: game.fullHouseWinner,
      card: targetCard,
    });
    return;
  }

  // If game is paused awaiting FC Admin prize approval, only admin can roll back / modify squares
  if (!isAdmin && game && game.isPausedForApproval && (game.pendingPrizeClaims || []).length > 0) {
    const firstPending = game.pendingPrizeClaims![0];
    res.status(423).json({
      error: `Game is paused awaiting FC Admin approval of ${firstPending.pilotName}'s ${firstPending.tierTitle}.`,
      isPausedForApproval: true,
      pendingPrizeClaims: game.pendingPrizeClaims,
      card: targetCard,
    });
    return;
  }

  if (Array.isArray(squares)) {
    targetCard.squares = squares;
  }
  if (typeof checkedCount === 'number') {
    targetCard.checkedCount = checkedCount;
  } else if (Array.isArray(squares)) {
    targetCard.checkedCount = squares.flat().filter((sq) => sq.isChecked).length;
  }
  targetCard.lastUpdated = Date.now();

  // If admin rolled back squares, clear any pending claims that are no longer achieved
  if (isAdmin && game && game.pendingPrizeClaims) {
    const evalResult = evaluateCard(targetCard.squares as unknown as BingoSquare[][]);
    game.pendingPrizeClaims = game.pendingPrizeClaims.filter((claim) => {
      if (claim.cardId !== cardId && claim.pilotName.toLowerCase() !== targetCard.pilotName.toLowerCase()) {
        return true;
      }
      const match = evalResult.tiers.find((t) => t.tier === claim.tier);
      return match?.unlocked ?? false;
    });
    if (game.pendingPrizeClaims.length === 0) {
      game.isPausedForApproval = false;
    }
  }

  // Evaluate card against prize tiers
  let newClaim: PendingPrizeClaim | null = null;

  if (game && Array.isArray(squares) && squares.length > 0) {
    if (!game.pendingPrizeClaims) game.pendingPrizeClaims = [];
    if (!game.approvedPrizes) game.approvedPrizes = [];

    const evalResult = evaluateCard(squares);
    const hasFullHouse = evalResult.tiers.find((t) => t.tier === 'TOP_PRIZE')?.unlocked;
    const hasTier4 = evalResult.tiers.find((t) => t.tier === 'TIER_4')?.unlocked;
    const hasTier3 = evalResult.tiers.find((t) => t.tier === 'TIER_3')?.unlocked;
    const hasTier2 = evalResult.tiers.find((t) => t.tier === 'TIER_2')?.unlocked;
    const hasTier1 = evalResult.tiers.find((t) => t.tier === 'TIER_1')?.unlocked;

    // Helper to check if a pending claim already exists
    const hasPendingClaim = (tier: string) =>
      game.pendingPrizeClaims?.some(
        (c) => c.pilotName.toLowerCase() === targetCard.pilotName.toLowerCase() && c.tier === tier
      );

    // Helper to check if already approved
    const hasApproved = (tier: string) =>
      game.approvedPrizes?.some(
        (p) => p.pilotName.toLowerCase() === targetCard.pilotName.toLowerCase() && p.tier === tier
      );

    // 1. Full House (Top Prize)
    if (hasFullHouse && !game.fullHouseWinner && !hasPendingClaim('TOP_PRIZE') && !hasApproved('TOP_PRIZE')) {
      newClaim = {
        id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gameId,
        cardId: targetCard.id,
        pilotName: targetCard.pilotName,
        avatarUrl: targetCard.avatarUrl,
        tier: 'TOP_PRIZE',
        tierTitle: 'Top Prize "Full house"',
        tierBadge: 'TOP PRIZE',
        lineLabel: 'Full House (All Squares Completed)',
        submittedAt: Date.now(),
      };
    }
    // 2. Tier 4 (4 Corners)
    else if (hasTier4 && !game.tier4Winner && !hasPendingClaim('TIER_4') && !hasApproved('TIER_4')) {
      newClaim = {
        id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gameId,
        cardId: targetCard.id,
        pilotName: targetCard.pilotName,
        avatarUrl: targetCard.avatarUrl,
        tier: 'TIER_4',
        tierTitle: 'Tier 4 Prize',
        tierBadge: 'TIER 4',
        lineLabel: '4 Corners',
        submittedAt: Date.now(),
      };
    }
    // 3. Tier 3 (Diagonal Line)
    else if (hasTier3 && !game.tier3Winner && !hasPendingClaim('TIER_3') && !hasApproved('TIER_3')) {
      const diagLine = evalResult.winningLines.find((l) => l.tier === 'TIER_3');
      newClaim = {
        id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gameId,
        cardId: targetCard.id,
        pilotName: targetCard.pilotName,
        avatarUrl: targetCard.avatarUrl,
        tier: 'TIER_3',
        tierTitle: 'Tier 3 Prize',
        tierBadge: 'TIER 3',
        lineLabel: diagLine?.label || 'Diagonal through Center',
        submittedAt: Date.now(),
      };
    }
    // 4. Tier 2 (Center Line)
    else if (hasTier2 && !game.tier2Winner && !hasPendingClaim('TIER_2') && !hasApproved('TIER_2')) {
      const centerLine = evalResult.winningLines.find((l) => l.tier === 'TIER_2');
      newClaim = {
        id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gameId,
        cardId: targetCard.id,
        pilotName: targetCard.pilotName,
        avatarUrl: targetCard.avatarUrl,
        tier: 'TIER_2',
        tierTitle: 'Tier 2 Prize',
        tierBadge: 'TIER 2',
        lineLabel: centerLine?.label || 'Center Line Win',
        submittedAt: Date.now(),
      };
    }
    // 5. Tier 1 (Line Win)
    else if (hasTier1 && !hasPendingClaim('TIER_1') && !hasApproved('TIER_1')) {
      const lineWin = evalResult.winningLines.find((l) => l.tier === 'TIER_1');
      newClaim = {
        id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gameId,
        cardId: targetCard.id,
        pilotName: targetCard.pilotName,
        avatarUrl: targetCard.avatarUrl,
        tier: 'TIER_1',
        tierTitle: 'Tier 1 Prize',
        tierBadge: 'TIER 1',
        lineLabel: lineWin?.label || 'Line Win (Horizontal / Vertical)',
        submittedAt: Date.now(),
      };
    }

    if (newClaim) {
      game.pendingPrizeClaims.push(newClaim);
      game.isPausedForApproval = true;
    }
  }

  saveAppData(store);

  res.json({
    card: targetCard,
    game,
    isPausedForApproval: game?.isPausedForApproval || false,
    pendingPrizeClaims: game?.pendingPrizeClaims || [],
    newClaim,
    gameFinished: game?.status === 'CONCLUDED' || !!game?.fullHouseWinner,
    fullHouseWinner: game?.fullHouseWinner,
  });
});

// Admin-only: Delete cards on a game
app.delete('/api/games/:gameId/cards/:cardId', requireAdminAuth, (req: Request, res: Response) => {
  const { gameId, cardId } = req.params;
  const gameCards = store.cards[gameId];

  if (!gameCards) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const index = gameCards.findIndex((c) => c.id === cardId);
  if (index === -1) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const removed = gameCards.splice(index, 1)[0];
  saveAppData(store);

  res.json({ success: true, message: `Card for ${removed.pilotName} deleted from game`, deletedCardId: cardId });
});

// Admin-only: Reject a player's card (increments rejected count; if 3 rejections, closes the card)
app.post('/api/games/:gameId/cards/:cardId/reject', requireAdminAuth, (req: Request, res: Response) => {
  const { gameId, cardId } = req.params;
  const gameCards = store.cards[gameId];
  if (!gameCards) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const targetCard = gameCards.find((c) => c.id === cardId);
  if (!targetCard) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  // Increment rejections across all cards for this pilot in this game
  const matchingCards = gameCards.filter(
    (c) => c.id === cardId || c.pilotName.toLowerCase() === targetCard.pilotName.toLowerCase()
  );

  for (const c of matchingCards) {
    c.rejectedCount = (c.rejectedCount || 0) + 1;
    if (c.rejectedCount >= 3) {
      c.isClosed = true;
      c.closedReason = 'Card closed: 3 prize claims rejected by FC Admin.';
    }
    c.lastUpdated = Date.now();
  }

  // If pilot's card is now closed, also dismiss any pending claims for this pilot
  const game = store.games.find((g) => g.id === gameId);
  if (game && targetCard.isClosed && game.pendingPrizeClaims) {
    game.pendingPrizeClaims = game.pendingPrizeClaims.filter(
      (claim) => claim.pilotName.toLowerCase() !== targetCard.pilotName.toLowerCase()
    );
    if (game.pendingPrizeClaims.length === 0) {
      game.isPausedForApproval = false;
    }
  }

  saveAppData(store);
  res.json({
    success: true,
    card: targetCard,
    isClosed: targetCard.isClosed || false,
    rejectedCount: targetCard.rejectedCount || 0,
    game,
  });
});

// Admin-only: Reopen a closed card
app.post('/api/games/:gameId/cards/:cardId/reopen', requireAdminAuth, (req: Request, res: Response) => {
  const { gameId, cardId } = req.params;
  const gameCards = store.cards[gameId];
  if (!gameCards) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const targetCard = gameCards.find((c) => c.id === cardId);
  if (!targetCard) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const matchingCards = gameCards.filter(
    (c) => c.id === cardId || c.pilotName.toLowerCase() === targetCard.pilotName.toLowerCase()
  );

  for (const c of matchingCards) {
    c.isClosed = false;
    c.rejectedCount = 0;
    delete c.closedReason;
    c.lastUpdated = Date.now();
  }

  saveAppData(store);
  res.json({ success: true, card: targetCard });
});

// Admin-only: Roll back any member's card (uncheck all squares or deselect specific squares)
app.post('/api/games/:gameId/cards/:cardId/rollback', requireAdminAuth, (req: Request, res: Response) => {
  const { gameId, cardId } = req.params;
  const { mode, row, col } = req.body; // mode: 'all' | 'single'

  const gameCards = store.cards[gameId];
  if (!gameCards) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const targetCard = gameCards.find((c) => c.id === cardId);
  if (!targetCard) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  if (mode === 'single' && typeof row === 'number' && typeof col === 'number') {
    if (targetCard.squares[row] && targetCard.squares[row][col]) {
      const sq = targetCard.squares[row][col];
      if (!sq.isFree) {
        sq.isChecked = !sq.isChecked;
      }
    }
  } else {
    // Default or mode === 'all': roll back all marked squares
    targetCard.squares = targetCard.squares.map((r) =>
      r.map((sq) => (sq.isFree ? sq : { ...sq, isChecked: false }))
    );
  }

  targetCard.checkedCount = targetCard.squares.flat().filter((sq) => sq.isChecked).length;
  targetCard.lastUpdated = Date.now();

  const game = store.games.find((g) => g.id === gameId);
  if (game && game.pendingPrizeClaims) {
    const evalResult = evaluateCard(targetCard.squares as unknown as BingoSquare[][]);
    game.pendingPrizeClaims = game.pendingPrizeClaims.filter((claim) => {
      if (claim.cardId !== cardId && claim.pilotName.toLowerCase() !== targetCard.pilotName.toLowerCase()) {
        return true;
      }
      const match = evalResult.tiers.find((t) => t.tier === claim.tier);
      return match?.unlocked ?? false;
    });
    if (game.pendingPrizeClaims.length === 0) {
      game.isPausedForApproval = false;
    }
  }

  saveAppData(store);
  res.json({
    success: true,
    card: targetCard,
    game,
    message: `Card for ${targetCard.pilotName} rolled back successfully`,
  });
});

// Admin-only: Save custom updated squares for any card (deselect or check)
app.put('/api/games/:gameId/cards/:cardId/admin-update', requireAdminAuth, (req: Request, res: Response) => {
  const { gameId, cardId } = req.params;
  const { squares, checkedCount } = req.body;

  const gameCards = store.cards[gameId];
  if (!gameCards) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const targetCard = gameCards.find((c) => c.id === cardId);
  if (!targetCard) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  if (Array.isArray(squares)) {
    targetCard.squares = squares;
    targetCard.checkedCount =
      typeof checkedCount === 'number'
        ? checkedCount
        : squares.flat().filter((sq: any) => sq.isChecked).length;
  }

  targetCard.lastUpdated = Date.now();

  const game = store.games.find((g) => g.id === gameId);
  if (game && game.pendingPrizeClaims) {
    const evalResult = evaluateCard(targetCard.squares as unknown as BingoSquare[][]);
    game.pendingPrizeClaims = game.pendingPrizeClaims.filter((claim) => {
      if (claim.cardId !== cardId && claim.pilotName.toLowerCase() !== targetCard.pilotName.toLowerCase()) {
        return true;
      }
      const match = evalResult.tiers.find((t) => t.tier === claim.tier);
      return match?.unlocked ?? false;
    });
    if (game.pendingPrizeClaims.length === 0) {
      game.isPausedForApproval = false;
    }
  }

  saveAppData(store);
  res.json({ success: true, card: targetCard, game });
});

// 5. Bingo Calls Management
app.get('/api/calls', (_req: Request, res: Response) => {
  if (!store.calls || store.calls.length === 0) {
    store.calls = [...INITIAL_BINGO_CALLS];
    saveAppData(store);
  }
  res.json({ calls: store.calls });
});

// Add new bingo call (requires FC admin)
app.post('/api/calls', requireAdminAuth, (req: Request, res: Response) => {
  const { text, category, isActive } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Call text is required' });
    return;
  }

  const validCategories = ['FC', 'FLEET', 'COMBAT', 'MEMES'];
  const cat = validCategories.includes(category) ? category : 'FLEET';

  if (!store.calls) {
    store.calls = [...INITIAL_BINGO_CALLS];
  }

  const newCall: BingoCallItem = {
    id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim().toUpperCase(),
    category: cat as 'FC' | 'FLEET' | 'COMBAT' | 'MEMES',
    isActive: typeof isActive === 'boolean' ? isActive : true,
  };

  store.calls.unshift(newCall);
  saveAppData(store);

  res.status(201).json({ success: true, call: newCall, calls: store.calls });
});

// Update / Toggle bingo call active status or edit text/category (requires FC admin)
app.put('/api/calls/:callId', requireAdminAuth, (req: Request, res: Response) => {
  const { callId } = req.params;
  const { isActive, text, category } = req.body;

  if (!store.calls) {
    store.calls = [...INITIAL_BINGO_CALLS];
  }

  const target = store.calls.find((c) => c.id === callId);
  if (!target) {
    res.status(404).json({ error: 'Call not found' });
    return;
  }

  if (typeof isActive === 'boolean') {
    target.isActive = isActive;
  }
  if (text && typeof text === 'string' && text.trim()) {
    target.text = text.trim().toUpperCase();
  }
  if (category && ['FC', 'FLEET', 'COMBAT', 'MEMES'].includes(category)) {
    target.category = category as 'FC' | 'FLEET' | 'COMBAT' | 'MEMES';
  }

  saveAppData(store);
  res.json({ success: true, call: target, calls: store.calls });
});

// Delete / Omit bingo call (requires FC admin)
app.delete('/api/calls/:callId', requireAdminAuth, (req: Request, res: Response) => {
  const { callId } = req.params;

  if (!store.calls) {
    store.calls = [...INITIAL_BINGO_CALLS];
  }

  const beforeLen = store.calls.length;
  store.calls = store.calls.filter((c) => c.id !== callId);

  if (store.calls.length === beforeLen) {
    res.status(404).json({ error: 'Call not found' });
    return;
  }

  saveAppData(store);
  res.json({ success: true, calls: store.calls });
});

// Reset calls to default repository (requires FC admin)
app.post('/api/calls/reset', requireAdminAuth, (_req: Request, res: Response) => {
  store.calls = [...INITIAL_BINGO_CALLS];
  saveAppData(store);
  res.json({ success: true, calls: store.calls });
});

// Setup Vite or Static Serve
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NPSI BINGO] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
