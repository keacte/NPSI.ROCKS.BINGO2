import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';
import { soundFX } from '../utils/audio';

const HANGAR_ANNOUNCEMENTS = [
  '/audio/hangar_announcement_sfx_repair_crew.mp3',
  '/audio/hangar_announcement_sfx_new_pilot_training.mp3',
  '/audio/hangar_announcement_sfx_flushing_toilets.mp3',
  '/audio/hangar_announcement_sfx_docking_manager.mp3',
  '/audio/hangar_announcement_sfx_capsuleer_corpses.mp3',
  '/audio/hangar_announcement_sfx_attention_pilots.mp3',
  '/audio/hangar_announcement_sfx_attention_freelancer.mp3',
  '/audio/hangar_announcement_sfx_all_areas_male.mp3',
];

interface FrontPageProps {
  onNavigateToJoinScreen: () => void;
  onViewActiveGames?: () => void;
  onOpenRules?: () => void;
  onOpenAdmin?: () => void;
  isAdminAuth?: boolean;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const FrontPage: React.FC<FrontPageProps> = ({
  onNavigateToJoinScreen,
  onViewActiveGames,
  isAudioMuted = false,
  onToggleAudio,
}) => {
  const [internalMuted, setInternalMuted] = useState(false);
  const isMuted = onToggleAudio ? isAudioMuted : internalMuted;
  const isAudioActive = !isMuted;

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const announcementAudioRef = useRef<HTMLAudioElement | null>(null);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayedAnnouncementRef = useRef<string | null>(null);
  const isAudioActiveRef = useRef(isAudioActive);

  // Sync ref with audio active state
  useEffect(() => {
    isAudioActiveRef.current = isAudioActive;
    if (!isAudioActive && announcementAudioRef.current) {
      announcementAudioRef.current.pause();
    }
  }, [isAudioActive]);

  // Schedule next announcement at random 40-70 second interval at 7.5% volume
  const scheduleAnnouncement = () => {
    if (announcementTimerRef.current) {
      clearTimeout(announcementTimerRef.current);
    }
    // Random 40-70 seconds
    const intervalMs = Math.floor(40000 + Math.random() * 30000);
    announcementTimerRef.current = setTimeout(() => {
      if (!isAudioActiveRef.current) return;

      const available = HANGAR_ANNOUNCEMENTS.filter(
        (file) => file !== lastPlayedAnnouncementRef.current
      );
      const chosenFile = available[Math.floor(Math.random() * available.length)];
      lastPlayedAnnouncementRef.current = chosenFile;

      try {
        if (announcementAudioRef.current) {
          announcementAudioRef.current.pause();
        }
        const audio = new Audio(chosenFile);
        announcementAudioRef.current = audio;
        audio.volume = 0.075; // 7.5% Volume

        audio.onended = () => {
          scheduleAnnouncement();
        };
        audio.onerror = () => {
          scheduleAnnouncement();
        };

        audio.play().catch(() => {
          scheduleAnnouncement();
        });
      } catch {
        scheduleAnnouncement();
      }
    }, intervalMs);
  };

  // Start announcement scheduling on mount
  useEffect(() => {
    scheduleAnnouncement();
    return () => {
      if (announcementAudioRef.current) {
        announcementAudioRef.current.pause();
      }
      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
      }
    };
  }, []);

  // Beep timer: play HardBeep03_dungeons.mp3 every 2 seconds in sync with holographic rhythm
  useEffect(() => {
    if (!isAudioActive) return;

    const playBeep = () => {
      if (!isAudioActiveRef.current) return;
      try {
        const beep = new Audio('/audio/HardBeep03_dungeons.mp3');
        beep.volume = 0.35;
        beep.play().catch(() => {});
      } catch {
        // Autoplay may be restricted until first gesture
      }
    };

    // Initial beep
    playBeep();

    // Exactly every 2 seconds
    const beepInterval = setInterval(() => {
      playBeep();
    }, 2000);

    return () => {
      clearInterval(beepInterval);
    };
  }, [isAudioActive]);

  // Audio toggle button handler
  const handleToggleAudio = () => {
    if (onToggleAudio) {
      onToggleAudio();
    } else {
      setInternalMuted((prev) => !prev);
    }
  };

