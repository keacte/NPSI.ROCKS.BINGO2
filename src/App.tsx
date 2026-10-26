import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  RotateCcw,
  Shield,
  BookOpen,
  Eye,
  Volume2,
  VolumeX,
  ArrowLeft,
  Radio,
  User,
  Calendar,
  Trophy,
  Sparkles,
  X,
  Pause,
  AlertTriangle,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { INITIAL_BINGO_CALLS, BingoCallItem } from './data/defaultCalls';
import { BingoCard, BingoGame, BoardSize, FleetPlayer, WinTierType, PendingPrizeClaim } from './types/bingo';
import { generateCard, evaluateCard } from './utils/bingoLogic';
import { soundFX } from './utils/audio';
import { BrandLogo } from './components/BrandLogo';
import { RulesAndAckModal } from './components/RulesAndAckModal';
import { CalibratingPopup } from './components/CalibratingPopup';
import { LiveFleetSidebar } from './components/LiveFleetSidebar';
import { exportCardAsPNG } from './components/ExportCardCanvas';
import { FrontPage } from './components/FrontPage';
import { ObjectiveTransition } from './components/ObjectiveTransition';
import { CapsuleerNameScreen } from './components/CapsuleerNameScreen';
import { JoinExistingGameScreen } from './components/JoinExistingGameScreen';
import { AdminPage } from './components/AdminPage';
import { ApiGame, api } from './utils/api';

export const DEFAULT_GAMES: ApiGame[] = [];

const TIER_STYLES: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
  TIER_1: {
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(124,58,237,0.35))',
    border: '#A855F7',
    glow: 'rgba(168,85,247,0.55)',
    icon: '#fff',
  },
  TIER_2: {
    bg: 'linear-gradient(135deg, rgba(232,121,249,0.5), rgba(168,85,247,0.4))',
    border: '#E879F9',
    glow: 'rgba(232,121,249,0.6)',
    icon: '#fff',
  },
  TIER_3: {
    bg: 'linear-gradient(135deg, rgba(34,211,238,0.45), rgba(14,165,233,0.35))',
    border: '#22D3EE',
    glow: 'rgba(34,211,238,0.6)',
    icon: '#fff',
  },
  TIER_4: {
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(4,120,87,0.4))',
    border: '#10B981',
    glow: 'rgba(16,185,129,0.6)',
    icon: '#fff',
  },
  TOP_PRIZE: {
    bg: 'linear-gradient(135deg, rgba(250,204,21,0.55), rgba(249,115,22,0.4))',
    border: '#FACC15',
    glow: 'rgba(250,204,21,0.65)',
    icon: '#fff',
  },
};

