import React, { useState } from 'react';
import {
  X,
  Shield,
  Trash2,
  Plus,
  Search,
  RotateCcw,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Users,
  Grid,
  Radio,
  Calendar,
} from 'lucide-react';
import { BingoCallItem } from '../data/defaultCalls';
import { BingoCard, BingoGame, BoardSize } from '../types/bingo';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  calls: BingoCallItem[];
  onUpdateCalls: (calls: BingoCallItem[]) => void;
  onResetCalls: () => void;
  cards: BingoCard[];
  onDeleteCard: (cardId: string) => void;
  games: BingoGame[];
  onAddGame: (game: BingoGame) => void;
  onDeleteGame: (gameId: string) => void;
  isAdminAuthenticated: boolean;
  onAdminAuthChange: (authenticated: boolean) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  calls,
  onUpdateCalls,
  onResetCalls,
  cards,
  onDeleteCard,
  games,
  onAddGame,
  onDeleteGame,
  isAdminAuthenticated,
  onAdminAuthChange,
}) => {
  const [activeTab, setActiveTab] = useState<'create-game' | 'calls' | 'cards'>('create-game');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Create Game state
  const [gameRefNumber, setGameRefNumber] = useState(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
  const [gameFleetName, setGameFleetName] = useState('FUN inc Sunday Roam');
  const [gameFcName, setGameFcName] = useState('FC Boba');
  const [gameDate, setGameDate] = useState('27 Sep 2026 · 19:30 EVE');
  const [gameGridSize, setGameGridSize] = useState<BoardSize>(3);
  const [gameStatus, setGameStatus] = useState<'ACTIVE' | 'FORMING'>('ACTIVE');
  const [gameSuccessMsg, setGameSuccessMsg] = useState<string | null>(null);

  // Call management state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FC' | 'FLEET' | 'COMBAT' | 'MEMES'>('ALL');
  const [newCallText, setNewCallText] = useState('');
  const [newCallCat, setNewCallCat] = useState<'FC' | 'FLEET' | 'COMBAT' | 'MEMES'>('FC');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'passwordsrock1234') {
      onAdminAuthChange(true);
      setAuthError(false);
      setPasswordInput('');
    } else {
      setAuthError(true);
    }
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameRefNumber.trim() || !gameFleetName.trim()) return;

    const newGame: BingoGame = {
      id: `game-${Date.now()}`,
      referenceNumber: gameRefNumber.trim().toUpperCase(),
      fleetName: gameFleetName.trim(),
      fcName: gameFcName.trim() || 'Fleet Commander',
      date: gameDate.trim() || new Date().toUTCString().slice(5, 22) + ' EVE',
      gridSize: gameGridSize,
      status: gameStatus,
      createdAt: Date.now(),
    };

    onAddGame(newGame);
    setGameSuccessMsg(`Game "${newGame.referenceNumber}" created with ${newGame.gridSize}x${newGame.gridSize} grid!`);
    setGameRefNumber(`REF-${Math.floor(1000 + Math.random() * 9000)}`);

    setTimeout(() => {
      setGameSuccessMsg(null);
    }, 4000);
  };

  const toggleCallActive = (id: string) => {
    const updated = calls.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c));
    onUpdateCalls(updated);
  };

  const handleAddCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallText.trim()) return;
    const newItem: BingoCallItem = {
      id: `c-custom-${Date.now()}`,
      text: newCallText.trim().toUpperCase(),
      category: newCallCat,
      isActive: true,
    };
    onUpdateCalls([newItem, ...calls]);
    setNewCallText('');
  };

  const startEditing = (call: BingoCallItem) => {
    setEditingId(call.id);
    setEditingText(call.text);
  };

  const saveEdit = (id: string) => {
    if (!editingText.trim()) return;
    const updated = calls.map((c) => (c.id === id ? { ...c, text: editingText.trim().toUpperCase() } : c));
    onUpdateCalls(updated);
    setEditingId(null);
  };

  const deleteCall = (id: string) => {
    const updated = calls.filter((c) => c.id !== id);
    onUpdateCalls(updated);
  };

  const filteredCalls = calls.filter((c) => {
    const matchesSearch = c.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const activeCount = calls.filter((c) => c.isActive).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl surface-elevated purple-glow flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/15 bg-[#150D22]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-[#E879F9] border border-purple-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="eyebrow">// fc authorization</div>
              <h2 className="display-font text-lg text-white">
                Admin Console
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdminAuthenticated ? (
          /* Authentication Screen */
          <div className="p-8 flex flex-col items-center justify-center space-y-5 text-center">
            <div className="p-4 rounded-full bg-purple-500/15 text-[#E879F9] border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="display-font text-xl text-white">
                Fleet Commander Access
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Enter your administrative passcode to create games, select grid sizes, manage calls, and delete cards.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                placeholder="Enter passcode"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2 bg-[#1A1230] border border-purple-500/30 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400 font-mono text-center tracking-widest text-base"
              />
              {authError && (
                <p className="text-xs text-rose-400 font-medium">
                  Access Denied. Passcode incorrect.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 btn-primary text-xs"
                >
                  Authorize
                </button>
                <button
                  type="button"
                  onClick={() => onAdminAuthChange(true)}
                  className="btn-ghost text-xs px-3"
                  title="Quick unlock"
                >
                  Quick Unlock
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Admin Console Tabs */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex items-center justify-between px-6 pt-3 border-b border-purple-500/15 bg-[#0A0612]/60">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('create-game')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
                    activeTab === 'create-game'
                      ? 'bg-[#150D22] text-white border-t-2 border-x-2 border-purple-500/40 shadow-[0_-2px_10px_rgba(168,85,247,0.2)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  Create / Manage Games ({games.length})
                </button>
                <button
                  onClick={() => setActiveTab('calls')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
                    activeTab === 'calls'
                      ? 'bg-[#150D22] text-white border-t-2 border-x-2 border-purple-500/40 shadow-[0_-2px_10px_rgba(168,85,247,0.2)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5 text-purple-400" />
                  Calls Repository ({activeCount}/{calls.length})
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
                    activeTab === 'cards'
                      ? 'bg-[#150D22] text-white border-t-2 border-x-2 border-purple-500/40 shadow-[0_-2px_10px_rgba(168,85,247,0.2)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                  Fleet Cards ({cards.length})
                </button>
              </div>

              <button
                onClick={() => onAdminAuthChange(false)}
                className="text-xs text-slate-500 hover:text-rose-400 font-mono"
              >
                Lock
              </button>
            </div>

            {/* TAB: Create / Manage Games */}
            {activeTab === 'create-game' && (
              <div className="flex-1 flex flex-col p-6 min-h-0 space-y-4 overflow-y-auto thin-scrollbar">
                {gameSuccessMsg && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-400/50 rounded-lg text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{gameSuccessMsg}</span>
                  </div>
                )}

                {/* Form to create game */}
                <form onSubmit={handleCreateGame} className="p-4 rounded-xl bg-[#1A1230]/70 border border-purple-500/25 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
                    <span className="eyebrow">// new fleet operation</span>
                    <span className="text-xs text-purple-300 font-mono font-bold">ADMIN GAME CREATOR</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reference Number */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-mono">
                        Reference / Fleet Number
                      </label>
                      <input
                        type="text"
                        value={gameRefNumber}
                        onChange={(e) => setGameRefNumber(e.target.value)}
                        placeholder="e.g. FLT-108 or REF-8492"
                        className="w-full px-3 py-1.5 bg-[#0A0612] border border-purple-500/25 rounded-md text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                        required
                      />
                    </div>

                    {/* Fleet Name */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-mono">
                        Fleet Name
                      </label>
                      <input
                        type="text"
                        value={gameFleetName}
                        onChange={(e) => setGameFleetName(e.target.value)}
                        placeholder="e.g. FUN inc Thursday Roam"
                        className="w-full px-3 py-1.5 bg-[#0A0612] border border-purple-500/25 rounded-md text-white text-xs focus:outline-none focus:border-purple-400"
                        required
                      />
                    </div>

                    {/* FC Name */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-mono">
                        Fleet Commander (FC)
                      </label>
                      <input
                        type="text"
                        value={gameFcName}
                        onChange={(e) => setGameFcName(e.target.value)}
                        placeholder="e.g. FC Boba"
                        className="w-full px-3 py-1.5 bg-[#0A0612] border border-purple-500/25 rounded-md text-white text-xs focus:outline-none focus:border-purple-400"
                        required
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-mono">
                        Date & Time
                      </label>
                      <input
                        type="text"
                        value={gameDate}
                        onChange={(e) => setGameDate(e.target.value)}
                        placeholder="e.g. 27 Sep 2026 · 19:30 EVE"
                        className="w-full px-3 py-1.5 bg-[#0A0612] border border-purple-500/25 rounded-md text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>

                  {/* Grid Size Selection by Admin */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 font-mono">
                      Admin Grid Size Configuration
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {([3, 5, 7] as BoardSize[]).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setGameGridSize(sz)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                            gameGridSize === sz
                              ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                              : 'bg-[#0A0612] text-slate-400 border-purple-500/20 hover:text-white'
                          }`}
                        >
                          <div className="font-['Audiowide'] text-sm">{sz}x{sz}</div>
                          <div className="text-[9px] font-mono opacity-80">
                            {sz === 3 ? 'Standard 3x3' : sz === 5 ? '5x5 Grid' : 'Deep 7x7'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Status:</span>
                      <button
                        type="button"
                        onClick={() => setGameStatus(gameStatus === 'ACTIVE' ? 'FORMING' : 'ACTIVE')}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase transition-colors ${
                          gameStatus === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {gameStatus}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary text-xs px-6 py-2 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Fleet Game
                    </button>
                  </div>
                </form>

                {/* Existing Games List */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">// active & forming fleet games ({games.length})</span>
                  </div>

                  <div className="space-y-2">
                    {games.map((g) => (
                      <div
                        key={g.id}
                        className="p-3.5 rounded-lg bg-[#150D22] border border-purple-500/20 flex flex-wrap items-center justify-between gap-3 hover:border-purple-500/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-purple-500/25 text-white border border-purple-400/40 text-xs font-mono font-bold">
                              {g.referenceNumber}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {g.fleetName}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${
                              g.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {g.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                            <span>FC: <strong className="text-purple-300">{g.fcName}</strong></span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {g.date}
                            </span>
                            <span>·</span>
                            <span className="text-cyan-300 font-bold">{g.gridSize}x{g.gridSize} Grid</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete game ${g.referenceNumber} (${g.fleetName})?`)) {
                              onDeleteGame(g.id);
                            }
                          }}
                          className="btn-ghost text-xs px-3 py-1 text-rose-300 hover:text-white hover:border-rose-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete Game
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Bingo Squares Repository */}
            {activeTab === 'calls' && (
              <div className="flex-1 flex flex-col p-5 min-h-0 space-y-3 overflow-hidden">
                {/* Add new call */}
                <form onSubmit={handleAddCall} className="flex gap-2 p-2.5 rounded-lg bg-[#1A1230]/70 border border-purple-500/20">
                  <input
                    type="text"
                    value={newCallText}
                    onChange={(e) => setNewCallText(e.target.value)}
                    placeholder="Enter new fleet call phrase..."
                    className="flex-1 px-3 py-1.5 bg-[#0A0612] border border-purple-500/25 rounded-md text-white placeholder:text-slate-600 text-xs focus:outline-none focus:border-purple-400"
                  />
                  <select
                    value={newCallCat}
                    onChange={(e) => setNewCallCat(e.target.value as 'FC' | 'FLEET' | 'COMBAT' | 'MEMES')}
                    className="px-2.5 py-1.5 bg-[#0A0612] border border-purple-500/25 rounded-md text-slate-300 text-xs font-mono"
                  >
                    <option value="FC">FC</option>
                    <option value="FLEET">FLEET</option>
                    <option value="COMBAT">COMBAT</option>
                    <option value="MEMES">MEMES</option>
                  </select>
                  <button
                    type="submit"
                    className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </form>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search calls..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-[#1A1230] border border-purple-500/20 rounded-md text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#1A1230] p-1 rounded-md border border-purple-500/20 text-xs">
                    {(['ALL', 'FC', 'FLEET', 'COMBAT', 'MEMES'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          categoryFilter === cat
                            ? 'bg-purple-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onResetCalls}
                    className="btn-ghost text-[10px] px-2.5 py-1 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Defaults
                  </button>
                </div>

                {/* Call List */}
                <div className="flex-1 overflow-y-auto min-h-0 border border-purple-500/15 rounded-lg bg-[#0A0612]/60 divide-y divide-purple-500/10 thin-scrollbar">
                  {filteredCalls.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No calls matching query.
                    </div>
                  ) : (
                    filteredCalls.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2.5 gap-3 transition-colors ${
                          item.isActive ? 'hover:bg-purple-500/5' : 'opacity-50 bg-black/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-purple-500/30 text-purple-300 bg-purple-500/10 shrink-0">
                            {item.category}
                          </span>

                          {editingId === item.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 px-2 py-0.5 bg-[#1A1230] border border-purple-400 rounded text-xs text-white uppercase font-mono"
                                autoFocus
                              />
                              <button onClick={() => saveEdit(item.id)} className="text-emerald-400 p-1">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-slate-400 p-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs font-mono truncate ${item.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                              {item.text}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleCallActive(item.id)}
                            className={`p-1 rounded text-xs flex items-center gap-1 ${
                              item.isActive ? 'text-purple-300 hover:bg-purple-500/20' : 'text-slate-500'
                            }`}
                            title={item.isActive ? 'Omit call' : 'Make active'}
                          >
                            {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {editingId !== item.id && (
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteCall(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: Fleet Cards Manager */}
            {activeTab === 'cards' && (
              <div className="flex-1 flex flex-col p-5 min-h-0 space-y-3 overflow-hidden">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 flex items-center justify-between">
                  <span>
                    <strong>Fleet Commander Authority:</strong> Only authenticated admins can delete player cards.
                  </span>
                  <span className="font-mono">{cards.length} Total Cards</span>
                </div>

                <div className="flex-1 overflow-y-auto border border-purple-500/15 rounded-lg bg-[#0A0612]/60 divide-y divide-purple-500/10 thin-scrollbar">
                  {cards.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No cards in memory.
                    </div>
                  ) : (
                    cards.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 gap-3 hover:bg-purple-500/5 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">
                              {c.pilotName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {c.size}x{c.size}
                            </span>
                            <span className="text-xs text-slate-400">
                              {c.fleetName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Marked: <span className="text-purple-300">{c.checkedCount}</span> / {c.size * c.size} · Created {new Date(c.createdAt).toLocaleTimeString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete card belonging to ${c.pilotName}?`)) {
                              onDeleteCard(c.id);
                            }
                          }}
                          className="btn-ghost text-xs px-3 py-1 text-rose-300 hover:text-white hover:border-rose-400 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
