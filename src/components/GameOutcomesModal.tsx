import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  X,
  Download,
  Copy,
  Check,
  User,
  Calendar,
  Eye,
  CheckCircle2,
  Shield,
  Layers,
  Award,
  Hash,
  Users,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { ApiGame, api } from '../utils/api';
import { BingoCard, GameOutcome, WinTierType } from '../types/bingo';
import {
  selectGameWinners,
  createWinnersPngFile,
  formatDiscordWinnersReport,
  WinnerResult,
} from '../utils/winnersExport';
import { soundFX } from '../utils/audio';

interface GameOutcomesModalProps {
  isOpen: boolean;
  gameId?: string | null;
  game?: ApiGame | null;
  initialGame?: ApiGame | null;
  onClose: () => void;
  adminToken?: string | null;
}

export const GameOutcomesModal: React.FC<GameOutcomesModalProps> = ({
  isOpen,
  gameId,
  game: passedGame,
  initialGame,
  onClose,
}) => {
  const effectiveInitial = passedGame || initialGame || null;
  const effectiveId = passedGame?.id || initialGame?.id || gameId || null;

  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState<ApiGame | null>(effectiveInitial);
  const [outcome, setOutcome] = useState<GameOutcome | null>(effectiveInitial?.outcome || null);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [winners, setWinners] = useState<WinnerResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingCard, setInspectingCard] = useState<BingoCard | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'claims' | 'summary'>('roster');

  useEffect(() => {
    if (passedGame) {
      setGame(passedGame);
      if (passedGame.outcome) setOutcome(passedGame.outcome);
    }
  }, [passedGame]);

  useEffect(() => {
    if (!isOpen || !effectiveId) {
      setInspectingCard(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.getGameOutcome(effectiveId).then((res) => {
      if (!isMounted) return;
      setLoading(false);
      if (res.success && res.game) {
        setGame(res.game);
        setOutcome(res.outcome || res.game.outcome || null);
        const fetchedCards = res.cards || [];
        setCards(fetchedCards);

        // If winners exist from outcome/game, use them; otherwise compute from cards
        if (res.winners && res.winners.length > 0) {
          setWinners(res.winners as WinnerResult[]);
        } else if (fetchedCards.length > 0) {
          const computed = selectGameWinners(fetchedCards, res.game.gridSize);
          setWinners(computed);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, gameId]);

  if (!isOpen) return null;

  const currentGame = game || initialGame;
  const filteredWinners = winners.filter((w) =>
    w.pilotName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleDownloadPng = async () => {
    if (!currentGame) return;
    try {
      soundFX.playClaimButton1();
      await createWinnersPngFile(currentGame, winners);
    } catch (err) {
      console.error('Failed to download winners PNG:', err);
    }
  };

  const handleCopyDiscord = () => {
    if (!currentGame) return;
    const text = formatDiscordWinnersReport(currentGame, winners);
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundFX.playCCAppMenuEnter();
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl surface-elevated rounded-2xl p-5 sm:p-6 border-2 border-amber-500/40 bg-[#0c0718] shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-5 text-left my-auto max-h-[92vh] flex flex-col font-['Inter'] text-slate-100"
      >
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-amber-500/30 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-purple-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold tracking-wider">
                  {currentGame?.referenceNumber || 'NPSI GAME'}
                </span>
                <h2 className="display-font text-lg sm:text-xl text-white font-bold">
                  {currentGame?.fleetName || 'Fleet Operation'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>PERSISTED IN BACKEND</span>
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>FC: <strong className="text-white">{currentGame?.fcName}</strong></span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{currentGame?.date}</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-purple-300 font-bold">
                  {currentGame?.gridSize}x{currentGame?.gridSize} Grid
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            title="Close Outcomes Review"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm space-y-2">
            <div className="w-8 h-8 mx-auto border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p>Loading saved fleet results & outcomes from backend storage...</p>
          </div>
        ) : inspectingCard ? (
          /* CARD INSPECTOR SUB-VIEW */
          <div className="flex-1 overflow-y-auto thin-scrollbar space-y-4 pr-1">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <button
                type="button"
                onClick={() => setInspectingCard(null)}
                className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Outcomes Roster</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-300">
                  Inspecting Card: <strong className="text-white">{inspectingCard.pilotName}</strong>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30">
                  {inspectingCard.checkedCount} / {inspectingCard.size * inspectingCard.size} Marked
                </span>
              </div>
            </div>

            {/* Grid Display */}
            <div
              className="grid gap-1.5 w-full max-w-md mx-auto aspect-square my-2"
              style={{
                gridTemplateColumns: `repeat(${inspectingCard.size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${inspectingCard.size}, minmax(0, 1fr))`,
              }}
            >
              {inspectingCard.squares.map((row) =>
                row.map((sq) => {
                  const size = inspectingCard.size;
                  const fSize =
                    sq.isFree
                      ? size === 7 ? 'text-[7px]' : size === 5 ? 'text-[9px]' : 'text-xs'
                      : size === 7
                      ? sq.text.length > 40 ? 'text-[5.5px] leading-tight' : 'text-[7px] leading-tight'
                      : size === 5
                      ? sq.text.length > 40 ? 'text-[7px] leading-tight' : 'text-[8.5px] leading-tight'
                      : 'text-[10px] leading-tight';

                  return (
                    <div
                      key={sq.id}
                      className={`p-1 ${fSize} font-mono rounded flex items-center justify-center text-center border overflow-hidden break-words select-none transition-all ${
                        sq.isChecked
                          ? 'bg-gradient-to-br from-purple-900/80 to-cyan-950/80 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                          : sq.isFree
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-[#150D22]/80 border-purple-500/20 text-slate-400'
                      }`}
                    >
                      <span className="max-h-full overflow-hidden uppercase">
                        {sq.isFree ? 'FREE SPACE' : sq.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* MAIN OUTCOMES CONTENT */
          <div className="flex-1 overflow-y-auto thin-scrollbar space-y-4 pr-1 min-h-[300px]">
            {/* TOP PODIUM / OUTCOME HIGHLIGHT BANNER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Full House Winner Card */}
              <div className="md:col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-black/80 border border-amber-500/50 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-purple-950 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0">
                    {currentGame?.fullHouseWinnerAvatar ? (
                      <img
                        src={currentGame.fullHouseWinnerAvatar}
                        alt={currentGame.fullHouseWinner || 'Winner'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400">
                        <Trophy className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">
                      TOP PRIZE · FULL HOUSE
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                      {currentGame?.fullHouseWinner ? currentGame.fullHouseWinner : 'Top Prize Completed'}
                    </h3>
                    <p className="text-xs text-amber-300/90 font-mono">
                      {currentGame?.fullHouseWinner
                        ? 'Completed all squares on the bingo matrix!'
                        : 'Official fleet conclusion with verified outcomes'}
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-xs text-slate-400 font-mono">Fleet Participation</div>
                  <div className="text-lg font-mono font-bold text-cyan-300">
                    {cards.length} Pilots Registered
                  </div>
                </div>
              </div>

              {/* Quick Stat Card */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-purple-500/30 flex flex-col justify-center space-y-1 font-mono text-xs">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Approved Claims:</span>
                  <strong className="text-amber-300">
                    {(currentGame?.approvedPrizes?.length ?? 0)}
                  </strong>
                </div>
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Squares Marked:</span>
                  <strong className="text-cyan-300">
                    {outcome?.totalSquaresMarked ??
                      cards.reduce(
                        (acc, c) => acc + c.squares.flat().filter((s) => s.isChecked).length,
                        0
                      )}
                  </strong>
                </div>
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Concluded:</span>
                  <strong className="text-slate-200">
                    {currentGame?.finishedAt
                      ? new Date(currentGame.finishedAt).toLocaleTimeString()
                      : 'Saved in backend'}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACTION & EXPORT TOOLBAR */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-cyan-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('roster')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeSubTab === 'roster'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-black/40 text-slate-300 hover:text-white'
                  }`}
                >
                  Fleet Roster & Rankings ({winners.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('claims')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeSubTab === 'claims'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'bg-black/40 text-slate-300 hover:text-white'
                  }`}
                >
                  Approved Claims Log ({(currentGame?.approvedPrizes?.length ?? 0)})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Download PNG Button */}
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all hover:scale-105"
                  title="Download Official Winners & Outcomes PNG graphic"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Winners PNG</span>
                </button>

                {/* Copy for Discord Button */}
                <button
                  type="button"
                  onClick={handleCopyDiscord}
                  className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Copy Discord-formatted fleet results markdown"
                >
                  {copied ? (
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

            {/* TAB CONTENT: ROSTER & RANKINGS */}
            {activeSubTab === 'roster' && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search pilot callsign..."
                    className="w-full pl-9 pr-4 py-2 bg-black/60 border border-purple-500/30 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[180px_1fr_120px_110px] px-4 py-2 rounded-lg bg-black/50 border border-purple-500/25 text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider shrink-0">
                  <div>Rank & Pilot</div>
                  <div>Prize Tier Allocation</div>
                  <div className="text-center">Squares Marked</div>
                  <div className="text-right">Bingo Card</div>
                </div>

                {/* Winners Table Rows */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto thin-scrollbar pr-1">
                  {filteredWinners.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-mono text-xs">
                      {searchTerm ? 'No pilots match your search query.' : 'No registered pilot cards for this game.'}
                    </div>
                  ) : (
                    filteredWinners.map((winner) => {
                      const isTop1 = winner.rank === 1;
                      const isTop2 = winner.rank === 2;
                      const isTop3 = winner.rank === 3;

                      return (
                        <div
                          key={winner.cardId || `${winner.pilotName}-${winner.rank}`}
                          className={`grid grid-cols-[180px_1fr_120px_110px] items-center px-4 py-2.5 rounded-lg border font-mono text-xs transition-colors ${
                            isTop1
                              ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                              : isTop2
                              ? 'bg-slate-900/40 border-slate-500/40'
                              : isTop3
                              ? 'bg-amber-950/20 border-amber-700/40'
                              : 'bg-black/40 border-purple-500/15 hover:border-purple-500/35'
                          }`}
                        >
                          {/* Rank & Pilot */}
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isTop1
                                  ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                                  : isTop2
                                  ? 'bg-slate-300 text-slate-950'
                                  : isTop3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {winner.rank}
                            </span>

                            <div className="w-7 h-7 rounded-md overflow-hidden bg-purple-950 border border-purple-500/40 shrink-0">
                              {winner.avatarUrl ? (
                                <img
                                  src={winner.avatarUrl}
                                  alt={winner.pilotName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5 text-purple-400 m-1.5" />
                              )}
                            </div>

                            <span className="font-bold text-white truncate" title={winner.pilotName}>
                              {winner.pilotName}
                            </span>
                          </div>

                          {/* Prize Tier Allocation */}
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                            {winner.allTiers && winner.allTiers.length > 0 ? (
                              winner.allTiers.map((t) => (
                                <span
                                  key={t.tier}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-900/60 border border-purple-400 text-purple-200"
                                >
                                  {t.badge} {t.count > 1 ? `(x${t.count})` : ''}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                {winner.prizeTier}
                              </span>
                            )}
                          </div>

                          {/* Squares Marked */}
                          <div className="text-center text-cyan-300 font-bold">
                            {winner.completedSquares} / {winner.totalSquares} ({winner.percentage}%)
                          </div>

                          {/* Inspect Card Button */}
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const card = cards.find(
                                  (c) =>
                                    c.id === winner.cardId ||
                                    c.pilotName.toLowerCase() === winner.pilotName.toLowerCase()
                                );
                                if (card) {
                                  setInspectingCard(card);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-200 hover:text-white text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Inspect this pilot's bingo card and square markings"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span>View Card</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: APPROVED PRIZE CLAIMS */}
            {activeSubTab === 'claims' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-mono mb-2">
                  Chronological log of prize claims officially verified and approved by the Fleet Commander for this game:
                </div>

                {(!currentGame?.approvedPrizes || currentGame.approvedPrizes.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 font-mono text-xs rounded-xl bg-black/40 border border-purple-500/20">
                    No individual prize claims were submitted or recorded prior to game conclusion.
                  </div>
                ) : (
                  currentGame.approvedPrizes.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3 rounded-lg bg-black/60 border border-purple-500/30 flex items-center justify-between gap-3 font-mono text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-purple-950 border border-purple-400 shrink-0">
                          {claim.avatarUrl ? (
                            <img src={claim.avatarUrl} alt={claim.pilotName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-purple-400 m-2" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm flex items-center gap-2">
                            <span>{claim.pilotName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                              {claim.tierBadge}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {claim.tierTitle} · <span className="text-cyan-300">{claim.lineLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        {claim.approvedAt ? new Date(claim.approvedAt).toLocaleTimeString() : 'Approved'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between gap-2 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Games and outcomes are permanently preserved in the backend storage.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 border border-slate-700 text-xs font-mono cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
