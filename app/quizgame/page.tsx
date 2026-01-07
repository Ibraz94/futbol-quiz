'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from "../../lib/config";
import { useMultiplayer, MultiplayerProvider } from '../../lib/multiplayer-context';

type CareerEntry = {
  team: string;
  season: string;
  matches: number;
  goals: number;
  assists: number;
};

type Player = {
  name: string;
  career: CareerEntry[];
};

interface QuizGameState {
  players: Player[];
  currentPlayerIndex: number;
  currentQuestion: Player | null;
  gamePhase: 'lobby' | 'playing' | 'finished';
  scores: Record<string, number>;
  series: Record<string, number>;
  timer: number;
  gameStartTime?: Date;
  endTime?: Date;
  winner?: string;
}

const QuizGame: React.FC = () => {
  // Check authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

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
    submitAnswer: multiplayerSubmitAnswer,
    skipQuestion: multiplayerSkipQuestion,
    resetGame: multiplayerResetGame
  } = multiplayer;

  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [series, setSeries] = useState(0);
  const [timer, setTimer] = useState(20);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState<boolean>(false);
  const [isResettingGame, setIsResettingGame] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const [isStartingNewGameFromWinner, setIsStartingNewGameFromWinner] = useState<boolean>(false);
  const [showOpponentLeftModal, setShowOpponentLeftModal] = useState<boolean>(false);
  const [disconnectedPlayerName, setDisconnectedPlayerName] = useState<string>('');
  const [isWinner, setIsWinner] = useState<boolean>(false);
  const [wonByDisconnect, setWonByDisconnect] = useState<boolean>(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

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
        leaveRoom();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentRoom, leaveRoom]);

  // Get user ID from JWT token
  const getUserIdFromToken = (): string | null => {
    if (typeof window === 'undefined') return null; // SSR-safe
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || null;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  };

  const authenticatedUserId = getUserIdFromToken();
  const [inputUsername, setInputUsername] = useState<string>(authenticatedUserId || '');

  // Sync multiplayer state with local state
  useEffect(() => {
    if (currentRoom?.gameState) {
      const gameState = currentRoom.gameState as QuizGameState;
      
      // Update players if available
      if (gameState.players && gameState.players.length > 0) {
        setPlayers(gameState.players);
      }
      
      // Update current player index
      if (gameState.currentPlayerIndex !== undefined) {
        setCurrentIndex(gameState.currentPlayerIndex);
      }
      
      // Update scores if available
      if (gameState.scores && currentUserId && gameState.scores[currentUserId] !== undefined) {
        setScore(gameState.scores[currentUserId]);
      }
      
      // Update series if available
      if (gameState.series && currentUserId && gameState.series[currentUserId] !== undefined) {
        setSeries(gameState.series[currentUserId]);
      }
      
      // Update timer if available
      if (gameState.timer !== undefined) {
        setTimer(gameState.timer);
      }
      
      // Update game ended state
      if (currentRoom.status === 'finished') {
        setShowGameOver(true);
      }
    }
  }, [currentRoom?.gameState, currentRoom?.status, currentUserId]);

  // Reset loading state when game actually starts
  useEffect(() => {
    if (currentRoom?.status === 'playing' && currentRoom?.gameState?.players) {
      setIsStartingGame(false);
    }
  }, [currentRoom?.status, currentRoom?.gameState?.players]);

  // Timer management: sync from server when playing
  useEffect(() => {
    if (currentRoom?.status === 'playing' && currentRoom?.gameState) {
      const gameState = currentRoom.gameState as any;
      if (typeof gameState.timer === 'number') {
        setTimer(gameState.timer);
      }
    }
  }, [currentRoom?.status, currentRoom?.gameState, (currentRoom?.gameState as any)?.timer]);

  // Log correct answer for current question (for testing)
  useEffect(() => {
    if (currentRoom?.status === 'playing' && currentRoom?.gameState) {
      const gs = currentRoom.gameState as any;
      const idx = typeof gs.currentPlayerIndex === 'number' ? gs.currentPlayerIndex : 0;
      const currentQ = Array.isArray(gs.players) ? gs.players[idx] : undefined;
      if (currentQ?.name) {
        console.log(`🎯 Current Answer: ${currentQ.name}`);
      }
    }
  }, [currentRoom?.status, (currentRoom?.gameState as any)?.currentPlayerIndex]);

  // Listen for forced leave room requests from navigation (when context not available)
  useEffect(() => {
    if (!leaveRoom) return;
    
    const handleForceLeave = (event: CustomEvent) => {
      console.log('[Quiz] Force leave room requested from navigation:', event.detail);
      if (leaveRoom) {
        leaveRoom();
      }
    };
    
    window.addEventListener('mp_forceLeaveRoom', handleForceLeave as EventListener);
    return () => window.removeEventListener('mp_forceLeaveRoom', handleForceLeave as EventListener);
  }, [leaveRoom]);

  // Listen for opponent disconnect event
  useEffect(() => {
    const handleOpponentDisconnected = (event: CustomEvent) => {
      const { disconnectedPlayer, winner } = event.detail;
      const isMe = winner === currentUserId;
      
      setDisconnectedPlayerName(disconnectedPlayer?.username || 'Opponent');
      setIsWinner(isMe);
      if (isMe) {
        setWonByDisconnect(true);
      }
      setShowGameOver(true); // Show game over screen
    };

    window.addEventListener('opponentDisconnected', handleOpponentDisconnected as EventListener);
    return () => window.removeEventListener('opponentDisconnected', handleOpponentDisconnected as EventListener);
  }, [currentUserId]);

  // Start local timer only for non-multiplayer or pre-game; when playing, rely on server timer
  useEffect(() => {
    if (currentRoom?.status === 'playing') return;
    if (players.length > 0) startTimer();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, players.length, currentRoom?.status]);

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimer(20);
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev === 1) {
          handleSkip();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const currentPlayer = players[currentIndex];

  const nextPlayer = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setInput('');
    if (nextIndex >= players.length) {
      console.log('🎉 Game complete. Showing Game Over...');
      setShowGameOver(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Don't auto-reset in multiplayer - let server handle it
      if (!currentRoom) {
        setTimeout(() => {
          setShowGameOver(false);
        }, 2000);
      }
    } else {
      console.log('🔍 Next answer is:', players[nextIndex].name);
    }
  };

  const handleGuess = () => {
    if (!currentPlayer) return;
    
    // In multiplayer mode, submit answer to server
    if (currentRoom?.status === 'playing') {
      multiplayerSubmitAnswer(input);
      setInput(''); // Clear input after submitting
      return;
    }
    
    // Single player mode (fallback)
    const guess = input.trim().toLowerCase();
    const actual = currentPlayer.name.trim().toLowerCase();

    console.log('🧠 Correct Answer:', currentPlayer.name);

    if (guess === actual) {
      setScore(prev => prev + 1);
      setSeries(prev => prev + 1);
      console.log('✅ Correct!');
    } else {
      setSeries(0);
      console.log('❌ Wrong!');
    }

    nextPlayer();
  };

  const handleSkip = () => {
    // In multiplayer mode, skip question via server
    if (currentRoom?.status === 'playing') {
      multiplayerSkipQuestion();
      return;
    }
    
    // Single player mode (fallback)
    nextPlayer();
  };

  // Normalize season to 4-digit start year
  const normaliseYear = (season: string): number => {
    const firstPart = season.split('/')[0].trim();
    if (firstPart.length === 4) return parseInt(firstPart, 10);
    const yr = parseInt(firstPart, 10);
    return yr < 30 ? 2000 + yr : 1900 + yr;
  };

  // Transform and sort the career data
  const transformCareerData = (career: CareerEntry[]) => {
    type AggregatedRow = {
      team: string;
      season: string;
      matches: number;
      goals: number;
      assists: number;
      sortKey: number;
    };

    const grouped: Record<string, any> = {};

    for (const entry of career) {
      const { team, season, matches, goals, assists } = entry;
      const year = normaliseYear(season);

      if (!grouped[team]) {
        grouped[team] = {
          team,
          seasonStart: year,
          seasonEnd: year,
          matches,
          goals,
          assists,
        };
      } else {
        const g = grouped[team];
        g.seasonStart = Math.min(g.seasonStart, year);
        g.seasonEnd = Math.max(g.seasonEnd, year);
        g.matches += matches;
        g.goals += goals;
        g.assists += assists;
      }
    }

    return Object.values(grouped)
      .map((row: any) => ({
        team: row.team,
        season: row.seasonStart === row.seasonEnd
          ? `${row.seasonStart}`
          : `${row.seasonStart}-${row.seasonEnd}`,
        matches: row.matches,
        goals: row.goals,
        assists: row.assists,
        sortKey: row.seasonEnd,
      }))
      .sort((a, b) => {
        if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;

        const getRange = (season: string) => {
          if (!season.includes('-')) return { start: Number(season), length: 0 };
          const [start, end] = season.split('-').map(Number);
          return { start, length: end - start };
        };

        const aRange = getRange(a.season);
        const bRange = getRange(b.season);

        // Prefer shorter range (solo seasons) first if same end year
        if (bRange.length !== aRange.length) return aRange.length - bRange.length;

        // Tiebreaker: later season start comes first
        return bRange.start - aRange.start;
      });
  };

  const startNewGame = async (): Promise<void> => {
    if (isResettingGame) return;
    
    console.log('🔄 Starting new game - returning to lobby...');
    setIsResettingGame(true);
    
    try {
      if (currentRoom) {
        console.log('🔄 Requesting game reset from server...');
        await multiplayerResetGame();
        console.log('✅ Game state reset, returning to lobby');
        
        setScore(0);
        setSeries(0);
        setCurrentIndex(0);
        setInput('');
        setTimer(20);
        setShowGameOver(false);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    } catch (error) {
      console.error('❌ Error resetting game:', error);
    } finally {
      setIsResettingGame(false);
    }
  };

  // Custom start game handler
  const handleStartGame = async () => {
    if (isStartingGame) return;
    
    setIsStartingGame(true);
    try {
      await startGame();
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsStartingGame(false);
    }
  };

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
            You need to be logged in to play multiplayer quiz games.
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

  // Show loading screen while game is starting
  if (currentRoom?.status === 'playing' && !currentRoom?.gameState?.players) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Starting Game...</h2>
          <p className="text-lg text-white/80">Loading quiz questions</p>
        </div>
      </div>
    );
  }

  // Don't show opponent left modal - let the game over screen handle it with the disconnect message

  // Show leave confirmation modal
  if (showLeaveConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118] relative">
        <div className="absolute inset-0 bg-black/80 z-40"></div>
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
              onClick={async () => {
                setShowLeaveConfirmation(false);
                if (leaveRoom) {
                  await leaveRoom();
                }
                window.location.href = '/';
              }}
              className="flex-1 bg-red-500 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-600 transition-colors"
            >
              Yes, Leave Game
            </button>
            <button
              onClick={() => setShowLeaveConfirmation(false)}
              className="flex-1 bg-gray-500 text-white font-semibold py-3 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show leave confirmation modal
  if (showLeaveConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118] relative">
        <div className="absolute inset-0 bg-black/80 z-40"></div>
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
              onClick={async () => {
                setShowLeaveConfirmation(false);
                if (leaveRoom) {
                  await leaveRoom();
                }
                window.location.href = '/';
              }}
              className="flex-1 bg-red-500 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-600 transition-colors"
            >
              Yes, Leave Game
            </button>
            <button
              onClick={() => setShowLeaveConfirmation(false)}
              className="flex-1 bg-gray-500 text-white font-semibold py-3 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show game over screen
  if (showGameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <h2 className="text-2xl font-bold">🎉 Game Over</h2>
        
        {/* Winner Display */}
        <div className="text-center">
          <p className="text-lg text-white/80">
            {currentRoom?.gameState?.winner === currentUserId ? 
              (wonByDisconnect 
                ? '🏆 Congratulations! You won due to other player disconnecting mid game!' 
                : '🏆 Congratulations! You won!') : 
              `🏆 Winner: ${currentRoom?.players.find(p => p.userId === currentRoom?.gameState?.winner)?.username || 'Unknown'}`
            }
          </p>
          {currentRoom?.gameState?.scores && (
            <p className="text-sm text-white/60 mt-1">
              Final Score: {currentRoom.gameState.scores[currentRoom.gameState.winner || ''] || 0} points
            </p>
          )}
        </div>

        {/* Final Scores */}
        {currentRoom?.gameState?.scores && (
          <div className="bg-white/10 rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold mb-3 text-center">Final Scores</h3>
            <div className="space-y-2">
              {Object.entries(currentRoom.gameState.scores)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([userId, score]: [string, number]) => (
                <div key={userId} className={`flex justify-between items-center px-3 py-2 rounded ${
                  userId === currentRoom?.gameState?.winner ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'
                }`}>
                  <span className={userId === currentUserId ? 'font-semibold' : ''}>
                    {currentRoom?.players.find(p => p.userId === userId)?.username || 'Unknown'} {userId === currentUserId ? '(You)' : ''}
                  </span>
                  <span className="font-mono">{score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <button 
            onClick={async () => {
              if (isStartingNewGameFromWinner) return;
              
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
              if (isLeavingRoom) return;
              
              console.log('🏠 Going back to home...');
              setIsLeavingRoom(true);
              
              try {
                if (currentRoom) {
                  await leaveRoom();
                }
                window.location.href = '/';
              } catch (error) {
                console.error('❌ Error leaving room:', error);
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

  // Multiplayer lobby UI
  const shouldShowLobby = !isConnected || !currentRoom || currentRoom.status === 'waiting' || currentRoom.status === 'starting';
  const isMyTurn = Boolean(currentRoom?.gameState && currentUserId && (currentRoom.gameState as any).currentTurnUserId === currentUserId);
  const currentTurnUserId = (currentRoom?.gameState as any)?.currentTurnUserId as string | undefined;
  const currentTurnUsername = currentTurnUserId ? currentRoom?.players.find(p => p.userId === currentTurnUserId)?.username : undefined;
  
  if (shouldShowLobby) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] p-6 relative">
        {/* Loading overlay when starting game */}
        {(isStartingGame || currentRoom?.status === 'starting') && (
          <div className="absolute inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Starting Game...</h2>
              <p className="text-lg text-white/80">Loading quiz questions</p>
              <p className="text-sm text-white/60 mt-2">This may take a few moments</p>
              <p className="text-xs text-white/40 mt-2">Room Status: {currentRoom?.status || 'unknown'}</p>
            </div>
          </div>
        )}
        
        <div className="bg-[#262346] rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-[#ffd600] mb-6 text-center">🧠 Quiz Game Lobby</h2>
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
                  <p className="text-white/70 text-sm">Players: {currentRoom.players.length}/2</p>
                  {currentRoom.players.length >= 2 && (
                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      FULL
                    </span>
                  )}
                </div>
                
                {/* Room Capacity Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Room Capacity</span>
                    <span>{Math.round((currentRoom.players.length / 2) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentRoom.players.length >= 2 
                          ? 'bg-red-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(currentRoom.players.length / 2) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {currentRoom.players.length === 1 && (
                  <p className="text-[#ffd600] text-sm font-medium mt-2">🎯 You are the host! Wait for other players to join.</p>
                )}
                {currentRoom.players.length >= 2 && (
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

  // Only show game when we're actually playing
  if (!currentRoom || currentRoom.status !== 'playing' || !currentRoom.gameState?.players) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0e1118] px-4 py-6 text-white">
      {/* Game Over Screen */}
      {showGameOver && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 animate-pulse">🎮 Game Over</h1>
          <p className="text-lg sm:text-xl text-gray-300">Restarting...</p>
        </div>
      )}

      {/* Status Bar */}
      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Duration</p>
          <p className="text-xl font-bold text-blue-400">⏱️ {currentRoom?.status === 'playing' ? ((currentRoom?.gameState as any)?.timer ?? timer) : timer} s</p>
        </div>
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Score</p>
          <p className="text-xl font-bold text-yellow-400">🏆 {score}</p>
        </div>
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Series</p>
          <p className={`text-xl font-bold text-orange-400 flex items-center ${series >= 3 ? 'animate-bounce' : ''}`}>
            🔥 {series}
          </p>
        </div>
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Remainder</p>
          <p className="text-xl font-bold text-purple-400">👥 {players.length - currentIndex}</p>
        </div>
      </div>

      {/* Current Turn Indicator */}
      <div className="w-full max-w-4xl bg-[#262346] rounded-md px-6 py-3 mb-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-white text-[#3b27ff] text-sm font-bold grid place-items-center">
          {(currentTurnUsername || 'U')[0]}
        </div>
        <span className="text-white font-medium text-sm">
          {currentTurnUsername ? `${currentTurnUsername}'s turn` : 'Waiting...'}
        </span>
        {isMyTurn && (
          <div className="flex items-center gap-1 ml-3">
            <span className="text-yellow-400 text-lg">✋</span>
            <span className="text-yellow-400 text-xs font-medium">Your Turn</span>
          </div>
        )}
        <div className="ml-auto text-xs text-white/70">
          ⏱️ {currentRoom?.status === 'playing' ? ((currentRoom?.gameState as any)?.timer ?? timer) : timer}s left
        </div>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center gap-4 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write the name of the football player..."
          className="flex-grow rounded-md bg-[#1a1e2d] py-3 px-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          disabled={currentRoom?.status === 'playing' && !isMyTurn}
        />
        <button
          onClick={handleGuess}
          className={`rounded-md py-3 px-5 text-sm sm:text-base font-medium ${currentRoom?.status === 'playing' && !isMyTurn ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-[#1a1e2d] hover:bg-[#2a2f4a]'}`}
          disabled={currentRoom?.status === 'playing' && !isMyTurn}
        >
          Enter
        </button>
        <button
          onClick={handleSkip}
          className={`rounded-md py-3 px-5 text-sm sm:text-base font-medium ${currentRoom?.status === 'playing' && !isMyTurn ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-[#1a1e2d] hover:bg-[#2a2f4a]'}`}
          disabled={currentRoom?.status === 'playing' && !isMyTurn}
        >
          Skip
        </button>
      </div>

      {/* Career Table */}
      <div className="w-full max-w-4xl overflow-x-auto rounded-lg bg-[#1a1e2d]">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-600">
              <th className="py-3 px-4 text-sm sm:text-base">Years</th>
              <th className="py-3 px-4 text-sm sm:text-base">Team</th>
              <th className="py-3 px-4 text-sm sm:text-base">Match</th>
              <th className="py-3 px-4 text-sm sm:text-base">Goal</th>
            </tr>
          </thead>
          <tbody>
            {transformCareerData(currentPlayer?.career || []).map(({ season, team, matches, goals }, idx) => (
              <tr key={idx} className="border-b border-gray-700 hover:bg-[#2a2f4a]/50">
                <td className="py-3 px-4">{season}</td>
                <td className="py-3 px-4">{team}</td>
                <td className="py-3 px-4">{matches}</td>
                <td className="py-3 px-4">{goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Game Controls */}
      <div className="w-full max-w-4xl flex justify-between mt-8">
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
const QuizGameWithProvider: React.FC = () => {
  return (
    <MultiplayerProvider namespace="/quiz-multiplayer">
      <QuizGame />
    </MultiplayerProvider>
  );
};

export default QuizGameWithProvider;