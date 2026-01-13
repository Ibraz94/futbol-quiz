"use client";

import React, { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MultiplayerProvider, useMultiplayer } from "../../../lib/multiplayer-context";
import { API_BASE_URL } from "../../../lib/config";

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
  const [wonByDisconnect, setWonByDisconnect] = useState<boolean>(false);
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
    
    const handleGameWonInactivity = async (data: any) => {
      console.log('🏆 [PlayPage] Game won due to inactivity', data);
      setInactivityData(data);
      setShowInactivityWinModal(true);
      
      const isWinner = data.winner === currentUserId;
      const isInactive = data.inactivePlayer === currentUserId;
      
      // Both winner and inactive player - leave room and redirect to home after modal
      setTimeout(async () => {
        if (leaveRoom) {
          await leaveRoom();
        }
        window.location.href = '/';
      }, 3000); // Show modal for 3 seconds
    };
    
    const handleGameDrawedInactivity = async (data: any) => {
      console.log('🤝 [PlayPage] Game drawed due to inactivity', data);
      setInactivityData(data);
      setShowInactivityDrawModal(true);
      
      // Both players - leave room and redirect to home after modal
      setTimeout(async () => {
        if (leaveRoom) {
          await leaveRoom();
        }
        window.location.href = '/';
      }, 3000); // Show modal for 3 seconds
    };
    
    socket.on('gameReset', handleGameReset);
    socket.on('gameWonInactivity', handleGameWonInactivity);
    socket.on('gameDrawedInactivity', handleGameDrawedInactivity);
    
    return () => {
      socket.off('gameReset', handleGameReset);
      socket.off('gameWonInactivity', handleGameWonInactivity);
      socket.off('gameDrawedInactivity', handleGameDrawedInactivity);
    };
  }, [socket, currentUserId, leaveRoom]);

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

  const timer = currentRoom?.gameState?.timer ?? undefined;
  const scores = currentRoom?.gameState?.scores || {};
  const gamePhase = currentRoom?.gameState?.gamePhase || 'lobby';
  const isFinished = currentRoom?.status === 'finished' || gamePhase === 'finished';
  const winnerUserId = currentRoom?.gameState?.winner;
  const winnerName = winnerUserId ? (currentRoom?.players.find(p => p.userId === winnerUserId)?.username || 'Winner') : '';
  const bothTeams = (currentRoom?.gameState as any)?.bothTeams;
  const [team1, team2] = bothTeams ? [bothTeams.team1, bothTeams.team2] : ['', ''];
  const isDraw = isFinished && (winnerUserId === null || winnerUserId === undefined); // Draw when finished but no winner
  const [showWrongAnswerModal, setShowWrongAnswerModal] = useState(false);
  const [showBothAnsweredModal, setShowBothAnsweredModal] = useState(false);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [opponentAnswer, setOpponentAnswer] = useState<{ playerName: string; username: string; correct: boolean } | null>(null);
  const [showInactivityWinModal, setShowInactivityWinModal] = useState(false);
  const [showInactivityDrawModal, setShowInactivityDrawModal] = useState(false);
  const [inactivityData, setInactivityData] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<string[]>([]); // Store all players for autocomplete
  const [validPlayers, setValidPlayers] = useState<string[]>([]); // Store valid players for logging
  const [suggestions, setSuggestions] = useState<string[]>([]); // Real-time search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false); // Show/hide suggestions dropdown
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Listen for wrong answer event
  useEffect(() => {
    if (!socket) return;
    
    const handleWrongAnswer = (data: any) => {
      setShowWrongAnswerModal(true);
      setTimeout(() => setShowWrongAnswerModal(false), 3000); // Show for 3 seconds
    };
    
    const handleBothAnswered = (data: any) => {
      setShowBothAnsweredModal(true);
      setTimeout(() => {
        setShowBothAnsweredModal(false);
        router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
      }, 10000); // Show for 10 seconds then navigate
    };
    
    const handleAnswerSubmitted = (data: any) => {
      if (data.userId !== currentUserId) {
        setOpponentAnswer({
          playerName: data.playerName,
          username: data.playerUsername || 'Opponent',
          correct: data.correct,
        });
      }
    };
    
    const handleAnswerResult = (data: any) => {
      if (data.userId === currentUserId && data.correct) {
        // I got it right - navigate after delay
        setTimeout(() => {
          router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
        }, 2000);
      } else if (data.userId !== currentUserId && data.correct) {
        // Opponent got it right - show message and navigate
        setOpponentAnswer({
          playerName: data.playerName || '',
          username: data.playerUsername || 'Opponent',
          correct: true,
        });
        setTimeout(() => {
          router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
        }, 2000);
      }
    };
    
    const handleAnswerTimeout = (data: any) => {
      setTimeout(() => {
        router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
      }, 2000);
    };
    
    const handleNewRound = (data: any) => {
      setHasSubmittedAnswer(false);
      setOpponentAnswer(null);
      router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
    };
    
    socket.on('wrongAnswer', handleWrongAnswer);
    socket.on('bothAnsweredSimultaneously', handleBothAnswered);
    socket.on('answerSubmitted', handleAnswerSubmitted);
    socket.on('answerResult', handleAnswerResult);
    socket.on('answerTimeout', handleAnswerTimeout);
    socket.on('newRoundStarted', handleNewRound);
    
    return () => {
      socket.off('wrongAnswer', handleWrongAnswer);
      socket.off('bothAnsweredSimultaneously', handleBothAnswered);
      socket.off('answerSubmitted', handleAnswerSubmitted);
      socket.off('answerResult', handleAnswerResult);
      socket.off('answerTimeout', handleAnswerTimeout);
      socket.off('newRoundStarted', handleNewRound);
    };
  }, [socket, currentUserId, router, league]);

  // Fetch all players for autocomplete when page loads
  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/leagues/all-players`);
        const data = await response.json();
        if (data?.players && Array.isArray(data.players)) {
          console.log(`🎯 Loaded ${data.players.length} players for autocomplete`);
          setAllPlayers(data.players);
        }
      } catch (err) {
        console.error('Error fetching all players:', err);
        setAllPlayers([]);
      }
    };

    fetchAllPlayers();
  }, []);

  // Fetch valid players when in answering phase (for logging)
  useEffect(() => {
    const currentGamePhase = currentRoom?.gameState?.gamePhase || 'lobby';
    if ((currentGamePhase as any) === 'answering' && team1 && team2) {
      const fetchValidPlayers = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/leagues/valid-players`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ team1, team2 }),
          });
          const data = await response.json();
          if (data?.players && Array.isArray(data.players)) {
            console.log(`🎯 Correct answers (any of these):`, data.players.join(', '));
            setValidPlayers(data.players);
          }
        } catch (err) {
          console.error('Error fetching valid players:', err);
          setValidPlayers([]);
        }
      };
      
      const timeout = setTimeout(() => {
        fetchValidPlayers();
      }, 500);
      
      return () => clearTimeout(timeout);
    } else {
      // Clear valid players when not in answering phase
      setValidPlayers([]);
    }
  }, [team1, team2, gamePhase, currentRoom?.gameState?.gamePhase]);

  // Clear suggestions when not in answering phase
  useEffect(() => {
    const currentGamePhase = currentRoom?.gameState?.gamePhase || 'lobby';
    if ((currentGamePhase as any) !== 'answering') {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [gamePhase]);

  // Real-time suggestions as user types
  useEffect(() => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTerm = input.toLowerCase().trim();
    
    // Filter players for suggestions (from all players, not just valid ones)
    const filteredSuggestions = allPlayers
      .filter((playerName: string) => {
        return playerName.toLowerCase().includes(searchTerm);
      })
      .slice(0, 8) // Limit to 8 suggestions for better UX
      .sort((a: string, b: string) => {
        // Sort by relevance (exact matches first, then starts with, then contains)
        const aName = a.toLowerCase();
        const bName = b.toLowerCase();
        
        if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
        if (!aName.startsWith(searchTerm) && bName.startsWith(searchTerm)) return 1;
        if (aName === searchTerm && bName !== searchTerm) return -1;
        if (aName !== searchTerm && bName === searchTerm) return 1;
        
        return aName.localeCompare(bName);
      });

    setSuggestions(filteredSuggestions);
    setShowSuggestions(filteredSuggestions.length > 0);
      }, [input, allPlayers]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Redirect if not in answering phase
  useEffect(() => {
    if (isFinished) return;
    if (currentRoom && currentRoom.status === 'waiting' && !currentRoom.gameState) return;
    
    const currentGamePhase = currentRoom?.gameState?.gamePhase || 'lobby';
    if (currentGamePhase === 'team-selection' || (currentGamePhase as any) === 'team-reveal') {
      router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&multiplayer=true`);
    }
  }, [gamePhase, router, league, isFinished, currentRoom?.status, currentRoom?.gameState]);

  const handleSuggestionSelect = async (playerName: string) => {
    if (hasSubmittedAnswer) return;
    if (!team1 || !team2) return;
    if (!playerName.trim()) return;
    
    // Set input and close dropdown
    setInput(playerName);
    setShowSuggestions(false);
    
    // Submit the answer immediately
    setHasSubmittedAnswer(true);
    await submitTeamAnswer(playerName.trim());
    setInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmittedAnswer) return;
    if (!team1 || !team2) return;
    if (!input.trim()) return;
    
    setHasSubmittedAnswer(true);
    setShowSuggestions(false);
    await submitTeamAnswer(input.trim());
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
  if (isFinished && !showInactivityWinModal && !showInactivityDrawModal) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-gradient-to-b from-[#111827] to-black">
        <h2 className="text-2xl font-bold">🎉 Game Over</h2>
        
        {/* Winner Display */}
        <div className="text-center">
          {isDraw ? (
            <>
              <div className="text-6xl mb-4">🤝</div>
              <p className="text-lg text-white/80">
                Game Drawed
              </p>
              <p className="text-sm text-white/60 mt-1">
                Both players failed to select a team
              </p>
            </>
          ) : (
            <>
              <p className="text-lg text-white/80">
                {winnerUserId === currentUserId ? 
                  (wonByDisconnect 
                    ? '🏆 Congratulations! You won due to other player disconnecting mid game!' 
                    : '🏆 Congratulations! You won!') : 
                  `🏆 Winner: ${winnerName || 'Unknown'}`
                }
              </p>
              {scores && winnerUserId && (
                <p className="text-sm text-white/60 mt-1">
                  Final Score: {scores[winnerUserId] || 0} points
                </p>
              )}
            </>
          )}
        </div>

        {/* Final Scores */}
        {scores && Object.keys(scores).length > 0 && !isDraw && (
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
            <div className="text-xs mt-2 opacity-80">
              Enter a player name that belongs to both teams!
            </div>
          </div>
        )}

        {/* Both teams */}
        <div className="mb-4 divide-y divide-white/10">
          <div className="py-2 px-4 font-semibold text-white/90">{team1 || 'Team A'}</div>
          <div className="py-2 px-4 font-semibold text-white/90">{team2 || 'Team B'}</div>
        </div>

        {/* Opponent answer feedback */}
        {opponentAnswer && (
          <div className={`mb-4 p-3 rounded-md text-center ${
            opponentAnswer.correct 
              ? 'bg-green-500/20 border border-green-500/40 text-green-400' 
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}>
            <div className="font-bold">
              {opponentAnswer.correct ? '✅' : '❌'} {opponentAnswer.username} answered: {opponentAnswer.playerName}
            </div>
            {opponentAnswer.correct && (
              <div className="text-xs mt-1">Correct! +1 point</div>
            )}
          </div>
        )}

        {/* Answer input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={hasSubmittedAnswer ? "Answer submitted, waiting..." : "Enter player name..."}
              value={input}
              onChange={e => {
                if (!hasSubmittedAnswer && !isFinished) {
                  setInput(e.target.value);
                }
              }}
              onFocus={() => {
                if (input.length >= 2 && suggestions.length > 0 && !hasSubmittedAnswer && !isFinished) {
                  setShowSuggestions(true);
                }
              }}
              className={`bg-[#111827] border rounded px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 w-full ${
                hasSubmittedAnswer || isFinished
                  ? 'border-white/10 opacity-50 cursor-not-allowed bg-[#0a0a0f]'
                  : 'border-white/20 focus:ring-accent'
              }`}
              disabled={hasSubmittedAnswer || isFinished}
              readOnly={hasSubmittedAnswer || isFinished}
            />
            
            {/* Autocomplete suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && !hasSubmittedAnswer && !isFinished && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 bg-[#1a1e2d] border-2 border-blue-500/50 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto mt-1"
              >
                {suggestions.map((playerName, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-blue-500/20 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                    onClick={() => handleSuggestionSelect(playerName)}
                  >
                    <div className="font-medium text-white">{playerName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {hasSubmittedAnswer && !isFinished && (
            <div className="text-xs text-yellow-400 text-center -mt-2">
              ⏳ Waiting for opponent or timer to expire...
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent/80 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent"
            disabled={hasSubmittedAnswer || !input.trim() || isFinished}
          >
            Submit
          </button>
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

        {/* New Game Button */}
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

      {/* Wrong Answer Modal */}
      {showWrongAnswerModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
          <div className="bg-[#262346] rounded-xl p-8 max-w-md w-full mx-4 text-white text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold mb-4">Wrong Answer</h2>
            <p className="text-white/80">Your answer was wrong. Timer continues...</p>
          </div>
        </div>
      )}

      {/* Both Answered Simultaneously Modal */}
      {showBothAnsweredModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
          <div className="bg-[#262346] rounded-xl p-8 max-w-md w-full mx-4 text-white text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-4">Both Players Answered Simultaneously</h2>
            <p className="text-white/80 mb-4">No point awarded to anyone.</p>
            <p className="text-sm text-white/60">Starting next round...</p>
          </div>
        </div>
      )}

      {/* Inactivity Win Modal */}
      {showInactivityWinModal && inactivityData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
          <div className="bg-[#262346] rounded-xl p-8 max-w-md w-full mx-4 text-white text-center">
            {inactivityData.winner === currentUserId ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold mb-4">You Won!</h2>
                <p className="text-white/80 mb-2">
                  {inactivityData.inactivePlayerUsername} failed to select a team.
                </p>
                <p className="text-sm text-white/60">
                  You have been declared the winner!
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold mb-4">Game Ended</h2>
                <p className="text-white/80 mb-2">
                  You failed to select a team.
                </p>
                <p className="text-white/80 mb-2">
                  {inactivityData.winnerUsername} has been declared the winner.
                </p>
                <p className="text-sm text-white/60">
                  Redirecting to home...
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Inactivity Draw Modal */}
      {showInactivityDrawModal && inactivityData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
          <div className="bg-[#262346] rounded-xl p-8 max-w-md w-full mx-4 text-white text-center">
            <div className="text-6xl mb-4">🤝</div>
            <h2 className="text-2xl font-bold mb-4">Game Drawed</h2>
            <p className="text-white/80 mb-2">
              Both players failed to select a team.
            </p>
            <p className="text-white/80 mb-2">
              The game has been declared a draw.
            </p>
            <p className="text-sm text-white/60">
              Redirecting to home...
            </p>
          </div>
        </div>
      )}
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