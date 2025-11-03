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
    
    socket.on('gameReset', handleGameReset);
    
    return () => {
      socket.off('gameReset', handleGameReset);
    };
  }, [socket]);

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

  const teams = currentRoom?.gameState?.teams || [];
  const playerSelections = currentRoom?.gameState?.playerSelections || {} as Record<string,string[]>;
  const mySelectedCount = currentUserId ? (playerSelections[currentUserId]?.length || 0) : 0;
  const turnPhase = (currentRoom?.gameState as any)?.turnPhase;
  const inSelection = turnPhase === "team-selection";
  const currentTurnUserId = currentRoom?.currentTurnUserId || null;
  const isMyTurn = !!currentUserId && currentTurnUserId === currentUserId;
  const isFinished = currentRoom?.status === 'finished' || currentRoom?.gameState?.gamePhase === 'finished';

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
  
  
  // When current player's turn moves to answer phase, go to play page
  // BUT: Never redirect if game is finished or if game was reset (status is waiting)
  useEffect(() => {
    // IMPORTANT: Don't navigate if game is finished - full screen game over will show instead
    if (isFinished) {
      return;
    }
    
    // IMPORTANT: Don't navigate if game was reset (status is 'waiting' and no gameState)
    // This prevents navigation conflicts when reset happens
    if (currentRoom && currentRoom.status === 'waiting' && !currentRoom.gameState) {
      return;
    }
    
    const isMyTurnCheck = currentTurnUserId === currentUserId;
    // Navigate to play page when it's my turn and turn phase is 'playing' (answer phase)
    // Only if game is NOT finished and NOT reset
    if (isMyTurnCheck && turnPhase === "playing" && !isFinished) {
      router.push(`/teamgame/play?league=${encodeURIComponent(league)}&multiplayer=true`);
    }
  }, [turnPhase, currentTurnUserId, currentUserId, router, league, isFinished, currentRoom?.status, currentRoom?.gameState]);
  const currentTurnUsername = currentRoom?.players.find(p => p.userId === currentTurnUserId)?.username || '';
  const timer = currentRoom?.gameState?.timer ?? undefined;
  const scores = currentRoom?.gameState?.scores || {};
  const [isResettingGame, setIsResettingGame] = useState<boolean>(false);
  const [isStartingNewGameFromWinner, setIsStartingNewGameFromWinner] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);

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
      console.error('[TeamsPage] Cannot select: not in team-selection phase', { turnPhase, inSelection });
      return;
    }
    if (!isMyTurn) {
      console.error('[TeamsPage] Cannot select: not your turn', { 
        currentTurnUserId, 
        currentUserId,
        currentTurnUsername 
      });
      return;
    }
    // Check only if current player has already picked this team (not global locking)
    const mySelections = currentUserId ? (playerSelections[currentUserId] || []) : [];
    if (mySelections.includes(team)) {
      console.error('[TeamsPage] Cannot select: already picked this team', { team, mySelections });
      return;
    }
    if (mySelectedCount >= 2) {
      console.error('[TeamsPage] Cannot select: already picked 2 teams', { mySelectedCount, mySelections });
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
            {/* Turn indicator */}
            {inSelection && (
              <>
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
                    {isMyTurn && timer !== undefined && (
                      <div className="text-xs mt-2 opacity-80">
                        Select 2 teams before time runs out!
      </div>
                    )}
                    {timer === undefined && (
                      <div className="text-xs mt-2 opacity-80">
                        Timer starting...
            </div>
          )}
        </div>
                )}
              </>
            )}

            {teams.length === 0 && (
              <div className="text-center py-6 text-white/60">Loading teams...</div>
            )}

            {teams.length > 0 && (
              <>
                {!isMyTurn && inSelection && (
                  <div className="mb-4 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-center">
                    <div className="text-xs text-yellow-400">
                      ⏳ Waiting for {currentTurnUsername}'s turn to select teams...
                    </div>
                  </div>
                )}
                <div className="divide-y divide-white/10">
                  {teams.map((team: string) => {
                    // Check only if current turn player has picked this team (no global locking)
                    const currentTurnSelections = currentTurnUserId ? (playerSelections[currentTurnUserId] || []) : [];
                    const isPickedByCurrentTurnPlayer = currentTurnSelections.includes(team);
                    // Only show "Picked by" for current turn player's selections
                    const pickedByName = isPickedByCurrentTurnPlayer && currentTurnUsername ? currentTurnUsername : null;
                    // For selection, check if current player (me) has picked this team
                    const mySelections = currentUserId ? (playerSelections[currentUserId] || []) : [];
                    const isPickedByMe = mySelections.includes(team);
                    const canSelect = inSelection && isMyTurn && mySelectedCount < 2 && !isPickedByMe;
            return (
                      <div
                key={team}
                        className={`py-2 px-4 transition rounded text-white/90 ${
                          isPickedByMe 
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
                          {pickedByName && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80">Picked by {pickedByName}</span>
                          )}
                        </div>
                      </div>
            );
          })}
        </div>
              </>
            )}

            <div className="mt-4 text-xs text-white/60 flex items-center justify-between">
              <span>Phase: {turnPhase || "-"}</span>
              <span>Your selections: {mySelectedCount}/2</span>
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


