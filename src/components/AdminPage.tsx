import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Trash2,
  Plus,
  ArrowLeft,
  Lock,
  Key,
  Radio,
  Users,
  Grid,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X,
  LogOut,
  RefreshCw,
  Trophy,
  Download,
  Copy,
  Sparkles,
  Check,
  ListChecks,
  Search,
  Edit2,
  EyeOff,
  RotateCcw,
  Volume2,
  Pause,
} from 'lucide-react';
import { ApiGame, api } from '../utils/api';
import { BingoCard, BoardSize } from '../types/bingo';
import { BingoCallItem } from '../data/defaultCalls';
import { BrandLogo } from './BrandLogo';
import { soundFX } from '../utils/audio';
import { selectGameWinners, createWinnersPngFile, WinnerResult } from '../utils/winnersExport';
import { GameOutcomesModal } from './GameOutcomesModal';

interface AdminPageProps {
  onBackToPortal: () => void;
  onReturnToActiveGame?: () => void;
  hasActiveGame?: boolean;
  adminToken: string | null;
  onAdminAuthChange: (token: string | null) => void;
  onRefreshData?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  onBackToPortal,
  onReturnToActiveGame,
  hasActiveGame = false,
  adminToken,
  onAdminAuthChange,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'games' | 'cards' | 'create' | 'calls' | 'security' | 'outcomes'>('games');
  const [reviewingGameOutcome, setReviewingGameOutcome] = useState<ApiGame | null>(null);

