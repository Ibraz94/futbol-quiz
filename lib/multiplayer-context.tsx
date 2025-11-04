'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from './config';

export interface Player {
  userId: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  joinedAt: Date;
}

export interface GameState {
  grid: any[][];
  currentPlayerIndex: number;
  currentGamePlayerIndex: number;
  remainingPlayers: number;
  gamePhase: 'lobby' | 'team-selection' | 'playing' | 'finished';
  winner?: string;
  lockedCells: string[];
  turnPhase: 'waiting' | 'playing' | 'transitioning';
  turnStartTime?: number;
  gameData?: {
    grid: any[][];
    players: {
      playerId: string;
      playerName: string;
      matchCount: number;
      matchingCategories: string[];
    }[];
  };
  startTime?: Date;
  endTime?: Date;
  gameStartTime?: Date;
  currentQuestion?: any;
  availablePlayers?: any[];
  playerData: Record<string, {
    userId: string;
    username: string;
    playerName: string;
    matchCount: number;
    matchingCategories: string[];
    score: number;
    cellsLocked: number;
    winType?: string;
    isWinner: boolean;
    wildcardUsed: boolean;
    gameStartTime?: Date;
  }>;
  // Quiz game specific properties
  players?: any[];
  scores?: Record<string, number>;
  series?: Record<string, number>;
  timer?: number;
  currentQuestionIndex?: number;
  // Team game specific properties
  teams?: string[];
  selectedTeams?: string[];
  playerSelections?: Record<string, string[]>;
}

export interface Room {
  roomId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  currentTurnUserId?: string | null;
  gameState?: GameState;
  chatMessages: any[];
}

interface MultiplayerContextType {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: Room | null;
  currentUserId: string | null;
  currentUsername: string | null;
  
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  
  // Room methods
  joinLobby: (userId: string, username: string, league?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  forceLeaveRoom: () => Promise<void>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  
  // Game methods
  clickCell: (cellId: string) => Promise<void>;
  useWildcard: () => Promise<void>;
  skipTurn: () => Promise<void>;
  selectTeam: (team: string) => Promise<void>;
  resetGame: () => Promise<void>;
  
  // Quiz game methods
  submitAnswer: (answer: string) => Promise<void>;
  skipQuestion: () => Promise<void>;
  // Team game methods
  submitTeamAnswer: (playerName: string, team1: string, team2: string) => Promise<void>;
  
  // TicTacToe game methods
  clickTictactoeCell: (row: number, col: number) => Promise<void>;
  submitTictactoeAnswer: (playerName: string, row: number, col: number) => Promise<void>;
  
  // Chat methods
  sendMessage: (message: string) => void;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};

interface MultiplayerProviderProps {
  children: React.ReactNode;
  namespace?: string;
}

// Global socket registry (persists across page navigations within the same tab)
const globalSockets: Record<string, Socket | null> = (globalThis as any).__mp_sockets || ((globalThis as any).__mp_sockets = {});

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({ children, namespace = '/bingo-multiplayer' }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoomState] = useState<Room | null>(null);
  const setCurrentRoomRef = useRef<((updater: Room | null | ((prev: Room | null) => Room | null)) => void) | null>(null);
  
  // Wrapper to prevent unnecessary updates
  const setCurrentRoom = React.useCallback((updater: Room | null | ((prev: Room | null) => Room | null)) => {
    setCurrentRoomState(prevRoom => {
      const nextRoom = typeof updater === 'function' ? updater(prevRoom) : updater;
      if (nextRoom === prevRoom) {
        return prevRoom;
      }
      const prevStr = prevRoom ? JSON.stringify(prevRoom) : null;
      const nextStr = nextRoom ? JSON.stringify(nextRoom) : null;
      if (prevStr === nextStr) {
        return prevRoom;
      }
      return nextRoom;
    });
  }, [namespace]);
  setCurrentRoomRef.current = setCurrentRoom;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  
  // Debug component mount
  useEffect(() => {
  }, []);
  
