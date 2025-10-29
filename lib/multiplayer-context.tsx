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
  gamePhase: 'lobby' | 'playing' | 'finished';
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
}

export interface Room {
  roomId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
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
  joinLobby: (userId: string, username: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  forceLeaveRoom: () => Promise<void>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  
  // Game methods
  clickCell: (cellId: string) => Promise<void>;
  useWildcard: () => Promise<void>;
  skipTurn: () => Promise<void>;
  getGameState: () => Promise<void>;
  resetGame: () => Promise<void>;
  
  // Quiz game methods
  submitAnswer: (answer: string) => Promise<void>;
  skipQuestion: () => Promise<void>;
  
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

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({ children, namespace = '/bingo-multiplayer' }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
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

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 Already connected, skipping connection attempt');
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
    console.log('🔌 Connecting to multiplayer server with authentication...');
    const newSocket = io(`${WS_BASE_URL}${namespace}`, {
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
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from multiplayer server:', reason);
      setIsConnected(false);
      setCurrentRoom(null);
      
      // Attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            connect();
          }
        }, 2000); // Reconnect after 2 seconds
      }
    });

    newSocket.on('connected', (data) => {
      // console.log('Server welcome:', data.message);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setError(`Connection failed: ${error.message}`);
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    newSocket.on('roomJoined', (data) => {
      // console.log('✅ Joined room:', data.room.roomId);
      setCurrentRoom(data.room);
    });

    newSocket.on('playerJoined', (data) => {
      // console.log('👤 Player joined:', data.player.username);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('playerLeft', (data) => {
      // console.log('👋 Player left:', data.username);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('playerReadyUpdate', (data) => {
      // console.log('✅ Player ready status updated:', data.playerId, data.isReady);
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('gameStarting', (data) => {
      // console.log('🎮 Game is starting...');
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('gameStarted', (data) => {
      
      // Log the correct answer for the current turn
      if (data.room?.gameState?.gameData?.players && data.room?.gameState?.currentGamePlayerIndex !== undefined) {
        const currentGamePlayer = data.room.gameState.gameData.players[data.room.gameState.currentGamePlayerIndex];
        if (currentGamePlayer) {
          const categories = currentGamePlayer.matchingCategories && currentGamePlayer.matchingCategories.length > 0 
            ? currentGamePlayer.matchingCategories.join(', ')
            : 'No matches';
          
          console.log(`🎯 Game Started - Current Player: ${currentGamePlayer.playerName}`);
          console.log(`✅ Correct Answer: ${categories}`);
        }
      }
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
    });

    newSocket.on('cellClicked', (data) => {
      
      // Show red flash for wrong answers (only for the current player)
      if (data.isCorrect === false) {
        // Only show red flash for the current player (the one who clicked)
        if (data.playerId === currentUserIdRef.current) {
          // Dispatch custom event for red cell flash
          const event = new CustomEvent('redCellFlash', {
            detail: { cellName: data.cellId }
          });
          window.dispatchEvent(event);
        }
      } else {
      }
      
      // Update room state with new locked cells and game state
      setCurrentRoom(prevRoom => {
        if (!prevRoom || !prevRoom.gameState) return prevRoom;
        
        const newLockedCells = data.lockedCells || prevRoom.gameState.lockedCells || [];
        console.log('🔄 Updating room state:');
        console.log('  Previous locked cells:', prevRoom.gameState.lockedCells);
        console.log('  New locked cells:', newLockedCells);
        console.log('  Is correct:', data.isCorrect);
        
        return {
          ...prevRoom,
          gameState: {
            ...prevRoom.gameState,
            lockedCells: newLockedCells,
            currentPlayerIndex: data.currentPlayerIndex ?? prevRoom.gameState.currentPlayerIndex,
            gamePhase: data.gamePhase ?? prevRoom.gameState.gamePhase
          }
        };
      });
    });

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
      // console.log('📊 Game state updated');
      setCurrentRoom(prevRoom => prevRoom ? data.room : null);
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

    newSocket.on('turnChanged', (data) => {
      // console.log('🔄 Turn changed to player:', data.room.gameState?.currentPlayerIndex);
      // console.log('=== FRONTEND TURN CHANGED DATA ===');
      // console.log('Complete Data:', JSON.stringify(data, null, 2));
      // console.log('Current Player Index:', data.room?.gameState?.currentPlayerIndex);
      // console.log('Current Game Player Index:', data.room?.gameState?.currentGamePlayerIndex);
      // console.log('Remaining Players:', data.room?.gameState?.remainingPlayers);
      // console.log('Turn Phase:', data.room?.gameState?.turnPhase);
      // console.log('Turn Start Time:', data.room?.gameState?.turnStartTime);
      // console.log('===============================');
      
      // Log the correct answer for the new turn
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
      // Don't set room to null during turn changes - keep the current room
      setCurrentRoom(prevRoom => data.room || prevRoom);
    });

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

    // Handle timer updates
    newSocket.on('timerUpdate', (data) => {
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
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('🔌 Gracefully disconnecting WebSocket...');
      
      // Leave room first if in one
      if (currentRoom && currentUserId) {
        console.log('🚪 Leaving room before disconnect...');
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

  const joinLobby = async (userId: string, username: string) => {
    // Force disconnect and reconnect if not connected
    if (!socketRef.current?.connected) {
      console.log('🔌 Not connected, attempting to reconnect...');
      disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      connect();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for connection
      
      if (!socketRef.current?.connected) {
        throw new Error('Failed to connect to server');
      }
    }
    
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication required. Please log in first.');
    }
    
    setCurrentUserId(userId);
    setCurrentUsername(username);
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('❌ Join lobby timeout after 10 seconds');
        reject(new Error('Join lobby timeout - please try again'));
      }, 10000);

      console.log('📡 Emitting joinLobby with:', { userId, username });
      socketRef.current!.emit('joinLobby', { userId, username });
      
      const onRoomJoined = (data: any) => {
        console.log('✅ Room joined successfully');
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

  const getGameState = async () => {
    if (!socketRef.current?.connected || !currentRoom) {
      return;
    }
    
    socketRef.current.emit('getGameState');
  };

  const resetGame = async (): Promise<void> => {
    if (!socketRef.current?.connected || !currentRoom || !currentUserId) {
      throw new Error('Cannot reset game: not connected or no room');
    }
    
    console.log('🔄 Resetting game state...');
    
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

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      // Only disconnect if we're actually connected
      if (socketRef.current?.connected) {
        disconnect();
      }
    };
  }, []); // Remove dependencies to prevent re-running

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
    getGameState,
    resetGame,
    submitAnswer,
    skipQuestion,
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
