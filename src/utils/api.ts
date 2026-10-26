import { BingoCard, BingoGame, BoardSize, GameOutcome } from '../types/bingo';
import { BingoCallItem } from '../data/defaultCalls';

export interface ApiGame extends BingoGame {
  cardCount?: number;
}

export const api = {
  // Admin Auth
  async adminLogin(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }
      return { success: true, token: data.token };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  async adminVerify(token: string): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      return !!data.authenticated;
    } catch {
      return false;
    }
  },

  async adminChangePassword(
    newPassword: string,
    token: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update password' };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Games in Play
  async getGames(): Promise<ApiGame[]> {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      return data.games || [];
    } catch {
      return [];
    }
  },

  async createGame(
    gameData: {
      referenceNumber: string;
      fleetName: string;
      fcName: string;
      date: string;
      gridSize: BoardSize;
      status?: 'ACTIVE' | 'FORMING';
    },
    token: string
  ): Promise<{ success: boolean; game?: ApiGame; error?: string }> {
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(gameData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create game' };
      }
      return { success: true, game: data.game };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  async updateGameStatus(
    gameId: string,
    status: 'ACTIVE' | 'FORMING' | 'CONCLUDED',
    token: string,
    winners?: unknown[],
    outcome?: unknown
  ): Promise<{ success: boolean; game?: ApiGame; outcome?: GameOutcome; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ status, winners, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update game status' };
      }
      return { success: true, game: data.game, outcome: data.outcome };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Review game outcome, results, winners, and cards (never archived, persisted on backend)
  async getGameOutcome(gameId: string): Promise<{
    success: boolean;
    game?: ApiGame;
    outcome?: GameOutcome;
    winners?: any[];
    approvedPrizes?: any[];
    cards?: BingoCard[];
    cardCount?: number;
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/games/${gameId}/outcome`);
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to fetch game outcomes' };
      }
      return {
        success: true,
        game: data.game,
        outcome: data.outcome,
        winners: data.winners,
        approvedPrizes: data.approvedPrizes,
        cards: data.cards,
        cardCount: data.cardCount,
      };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  async deleteGame(gameId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete game' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Admin: Approve or Reject a Prize Claim
  async approvePrizeClaim(
    gameId: string,
    claimId: string,
    action: 'approve' | 'reject',
    token: string,
    cardUpdate?: { cardId?: string; squares: BingoCard['squares']; checkedCount?: number }
  ): Promise<{ success: boolean; game?: ApiGame; cards?: BingoCard[]; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/prize-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ claimId, action, cardUpdate }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to process prize approval' };
      }
      return { success: true, game: data.game, cards: data.cards };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Cards on a Game
  async getGameCards(gameId: string): Promise<BingoCard[]> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards`);
      const data = await res.json();
      return data.cards || [];
    } catch {
      return [];
    }
  },

  async registerCard(gameId: string, card: BingoCard): Promise<BingoCard | null> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card }),
      });
      const data = await res.json();
      return data.card || null;
    } catch {
      return null;
    }
  },

  async updateCardSquares(
    gameId: string,
    cardId: string,
    squares: BingoCard['squares'],
    checkedCount: number
  ): Promise<{ success: boolean; gameFinished?: boolean; fullHouseWinner?: string; error?: string; game?: ApiGame }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squares, checkedCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error,
          gameFinished: data.gameFinished,
          fullHouseWinner: data.fullHouseWinner,
        };
      }
      return {
        success: true,
        gameFinished: data.gameFinished,
        fullHouseWinner: data.fullHouseWinner,
        game: data.game,
      };
    } catch {
      return { success: false };
    }
  },

  async deleteCard(
    gameId: string,
    cardId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete card' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Admin: Reject a player's card
  async rejectCard(
    gameId: string,
    cardId: string,
    token: string
  ): Promise<{ success: boolean; card?: BingoCard; error?: string; isClosed?: boolean; rejectedCount?: number }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}/reject`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reject card' };
      }
      return { success: true, card: data.card, isClosed: data.isClosed, rejectedCount: data.rejectedCount };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Admin: Reopen a closed card
  async reopenCard(
    gameId: string,
    cardId: string,
    token: string
  ): Promise<{ success: boolean; card?: BingoCard; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}/reopen`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reopen card' };
      }
      return { success: true, card: data.card };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Admin: Roll back all squares on a player's card
  async rollbackCardAll(
    gameId: string,
    cardId: string,
    token: string
  ): Promise<{ success: boolean; card?: BingoCard; game?: ApiGame; message?: string; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ mode: 'all' }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to roll back card' };
      }
      return { success: true, card: data.card, game: data.game, message: data.message };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Admin: Toggle / deselect specific square on a player's card
  async adminToggleSquare(
    gameId: string,
    cardId: string,
    row: number,
    col: number,
    token: string
  ): Promise<{ success: boolean; card?: BingoCard; game?: ApiGame; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ mode: 'single', row, col }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to toggle square' };
      }
      return { success: true, card: data.card, game: data.game };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Admin: Save full squares payload on a player's card
  async adminUpdateCard(
    gameId: string,
    cardId: string,
    squares: BingoCard['squares'],
    checkedCount: number,
    token: string
  ): Promise<{ success: boolean; card?: BingoCard; game?: ApiGame; error?: string }> {
    try {
      const res = await fetch(`/api/games/${gameId}/cards/${cardId}/admin-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ squares, checkedCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update card' };
      }
      return { success: true, card: data.card, game: data.game };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  // Avatar lookup via zKillboard
  async lookupAvatar(name: string): Promise<string | null> {
    if (!name || !name.trim()) return null;
    try {
      const res = await fetch(`/api/avatar/lookup?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.success && data.avatarUrl) {
        return data.avatarUrl;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Bingo Calls Management
  async getBingoCalls(): Promise<BingoCallItem[]> {
    try {
      const res = await fetch('/api/calls');
      const data = await res.json();
      return Array.isArray(data.calls) ? data.calls : [];
    } catch {
      return [];
    }
  },

  async addBingoCall(
    text: string,
    category: 'FC' | 'FLEET' | 'COMBAT' | 'MEMES',
    isActive: boolean,
    token: string
  ): Promise<{ success: boolean; call?: BingoCallItem; calls?: BingoCallItem[]; error?: string }> {
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ text, category, isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to add bingo call' };
      }
      return { success: true, call: data.call, calls: data.calls };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  async updateBingoCall(
    callId: string,
    updates: Partial<BingoCallItem>,
    token: string
  ): Promise<{ success: boolean; call?: BingoCallItem; calls?: BingoCallItem[]; error?: string }> {
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update bingo call' };
      }
      return { success: true, call: data.call, calls: data.calls };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  async deleteBingoCall(
    callId: string,
    token: string
  ): Promise<{ success: boolean; calls?: BingoCallItem[]; error?: string }> {
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete bingo call' };
      }
      return { success: true, calls: data.calls };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },

  async resetBingoCalls(
    token: string
  ): Promise<{ success: boolean; calls?: BingoCallItem[]; error?: string }> {
    try {
      const res = await fetch('/api/calls/reset', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to reset bingo calls' };
      }
      return { success: true, calls: data.calls };
    } catch {
      return { success: false, error: 'Network error connecting to backend' };
    }
  },
};
