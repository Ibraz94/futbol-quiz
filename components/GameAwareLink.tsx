"use client";

import { useState, useContext, useEffect } from "react";
import Link from "next/link";
import { MultiplayerContext } from "../lib/multiplayer-context";
import { useRouter } from "next/navigation";

interface GameAwareLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GameAwareLink = ({ href, children, className, onClick }: GameAwareLinkProps) => {
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isGameInProgress, setIsGameInProgress] = useState(false);
  
  // Try to get multiplayer context - it might not be available on all pages
  // Use useContext directly to avoid throwing error if provider is not available
  const multiplayer = useContext(MultiplayerContext);
  const router = useRouter();
  
  const currentRoom = multiplayer?.currentRoom;
  const leaveRoom = multiplayer?.leaveRoom;
  
  // Check game state from context (if available) or localStorage (for global access)
  useEffect(() => {
    const checkGameState = () => {
      if (currentRoom) {
        // Context is available, use it
        const inProgress = currentRoom.status === 'playing' || 
                          (currentRoom.gameState as any)?.gamePhase === 'playing';
        setIsGameInProgress(inProgress);
      } else if (typeof window !== 'undefined') {
        // Context not available, check localStorage
        const gameInProgress = localStorage.getItem('mp_gameInProgress') === 'true';
        const roomId = localStorage.getItem('mp_currentRoomId');
        setIsGameInProgress(gameInProgress);
      } else {
        setIsGameInProgress(false);
      }
    };
    
    // Initial check
    checkGameState();
    
    // Listen for storage changes (when game state updates)
    if (typeof window !== 'undefined') {
      const handleStorageChange = () => {
        checkGameState();
      };
      const handleGameStateChanged = (e: Event) => {
        const customEvent = e as CustomEvent;
        setIsGameInProgress(customEvent.detail?.isGameInProgress || false);
      };
      
      window.addEventListener('storage', handleStorageChange);
      // Also listen to custom events from multiplayer context
      window.addEventListener('mp_gameStateChanged', handleGameStateChanged);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('mp_gameStateChanged', handleGameStateChanged);
      };
    }
  }, [currentRoom]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Always check game state synchronously from localStorage (most reliable)
    // This ensures we get the latest state even if React state hasn't updated yet
    let gameInProgress = false;
    
    if (typeof window !== 'undefined') {
      // First check localStorage (most reliable for cross-component access)
      const storedGameState = localStorage.getItem('mp_gameInProgress');
      gameInProgress = storedGameState === 'true';
      
      // Also check context if available (as fallback) - include 'starting' status
      if (!gameInProgress && currentRoom) {
        gameInProgress = currentRoom.status === 'playing' || 
                        currentRoom.status === 'starting' ||
                        (currentRoom.gameState as any)?.gamePhase === 'playing' ||
                        (currentRoom.gameState as any)?.gamePhase === 'starting';
      }
      
      // Debug: Log all localStorage keys related to multiplayer
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('mp_'));
      console.log('[GameAwareLink] All mp_ localStorage keys:', allKeys.map(k => ({ key: k, value: localStorage.getItem(k) })));
    } else if (currentRoom) {
      // SSR fallback - check context
      gameInProgress = currentRoom.status === 'playing' || 
                      currentRoom.status === 'starting' ||
                      (currentRoom.gameState as any)?.gamePhase === 'playing' ||
                      (currentRoom.gameState as any)?.gamePhase === 'starting';
    }
        
    // If game is in progress, show confirmation
    if (gameInProgress) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      setPendingNavigation(href);
      setShowLeaveConfirmation(true);
      return false; // Prevent navigation
    } else if (onClick) {
      onClick();
    }
    // Otherwise, let the default Link behavior handle navigation
  };

  const handleConfirmLeave = async () => {
    setShowLeaveConfirmation(false);
    
    // Try to leave room via context if available
    if (leaveRoom) {
      try {
        await leaveRoom();
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    } else {
      // If context not available, we need to trigger leave via the game page
      // Dispatch an event that game pages can listen to
      if (typeof window !== 'undefined') {
        const roomId = localStorage.getItem('mp_currentRoomId');
        window.dispatchEvent(new CustomEvent('mp_forceLeaveRoom', { 
          detail: { roomId } 
        }));
      }
    }
    
    // Clear localStorage game state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mp_gameInProgress');
      localStorage.removeItem('mp_currentRoomId');
    }
    
    // Small delay to ensure room is left before navigation
    setTimeout(() => {
      if (pendingNavigation) {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }
    }, 200);
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirmation(false);
    setPendingNavigation(null);
  };

  return (
    <>
      <Link 
        href={href} 
        className={className} 
        onClick={handleClick}
        onMouseDown={(e) => {
          // Also check on mousedown to catch it earlier
          if (typeof window !== 'undefined') {
            const gameInProgress = localStorage.getItem('mp_gameInProgress') === 'true';
            if (gameInProgress) {
              e.preventDefault();
            }
          }
        }}
      >
        {children}
      </Link>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <div className="absolute inset-0 bg-black/80" onClick={handleCancelLeave}></div>
          <div className="relative z-50 bg-[#262346] rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Leave Game?</h2>
              <p className="text-white/80">
                Are you sure you want to quit this game? Your opponent will win automatically.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleConfirmLeave}
                className="flex-1 bg-red-500 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-600 transition-colors"
              >
                Yes, Leave Game
              </button>
              <button
                onClick={handleCancelLeave}
                className="flex-1 bg-gray-500 text-white font-semibold py-3 px-4 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameAwareLink;

