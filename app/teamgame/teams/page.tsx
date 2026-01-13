"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MultiplayerProvider, useMultiplayer } from "../../../lib/multiplayer-context";

function TeamsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const league = searchParams?.get("league") || "";
  const mountRef = useRef(0);

  // Track component mount/unmount
  useEffect(() => {
    mountRef.current += 1;
  }, []);

  const { 
    isConnected, 
    currentRoom, 
    currentUserId, 
    selectTeam,
    resetGame: multiplayerResetGame,
    leaveRoom,
    socket,
  } = useMultiplayer();

  // CRITICAL: Listen for gameReset event FIRST - before ANY other logic
  // This MUST work even when showing game over screen, so it's at the very top
  useEffect(() => {
    if (!socket) return;
    
    const handleGameReset = (data: any) => {
      console.log('🔄 [TeamsPage] gameReset event received, redirecting to lobby...', data);
      // Use window.location for immediate hard redirect - cannot be overridden
      // This ensures redirect happens even if component is showing game over screen
      window.location.href = '/teamgame';
    };
    
    const handleGameWonInactivity = async (data: any) => {
      console.log('🏆 [TeamsPage] Game won due to inactivity', data);
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
      console.log('🤝 [TeamsPage] Game drawed due to inactivity', data);
      console.log('🤝 [TeamsPage] Setting showInactivityDrawModal to true');
      setInactivityData(data);
      setShowInactivityDrawModal(true);
      console.log('🤝 [TeamsPage] Modal state should be set now');
      
      // Both players - leave room and redirect to home after modal
      setTimeout(async () => {
        console.log('🤝 [TeamsPage] Redirecting to home after modal');
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

  // Listen for opponent disconnect event
  useEffect(() => {
    const handleOpponentDisconnected = (event: CustomEvent) => {
      const { disconnectedPlayer, winner } = event.detail;
      const isMe = winner === currentUserId;
      if (isMe) {
        setWonByDisconnect(true);
      }
    };

    window.addEventListener('opponentDisconnected', handleOpponentDisconnected as EventListener);
    return () => window.removeEventListener('opponentDisconnected', handleOpponentDisconnected as EventListener);
  }, [currentUserId]);

  // Track currentRoom changes
  useEffect(() => {
    // Room state updated
  }, [currentRoom]);

  // Track isConnected changes
  useEffect(() => {
    // Connection state updated
  }, [isConnected]);

  // Redirect back if no league param
  useEffect(() => {
    if (!league) {
      router.push("/teamgame");
    }
  }, [league, router]);

  // Get player's teams (5 teams per player)
  const gameState = currentRoom?.gameState as any;
  const playerTeams = gameState?.playerTeams || {};
  const myTeams = currentUserId ? (playerTeams[currentUserId] || []) : [];
  const selectedTeam = gameState?.selectedTeam || {};
  const mySelectedTeam = currentUserId ? (selectedTeam[currentUserId] || null) : null;
  const gamePhase = gameState?.gamePhase || 'lobby';
  const inSelection = gamePhase === 'team-selection';
  const isFinished = currentRoom?.status === 'finished' || gamePhase === 'finished';
  const [showTeamRevealModal, setShowTeamRevealModal] = useState(false);
  const [revealedTeams, setRevealedTeams] = useState<{ team1: string; team2: string; player1Name: string; player2Name: string } | null>(null);
  const [showInactivityWinModal, setShowInactivityWinModal] = useState(false);
  const [showInactivityDrawModal, setShowInactivityDrawModal] = useState(false);
  const [inactivityData, setInactivityData] = useState<any>(null);
  const [isNavigatingToPlay, setIsNavigatingToPlay] = useState(false);

  // Debug: Log when modal state changes
  useEffect(() => {
    if (showInactivityDrawModal) {
      console.log('✅ [TeamsPage] showInactivityDrawModal is TRUE - modal should be visible');
    }
  }, [showInactivityDrawModal]);

  // Also redirect when room status changes to 'waiting' with no gameState (backup check)
  useEffect(() => {
    // If status is 'waiting' and gameState is cleared, that means game was reset
    // Check regardless of isFinished state - if reset happened, we should go to lobby
    // Skip if we're on the game over screen and haven't received reset yet (wait for event)
    if (currentRoom && currentRoom.status === 'waiting' && !currentRoom.gameState && !isFinished) {
      // Game was reset - redirect to lobby
      console.log('🔄 [TeamsPage] Game reset detected (status check), redirecting to lobby...');
      setTimeout(() => {
        window.location.href = '/teamgame';
      }, 100);
    }
  }, [currentRoom?.status, currentRoom?.gameState, isFinished]);
  
  // Debug: Log game finished state
  useEffect(() => {
    if (currentRoom) {
    }
  }, [currentRoom, isFinished]);

  // Listen for teams revealed event
  useEffect(() => {
    if (!socket) return;
    
    const handleTeamsRevealed = (data: any) => {
      setRevealedTeams({
        team1: data.team1,
        team2: data.team2,
        player1Name: data.player1Name,
        player2Name: data.player2Name,
      });
      setShowTeamRevealModal(true);
      // Set navigating flag immediately to prevent team selection screen from showing
      setIsNavigatingToPlay(true);
    };
    
    socket.on('teamsRevealed', handleTeamsRevealed);
    
    return () => {
      socket.off('teamsRevealed', handleTeamsRevealed);
    };
  }, [socket]);

  // Navigate to play page when game phase changes to answering
  // Keep modal open during navigation to prevent flashing team selection screen
  useEffect(() => {
    if (isFinished) return;
    if (currentRoom && currentRoom.status === 'waiting' && !currentRoom.gameState) return;
    
    const currentGamePhase = gameState?.gamePhase || 'lobby';
    if ((currentGamePhase as any) === 'answering' && showTeamRevealModal) {
      // Modal is already open from teamsRevealed event, navigate to play screen
      // Small delay to ensure modal is visible, then navigate
      setTimeout(() => {
        router.push(`/teamgame/play?league=${encodeURIComponent(league)}&multiplayer=true`);
      }, 100);
    } else if ((currentGamePhase as any) === 'answering' && !showTeamRevealModal) {
      // Phase changed to answering but modal not shown yet - show modal first, then navigate
      setIsNavigatingToPlay(true);
      // Wait a bit for modal to appear, then navigate
      setTimeout(() => {
        router.push(`/teamgame/play?league=${encodeURIComponent(league)}&multiplayer=true`);
      }, 200);
    }
  }, [gamePhase, router, league, isFinished, currentRoom?.status, currentRoom?.gameState, showTeamRevealModal, gameState]);
  const timer = currentRoom?.gameState?.timer ?? undefined;
  const scores = currentRoom?.gameState?.scores || {};
  const [isResettingGame, setIsResettingGame] = useState<boolean>(false);
  const [isStartingNewGameFromWinner, setIsStartingNewGameFromWinner] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const [wonByDisconnect, setWonByDisconnect] = useState<boolean>(false);

  // Handler functions for winner modal
  const startNewGame = async (): Promise<void> => {
    if (isResettingGame) return;
    
    console.log('🔄 Starting new game - returning to lobby...');
    setIsResettingGame(true);
    
    try {
      if (currentRoom) {
        console.log('🔄 Requesting game reset from server...');
        await multiplayerResetGame();
        console.log('✅ Game state reset, returning to lobby');
        
        // Navigate back to team game lobby (league selection page)
        router.push('/teamgame');
      }
    } catch (error) {
      console.error('❌ Error resetting game:', error);
    } finally {
      setIsResettingGame(false);
    }
  };

  // Debug timer value

  const handleSelect = async (team: string) => {
    if (!inSelection) {
      console.error('[TeamsPage] Cannot select: not in team-selection phase');
      return;
    }
    if (mySelectedTeam) {
      console.error('[TeamsPage] Cannot select: already selected a team');
      return;
    }
    if (!myTeams.includes(team)) {
      console.error('[TeamsPage] Cannot select: team not in your list');
      return;
    }
    try {
      await selectTeam(team);
    } catch (e) {
      console.error('[TeamsPage] Error selecting team:', e);
    }
  };

  // Get winner info for modal
  const winnerUserId = currentRoom?.gameState?.winner;
  const winnerName = winnerUserId ? (currentRoom?.players.find(p => p.userId === winnerUserId)?.username || 'Winner') : '';
  const isDraw = isFinished && (winnerUserId === null || winnerUserId === undefined); // Draw when finished but no winner

  // Show inactivity modals first (they take priority over game over screen)
  // Show full screen game over (like Bingo/Quiz) when game is finished (but not if modals are showing)
  if (isFinished && !showInactivityWinModal && !showInactivityDrawModal) {
    return (
      <>
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

      {/* Inactivity modals - render even on game over screen */}
      {showInactivityWinModal && inactivityData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-[100]">
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

      {showInactivityDrawModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-[100]">
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
      </>
    );
  }

  // Regular game UI (team selection)
  // Don't show team selection screen if modal is open and we're navigating to play screen
  if (showTeamRevealModal && isNavigatingToPlay) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#111827] to-black">
        {/* Keep modal visible during navigation */}
        {showTeamRevealModal && revealedTeams && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
            <div className="bg-[#262346] rounded-xl p-8 max-w-md w-full mx-4 text-white">
              <h2 className="text-2xl font-bold mb-6 text-center">Teams Selected!</h2>
              <div className="space-y-4">
                <div className="bg-[#1e2033] rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">You selected:</p>
                  <p className="text-lg font-semibold text-[#ffd600]">
                    {revealedTeams.player1Name === currentRoom?.players.find(p => p.userId === currentUserId)?.username 
                      ? revealedTeams.team1 
                      : revealedTeams.team2}
                  </p>
                </div>
                <div className="bg-[#1e2033] rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Opponent selected:</p>
                  <p className="text-lg font-semibold text-cyan-400">
                    {revealedTeams.player1Name === currentRoom?.players.find(p => p.userId === currentUserId)?.username 
                      ? revealedTeams.team2 
                      : revealedTeams.team1}
                  </p>
                </div>
                <p className="text-center text-white/80 mt-4">
                  Loading player guess screen...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#111827] to-black">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#23233a] border border-white/10 text-white shadow-lg mt-5">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg text-white/80">Team Selection</div>
          <div className="text-xs text-white/60">League: {league || "-"}</div>
        </div>

        {!isConnected && (
          <div className="text-center py-6 text-white/60">Connecting...</div>
        )}

        {isConnected && !currentRoom && (
          <div className="text-center py-6 text-white/60">
            Not in a room. Go back to the lobby.
          </div>
        )}

        {isConnected && currentRoom && (
          <>
            {/* Timer countdown for simultaneous selection */}
            {inSelection && (
              <div className={`w-full mb-4 p-4 rounded-lg border-2 text-center transition-all ${
                timer !== undefined && timer <= 3 
                  ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                  : timer !== undefined && timer <= 5 
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' 
                    : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">⏱️</span>
                  <span className="text-3xl font-bold">
                    {timer !== undefined ? timer : '-'}
                  </span>
                  <span className="text-sm opacity-80">seconds remaining</span>
                </div>
                {timer !== undefined && (
                  <div className="text-xs mt-2 opacity-80">
                    Select 1 team from your list!
                  </div>
                )}
                {timer === undefined && (
                  <div className="text-xs mt-2 opacity-80">
                    Timer starting...
                  </div>
                )}
              </div>
            )}

            {inSelection && myTeams.length === 0 && (
              <div className="text-center py-6 text-white/60">Loading your teams...</div>
            )}

            {inSelection && myTeams.length > 0 && (
              <>
                {mySelectedTeam && (
                  <div className="mb-4 p-3 rounded-md bg-green-500/20 border border-green-500/30 text-center">
                    <div className="text-sm text-green-400">
                      ✅ You selected: <strong>{mySelectedTeam}</strong>
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      Waiting for opponent to select...
                    </div>
                  </div>
                )}
                <div className="divide-y divide-white/10">
                  {myTeams.map((team: string) => {
                    const isSelected = mySelectedTeam === team;
                    const canSelect = inSelection && !mySelectedTeam && !isSelected;
                    return (
                      <div
                        key={team}
                        className={`py-2 px-4 transition rounded text-white/90 ${
                          isSelected 
                            ? "bg-accent text-white font-bold" 
                            : canSelect 
                              ? "hover:bg-white/10 cursor-pointer" 
                              : "opacity-50 cursor-not-allowed bg-[#1a1a2e]"
                        }`}
                        onClick={() => {
                          if (canSelect) {
                            handleSelect(team);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && canSelect) {
                            handleSelect(team);
                          }
                        }}
                        role="button"
                        tabIndex={canSelect ? 0 : -1}
                        aria-disabled={!canSelect}
                      >
                        <div className="flex items-center justify-between">
                          <span>{team}</span>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80">Selected</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {(gamePhase as any) === 'team-reveal' && (
              <div className="text-center py-6 text-white/60">
                Revealing teams...
              </div>
            )}

            <div className="mt-4 text-xs text-white/60 flex items-center justify-between">
              <span>Phase: {gamePhase || "-"}</span>
              <span>Round: {gameState?.roundNumber || 1}</span>
            </div>

            {/* Scores Display */}
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
          </>
        )}
      </div>

      {/* Team Reveal Modal */}
      {showTeamRevealModal && revealedTeams && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-50">
          <div className="bg-[#262346] rounded-xl p-8 max-w-md w-full mx-4 text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">Teams Selected!</h2>
            <div className="space-y-4">
              <div className="bg-[#1e2033] rounded-lg p-4">
                <p className="text-sm text-white/60 mb-1">You selected:</p>
                <p className="text-lg font-semibold text-[#ffd600]">
                  {revealedTeams.player1Name === currentRoom?.players.find(p => p.userId === currentUserId)?.username 
                    ? revealedTeams.team1 
                    : revealedTeams.team2}
                </p>
              </div>
              <div className="bg-[#1e2033] rounded-lg p-4">
                <p className="text-sm text-white/60 mb-1">Opponent selected:</p>
                <p className="text-lg font-semibold text-cyan-400">
                  {revealedTeams.player1Name === currentRoom?.players.find(p => p.userId === currentUserId)?.username 
                    ? revealedTeams.team2 
                    : revealedTeams.team1}
                </p>
              </div>
              <p className="text-center text-white/80 mt-4">
                Get ready to guess a player who played for both teams!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inactivity Win Modal */}
      {showInactivityWinModal && inactivityData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-[100]">
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

      {/* Inactivity Draw Modal - Show even when game is finished, high z-index to overlay everything */}
      {showInactivityDrawModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md z-[100]">
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

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <MultiplayerProvider namespace="/team-multiplayer">
        <TeamsPageContent />
      </MultiplayerProvider>
    </Suspense>
  );
}


