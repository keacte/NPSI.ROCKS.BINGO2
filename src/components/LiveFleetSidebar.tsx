import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, Eye, User, X } from 'lucide-react';
import { FleetPlayer } from '../types/bingo';
import { api } from '../utils/api';

interface LiveFleetSidebarProps {
  players: FleetPlayer[];
  currentViewingPlayerId: string;
  myPlayerId: string;
  onSelectPlayerCard: (player: FleetPlayer) => void;
  recalibrationTime: string;
  isCalibrating?: boolean;
}

const TIER_BADGES: Record<string, { label: string; color: string }> = {
  TIER_1: { label: 'T1', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  TIER_2: { label: 'T2', color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  TIER_3: { label: 'T3', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  TIER_4: { label: 'T4', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  TOP_PRIZE: { label: 'TOP', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_8px_rgba(250,204,21,0.3)]' },
};

export const LiveFleetSidebar: React.FC<LiveFleetSidebarProps> = ({
  players,
  currentViewingPlayerId,
  myPlayerId,
  onSelectPlayerCard,
  recalibrationTime,
  isCalibrating = false,
}) => {
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [resolvedAvatars, setResolvedAvatars] = useState<Record<string, string>>({});

  // Auto-lookup avatars from zKillboard for players who do not have an avatarUrl yet
  useEffect(() => {
    players.forEach((p) => {
      const name = p.pilotName?.trim();
      if (name && !p.avatarUrl && !resolvedAvatars[name]) {
        api.lookupAvatar(name).then((url) => {
          if (url) {
            setResolvedAvatars((prev) => ({ ...prev, [name]: url }));
          }
        });
      }
    });
  }, [players, resolvedAvatars]);

  // Sort players by checkedCount descending
  const sortedPlayers = [...players].sort((a, b) => b.checkedCount - a.checkedCount);

  return (
    <aside className="surface-elevated flex flex-col overflow-hidden min-h-0 h-full w-full select-none" data-testid="players-leaderboard">
      {/* Header matching preview */}
      <header className="flex items-center justify-between gap-2 p-3 border-b border-purple-500/15 shrink-0">
        <div className="flex items-center gap-2 text-slate-200 text-xs uppercase tracking-[0.2em] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="bg-fuchsia-400 animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
            <span className="bg-emerald-400 relative inline-flex rounded-full h-2 w-2"></span>
          </span>
          <span>Playing Now</span>
          <span className="text-[10px] text-slate-400 font-mono">({players.length})</span>
        </div>

        {/* Recalibration countdown timer adjacent */}
        <div className="flex items-center gap-2">
          <span className="eyebrow lowercase text-[10px] flex items-center gap-1">
            <RefreshCw className={`w-2.5 h-2.5 ${isCalibrating ? 'animate-spin text-purple-400' : 'text-slate-500'}`} />
            <span>{recalibrationTime}</span>
          </span>
        </div>
      </header>

      {/* Roster entries */}
      <div className="flex-1 overflow-y-auto thin-scrollbar divide-y divide-purple-500/10 min-h-0">
        {sortedPlayers.length === 0 && (
          <div className="p-6 text-center text-slate-400 font-mono text-xs space-y-2">
            <User className="w-6 h-6 text-purple-400/50 mx-auto" />
            <p className="text-slate-300 font-semibold">No active pilots yet</p>
            <p className="text-[11px] text-slate-500">
              Only pilots who click &quot;Join An Existing Game&quot; appear on the live roster.
            </p>
          </div>
        )}
        {sortedPlayers.map((player, idx) => {
          const isViewing = currentViewingPlayerId === player.id;
          const isMe = player.id === myPlayerId;
          const pct = Math.round((player.checkedCount / player.totalSquares) * 100);
          const badge = player.highestTier ? TIER_BADGES[player.highestTier] : null;
          const avatarSrc = player.avatarUrl || resolvedAvatars[player.pilotName?.trim()];

          return (
            <div
              key={player.id}
              className={`p-2.5 sm:p-3 transition-colors ${
                isViewing
                  ? 'bg-purple-500/20 border-l-2 border-purple-400'
                  : isMe
                  ? 'bg-purple-500/10'
                  : 'hover:bg-purple-500/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2.5 flex-1">
                  <span className={`text-[11px] font-mono font-bold w-4 text-center shrink-0 ${
                    idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-500' : 'text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Capsuleer Avatar Thumbnail from zKillboard */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#160c29] border border-cyan-500/30 shrink-0 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                    {avatarSrc && !failedAvatars[player.id] ? (
                      <img
                        src={avatarSrc}
                        alt={player.pilotName}
                        className="w-full h-full object-cover"
                        onError={() => setFailedAvatars((prev) => ({ ...prev, [player.id]: true }))}
                      />
                    ) : (
                      <User className="w-4 h-4 text-purple-400/70" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex items-center gap-1.5 truncate">
                    <span className={`text-xs font-semibold truncate ${isMe ? 'text-[#E879F9]' : 'text-white'}`}>
                      {player.pilotName}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-mono px-1 rounded bg-purple-500/30 text-purple-300 border border-purple-400/30 shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-white">
                    {player.checkedCount} / {player.totalSquares}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">{pct}%</div>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-1.5 w-full bg-[#1A1230] rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    pct >= 100
                      ? 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]'
                      : 'bg-gradient-to-r from-purple-500 to-[#E879F9]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Bottom footer: Tier badge & See Card */}
              <div className="mt-2 flex items-center justify-between">
                <div>
                  {player.isClosed || (player.rejectedCount || 0) >= 3 || player.card?.isClosed || (player.card?.rejectedCount || 0) >= 3 ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-rose-500/50 bg-rose-950/80 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                      <X className="w-2.5 h-2.5 stroke-[2.5]" />
                      CARD CLOSED
                    </span>
                  ) : badge ? (
                    <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                      <Trophy className="w-2.5 h-2.5" />
                      {badge.label} WINNER
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">in space</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlayerCard(player)}
                  className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                    isViewing
                      ? 'bg-purple-500 text-white font-bold'
                      : 'btn-ghost text-slate-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-2.5 h-2.5" />
                  {isViewing ? 'Viewing' : 'See card'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