  // Login form state
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Games and Cards data
  const [games, setGames] = useState<ApiGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [gameCards, setGameCards] = useState<BingoCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Bingo Calls management state
  const [calls, setCalls] = useState<BingoCallItem[]>([]);
  const [, setLoadingCalls] = useState(false);
  const [callsSearchQuery, setCallsSearchQuery] = useState('');
  const [callsCategoryFilter, setCallsCategoryFilter] = useState<'ALL' | 'FC' | 'FLEET' | 'COMBAT' | 'MEMES'>('ALL');
  const [callsStatusFilter, setCallsStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [newCallText, setNewCallText] = useState('');
  const [newCallCategory, setNewCallCategory] = useState<'FC' | 'FLEET' | 'COMBAT' | 'MEMES'>('FC');
  const [newCallActive, setNewCallActive] = useState(true);
  const [callsMsg, setCallsMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [editingCallText, setEditingCallText] = useState('');
  const [editingCallCategory, setEditingCallCategory] = useState<'FC' | 'FLEET' | 'COMBAT' | 'MEMES'>('FC');
  const [editingCallActive, setEditingCallActive] = useState(true);
  const [callToDelete, setCallToDelete] = useState<BingoCallItem | null>(null);

  // Create Game form
  const [newRefNumber, setNewRefNumber] = useState(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newFleetName, setNewFleetName] = useState('FUN inc Sunday Roam');
  const [newFcName, setNewFcName] = useState('FC Boba');
  const [newDate, setNewDate] = useState('27 Sep 2026 · 19:30 EVE');
  const [newGridSize, setNewGridSize] = useState<BoardSize>(3);
  const [createMsg, setCreateMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Change Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Deletion confirmation modals
  const [gameToDelete, setGameToDelete] = useState<ApiGame | null>(null);
  const [cardToDelete, setCardToDelete] = useState<{ gameId: string; card: BingoCard } | null>(null);
  const [inspectCard, setInspectCard] = useState<BingoCard | null>(null);

  // End Game & Winners Modal State
  const [concludedWinnersModal, setConcludedWinnersModal] = useState<{
    game: ApiGame;
    winners: WinnerResult[];
    pngDataUrl?: string;
  } | null>(null);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [copiedWinners, setCopiedWinners] = useState(false);
  const [outcomesSearch, setOutcomesSearch] = useState('');
  const [outcomesFilter, setOutcomesFilter] = useState<'ALL' | 'CONCLUDED'>('ALL');

  // Load games from backend
  const loadGames = async () => {
    setIsLoading(true);
    try {
      const fetched = await api.getGames();
      setGames(fetched);
      if (fetched.length > 0 && !selectedGameId) {
        setSelectedGameId(fetched[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load cards for selected game
  const loadCardsForGame = async (gameId: string) => {
    if (!gameId) return;
    try {
      const fetched = await api.getGameCards(gameId);
      setGameCards(fetched);
    } catch {
      setGameCards([]);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadCardsForGame(selectedGameId);
    }
  }, [selectedGameId]);

  // Real-time background sync while admin is viewing the console
  useEffect(() => {
    if (!adminToken) return;
    const interval = setInterval(() => {
      api.getGames().then((fetched) => {
        if (fetched) setGames(fetched);
      });
      if (selectedGameId) {
        api.getGameCards(selectedGameId).then((cards) => {
          if (cards) setGameCards(cards);
        });
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [adminToken, selectedGameId]);

  // Audible beep notification when new pending prize claims arrive
  const knownPendingClaimsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const allPending = games.flatMap((g) => g.pendingPrizeClaims || []);
    let shouldBeep = false;
    for (const claim of allPending) {
      if (!knownPendingClaimsRef.current.has(claim.id)) {
        knownPendingClaimsRef.current.add(claim.id);
        shouldBeep = true;
      }
    }
    if (shouldBeep) {
      soundFX.playAdminAlertBeep();
    }
  }, [games]);

  const [approvingClaimId, setApprovingClaimId] = useState<string | null>(null);

  // Approve or Reject a Prize Claim
  const handleApprovePrizeClaim = async (
    gameId: string,
    claimId: string,
    action: 'approve' | 'reject',
    cardUpdate?: { cardId?: string; squares: BingoCard['squares']; checkedCount?: number }
  ) => {
    if (!adminToken) return;
    setApprovingClaimId(claimId);
    try {
      let resolvedUpdate = cardUpdate;
      if (action === 'reject' && !resolvedUpdate) {
        const game = games.find((g) => g.id === gameId);
        const claim = game?.pendingPrizeClaims?.find((c) => c.id === claimId);
        if (claim) {
          const matchingInspect =
            inspectCard &&
            (inspectCard.id === claim.cardId ||
              inspectCard.pilotName.toLowerCase() === claim.pilotName.toLowerCase())
              ? inspectCard
              : null;
          const matchingCard =
            matchingInspect ||
            gameCards.find(
              (c) =>
                c.id === claim.cardId || c.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
            );
          if (matchingCard) {
            resolvedUpdate = {
              cardId: matchingCard.id,
              squares: matchingCard.squares,
              checkedCount: matchingCard.checkedCount,
            };
          }
        }
      }

      const res = await api.approvePrizeClaim(gameId, claimId, action, adminToken, resolvedUpdate);
      if (res.success && res.game) {
        soundFX.playClaimButton1();
        setGames((prev) => prev.map((g) => (g.id === gameId ? res.game! : g)));
        if (res.cards && res.cards.length > 0) {
          setGameCards(res.cards);
          if (inspectCard) {
            const updatedInspect = res.cards.find((c) => c.id === inspectCard.id);
            if (updatedInspect) {
              setInspectCard(updatedInspect);
            }
          }
        } else if (selectedGameId) {
          loadCardsForGame(selectedGameId);
        }
      }
    } finally {
      setApprovingClaimId(null);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoggingIn(true);
    setLoginError(null);

    const result = await api.adminLogin(passwordInput.trim());
    setIsLoggingIn(false);

    if (result.success && result.token) {
      soundFX.playTileClick(true);
      onAdminAuthChange(result.token);
      setPasswordInput('');
      loadGames();
    } else {
      setLoginError(result.error || 'Invalid credentials');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    onAdminAuthChange(null);
  };

  // Handle Create Game
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    if (!newRefNumber.trim() || !newFleetName.trim()) {
      setCreateMsg({ text: 'Reference number and fleet name are required.', isError: true });
      return;
    }

    const res = await api.createGame(
      {
        referenceNumber: newRefNumber.trim().toUpperCase(),
        fleetName: newFleetName.trim(),
        fcName: newFcName.trim() || 'Fleet Commander',
        date: newDate.trim() || '27 Sep 2026 · 19:30 EVE',
        gridSize: newGridSize,
        status: 'ACTIVE',
      },
      adminToken
    );

    if (res.success && res.game) {
      setCreateMsg({ text: `Fleet Game "${res.game.referenceNumber}" created successfully!` });
      setNewRefNumber(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
      await loadGames();
      setSelectedGameId(res.game.id);
      setActiveTab('games');
      onRefreshData?.();
    } else {
      setCreateMsg({ text: res.error || 'Failed to create game', isError: true });
    }
  };

  // Handle Delete Game in Play
  const confirmDeleteGame = async () => {
    if (!adminToken || !gameToDelete) return;

    const res = await api.deleteGame(gameToDelete.id, adminToken);
    if (res.success) {
      soundFX.playTileClick(false);
      setGameToDelete(null);
      await loadGames();
      onRefreshData?.();
    } else {
      alert(res.error || 'Failed to delete game');
    }
  };

  // Handle Delete Card on Game
  const confirmDeleteCard = async () => {
    if (!adminToken || !cardToDelete) return;

    const res = await api.deleteCard(cardToDelete.gameId, cardToDelete.card.id, adminToken);
    if (res.success) {
      soundFX.playTileClick(false);
      setCardToDelete(null);
      await loadCardsForGame(cardToDelete.gameId);
      await loadGames();
      onRefreshData?.();
    } else {
      alert(res.error || 'Failed to delete card');
    }
  };

  // Handle Change Admin Password (Persisted directly in backend)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    if (newPassword.trim().length < 4) {
      setPassMsg({ text: 'New password must be at least 4 characters.', isError: true });
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPassMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }

    const res = await api.adminChangePassword(newPassword.trim(), adminToken);
    if (res.success) {
      setPassMsg({ text: 'Password successfully updated and persisted directly in backend!' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPassMsg({ text: res.error || 'Failed to change password.', isError: true });
    }
  };

  // Load bingo calls from backend
  const loadCalls = async () => {
    setLoadingCalls(true);
    try {
      const fetched = await api.getBingoCalls();
      setCalls(fetched);
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadCalls();
    }
  }, [adminToken]);

  // Activate / Deactivate a bingo call
  const handleToggleCallActive = async (call: BingoCallItem) => {
    if (!adminToken) return;
    const nextState = !call.isActive;
    soundFX.playTileClick(nextState);
    const res = await api.updateBingoCall(call.id, { isActive: nextState }, adminToken);
    if (res.success && res.calls) {
      setCalls(res.calls);
      setCallsMsg({ text: `Call "${call.text}" is now ${nextState ? 'ACTIVE' : 'DEACTIVATED (Omitted)'}.` });
      setTimeout(() => setCallsMsg(null), 3000);
    } else {
      setCallsMsg({ text: res.error || 'Failed to update call status', isError: true });
    }
  };

  // Add a new bingo call
  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const trimmed = newCallText.trim();
    if (!trimmed) {
      setCallsMsg({ text: 'Call text cannot be empty.', isError: true });
      return;
    }
    const res = await api.addBingoCall(trimmed, newCallCategory, newCallActive, adminToken);
    if (res.success && res.calls) {
      soundFX.playClaimButton1();
      setCalls(res.calls);
      setNewCallText('');
      setCallsMsg({ text: `Successfully added "${trimmed}" to calls repository!` });
      setTimeout(() => setCallsMsg(null), 3500);
    } else {
      setCallsMsg({ text: res.error || 'Failed to add bingo call', isError: true });
    }
  };

  // Confirm delete / omit a bingo call
  const handleConfirmDeleteCall = async () => {
    if (!adminToken || !callToDelete) return;
    const res = await api.deleteBingoCall(callToDelete.id, adminToken);
    if (res.success && res.calls) {
      soundFX.playTileClick(false);
      setCalls(res.calls);
      setCallToDelete(null);
      setCallsMsg({ text: 'Call omitted from repository.' });
      setTimeout(() => setCallsMsg(null), 3000);
    } else {
      setCallsMsg({ text: res.error || 'Failed to omit call', isError: true });
    }
  };

  const handleStartEditCall = (call: BingoCallItem) => {
    setEditingCallId(call.id);
    setEditingCallText(call.text);
    setEditingCallCategory(call.category);
    setEditingCallActive(call.isActive);
  };

  const handleSaveEditCall = async (callId: string) => {
    if (!adminToken) return;
    const trimmed = editingCallText.trim();
    if (!trimmed) {
      setCallsMsg({ text: 'Call text cannot be empty.', isError: true });
      return;
    }
    const res = await api.updateBingoCall(
      callId,
      { text: trimmed, category: editingCallCategory, isActive: editingCallActive },
      adminToken
    );
    if (res.success && res.calls) {
      soundFX.playTileClick(true);
      setCalls(res.calls);
      setCallsMsg({ text: `Bingo call "${trimmed}" successfully updated!` });
      setTimeout(() => setCallsMsg(null), 3000);
    } else {
      setCallsMsg({ text: res.error || 'Failed to update call', isError: true });
    }
  };

  const handleResetCalls = async () => {
    if (!adminToken) return;
    if (window.confirm('Reset all bingo calls back to default FUN inc calls repository?')) {
      const res = await api.resetBingoCalls(adminToken);
      if (res.success && res.calls) {
        setCalls(res.calls);
        setCallsMsg({ text: 'Repository reset to default bingo calls.' });
        setTimeout(() => setCallsMsg(null), 3000);
      }
    }
  };

  // Handle End Game: Select winners, drop them into a list, and create PNG with prize tiers
  const handleEndGame = async (game: ApiGame) => {
    if (!adminToken) return;
    setIsEndingGame(true);
    try {
      soundFX.playCCAppMenuEnter();

      // Fetch cards for this fleet game
      let cardsToEvaluate = gameCards;
      if (selectedGameId !== game.id || gameCards.length === 0) {
        cardsToEvaluate = await api.getGameCards(game.id);
      } else {
        const fresh = await api.getGameCards(game.id);
        if (fresh && fresh.length > 0) cardsToEvaluate = fresh;
      }

      // Select winners and compute prize tiers
      const winners = selectGameWinners(cardsToEvaluate, game.gridSize);

      const totalSquaresMarked = cardsToEvaluate.reduce(
        (acc, c) => acc + c.squares.flat().filter((sq) => sq.isChecked).length,
        0
      );
      const approved = game.approvedPrizes || [];
      const outcome = {
        concludedAt: Date.now(),
        totalPilots: cardsToEvaluate.length,
        totalSquaresMarked,
        fullHouseWinner: game.fullHouseWinner || winners.find((w) => w.tierType === 'TOP_PRIZE')?.pilotName,
        fullHouseWinnerAvatar: game.fullHouseWinnerAvatar || winners.find((w) => w.tierType === 'TOP_PRIZE')?.avatarUrl,
        approvedPrizes: approved,
        winners,
        summary: {
          tier1Count: approved.filter((p) => p.tier === 'TIER_1').length,
          tier2Count: approved.filter((p) => p.tier === 'TIER_2').length,
          tier3Count: approved.filter((p) => p.tier === 'TIER_3').length,
          tier4Count: approved.filter((p) => p.tier === 'TIER_4').length,
          fullHouseCount: approved.filter((p) => p.tier === 'TOP_PRIZE').length,
        },
      };

      // Mark game status as CONCLUDED in backend and persist outcome
      await api.updateGameStatus(game.id, 'CONCLUDED', adminToken, winners, outcome);

      // Generate & automatically trigger PNG download
      let pngUrl = '';
      try {
        pngUrl = await createWinnersPngFile(game, winners);
      } catch (err) {
        console.error('Failed to generate winners PNG:', err);
      }

      // Refresh games list in background
      await loadGames();
      onRefreshData?.();

      // Show concluded winners roster modal
      setConcludedWinnersModal({
        game: { ...game, status: 'CONCLUDED' },
        winners,
        pngDataUrl: pngUrl,
      });

      soundFX.playClaimButton1();
    } finally {
      setIsEndingGame(false);
    }
  };

  // Copy Winners list to clipboard (showing all wins in prize tier allocation)
  const handleCopyWinnersList = (game: ApiGame, winners: WinnerResult[]) => {
    let text = `🏆 **${game.fleetName} (${game.referenceNumber}) - OFFICIAL BINGO WINNERS** 🏆\n`;
    text += `FC: ${game.fcName} · Grid: ${game.gridSize}x${game.gridSize} · ${game.date}\n\n`;
    if (winners.length === 0) {
      text += `No registered pilot cards found for this fleet operation.\n`;
    } else {
      winners.forEach((w) => {
        const medal = w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : w.rank === 3 ? '🥉' : '🎖️';
        const allWins = w.allTiers && w.allTiers.length > 0
          ? w.allTiers.map((t) => (t.count > 1 ? `${t.badge} (x${t.count})` : t.badge)).join(', ')
          : w.prizeTier;
        text += `${medal} **#${w.rank} ${w.pilotName}** — **Prize Tier Allocation: ${allWins}** [${w.completedSquares}/${w.totalSquares} marked]\n`;
      });
    }
    text += `\no7 FUN inc & NPSI.ROCKS`;
    navigator.clipboard.writeText(text);
    setCopiedWinners(true);
    setTimeout(() => setCopiedWinners(false), 3000);
  };

  // If not authenticated, render Login Gate
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#08090e] text-slate-100 flex flex-col justify-between select-none font-['Inter']">
        <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onReturnToActiveGame || onBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-white border border-cyan-500/40 transition-colors text-xs font-mono cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            title="Return to Active Game"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>return to active game</span>
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo className="w-8 h-8 rounded-md" />
            <span className="font-mono text-sm tracking-wider uppercase text-purple-300">
              FC Administration
            </span>
          </div>
        </header>

        <main className="w-full max-w-md mx-auto px-4 my-auto">
          <div className="surface-elevated purple-glow rounded-xl p-6 sm:p-8 border border-purple-500/40 bg-[#0e0a18]/95 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-purple-950/80 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)] mb-3">
                <Shield className="w-7 h-7" />
              </div>
              <h1 className="display-font text-2xl text-white tracking-wide">
                FC Admin Clearance
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Enter backend-authorized passcode to access game management
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  Admin Passcode
                </label>
                <input
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="Enter admin password..."
                  className="w-full px-4 py-2.5 bg-[#07040e] border border-purple-500/40 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              {loginError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || !passwordInput.trim()}
                className="btn-primary w-full py-2.5 text-xs font-mono uppercase tracking-wider font-bold cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? 'Authenticating with Backend...' : 'Authenticate & Enter'}
              </button>
            </form>
          </div>
        </main>

        <footer className="w-full max-w-6xl mx-auto px-4 py-4 text-center text-xs font-mono text-slate-500">
          Backend Authenticated · NPSI Fleet Bingo Console
        </footer>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  const selectedGame = games.find((g) => g.id === selectedGameId);

  // All pending prize claims across all games in play
  const allPendingClaims = games.flatMap((g) =>
    (g.pendingPrizeClaims || []).map((c) => ({
      ...c,
      fleetName: g.fleetName,
      referenceNumber: g.referenceNumber,
    }))
  );

  // Filtered bingo calls for Calls Management tab
  const filteredCalls = calls.filter((c) => {
    const matchesSearch = c.text.toLowerCase().includes(callsSearchQuery.toLowerCase());
    const matchesCat = callsCategoryFilter === 'ALL' || c.category === callsCategoryFilter;
    const matchesStatus =
      callsStatusFilter === 'ALL'
        ? true
        : callsStatusFilter === 'ACTIVE'
        ? c.isActive
        : !c.isActive;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const activeCallsCount = calls.filter((c) => c.isActive).length;
  const omittedCallsCount = calls.length - activeCallsCount;
  const selectedEditingCall = calls.find((c) => c.id === editingCallId) || null;

  // Auto-select first call when viewing calls tab if none selected
  useEffect(() => {
    if (activeTab === 'calls' && calls.length > 0 && !editingCallId) {
      handleStartEditCall(calls[0]);
    }
  }, [activeTab, calls, editingCallId]);

  return (
    <div className="min-h-screen bg-[#08090e] text-slate-100 flex flex-col justify-between select-none font-['Inter']">
      {/* Top Header */}
      <header className="border-b border-purple-500/20 bg-[#0c0915]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnToActiveGame || onBackToPortal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-white border border-cyan-500/40 transition-colors text-xs font-mono cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              title="Return to Active Game"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>return to active game</span>
            </button>
            <BrandLogo className="w-8 h-8 rounded-md" />
            <div>
              <div className="display-font text-lg text-white leading-none">
                FC ADMIN COMMAND CONSOLE
              </div>
              <div className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mt-0.5">
                Backend Authority Active · Full Fleet Permissions
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                loadGames();
                if (selectedGameId) loadCardsForGame(selectedGameId);
              }}
              className="p-1.5 rounded bg-black/50 text-slate-400 hover:text-white border border-purple-500/20 hover:border-purple-500/40 text-xs font-mono cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-mono cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 pt-1 border-t border-purple-500/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'games'
                ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Games in Play ({games.length})</span>
            {games.reduce((acc, g) => acc + (g.pendingPrizeClaims?.length || 0), 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                {games.reduce((acc, g) => acc + (g.pendingPrizeClaims?.length || 0), 0)} PENDING APPROVAL
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outcomes')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'outcomes'
                ? 'border-amber-400 text-amber-300 font-bold bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Past Games & Outcomes ({games.filter((g) => g.status === 'CONCLUDED' || g.outcome).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cards'
                ? 'border-purple-400 text-purple-300 font-bold bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cards on a Game ({gameCards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-emerald-400 text-emerald-300 font-bold bg-emerald-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Broadcast New Game</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('calls');
              loadCalls();
            }}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'calls'
                ? 'border-purple-400 text-purple-300 font-bold bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Maintain Bingo Calls ({calls.filter((c) => c.isActive).length}/{calls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-amber-400 text-amber-300 font-bold bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Backend Password</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* PRIZE CLAIM APPROVAL ALERTS (ACROSS ALL GAMES) */}
        {allPendingClaims.length > 0 && (
            <div className="mb-6 surface-elevated rounded-2xl p-5 border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/80 via-[#1e1338]/90 to-amber-950/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="display-font text-base sm:text-lg text-white flex items-center gap-2">
                      <span>Prize Claims Awaiting FC Approval</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-mono">
                        {allPendingClaims.length} ACTION REQUIRED
                      </span>
                    </h3>
                    <p className="text-xs text-amber-200/80 font-mono">
                      Fleet game is <strong>paused for all pilots</strong> until you approve or reject each tier prize claim below.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => soundFX.playAdminAlertBeep()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Test Audible Beep"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Audible Beep</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allPendingClaims.map((claim) => {
                  const matchingCard = gameCards.find(
                    (c) => c.id === claim.cardId || c.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
                  );
                  const currentRejections = matchingCard?.rejectedCount || 0;

                  return (
                    <div
                      key={claim.id}
                      className="p-4 rounded-xl bg-black/70 border border-amber-500/40 flex flex-col justify-between gap-3 shadow-inner"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-950 border border-purple-400 shrink-0">
                            {claim.avatarUrl ? (
                              <img src={claim.avatarUrl} alt={claim.pilotName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-purple-400 m-3" />
                            )}
                          </div>
                          <div>
                            <div className="text-white font-bold text-base flex items-center gap-2">
                              <span>{claim.pilotName}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                                {claim.referenceNumber}
                              </span>
                              {currentRejections >= 3 ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                                  CARD CLOSED
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-amber-300 font-mono font-medium">{claim.tierTitle}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{claim.lineLabel}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-400 font-mono">Rejections:</span>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  currentRejections >= 2
                                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {currentRejections} / 3
                              </span>
                              {currentRejections >= 2 && (
                                <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">
                                  ⚠️ 3rd rejection closes card!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                          {claim.tierBadge}
                        </span>
                      </div>

                      <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-purple-500/20">
                        <button
                          type="button"
                          onClick={async () => {
                            let card = gameCards.find((c) => c.id === claim.cardId);
                            if (!card) {
                              const fetched = await api.getGameCards(claim.gameId);
                              card = fetched.find((c) => c.id === claim.cardId);
                            }
                            if (card) {
                              setInspectCard(card);
                            }
                          }}
                          className="text-cyan-400 hover:text-cyan-200 hover:underline flex items-center gap-1.5 font-mono text-xs font-semibold cursor-pointer group transition-colors"
                          title="View this pilot's bingo card grid to verify squares"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span>View Bingo Card to Review</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={approvingClaimId === claim.id}
                            onClick={() => {
                              const card =
                                (inspectCard &&
                                (inspectCard.id === claim.cardId ||
                                  inspectCard.pilotName.toLowerCase() === claim.pilotName.toLowerCase())
                                  ? inspectCard
                                  : null) ||
                                gameCards.find(
                                  (c) =>
                                    c.id === claim.cardId ||
                                    c.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
                                );
                              handleApprovePrizeClaim(
                                claim.gameId,
                                claim.id,
                                'reject',
                                card
                                  ? {
                                      cardId: card.id,
                                      squares: card.squares,
                                      checkedCount: card.checkedCount,
                                    }
                                  : undefined
                              );
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono cursor-pointer transition-all disabled:opacity-50"
                          >
                            {currentRejections >= 2 ? 'Reject Claim (Closes Card)' : 'Reject Claim'}
                          </button>
                          <button
                            type="button"
                            disabled={approvingClaimId === claim.id}
                            onClick={() => handleApprovePrizeClaim(claim.gameId, claim.id, 'approve')}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Approve Prize & Continue Game</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        )}

        {/* TAB 1: GAMES IN PLAY */}
        {activeTab === 'games' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="display-font text-xl text-white">Active Games in Play</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Only the FC Admin has authority to delete games in play or inspect active frequencies.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="btn-primary px-3.5 py-1.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Broadcast New Game</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.length === 0 ? (
                <div className="col-span-full p-8 rounded-xl bg-[#150D22]/60 border border-purple-500/20 text-center space-y-3">
                  <p className="text-sm text-slate-400 font-mono">No games currently in play.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    Broadcast First Fleet Game
                  </button>
                </div>
              ) : (
                games.map((game) => (
                  <div
                    key={game.id}
                    className="surface-elevated rounded-xl p-4 border border-purple-500/30 bg-[#0e0a18]/90 flex flex-col justify-between gap-4 shadow-lg hover:border-purple-500/50 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold tracking-wider">
                            {game.referenceNumber}
                          </span>
                          {game.status === 'CONCLUDED' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                              CONCLUDED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {game.gridSize}x{game.gridSize} Grid
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-white truncate">
                        {game.fleetName}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-300 font-mono">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                          <span>FC: <strong className="text-white">{game.fcName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{game.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-400">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{game.cardCount || 0} active cards on this game</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGameId(game.id);
                            setActiveTab('cards');
                          }}
                          className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 text-purple-300 hover:text-white cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Manage Cards</span>
                        </button>

                        {/* Review Outcomes & Results Button */}
                        <button
                          type="button"
                          onClick={() => setReviewingGameOutcome(game)}
                          className="px-2.5 py-1.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 border border-cyan-500/50 text-xs font-mono flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                          title="Review results, prize claims, and outcomes permanently saved in backend"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Review Outcomes</span>
                        </button>

                        {/* End Game & Select Winners Button */}
                        <button
                          type="button"
                          onClick={() => handleEndGame(game)}
                          disabled={isEndingGame}
                          className="px-2.5 py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 text-amber-300 hover:text-amber-100 border border-amber-500/50 text-xs font-mono flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:shadow-[0_0_18px_rgba(245,158,11,0.5)] font-semibold"
                          title="End Game, select winners, and download prize tier PNG"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isEndingGame ? 'Ending...' : game.status === 'CONCLUDED' ? 'Winners PNG' : 'End Game'}</span>
                        </button>
                      </div>

                      {/* Admin-only Delete Game in Play */}
                      <button
                        type="button"
                        onClick={() => setGameToDelete(game)}
                        className="px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                        title="Admin only: Delete Game in Play"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Game</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CARDS ON A GAME */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="display-font text-xl text-white">Cards on a Game</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Only the FC Admin has authority to inspect and delete player cards on a game.
                </p>
              </div>

              {/* Game Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono uppercase text-slate-400">Fleet Game:</label>
                <select
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="px-3 py-1.5 bg-[#150D22] border border-purple-500/40 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.referenceNumber} - {g.fleetName} ({g.gridSize}x{g.gridSize})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedGame && (
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-cyan-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Viewing Fleet: <strong>{selectedGame.referenceNumber}</strong> - {selectedGame.fleetName} (FC: {selectedGame.fcName})
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-purple-300 font-bold">{gameCards.length} Registered Cards</span>
                  {selectedGame.status === 'CONCLUDED' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                      CONCLUDED
                    </span>
                  )}
                </div>

                {/* End Game & Select Winners Button in Cards View */}
                <button
                  type="button"
                  onClick={() => handleEndGame(selectedGame)}
                  disabled={isEndingGame}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(245,158,11,0.5)] transition-all hover:scale-105"
                  title="End Game, select winners, and download prize tier PNG"
                >
                  <Trophy className="w-3.5 h-3.5 text-black" />
                  <span>{isEndingGame ? 'Ending Game...' : 'End Game & Select Winners'}</span>
                </button>
              </div>
            )}

            <div className="space-y-2">
              {gameCards.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#150D22]/60 border border-purple-500/20 text-center space-y-2">
                  <p className="text-sm text-slate-400 font-mono">
                    No player cards registered on this fleet game yet.
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Cards appear here in real time as pilots enter their name and join this game.
                  </p>
                </div>
              ) : (
                gameCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3.5 rounded-lg bg-[#150D22]/80 border border-purple-500/20 hover:border-purple-500/40 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Pilot avatar thumbnail */}
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#160c29] border border-purple-500/40 shrink-0 flex items-center justify-center">
                        {card.avatarUrl ? (
                          <img src={card.avatarUrl} alt={card.pilotName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-purple-400" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">
                            {card.pilotName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {card.size}x{card.size} Grid
                          </span>
                          {card.isClosed || (card.rejectedCount || 0) >= 3 ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600 text-white font-bold border border-rose-400 flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                              <X className="w-3 h-3 stroke-[3]" />
                              CARD CLOSED (3/3 REJECTIONS)
                            </span>
                          ) : (card.rejectedCount || 0) > 0 ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold">
                              Rejections: {card.rejectedCount}/3
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                          <span>
                            Marked Squares: <strong className="text-cyan-300">{card.checkedCount}</strong> / {card.size * card.size}
                          </span>
                          <span>·</span>
                          <span>Last updated: {new Date(card.lastUpdated).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setInspectCard(card)}
                        className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                        title="Preview card"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Edit</span>
                      </button>

                      {/* Admin-only: Roll Back Card (Uncheck all marked squares) */}
                      {selectedGameId && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!adminToken) return;
                            const res = await api.rollbackCardAll(selectedGameId, card.id, adminToken);
                            if (res.success && res.card) {
                              setGameCards((prev) => prev.map((c) => (c.id === card.id ? res.card! : c)));
                              soundFX.playClaimButton1();
                            }
                          }}
                          className="px-2.5 py-1.5 rounded bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                          title="Roll back and uncheck all squares on this member's card"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                          <span>Roll Back Squares</span>
                        </button>
                      )}

                      {/* Admin-only: Reject player card */}
                      {selectedGameId && !(card.isClosed || (card.rejectedCount || 0) >= 3) && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!adminToken) return;
                            const res = await api.rejectCard(selectedGameId, card.id, adminToken);
                            if (res.success && res.card) {
                              setGameCards((prev) => prev.map((c) => (c.id === card.id ? res.card! : c)));
                            }
                          }}
                          className="px-2.5 py-1.5 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                          title="Reject this player's card (3 rejections closes card)"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Reject ({(card.rejectedCount || 0)}/3)</span>
                        </button>
                      )}

                      {/* Admin-only: Reopen player card */}
                      {selectedGameId && (card.isClosed || (card.rejectedCount || 0) >= 3) && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!adminToken) return;
                            const res = await api.reopenCard(selectedGameId, card.id, adminToken);
                            if (res.success && res.card) {
                              setGameCards((prev) => prev.map((c) => (c.id === card.id ? res.card! : c)));
                            }
                          }}
                          className="px-2.5 py-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                          title="Reopen this closed card"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Reopen Card</span>
                        </button>
                      )}

                      {/* Admin-only Delete Card on Game */}
                      <button
                        type="button"
                        onClick={() => selectedGameId && setCardToDelete({ gameId: selectedGameId, card })}
                        className="px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                        title="Admin only: Delete card on this game"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Card</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BROADCAST NEW GAME */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <div className="surface-elevated rounded-xl p-6 border border-purple-500/30 bg-[#0e0a18]/90 shadow-xl space-y-5">
              <div className="border-b border-purple-500/20 pb-3">
                <h2 className="display-font text-xl text-white">Broadcast New Fleet Game</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Configure and broadcast an operational fleet game with custom grid size.
                </p>
              </div>

              {createMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    createMsg.isError
                      ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {createMsg.isError ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{createMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateGame} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Reference / Fleet Number *
                    </label>
                    <input
                      type="text"
                      value={newRefNumber}
                      onChange={(e) => setNewRefNumber(e.target.value)}
                      placeholder="e.g. FLT-108, REF-4091"
                      className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Fleet Commander (FC) *
                    </label>
                    <input
                      type="text"
                      value={newFcName}
                      onChange={(e) => setNewFcName(e.target.value)}
                      placeholder="e.g. FC Boba"
                      className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Fleet Operation Name *
                  </label>
                  <input
                    type="text"
                    value={newFleetName}
                    onChange={(e) => setNewFleetName(e.target.value)}
                    placeholder="e.g. FUN inc Sunday Roam"
                    className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Date & EVE Time
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="e.g. 27 Sep 2026 · 19:30 EVE"
                    className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                    Tactical Grid Size Selection
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([3, 5, 7] as BoardSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setNewGridSize(size)}
                        className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                          newGridSize === size
                            ? 'bg-purple-900/60 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                            : 'bg-[#150D22] border-purple-500/20 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="display-font text-base text-cyan-300">
                          {size}x{size}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5">
                          {size * size} Squares
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-500/15 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary px-6 py-2.5 text-xs font-mono uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Broadcast Fleet Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: MAINTAIN BINGO CALLS - CALLS ON THE LEFT, EDITING ON THE RIGHT */}
        {activeTab === 'calls' && (
          <div className="space-y-6">
            {/* Top Banner / Stats */}
            <div className="surface-elevated rounded-xl p-5 border border-purple-500/30 bg-[#0e0a18]/90 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Grid className="w-5 h-5 text-purple-400" />
                    <h2 className="display-font text-xl text-white">Bingo Calls Repository</h2>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Maintain, add, omit, activate, or deactivate bingo calls. Only active calls are used when new cards are generated.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCalls}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 text-xs font-mono cursor-pointer transition-colors"
                    title="Reset all calls back to official FUN inc fleet defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Defaults</span>
                  </button>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#150D22] border border-purple-500/20 flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] uppercase">Total Calls</span>
                  <span className="text-lg font-bold text-white">{calls.length}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-1">
                  <span className="text-emerald-400 text-[10px] uppercase">Active in Rotation</span>
                  <span className="text-lg font-bold text-emerald-300">{activeCallsCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 flex flex-col gap-1">
                  <span className="text-rose-400 text-[10px] uppercase">Omitted / Inactive</span>
                  <span className="text-lg font-bold text-rose-300">{omittedCallsCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex flex-col gap-1">
                  <span className="text-cyan-400 text-[10px] uppercase">Active Pool Ratio</span>
                  <span className="text-lg font-bold text-cyan-300">
                    {calls.length > 0 ? Math.round((activeCallsCount / calls.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              {callsMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    callsMsg.isError
                      ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {callsMsg.isError ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{callsMsg.text}</span>
                </div>
              )}
            </div>

            {/* TWO-COLUMN LAYOUT: CALLS ON THE LEFT, EDITING ON THE RIGHT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: ALL BINGO CALLS VIEWABLE & FILTERABLE */}
              <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
                {/* Search & Filter Toolbar */}
                <div className="surface-elevated rounded-xl p-4 border border-purple-500/30 bg-[#0e0a18]/90 flex flex-col gap-3 text-xs font-mono">
                  {/* Search input */}
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={callsSearchQuery}
                      onChange={(e) => setCallsSearchQuery(e.target.value)}
                      placeholder="Search all bingo calls by keyword or phrase..."
                      className="w-full pl-9 pr-8 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                    />
                    {callsSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCallsSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-500/15">
                    {/* Status filter buttons */}
                    <div className="flex items-center gap-1 p-0.5 bg-black/40 rounded-lg border border-purple-500/20">
                      {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setCallsStatusFilter(st)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                            callsStatusFilter === st
                              ? 'bg-purple-600 text-white font-bold shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {st === 'ALL'
                            ? `All (${calls.length})`
                            : st === 'ACTIVE'
                            ? `Active (${activeCallsCount})`
                            : `Omitted (${omittedCallsCount})`}
                        </button>
                      ))}
                    </div>

                    {/* Category filter buttons */}
                    <div className="flex items-center gap-1 p-0.5 bg-black/40 rounded-lg border border-purple-500/20 flex-wrap">
                      {(['ALL', 'FC', 'FLEET', 'COMBAT', 'MEMES'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCallsCategoryFilter(cat)}
                          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                            callsCategoryFilter === cat
                              ? 'bg-cyan-600 text-white font-bold shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* THE CALLS LIST (ALL BINGO CALLS VISIBLE) */}
                <div className="surface-elevated rounded-xl border border-purple-500/30 bg-[#0e0a18]/90 overflow-hidden shadow-xl flex flex-col">
                  <div className="p-3 border-b border-purple-500/20 bg-[#150D22]/60 flex items-center justify-between text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Bingo Calls Pool</span>
                      <span className="text-[11px] text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                        {filteredCalls.length} of {calls.length} calls
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      Click call to edit on right · Toggle badge to change status
                    </span>
                  </div>

                  <div className="divide-y divide-purple-500/15 max-h-[720px] overflow-y-auto thin-scrollbar">
                    {filteredCalls.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 font-mono text-xs space-y-2">
                        <Grid className="w-8 h-8 text-purple-400/40 mx-auto" />
                        <p className="text-slate-300 font-semibold">No bingo calls found matching filters.</p>
                        <p className="text-slate-500 text-[11px]">Try clearing search or changing the category filter.</p>
                      </div>
                    ) : (
                      filteredCalls.map((call) => {
                        const isSelected = editingCallId === call.id;

                        const catBadgeStyle =
                          call.category === 'FC'
                            ? 'bg-purple-950/70 text-purple-300 border-purple-500/40'
                            : call.category === 'FLEET'
                            ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40'
                            : call.category === 'COMBAT'
                            ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                            : 'bg-amber-950/70 text-amber-300 border-amber-500/40';

                        return (
                          <div
                            key={call.id}
                            onClick={() => handleStartEditCall(call)}
                            className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-purple-900/30 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(0,240,255,0.08)]'
                                : call.isActive
                                ? 'hover:bg-purple-500/5 bg-transparent border-l-4 border-transparent'
                                : 'bg-black/30 opacity-70 hover:opacity-90 border-l-4 border-transparent'
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                              {/* Quick status toggle button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleCallActive(call);
                                }}
                                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider uppercase border shrink-0 cursor-pointer transition-all ${
                                  call.isActive
                                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-300'
                                    : 'bg-rose-950/60 border-rose-500/40 text-rose-400 hover:bg-emerald-950/60 hover:border-emerald-500/50 hover:text-emerald-300'
                                }`}
                                title={call.isActive ? 'Click to deactivate/omit call' : 'Click to activate call'}
                              >
                                {call.isActive ? 'ACTIVE' : 'OMITTED'}
                              </button>

                              {/* Category badge */}
                              <span
                                className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold tracking-wider shrink-0 ${catBadgeStyle}`}
                              >
                                {call.category}
                              </span>

                              {/* Call text */}
                              <span
                                className={`font-mono text-xs leading-snug break-words flex-1 ${
                                  isSelected
                                    ? 'text-white font-semibold'
                                    : call.isActive
                                    ? 'text-slate-200'
                                    : 'text-slate-500 line-through'
                                }`}
                              >
                                {call.text}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pl-1">
                              {isSelected ? (
                                <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
                                  <Edit2 className="w-3 h-3 text-cyan-400" />
                                  <span className="hidden sm:inline">Editing</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditCall(call);
                                  }}
                                  className="p-1 rounded bg-black/40 hover:bg-purple-950/80 text-slate-400 hover:text-cyan-300 border border-purple-500/20 text-xs transition-colors"
                                  title="Edit this call on the right"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCallToDelete(call);
                                }}
                                className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs transition-colors"
                                title="Permanently omit/delete call"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: EDITING ON THE RIGHT & ADDING NEW CALLS */}
              <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-20">
                {/* 1. EDIT SELECTED BINGO CALL */}
                <div className="surface-elevated rounded-xl p-5 border border-purple-500/40 bg-[#0e0a18]/95 shadow-[0_0_30px_rgba(168,85,247,0.25)] space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <div className="flex items-center gap-2 text-white font-mono text-sm font-semibold">
                      <Edit2 className="w-4 h-4 text-cyan-400" />
                      <span>Edit Bingo Call</span>
                    </div>

                    {selectedEditingCall && (
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold tracking-wider ${
                          editingCallActive
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {editingCallActive ? 'ACTIVE IN ROTATION' : 'OMITTED'}
                      </span>
                    )}
                  </div>

                  {selectedEditingCall ? (
                    <div className="space-y-4">
                      {/* Call Text */}
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Call Text / Fleet Phrase *</span>
                          <span className="text-[10px] text-slate-500">{editingCallText.length} chars</span>
                        </label>
                        <textarea
                          rows={3}
                          value={editingCallText}
                          onChange={(e) => setEditingCallText(e.target.value)}
                          placeholder="ENTER BINGO PHRASE..."
                          className="w-full px-3 py-2.5 bg-[#07040e] border border-cyan-500/40 focus:border-cyan-400 rounded-lg text-white font-mono text-xs uppercase tracking-wide focus:outline-none resize-none"
                        />
                      </div>

                      {/* Category Selector */}
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                          Category
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['FC', 'FLEET', 'COMBAT', 'MEMES'] as const).map((cat) => {
                            const isCatActive = editingCallCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setEditingCallCategory(cat)}
                                className={`py-2 px-1 rounded-lg border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                                  isCatActive
                                    ? cat === 'FC'
                                      ? 'bg-purple-900/70 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                      : cat === 'FLEET'
                                      ? 'bg-cyan-900/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                      : cat === 'COMBAT'
                                      ? 'bg-rose-900/70 border-rose-400 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                                      : 'bg-amber-900/70 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                                    : 'bg-[#150D22]/80 border-purple-500/20 text-slate-400 hover:text-white'
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active / Omitted Status Toggle */}
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                          Rotation Status
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditingCallActive(!editingCallActive)}
                          className={`w-full p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            editingCallActive
                              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/70'
                              : 'bg-rose-950/50 border-rose-500/40 text-rose-200 hover:bg-rose-950/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-left">
                            <div
                              className={`p-1.5 rounded-md ${
                                editingCallActive ? 'bg-emerald-900/80 text-emerald-300' : 'bg-rose-900/80 text-rose-300'
                              }`}
                            >
                              {editingCallActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-bold tracking-wide">
                                {editingCallActive ? 'ACTIVE IN ROTATION' : 'OMITTED / INACTIVE'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {editingCallActive
                                  ? 'Included when generating new player bingo cards'
                                  : 'Excluded from newly generated player bingo cards'}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                              editingCallActive
                                ? 'bg-emerald-900/90 text-emerald-200 border-emerald-400'
                                : 'bg-rose-900/90 text-rose-200 border-rose-400'
                            }`}
                          >
                            {editingCallActive ? 'Active' : 'Omitted'}
                          </span>
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-purple-500/15">
                        <button
                          type="button"
                          onClick={() => setCallToDelete(selectedEditingCall)}
                          className="px-3 py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 text-xs font-mono cursor-pointer transition-colors flex items-center gap-1.5"
                          title="Delete / omit this call permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleStartEditCall(selectedEditingCall);
                            }}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent text-xs font-mono cursor-pointer transition-colors"
                          >
                            Revert
                          </button>

                          <button
                            type="button"
                            disabled={!editingCallText.trim()}
                            onClick={() => handleSaveEditCall(selectedEditingCall.id)}
                            className="btn-primary px-4 py-2 text-xs font-mono uppercase font-bold tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 font-mono text-xs space-y-2">
                      <Grid className="w-8 h-8 text-purple-400/40 mx-auto" />
                      <p className="text-slate-300 font-semibold">No call selected</p>
                      <p className="text-slate-500 text-[11px]">
                        Click on any call from the list on the left to edit its text, category, or status.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. ADD NEW BINGO CALL CARD */}
                <div className="surface-elevated rounded-xl p-5 border border-purple-500/30 bg-[#0e0a18]/90 shadow-xl space-y-3.5">
                  <div className="flex items-center gap-2 text-white font-mono text-sm font-semibold border-b border-purple-500/15 pb-2.5">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Add New Bingo Call</span>
                  </div>

                  <form onSubmit={handleAddCall} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                        New Call Text *
                      </label>
                      <input
                        type="text"
                        value={newCallText}
                        onChange={(e) => setNewCallText(e.target.value)}
                        placeholder="e.g. FC ASKS FLEET TO OVERHEAT GUNS..."
                        className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400 uppercase tracking-wide placeholder:normal-case placeholder:text-slate-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                          Category
                        </label>
                        <select
                          value={newCallCategory}
                          onChange={(e) => setNewCallCategory(e.target.value as 'FC' | 'FLEET' | 'COMBAT' | 'MEMES')}
                          className="w-full px-2.5 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                        >
                          <option value="FC">FC</option>
                          <option value="FLEET">FLEET</option>
                          <option value="COMBAT">COMBAT</option>
                          <option value="MEMES">MEMES</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                          Initial Status
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewCallActive(!newCallActive)}
                          className={`w-full py-2 px-2.5 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                            newCallActive
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                          }`}
                        >
                          {newCallActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{newCallActive ? 'Active' : 'Omitted'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={!newCallText.trim()}
                        className="btn-primary w-full py-2 text-xs font-mono uppercase font-bold tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Call to Repository</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BACKEND PASSWORD MANAGEMENT */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto">
            <div className="surface-elevated rounded-xl p-6 border border-purple-500/30 bg-[#0e0a18]/90 shadow-xl space-y-5">
              <div className="border-b border-purple-500/20 pb-3">
                <h2 className="display-font text-xl text-white">Backend Admin Password</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  The admin passcode is managed, verified, and persisted directly in the backend data store.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-emerald-200">Backend Persistence Active</strong>
                  Passwords are saved to disk on the server and persist across app reloads, restarts, and sessions.
                </div>
              </div>

              {passMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    passMsg.isError
                      ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {passMsg.isError ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    New Admin Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPassMsg(null);
                    }}
                    placeholder="Enter new password (min 4 chars)..."
                    className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPassMsg(null);
                    }}
                    placeholder="Re-enter new password..."
                    className="w-full px-3 py-2 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="pt-3 border-t border-purple-500/15 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary px-6 py-2.5 text-xs font-mono uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Save & Persist Password in Backend
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: PAST GAMES & OUTCOMES (PERMANENT BACKEND STORAGE) */}
        {activeTab === 'outcomes' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="display-font text-xl text-white">Past Games, Results & Outcomes</h2>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                    PERMANENT BACKEND RECORD
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  All bingo games, winners, approved prizes, and card markings are saved in the backend and never archived. Review them anytime.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadGames}
                  className="px-3 py-1.5 rounded-lg bg-[#150D22] border border-purple-500/30 text-purple-200 hover:text-white hover:border-cyan-400 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Records</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="surface-elevated p-3 rounded-xl border border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOutcomesFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    outcomesFilter === 'ALL'
                      ? 'bg-purple-600 text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                      : 'bg-black/40 text-slate-400 hover:text-slate-200 border border-purple-500/20'
                  }`}
                >
                  All Operations ({games.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomesFilter('CONCLUDED')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    outcomesFilter === 'CONCLUDED'
                      ? 'bg-emerald-600 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'bg-black/40 text-slate-400 hover:text-slate-200 border border-purple-500/20'
                  }`}
                >
                  Concluded Fleets ({games.filter((g) => g.status === 'CONCLUDED' || g.outcome).length})
                </button>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={outcomesSearch}
                  onChange={(e) => setOutcomesSearch(e.target.value)}
                  placeholder="Filter by fleet, FC, REF..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#07040e] border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const filtered = games.filter((g) => {
                  if (outcomesFilter === 'CONCLUDED' && g.status !== 'CONCLUDED' && !g.outcome) return false;
                  if (!outcomesSearch.trim()) return true;
                  const q = outcomesSearch.toLowerCase();
                  return (
                    g.referenceNumber.toLowerCase().includes(q) ||
                    g.fleetName.toLowerCase().includes(q) ||
                    g.fcName.toLowerCase().includes(q) ||
                    (g.fullHouseWinner && g.fullHouseWinner.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="col-span-full p-8 text-center text-slate-400 font-mono text-sm surface-elevated rounded-xl border border-purple-500/20">
                      No game records matching criteria found in backend storage.
                    </div>
                  );
                }

                return filtered.map((game) => {
                  const isConcluded = game.status === 'CONCLUDED' || Boolean(game.fullHouseWinner);
                  const outcome = game.outcome;

                  return (
                    <div
                      key={game.id}
                      className="surface-elevated rounded-xl p-4 border border-purple-500/25 bg-[#0e0a18]/90 flex flex-col justify-between space-y-3.5 shadow-lg hover:border-purple-400/50 transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold tracking-wider">
                            {game.referenceNumber}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                              isConcluded
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {isConcluded ? 'CONCLUDED' : 'IN PLAY'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-white truncate" title={game.fleetName}>
                            {game.fleetName}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                            <span className="text-purple-300">FC: {game.fcName}</span>
                            <span>·</span>
                            <span>{game.date}</span>
                          </div>
                        </div>

                        {/* Outcome & Winners Preview */}
                        <div className="p-2.5 rounded-lg bg-black/40 border border-purple-500/20 text-xs font-mono space-y-1.5">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-[11px] text-slate-400">Top Prize:</span>
                            <span className="font-bold text-amber-300 truncate max-w-[140px]">
                              {game.fullHouseWinner || outcome?.fullHouseWinner || 'Not claimed'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-[11px] text-slate-400">Approved Wins:</span>
                            <span className="text-emerald-300 font-bold">
                              {(game.approvedPrizes || []).length || (outcome?.approvedPrizes || []).length || 0} claims
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-[11px] text-slate-400">Total Participants:</span>
                            <span className="text-cyan-300">
                              {game.cardCount || outcome?.totalPilots || 0} pilots
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-purple-500/15 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewingGameOutcome(game)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.35)] transition-all"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-300" />
                          <span>Review Outcome</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGameId(game.id);
                              setActiveTab('cards');
                            }}
                            className="px-2 py-1.5 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
                            title="Inspect pilot cards registered on this game"
                          >
                            <Users className="w-3 h-3 text-purple-400" />
                            <span>Cards</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEndGame(game)}
                            disabled={isEndingGame}
                            className="px-2 py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                            title="Download Official Winners PNG"
                          >
                            <Download className="w-3 h-3 text-amber-400" />
                            <span>PNG</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </main>

      {/* CONFIRM DELETE GAME IN PLAY MODAL */}
      <AnimatePresence>
        {gameToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md surface-elevated rounded-xl p-5 border border-rose-500/50 bg-[#0e0a18] shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="display-font text-lg text-white">Delete Game in Play?</h3>
              </div>

              <p className="text-xs text-slate-300 font-mono">
                Are you sure you want to delete active fleet game{' '}
                <strong className="text-cyan-300">{gameToDelete.referenceNumber}</strong> (
                {gameToDelete.fleetName})?
              </p>
              <p className="text-[11px] text-rose-300 font-mono">
                WARNING: This action is permanent and will delete all player cards registered on this game from the backend.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGameToDelete(null)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteGame}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold cursor-pointer shadow-lg"
                >
                  Confirm Delete Game
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE CARD ON GAME MODAL */}
      <AnimatePresence>
        {cardToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md surface-elevated rounded-xl p-5 border border-rose-500/50 bg-[#0e0a18] shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="display-font text-lg text-white">Delete Card on Game?</h3>
              </div>

              <p className="text-xs text-slate-300 font-mono">
                Delete card for pilot{' '}
                <strong className="text-cyan-300">{cardToDelete.card.pilotName}</strong> from this fleet?
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCardToDelete(null)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCard}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold cursor-pointer shadow-lg"
                >
                  Confirm Delete Card
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM OMIT / DELETE BINGO CALL MODAL */}
      <AnimatePresence>
        {callToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md surface-elevated rounded-xl p-5 border border-rose-500/50 bg-[#0e0a18] shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="display-font text-lg text-white">Omit Bingo Call?</h3>
              </div>

              <p className="text-xs text-slate-300 font-mono">
                Are you sure you want to permanently omit / delete this call from the bingo repository?
              </p>
              <div className="p-3 rounded-lg bg-black/60 border border-purple-500/20 text-white font-mono text-xs">
                &ldquo;{callToDelete.text}&rdquo;
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Tip: You can also deactivate calls instead of deleting them if you want to temporarily omit them from new cards.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCallToDelete(null)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCall}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold cursor-pointer shadow-lg"
                >
                  Omit Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INSPECT CARD PREVIEW MODAL */}
      <AnimatePresence>
        {inspectCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg surface-elevated rounded-xl p-5 border border-purple-500/40 bg-[#0e0a18] shadow-2xl space-y-4 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                <div>
                  <h3 className="display-font text-base text-white flex items-center gap-2 flex-wrap">
                    <span>Inspecting: {inspectCard.pilotName}</span>
                    {inspectCard.isClosed || (inspectCard.rejectedCount || 0) >= 3 ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600 text-white font-bold border border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                        CARD CLOSED (3/3 REJECTIONS)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Rejections: {inspectCard.rejectedCount || 0}/3
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {inspectCard.size}x{inspectCard.size} Grid · {inspectCard.checkedCount} Squares Marked
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectCard(null)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FC Admin Controls Bar */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-mono text-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span><strong>FC Admin Controls:</strong> Click any square to uncheck / deselect it.</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!adminToken) return;
                    const gameId = inspectCard.gameId || selectedGameId;
                    if (!gameId) return;
                    const res = await api.rollbackCardAll(gameId, inspectCard.id, adminToken);
                    if (res.success && res.card) {
                      soundFX.playClaimButton1();
                      setInspectCard(res.card);
                      setGameCards((prev) => prev.map((c) => (c.id === res.card!.id ? res.card! : c)));
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                  title="Uncheck and roll back all marked squares on this card"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Roll Back All Squares</span>
                </button>
              </div>

              {/* Closed Warning Banner */}
              {(inspectCard.isClosed || (inspectCard.rejectedCount || 0) >= 3) && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-mono flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 stroke-[3]" />
                  <span>{inspectCard.closedReason || 'This bingo card has been closed after 3 rejected prize claims by FC Admin.'}</span>
                </div>
              )}

              {/* If this card has a pending claim, show review banner */}
              {(() => {
                const matchingClaim = allPendingClaims.find(
                  (c) =>
                    c.cardId === inspectCard.id ||
                    c.pilotName.toLowerCase() === inspectCard.pilotName.toLowerCase()
                );
                if (!matchingClaim) return null;

                return (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div>
                      <div className="text-amber-300 font-bold flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Pending Prize Claim: {matchingClaim.tierTitle} ({matchingClaim.tierBadge})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Line: {matchingClaim.lineLabel} · Rejections: {inspectCard.rejectedCount || 0}/3
                      </div>
                      <div className="text-[11px] text-cyan-300/90 mt-0.5">
                        Click invalid squares below to deselect them, then reject to remove them from the player&apos;s card.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={approvingClaimId === matchingClaim.id}
                        onClick={async () => {
                          await handleApprovePrizeClaim(
                            matchingClaim.gameId,
                            matchingClaim.id,
                            'reject',
                            {
                              cardId: inspectCard.id,
                              squares: inspectCard.squares,
                              checkedCount: inspectCard.checkedCount,
                            }
                          );
                          setInspectCard(null);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 text-xs font-mono cursor-pointer transition-all disabled:opacity-50"
                      >
                        {(inspectCard.rejectedCount || 0) >= 2
                          ? 'Reject Claim (Closes Card)'
                          : 'Reject Claim & Deselect Tiles'}
                      </button>
                      <button
                        type="button"
                        disabled={approvingClaimId === matchingClaim.id}
                        onClick={async () => {
                          await handleApprovePrizeClaim(matchingClaim.gameId, matchingClaim.id, 'approve');
                          setInspectCard(null);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:scale-105 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Approve Prize & Continue Game</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Grid Preview: Admin can click to uncheck/deselect any square */}
              <div
                className="grid gap-1.5 w-full aspect-square"
                style={{
                  gridTemplateColumns: `repeat(${inspectCard.size}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${inspectCard.size}, minmax(0, 1fr))`,
                }}
              >
                {inspectCard.squares.map((row, rIdx) =>
                  row.map((sq, cIdx) => {
                    const fSize =
                      sq.isFree
                        ? inspectCard.size === 7 ? 'text-[7px]' : inspectCard.size === 5 ? 'text-[9px]' : 'text-xs'
                        : inspectCard.size === 7
                        ? sq.text.length > 40 ? 'text-[5.5px] leading-tight' : 'text-[7px] leading-tight'
                        : inspectCard.size === 5
                        ? sq.text.length > 40 ? 'text-[7px] leading-tight' : 'text-[8.5px] leading-tight'
                        : 'text-[10px] leading-tight';

                    return (
                      <button
                        key={sq.id}
                        type="button"
                        disabled={sq.isFree}
                        onClick={async () => {
                          if (sq.isFree || !adminToken) return;
                          const gameId = inspectCard.gameId || selectedGameId;
                          if (!gameId) return;

                          const nextChecked = !sq.isChecked;
                          soundFX.playCCAppMenuEnter();

                          const updatedSquares = inspectCard.squares.map((r, rI) =>
                            r.map((c, cI) => {
                              if (rI === rIdx && cI === cIdx) {
                                return { ...c, isChecked: nextChecked };
                              }
                              return c;
                            })
                          );
                          const newCount = updatedSquares.flat().filter((s) => s.isChecked).length;
                          const updatedCard = {
                            ...inspectCard,
                            squares: updatedSquares,
                            checkedCount: newCount,
                            lastUpdated: Date.now(),
                          };

                          setInspectCard(updatedCard);
                          setGameCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
                          api.adminUpdateCard(gameId, updatedCard.id, updatedSquares, newCount, adminToken);
                        }}
                        className={`p-1 ${fSize} font-mono rounded flex items-center justify-center text-center border overflow-hidden break-words select-none transition-all ${
                          sq.isFree
                            ? 'bg-yellow-950/40 border-yellow-500/50 text-yellow-300 font-bold cursor-default'
                            : sq.isChecked
                            ? 'bg-purple-900/70 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)] hover:border-rose-400 hover:bg-rose-950/50 cursor-pointer'
                            : 'bg-[#150D22] border-purple-500/20 text-slate-400 hover:border-purple-400 hover:bg-[#201435] cursor-pointer'
                        }`}
                        title={
                          sq.isFree
                            ? 'Free Space'
                            : `${sq.text}\n\n(FC Admin: Click to ${sq.isChecked ? 'UNCHECK / DESELECT' : 'mark'} this square)`
                        }
                      >
                        <span className="w-full max-h-full overflow-hidden text-center uppercase">
                          {sq.isFree ? 'FREE SPACE' : sq.text}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-2.5 flex items-center justify-between border-t border-purple-500/20 text-xs font-mono flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInspectCard(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  Close Card Preview
                </button>
                {(() => {
                  const matchingClaim = allPendingClaims.find(
                    (c) =>
                      c.cardId === inspectCard.id ||
                      c.pilotName.toLowerCase() === inspectCard.pilotName.toLowerCase()
                  );
                  if (!matchingClaim) return null;

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={approvingClaimId === matchingClaim.id}
                        onClick={async () => {
                          await handleApprovePrizeClaim(
                            matchingClaim.gameId,
                            matchingClaim.id,
                            'reject',
                            {
                              cardId: inspectCard.id,
                              squares: inspectCard.squares,
                              checkedCount: inspectCard.checkedCount,
                            }
                          );
                          setInspectCard(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 cursor-pointer disabled:opacity-50"
                      >
                        {(inspectCard.rejectedCount || 0) >= 2
                          ? 'Reject Claim (Closes Card)'
                          : 'Reject Claim & Deselect Tiles'}
                      </button>
                      <button
                        type="button"
                        disabled={approvingClaimId === matchingClaim.id}
                        onClick={async () => {
                          await handleApprovePrizeClaim(matchingClaim.gameId, matchingClaim.id, 'approve');
                          setInspectCard(null);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:scale-105 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Approve Prize</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFICIAL CONCLUDED GAME WINNERS ROSTER & PNG EXPORT MODAL */}
      <AnimatePresence>
        {concludedWinnersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-4xl surface-elevated rounded-2xl p-5 sm:p-6 border-2 border-amber-500/40 bg-[#0c0718] shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-5 text-left my-auto max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-amber-500/30 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="display-font text-lg sm:text-xl text-white">
                        Fleet Operation Concluded
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold">
                        WINNERS SELECTED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      {concludedWinnersModal.game.fleetName} · <strong>{concludedWinnersModal.game.referenceNumber}</strong> · FC: {concludedWinnersModal.game.fcName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConcludedWinnersModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close winners roster"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Actions Bar */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-cyan-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Official winners selected & PNG created! ({concludedWinnersModal.winners.length} pilots ranked)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download PNG Button */}
                  <button
                    type="button"
                    onClick={() => createWinnersPngFile(concludedWinnersModal.game, concludedWinnersModal.winners)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all hover:scale-105"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Winners PNG</span>
                  </button>

                  {/* Copy Winners for Discord */}
                  <button
                    type="button"
                    onClick={() => handleCopyWinnersList(concludedWinnersModal.game, concludedWinnersModal.winners)}
                    className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedWinners ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-purple-400" />
                        <span>Copy for Discord</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table Column Headers */}
              {concludedWinnersModal.winners.length > 0 && (
                <div className="grid grid-cols-[220px_1fr_130px] px-4 py-2 rounded-lg bg-black/50 border border-purple-500/25 text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider shrink-0">
                  <div>Rank & Pilot (Capsuleer)</div>
                  <div>Prize Tier Allocation (All Wins)</div>
                  <div className="text-right">Squares Marked</div>
                </div>
              )}

              {/* Winners List */}
              <div className="flex-1 overflow-y-auto thin-scrollbar space-y-2 pr-1 min-h-[200px]">
                {concludedWinnersModal.winners.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-mono text-sm">
                    No registered cards found for this fleet game.
                  </div>
                ) : (
                  concludedWinnersModal.winners.map((winner) => {
                    const isTop1 = winner.rank === 1;
                    const isTop2 = winner.rank === 2;
                    const isTop3 = winner.rank === 3;

                    let tierBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                    if (winner.tierType === 'TOP_PRIZE') {
                      tierBadgeClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)] font-black';
                    } else if (winner.tierType === 'TIER_4') {
                      tierBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] font-bold';
                    } else if (winner.tierType === 'TIER_3') {
                      tierBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] font-bold';
                    } else if (winner.tierType === 'TIER_2') {
                      tierBadgeClass = 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.3)] font-bold';
                    } else if (winner.tierType === 'TIER_1') {
                      tierBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)] font-bold';
                    }

                    return (
                      <div
                        key={winner.cardId || winner.rank}
                        className={`p-3 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                          isTop1
                            ? 'bg-gradient-to-r from-yellow-950/40 via-purple-950/30 to-[#0e0a18] border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                            : isTop2
                            ? 'bg-gradient-to-r from-cyan-950/30 via-purple-950/20 to-[#0e0a18] border-cyan-500/40'
                            : isTop3
                            ? 'bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-[#0e0a18] border-amber-500/40'
                            : 'bg-[#130b22]/70 border-purple-500/20'
                        }`}
                      >
                        {/* Left: Rank & Pilot */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              isTop1
                                ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                                : isTop2
                                ? 'bg-cyan-400 text-black shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                                : isTop3
                                ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                            }`}
                          >
                            #{winner.rank}
                          </div>

                          {/* Capsuleer Avatar Thumbnail */}
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#160c29] border border-cyan-500/40 shrink-0 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                            {winner.avatarUrl ? (
                              <img src={winner.avatarUrl} alt={winner.pilotName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-purple-400" />
                            )}
                          </div>

                          <div>
                            <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                              <span>{winner.pilotName}</span>
                              {isTop1 && <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Verified Capsuleer
                            </div>
                          </div>
                        </div>

                        {/* Middle: Prize Tier Allocation Badge (shows all wins achieved) */}
                        <div className="flex-1 min-w-[200px] flex flex-wrap items-center gap-1.5">
                          {winner.allTiers && winner.allTiers.length > 0 ? (
                            winner.allTiers.map((tierItem, tIdx) => {
                              let badgeCls = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
                              if (tierItem.tier === 'TOP_PRIZE') {
                                badgeCls = 'bg-yellow-500/25 text-yellow-300 border-yellow-500/60 shadow-[0_0_10px_rgba(234,179,8,0.3)] font-bold';
                              } else if (tierItem.tier === 'TIER_4') {
                                badgeCls = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold';
                              } else if (tierItem.tier === 'TIER_3') {
                                badgeCls = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold';
                              } else if (tierItem.tier === 'TIER_2') {
                                badgeCls = 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50 font-bold';
                              }
                              return (
                                <span
                                  key={tIdx}
                                  className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${badgeCls}`}
                                >
                                  <Trophy className="w-3 h-3" />
                                  <span>{tierItem.count > 1 ? `${tierItem.badge} (x${tierItem.count})` : tierItem.badge}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border ${tierBadgeClass}`}>
                              <Trophy className="w-3.5 h-3.5" />
                              <span>{winner.prizeTier}</span>
                            </span>
                          )}
                        </div>

                        {/* Right: Marked Squares Progress */}
                        <div className="text-right min-w-[110px]">
                          <div className="text-xs font-mono font-bold text-white">
                            {winner.completedSquares} / {winner.totalSquares} Squares
                          </div>
                          <div className="text-[10px] text-cyan-300 font-mono">
                            {winner.percentage}% Marked
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1 w-24 ml-auto bg-[#1A1230] rounded-full h-1 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                              style={{ width: `${winner.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
                <span>PNG exported automatically to your downloads folder.</span>
                <button
                  type="button"
                  onClick={() => setConcludedWinnersModal(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GAME OUTCOMES & CARD REVIEW MODAL (PERMANENT STORAGE) */}
      <GameOutcomesModal
        isOpen={!!reviewingGameOutcome}
        onClose={() => setReviewingGameOutcome(null)}
        game={reviewingGameOutcome}
      />

      {/* Footer */}
      <footer className="border-t border-purple-500/10 py-3 text-center text-xs font-mono text-slate-500">
        NPSI Fleet Operations · FC Admin Authority · Backend Storage Synchronized
      </footer>
    </div>
  );
};