const TIER_HEADER_BADGES: Record<string, { label: string; bg: string }> = {
  TIER_1: { label: 'TIER 1 WINNER', bg: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
  TIER_2: { label: 'TIER 2 WINNER', bg: 'linear-gradient(135deg, #E879F9, #A855F7)' },
  TIER_3: { label: 'TIER 3 WINNER', bg: 'linear-gradient(135deg, #22D3EE, #0EA5E9)' },
  TIER_4: { label: 'TIER 4 WINNER', bg: 'linear-gradient(135deg, #10B981, #047857)' },
  TOP_PRIZE: { label: 'TOP PRIZE WINNER', bg: 'linear-gradient(135deg, #FACC15, #F97316)' },
};

type AppView = 'frontpage' | 'transition' | 'pilot-name' | 'join-game' | 'game' | 'admin';

// Dynamic text styling helper to ensure text always fits cleanly inside bingo squares
function getSquareTextStyle(text: string, size: BoardSize, isFree: boolean) {
  if (isFree) {
    return {
      fontClass:
        size === 3
          ? 'text-xs sm:text-sm md:text-base font-bold'
          : size === 5
          ? 'text-[10px] sm:text-xs md:text-sm font-bold'
          : 'text-[8px] sm:text-[9px] md:text-[10px] font-bold',
      fontFamily: "font-['Audiowide'] tracking-wider",
      leading: 'leading-tight',
    };
  }

  const len = text.length;

  if (size === 3) {
    if (len <= 25) {
      return { fontClass: 'text-xs sm:text-sm md:text-base font-bold', fontFamily: 'font-sans tracking-tight', leading: 'leading-tight' };
    } else if (len <= 55) {
      return { fontClass: 'text-[11px] sm:text-xs md:text-sm font-semibold', fontFamily: 'font-sans tracking-tight', leading: 'leading-tight' };
    } else {
      return { fontClass: 'text-[10px] sm:text-[11px] md:text-xs font-medium', fontFamily: 'font-sans tracking-tight', leading: 'leading-tight' };
    }
  }

  if (size === 5) {
    if (len <= 20) {
      return { fontClass: 'text-[10px] sm:text-xs md:text-[13px] font-bold', fontFamily: 'font-sans tracking-tight', leading: 'leading-tight' };
    } else if (len <= 40) {
      return { fontClass: 'text-[8.5px] sm:text-[10px] md:text-[11px] font-semibold', fontFamily: 'font-sans tracking-tight', leading: 'leading-[1.12]' };
    } else if (len <= 65) {
      return { fontClass: 'text-[7.5px] sm:text-[8.5px] md:text-[9.5px] font-medium', fontFamily: 'font-sans tracking-tight', leading: 'leading-[1.08]' };
    } else {
      return { fontClass: 'text-[6.5px] sm:text-[7.2px] md:text-[8.2px] font-medium', fontFamily: 'font-sans tracking-tight', leading: 'leading-[1.02]' };
    }
  }

  // size === 7
  if (len <= 20) {
    return { fontClass: 'text-[8px] sm:text-[9px] md:text-[10px] font-bold', fontFamily: 'font-sans tracking-tight', leading: 'leading-tight' };
  } else if (len <= 40) {
    return { fontClass: 'text-[7px] sm:text-[7.5px] md:text-[8.5px] font-semibold', fontFamily: 'font-sans tracking-tight', leading: 'leading-[1.1]' };
  } else if (len <= 60) {
    return { fontClass: 'text-[6px] sm:text-[6.5px] md:text-[7.5px] font-medium', fontFamily: 'font-sans tracking-tight', leading: 'leading-[1.05]' };
  } else {
    return { fontClass: 'text-[5px] sm:text-[5.8px] md:text-[6.5px] font-medium', fontFamily: 'font-sans tracking-tight', leading: 'leading-[1.0]' };
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('frontpage');

  // Backend Admin Authentication Token
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem('npsi_admin_token');
  });

  // Verify token on mount
  useEffect(() => {
    if (adminToken) {
      api.adminVerify(adminToken).then((valid) => {
        if (!valid) {
          setAdminToken(null);
          sessionStorage.removeItem('npsi_admin_token');
        }
      });
    }
  }, [adminToken]);

  const handleAdminAuthChange = (token: string | null) => {
    setAdminToken(token);
    if (token) {
      sessionStorage.setItem('npsi_admin_token', token);
    } else {
      sessionStorage.removeItem('npsi_admin_token');
    }
  };

  // Games in Play loaded from backend
  const [games, setGames] = useState<ApiGame[]>(DEFAULT_GAMES);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [activeGame, setActiveGame] = useState<ApiGame | null>(null);

  const refreshGames = async () => {
    const fetched = await api.getGames();
    if (fetched) {
      setGames(fetched);
      if (fetched.length > 0) {
        setSelectedGameId((prev) => (prev && fetched.some((g) => g.id === prev) ? prev : fetched[0].id));
        setActiveGame((prev) => {
          if (prev) {
            const updated = fetched.find((g) => g.id === prev.id);
            if (updated) return updated;
          }
          return fetched[0];
        });
      } else {
        setSelectedGameId('');
        setActiveGame(null);
      }
    }
  };

  useEffect(() => {
    refreshGames();
  }, []);

  // Pilot & Card State
  const [pilotName, setPilotName] = useState('Capsuleer_o7');
  const [pilotAvatarUrl, setPilotAvatarUrl] = useState<string | undefined>(undefined);
  const [fleetName, setFleetName] = useState('FUN inc Sunday Roam');
  const [, setBoardSize] = useState<BoardSize>(3);
  const [, setShareCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  // Tracks if current player has explicitly clicked "join game and open card"
  const [hasUserJoinedGame, setHasUserJoinedGame] = useState(false);

  const [callsRepository, setCallsRepository] = useState<BingoCallItem[]>(() => {
    const saved = localStorage.getItem('npsi_bingo_calls');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_BINGO_CALLS;
  });

  // Sync calls repository from backend on mount
  useEffect(() => {
    api.getBingoCalls().then((serverCalls) => {
      if (serverCalls && serverCalls.length > 0) {
        setCallsRepository(serverCalls);
        localStorage.setItem('npsi_bingo_calls', JSON.stringify(serverCalls));
      }
    });
  }, []);

  // Active User Card
  const [myCard, setMyCard] = useState<BingoCard>(() => {
    return generateCard(3, INITIAL_BINGO_CALLS, 'Capsuleer_o7', 'FUN inc Roam', 'my-primary-card');
  });

  // Card Displayed (either user's card or spectating another player's card)
  const [activeViewingCard, setActiveViewingCard] = useState<BingoCard>(myCard);
  const [spectatingPilot, setSpectatingPilot] = useState<FleetPlayer | null>(null);

  // Audio mute state
  const [isMuted, setIsMuted] = useState(false);

  // Persistent global ambient audio throughout the entire app
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!ambientAudioRef.current) {
      const audio = new Audio('/audio/AMB_NPE_Amarr_EVE_NPE_Ambience_Safe_MLB.mp3');
      audio.loop = true;
      audio.volume = 0.30;
      ambientAudioRef.current = audio;
    }

    const startAudio = () => {
      if (ambientAudioRef.current && !isMuted) {
        ambientAudioRef.current.play().catch(() => {
          const unlock = () => {
            if (ambientAudioRef.current && !isMuted) {
              ambientAudioRef.current.play().catch(() => {});
            }
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
          };
          window.addEventListener('pointerdown', unlock, { passive: true });
          window.addEventListener('keydown', unlock, { passive: true });
        });
      }
    };

    startAudio();

    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (ambientAudioRef.current) {
      if (isMuted) {
        ambientAudioRef.current.pause();
      } else {
        ambientAudioRef.current.play().catch(() => {});
      }
    }
  }, [isMuted]);

  // Modals & Popups
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [rulesInitialTab, setRulesInitialTab] = useState<'rules' | 'acknowledgements'>('rules');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Win evaluation & tracking
  const [highestWinAchieved, setHighestWinAchieved] = useState<WinTierType | undefined>();
  const [winBannerMessage, setWinBannerMessage] = useState<string | null>(null);
  const prevWinsRef = useRef<Set<string>>(new Set());

  // Game Concluded / Full House Winner Banner (auto-hides after 10 seconds)
  const [showConcludedBanner, setShowConcludedBanner] = useState(false);
  const lastConcludedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeGame) {
      setShowConcludedBanner(false);
      return;
    }
    const isConcluded = activeGame.status === 'CONCLUDED' || Boolean(activeGame.fullHouseWinner);
    if (isConcluded) {
      const key = `${activeGame.id}-${activeGame.status}-${activeGame.fullHouseWinner || ''}`;
      if (lastConcludedKeyRef.current !== key) {
        lastConcludedKeyRef.current = key;
        setShowConcludedBanner(true);
        const timer = setTimeout(() => {
          setShowConcludedBanner(false);
        }, 10000);
        return () => clearTimeout(timer);
      }
    } else {
      lastConcludedKeyRef.current = null;
      setShowConcludedBanner(false);
    }
  }, [activeGame?.id, activeGame?.status, activeGame?.fullHouseWinner]);

  // Auto-hide each winBannerMessage after 10 seconds (10,000 ms)
  useEffect(() => {
    if (!winBannerMessage) return;
    const timer = setTimeout(() => {
      setWinBannerMessage(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [winBannerMessage]);

  // Pending Prize Approvals: State & Audible Beep
  const knownPendingClaimIdsRef = useRef<Set<string>>(new Set());
  const [approvingClaimId, setApprovingClaimId] = useState<string | null>(null);

  useEffect(() => {
    const claims = activeGame?.pendingPrizeClaims || [];
    let shouldBeep = false;
    for (const claim of claims) {
      if (!knownPendingClaimIdsRef.current.has(claim.id)) {
        knownPendingClaimIdsRef.current.add(claim.id);
        shouldBeep = true;
      }
    }
    if (shouldBeep) {
      soundFX.playAdminAlertBeep();
    }
  }, [activeGame?.pendingPrizeClaims]);

  const handleApprovePrizeClaim = async (
    gameId: string,
    claimId: string,
    action: 'approve' | 'reject',
    cardUpdate?: { cardId?: string; squares: BingoCard['squares']; checkedCount?: number }
  ) => {
    if (!adminToken) return;
    setApprovingClaimId(claimId);
    try {
      const res = await api.approvePrizeClaim(gameId, claimId, action, adminToken, cardUpdate);
      if (res.success && res.game) {
        soundFX.playClaimButton1();
        setActiveGame(res.game);
        setGames((prev) => prev.map((g) => (g.id === gameId ? res.game! : g)));

        // If updated cards returned, sync them immediately
        if (res.cards && res.cards.length > 0) {
          const myUpdated = res.cards.find(
            (c) => c.id === myCard.id || c.pilotName.toLowerCase() === pilotName.toLowerCase()
          );
          if (myUpdated) {
            setMyCard(myUpdated);
            if (!spectatingPilot) {
              setActiveViewingCard(myUpdated);
            }
          }
          setFleetPlayers((prev) =>
            prev.map((p) => {
              const matched = res.cards!.find(
                (c) => c.id === p.id || c.pilotName.toLowerCase() === p.pilotName.toLowerCase()
              );
              return matched
                ? {
                    ...p,
                    card: matched,
                    checkedCount: matched.checkedCount,
                    isClosed: matched.isClosed || (matched.rejectedCount || 0) >= 3,
                    rejectedCount: matched.rejectedCount,
                  }
                : p;
            })
          );
        }

        setWinBannerMessage(
          action === 'approve'
            ? `FC Admin approved prize! Fleet game resumes.`
            : `Prize claim rejected. Fleet game resumes.`
        );
      }
    } finally {
      setApprovingClaimId(null);
    }
  };

  // Bingo Card Review state for FC Approval modal
  const [reviewingClaimCard, setReviewingClaimCard] = useState<{
    card: BingoCard;
    claim: PendingPrizeClaim;
  } | null>(null);

  const handleReviewClaimCard = async (claim: PendingPrizeClaim) => {
    // 1. Try from fleetPlayers first
    const found = fleetPlayers.find(
      (p) => p.id === claim.cardId || p.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
    );
    if (found && found.card) {
      setReviewingClaimCard({ card: found.card, claim });
      return;
    }

    // 2. Fetch fresh cards for game
    try {
      const cards = await api.getGameCards(claim.gameId);
      const card = cards.find(
        (c) => c.id === claim.cardId || c.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
      );
      if (card) {
        setReviewingClaimCard({ card, claim });
      } else {
        setWinBannerMessage(`Bingo card data for ${claim.pilotName} could not be loaded.`);
      }
    } catch (err) {
      console.error('Error fetching card for review:', err);
    }
  };

  // Recalibration Clock Timer
  const [recalibrationSeconds, setRecalibrationSeconds] = useState(30);

  // Fleet Players Roster on this game (fetched from backend)
  const [fleetPlayers, setFleetPlayers] = useState<FleetPlayer[]>([]);

  // Auto-fetch zKillboard avatar for pilot if not already populated
  useEffect(() => {
    const trimmed = pilotName.trim();
    if (!pilotAvatarUrl && trimmed && trimmed !== 'Capsuleer_o7') {
      api.lookupAvatar(trimmed).then((url) => {
        if (url) {
          setPilotAvatarUrl(url);
          setMyCard((prev) => ({ ...prev, avatarUrl: url }));
          setActiveViewingCard((prev) => (prev.id === myCard.id ? { ...prev, avatarUrl: url } : prev));
        }
      });
    }
  }, [pilotName, pilotAvatarUrl, myCard.id]);

  // Periodically fetch and sync cards & game status for the active game
  useEffect(() => {
    if (currentView !== 'game' || !activeGame) return;

    const fetchGameCards = async () => {
      try {
        const [serverCards, serverGames] = await Promise.all([
          api.getGameCards(activeGame.id),
          api.getGames(),
        ]);

        if (serverGames && serverGames.length > 0) {
          setGames(serverGames);
          const current = serverGames.find((g) => g.id === activeGame.id);
          if (current) {
            setActiveGame(current);
          }
        }

        const rawServerCards = serverCards || [];

        // Sync local card if server card has changed squares (e.g. admin deselected/rolled back tiles) or closure/rejections
        const myServerCard = rawServerCards.find(
          (c) => c.id === myCard.id || c.pilotName.toLowerCase() === pilotName.toLowerCase()
        );
        if (myServerCard) {
          const serverUpdated = myServerCard.lastUpdated || 0;
          const localUpdated = myCard.lastUpdated || 0;

          const localCheckedMap = JSON.stringify(myCard.squares.map((r) => r.map((s) => s.isChecked)));
          const serverCheckedMap = JSON.stringify(myServerCard.squares.map((r) => r.map((s) => s.isChecked)));
          const squaresDiffer = localCheckedMap !== serverCheckedMap;
          const closureDiffer =
            myCard.isClosed !== myServerCard.isClosed || myCard.rejectedCount !== myServerCard.rejectedCount;

          if (serverUpdated > localUpdated || squaresDiffer || closureDiffer) {
            const updatedCount = myServerCard.squares.flat().filter((sq) => sq.isChecked).length;
            const syncedCard: BingoCard = {
              ...myCard,
              ...myServerCard,
              squares: myServerCard.squares,
              checkedCount: updatedCount,
              rejectedCount: myServerCard.rejectedCount ?? myCard.rejectedCount,
              isClosed: myServerCard.isClosed ?? myCard.isClosed,
              closedReason: myServerCard.closedReason ?? myCard.closedReason,
              lastUpdated: Math.max(serverUpdated, Date.now()),
            };

            setMyCard(syncedCard);
            if (!spectatingPilot) {
              setActiveViewingCard(syncedCard);
            }
          }
        }

        const mapped: FleetPlayer[] = rawServerCards.map((c) => {
          const isMe = hasUserJoinedGame && (c.id === myCard.id || c.pilotName.toLowerCase() === pilotName.toLowerCase());
          const serverChecked = c.squares.flat().filter((sq) => sq.isChecked).length;
          const localChecked = myCard.squares.flat().filter((sq) => sq.isChecked).length;
          // If server card has fewer checked tiles (admin deselected) or is newer, prefer c
          const cardToUse = isMe && (myCard.lastUpdated > (c.lastUpdated || 0)) && localChecked <= serverChecked ? myCard : c;
          const flat = cardToUse.squares.flat();
          const checkedCount = flat.filter((sq) => sq.isChecked).length;
          const evalResult = evaluateCard(cardToUse.squares);

          // If we are currently spectating this specific player's card, keep it in sync
          if (spectatingPilot && (spectatingPilot.id === c.id || spectatingPilot.card.id === c.id)) {
            setActiveViewingCard(c);
          }

          return {
            id: c.id,
            pilotName: c.pilotName,
            avatarUrl: c.avatarUrl || (isMe ? pilotAvatarUrl : undefined),
            fleetName: c.fleetName || activeGame.fleetName,
            shipType: (c as { shipType?: string }).shipType || (isMe ? 'DPS Cruiser' : 'Fleet Cruiser'),
            size: c.size,
            card: cardToUse,
            checkedCount,
            totalSquares: flat.length,
            highestTier: evalResult.highestTier,
            lastActive: 'Active now',
            isCurrentUser: isMe,
            rejectedCount: cardToUse.rejectedCount,
            isClosed: cardToUse.isClosed || (cardToUse.rejectedCount || 0) >= 3,
          };
        });

        // ONLY show active pilots who have clicked "join an existing game"
        // If current user has actually joined this game, make sure they are in the list even if server hasn't saved yet
        if (hasUserJoinedGame) {
          const hasCurrentUser = mapped.some((p) => p.isCurrentUser);
          if (!hasCurrentUser) {
            mapped.unshift({
              id: myCard.id,
              pilotName: pilotName,
              avatarUrl: myCard.avatarUrl || pilotAvatarUrl,
              fleetName: activeGame.fleetName,
              shipType: 'DPS Cruiser',
              size: myCard.size,
              card: myCard,
              checkedCount: myCard.checkedCount,
              totalSquares: myCard.size * myCard.size,
              highestTier: evaluateCard(myCard.squares).highestTier,
              lastActive: 'Active now',
              isCurrentUser: true,
            });
          }
        }

        setFleetPlayers(mapped);
      } catch (err) {
        console.error('Error syncing game cards:', err);
      }
    };

    fetchGameCards();
    const interval = setInterval(fetchGameCards, 2000);
    return () => clearInterval(interval);
  }, [currentView, activeGame?.id, myCard.id, myCard.checkedCount, myCard.lastUpdated, pilotName, pilotAvatarUrl, spectatingPilot, hasUserJoinedGame]);

  // Recalibration countdown timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setRecalibrationSeconds((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Evaluate currently viewed card
  const evalResult = evaluateCard(activeViewingCard.squares);
  const myEvalResult = evaluateCard(myCard.squares);

  // Trigger win effects when user achieves a new tier
  useEffect(() => {
    if (spectatingPilot) return;

    const currentTiers = myEvalResult.tiers;
    if (currentTiers.length === 0) return;

    let newlyAchievedTier: WinTierType | null = null;
    currentTiers.forEach((tierInfo) => {
      if (tierInfo.unlocked && !prevWinsRef.current.has(tierInfo.tier)) {
        prevWinsRef.current.add(tierInfo.tier);
        newlyAchievedTier = tierInfo.tier;
      }
    });

    if (newlyAchievedTier) {
      soundFX.playClaimButton1();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A855F7', '#E879F9', '#22D3EE', '#FACC15'],
      });
      setHighestWinAchieved(myEvalResult.highestTier);
      const tierLabel = (newlyAchievedTier as string).replace('_', ' ');
      setWinBannerMessage(`VICTORY! ${tierLabel} ACHIEVED!`);
    }

    if (!spectatingPilot) {
      setActiveViewingCard(myCard);
    }
  }, [myCard, myEvalResult.highestTier, spectatingPilot, myEvalResult.tiers]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFX.setMuted(next);
  };

  // SQUARE CLICK HANDLER:
  // "you can see other peoples cards, but cannot mark any squares off"
  const handleSquareClick = async (r: number, c: number) => {
    // If user has not joined this game (observer mode), prompt them to join
    if (!hasUserJoinedGame) {
      if (activeGame?.status === 'CONCLUDED' || activeGame?.fullHouseWinner) {
        setWinBannerMessage('This fleet operation has concluded.');
      } else {
        setWinBannerMessage('Click "Join An Existing Game" to get your own card and play!');
      }
      setTimeout(() => setWinBannerMessage(null), 3000);
      return;
    }

    // If spectating another player:
    if (spectatingPilot) {
      // IF current user is FC Admin, allow admin override to deselect or mark squares!
      if (adminToken && activeGame) {
        const target = activeViewingCard.squares[r][c];
        if (target.isFree) return;
        const nextChecked = !target.isChecked;
        soundFX.playCCAppMenuEnter();

        const updatedSquares = activeViewingCard.squares.map((row, rowIdx) =>
          row.map((colSquare, colIdx) => {
            if (rowIdx === r && colIdx === c) {
              return { ...colSquare, isChecked: nextChecked };
            }
            return colSquare;
          })
        );
        const newCheckedCount = updatedSquares.flat().filter((sq) => sq.isChecked).length;
        const updatedCard = {
          ...activeViewingCard,
          squares: updatedSquares,
          checkedCount: newCheckedCount,
          lastUpdated: Date.now(),
        };

        setActiveViewingCard(updatedCard);
        setFleetPlayers((prev) =>
          prev.map((p) =>
            p.id === updatedCard.id || p.pilotName.toLowerCase() === updatedCard.pilotName.toLowerCase()
              ? { ...p, card: updatedCard, checkedCount: newCheckedCount }
              : p
          )
        );

        api.adminUpdateCard(activeGame.id, updatedCard.id, updatedSquares, newCheckedCount, adminToken);
        setWinBannerMessage(
          `FC Admin Override: ${nextChecked ? 'Checked' : 'Deselected'} square for ${spectatingPilot.pilotName}.`
        );
        setTimeout(() => setWinBannerMessage(null), 2500);
        return;
      }

      setWinBannerMessage(`Spectating ${spectatingPilot.pilotName}: You cannot mark squares on another pilot's card.`);
      setTimeout(() => setWinBannerMessage(null), 3000);
      return;
    }

    // Rule: If card is closed (e.g. 3 rejected claims by FC Admin), no further squares can be marked
    if (myCard.isClosed || (myCard.rejectedCount || 0) >= 3) {
      setWinBannerMessage(
        myCard.closedReason || 'CARD CLOSED: 3 prize claims were rejected by FC Admin. No further squares can be marked.'
      );
      setTimeout(() => setWinBannerMessage(null), 4000);
      return;
    }

    // Rule: When the game is paused awaiting FC Admin prize approval, no further squares can be marked
    if (activeGame?.isPausedForApproval && (activeGame.pendingPrizeClaims?.length ?? 0) > 0) {
      const claim = activeGame.pendingPrizeClaims![0];
      setWinBannerMessage(
        `GAME PAUSED: Awaiting FC Admin approval of ${claim.pilotName}'s ${claim.tierTitle} before the fleet game can continue.`
      );
      setTimeout(() => setWinBannerMessage(null), 4000);
      return;
    }

    // Rule: When a full house happens the game is finished - no further squares can be marked
    if (activeGame?.status === 'CONCLUDED' || activeGame?.fullHouseWinner) {
      const notice = activeGame?.fullHouseWinner
        ? `Top Prize "Full house" was won by ${activeGame.fullHouseWinner}!`
        : 'This fleet game has concluded.';
      setWinBannerMessage(`GAME FINISHED: ${notice}`);
      setTimeout(() => setWinBannerMessage(null), 3500);
      return;
    }

    const target = myCard.squares[r][c];
    if (target.isFree) return;

    const nextChecked = !target.isChecked;
    soundFX.playCCAppMenuEnter();

    const updatedSquares = myCard.squares.map((row, rowIdx) =>
      row.map((colSquare, colIdx) => {
        if (rowIdx === r && colIdx === c) {
          return { ...colSquare, isChecked: nextChecked };
        }
        return colSquare;
      })
    );

    const newCheckedCount = updatedSquares.flat().filter((sq) => sq.isChecked).length;
    const myEval = evaluateCard(updatedSquares);
    const hasFullHouse = myEval.tiers.find((t) => t.tier === 'TOP_PRIZE')?.unlocked;
    const hasTier4 = myEval.tiers.find((t) => t.tier === 'TIER_4')?.unlocked;
    const hasTier3 = myEval.tiers.find((t) => t.tier === 'TIER_3')?.unlocked;
    const hasTier2 = myEval.tiers.find((t) => t.tier === 'TIER_2')?.unlocked;
    const hasTier1 = myEval.tiers.find((t) => t.tier === 'TIER_1')?.unlocked;

    // Rule: there can only be one person with a "full house" - when that happens the game is finished.
    if (hasFullHouse) {
      if (activeGame?.fullHouseWinner && activeGame.fullHouseWinner.toLowerCase() !== pilotName.toLowerCase()) {
        setWinBannerMessage(
          `GAME FINISHED: Only one person can have Full House! Top prize already won by ${activeGame.fullHouseWinner}.`
        );
        setTimeout(() => setWinBannerMessage(null), 4000);
        return;
      }

      // First person to achieve Full House!
      soundFX.playClaimButton1();
      setWinBannerMessage(`🏆 TOP PRIZE "FULL HOUSE" ACHIEVED! GAME FINISHED! 🏆`);
      if (activeGame) {
        setActiveGame((prev) =>
          prev
            ? {
                ...prev,
                status: 'CONCLUDED',
                fullHouseWinner: pilotName,
                fullHouseWinnerAvatar: pilotAvatarUrl,
              }
            : prev
        );
      }
    } else if (hasTier4 && !activeGame?.tier4Winner) {
      soundFX.playClaimButton1();
      setWinBannerMessage(`🎉 YOU WON TIER 4 PRIZE! (4 Corners Checked) 🎉`);
      if (activeGame) {
        setActiveGame((prev) =>
          prev
            ? {
                ...prev,
                tier4Winner: pilotName,
                tier4WinnerAvatar: pilotAvatarUrl,
              }
            : prev
        );
      }
    } else if (hasTier3 && !activeGame?.tier3Winner) {
      soundFX.playClaimButton1();
      setWinBannerMessage(`🎉 YOU WON TIER 3 PRIZE! (Diagonal Line Win) 🎉`);
      if (activeGame) {
        setActiveGame((prev) =>
          prev
            ? {
                ...prev,
                tier3Winner: pilotName,
                tier3WinnerAvatar: pilotAvatarUrl,
              }
            : prev
        );
      }
    } else if (hasTier2 && !activeGame?.tier2Winner) {
      soundFX.playClaimButton1();
      setWinBannerMessage(`🎉 YOU WON TIER 2 PRIZE! (Center Line Win) 🎉`);
      if (activeGame) {
        setActiveGame((prev) =>
          prev
            ? {
                ...prev,
                tier2Winner: pilotName,
                tier2WinnerAvatar: pilotAvatarUrl,
              }
            : prev
        );
      }
    } else if (hasTier1 && !prevWinsRef.current.has('TIER_1')) {
      soundFX.playClaimButton1();
      setWinBannerMessage(`🎉 TIER 1 PRIZE ACHIEVED! (Line Win) 🎉`);
      prevWinsRef.current.add('TIER_1');
    }

    const updatedCard: BingoCard = {
      ...myCard,
      squares: updatedSquares,
      checkedCount: newCheckedCount,
      lastUpdated: Date.now(),
    };

    setMyCard(updatedCard);
    setActiveViewingCard(updatedCard);

    // Dynamically update the Playing Now leaderboard instantaneously
    setFleetPlayers((prev) => {
      const exists = prev.some(
        (p) => p.id === updatedCard.id || p.pilotName.toLowerCase() === pilotName.toLowerCase()
      );
      if (exists) {
        return prev.map((p) => {
          if (p.id === updatedCard.id || p.pilotName.toLowerCase() === pilotName.toLowerCase()) {
            return {
              ...p,
              card: updatedCard,
              avatarUrl: p.avatarUrl || updatedCard.avatarUrl || pilotAvatarUrl,
              checkedCount: newCheckedCount,
              highestTier: myEval.highestTier,
            };
          }
          return p;
        });
      } else {
        return [
          {
            id: updatedCard.id,
            pilotName: pilotName,
            avatarUrl: updatedCard.avatarUrl || pilotAvatarUrl,
            fleetName: activeGame?.fleetName || fleetName,
            shipType: 'DPS Cruiser',
            size: updatedCard.size,
            card: updatedCard,
            checkedCount: newCheckedCount,
            totalSquares: updatedCard.size * updatedCard.size,
            highestTier: myEval.highestTier,
            lastActive: 'Active now',
            isCurrentUser: true,
          },
          ...prev,
        ];
      }
    });

    // Sync marked squares to backend
    if (activeGame) {
      api.updateCardSquares(activeGame.id, updatedCard.id, updatedSquares, newCheckedCount).then((res) => {
        if (res.game) {
          setActiveGame(res.game);
          setGames((prev) => prev.map((g) => (g.id === activeGame.id ? res.game! : g)));
        }
        if (res.game?.isPausedForApproval && (res.game.pendingPrizeClaims?.length ?? 0) > 0) {
          soundFX.playClaimButton1();
          const firstClaim = res.game.pendingPrizeClaims![0];
          const isMyClaim = firstClaim.pilotName.toLowerCase() === pilotName.toLowerCase();
          setWinBannerMessage(
            isMyClaim
              ? `🏆 ${firstClaim.tierTitle} achieved! Sent to FC Admin for approval. Game is paused.`
              : `⏸️ Prize claim submitted by ${firstClaim.pilotName}! Awaiting FC Admin approval.`
          );
        } else if (res.gameFinished && res.fullHouseWinner) {
          setActiveGame((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'CONCLUDED',
                  fullHouseWinner: res.fullHouseWinner,
                  ...(res.game || {}),
                }
              : prev
          );
        }
      });
    }
  };

  // Join a game from PilotEntryScreen
  const handleJoinGame = async (game: ApiGame, enteredPilotName: string) => {
    if (game.status === 'CONCLUDED' || Boolean(game.fullHouseWinner)) {
      setWinBannerMessage('Cannot join: This fleet game has concluded.');
      return;
    }
    const trimmedName = enteredPilotName.trim() || 'Capsuleer_o7';
    setPilotName(trimmedName);
    setActiveGame(game);
    setSelectedGameId(game.id);
    setFleetName(game.fleetName);
    setBoardSize(game.gridSize);

    // Fetch latest active bingo calls from backend if available
    let activeCalls = callsRepository;
    try {
      const serverCalls = await api.getBingoCalls();
      if (serverCalls && serverCalls.length > 0) {
        setCallsRepository(serverCalls);
        activeCalls = serverCalls;
      }
    } catch {
      // use current repository
    }

    const newCard = generateCard(
      game.gridSize,
      activeCalls,
      trimmedName,
      game.fleetName,
      `card-${Date.now()}`
    );
    newCard.avatarUrl = pilotAvatarUrl;
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setShareCode(newCode);
    prevWinsRef.current = new Set();
    setMyCard(newCard);
    setActiveViewingCard(newCard);
    setSpectatingPilot(null);

    // Mark that user has actively joined this game
    setHasUserJoinedGame(true);

    // Register card on backend server
    await api.registerCard(game.id, newCard);

    setIsCalibrating(true);
    setCurrentView('game');
  };

  const handleSelectPlayerCard = (player: FleetPlayer) => {
    if (player.isCurrentUser) {
      setSpectatingPilot(null);
      setActiveViewingCard(myCard);
    } else {
      setSpectatingPilot(player);
      setActiveViewingCard(player.card);
    }
  };

  const handleExportPng = async () => {
    setExporting(true);
    try {
      await exportCardAsPNG(
        activeViewingCard,
        evalResult.tiers,
        spectatingPilot ? spectatingPilot.pilotName : pilotName,
        spectatingPilot ? spectatingPilot.fleetName : fleetName
      );
    } finally {
      setExporting(false);
    }
  };

  const handleResetCurrentCard = () => {
    if (spectatingPilot) return;
    if (myCard.isClosed || (myCard.rejectedCount || 0) >= 3) {
      setWinBannerMessage('This card has been closed after 3 rejected claims and cannot be reset.');
      setTimeout(() => setWinBannerMessage(null), 3000);
      return;
    }
    const resetSquares = myCard.squares.map((row) =>
      row.map((sq) => (sq.isFree ? sq : { ...sq, isChecked: false }))
    );
    const updated: BingoCard = {
      ...myCard,
      squares: resetSquares,
      checkedCount: myCard.size % 2 === 1 ? 1 : 0,
    };
    prevWinsRef.current = new Set();
    setMyCard(updated);
    setActiveViewingCard(updated);

    // Dynamically update the Playing Now leaderboard on reset
    setFleetPlayers((prev) =>
      prev.map((p) => {
        if (p.id === updated.id || p.pilotName.toLowerCase() === pilotName.toLowerCase()) {
          return {
            ...p,
            card: updated,
            checkedCount: updated.checkedCount,
            highestTier: undefined,
          };
        }
        return p;
      })
    );

    if (activeGame) {
      api.updateCardSquares(activeGame.id, updated.id, resetSquares, updated.checkedCount);
    }
  };

  // Build tile win highlight map
  const winCellMap = new Map<string, WinTierType>();
  evalResult.winningLines.forEach((line) => {
    line.indices.forEach(([r, c]) => {
      winCellMap.set(`${r}-${c}`, line.tier);
    });
  });

  const displayTier = spectatingPilot ? evalResult.highestTier : highestWinAchieved;
  const currentBadge = displayTier ? TIER_HEADER_BADGES[displayTier] : null;

  // VIEW 1: FRONT PAGE (Clean landing with <JOIN GAME>)
  if (currentView === 'frontpage') {
    return (
      <div className="w-screen h-screen overflow-hidden">
        <FrontPage
          onNavigateToJoinScreen={() => setCurrentView('transition')}
          onViewActiveGames={async () => {
            const fetched = await api.getGames();
            let gameToView = activeGame;
            if (fetched && fetched.length > 0) {
              setGames(fetched);
              const gameWithCards = fetched.find((g) => (g.cardCount || 0) > 0) || fetched[0];
              gameToView = activeGame && fetched.some((g) => g.id === activeGame.id) ? activeGame : gameWithCards;
              setActiveGame(gameToView);
              setSelectedGameId(gameToView.id);
            }

            if (gameToView) {
              try {
                const cards = await api.getGameCards(gameToView.id);
                if (cards && cards.length > 0) {
                  const myRegistered = cards.find(
                    (c) => c.id === myCard.id || c.pilotName.toLowerCase() === pilotName.toLowerCase()
                  );
                  if (myRegistered) {
                    setMyCard(myRegistered);
                    setActiveViewingCard(myRegistered);
                    setSpectatingPilot(null);
                  } else {
                    const firstCard = cards[0];
                    setActiveViewingCard(firstCard);
                    setSpectatingPilot({
                      id: firstCard.id,
                      pilotName: firstCard.pilotName,
                      fleetName: firstCard.fleetName,
                      shipType: (firstCard as { shipType?: string }).shipType || 'Fleet Cruiser',
                      size: firstCard.size,
                      card: firstCard,
                      checkedCount: firstCard.checkedCount,
                      totalSquares: firstCard.squares.flat().length,
                      highestTier: evaluateCard(firstCard.squares).highestTier,
                      lastActive: 'Active now',
                      isCurrentUser: false,
                    });
                  }
                } else if (myCard.size !== gameToView.gridSize) {
                  const newCard = generateCard(
                    gameToView.gridSize,
                    callsRepository,
                    pilotName,
                    gameToView.fleetName,
                    myCard.id
                  );
                  setMyCard(newCard);
                  setActiveViewingCard(newCard);
                }
              } catch (err) {
                console.error('Error fetching cards for active game:', err);
              }
              setCurrentView('game');
            } else {
              setCurrentView('join-game');
            }
          }}
          onOpenRules={() => {
            setRulesInitialTab('rules');
            setIsRulesModalOpen(true);
          }}
          onOpenAdmin={() => setCurrentView('admin')}
          isAdminAuth={!!adminToken}
          isAudioMuted={isMuted}
          onToggleAudio={toggleMute}
        />

        <RulesAndAckModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          initialTab={rulesInitialTab}
        />
      </div>
    );
  }

  // VIEW 2: OBJECTIVE TRANSITION ("add 'objectiveachievedpositive' as transition after <join game> is clicked")
  if (currentView === 'transition') {
    return (
      <div className="w-screen h-screen overflow-hidden">
        <FrontPage
          onNavigateToJoinScreen={() => {}}
          isAdminAuth={!!adminToken}
          isAudioMuted={isMuted}
          onToggleAudio={toggleMute}
        />
        <ObjectiveTransition
          onComplete={() => setCurrentView('pilot-name')}
        />
      </div>
    );
  }

  // VIEW 3: CAPSULEER NAME SCREEN ("that goes to a page with 'enter capsuleer name:' on it")
  if (currentView === 'pilot-name') {
    return (
      <div className="w-screen h-screen overflow-hidden">
        <CapsuleerNameScreen
          currentPilotName={pilotName}
          currentAvatarUrl={pilotAvatarUrl}
          onConfirmName={(name, avatar) => {
            setPilotName(name);
            setPilotAvatarUrl(avatar);
            setCurrentView('join-game');
          }}
          onBackToPortal={() => setCurrentView('frontpage')}
          onOpenRules={() => {
            setRulesInitialTab('rules');
            setIsRulesModalOpen(true);
          }}
          onOpenAdmin={() => setCurrentView('admin')}
          isAdminAuth={!!adminToken}
        />

        <RulesAndAckModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          initialTab={rulesInitialTab}
        />
      </div>
    );
  }

  // VIEW 4: JOIN AN EXISTING GAME SCREEN ("which when entered, goes to the join an existing game screen")
  if (currentView === 'join-game') {
    return (
      <div className="w-screen h-screen overflow-hidden">
        <JoinExistingGameScreen
          games={games}
          selectedGameId={selectedGameId}
          onSelectGame={(id) => {
            setSelectedGameId(id);
            const found = games.find((g) => g.id === id);
            if (found) setActiveGame(found);
          }}
          pilotName={pilotName}
          onEditPilotName={() => setCurrentView('pilot-name')}
          onJoinGame={handleJoinGame}
          onBackToPortal={() => setCurrentView('frontpage')}
          onOpenRules={() => {
            setRulesInitialTab('rules');
            setIsRulesModalOpen(true);
          }}
          onOpenAdmin={() => setCurrentView('admin')}
          isAdminAuth={!!adminToken}
        />

        <RulesAndAckModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          initialTab={rulesInitialTab}
        />
      </div>
    );
  }

  // VIEW 3: ADMIN PAGE ("allows only the admin to delete games in play, cards on a game")
  if (currentView === 'admin') {
    return (
      <div className="min-h-screen">
        <AdminPage
          onBackToPortal={() => setCurrentView('frontpage')}
          onReturnToActiveGame={() => {
            if (activeGame) {
              setCurrentView('game');
            } else {
              setCurrentView('join-game');
            }
          }}
          hasActiveGame={!!activeGame}
          adminToken={adminToken}
          onAdminAuthChange={handleAdminAuthChange}
          onRefreshData={refreshGames}
        />
      </div>
    );
  }

  // VIEW 4: ACTIVE GAME VIEW
  // "once in the game, you cannot start a new card, and you cannot create a new game"
  // "you can see other peoples cards, but cannot mark any squares off"
  if (!activeGame) {
    return (
      <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-[#08090e] text-slate-100 font-mono">
        <div className="text-center space-y-4 p-6 rounded-xl surface-elevated border border-purple-500/30">
          <p className="text-slate-400 text-sm">No active fleet game selected.</p>
          <button
            type="button"
            onClick={() => setCurrentView('join-game')}
            className="btn-primary text-xs px-4 py-2 uppercase tracking-wider cursor-pointer"
          >
            Join An Existing Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-[100dvh] flex flex-col px-2.5 sm:px-4 lg:px-6 py-2 sm:py-2.5 max-w-[1600px] mx-auto select-none overflow-hidden" data-testid="bingo-app">
      {/* Topnav */}
      <header className="flex items-center justify-between gap-4 pb-3 border-b border-purple-500/15 shrink-0">
        <div
          onClick={() => setCurrentView('frontpage')}
          className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity"
          title="Return to Home Portal"
        >
          <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12 rounded-md shadow-[0_0_12px_rgba(168,85,247,0.35)]" />
          <div>
            <div className="display-font text-xl sm:text-2xl text-white leading-none whitespace-nowrap">
              NPSI<span className="brand-purple">.</span>ROCKS<span className="brand-purple">.</span>
              <span className="chromatic-text">BINGO</span>
            </div>
          </div>
        </div>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-2">
          {/* Back to Portal button */}
          <button
            type="button"
            onClick={() => setCurrentView('frontpage')}
            className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white"
            title="Return to Home Portal"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Portal</span>
          </button>

          {/* Rules Modal Link */}
          <button
            type="button"
            onClick={() => {
              setRulesInitialTab('rules');
              setIsRulesModalOpen(true);
            }}
            className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C084FC]" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Audio toggle button */}
          <button
            type="button"
            onClick={toggleMute}
            className="btn-ghost text-xs p-2 flex items-center justify-center cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#C084FC]" />}
          </button>

          {/* FC Admin Console button (Navigates to Admin Page) */}
          <button
            type="button"
            onClick={() => setCurrentView('admin')}
            className={`btn-ghost text-xs p-2 flex items-center justify-center cursor-pointer ${
              adminToken ? 'border-purple-400 text-white bg-purple-500/20' : ''
            }`}
            title="FC Admin Console (Manage Games & Cards)"
          >
            <Shield className="w-3.5 h-3.5 text-[#E879F9]" />
          </button>
        </nav>
      </header>

      {/* 3-COLUMN DESKTOP GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 lg:gap-5 pt-3 overflow-hidden">
        {/* LEFT COLUMN: ACTIVE GAMES */}
        <aside className="flex flex-col gap-3 min-h-0 overflow-y-auto thin-scrollbar pr-1 lg:pr-2">
          {/* Active Games Panel */}
          <div className="surface-elevated p-4 space-y-3">
            {/* "Active Game" Header */}
            <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Active Game</span>
            </div>

            {/* GAME NAME & BINGO GAME TYPE */}
            <div>
              <div className="text-sm font-semibold text-white truncate">
                {activeGame.fleetName}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-purple-400" />
                  <span>FC: <strong className="text-white">{activeGame.fcName}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{activeGame.date}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-purple-500/15">
                  <div className="text-[10px] uppercase font-mono text-purple-300">Bingo Game Type</div>
                  <div className="text-xs font-mono font-bold text-cyan-300 mt-1 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-200">
                      {activeGame.gridSize}x{activeGame.gridSize}
                    </span>
                    <span>
                      {activeGame.gridSize === 3 ? 'Standard Bingo' : activeGame.gridSize === 5 ? '5x5 Bingo' : 'Epic Bingo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PRIZE TIERS & SELECTED WINNERS LISTING - PLACED UNDER GAME NAME & BINGO GAME TYPE */}
            <div className="pt-2 border-t border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-purple-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Prize Tiers
                </span>
                {activeGame.status === 'CONCLUDED' || activeGame.fullHouseWinner ? (
                  <span className="text-[9px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                    WINNERS CHOSEN
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">IN PLAY</span>
                )}
              </div>

              <div className="space-y-1 text-xs font-mono">
                {(() => {
                  // Rule: strictly only ONE person with a "full house" - when that happens the game is finished.
                  const topPrizeWinnerList: { pilotName: string }[] = (() => {
                    if (activeGame.fullHouseWinner) {
                      return [{ pilotName: activeGame.fullHouseWinner }];
                    }
                    const fromWinners = (activeGame.winners || []).find((w) => {
                      if (w.tierType === 'TOP_PRIZE') return true;
                      if (w.allTiers && w.allTiers.some((t) => t.tier === 'TOP_PRIZE')) return true;
                      return false;
                    });
                    if (fromWinners) {
                      return [{ pilotName: fromWinners.pilotName }];
                    }
                    const activePlayerWithFullHouse = fleetPlayers.find((p) => {
                      const ev = evaluateCard(p.card.squares);
                      return ev.tiers.some((t) => t.tier === 'TOP_PRIZE' && t.unlocked);
                    });
                    if (activePlayerWithFullHouse) {
                      return [{ pilotName: activePlayerWithFullHouse.pilotName }];
                    }
                    if (hasUserJoinedGame && myCard && myCard.gameId === activeGame.id) {
                      const myEval = evaluateCard(myCard.squares);
                      if (myEval.tiers.some((t) => t.tier === 'TOP_PRIZE' && t.unlocked)) {
                        return [{ pilotName }];
                      }
                    }
                    return [];
                  })();

                  // Helper for single-winner tiers (Tier 2, Tier 3, Tier 4)
                  const getSingleWinner = (
                    tierKey: 'TIER_2' | 'TIER_3' | 'TIER_4',
                    assignedWinner?: string
                  ): { pilotName: string }[] => {
                    if (assignedWinner) {
                      return [{ pilotName: assignedWinner }];
                    }
                    const fromWinners = (activeGame.winners || []).find((w) => {
                      if (w.tierType === tierKey) return true;
                      if (w.allTiers && w.allTiers.some((t) => t.tier === tierKey)) return true;
                      return false;
                    });
                    if (fromWinners) {
                      return [{ pilotName: fromWinners.pilotName }];
                    }
                    const activePlayer = fleetPlayers.find((p) => {
                      const ev = evaluateCard(p.card.squares);
                      return ev.tiers.some((t) => t.tier === tierKey && t.unlocked);
                    });
                    if (activePlayer) {
                      return [{ pilotName: activePlayer.pilotName }];
                    }
                    if (hasUserJoinedGame && myCard && myCard.gameId === activeGame.id) {
                      const myEval = evaluateCard(myCard.squares);
                      if (myEval.tiers.some((t) => t.tier === tierKey && t.unlocked)) {
                        return [{ pilotName }];
                      }
                    }
                    return [];
                  };

                  // Tier 1: Anyone can win, list all pilots who have achieved Tier 1
                  const getTier1Winners = (): { pilotName: string }[] => {
                    const winnerMap = new Map<string, string>();
                    (activeGame.winners || []).forEach((w) => {
                      const matchTier = w.allTiers?.find((t) => t.tier === 'TIER_1');
                      const isDirect = w.tierType === 'TIER_1';
                      if (matchTier || isDirect) {
                        winnerMap.set(w.pilotName.toLowerCase(), w.pilotName);
                      }
                    });
                    fleetPlayers.forEach((p) => {
                      const pEval = evaluateCard(p.card.squares);
                      const tierMatch = pEval.tiers.find(
                        (t) => t.tier === 'TIER_1' && t.unlocked && t.achievedCount > 0
                      );
                      if (tierMatch) {
                        const key = p.pilotName.toLowerCase();
                        if (!winnerMap.has(key)) {
                          winnerMap.set(key, p.pilotName);
                        }
                      }
                    });
                    if (hasUserJoinedGame && myCard && myCard.gameId === activeGame.id) {
                      const myEval = evaluateCard(myCard.squares);
                      const tierMatch = myEval.tiers.find(
                        (t) => t.tier === 'TIER_1' && t.unlocked && t.achievedCount > 0
                      );
                      if (tierMatch) {
                        const key = pilotName.toLowerCase();
                        if (!winnerMap.has(key)) {
                          winnerMap.set(key, pilotName);
                        }
                      }
                    }
                    return Array.from(winnerMap.values()).map((name) => ({ pilotName: name }));
                  };

                  const orderedPrizeTiers = [
                    {
                      tier: 'TIER_1' as const,
                      tierLabel: 'Tier 1',
                      description: 'Any line (row or column)',
                      textColor: 'text-purple-300',
                      winners: getTier1Winners(),
                      singleWinner: false,
                    },
                    {
                      tier: 'TIER_2' as const,
                      tierLabel: 'Tier 2',
                      description: 'Centre line (horizontal or vertical)',
                      textColor: 'text-fuchsia-300',
                      winners: getSingleWinner('TIER_2', activeGame.tier2Winner),
                      singleWinner: true,
                    },
                    {
                      tier: 'TIER_3' as const,
                      tierLabel: 'Tier 3',
                      description: 'Diagonal line',
                      textColor: 'text-cyan-300',
                      winners: getSingleWinner('TIER_3', activeGame.tier3Winner),
                      singleWinner: true,
                    },
                    {
                      tier: 'TIER_4' as const,
                      tierLabel: 'Tier 4',
                      description: '4 corners',
                      textColor: 'text-emerald-300',
                      winners: getSingleWinner('TIER_4', activeGame.tier4Winner),
                      singleWinner: true,
                    },
                    {
                      tier: 'TOP_PRIZE' as const,
                      tierLabel: 'Top Prize',
                      description: 'Full house',
                      textColor: 'text-yellow-300',
                      winners: topPrizeWinnerList,
                      singleWinner: true,
                    },
                  ];

                  return orderedPrizeTiers.map((tierItem) => (
                    <div
                      key={tierItem.tier}
                      className="py-2 border-b border-purple-500/15 last:border-b-0 space-y-1"
                    >
                      {/* Tier label without pill */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold uppercase tracking-wider ${tierItem.textColor}`}
                        >
                          {tierItem.tierLabel}
                        </span>
                        {tierItem.singleWinner && (
                          <span className="text-[9px] text-slate-500 font-mono">1 Winner</span>
                        )}
                      </div>

                      {/* Description of the prize underneath */}
                      <div className="text-[11px] text-slate-300 font-medium">
                        {tierItem.description}
                      </div>

                      {/* Plain text name list - NO pill wrapper and NO avatar */}
                      {tierItem.winners.length > 0 ? (
                        <div className="pt-0.5">
                          <div className="text-[11px] font-mono text-amber-200 font-medium leading-relaxed break-words">
                            {tierItem.winners.map((winner, wIdx) => (
                              <span key={wIdx}>
                                <span className="hover:text-amber-100">{winner.pilotName}</span>
                                {wIdx < tierItem.winners.length - 1 && (
                                  <span className="text-slate-500 font-normal">, </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 italic font-mono">
                          {activeGame.status === 'CONCLUDED'
                            ? 'No winners for this tier'
                            : 'In play - no winner yet'}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* If multiple active games are available, list them so pilots can toggle */}
            {games.filter((g) => g.status !== 'CONCLUDED' && !g.fullHouseWinner).length > 1 && (
              <div className="pt-2 border-t border-purple-500/15">
                <div className="text-[10px] uppercase font-mono text-slate-400 mb-1.5">
                  All Active Games ({games.filter((g) => g.status !== 'CONCLUDED' && !g.fullHouseWinner).length})
                </div>
                <div className="space-y-1.5">
                  {games
                    .filter((g) => g.status !== 'CONCLUDED' && !g.fullHouseWinner)
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (g.id !== activeGame.id) {
                            handleJoinGame(g, pilotName);
                          }
                        }}
                        className={`w-full text-left p-2 rounded text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                          g.id === activeGame.id
                            ? 'bg-purple-900/40 border border-cyan-400/50 text-white'
                            : 'bg-black/40 hover:bg-purple-950/40 border border-purple-500/20 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold truncate">{g.fleetName}</div>
                          <div className="text-[10px] text-slate-400">FC: {g.fcName}</div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 shrink-0">
                          {g.gridSize}x{g.gridSize} {g.gridSize === 3 ? 'Standard' : g.gridSize === 5 ? 'Tactical' : 'Epic'}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Interactive Bingo Grid & Spectate Controls */}
        <main className="flex flex-col min-h-0 surface-elevated p-3 sm:p-4 relative overflow-hidden">
          {/* Card Header Info */}
          <div className="flex items-center justify-between gap-3 border-b border-purple-500/15 pb-2.5 shrink-0">
            <div className="min-w-0 flex items-center gap-3">
              {/* Capsuleer Portrait Image */}
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#160c29] border border-cyan-400/50 shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.25)] flex items-center justify-center">
                {(spectatingPilot ? spectatingPilot.avatarUrl || spectatingPilot.card.avatarUrl : (activeViewingCard.avatarUrl || pilotAvatarUrl)) ? (
                  <img
                    src={spectatingPilot ? (spectatingPilot.avatarUrl || spectatingPilot.card.avatarUrl) : (activeViewingCard.avatarUrl || pilotAvatarUrl)}
                    alt={spectatingPilot ? spectatingPilot.pilotName : pilotName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-purple-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm sm:text-base font-semibold text-white truncate flex items-center gap-2">
                  <span>{spectatingPilot ? `${spectatingPilot.pilotName}'s Card` : `${pilotName}'s Card`}</span>
                  {currentBadge && (
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded text-white shadow-sm"
                      style={{ background: currentBadge.bg }}
                    >
                      {currentBadge.label}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  {activeGame.fleetName} · {activeViewingCard.size}x{activeViewingCard.size} Grid
                </div>
              </div>
            </div>

            {/* Action buttons: When viewing another player's card, only show one pill with "Back to My Card" */}
            <div className="flex items-center gap-2 shrink-0">
              {!hasUserJoinedGame && !spectatingPilot ? (
                activeGame.status === 'CONCLUDED' || activeGame.fullHouseWinner ? (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Game Concluded · Closed</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentView(pilotName ? 'join-game' : 'pilot-name')}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Join this fleet game and get your card"
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Join An Existing Game</span>
                  </button>
                )
              ) : spectatingPilot ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {adminToken && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!activeGame) return;
                          const res = await api.rollbackCardAll(activeGame.id, activeViewingCard.id, adminToken);
                          if (res.success && res.card) {
                            soundFX.playClaimButton1();
                            setActiveViewingCard(res.card);
                            setFleetPlayers((prev) =>
                              prev.map((p) =>
                                p.id === res.card!.id || p.pilotName.toLowerCase() === res.card!.pilotName.toLowerCase()
                                  ? { ...p, card: res.card!, checkedCount: res.card!.checkedCount }
                                  : p
                              )
                            );
                            setWinBannerMessage(`Rolled back all squares on ${spectatingPilot.pilotName}'s card.`);
                            setTimeout(() => setWinBannerMessage(null), 3000);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-105"
                        title="Roll back and uncheck all squares on this member's card"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                        <span>Roll Back Card</span>
                      </button>
                      {(activeViewingCard.isClosed || (activeViewingCard.rejectedCount || 0) >= 3) && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeGame) return;
                            const res = await api.reopenCard(activeGame.id, activeViewingCard.id, adminToken);
                            if (res.success && res.card) {
                              soundFX.playClaimButton1();
                              setActiveViewingCard(res.card);
                              setFleetPlayers((prev) =>
                                prev.map((p) =>
                                  p.id === res.card!.id || p.pilotName.toLowerCase() === res.card!.pilotName.toLowerCase()
                                    ? { ...p, card: res.card!, isClosed: false }
                                    : p
                                )
                              );
                              setWinBannerMessage(`Reopened card for ${spectatingPilot.pilotName}.`);
                              setTimeout(() => setWinBannerMessage(null), 3000);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/50 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-105"
                          title="Reopen card and reset rejections"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reopen Card</span>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSpectatingPilot(null);
                      setActiveViewingCard(myCard);
                    }}
                    className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-fuchsia-400 text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(217,70,239,0.5)] flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                    title="Return to My Card"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Back to My Card</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResetCurrentCard}
                  className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer"
                  title="Unmark calls"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Game Paused for FC Admin Prize Approval Banner */}
          {activeGame.isPausedForApproval && (activeGame.pendingPrizeClaims?.length ?? 0) > 0 && (
            <div className="my-2 p-3 rounded-xl bg-gradient-to-r from-amber-950/95 via-[#1b102e] to-amber-950/95 border-2 border-amber-500/70 text-amber-200 text-xs font-mono font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.35)] shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                  <Pause className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="text-white font-bold tracking-wide flex items-center gap-2 flex-wrap">
                    <span>GAME PAUSED — FC APPROVAL PENDING</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">
                      {activeGame.pendingPrizeClaims![0].tierBadge}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-300/90 mt-0.5 font-normal">
                    Pilot <strong className="text-white">{activeGame.pendingPrizeClaims![0].pilotName}</strong> claimed{' '}
                    <strong>{activeGame.pendingPrizeClaims![0].tierTitle}</strong> ({activeGame.pendingPrizeClaims![0].lineLabel}).
                    Game is paused until the FC approves this tier prize.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {adminToken ? (
                  <button
                    type="button"
                    onClick={() => soundFX.playAdminAlertBeep()}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    title="Replay Alert Beep"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Beep</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentView('admin')}
                    className="px-3 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-400 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#E879F9]" />
                    <span>FC Login to Approve</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Game Finished banner when Full House is achieved or FC concludes (auto-hides after 10 seconds) */}
          {showConcludedBanner && (activeGame.status === 'CONCLUDED' || activeGame.fullHouseWinner) && (
            <div className="my-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-950/90 via-purple-950/90 to-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-mono font-bold flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  GAME FINISHED — {activeGame.fullHouseWinner ? `Top Prize "Full house" won by ${activeGame.fullHouseWinner}!` : 'This fleet operation has concluded.'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase font-mono">
                  Concluded
                </span>
                <button
                  type="button"
                  onClick={() => setShowConcludedBanner(false)}
                  className="p-1 rounded hover:bg-black/30 text-amber-300 hover:text-white cursor-pointer transition-colors"
                  title="Hide banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Win / Toast notification banner (auto-hides after 10 seconds) */}
          {winBannerMessage && (
            <div className="my-1.5 py-1.5 px-4 rounded-lg bg-gradient-to-r from-purple-500 via-[#E879F9] to-yellow-400 text-slate-950 font-bold text-center text-xs font-['Audiowide'] uppercase tracking-widest shadow-[0_0_20px_rgba(232,121,249,0.7)] animate-bounce shrink-0 flex items-center justify-between gap-2">
              <span className="flex-1 text-center">{winBannerMessage}</span>
              <button
                type="button"
                onClick={() => setWinBannerMessage(null)}
                className="p-0.5 rounded hover:bg-black/20 text-slate-950 hover:text-black cursor-pointer shrink-0"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bingo Grid Container */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center my-auto overflow-hidden">
            {/* FC Admin Spectating Notification Bar */}
            {spectatingPilot && adminToken && (
              <div className="mb-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-2 w-full max-w-[min(100%,calc(100dvh-250px))] shrink-0 text-xs font-mono text-amber-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>
                    <strong>FC Admin Mode:</strong> You can click any square to uncheck / deselect it for{' '}
                    <strong className="text-white">{spectatingPilot.pilotName}</strong>.
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end w-full max-w-[min(100%,calc(100dvh-250px))] mb-1 px-1 shrink-0">
              <span className="text-slate-400 text-xs font-mono">
                <strong className="text-white">{evalResult.completedSquares}</strong>/{evalResult.totalSquares} marked
              </span>
            </div>

            {/* Grid Container with Centered Closed Card Alert in the Middle of the Screen */}
            <div className="relative w-auto h-auto max-w-[min(100%,calc(100dvh-250px))] max-h-[min(100%,calc(100dvh-250px))] aspect-square mx-auto">
              <div
                className={`grid ${
                  activeViewingCard.size === 7
                    ? 'gap-1'
                    : activeViewingCard.size === 5
                    ? 'gap-1.5'
                    : 'gap-2'
                } w-full h-full aspect-square`}
                style={{
                  gridTemplateColumns: `repeat(${activeViewingCard.size}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${activeViewingCard.size}, minmax(0, 1fr))`,
                }}
              >
                {activeViewingCard.squares.map((row, rIdx) =>
                  row.map((sq, cIdx) => {
                    const isMarked = sq.isChecked;
                    const isFree = sq.isFree;
                    const size = activeViewingCard.size;
                    const isOwner = !spectatingPilot;
                    const canAdminEdit = !!adminToken && !!spectatingPilot;
                    const isCardClosed = activeViewingCard.isClosed || (activeViewingCard.rejectedCount || 0) >= 3;
                    const winTier = winCellMap.get(`${rIdx}-${cIdx}`);
                    const tierStyle = winTier ? TIER_STYLES[winTier] : null;
                    const freeStyle = !tierStyle && isFree;

                    const textStyle = getSquareTextStyle(sq.text, size, isFree);
                    const padClass = size === 7 ? 'p-0.5' : size === 5 ? 'p-1' : 'p-1.5 sm:p-2';
                    const radius = size === 7 ? 'rounded-md' : 'rounded-lg';

                    return (
                      <button
                        key={sq.id}
                        type="button"
                        disabled={isFree || (!isOwner && !canAdminEdit) || (isCardClosed && !adminToken)}
                        onClick={() => handleSquareClick(rIdx, cIdx)}
                        className={[
                          'relative aspect-square flex items-center justify-center select-none overflow-hidden',
                          isFree
                            ? 'cursor-default'
                            : isCardClosed && !adminToken
                            ? 'cursor-not-allowed opacity-40 filter saturate-50'
                            : isOwner || canAdminEdit
                            ? 'cursor-pointer'
                            : 'cursor-not-allowed opacity-90',
                          'border text-center transition-colors duration-150',
                          padClass,
                          radius,
                          tierStyle
                            ? 'text-white win-pulse'
                            : freeStyle
                            ? 'text-yellow-100'
                            : isMarked
                            ? 'bg-purple-500/25 border-purple-400 text-white font-bold'
                            : (isOwner || canAdminEdit) && !isCardClosed
                            ? 'bg-[#1A1230] border-purple-500/15 text-slate-200 hover:bg-[#241640] hover:border-purple-500/40'
                            : canAdminEdit && isCardClosed
                            ? 'bg-[#1A1230] border-amber-500/30 text-slate-200 hover:bg-amber-950/40 hover:border-amber-400'
                            : 'bg-[#1A1230]/70 border-purple-500/15 text-slate-400',
                        ].join(' ')}
                        style={
                          tierStyle
                            ? {
                                background: tierStyle.bg,
                                borderColor: tierStyle.border,
                                boxShadow: `0 0 20px ${tierStyle.glow}, inset 0 0 14px ${tierStyle.glow}`,
                              }
                            : freeStyle
                            ? {
                                background:
                                  'linear-gradient(135deg, rgba(250,204,21,0.32), rgba(168,85,247,0.28))',
                                borderColor: 'rgba(250,204,21,0.65)',
                              }
                            : {}
                        }
                        title={
                          isFree
                            ? 'Free Space'
                            : isCardClosed && !adminToken
                            ? `[CARD CLOSED - 3 REJECTED CLAIMS] ${sq.text}`
                            : canAdminEdit
                            ? `FC Admin: Click to ${isMarked ? 'UNCHECK / DESELECT' : 'mark'} square for ${spectatingPilot?.pilotName}`
                            : !isOwner
                            ? `Spectating: ${sq.text} (You cannot mark squares on another pilot's card)`
                            : `${sq.text}\n\n(Click to ${isMarked ? 'unmark' : 'mark'} square)`
                        }
                      >
                        <div className="w-full h-full flex items-center justify-center text-center overflow-hidden">
                          <span
                            className={`w-full max-h-full flex items-center justify-center text-center uppercase break-words hyphens-auto select-none pointer-events-none ${textStyle.fontClass} ${textStyle.fontFamily} ${textStyle.leading} ${
                              freeStyle ? 'text-yellow-300 font-bold' : ''
                            }`}
                          >
                            {isFree ? 'FREE SPACE' : sq.text}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* CARD CLOSED NOTIFICATION - IN THE MIDDLE OF THE SCREEN */}
              {(activeViewingCard.isClosed || (activeViewingCard.rejectedCount || 0) >= 3) && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5 pointer-events-none">
                  <div className="w-full max-w-sm sm:max-w-md p-5 sm:p-6 rounded-2xl bg-[#12050f]/95 border-2 border-rose-500 shadow-[0_0_80px_rgba(244,63,94,0.7),inset_0_0_30px_rgba(244,63,94,0.3)] backdrop-blur-md text-center space-y-3 pointer-events-auto animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)]">
                      <X className="w-8 h-8 stroke-[3]" />
                    </div>

                    <div className="space-y-1.5">
                      <span className="inline-block px-3 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black uppercase tracking-widest shadow-md">
                        CARD CLOSED
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-['Audiowide']">
                        {spectatingPilot ? `${activeViewingCard.pilotName}'s Card` : 'Your Bingo Card'}
                      </h3>
                      <div className="text-xs sm:text-sm font-mono font-bold text-rose-200 py-2.5 px-3 rounded-xl bg-rose-950/90 border border-rose-500/60 shadow-inner">
                        Card closed: 3 prize claims rejected by FC Admin
                      </div>
                    </div>

                    <p className="text-[11px] font-mono text-slate-300">
                      No further squares can be marked on this card.
                    </p>

                    {adminToken && activeGame && (
                      <div className="pt-2 border-t border-rose-500/30 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await api.rollbackCardAll(activeGame.id, activeViewingCard.id, adminToken);
                            if (res.success && res.card) {
                              soundFX.playClaimButton1();
                              setActiveViewingCard(res.card);
                              setFleetPlayers((prev) =>
                                prev.map((p) =>
                                  p.id === res.card!.id || p.pilotName.toLowerCase() === res.card!.pilotName.toLowerCase()
                                    ? { ...p, card: res.card!, checkedCount: res.card!.checkedCount }
                                    : p
                                )
                              );
                              setWinBannerMessage(`Rolled back all squares on ${activeViewingCard.pilotName}'s card.`);
                              setTimeout(() => setWinBannerMessage(null), 3000);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                          title="Roll back all squares on this member's card"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                          <span>Roll Back Squares</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await api.reopenCard(activeGame.id, activeViewingCard.id, adminToken);
                            if (res.success && res.card) {
                              soundFX.playClaimButton1();
                              setActiveViewingCard(res.card);
                              setFleetPlayers((prev) =>
                                prev.map((p) =>
                                  p.id === res.card!.id || p.pilotName.toLowerCase() === res.card!.pilotName.toLowerCase()
                                    ? { ...p, card: res.card!, isClosed: false }
                                    : p
                                )
                              );
                              setWinBannerMessage(`Reopened card for ${activeViewingCard.pilotName}.`);
                              setTimeout(() => setWinBannerMessage(null), 3000);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/50 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                          title="Reopen card and reset rejections"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reopen Card</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: Live Fleet Leaderboard / Roster */}
        <LiveFleetSidebar
          players={fleetPlayers}
          currentViewingPlayerId={activeViewingCard.id}
          myPlayerId={myCard.id}
          onSelectPlayerCard={handleSelectPlayerCard}
          recalibrationTime={`00:${recalibrationSeconds.toString().padStart(2, '0')}`}
          isCalibrating={isCalibrating}
        />
      </div>

      {/* FOOTER BAR ON BINGO CARD PAGE */}
      <footer className="mt-2 pt-2 border-t border-purple-500/20 flex flex-wrap items-center justify-between text-[11px] sm:text-xs font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>listen to the FC, survive the fleet, and mark off the bingo calls to win prizes!</span>
        </div>
        <div className="text-right">
          Eyes down Capsuleers! <span className="brand-purple font-bold">o7</span>
        </div>
      </footer>

      {/* MODALS */}
      <RulesAndAckModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialTab={rulesInitialTab}
      />

      <CalibratingPopup
        isOpen={isCalibrating}
        onComplete={() => setIsCalibrating(false)}
        fleetName={activeGame.fleetName}
        size={activeGame.gridSize}
      />

      {/* FC ADMIN PRIZE CLAIM APPROVAL MODAL */}
      {activeGame.isPausedForApproval &&
        (activeGame.pendingPrizeClaims?.length ?? 0) > 0 &&
        adminToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="max-w-lg w-full surface-elevated rounded-2xl p-6 border-2 border-amber-500/80 shadow-[0_0_60px_rgba(245,158,11,0.45)] text-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5 animate-pulse text-amber-400" />
                  <span>FC Approval Required: Prize Claim</span>
                </div>
                <button
                  type="button"
                  onClick={() => soundFX.playAdminAlertBeep()}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                  title="Test / Replay Audible Beep"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Replay Beep</span>
                </button>
              </div>

              <div className="text-xs text-amber-200/90 font-mono">
                The fleet game is <strong>paused for all pilots</strong>. You must approve or reject the claimed tier prize below before the fleet game can continue.
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto thin-scrollbar pr-1">
                {activeGame.pendingPrizeClaims!.map((claim) => {
                  const matchingPlayer = fleetPlayers.find(
                    (p) => p.id === claim.cardId || p.pilotName.toLowerCase() === claim.pilotName.toLowerCase()
                  );
                  const currentRejections = matchingPlayer?.card?.rejectedCount || matchingPlayer?.rejectedCount || 0;

                  return (
                    <div
                      key={claim.id}
                      className="p-4 rounded-xl bg-black/70 border border-amber-500/40 space-y-3 shadow-inner"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-950 border border-purple-400 shrink-0">
                            {claim.avatarUrl ? (
                              <img src={claim.avatarUrl} alt={claim.pilotName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-purple-400 m-3" />
                            )}
                          </div>
                          <div>
                            <div className="text-white font-bold text-base flex items-center gap-2">
                              <span>{claim.pilotName}</span>
                              {currentRejections >= 3 ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                                  CARD CLOSED
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-amber-300 font-mono font-medium">{claim.tierTitle}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{claim.lineLabel}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-400 font-mono">Rejections:</span>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  currentRejections >= 2
                                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {currentRejections} / 3
                              </span>
                              {currentRejections >= 2 && (
                                <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">
                                  ⚠️ 3rd rejection closes card!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                          {claim.tierBadge}
                        </span>
                      </div>

                      <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-purple-500/20">
                        <button
                          type="button"
                          onClick={() => handleReviewClaimCard(claim)}
                          className="text-cyan-400 hover:text-cyan-200 hover:underline flex items-center gap-1.5 font-mono text-xs font-semibold cursor-pointer group transition-colors"
                          title="View and review this pilot's bingo card grid"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span>View Bingo Card to Review</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={approvingClaimId === claim.id}
                            onClick={() => handleApprovePrizeClaim(activeGame.id, claim.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono cursor-pointer transition-all disabled:opacity-50"
                          >
                            {currentRejections >= 2 ? 'Reject Claim (Closes Card)' : 'Reject Claim'}
                          </button>
                          <button
                            type="button"
                            disabled={approvingClaimId === claim.id}
                            onClick={() => handleApprovePrizeClaim(activeGame.id, claim.id, 'approve')}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Approve Prize & Continue Game</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* REVIEW BINGO CARD MODAL (FOR FC APPROVAL) */}
      {reviewingClaimCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="max-w-2xl w-full surface-elevated rounded-2xl p-5 sm:p-6 border-2 border-cyan-400/80 bg-[#0e0a18] shadow-[0_0_60px_rgba(0,240,255,0.35)] text-slate-100 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-purple-950 border border-cyan-400 shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                  {reviewingClaimCard.card.avatarUrl ? (
                    <img
                      src={reviewingClaimCard.card.avatarUrl}
                      alt={reviewingClaimCard.card.pilotName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-cyan-400 m-2.5" />
                  )}
                </div>
                <div>
                  <div className="text-white font-bold text-base flex items-center gap-2 flex-wrap">
                    <span>Reviewing: {reviewingClaimCard.card.pilotName}'s Card</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-black uppercase">
                      {reviewingClaimCard.claim.tierBadge}
                    </span>
                    {(reviewingClaimCard.card.isClosed || (reviewingClaimCard.card.rejectedCount || 0) >= 3) ? (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-black uppercase">
                        CARD CLOSED
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          (reviewingClaimCard.card.rejectedCount || 0) >= 2
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                            : 'bg-purple-900/60 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        Rejections: {reviewingClaimCard.card.rejectedCount || 0}/3
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-300 font-mono">
                    Claimed: <strong>{reviewingClaimCard.claim.tierTitle}</strong> ({reviewingClaimCard.claim.lineLabel})
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                    <span>
                      {reviewingClaimCard.card.size}x{reviewingClaimCard.card.size} Grid · {reviewingClaimCard.card.checkedCount} Squares Marked
                    </span>
                    {(reviewingClaimCard.card.rejectedCount || 0) >= 2 &&
                      !(reviewingClaimCard.card.isClosed || (reviewingClaimCard.card.rejectedCount || 0) >= 3) && (
                        <span className="text-rose-400 font-bold animate-pulse">
                          ⚠️ 1 more rejection will permanently close this card!
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewingClaimCard(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                title="Close Card Review"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FC Admin Controls Bar */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span><strong>FC Admin Controls:</strong> Click any square to uncheck / deselect it.</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!adminToken) return;
                  const res = await api.rollbackCardAll(reviewingClaimCard.claim.gameId, reviewingClaimCard.card.id, adminToken);
                  if (res.success && res.card) {
                    soundFX.playClaimButton1();
                    setReviewingClaimCard((prev) => (prev ? { ...prev, card: res.card! } : null));
                    setFleetPlayers((prev) =>
                      prev.map((p) =>
                        p.id === res.card!.id || p.pilotName.toLowerCase() === res.card!.pilotName.toLowerCase()
                          ? { ...p, card: res.card!, checkedCount: res.card!.checkedCount }
                          : p
                      )
                    );
                    if (res.game) {
                      setActiveGame(res.game);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                title="Uncheck and roll back all squares on this member's card"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                <span>Roll Back All Squares</span>
              </button>
            </div>

            {/* Grid Visual with interactive FC Admin uncheck/deselect support */}
            <div
              className="grid gap-1.5 w-full max-w-md mx-auto aspect-square my-2"
              style={{
                gridTemplateColumns: `repeat(${reviewingClaimCard.card.size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${reviewingClaimCard.card.size}, minmax(0, 1fr))`,
              }}
            >
              {reviewingClaimCard.card.squares.map((row, rIdx) =>
                row.map((sq, cIdx) => {
                  const size = reviewingClaimCard.card.size;
                  const fSize =
                    sq.isFree
                      ? size === 7
                        ? 'text-[7px]'
                        : size === 5
                        ? 'text-[9px]'
                        : 'text-xs'
                      : size === 7
                      ? sq.text.length > 40
                        ? 'text-[5.5px] leading-tight'
                        : 'text-[7px] leading-tight'
                      : size === 5
                      ? sq.text.length > 40
                        ? 'text-[7px] leading-tight'
                        : 'text-[8.5px] leading-tight'
                      : 'text-[10px] leading-tight';

                  return (
                    <button
                      key={sq.id}
                      type="button"
                      disabled={sq.isFree}
                      onClick={async () => {
                        if (sq.isFree || !adminToken) return;
                        const nextChecked = !sq.isChecked;
                        soundFX.playCCAppMenuEnter();

                        const updatedSquares = reviewingClaimCard.card.squares.map((r, rI) =>
                          r.map((c, cI) => {
                            if (rI === rIdx && cI === cIdx) {
                              return { ...c, isChecked: nextChecked };
                            }
                            return c;
                          })
                        );
                        const newCount = updatedSquares.flat().filter((s) => s.isChecked).length;
                        const updatedCard: BingoCard = {
                          ...reviewingClaimCard.card,
                          squares: updatedSquares,
                          checkedCount: newCount,
                          lastUpdated: Date.now(),
                        };

                        setReviewingClaimCard((prev) => (prev ? { ...prev, card: updatedCard } : null));
                        setFleetPlayers((prev) =>
                          prev.map((p) =>
                            p.id === updatedCard.id || p.pilotName.toLowerCase() === updatedCard.pilotName.toLowerCase()
                              ? { ...p, card: updatedCard, checkedCount: newCount }
                              : p
                          )
                        );
                        if (myCard.id === updatedCard.id || pilotName.toLowerCase() === updatedCard.pilotName.toLowerCase()) {
                          setMyCard(updatedCard);
                          if (!spectatingPilot) {
                            setActiveViewingCard(updatedCard);
                          }
                        }
                        const updateRes = await api.adminUpdateCard(
                          reviewingClaimCard.claim.gameId,
                          updatedCard.id,
                          updatedSquares,
                          newCount,
                          adminToken
                        );
                        if (updateRes.game) {
                          setActiveGame(updateRes.game);
                        }
                      }}
                      className={`p-1 ${fSize} font-mono rounded flex items-center justify-center text-center border overflow-hidden break-words select-none transition-all ${
                        sq.isFree
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 font-bold cursor-default'
                          : sq.isChecked
                          ? 'bg-gradient-to-br from-purple-900/80 to-cyan-950/80 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)] hover:border-rose-400 hover:bg-rose-950/50 cursor-pointer'
                          : 'bg-[#150D22]/80 border-purple-500/20 text-slate-400 hover:border-purple-400 hover:bg-[#201435] cursor-pointer'
                      }`}
                      title={
                        sq.isFree
                          ? 'Free Space'
                          : `${sq.text}\n\n(FC Admin: Click to ${sq.isChecked ? 'UNCHECK / DESELECT' : 'mark'} this square)`
                      }
                    >
                      <span className="max-h-full overflow-hidden">
                        {sq.isFree ? 'FREE SPACE' : sq.text}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-500/30">
              <button
                type="button"
                onClick={() => setReviewingClaimCard(null)}
                className="px-4 py-2 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 border border-slate-700 text-xs font-mono cursor-pointer"
              >
                Back to Claims
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {(reviewingClaimCard.card.isClosed || (reviewingClaimCard.card.rejectedCount || 0) >= 3) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!adminToken) return;
                      const res = await api.reopenCard(
                        reviewingClaimCard.claim.gameId,
                        reviewingClaimCard.card.id,
                        adminToken
                      );
                      if (res.success && res.card) {
                        soundFX.playClaimButton1();
                        setReviewingClaimCard((prev) => (prev ? { ...prev, card: res.card! } : null));
                        setFleetPlayers((prev) =>
                          prev.map((p) =>
                            p.id === res.card!.id || p.pilotName.toLowerCase() === res.card!.pilotName.toLowerCase()
                              ? { ...p, card: res.card!, isClosed: false }
                              : p
                          )
                        );
                        if (myCard.id === res.card.id || pilotName.toLowerCase() === res.card.pilotName.toLowerCase()) {
                          setMyCard(res.card);
                          if (!spectatingPilot) {
                            setActiveViewingCard(res.card);
                          }
                        }
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/50 text-xs font-mono cursor-pointer flex items-center gap-1.5 transition-all"
                    title="Reopen card and reset rejections"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Reopen Card</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={approvingClaimId === reviewingClaimCard.claim.id}
                  onClick={async () => {
                    await handleApprovePrizeClaim(
                      reviewingClaimCard.claim.gameId,
                      reviewingClaimCard.claim.id,
                      'reject',
                      {
                        cardId: reviewingClaimCard.card.id,
                        squares: reviewingClaimCard.card.squares,
                        checkedCount: reviewingClaimCard.card.checkedCount,
                      }
                    );
                    setReviewingClaimCard(null);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono cursor-pointer disabled:opacity-50"
                >
                  {(reviewingClaimCard.card.rejectedCount || 0) >= 2
                    ? 'Reject Claim (Closes Card)'
                    : 'Reject Claim'}
                </button>
                <button
                  type="button"
                  disabled={approvingClaimId === reviewingClaimCard.claim.id}
                  onClick={async () => {
                    await handleApprovePrizeClaim(
                      reviewingClaimCard.claim.gameId,
                      reviewingClaimCard.claim.id,
                      'approve'
                    );
                    setReviewingClaimCard(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Approve Prize & Continue Game</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
