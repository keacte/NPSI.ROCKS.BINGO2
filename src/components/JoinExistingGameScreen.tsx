import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  User,
  Radio,
  Calendar,
  Shield,
  BookOpen,
  Check,
  ChevronRight,
  Edit2,
  Trophy,
} from 'lucide-react';
import { ApiGame } from '../utils/api';
import { BrandLogo } from './BrandLogo';
import { soundFX } from '../utils/audio';

interface JoinExistingGameScreenProps {
  games: ApiGame[];
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
  pilotName: string;
  onEditPilotName: () => void;
  onJoinGame: (game: ApiGame, pilotName: string) => void;
  onBackToPortal: () => void;
  onOpenRules: () => void;
  onOpenAdmin: () => void;
  isAdminAuth: boolean;
}

export const JoinExistingGameScreen: React.FC<JoinExistingGameScreenProps> = ({
  games,
  selectedGameId,
  onSelectGame,
  pilotName,
  onEditPilotName,
  onJoinGame,
  onBackToPortal,
  onOpenRules,
  onOpenAdmin,
  isAdminAuth,
}) => {
  const isConcluded = (g: ApiGame) => g.status === 'CONCLUDED' || Boolean(g.fullHouseWinner);
  const activeGames = games.filter((g) => !isConcluded(g));
  const selectedGame =
    activeGames.find((g) => g.id === selectedGameId) ||
    activeGames[0] ||
    null;

  const handleJoin = (gameToJoin: ApiGame) => {
    // If game has concluded, joining is removed/disabled
    if (isConcluded(gameToJoin)) {
      return;
    }
    // Action audio: cllick when clicking "join game and open card"
    soundFX.playCllick();
    if (!pilotName || !pilotName.trim()) {
      onEditPilotName();
      return;
    }
    onJoinGame(gameToJoin, pilotName);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between bg-[#08090e] select-none text-slate-100 font-['Inter']">
      {/* Background Video & Nebula Fallback */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#090b10]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source src="/video/backgroundvideo.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(168,85,247,0.22),transparent_65%),radial-gradient(ellipse_70%_50%_at_80%_80%,rgba(6,182,212,0.12),transparent_60%),linear-gradient(to_bottom,rgba(9,11,16,0.65),rgba(9,11,16,0.95))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={pilotName ? onEditPilotName : onBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-cyan-300 border border-purple-500/30 transition-colors backdrop-blur-sm text-xs font-mono cursor-pointer"
            title={pilotName ? "Edit Pilot Callsign" : "Back to Home Portal"}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{pilotName ? 'Pilot Name' : 'Home'}</span>
          </button>

          <BrandLogo className="w-9 h-9 rounded-md shadow-[0_0_12px_rgba(168,85,247,0.35)]" />
          <div>
            <div className="display-font text-lg sm:text-xl text-white leading-none whitespace-nowrap">
              NPSI<span className="brand-purple">.</span>ROCKS<span className="brand-purple">.</span>
              <span className="chromatic-text">BINGO</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              Fleet Boarding Matrix
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-black/60 hover:bg-black/90 text-slate-300 hover:text-cyan-300 border border-purple-500/30 transition-colors backdrop-blur-sm cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C084FC]" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all backdrop-blur-sm cursor-pointer ${
              isAdminAuth
                ? 'bg-purple-900/60 text-white border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-black/60 hover:bg-black/90 text-slate-300 hover:text-purple-300 border border-purple-500/30'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#E879F9]" />
            <span className="hidden sm:inline">FC Admin</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 flex flex-col justify-center my-auto py-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated purple-glow rounded-xl p-5 sm:p-6 border border-purple-500/40 bg-[#0e0a18]/95 shadow-[0_0_50px_rgba(168,85,247,0.35)] backdrop-blur-xl flex flex-col gap-4 text-left"
        >
          {/* Header Title */}
          <div className="border-b border-purple-500/20 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="display-font text-xl text-white tracking-wide">
                  Join An Existing Game
                </h1>
              </div>
            </div>
            <span className="text-[10px] font-mono text-purple-300 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 hidden sm:inline-block">
              {activeGames.length} ACTIVE {activeGames.length === 1 ? 'FLEET AVAILABLE' : 'FLEETS AVAILABLE'}
            </span>
          </div>

          {/* GAMES LIST */}
          <div className="space-y-2">
              <div className="space-y-2 max-h-60 overflow-y-auto thin-scrollbar pr-1">
                {activeGames.length === 0 ? (
                  <div className="p-5 rounded-lg bg-[#150D22]/60 border border-purple-500/20 text-center space-y-2">
                    <p className="text-xs text-slate-400 font-mono">
                      No active fleet games currently open for joining.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenAdmin}
                      className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>FC Admin: Broadcast New Game</span>
                    </button>
                  </div>
                ) : (
                  activeGames.map((game) => {
                    const isSelected = selectedGame?.id === game.id;
                    return (
                      <div
                        key={game.id}
                        onClick={() => onSelectGame(game.id)}
                        onDoubleClick={() => handleJoin(game)}
                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3 border ${
                          isSelected
                            ? 'bg-purple-900/40 border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                            : 'bg-[#150D22]/80 border-purple-500/20 hover:border-purple-500/50 hover:bg-[#1a122e]'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold tracking-wider">
                              {game.referenceNumber}
                            </span>
                            <span className="text-sm font-semibold text-white truncate">
                              {game.fleetName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/35">
                              {game.gridSize}x{game.gridSize} Grid
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-purple-400" />
                              <span>FC:</span>
                              <strong className="text-white font-medium">{game.fcName}</strong>
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{game.date}</span>
                            </span>
                            {typeof game.cardCount === 'number' && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-cyan-400 text-[11px]">
                                  {game.cardCount} {game.cardCount === 1 ? 'pilot' : 'pilots'} active
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center pl-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                                : 'border-slate-600 bg-black/40 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          {/* Action Button: Join Selected Game and Open Card (Removed if game has concluded) */}
          <div className="pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={pilotName ? onEditPilotName : onBackToPortal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-colors cursor-pointer"
            >
              {pilotName ? 'Back to Pilot Entry' : 'Back to Home'}
            </button>

            {selectedGame && isConcluded(selectedGame) ? (
              <div className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Game Concluded · Joining Closed</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={!selectedGame || isConcluded(selectedGame)}
                onClick={() => selectedGame && handleJoin(selectedGame)}
                className="w-full sm:w-auto btn-primary px-6 py-3 text-xs font-mono tracking-wider font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.55)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Radio className="w-4 h-4" />
                <span>join game and open card</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs font-mono text-slate-500">
        <div>NPSI.ROCKS</div>
        <div>FLEET OPERATIONS</div>
      </footer>
    </div>
  );
};