  // Keyboard shortcut: Press Space or Enter on front page to proceed to Join Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        soundFX.playCareerPortalSelectMission();
        onNavigateToJoinScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateToJoinScreen]);

  const handleHeroButtonClick = () => {
    soundFX.playCareerPortalSelectMission();
    onNavigateToJoinScreen();
  };

  const handleViewActiveGames = () => {
    soundFX.playCCAppMenuEnter();
    if (onViewActiveGames) {
      onViewActiveGames();
    } else {
      onNavigateToJoinScreen();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between bg-[#08090e] select-none text-slate-100 font-['Inter']">
      {/* Background Video with graceful fallback matching npsi-fleet-registration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#090b10]">
        {!videoError && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              videoLoaded ? 'opacity-85' : 'opacity-0'
            }`}
          >
            <source src="/video/backgroundvideo.webm" type="video/webm" />
          </video>
        )}

        {/* Space nebula fallback gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(168,85,247,0.25),transparent_65%),radial-gradient(ellipse_70%_50%_at_80%_80%,rgba(6,182,212,0.15),transparent_60%),linear-gradient(to_bottom,rgba(9,11,16,0.5),rgba(9,11,16,0.92))]" />

        {/* Scanline/Grid subtle overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      </div>

      {/* Top Header with active games icon button and audio toggle */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-end gap-3">
        {/* View Active Games Button (Icon only - takes user to bingo cards in play) */}
        <button
          id="view-active-games-btn"
          type="button"
          onClick={handleViewActiveGames}
          className="flex items-center justify-center p-2 rounded bg-black/60 hover:bg-black/90 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer backdrop-blur-sm shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] group"
          title="View Bingo Cards in Play"
          aria-label="View Bingo Cards in Play"
        >
          <Radio className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
        </button>

        {/* Ambient Audio Toggle Button */}
        <button
          id="ambient-audio-toggle-btn"
          type="button"
          onClick={handleToggleAudio}
          className="flex items-center justify-center p-2 rounded bg-black/60 hover:bg-black/90 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer backdrop-blur-sm shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          title={isAudioActive ? 'Mute Audio' : 'Unmute Audio'}
          aria-label="Toggle Audio"
        >
          {isAudioActive ? (
            <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </header>

      {/* Main Hero Container - Exactly like npsi-fleet-registration.ai.studio with <JOIN GAME> */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 flex flex-col items-center justify-center text-center my-auto py-8">
        <div className="flex flex-col items-center justify-center">
          {/* MASSIVE GLOWING <ENTER FC BINGO> HERO BUTTON - SYNCHRONIZED TO 2-SECOND HOLOGRAPHIC RHYTHM */}
          <motion.button
            id="hero-enter-btn"
            type="button"
            onClick={handleHeroButtonClick}
            animate={{
              opacity: [0.75, 1, 0.75],
              scale: [0.985, 1.03, 0.985],
              filter: [
                'drop-shadow(0 0 14px rgba(34,211,238,0.45)) drop-shadow(0 0 28px rgba(56,189,248,0.3))',
                'drop-shadow(0 0 36px rgba(34,211,238,1)) drop-shadow(0 0 65px rgba(56,189,248,0.9)) drop-shadow(0 0 100px rgba(168,85,247,0.65))',
                'drop-shadow(0 0 14px rgba(34,211,238,0.45)) drop-shadow(0 0 28px rgba(56,189,248,0.3))',
              ],
            }}
            transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{
              scale: 1.07,
              filter:
                'drop-shadow(0 0 40px rgba(34,211,238,1)) drop-shadow(0 0 70px rgba(56,189,248,0.95)) drop-shadow(0 0 110px rgba(168,85,247,0.8))',
            }}
            whileTap={{ scale: 0.94 }}
            className="group relative bg-transparent border-0 outline-none p-6 cursor-pointer flex flex-col items-center justify-center select-none transition-transform"
            aria-label="Enter FC Bingo"
          >
            <span className="font-mono font-black text-3xl sm:text-5xl md:text-6xl tracking-[0.3em] transition-colors uppercase text-cyan-200 group-hover:text-white drop-shadow-[0_0_28px_rgba(34,211,238,0.85)]">
              &lt;ENTER FC BINGO&gt;
            </span>

            {/* Glowing animated underline beam synchronized to 2-second pulse */}
            <motion.div
              animate={{
                opacity: [0.35, 1, 0.35],
                scaleX: [0.7, 1.25, 0.7],
              }}
              transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
              className="h-[2px] w-64 sm:w-96 md:w-[32rem] mt-4 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,1)]"
            />
          </motion.button>
        </div>
      </main>

      {/* Footer spacer (concord security gateway removed) */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4" />
    </div>
  );
};
