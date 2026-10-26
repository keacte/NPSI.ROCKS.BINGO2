import React, { useState } from 'react';
import { X, BookOpen, Heart } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface RulesAndAckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'rules' | 'acknowledgements';
}

export const RulesAndAckModal: React.FC<RulesAndAckModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'rules',
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'acknowledgements'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl surface-elevated purple-glow flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/15 bg-[#150D22]/80">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-8 h-8" />
            <div>
              <div className="eyebrow">// guidelines</div>
              <h2 className="display-font text-lg text-white">
                Rules & Acknowledgements
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-purple-500/15 bg-[#0A0612]/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
              activeTab === 'rules'
                ? 'bg-[#150D22] text-white border-t-2 border-x-2 border-purple-500/40 shadow-[0_-2px_10px_rgba(168,85,247,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C084FC]" />
            Rules & Prizes
          </button>
          <button
            onClick={() => setActiveTab('acknowledgements')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
              activeTab === 'acknowledgements'
                ? 'bg-[#150D22] text-[#E879F9] border-t-2 border-x-2 border-purple-500/40 shadow-[0_-2px_10px_rgba(168,85,247,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-[#E879F9]" />
            Acknowledgements
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200 leading-relaxed thin-scrollbar text-sm">
          {activeTab === 'rules' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Tier 1, Tier 2, Tier 3 */}
              <div className="space-y-4">
                {/* Tier 1 */}
                <div className="border-b border-purple-500/20 pb-3 space-y-1">
                  <div className="text-slate-100 font-semibold text-sm">Tier 1 - any line (row or column)</div>
                  <div className="text-xs text-purple-300 font-mono leading-relaxed">
                    Vertical line or horizontal line wins a tier 1 prize. Anyone can win Tier 1 prizes. Once one player has a horizontal line or vertical line, they cannot be awarded other verticals or horizontal lines (1 Tier 1 prize maximum per player).
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="border-b border-purple-500/20 pb-3 space-y-1">
                  <div className="text-slate-100 font-semibold text-sm">Tier 2 - centre line (horizontal or vertical)</div>
                  <div className="text-xs text-fuchsia-300 font-mono leading-relaxed">
                    Vertical line or horizontal line through the centre wins a tier 2 prize. Only one person can win Tier 2 across the fleet (awarded to the first player to achieve a center line).
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="space-y-1">
                  <div className="text-slate-100 font-semibold text-sm">Tier 3 - diagonal line</div>
                  <div className="text-xs text-cyan-300 font-mono leading-relaxed">
                    Diagonal line through the centre wins a tier 3 prize. Only one person can win Tier 3 across the fleet (awarded to the first player to achieve a diagonal line).
                  </div>
                </div>
              </div>

              {/* Right Column: Tier 4, Tier 5 (Top Prize), and Remaining Detail */}
              <div className="space-y-4">
                {/* Tier 4 */}
                <div className="border-b border-purple-500/20 pb-3 space-y-1">
                  <div className="text-slate-100 font-semibold text-sm">Tier 4 - 4 corners</div>
                  <div className="text-xs text-emerald-300 font-mono leading-relaxed">
                    All 4 corners checked off win a tier 4 prize. Only one person can win Tier 4 across the fleet (awarded to the first player to complete all 4 corners).
                  </div>
                </div>

                {/* Top Prize (Tier 5) */}
                <div className="border-b border-purple-500/20 pb-3 space-y-1">
                  <div className="text-yellow-200 font-semibold text-sm">Top prize - full house</div>
                  <div className="text-xs text-yellow-300/90 font-mono leading-relaxed">
                    All squares checked off wins top prize. There can only be one person with a &quot;full house&quot; — when that happens the game is finished!
                  </div>
                </div>

                {/* Remaining Detail */}
                <div className="border-l-2 border-purple-500/40 pl-3 py-1 text-slate-400 text-xs">
                  Free square included on every board: center (<code className="text-purple-300">free square, npsi.rocks!</code>) and bonus (<code className="text-yellow-300">you undocked!</code>).
                </div>

                <div className="text-center pt-2">
                  <p className="display-font text-lg text-white">
                    Eyes down Capsuleers! <span className="brand-purple">o7</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-slate-300 leading-relaxed text-sm">
              <p>
                This is a fan-made mini-game inspired by the universe of EVE Online. It was created for fun, and to celebrate the unique player-driven sandbox that makes New Eden so compelling — while also helping to fill the void of those all-too-familiar server downtime blues.
              </p>
              <p>
                Special thanks to CCP Games for developing and maintaining EVE Online, and for building a universe rich enough to inspire countless stories, battles, and side projects like this one.
              </p>
              <p>
                Gratitude to the EVE community — fleet commanders, industrialists, explorers, and line members alike — whose in-game antics, memes, and shared experiences helped shape the tone and humour of this mini-game.
              </p>
              <p className="text-slate-400 text-xs italic">
                Any similarities to actual players, corporations, alliances, or in-game events are purely coincidental or used in a light-hearted, parody context.
              </p>
              <p className="text-slate-400 text-xs font-semibold">
                This project is not affiliated with or endorsed by CCP Games.
              </p>
              <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between">
                <span className="display-font text-base text-white">Fly safe, and stay awesome! <span className="brand-purple">o7</span></span>
                <BrandLogo className="w-8 h-8" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-purple-500/15 bg-[#150D22]/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn-primary text-xs px-6 py-2 uppercase"
          >
            ok
          </button>
        </div>
      </div>
    </div>
  );
};