  // Debug currentUserId changes and update ref
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const manualDisconnectRef = useRef<boolean>(false);

  // Restore identity across page loads
  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem('mp_userId');
      const storedUsername = localStorage.getItem('mp_username');
      if (storedUserId && !currentUserId) setCurrentUserId(storedUserId);
      if (storedUsername && !currentUsername) setCurrentUsername(storedUsername);
    } catch {}
  }, []);

  // Separate function to attach timerUpdate listener (since it needs special handling)
  const attachTimerUpdateListener = useCallback((sock: Socket) => {
    // Remove any existing timerUpdate listener first
    sock.off('timerUpdate');
    
    sock.on('timerUpdate', (data) => {
      // Update room state with timer - prefer full room data, otherwise merge timer
      setCurrentRoom(prevRoom => {
        if (data.room) {
          // Ensure timer is set correctly - prefer timeRemaining if room timer is missing
          if (data.timeRemaining !== undefined && (!data.room.gameState || data.room.gameState.timer === undefined)) {
            return {
              ...data.room,
              gameState: {
                ...data.room.gameState,
                timer: data.timeRemaining
              }
            };
          }
          return data.room;
        }
        if (data.timeRemaining !== undefined && prevRoom?.gameState) {
          return {
            ...prevRoom,
            gameState: {
              ...prevRoom.gameState,
              timer: data.timeRemaining
            }
          };
        }
        return prevRoom;
      });
    });
  }, [namespace, setCurrentRoom]);

  // Attach socket listeners for this provider instance
  const attachListeners = useCallback((sock: Socket) => {
    const off = (event: string) => {
      try { sock.off(event); } catch {}
    };
    // Clean previous handlers for these events
    [
      'roomJoined','playerJoined','playerLeft','playerReadyUpdate','gameStarting','gameStarted',
      'cellClicked','gameEnded','gameReset','gameStateUpdate','wildcardUsed','playerChanged',
      'turnChanged','timeoutWarning','turnTimeout','gameFinished','timerUpdate','answerResult',
      'playerReconnected','forceLeaveSuccess','answerSubmitted','questionSkipped','questionChanged',
      'scoreUpdated','quizGameEnded','validPlayersForTeams','error'
    ].forEach(off);

    sock.on('roomJoined', (data) => {
      if (data?.room) {
        setCurrentRoom(data.room);
      }
    });
    sock.on('playerJoined', (data) => {
      if (data?.room) {
        setCurrentRoom(data.room);
      }
    });
    sock.on('playerLeft', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('playerReadyUpdate', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('gameStarting', (data) => {
      if (data?.room) {
        setCurrentRoom(data.room);
      }
    });
    sock.on('gameStarted', (data) => {
      if (data?.room) {
        // Log the correct answer for the first player when game starts (Bingo game)
        if (data.room.gameState?.gameData?.players && data.room.gameState?.currentGamePlayerIndex !== undefined) {
          const currentGamePlayer = data.room.gameState.gameData.players[data.room.gameState.currentGamePlayerIndex];
          if (currentGamePlayer) {
            const categories = currentGamePlayer.matchingCategories && currentGamePlayer.matchingCategories.length > 0 
              ? currentGamePlayer.matchingCategories.join(', ')
              : 'No matches';
            
            console.log(`🎯 Game Started - First Player: ${currentGamePlayer.playerName}`);
            console.log(`✅ Correct Answer: ${categories}`);
          }
        }
        setCurrentRoom(data.room);
      }
    });
    sock.on('cellClicked', (data) => {
      // Show red flash for wrong answers (only for the current player - Bingo game)
      if (data.isCorrect === false) {
        // Only show red flash for the current player (the one who clicked)
        if (data.playerId === currentUserIdRef.current) {
          // Dispatch custom event for red cell flash
          const event = new CustomEvent('redCellFlash', {
            detail: { cellName: data.cellId }
          });
          window.dispatchEvent(event);
        }
      }
      
      // Update room state with new locked cells and game state
      setCurrentRoom(prev => {
        if (!prev || !prev.gameState) return prev;
        
        const newLockedCells = data.lockedCells || prev.gameState.lockedCells || [];
        
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            lockedCells: newLockedCells,
            currentPlayerIndex: data.currentPlayerIndex ?? prev.gameState.currentPlayerIndex,
            gamePhase: data.gamePhase ?? prev.gameState.gamePhase
          }
        };
      });
    });
    sock.on('gameEnded', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('gameReset', (data) => setCurrentRoom(() => data.room));
    // gameStateUpdate listener removed - handled in main connection setup to avoid duplicates
    sock.on('wildcardUsed', (data) => setCurrentRoom(prev => data.room || prev));
    sock.on('playerChanged', (data) => setCurrentRoom(prev => data.room || prev));
    sock.on('turnChanged', (data) => {
      // Log the correct answer for the new turn (Bingo game)
      if (data.room?.gameState?.gameData?.players && data.room?.gameState?.currentGamePlayerIndex !== undefined) {
        const currentGamePlayer = data.room.gameState.gameData.players[data.room.gameState.currentGamePlayerIndex];
        if (currentGamePlayer) {
          const categories = currentGamePlayer.matchingCategories && currentGamePlayer.matchingCategories.length > 0 
            ? currentGamePlayer.matchingCategories.join(', ')
            : 'No matches';
          
          console.log(`🎯 Turn Changed - Current Player: ${currentGamePlayer.playerName}`);
          console.log(`✅ Correct Answer: ${categories}`);
        }
      }
      setCurrentRoom(prev => data.room || prev);
    });
    sock.on('timeoutWarning', () => {});
    sock.on('turnTimeout', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('gameFinished', (data) => {
      console.log('🎉 [attachListeners] Game finished event received:', data);
      if (data?.room) {
        console.log('✅ [attachListeners] Updating room state with finished game:', {
          status: data.room.status,
          gamePhase: data.room.gameState?.gamePhase,
          winner: data.room.gameState?.winner
        });
        setCurrentRoom(data.room);
      } else {
        console.warn('⚠️ [attachListeners] gameFinished event missing room data:', data);
      }
    });
    // timerUpdate handler removed from here - handled separately by attachTimerUpdateListener
    sock.on('answerResult', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('playerReconnected', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('forceLeaveSuccess', () => setCurrentRoom(null));
    sock.on('answerSubmitted', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('questionSkipped', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('questionChanged', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('scoreUpdated', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('quizGameEnded', (data) => setCurrentRoom(prev => prev ? data.room : null));
    sock.on('error', (data) => { console.error('❌ Multiplayer error:', data.message); setError(data.message); });
  }, [setCurrentRoom]);

  const connect = useCallback(() => {
    // Validate and normalize namespace
    if (!namespace || typeof namespace !== 'string') {
      console.error('❌ Invalid namespace in connect:', namespace);
      setError(`Invalid namespace: ${JSON.stringify(namespace)}`);
      return;
    }
    const normalizedNamespace = namespace.startsWith('/') ? namespace : `/${namespace}`;
    
    // Reuse global socket if available
    if (globalSockets[normalizedNamespace]?.connected) {
      socketRef.current = globalSockets[normalizedNamespace];
      setSocket(globalSockets[normalizedNamespace]!);
      setIsConnected(true);
      // Rebind listeners for this provider instance
      if (socketRef.current) {
        // Attach listeners immediately to catch any events
        attachListeners(socketRef.current);
        attachTimerUpdateListener(socketRef.current);
        // Also request current game state if we don't have a room yet
        if (!currentRoom && currentUserId) {
          // Request game state via getGameState if available (team game only)
          if (normalizedNamespace === '/team-multiplayer') {
            setTimeout(() => {
              if (socketRef.current?.connected && currentUserId) {
                console.log('📡 Requesting game state after reusing socket', { userId: currentUserId, namespace: normalizedNamespace });
                socketRef.current.emit('getGameState', { userId: currentUserId });
              }
            }, 100);
          }
        }
      }
      return;
    }
    if (socketRef.current?.connected) {
      console.log('🔌 Already connected, skipping connection attempt. Socket ID:', socketRef.current.id, 'NS:', normalizedNamespace);
      return;
    }
    
    if (isConnectingRef.current) {
      console.log('🔌 Connection already in progress, skipping');
      return;
    }
    
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication required. Please log in first.');
      return;
    }
    
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    isConnectingRef.current = true;
    
    // namespace is already validated and normalized above
    
    // For socket.io v4, namespace should be in the URL path
    // Ensure WS_BASE_URL doesn't have trailing slash
    const baseUrl = WS_BASE_URL.endsWith('/') ? WS_BASE_URL.slice(0, -1) : WS_BASE_URL;
    const socketUrl = `${baseUrl}${normalizedNamespace}`;
    
    console.log('🔌 Connecting to multiplayer server with authentication...', { 
      namespace: normalizedNamespace, 
      socketUrl,
      baseUrl 
    });
    
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      timeout: 20000,
      auth: {
        token: token
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`
      },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to multiplayer server');
      setIsConnected(true);
      setError(null);
      isConnectingRef.current = false;
      // Save globally for reuse (normalizedNamespace is already defined in the closure)
      globalSockets[normalizedNamespace] = newSocket;
      attachListeners(newSocket);
      attachTimerUpdateListener(newSocket);
      
      // Request game state after connection if we don't have a room yet (important for redirects)
      if (!currentRoom && currentUserId && normalizedNamespace === '/team-multiplayer') {
        setTimeout(() => {
          if (newSocket.connected && currentUserId) {
            console.log('📡 [connect] Requesting game state after new connection', { userId: currentUserId, namespace: normalizedNamespace });
            newSocket.emit('getGameState', { userId: currentUserId });
          }
        }, 100);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from multiplayer server:', reason);
      setIsConnected(false);
      setCurrentRoom(null);
      
      // Attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect' && !manualDisconnectRef.current) {
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            connect();
          }
        }, 2000); // Reconnect after 2 seconds
      }
      manualDisconnectRef.current = false; // reset flag
    });

    newSocket.on('connected', () => {
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error.message);
      console.error('❌ Connection error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        transport: error.transport,
        namespace: (error as any).nsp || 'default',
        socketUrl,
        normalizedNamespace
      });
      setError(`Connection failed: ${error.message}`);
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    // The rest of the event handlers are attached via attachListeners(newSocket)
    // Note: cellClicked listener is now handled in attachListeners to avoid duplication

    newSocket.on('gameEnded', (data) => {
      // console.log('🏆 Game ended! Winner:', data.winner);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('gameReset', (data) => {
      console.log('🔄 Game reset received from player:', data.resetBy);
      console.log('🔄 Reset timestamp:', new Date(data.timestamp).toISOString());
      
      // Update room state with the reset data
      setCurrentRoom(prevRoom => {
        if (!prevRoom) return null;
        
        // Ensure we have the latest room state
        const updatedRoom = {
          ...prevRoom,
          ...data.room,
          // Ensure all players are marked as not ready
          players: data.room.players.map((player: any) => ({
            ...player,
            isReady: false
          }))
        };
        
        console.log('✅ Room state updated after reset:', {
          roomId: updatedRoom.roomId,
          status: updatedRoom.status,
          playersCount: updatedRoom.players.length,
          allPlayersNotReady: updatedRoom.players.every((p: any) => !p.isReady)
        });
        
        return updatedRoom;
      });
    });

    newSocket.on('gameStateUpdate', (data) => {
      // Update room state when server sends game state updates
      if (data.room) {
        // IMPORTANT: If game is finished, always update immediately (no deep equality check)
        // This must work even if currentRoom is null (e.g., after page redirect)
        const isGameFinished = data.room.status === 'finished' || data.room.gameState?.gamePhase === 'finished';
        
        if (isGameFinished) {
          console.log('🎉 [gameStateUpdate] Received finished game state, forcing update:', {
            status: data.room.status,
            gamePhase: data.room.gameState?.gamePhase,
            winner: data.room.gameState?.winner
          });
          // Force immediate update for finished games - always replace, even if null
          setCurrentRoom(data.room);
        } else {
          // Use functional update to ensure we're comparing with latest state
          setCurrentRoom(prevRoom => {
            // Skip if it's the same room data (deep equality check)
            if (prevRoom && data.room) {
              const prevStr = JSON.stringify(prevRoom);
              const nextStr = JSON.stringify(data.room);
              if (prevStr === nextStr) {
                return prevRoom;
              }
            }
            // Always update if prevRoom is null (e.g., after redirect)
            return data.room;
          });
        }
      }
    });

    newSocket.on('wildcardUsed', (data) => {
      
      // Update room state with the full room data from backend
      setCurrentRoom(prevRoom => data.room || prevRoom);
    });

    newSocket.on('playerChanged', (data) => {
      // console.log('👤 Player changed to:', data.room.gameState?.currentGamePlayerIndex);
      // Don't set room to null during player changes - keep the current room
      setCurrentRoom(prevRoom => data.room || prevRoom);
    });

    // Note: turnChanged listener is now handled in attachListeners to avoid duplication

    newSocket.on('timeoutWarning', (data) => {
      console.log(`⚠️ Timeout warning: ${data.timeRemaining} seconds remaining for ${data.currentPlayer?.username}`);
      // You can add a callback here to show timeout warnings in the UI
    });

    newSocket.on('turnTimeout', (data) => {
      // console.log(`⏰ Turn timeout for ${data.username}. Penalty: ${data.penalty} players, Consecutive timeouts: ${data.consecutiveTimeouts}`);
      // You can add a callback here to show timeout notifications in the UI
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('gameEnded', (data) => {
      
      // Update room state with final game state
      setCurrentRoom(prevRoom => data.room || prevRoom);
    });

    // Team game finish - CRITICAL: Update room state immediately for ALL players
    // This must work even if currentRoom is null (e.g., after page redirect)
    newSocket.on('gameFinished', (data) => {
      if (data?.room) {
        // Force update room state - always replace, even if currentRoom is null
        // This ensures the modal shows even after redirects
        setCurrentRoom(data.room);
      } else {
      }
    });

    // Listen for valid players for teams (for debugging)
    newSocket.on('validPlayersForTeams', (data: any) => {
      if (data?.team1 && data?.team2 && data?.validPlayers) {
        console.log(`🎯 Correct answers (any of these):`, data.validPlayers.join(', '));
      }
    });

    // Attach timerUpdate listener separately
    attachTimerUpdateListener(newSocket);

    // Optional: answer result feedback
    newSocket.on('answerResult', (data) => {
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    // Handle player reconnection
    newSocket.on('playerReconnected', (data) => {
      console.log('🔄 Player reconnected:', data.username);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    // Handle force leave success
    newSocket.on('forceLeaveSuccess', (data) => {
      console.log('✅ Force leave successful:', data.message);
      setCurrentRoom(null);
    });

    // Quiz game specific events
    newSocket.on('answerSubmitted', (data) => {
      console.log('📝 Answer submitted by:', data.username);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('questionSkipped', (data) => {
      console.log('⏭️ Question skipped by:', data.username);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('questionChanged', (data) => {
      console.log('🔄 Question changed:', data.questionIndex);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('scoreUpdated', (data) => {
      console.log('📊 Score updated for:', data.username, 'Score:', data.score);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('quizGameEnded', (data) => {
      console.log('🏆 Quiz game ended! Winner:', data.winner);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('error', (data) => {
      console.error('❌ Multiplayer error:', data.message);
      setError(data.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [namespace, attachListeners, attachTimerUpdateListener, setCurrentRoom, currentRoom, currentUserId]);

  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      // Mark manual disconnect to distinguish from server/network drops
      manualDisconnectRef.current = true;
      
      // Leave room first if in one
      if (currentRoom && currentUserId) {
        socketRef.current.emit('leaveRoom', { userId: currentUserId });
      }
      
      // Give a small delay for the leaveRoom to be processed
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocket(null);
          setIsConnected(false);
          setCurrentRoom(null);
          isConnectingRef.current = false; // Reset connecting flag
          // Don't reset currentUserId and currentUsername - they should persist across reconnections
          // setCurrentUserId(null);
          // setCurrentUsername(null);
          console.log('✅ WebSocket disconnected gracefully');
        }
      }, 100); // 100ms delay to allow leaveRoom to be processed
    }
  }, [currentRoom, currentUserId]);

  const joinLobby = async (userId: string, username: string, league?: string) => {
    // Ensure connection; do NOT disconnect if already connected
    if (!socketRef.current?.connected) {
      connect();
      await new Promise(resolve => setTimeout(resolve, 1500));
    if (!socketRef.current?.connected) {
        throw new Error('Failed to connect to server');
      }
    } else {
      console.log('🔌 Already connected, skipping connection attempt');
    }
    
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication required. Please log in first.');
    }
    
    setCurrentUserId(userId);
    setCurrentUsername(username);
    try {
      localStorage.setItem('mp_userId', userId);
      localStorage.setItem('mp_username', username);
    } catch {}
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Join lobby timeout
        reject(new Error('Join lobby timeout - please try again'));
      }, 10000);

      socketRef.current!.emit('joinLobby', { userId, username, league });
      
      const onRoomJoined = (data: any) => {
        // Update room state immediately
        if (data?.room) {
          setCurrentRoom(data.room);
        }
        clearTimeout(timeout);
        socketRef.current!.off('roomJoined', onRoomJoined);
        socketRef.current!.off('error', onError);
        resolve();
      };

      const onError = (data: any) => {
        console.error('❌ Join lobby error:', data.message);
        clearTimeout(timeout);
        socketRef.current!.off('roomJoined', onRoomJoined);
        socketRef.current!.off('error', onError);
        reject(new Error(data.message || 'Failed to join lobby'));
      };

      socketRef.current!.on('roomJoined', onRoomJoined);
      socketRef.current!.on('error', onError);
    });
  };

  const leaveRoom = async () => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      return;
    }
    
    console.log('🚪 Leaving room:', currentRoom.roomId);
    socketRef.current.emit('leaveRoom', { userId: currentUserId });
    setCurrentRoom(null);
  };

  const forceLeaveRoom = async () => {
    if (!socketRef.current?.connected || !currentUserId) {
      return;
    }
    
    console.log('🚪 Force leaving any room for user:', currentUserId);
    socketRef.current.emit('forceLeaveRoom', { userId: currentUserId });
    setCurrentRoom(null);
  };

  const toggleReady = async () => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      return;
    }
    
    const currentPlayer = currentRoom.players.find(p => p.userId === currentUserId);
    if (!currentPlayer) return;
    
    socketRef.current.emit('playerReady', { 
      userId: currentUserId,
      isReady: !currentPlayer.isReady 
    });
  };

  const startGame = async () => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      return;
    }
    
    socketRef.current.emit('startGame', { userId: currentUserId });
  };

  const clickCell = async (cellId: string) => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      return;
    }
    
    
    socketRef.current.emit('clickCell', { userId: currentUserId, cellId });
  };

  const useWildcard = async () => {
    if (!socketRef.current?.connected || !currentRoom) {
      return;
    }
    
    socketRef.current.emit('useWildcard', { userId: currentUserId });
  };

  const skipTurn = async () => {
    if (!socketRef.current?.connected || !currentRoom) {
      return;
    }
    
    socketRef.current.emit('skipTurn', { userId: currentUserId });
  };


  const selectTeam = async (team: string): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot select team: not connected or no room');
    }
    socketRef.current.emit('selectTeam', { userId: currentUserId, team });
  };

  const resetGame = async (): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot reset game: not connected or no room');
    }
    
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Game reset timeout'));
      }, 5000); // 5 second timeout
      
      const onResetSuccess = () => {
        clearTimeout(timeout);
        if (socketRef.current) {
          socketRef.current.off('gameReset', onResetSuccess);
          socketRef.current.off('error', onError);
        }
        resolve();
      };
      
      const onError = (error: any) => {
        clearTimeout(timeout);
        if (socketRef.current) {
          socketRef.current.off('gameReset', onResetSuccess);
          socketRef.current.off('error', onError);
        }
        reject(new Error(error.message || 'Game reset failed'));
      };
      
      // Listen for success or error
      if (socketRef.current) {
        socketRef.current.on('gameReset', onResetSuccess);
        socketRef.current.on('error', onError);
        
        // Emit the reset request
        socketRef.current.emit('resetGame', { userId: currentUserId });
      } else {
        reject(new Error('Socket not available'));
      }
    });
  };

  const submitAnswer = async (answer: string): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot submit answer: not connected or no room');
    }
    
    console.log('📝 Submitting answer:', answer);
    socketRef.current.emit('submitAnswer', { 
      userId: currentUserId, 
      answer: answer.trim() 
    });
  };

  const skipQuestion = async (): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot skip question: not connected or no room');
    }
    
    console.log('⏭️ Skipping question');
    socketRef.current.emit('skipQuestion', { userId: currentUserId });
  };

  const submitTeamAnswer = async (playerName: string, team1: string, team2: string): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot submit answer: not connected or no room');
    }
    socketRef.current.emit('submitAnswer', {
      userId: currentUserId,
      playerName: playerName?.trim(),
      team1,
      team2,
    });
  };

  const clickTictactoeCell = async (row: number, col: number): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot click cell: not connected or no room');
    }
    socketRef.current.emit('clickCell', {
      userId: currentUserId,
      row,
      col,
    });
  };

  const submitTictactoeAnswer = async (playerName: string, row: number, col: number): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot submit answer: not connected or no room');
    }
    socketRef.current.emit('submitAnswer', {
      userId: currentUserId,
      playerName: playerName?.trim(),
      row,
      col,
    });
  };

  const sendMessage = (message: string) => {
    if (!socketRef.current?.connected || !currentRoom) {
      return;
    }
    
    // TODO: Implement chat functionality
    // console.log('Chat message:', message);
  };

  const clearError = () => {
    setError(null);
  };

  // Auto-connect on mount (only if namespace is valid)
  useEffect(() => {
    // Ensure namespace is valid before connecting
    // Double-check that namespace exists and is a valid string
    if (!namespace || typeof namespace !== 'string' || namespace.trim() === '') {
      console.warn('⚠️ Cannot connect: invalid namespace', namespace);
      return;
    }
    
    // Normalize namespace to ensure it starts with /
    const normalizedNamespace = namespace.startsWith('/') ? namespace : `/${namespace}`;
    
    // Additional validation: namespace should match expected format
    if (!/^\/[a-zA-Z0-9-]+$/.test(normalizedNamespace)) {
      console.error('❌ Invalid namespace format:', normalizedNamespace);
      setError(`Invalid namespace format: ${normalizedNamespace}`);
      return;
    }
    
    connect();
    // Do not auto-disconnect on unmount; keep socket alive across page navigations
    return () => {};
  }, [namespace, connect]);

  const value: MultiplayerContextType = {
    socket,
    isConnected,
    currentRoom,
    currentUserId,
    currentUsername,
    connect,
    disconnect,
    joinLobby,
    leaveRoom,
    forceLeaveRoom,
    toggleReady,
    startGame,
    clickCell,
    useWildcard,
    skipTurn,
    selectTeam,
    resetGame,
    submitAnswer,
    skipQuestion,
    submitTeamAnswer,
    clickTictactoeCell,
    submitTictactoeAnswer,
    sendMessage,
    error,
    clearError,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};
