"use client";

import React, { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MultiplayerProvider, useMultiplayer } from "../../../lib/multiplayer-context";

function PlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const league = searchParams?.get("league") || "";

  const {
    isConnected,
    currentRoom,
    currentUserId,
    socket,
    submitTeamAnswer,
    skipTurn,
    resetGame: multiplayerResetGame,
    leaveRoom,
  } = useMultiplayer();

  const [input, setInput] = useState("");
  const [lastAnswerResult, setLastAnswerResult] = useState<{ correct: boolean; userId: string } | null>(null);
  const [isResettingGame, setIsResettingGame] = useState<boolean>(false);
  const [isStartingNewGameFromWinner, setIsStartingNewGameFromWinner] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const hasRequestedGameState = useRef(false);

  // CRITICAL: Listen for gameReset event FIRST - before ANY other logic
  // This MUST work even when showing game over screen, so it's at the very top
  useEffect(() => {
    if (!socket) return;
    
    const handleGameReset = (data: any) => {
      console.log('🔄 [PlayPage] gameReset event received, redirecting to lobby...', data);
      // Use window.location for immediate hard redirect - cannot be overridden
      // This ensures redirect happens even if component is showing game over screen
      window.location.href = '/teamgame';
    };
    
    socket.on('gameReset', handleGameReset);
    
    return () => {
      socket.off('gameReset', handleGameReset);
    };
  }, [socket]);

  // Request game state when page loads if currentRoom is null
  useEffect(() => {
    if (!hasRequestedGameState.current && isConnected && socket && currentUserId && !currentRoom) {
      hasRequestedGameState.current = true;
      
      // Request game state
      const requestGameState = () => {
        if (socket?.connected && currentUserId) {
          socket.emit('getGameState', { userId: currentUserId });
        }
      };
      
      // Request immediately if connected, otherwise wait for connection
      if (socket?.connected) {
        requestGameState();
      } else {
        const handleConnect = () => {
          requestGameState();
          socket?.off('connect', handleConnect);
        };
        socket?.on('connect', handleConnect);
        
        // Also try after a short delay in case connect event already fired
        setTimeout(requestGameState, 500);
      }
    }
  }, [isConnected, socket, currentUserId, currentRoom]);

  const currentTurnUserId = currentRoom?.currentTurnUserId || null;
  const isMyTurn = !!currentUserId && currentTurnUserId === currentUserId;
  const currentTurnUsername = useMemo(() => {
    const p = currentRoom?.players.find(p => p.userId === currentTurnUserId);
    return p?.username || '';
  }, [currentRoom?.players, currentTurnUserId]);

  const timer = currentRoom?.gameState?.timer ?? undefined;
  const scores = currentRoom?.gameState?.scores || {};
  const playerSelections = currentRoom?.gameState?.playerSelections || {} as Record<string,string[]>;
  const isFinished = currentRoom?.status === 'finished' || currentRoom?.gameState?.gamePhase === 'finished';
  const winnerUserId = currentRoom?.gameState?.winner;
  const winnerName = winnerUserId ? (currentRoom?.players.find(p => p.userId === winnerUserId)?.username || 'Winner') : '';
  
  // Debug: Log when currentRoom changes
  useEffect(() => {
    if (currentRoom) {
    }
  }, [currentRoom, isFinished]);

  // Determine the two teams for the current turn's player (my teams when it's my turn)
  const [team1, team2] = useMemo(() => {
    // Use current turn player's teams (or my teams if it's my turn)
    const targetUserId = currentTurnUserId || currentUserId;
    const picks = targetUserId ? (playerSelections[targetUserId] || []) : [];
    return [picks[0] || '', picks[1] || ''];
  }, [playerSelections, currentTurnUserId, currentUserId]);

  // Listen for valid players for the current teams (for debugging)
  useEffect(() => {
    if (!socket) return;
    const onValidPlayers = (data: any) => {
      if (data?.team1 && data?.team2 && data?.validPlayers) {
        console.log(`🎯 Correct answers (any of these):`, data.validPlayers.join(', '));
      }
    };
    socket.on('validPlayersForTeams', onValidPlayers);
    return () => {
      socket.off('validPlayersForTeams', onValidPlayers);
    };
  }, [socket]);

  // Log correct answer when teams change or answer phase starts (for ALL players)
  useEffect(() => {
    const turnPhase = (currentRoom?.gameState as any)?.turnPhase;
    // Show valid players for the current turn player's teams when in answer phase
    // This works for both the current player and observers
    if (turnPhase === 'playing' && team1 && team2) {
      // Fallback: Fetch valid players via API if event wasn't received
      const fetchValidPlayers = async () => {
        try {
          const response = await fetch(`http://localhost:4010/leagues/valid-players`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ team1, team2 }),
          });
          const data = await response.json();
          if (data?.players && Array.isArray(data.players)) {
            console.log(`🎯 Correct answers (any of these):`, data.players.join(', '));
          }
        } catch (err) {
          // Silent fail
        }
      };
      
      // Fetch after a short delay to give the event time to arrive first
      const timeout = setTimeout(() => {
        fetchValidPlayers();
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [team1, team2, (currentRoom?.gameState as any)?.turnPhase, currentTurnUserId]);

  // Listen for answer results
  useEffect(() => {
    if (!socket) return;
    const onAnswerResult = (data: any) => {
      if (data?.userId && data?.correct !== undefined) {
        setLastAnswerResult({ correct: data.correct, userId: data.userId });
        // Clear feedback after 2 seconds
        setTimeout(() => setLastAnswerResult(null), 2000);
      }
    };
    socket.on('answerResult', onAnswerResult);
    return () => {
      socket.off('answerResult', onAnswerResult);
    };
  }, [socket]);

  // Clear feedback when turn changes
  useEffect(() => {
    setLastAnswerResult(null);
  }, [currentTurnUserId]);

  // Also redirect when room status changes to 'waiting' with no gameState (backup check)
  useEffect(() => {
    // If status is 'waiting' and gameState is cleared, that means game was reset
    // Check regardless of isFinished state - if reset happened, we should go to lobby
    if (currentRoom && currentRoom.status === 'waiting' && !currentRoom.gameState) {
      // Game was reset - redirect to lobby
      console.log('🔄 [PlayPage] Game reset detected (status check), redirecting to lobby...');
      window.location.href = '/teamgame';
    }
  }, [currentRoom?.status, currentRoom?.gameState]);

  // Redirect if not in answer phase or not my turn (but NOT if game is finished - show winner screen for both)
  useEffect(() => {
    // IMPORTANT: If game is finished, NEVER redirect - show winner screen for both players
    if (isFinished) {
      return;
    }
    
    const turnPhase = (currentRoom?.gameState as any)?.turnPhase;
    const isMyTurn = !!currentUserId && currentTurnUserId === currentUserId;
    
    // Always redirect to team selection if turn phase is 'team-selection' (regardless of whose turn it is)
    if (turnPhase === 'team-selection') {
      router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
      return;
    }
    
    // If it's not my turn and I'm on the play page, go back to team selection (waiting)
    if (!isMyTurn && turnPhase === 'playing') {
      router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
    }
  }, [(currentRoom?.gameState as any)?.turnPhase, currentTurnUserId, currentUserId, router, league, isFinished]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn) return;
    if (!team1 || !team2) return;
    await submitTeamAnswer(input, team1, team2);
    setInput("");
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
        
        // Clear local state
        setInput("");
        setLastAnswerResult(null);
        
        // Navigate back to team game lobby (league selection page)
        // Both players will be in "not ready" state after reset
        router.push('/teamgame');
      }
    } catch (error) {
      console.error('❌ Error resetting game:', error);
    } finally {
      setIsResettingGame(false);
    }
  };

  const handleBackToHome = async (): Promise<void> => {
    try {
      if (currentRoom) {
        // Leave room and clean room state
        leaveRoom();
      }
      // Navigate to home
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      // Navigate to home anyway
      window.location.href = '/';
    }
  };

  // Debug: Log game finished state and force re-render if needed
  useEffect(() => {
    if (currentRoom) {
      const roomIsFinished = currentRoom.status === 'finished' || currentRoom.gameState?.gamePhase === 'finished';
      
      // If backend says finished but our check doesn't, force update
      if (roomIsFinished && !isFinished) {
      }
    }
  }, [currentRoom, isFinished, winnerName]);

  // If we don't have room data yet, show loading
  // Wait for getGameState response or gameFinished event
  if (!currentRoom) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#111827] to-black">
        <div className="w-full max-w-md p-6 rounded-2xl bg-[#23233a] border border-white/10 text-white shadow-lg">
          <div className="text-center text-white/70">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading game state...</p>
            <p className="text-xs mt-2 text-white/50">
              {isConnected ? 'Connected - waiting for game state...' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show full screen game over (like Bingo/Quiz) when game is finished
  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-gradient-to-b from-[#111827] to-black">
        <h2 className="text-2xl font-bold">🎉 Game Over</h2>
        
        {/* Winner Display */}
        <div className="text-center">
          <p className="text-lg text-white/80">
            {winnerUserId === currentUserId ? 
              '🏆 Congratulations! You won!' : 
              `🏆 Winner: ${winnerName || 'Unknown'}`
            }
          </p>
          {scores && winnerUserId && (
            <p className="text-sm text-white/60 mt-1">
              Final Score: {scores[winnerUserId] || 0} points
            </p>
          )}
        </div>

        {/* Final Scores */}
        {scores && Object.keys(scores).length > 0 && (
          <div className="bg-white/10 rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold mb-3 text-center">Final Scores</h3>
            <div className="space-y-2">
              {Object.entries(scores)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([userId, score]: [string, number]) => (
                <div key={userId} className={`flex justify-between items-center px-3 py-2 rounded ${
                  userId === winnerUserId ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'
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

  // Regular Game UI - only shown when game is NOT finished
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#111827] to-black">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#23233a] border border-white/10 text-white shadow-lg">
        {/* Turn indicator */}
        <div className="w-full bg-[#262346] rounded-md px-4 py-3 mb-4 flex items-center gap-3">
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
        </div>
        
        {/* Timer countdown */}
        {timer !== undefined && !isFinished && (
          <div className={`w-full mb-4 p-4 rounded-lg border-2 text-center transition-all ${
            timer <= 3 
              ? 'bg-red-500/20 border-red-500/50 text-red-400' 
              : timer <= 5 
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' 
                : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
          }`}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">⏱️</span>
              <span className="text-3xl font-bold">{timer}</span>
              <span className="text-sm opacity-80">seconds remaining</span>
            </div>
            {isMyTurn && (
              <div className="text-xs mt-2 opacity-80">
                Enter a player name that belongs to both teams!
              </div>
            )}
          </div>
        )}

        {/* Current teams for turn */}
        <div className="mb-4 divide-y divide-white/10">
          <div className="py-2 px-4 font-semibold text-white/90">{team1 || 'Team A'}</div>
          <div className="py-2 px-4 font-semibold text-white/90">{team2 || 'Team B'}</div>
        </div>

        {/* Answer feedback */}
        {lastAnswerResult && (
          <div className={`mb-4 p-3 rounded-md text-center font-bold ${
            lastAnswerResult.correct 
              ? 'bg-green-500/20 border border-green-500/40 text-green-400' 
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}>
            {lastAnswerResult.correct ? '✅ Correct! +1 point' : '❌ Wrong! 0 points'}
          </div>
        )}

        {/* Answer input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={isMyTurn ? "Enter player name..." : "Wait for your turn"}
            value={input}
            onChange={e => {
              if (isMyTurn && !isFinished) {
                setInput(e.target.value);
              }
            }}
            className={`bg-[#111827] border rounded px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 ${
              !isMyTurn || isFinished
                ? 'border-white/10 opacity-50 cursor-not-allowed bg-[#0a0a0f]'
                : 'border-white/20 focus:ring-accent'
            }`}
            disabled={!isMyTurn || isFinished}
            readOnly={!isMyTurn || isFinished}
          />
          {!isMyTurn && !isFinished && (
            <div className="text-xs text-yellow-400 text-center -mt-2">
              ⏳ Waiting for {currentTurnUsername}'s turn...
            </div>
          )}
          <div className="flex gap-2">
          <button
            type="submit"
              className="flex-1 bg-accent hover:bg-accent/80 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent"
              disabled={!isMyTurn || !input.trim() || isFinished}
          >
            Submit
          </button>
            <button
              type="button"
              onClick={() => {
                if (isMyTurn && !isFinished) {
                  skipTurn();
                }
              }}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-600"
              disabled={!isMyTurn || isFinished}
            >
              Skip
            </button>
          </div>
        </form>

        {/* Scores */}
        <div className="mt-6">
          <div className="text-sm text-white/70 mb-2">Scores</div>
          <div className="space-y-2">
            {currentRoom?.players.map((p) => (
              <div key={p.userId} className="flex items-center justify-between bg-[#1e2033] p-2 rounded">
                <span className="text-white text-sm">{p.username}</span>
                <span className="text-white/80 text-sm">{scores[p.userId] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

            {/* New Game Button (visible during gameplay, similar to bingo) */}
            <div className="mt-6 flex justify-center">
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
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <MultiplayerProvider namespace="/team-multiplayer">
        <PlayPageContent />
      </MultiplayerProvider>
    </Suspense>
  );
} 