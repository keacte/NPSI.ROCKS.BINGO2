/**
 * EVE Online Tactical SFX Manager
 * Uses the exact audio files provided:
 * - CCAppMenuEnter: when a square is clicked off
 * - claim_button1: when a tier prize is achieved
 * - CCAppSelect: when clicking <join game>, and when clicking "join game and open card"
 */

import { WinTierType } from '../types/bingo';

class SoundFX {
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private fallbackAudio: Map<string, HTMLAudioElement> = new Map();
  private isInitialized: boolean = false;

  private readonly SOUND_PATHS = {
    menuEnter: '/audio/CCAppMenuEnter.mp3',
    claimButton: '/audio/claim_button1.mp3',
    select: '/audio/CCAppSelect.mp3',
    cllick: '/audio/cllick.mp3',
    careerPortalSelectMission: '/audio/career_portal_select_mission.mp3',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initFallbackElements();
      // Unlock audio on first user gesture anywhere on window
      const unlockAudio = () => {
        this.ensureContext();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private initFallbackElements() {
    try {
      for (const [key, path] of Object.entries(this.SOUND_PATHS)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        this.fallbackAudio.set(key, audio);
      }
    } catch (e) {
      console.warn('Fallback audio init warning:', e);
    }
  }

  private async ensureContext() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Preload and decode exact audio buffers into memory
      for (const [key, path] of Object.entries(this.SOUND_PATHS)) {
        try {
          const res = await fetch(path);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const decoded = await this.audioCtx.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(key, decoded);
          }
        } catch {
          // Will use fallback HTMLAudioElement
        }
      }
    } catch (e) {
      console.warn('Web Audio init error:', e);
    }
  }

  private playSound(key: 'menuEnter' | 'claimButton' | 'select' | 'cllick' | 'careerPortalSelectMission', volume: number = 0.8) {
    if (this.isMuted) return;

    // Trigger audio context initialization if not already started
    if (!this.isInitialized) {
      this.ensureContext().catch(() => {});
    }

    // Try Web Audio API first for instant, zero-latency playback
    if (this.audioCtx && this.audioBuffers.has(key)) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffers.get(key)!;
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
        return;
      } catch {
        // Fallback to HTMLAudioElement below
      }
    }

    // HTMLAudioElement Fallback
    try {
      const path = this.SOUND_PATHS[key];
      const audio = new Audio(path);
      audio.volume = volume;
      audio.play().catch(() => {
        // Retry with wav if mp3 is blocked
        const wavPath = path.replace('.mp3', '.wav');
        const wavAudio = new Audio(wavPath);
        wavAudio.volume = volume;
        wavAudio.play().catch(() => {});
      });
    } catch {
      // Audio execution blocked or unhandled
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * CCAppMenuEnter: Sound when a square is clicked off
   */
  public playCCAppMenuEnter() {
    this.playSound('menuEnter', 0.85);
  }

  /**
   * claim_button1: Sound when a tier prize is achieved
   */
  public playClaimButton1() {
    this.playSound('claimButton', 0.95);
  }

  /**
   * CCAppSelect: Sound when you click <join game>
   */
  public playCCAppSelect() {
    this.playSound('select', 0.85);
  }

  /**
   * cllick: Sound when clicking "join an existing game" and "join game and open card"
   */
  public playCllick() {
    this.playSound('cllick', 0.85);
  }

  /**
   * career_portal_select_mission: Sound when front page "<enter>" button is clicked
   */
  public playCareerPortalSelectMission() {
    this.playSound('careerPortalSelectMission', 0.9);
  }

  /**
   * Audible beep when admin is notified of a tier prize or top prize claim
   * Synthesizes a prominent, tactical high-priority alert chime across Web Audio API
   */
  public playAdminAlertBeep() {
    if (this.isMuted) return;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtxClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        // Tactical 3-beep ascending alarm pulse
        const playBeepTone = (freq: number, startOffset: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + startOffset);

          // Snappy envelope for high clarity
          gain.gain.setValueAtTime(0, now + startOffset);
          gain.gain.linearRampToValueAtTime(0.5, now + startOffset + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + startOffset);
          osc.stop(now + startOffset + duration);
        };

        playBeepTone(880, 0, 0.16);
        playBeepTone(1320, 0.19, 0.18);
        playBeepTone(1760, 0.40, 0.28);
      }
    } catch (e) {
      console.warn('Web Audio beep error:', e);
    }

    // Also trigger sound layer
    this.playClaimButton1();
  }

  // Alias methods for compatibility
  public playTileClick(_checked?: boolean) {
    this.playCCAppMenuEnter();
  }

  public playTierWin(_tier?: WinTierType) {
    this.playClaimButton1();
  }
}

export const soundFX = new SoundFX();
