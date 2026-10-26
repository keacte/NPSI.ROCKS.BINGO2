import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  User,
  Shield,
  BookOpen,
  Check,
  ChevronRight,
  Radio,
  Loader2,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { soundFX } from '../utils/audio';
import { api } from '../utils/api';

interface CapsuleerNameScreenProps {
  currentPilotName: string;
  currentAvatarUrl?: string;
  onConfirmName: (name: string, avatarUrl?: string) => void;
  onBackToPortal: () => void;
  onOpenRules: () => void;
  onOpenAdmin: () => void;
  isAdminAuth: boolean;
}

export const CapsuleerNameScreen: React.FC<CapsuleerNameScreenProps> = ({
  currentPilotName,
  currentAvatarUrl,
  onConfirmName,
  onBackToPortal,
  onOpenRules,
  onOpenAdmin,
  isAdminAuth,
}) => {
  const [nameInput, setNameInput] = useState(currentPilotName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentAvatarUrl);
  const [isLookingUpAvatar, setIsLookingUpAvatar] = useState(false);
  const [inputTouched, setInputTouched] = useState(false);

  // Debounced lookup from zKillboard
  useEffect(() => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed.length < 2) {
      setAvatarUrl(undefined);
      setIsLookingUpAvatar(false);
      return;
    }

    let isMounted = true;
    setIsLookingUpAvatar(true);

    const timer = setTimeout(async () => {
      try {
        const url = await api.lookupAvatar(trimmed);
        if (isMounted) {
          setAvatarUrl(url || undefined);
          setIsLookingUpAvatar(false);
        }
      } catch {
        if (isMounted) {
          setIsLookingUpAvatar(false);
        }
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [nameInput]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setInputTouched(true);
      return;
    }
    soundFX.playCllick();
    onConfirmName(trimmed, avatarUrl);
  };

  const isNameValid = nameInput.trim().length > 0;

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(168,85,247,0.25),transparent_65%),radial-gradient(ellipse_70%_50%_at_80%_80%,rgba(6,182,212,0.15),transparent_60%),linear-gradient(to_bottom,rgba(9,11,16,0.65),rgba(9,11,16,0.95))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-cyan-300 border border-purple-500/30 transition-colors backdrop-blur-sm text-xs font-mono cursor-pointer"
            title="Return to Front Page"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal</span>
          </button>

          <BrandLogo className="w-9 h-9 rounded-md shadow-[0_0_12px_rgba(168,85,247,0.35)]" />
          <div>
            <div className="display-font text-lg sm:text-xl text-white leading-none whitespace-nowrap">
              NPSI<span className="brand-purple">.</span>ROCKS<span className="brand-purple">.</span>
              <span className="chromatic-text">BINGO</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              Capsuleer Registration
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
      <main className="relative z-10 w-full max-w-xl mx-auto px-4 flex flex-col justify-center my-auto py-4">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated purple-glow rounded-xl p-6 sm:p-8 border border-purple-500/40 bg-[#0e0a18]/95 shadow-[0_0_50px_rgba(168,85,247,0.35)] backdrop-blur-xl flex flex-col gap-6 text-left"
        >
          {/* Header Badge */}
          <div className="border-b border-purple-500/20 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <User className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="display-font text-xl sm:text-2xl text-white tracking-wide mt-0.5">
                  enter capsuleer name:
                </h1>
              </div>
            </div>
            <span className="text-[10px] font-mono text-purple-300 px-2.5 py-1 rounded bg-purple-500/20 border border-purple-500/30 uppercase tracking-wider hidden sm:inline-block">
              Stage 1 of 2
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="capsuleer-name-input"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>enter capsuleer name:</span>
                </label>
                {!isNameValid && inputTouched && (
                  <span className="text-rose-400 text-[11px] font-mono lowercase">
                    * callsign cannot be empty
                  </span>
                )}
              </div>

              {/* Avatar to the left of the "enter capsuleer name" input box */}
              <div className="flex items-center gap-3">
                <div
                  className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-cyan-400/50 bg-[#07040e] shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center justify-center"
                  title={avatarUrl ? `${nameInput} portrait` : 'Capsuleer avatar'}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={nameInput || 'Capsuleer'}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl(undefined)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      {isLookingUpAvatar ? (
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      ) : (
                        <User className="w-7 h-7 text-slate-600" />
                      )}
                    </div>
                  )}
                </div>

                <div className="relative flex-1">
                  <input
                    id="capsuleer-name-input"
                    type="text"
                    autoFocus
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      setInputTouched(true);
                    }}
                    placeholder="e.g. Capsuleer_o7 or pilot name..."
                    className={`w-full px-4 py-3.5 bg-[#07040e] border rounded-lg text-white font-mono text-base placeholder:text-slate-600 focus:outline-none transition-all ${
                      !isNameValid && inputTouched
                        ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/40'
                        : 'border-cyan-500/50 focus:border-cyan-400 ring-0 focus:ring-2 focus:ring-cyan-400/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]'
                    }`}
                  />
                  {isNameValid && !isLookingUpAvatar && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  )}
                  {isLookingUpAvatar && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-400 animate-spin">
                      <Loader2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono">
                once capsuleer name is complete, please click join an existing game
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToPortal}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-colors cursor-pointer"
              >
                Back to Portal
              </button>

              <button
                type="submit"
                disabled={!isNameValid}
                className="w-full sm:w-auto btn-primary px-6 py-3 text-xs font-mono tracking-wider font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.55)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Join An Existing Game</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-end text-xs font-mono text-slate-500">
        <div>CONCORD SECURE GATEWAY</div>
      </footer>
    </div>
  );
};
