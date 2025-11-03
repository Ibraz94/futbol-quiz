'use client'

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../lib/config";
import { useMultiplayer, MultiplayerProvider } from '../../lib/multiplayer-context';

interface TeamGameState {
  league: string;
  teams: string[];
  selectedTeams: string[];
  currentTeamIndex: number;
  scores: Record<string, number>;
  gamePhase: 'lobby' | 'team-selection' | 'playing' | 'finished';
  winner?: string;
}

const TeamGame: React.FC = () => {
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
    resetGame: multiplayerResetGame
  } = multiplayer;

  const [leagues, setLeagues] = useState<string[]>([]);
  const [leagueTeamCounts, setLeagueTeamCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState<boolean>(false);
  const [isResettingGame, setIsResettingGame] = useState<boolean>(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState<boolean>(false);
  const [isStartingNewGameFromWinner, setIsStartingNewGameFromWinner] = useState<boolean>(false);
  const router = useRouter();

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

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_BASE_URL}/leagues`);
        const leagueList = res.data.leagues || [];
        setLeagues(leagueList);
        // Fetch team counts for each league
        const counts: Record<string, number> = {};
        await Promise.all(
          leagueList.map(async (league: string) => {
            const teamRes = await axios.get(`${API_BASE_URL}/leagues/${encodeURIComponent(league)}/teams`);
            counts[league] = (teamRes.data.teams || []).length;
          })
        );
        setLeagueTeamCounts(counts);
      } catch (err: any) {
        setError("Failed to fetch leagues");
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, []);

  const handleLeagueSelect = async (league: string) => {
    if (!isAuthenticated) {
      setError('Please log in to play multiplayer team games');
      return;
    }

    if (!isConnected) {
      setError('Connecting to server...');
      return;
    }

    try {
      setSelectedLeague(league);
      // Pass league parameter to joinLobby
      await joinLobby(authenticatedUserId || '', inputUsername, league);
    } catch (error) {
      console.error('Failed to join lobby:', error);
      setError('Failed to join lobby. Please try again.');
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

  const startNewGame = async (): Promise<void> => {
    if (isResettingGame) return;
    
    console.log('🔄 Starting new game - returning to lobby...');
    setIsResettingGame(true);
    
    try {
      if (currentRoom) {
        console.log('🔄 Requesting game reset from server...');
        await multiplayerResetGame();
        console.log('✅ Game state reset, returning to lobby');
        
        setSelectedLeague(null);
      }
    } catch (error) {
      console.error('❌ Error resetting game:', error);
    } finally {
      setIsResettingGame(false);
    }
  };

  // Log and navigate when server moves room to playing - use ref to prevent multiple navigations
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (currentRoom?.status === 'playing' && !hasNavigatedRef.current) {
      const leagueFromState = (currentRoom.gameState as any)?.league;
      if (leagueFromState) {
        hasNavigatedRef.current = true;
        router.push(`/teamgame/teams?league=${encodeURIComponent(leagueFromState)}&multiplayer=true`);
      }
    }
    // Reset navigation flag if status changes back to waiting
    if (currentRoom?.status !== 'playing') {
      hasNavigatedRef.current = false;
    }
  }, [currentRoom?.status, (currentRoom?.gameState as any)?.league, router]);

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
            You need to be logged in to play multiplayer team games.
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

  // Multiplayer lobby UI
  const shouldShowLobby = !isConnected || !currentRoom || currentRoom.status === 'waiting' || currentRoom.status === 'starting';
  
  if (shouldShowLobby) {
  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] p-6 relative">
        {/* Loading overlay when starting game */}
        {(isStartingGame || currentRoom?.status === 'starting') && (
          <div className="absolute inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Starting Game...</h2>
              <p className="text-lg text-white/80">Loading teams for {selectedLeague}</p>
              <p className="text-sm text-white/60 mt-2">This may take a few moments</p>
            </div>
          </div>
        )}
        
        <div className="bg-[#262346] rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-[#ffd600] mb-6 text-center">⚽ Team Game Lobby</h2>
          
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
              
                    <div>
                <label className="block text-white text-sm mb-2">Select League</label>
                {loading && <p className="text-white/70 text-sm">Loading leagues...</p>}
                {error && <p className="text-red-400 text-sm">{error}</p>}
                {!loading && !error && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {leagues.map((league) => (
                      <button
                        key={league}
                        onClick={() => handleLeagueSelect(league)}
                        disabled={!inputUsername || !authenticatedUserId}
                        className="w-full p-3 rounded-md bg-[#1e2033] hover:bg-[#2a2f4a] text-white text-left disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
                      >
                        <span>{league}</span>
                        <span className="text-xs text-white/60">
                          {leagueTeamCounts[league] || 0} teams
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {currentRoom && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-white/70 text-sm">League: <span className="text-[#ffd600] font-mono">{selectedLeague}</span></p>
                <p className="text-white/70 text-sm">Room ID: <span className="text-[#ffd600] font-mono">{currentRoom.roomId}</span></p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-white/70 text-sm">Players: {currentRoom.players.length}/4</p>
                  {currentRoom.players.length >= 4 && (
                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      FULL
                    </span>
                  )}
                </div>
                
                {currentRoom.players.length === 1 && (
                  <p className="text-[#ffd600] text-sm font-medium mt-2">🎯 You are the host! Wait for other players to join.</p>
                )}
                {currentRoom.players.length >= 4 && (
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

  // If playing, show a neutral loading placeholder while navigation effect runs
  if (currentRoom?.status === 'playing') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Preparing Team Selection...</h2>
          <p className="text-lg text-white/80">Syncing with server</p>
      </div>
    </div>
  );
}

  return null;
};

// Wrapper component with MultiplayerProvider
const TeamGameWithProvider: React.FC = () => {
  return (
    <MultiplayerProvider namespace="/team-multiplayer">
      <TeamGame />
    </MultiplayerProvider>
  );
};

export default TeamGameWithProvider;