import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FastForward } from 'lucide-react';

interface ObjectiveTransitionProps {
  onComplete: () => void;
  videoSrc?: string;
}

export const ObjectiveTransition: React.FC<ObjectiveTransitionProps> = ({
  onComplete,
  videoSrc = '/video/objectiveachievedpositive.webm',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [opacity, setOpacity] = useState(0);
  const [, setIsClosing] = useState(false);
  const hasFinishedRef = useRef(false);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsClosing(true);
    setOpacity(0);
    setTimeout(() => {
      onComplete();
    }, 280);
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer1 = setTimeout(() => {
      setOpacity(1);
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const autoTimer = setTimeout(() => {
      handleFinish();
    }, 4200);

    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer1);
      clearTimeout(autoTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    const p = v.play();
    if (p !== undefined) {
      p.catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }
  }, []);

  return createPortal(
    <div
      id="objective-transition-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 backdrop-blur-sm overflow-hidden select-none transition-opacity duration-300 ease-out"
      style={{ opacity }}
      onClick={handleFinish}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50"
        style={{ opacity: 0.5 }}
        playsInline
        autoPlay
        muted
        preload="auto"
        onEnded={handleFinish}
      >
        <source src={videoSrc} type="video/webm" />
        <source src="/objectiveachievedpositive.webm" type="video/webm" />
      </video>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pointer-events-none w-full max-w-5xl mx-auto">
        <h1
          id="transition-onboarding-text"
          className="text-[13.2px] sm:text-[15.4px] md:text-[17.6px] font-mono font-medium tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white/95 whitespace-nowrap text-center drop-shadow-[0_0_15px_rgba(6,182,212,0.7)]"
        >
          &lt;pilot onboarding commencing shortly&gt;
        </h1>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleFinish();
        }}
        className="absolute bottom-8 right-8 z-20 flex items-center gap-2 px-4 py-2 rounded border border-white/20 bg-black/60 hover:bg-white/10 hover:border-cyan-400/60 text-xs font-mono tracking-widest text-slate-300 hover:text-cyan-300 transition-all cursor-pointer backdrop-blur-md"
      >
        <span>SKIP TRANSITION</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body
  );
};
