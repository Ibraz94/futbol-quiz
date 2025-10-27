'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { API_BASE_URL } from "../../lib/config";
import { GAME_CONFIG } from '../../lib/bingo-config';
import { Category, Player, SelectedPlayer, BingoGridResponse, CellStatus, GameError } from '../../lib/bingo-types';
import { createCellKey, isValidCellPosition, getCellClass, getLogoPath } from '../../lib/bingo-utils';
import { bingoState } from '../../lib/bingo-state';
import { useMultiplayer, MultiplayerProvider } from '../../lib/multiplayer-context';

const BingoGame: React.FC = () => {
  // Check authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Multiplayer state - always start in multiplayer mode
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(true);
  const [showMultiplayerToggle, setShowMultiplayerToggle] = useState<boolean>(false);
  
  // Multiplayer context
  const multiplayer = useMultiplayer();
  const { 
    isConnected, 
    currentRoom, 
    currentUserId, 
    currentUsername, 
    error: multiplayerError,
    joinLobby, 
    leaveRoom, 
    toggleReady, 
    startGame,
    clickCell: multiplayerClickCell,
    useWildcard: multiplayerUseWildcard,
    skipTurn: multiplayerSkipTurn,
    resetGame: multiplayerResetGame
  } = multiplayer;

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsAuthenticated(!!token);
    setAuthChecked(true);
  }, []);

  // Listen for authentication changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      setIsAuthenticated(!!token);
      if (!token && currentRoom) {
        // User logged out, leave room
        leaveRoom();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentRoom, leaveRoom]);

  // Handle timeout notifications
  useEffect(() => {
    if (!isMultiplayer || !multiplayer.socket) return;

    const handleTurnTimeout = (data: { username: string }) => {
      setTimeoutNotification({
        username: data.username,
        penalty: 1,
        consecutiveTimeouts: 1
      });
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setTimeoutNotification(null);
      }, 5000);
    };

    multiplayer.socket.on('turnTimeout', handleTurnTimeout);

    return () => {
      multiplayer.socket?.off('turnTimeout', handleTurnTimeout);
    };
  }, [isMultiplayer, multiplayer.socket]);
  
  // Timeout notification state
  const [timeoutNotification, setTimeoutNotification] = useState<{ username: string; penalty: number; consecutiveTimeouts: number } | null>(null);
  const [isStartingNewGameFromWinner, setIsStartingNewGameFromWinner] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  
  // Get user ID from JWT token
  const getUserIdFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || null;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  };

  const authenticatedUserId = getUserIdFromToken();

  // Local state for user input
  const [inputUsername, setInputUsername] = useState<string>(authenticatedUserId || '');
  const [isStartingGame, setIsStartingGame] = useState<boolean>(false);
  const [isResettingGame, setIsResettingGame] = useState<boolean>(false);
  
  // Timer state for multiplayer
  const [countdownTimer, setCountdownTimer] = useState<number>(10);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Temporary cell status for wrong answers (red flash)
  const [tempCellStatus, setTempCellStatus] = useState<Record<string, 'wrong' | null>>({});
  
  // Function to show red cell flash for wrong answers
  const showRedCellFlash = (cellName: string) => {
    setTempCellStatus(prev => ({ ...prev, [cellName]: 'wrong' }));
    
    // Remove red flash after 2 seconds
    setTimeout(() => {
      setTempCellStatus(prev => ({ ...prev, [cellName]: null }));
    }, 2000);
  };

  // Listen for red cell flash events
  useEffect(() => {
    const handleRedCellFlash = (event: CustomEvent) => {
      showRedCellFlash(event.detail.cellName);
    };

    window.addEventListener('redCellFlash', handleRedCellFlash as EventListener);
    
    return () => {
      window.removeEventListener('redCellFlash', handleRedCellFlash as EventListener);
    };
  }, []);
  
  // Generate unique user ID automatically
  const generateUserId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 6);
    const sessionId = Math.random().toString(36).substr(2, 3);
    return `player_${timestamp}_${randomPart}_${sessionId}`;
  };
  
  // Custom start game handler with loading state
  const handleStartGame = async () => {
    if (isStartingGame) return; // Prevent multiple clicks
    
    setIsStartingGame(true);
    try {
      await startGame();
      // Don't reset loading state here - let it persist until game actually starts
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsStartingGame(false); // Only reset on error
    }
  };

  // Core game state
  const [players, setPlayers] = useState<readonly Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentGrid, setCurrentGrid] = useState<readonly (readonly Category[])[]>([]);
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({});
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<number>(GAME_CONFIG.TIMER_DURATION);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [gridLoading, setGridLoading] = useState<boolean>(false);
  const [wildcardUsed, setWildcardUsed] = useState<boolean>(false);
  const [correctCategories, setCorrectCategories] = useState<readonly { readonly id: string; readonly name: string }[]>([]);
  const [failedImageAttempts, setFailedImageAttempts] = useState<Record<string, number>>({});
  const [availablePlayers, setAvailablePlayers] = useState<readonly SelectedPlayer[]>([]);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [gameError, setGameError] = useState<GameError | null>(null);
  const [aNamePercentage, setANamePercentage] = useState<string>('');

  // Refs
  const timerTriggeredRef = useRef(false);
  const currentPlayer = players[currentIndex];

  // Sync multiplayer state with local state
  useEffect(() => {
    if (isMultiplayer && currentRoom?.gameState) {
      const gameState = currentRoom.gameState;
      
      // Update grid if available
      if (gameState.grid && gameState.grid.length > 0) {
        setCurrentGrid(gameState.grid);
      }
      
      // Update current player index
      if (gameState.currentPlayerIndex !== undefined) {
        setCurrentIndex(gameState.currentPlayerIndex);
      }
      
      // Update game ended state
      if (gameState.gamePhase === 'finished') {
        setGameEnded(true);
      }
    }
  }, [isMultiplayer, currentRoom?.gameState]);

  // Reset loading state when game actually starts
  useEffect(() => {
    if (isMultiplayer && currentRoom?.status === 'playing' && currentRoom?.gameState?.grid) {
      setIsStartingGame(false);
    }
  }, [isMultiplayer, currentRoom?.status, currentRoom?.gameState?.grid]);

  // Also reset loading state if we're no longer in the lobby
  useEffect(() => {
    if (isMultiplayer && currentRoom?.status === 'playing') {
      setIsStartingGame(false);
    }
  }, [isMultiplayer, currentRoom?.status]);

  // Reset loading state when game is starting (from backend)
  useEffect(() => {
    if (isMultiplayer && currentRoom?.status === 'starting') {
      setIsStartingGame(true);
    }
  }, [isMultiplayer, currentRoom?.status]);

  // Start countdown timer when game starts
  useEffect(() => {
    if (isMultiplayer && currentRoom?.status === 'playing' && currentRoom?.gameState) {
      
      // Clear any existing timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Start new countdown timer based on turn start time
      const interval = setInterval(() => {
        if (currentRoom?.gameState?.turnStartTime) {
          const elapsed = Date.now() - currentRoom.gameState.turnStartTime;
          const remaining = Math.max(0, 10 - Math.floor(elapsed / 1000));
          setCountdownTimer(remaining);
        }
      }, 100); // Update every 100ms for smooth countdown
      
      setTimerInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      // Clear timer when not in playing state
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [isMultiplayer, currentRoom?.status, currentRoom?.gameState, currentRoom?.gameState?.turnStartTime]);

  // Reset timer when turn changes (from backend)
  useEffect(() => {
    if (isMultiplayer && currentRoom?.gameState?.turnStartTime) {
      setCountdownTimer(10);
    }
  }, [isMultiplayer, currentRoom?.gameState?.turnStartTime]);

  // Log current room state for analysis
  useEffect(() => {
    if (isMultiplayer && currentRoom) {
    }
  }, [isMultiplayer, currentRoom, currentUserId]);

  // Handle cell click responses for temporary red cell display
  useEffect(() => {
    if (isMultiplayer && currentRoom) {
      // This will be triggered when cellClicked event is received
      // The multiplayer context will update currentRoom with the latest data
      // We can check for recent cell clicks and show temporary red cells
    }
  }, [isMultiplayer, currentRoom]);

  // Listen for cell click events to show temporary red cells
  useEffect(() => {
    if (isMultiplayer && currentRoom) {
      // This will be handled by the cellClicked event from multiplayer context
      // We'll add the handler in the multiplayer context
    }
  }, [isMultiplayer, currentRoom]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Auto-leave room when component unmounts (user navigates away)
  useEffect(() => {
    let hasCleanedUp = false; // Prevent multiple cleanups
    
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasCleanedUp && isMultiplayer && isConnected && currentRoom) {
        console.log('🚪 Page unloading - leaving room gracefully...');
        // Use synchronous leaveRoom to ensure it completes before page unload
        leaveRoom().catch(error => {
          console.warn('⚠️ Error leaving room on page unload:', error);
        });
      }
    };

    const handleUnload = () => {
      if (!hasCleanedUp && isMultiplayer && isConnected) {
        console.log('🔌 Page unloading - disconnecting WebSocket...');
        hasCleanedUp = true;
        // Disconnect gracefully
        multiplayer.disconnect();
      }
    };

    // Listen for page unload events (browser back, close tab, etc.)
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      
      // Cleanup on component unmount (only if not already cleaned up)
      if (!hasCleanedUp && isMultiplayer && isConnected) {
        console.log('🧹 Component unmounting - cleaning up...');
        hasCleanedUp = true;
        multiplayer.disconnect();
      }
    };
  }, []); // Remove dependencies to prevent re-running

  // Memoized logo path function
  const getMemoizedLogoPath = useMemo(() => {
    const cache = new Map<string, string | null>();
    return (slug: string): string | null => {
      if (cache.has(slug)) return cache.get(slug)!;
      const path = getLogoPath(slug);
      cache.set(slug, path);
      return path;
    };
  }, []);

  const handlePlayWildcard = () => {
    if (gameEnded || wildcardUsed || !currentGrid.length) return;
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;

    const updatedStatus = { ...cellStatus };
    const newLockedCells = new Set(lockedCells);
    let lockedCount = 0;

    // Lock all correct categories for current player
    for (let row = 0; row < currentGrid.length; row++) {
      for (let col = 0; col < currentGrid[row].length; col++) {
        const cat = currentGrid[row][col];
        const key = createCellKey(row, col);

        const isCorrect = correctCategories.some(c => c.name === cat.name);
        if (isCorrect && !newLockedCells.has(key)) {
          updatedStatus[key] = 'correct';
          newLockedCells.add(key);
          lockedCount++;
          if (lockedCount === correctCategories.length) break;
        }
      }
      if (lockedCount === correctCategories.length) break;
    }

    setCellStatus(updatedStatus);
    setLockedCells(newLockedCells);
    setWildcardUsed(true);

    // Move to next player from available players
    setTimeout(() => {
      const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);
    }, GAME_CONFIG.WILDCARD_DELAY); // Small delay to show the wildcard effect
  };

  // Simplified data fetching
  const setupGameData = (data: BingoGridResponse) => {
    const { grid: gridFromApi, players: playersFromApi } = data;
    
    // Calculate A-name percentage
    const playersWithANames = playersFromApi.filter(player => 
      player.playerName && player.playerName.charAt(0).toUpperCase() === 'A'
    );
    const percentageA = ((playersWithANames.length / playersFromApi.length) * 100).toFixed(1);
    setANamePercentage(percentageA);
    

    // Set grid and reset cell status
    setCurrentGrid(gridFromApi);
    setCellStatus({});

    if (playersFromApi.length > 0) {
      // Randomize players
      const randomizedPlayers = [...playersFromApi].sort(() => Math.random() - 0.5);
      setAvailablePlayers(randomizedPlayers);
      
      // Convert to game format
      const gamePlayers = randomizedPlayers.map(selectedPlayer => ({
        _id: selectedPlayer.playerId,
        name: selectedPlayer.playerName,
        categories: [],
      }));
      setPlayers(gamePlayers);
      
      // Setup first player
      const firstPlayer = randomizedPlayers[0];
      const firstPlayerCategories = firstPlayer.matchingCategories?.length > 0 
        ? firstPlayer.matchingCategories.map(cat => ({ id: cat, name: cat }))
        : [{ id: firstPlayer.categoryName || 'No matches', name: firstPlayer.categoryName || 'No matches' }];
      
      setCorrectCategories(firstPlayerCategories);
      setCurrentIndex(0);
      
      // Log first player
      const firstPlayerAnswer = firstPlayer.matchingCategories?.length > 0 
        ? firstPlayer.matchingCategories.join(', ')
        : firstPlayer.categoryName || 'No matches';
      
      console.log(`🎯 First Player: ${firstPlayer.playerName}`);
      console.log(`✅ Correct Answer: ${firstPlayerAnswer}`);
    } else {
      setGameError({
        message: 'No players available from server',
        code: 'NO_PLAYERS',
        timestamp: Date.now()
      });
    }
  };

  // Only fetch grid for single-player mode (which we removed) or when multiplayer game starts
  // Grid will be provided by the backend when the host starts the game

  useEffect(() => {
    // Skip timer setup if no current player or if in multiplayer mode
    if (!currentPlayer || isMultiplayer) return;
    
    timerTriggeredRef.current = false;
    if (intervalId) clearInterval(intervalId);

    setTimer(GAME_CONFIG.TIMER_DURATION); // reset timer each turn

    const id = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (!timerTriggeredRef.current) {
            timerTriggeredRef.current = true;
            clearInterval(id);
            handleSkip(); // call your skip handler!
          }
          return GAME_CONFIG.TIMER_DURATION; // reset timer for next turn
        }
        return prev - 1;
      });
    }, 1000);

    setIntervalId(id);

    return () => clearInterval(id);
  }, [currentIndex, currentPlayer, isMultiplayer]); // Added isMultiplayer dependency


  const isGameWon = (grid: readonly (readonly Category[])[], locked: Set<string>): boolean => {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const key = createCellKey(row, col);
        if (!locked.has(key)) {
          return false; // found an unlocked cell, game not won yet
        }
      }
    }
    return true; // all cells are locked
  };

  const getNextPlayerFromAvailable = (currentPlayerIndex: number): boolean => {
    const nextIndex = currentPlayerIndex + 1;
    if (nextIndex < availablePlayers.length) {
      const nextSelectedPlayer = availablePlayers[nextIndex];
      if (!nextSelectedPlayer) {
        console.warn('Next player not found at index:', nextIndex);
        return false;
      }
      
      const nextPlayerCategories: readonly { readonly id: string; readonly name: string }[] = 
        nextSelectedPlayer.matchingCategories && nextSelectedPlayer.matchingCategories.length > 0 
          ? nextSelectedPlayer.matchingCategories.map(cat => ({ id: cat, name: cat }))
          : [{ id: nextSelectedPlayer.categoryName || 'No matches', name: nextSelectedPlayer.categoryName || 'No matches' }];
      
      setCorrectCategories(nextPlayerCategories);
      setCurrentIndex(nextIndex);
      
      // Log the current player's answer
      const categories = nextSelectedPlayer.matchingCategories && nextSelectedPlayer.matchingCategories.length > 0 
        ? nextSelectedPlayer.matchingCategories.join(', ')
        : nextSelectedPlayer.categoryName || 'No matches';
      
      console.log(`🎯 Current Player: ${nextSelectedPlayer.playerName}`);
      console.log(`✅ Correct Answer: ${categories}`);
      
      return true;
    }
    return false; // No more players available
  };

  const handleCellClick = (cell: Category, row: number, col: number): void => {
    if (!isValidCellPosition(row, col)) {
      console.warn('Invalid cell position:', { row, col });
      return;
    }
    
    const key = createCellKey(row, col);
    if (gameEnded || lockedCells.has(key) || cellStatus[key] === 'correct') return;
    
    // If multiplayer mode, use WebSocket communication
    if (isMultiplayer && currentRoom?.status === 'playing') {
      const isMyTurn = currentRoom.players[currentRoom.gameState?.currentPlayerIndex || 0]?.userId === currentUserId;
      if (!isMyTurn) {
        return;
      }
      
      
      // Send cell click to multiplayer server
      multiplayerClickCell(cell.name);
      return;
    }
    
    // Single-player mode logic (existing logic)
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;

    const isCorrect = correctCategories.some(mc => mc.name === cell.name);
    const updatedStatus = { ...cellStatus };

    if (isCorrect) {
      updatedStatus[key] = 'correct';
      setCellStatus(updatedStatus);
      setLockedCells(prev => new Set(prev).add(key));

      // Move to next player from available players
      const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);  
    } else {
      updatedStatus[key] = 'wrong';
      setCellStatus(updatedStatus);
      
      
      setTimeout(() => {
        setCellStatus(prev => ({ ...prev, [key]: 'default' }));
      }, GAME_CONFIG.CELL_RESET_DELAY);
      // Move to next player from available players (skip current + 1 more for wrong answer)
      // For wrong answers, we need to skip 2 players total (current + 1 additional)
      const nextIndex = currentIndex + GAME_CONFIG.WRONG_ANSWER_PENALTY; // Skip players for wrong answer
      
      // Check if this wrong answer ends the game
      if (currentIndex >= availablePlayers.length - 1) {
        setGameEnded(true);
        return; // End the game immediately
      }
      
      if (nextIndex < availablePlayers.length) {
        const nextSelectedPlayer = availablePlayers[nextIndex];
        const nextPlayerCategories = nextSelectedPlayer.matchingCategories && nextSelectedPlayer.matchingCategories.length > 0 
          ? nextSelectedPlayer.matchingCategories.map(cat => ({ id: cat, name: cat }))
          : [{ id: nextSelectedPlayer.categoryName || 'No matches', name: nextSelectedPlayer.categoryName || 'No matches' }];
        
        setCorrectCategories(nextPlayerCategories);
        setCurrentIndex(nextIndex);
        
        // Log the next player's correct answer
        const categories = nextSelectedPlayer.matchingCategories && nextSelectedPlayer.matchingCategories.length > 0 
          ? nextSelectedPlayer.matchingCategories.join(', ')
          : nextSelectedPlayer.categoryName || 'No matches';
        
        console.log(`🎯 Next Player: ${nextSelectedPlayer.playerName}`);
        console.log(`✅ Correct Answer: ${categories}`);
      } else {
        setGameEnded(true);
        return; // End the game immediately
      }
    }
  };

  const handleSkip = () => {
    if (gameEnded) return;
    timerTriggeredRef.current = true;
    if (intervalId) clearInterval(intervalId);
    
    // If this is the last player, end the game immediately
    if (currentIndex >= availablePlayers.length - 1) {
      setCurrentIndex(availablePlayers.length); // Move index beyond last to satisfy end condition
      setGameEnded(true);
      return;
    }

    // Otherwise move to next player from available players
    const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);
  };

  const startNewGame = async (): Promise<void> => {
    if (isResettingGame) return; // Prevent multiple clicks
    
    console.log('🔄 Starting new game - returning to lobby...');
    setIsResettingGame(true);
    
    try {
      // Reset game state to lobby mode FIRST (before local cleanup)
      if (isMultiplayer && currentRoom) {
        console.log('🔄 Requesting game reset from server...');
        await multiplayerResetGame();
        console.log('✅ Game state reset, returning to lobby');
        
        // Only clear local state AFTER successful server reset
        if (intervalId) clearInterval(intervalId);
        timerTriggeredRef.current = true;
        setLockedCells(new Set());
        setFailedImageAttempts({});
        setGameError(null);
        setGameEnded(false);
        bingoState.reset();
        
      } else {
        // Single player mode - just clear local state
        if (intervalId) clearInterval(intervalId);
        timerTriggeredRef.current = true;
        setLockedCells(new Set());
        setFailedImageAttempts({});
        setGameError(null);
        setGameEnded(false);
        bingoState.reset();
      }
    } catch (error) {
      console.error('❌ Error resetting game:', error);
      setGameError({
        message: 'Failed to reset game. Please try again.',
        code: 'RESET_FAILED',
        timestamp: Date.now()
      });
      // Don't clear local state if server reset failed
    } finally {
      setIsResettingGame(false);
    }
    
    // The component will automatically show the lobby UI since the game state is reset
    // and currentRoom.status will be 'waiting'
  };

  const allCellsLocked = isGameWon(currentGrid, lockedCells);

  // Check if game should end or show error
  // Only show game over if we're in multiplayer mode and the game has actually ended
  const shouldEndGame = isMultiplayer && currentRoom?.status === 'finished';
  const shouldShowError = gameError;
  
  // Show authentication required screen
  if (authChecked && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Authentication Required</h2>
          <p className="text-lg text-white/80 mb-6">
            You need to be logged in to play multiplayer bingo games.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-[#ffd600] text-black font-semibold px-6 py-2 rounded-md hover:bg-yellow-400 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              className="bg-blue-500 text-white font-semibold px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen while checking authentication
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Checking Authentication...</h2>
          <p className="text-lg text-white/80">Please wait</p>
        </div>
      </div>
    );
  }

  // Show loading screen while game is starting (multiplayer only)
  if (isMultiplayer && currentRoom?.status === 'playing' && !currentRoom?.gameState?.grid) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Starting Game...</h2>
          <p className="text-lg text-white/80">Generating grid and players</p>
        </div>
      </div>
    );
  }
  
  if (shouldShowError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <h2 className="text-2xl font-bold text-red-500">❌ Game Error</h2>
        <p className="text-lg text-white/80 text-center">
          {gameError?.message || 'No players available to start the game'}
        </p>
        {gameError?.code && (
          <p className="text-sm text-white/60 text-center mt-2">
            Error Code: {gameError.code}
          </p>
        )}
        <button onClick={startNewGame} className="bg-emerald-500 px-6 py-2 rounded-md text-black font-semibold">
          Try Again
        </button>
      </div>
    );
  }
  
  if (shouldEndGame) {
    if (intervalId) clearInterval(intervalId);
    
    
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <h2 className="text-2xl font-bold">🎉 Game Over</h2>
        
        {/* Winner Display */}
        <div className="text-center">
          <p className="text-lg text-white/80">
            {currentRoom?.gameState?.winner === currentUserId ? 
              '🏆 Congratulations! You won!' : 
              `🏆 Winner: ${currentRoom?.players.find(p => p.userId === currentRoom?.gameState?.winner)?.username || 'Unknown'}`
            }
          </p>
          {currentRoom?.gameState?.playerData && (
            <p className="text-sm text-white/60 mt-1">
              Final Score: {currentRoom.gameState.playerData[currentRoom.gameState.winner || '']?.score || 0} points
            </p>
          )}
        </div>

        {/* Final Scores */}
        {currentRoom?.gameState?.playerData && (
          <div className="bg-white/10 rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold mb-3 text-center">Final Scores</h3>
            <div className="space-y-2">
              {Object.entries(currentRoom.gameState.playerData)
                .sort(([,a], [,b]) => (b as any).score - (a as any).score)
                .map(([userId, playerData]: [string, any]) => (
                <div key={userId} className={`flex justify-between items-center px-3 py-2 rounded ${
                  userId === currentRoom?.gameState?.winner ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'
                }`}>
                  <span className={userId === currentUserId ? 'font-semibold' : ''}>
                    {playerData.username} {userId === currentUserId ? '(You)' : ''}
                  </span>
                  <span className="font-mono">{playerData.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-4">
          <button 
            onClick={async () => {
              if (isStartingNewGameFromWinner) return; // Prevent multiple clicks
              
              console.log('🔄 Starting new game from winner screen...');
              setIsStartingNewGameFromWinner(true);
              
              try {
                await startNewGame();
                console.log('✅ New game started, returning to lobby');
              } catch (error) {
                console.error('❌ Error starting new game:', error);
              } finally {
                setIsStartingNewGameFromWinner(false);
              }
            }}
            disabled={isStartingNewGameFromWinner}
            className={`px-6 py-2 rounded-md font-semibold transition-colors ${
              isStartingNewGameFromWinner 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                : 'bg-emerald-500 text-black hover:bg-emerald-600'
            }`}
          >
            {isStartingNewGameFromWinner ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                Starting...
              </div>
            ) : (
              'New Game'
            )}
          </button>
          
          <button 
            onClick={async () => {
              if (isLeavingRoom) return; // Prevent multiple clicks
              
              console.log('🏠 Going back to home...');
              setIsLeavingRoom(true);
              
              try {
                if (currentRoom) {
                  await leaveRoom();
                }
                window.location.href = '/';
              } catch (error) {
                console.error('❌ Error leaving room:', error);
                // Still navigate to home even if leaveRoom fails
                window.location.href = '/';
              } finally {
                setIsLeavingRoom(false);
              }
            }}
            disabled={isLeavingRoom}
            className={`px-6 py-2 rounded-md font-semibold transition-colors ${
              isLeavingRoom 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLeavingRoom ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                Leaving...
              </div>
            ) : (
              'Back to Home'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Removed game mode selection - always go directly to lobby

  // Multiplayer lobby UI - show when not connected, no room, or room is waiting/starting
  const shouldShowLobby = !isConnected || !currentRoom || currentRoom.status === 'waiting' || currentRoom.status === 'starting';
  
  // Debug lobby condition (only when it changes)
  if (isMultiplayer && shouldShowLobby) {
  }
  
  if (shouldShowLobby) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] p-6 relative">
        {/* Loading overlay when starting game */}
        {(isStartingGame || currentRoom?.status === 'starting') && (
          <div className="absolute inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Starting Game...</h2>
              <p className="text-lg text-white/80">Generating grid and players</p>
              <p className="text-sm text-white/60 mt-2">This may take a few moments</p>
              <p className="text-xs text-white/40 mt-2">Room Status: {currentRoom?.status || 'unknown'}</p>
            </div>
          </div>
        )}
        
        <div className="bg-[#262346] rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-[#ffd600] mb-6 text-center">🎮 Bingo Game Lobby</h2>
          <p className="text-white/70 text-sm text-center mb-6">
            Enter your username to join a room and play with other players. The first player becomes the host and can start the game when ready.
          </p>
          
          {!isConnected && (
            <div className="text-center mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd600] mx-auto mb-2"></div>
              <p className="text-white/70">Connecting to server...</p>
            </div>
          )}
          
          {multiplayerError && (
            <div className="bg-red-500/20 border border-red-500 rounded-md p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-lg">⚠️</span>
                <div>
                  <p className="text-red-400 text-sm font-medium">Error</p>
                  <p className="text-red-300 text-sm">{multiplayerError}</p>
                  {multiplayerError.includes('Room is full') && (
                    <p className="text-red-200 text-xs mt-1">
                      Try joining a different room or creating a new one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {isConnected && !currentRoom && (
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">Username</label>
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  className="w-full bg-[#1e2033] text-white px-3 py-2 rounded-md border border-white/20"
                  placeholder="Enter your username"
                />
                <p className="text-white/40 text-xs mt-1">
                  Your ID: <span className="font-mono">{authenticatedUserId || 'Not authenticated'}</span>
                </p>
              </div>
              
              <button
                onClick={() => joinLobby(authenticatedUserId || '', inputUsername)}
                disabled={!inputUsername || !authenticatedUserId}
                className="w-full bg-[#fbbc05] text-black font-semibold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Lobby
              </button>
            </div>
          )}
          
          {currentRoom && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-white/70 text-sm">Room ID: <span className="text-[#ffd600] font-mono">{currentRoom.roomId}</span></p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-white/70 text-sm">Players: {currentRoom.players.length}/{currentRoom.maxPlayers}</p>
                  {currentRoom.players.length >= currentRoom.maxPlayers && (
                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      FULL
                    </span>
                  )}
                </div>
                
                {/* Room Capacity Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Room Capacity</span>
                    <span>{Math.round((currentRoom.players.length / currentRoom.maxPlayers) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentRoom.players.length >= currentRoom.maxPlayers 
                          ? 'bg-red-500' 
                          : currentRoom.players.length >= currentRoom.maxPlayers * 0.75 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${(currentRoom.players.length / currentRoom.maxPlayers) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {currentRoom.players.length === 1 && (
                  <p className="text-[#ffd600] text-sm font-medium mt-2">🎯 You are the host! Wait for other players to join.</p>
                )}
                {currentRoom.players.length >= currentRoom.maxPlayers && (
                  <p className="text-red-400 text-sm font-medium mt-2">⚠️ Room is full! No more players can join.</p>
                )}
              </div>
              
              <div className="space-y-2">
                {currentRoom.players.map((player) => (
                  <div key={player.userId} className="flex items-center justify-between bg-[#1e2033] p-2 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{player.username}</span>
                      {player.isHost && (
                        <span className="text-xs px-2 py-1 rounded bg-[#ffd600] text-black font-medium">
                          👑 Host
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${player.isReady ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleReady()}
                  className="flex-1 bg-blue-500 text-white font-semibold py-2 px-4 rounded-md"
                >
                  {currentRoom.players.find(p => p.userId === currentUserId)?.isReady ? 'Not Ready' : 'Ready'}
                </button>
                
                {currentRoom.players.find(p => p.userId === currentUserId)?.isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={currentRoom.players.length < 2 || !currentRoom.players.every(p => p.isReady) || isStartingGame || currentRoom.status === 'starting'}
                    className="flex-1 bg-emerald-500 text-black font-semibold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title={
                      isStartingGame || currentRoom.status === 'starting'
                        ? "Starting game..."
                        : currentRoom.players.length < 2 
                          ? "Need at least 2 players to start" 
                          : !currentRoom.players.every(p => p.isReady) 
                            ? "All players must be ready" 
                            : "Start the game!"
                    }
                  >
                    {(isStartingGame || currentRoom.status === 'starting') ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        Starting...
                      </>
                    ) : (
                      currentRoom.players.length < 2 
                        ? "Need 2+ Players" 
                        : !currentRoom.players.every(p => p.isReady) 
                          ? "Waiting for Ready" 
                          : "Start Game"
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              if (currentRoom) leaveRoom();
              window.location.href = '/';
            }}
            className="w-full mt-4 bg-gray-500 text-white font-semibold py-2 px-4 rounded-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Only show game grid when we're actually playing
  if (!isMultiplayer || !currentRoom || currentRoom.status !== 'playing' || !currentRoom.gameState?.grid) {
    return null; // This should not happen due to the conditions above, but just in case
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] p-6 relative">
      {/* Grid loading is now handled by the backend when game starts */}

      <div className="w-full max-w-3xl bg-[#262346] rounded-md px-6 py-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">

          <div className="flex items-center gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-white text-[#3b27ff] text-sm font-bold grid place-items-center">
              {isMultiplayer && currentRoom?.status === 'playing' 
                ? currentRoom.gameState?.gameData?.players?.[currentRoom.gameState?.currentGamePlayerIndex || 0]?.playerName?.[0] || '?'
                : currentPlayer?.name[0] || '?'
              }
            </div>
            <span className="text-white font-medium text-sm">
              {isMultiplayer && currentRoom?.status === 'playing'
                ? currentRoom.gameState?.gameData?.players?.[currentRoom.gameState?.currentGamePlayerIndex || 0]?.playerName || 'Unknown'
                : currentPlayer?.name || 'Unknown'
              }
            </span>
            {/* Hand raised icon for current player's turn */}
            {isMultiplayer && currentRoom?.status === 'playing' && 
             currentRoom.players[currentRoom.gameState?.currentPlayerIndex || 0]?.userId === currentUserId && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-lg">✋</span>
                <span className="text-yellow-400 text-xs font-medium">Your Turn</span>
              </div>
            )}
          </div>

          {/* Timeout Notification Display */}
          {timeoutNotification && (
            <div className="bg-red-500/20 border border-red-500 rounded-md p-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-lg">⏰</span>
                <div>
                  <p className="text-red-400 text-sm font-medium">Turn Timeout</p>
                  <p className="text-red-300 text-xs">
                    {timeoutNotification.username} timed out! Turn skipped.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            {/* Wildcard button - show for current player in multiplayer */}
            {isMultiplayer && currentRoom?.status === 'playing' && 
             currentRoom.players[currentRoom.gameState?.currentPlayerIndex || 0]?.userId === currentUserId && (
              <button
                disabled={currentRoom.gameState?.playerData?.[currentUserId]?.wildcardUsed}
                className={`${currentRoom.gameState?.playerData?.[currentUserId]?.wildcardUsed ? 'opacity-50 cursor-not-allowed' : 'bg-[#fbbc05] hover:bg-yellow-400'
                  } text-black text-sm font-bold py-1 px-3 rounded-md shadow`}
                onClick={() => multiplayerUseWildcard()}
              >
                Play Wildcard
              </button>
            )}
            <div className="flex items-center gap-1 text-xs text-white/70 ml-8">
              ⏱️ <span>
                {isMultiplayer && currentRoom?.status === 'playing' 
                  ? ((currentRoom.gameState as any)?.timeRemaining || countdownTimer)
                  : timer
                }s left
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <span className="text-xs text-white/70 whitespace-nowrap">
              {isMultiplayer 
                ? `${currentRoom?.gameState?.remainingPlayers || 0} PLAYERS LEFT`
                : `${GAME_CONFIG.MAX_PLAYERS - currentIndex} PLAYERS LEFT`
              }
            </span>
          </div>
        </div>
      </div>
      <div className="w-full max-w-3xl bg-[#1e2033] p-4 rounded-md mx-auto">
        <div className="flex flex-col gap-2">
           {(isMultiplayer && currentRoom?.gameState?.grid ? currentRoom.gameState.grid : currentGrid).map((row, rowIndex) => (
             <div key={rowIndex} className="grid grid-cols-4 gap-2">
              {row.map((cat, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const logoPath = getMemoizedLogoPath(cat.slug);
                
                // Get cell status for multiplayer
                let cellStatusValue = cellStatus[key] ?? 'default';
                if (isMultiplayer && currentRoom?.gameState?.lockedCells) {
                  // Check if cell is locked in multiplayer
                  const lockedCells = currentRoom.gameState.lockedCells || [];
                  if (lockedCells.includes(cat.name)) {
                    cellStatusValue = 'correct';
                  }
                  
                  // Check for temporary wrong status (red flash)
                  if (tempCellStatus[cat.name] === 'wrong') {
                    cellStatusValue = 'wrong';
                  }
                }

                return (
                  <div
                    key={key}
                    className={`${getCellClass(cellStatusValue)} text-xs font-medium leading-tight flex flex-col items-center justify-center text-center w-38 h-16 rounded transition-all duration-200 p-1`}
                    onClick={() => handleCellClick(cat, rowIndex, colIndex)}
                  >
                    <>
                      {logoPath && (!failedImageAttempts[logoPath] || failedImageAttempts[logoPath] < GAME_CONFIG.MAX_IMAGE_RETRY_ATTEMPTS) ? (
                        <Image
                          src={logoPath}
                          alt={cat.name}
                          width={24}
                          height={24}
                          className="mb-1"
                          onError={(e) => {
                            const currentAttempts = failedImageAttempts[logoPath] || 0;
                            const newAttempts = currentAttempts + 1;

                            if (newAttempts >= GAME_CONFIG.MAX_IMAGE_RETRY_ATTEMPTS) {
                              e.currentTarget.style.display = 'none';
                            }

                            setFailedImageAttempts(prev => ({
                              ...prev,
                              [logoPath]: newAttempts
                            }));
                          }}
                        />
                      ) : logoPath && failedImageAttempts[logoPath] >= GAME_CONFIG.MAX_IMAGE_RETRY_ATTEMPTS ? (
                        <div className="w-6 h-6 mb-1 bg-gray-500 rounded flex items-center justify-center text-white text-xs">
                          ❌
                        </div>
                      ) : null}

                      <span className="text-[10px] leading-tight">{cat.name}</span>
                    </>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-3xl flex justify-between mt-8 mx-auto">
        <button 
          className={`font-semibold px-8 py-2 rounded ${
            isMultiplayer && currentRoom?.status === 'playing' && 
            currentRoom.players[currentRoom.gameState?.currentPlayerIndex || 0]?.userId === currentUserId
              ? 'bg-[#ffd600] text-black hover:bg-yellow-400' 
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
          onClick={() => {
            if (isMultiplayer && currentRoom?.status === 'playing' && 
                currentRoom.players[currentRoom.gameState?.currentPlayerIndex || 0]?.userId === currentUserId) {
              multiplayerSkipTurn();
            } else if (!isMultiplayer) {
              handleSkip();
            }
          }}
          disabled={
            isMultiplayer && currentRoom?.status === 'playing' && 
            currentRoom.players[currentRoom.gameState?.currentPlayerIndex || 0]?.userId !== currentUserId
          }
        >
          Skip
        </button>
        <button 
          className={`font-semibold px-8 py-2 rounded ${
            isResettingGame 
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
              : 'bg-emerald-500 text-black hover:bg-emerald-600'
          }`}
          onClick={startNewGame}
          disabled={isResettingGame}
        >
          {isResettingGame ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
              Resetting...
            </div>
          ) : (
            'New Game'
          )}
        </button>
      </div>
    </div>
  );
};

// Wrapper component with MultiplayerProvider
const BingoGameWithProvider: React.FC = () => {
  return (
    <MultiplayerProvider>
      <BingoGame />
    </MultiplayerProvider>
  );
};

export default BingoGameWithProvider;