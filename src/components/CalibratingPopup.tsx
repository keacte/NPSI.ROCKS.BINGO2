import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface CalibratingPopupProps {
  isOpen: boolean;
  onComplete: () => void;
  fleetName: string;
  size: number;
}

export const CalibratingPopup: React.FC<CalibratingPopupProps> = ({
  isOpen,
  onComplete,
  fleetName,
  size,
}) => {
  const [progress, setProgress] = useState(20);
  const [stageText, setStageText] = useState('LOCKING FLEET GRID...');

  useEffect(() => {
    if (!isOpen) {
      setProgress(20);
      return;
    }

    const t1 = setTimeout(() => {
      setProgress(50);
      setStageText('FETCHING NPSI FLEET CALLS...');
    }, 200);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStageText('SYNCHRONIZING CAPSULEER COMMS...');
    }, 450);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStageText('GRID CALIBRATED · EYES DOWN o7');
    }, 700);

    const t4 = setTimeout(() => {
      onComplete();
    }, 950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm surface-elevated purple-glow p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <BrandLogo className="w-14 h-14" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </div>
        </div>

        <div>
          <div className="eyebrow mb-1">
            calibrating <span className="blink-dot">...</span>
          </div>
          <h3 className="display-font text-xl text-white">
            {fleetName || 'FLEET SQUADRON'}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            GRID: {size}x{size} SECTORS
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-[#1A1230] border border-purple-500/20 rounded-full h-2 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-purple-500 via-[#E879F9] to-purple-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-purple-300 tracking-wider">
            {stageText}
          </p>
        </div>
      </div>
    </div>
  );
};
