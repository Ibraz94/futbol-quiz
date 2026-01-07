    "use client";

    import { useEffect, useState, useRef, Suspense, useMemo } from "react";
    import { flushSync } from "react-dom";
    import axios from "axios";
    import Image from "next/image";
    import { API_BASE_URL } from "../../lib/config";
    import { useRouter, useSearchParams } from "next/navigation";
    import { useMultiplayer, MultiplayerProvider } from "../../lib/multiplayer-context";

    function TictactoeGame() {
  const [topCategories, setTopCategories] = useState<{ name: string; slug: string; categoryId: number }[]>([]);
  const [leftCategories, setLeftCategories] = useState<{ name: string; slug: string; categoryId: number }[]>([]);
  const [pairs, setPairs] = useState<{ 
    categories: string[]; 
    players: string[];
    playerJustifications?: Array<{
      playerName: string;
      categories: Array<{ categoryId: number; categoryName: string }>;
      justification: string;
    }>;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]); // Store all players for the entire session
  const [suggestions, setSuggestions] = useState<any[]>([]); // Real-time search suggestions
  const [showSuggestions, setShowSuggestions] = useState(false); // Show/hide suggestions dropdown
  const [activePair, setActivePair] = useState<string[] | null>(null);
  const [activePairJustifications, setActivePairJustifications] = useState<Array<{
    playerName: string;
    categories: Array<{ categoryId: number; categoryName: string }>;
    justification: string;
  }> | null>(null);
  const [showJustifications, setShowJustifications] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [player1Wins, setPlayer1Wins] = useState(0);
  const [player2Wins, setPlayer2Wins] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
    const [drawRequested, setDrawRequested] = useState<string | null>(null); // 'X' or 'O' who requested draw
  const [showDrawConfirmation, setShowDrawConfirmation] = useState(false);
  const [showDrawRequestSent, setShowDrawRequestSent] = useState(false); // Show "waiting for response" modal for requester
  const [showDrawAccepted, setShowDrawAccepted] = useState(false); // Show "draw accepted" popup for 5 seconds
  const [legWinModal, setLegWinModal] = useState<{ playerName: string; winningAnswer: string; isCurrentUser: boolean } | null>(null); // Show leg win modal
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [showOpponentLeftModal, setShowOpponentLeftModal] = useState<boolean>(false);
  const [disconnectedPlayerName, setDisconnectedPlayerName] = useState<string>('');
  const [isWinner, setIsWinner] = useState<boolean>(false);
  const [wonByDisconnect, setWonByDisconnect] = useState<boolean>(false);
  const wonByDisconnectRef = useRef<boolean>(false); // Use ref to persist across renders
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState<boolean>(false);
  const [turnTimer, setTurnTimer] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [dataReady, setDataReady] = useState(false);
  // Rematch feature state
  const [rematchCountdown, setRematchCountdown] = useState<number>(0);
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);
  const [rematchAvailable, setRematchAvailable] = useState<boolean>(false);
  const [showRematchModal, setShowRematchModal] = useState<boolean>(false);
  const [rematchRequesterName, setRematchRequesterName] = useState<string>('');
  const rematchCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const rematchRequestPendingRef = useRef<boolean>(false); // Track if rematch request is pending to prevent state resets
  const rematchExpiredRef = useRef<boolean>(false); // Track if rematch countdown has expired to prevent resetting
  const rematchCountdownWhenRequestedRef = useRef<number>(0); // Store countdown value when rematch was requested
      const [pendingWin, setPendingWin] = useState<string | null>(null);
  const submittedCellRef = useRef<{ row: number; col: number } | null>(null);
  const [modalShouldClose, setModalShouldClose] = useState(false);
  const isRedirectingRef = useRef(false); // Track if we're in the process of redirecting
  const lastAnswerResultTimeRef = useRef<number>(0); // Track when we last received an answer result
  const waitingForNewGridRef = useRef(false); // Track if we're waiting for new grid after draw acceptance
  const previousGridCategoriesRef = useRef<{ top: string[]; left: string[] } | null>(null); // Track previous grid to detect changes
  const router = useRouter();
  const searchParams = useSearchParams();
  const league = searchParams?.get('league') || 'bundesliga'; // Default to bundesliga if no league specified
      const isMultiplayer = searchParams?.get('multiplayer') === 'true';
      
      // Multiplayer context - always call hook unconditionally (hook rules)
      // Will be null if not inside MultiplayerProvider
      const multiplayer = useMultiplayer();
      // Only use multiplayer values if in multiplayer mode and context is available
      const {
        isConnected: mpIsConnected,
        currentRoom,
        currentUserId,
        socket,
        clickTictactoeCell,
        submitTictactoeAnswer,
        skipTurn: mpSkipTurn,
        resetGame: mpResetGame,
        leaveRoom: mpLeaveRoom,
      } = (isMultiplayer && multiplayer) ? multiplayer : {};
      
      // Get multiplayer state
      const mpGameState = currentRoom?.gameState as any;
      const mpCellStates = mpGameState?.cellStates;
      const mpTopCategories = mpGameState?.topCategories || [];
      const mpLeftCategories = mpGameState?.leftCategories || [];
      const mpPairs = mpGameState?.pairs || [];
      const mpCurrentTurnUserId = currentRoom?.currentTurnUserId;
      const mpIsMyTurn = !!currentUserId && mpCurrentTurnUserId === currentUserId;
      const mpTimer = mpGameState?.timer;
      const mpScores = mpGameState?.scores || {};
      const mpGameWins = mpGameState?.gameWins || {};
      const mpIsFinished = currentRoom?.status === 'finished' || mpGameState?.gamePhase === 'finished';
      const mpWinnerUserId = mpGameState?.winner;
      const mpSeriesWinner = mpGameState?.seriesWinner;
      const mpCurrentGame = mpGameState?.currentGame || 1;
      const mpDrawRequest = mpGameState?.drawRequest as any;
      const mpIsDrawPending = !!mpDrawRequest && mpDrawRequest.status === 'pending';
      
      // Get current player's symbol
      const mySymbol = useMemo(() => {
        if (!currentRoom || !currentUserId) return null;
        const player = currentRoom.players.find(p => p.userId === currentUserId);
        return (player as any)?.symbol || null;
      }, [currentRoom, currentUserId]);
      
      // Get current turn player's symbol
      const currentTurnSymbol = useMemo(() => {
        if (!currentRoom || !mpCurrentTurnUserId) return null;
        const player = currentRoom.players.find(p => p.userId === mpCurrentTurnUserId);
        return (player as any)?.symbol || null;
      }, [currentRoom, mpCurrentTurnUserId]);

      // 3x3 grid state: { locked, image, answer }
      type CellState = { locked: boolean; image: 'X' | 'O' | null; answer: string | null };
      const [cellStates, setCellStates] = useState<CellState[][]>(
        Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ locked: false, image: null, answer: null })))
      );
      const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
      const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

      // Track if players are loaded
      const [playersLoaded, setPlayersLoaded] = useState(false);
      
      // Fetch all players when page loads (for player search)
      useEffect(() => {
        const fetchAllPlayers = async () => {
          try {
            console.log('🎯 Fetching all players for the session...');
            setPlayersLoaded(false);
            const response = await axios.get(`${API_BASE_URL}/tictactoe/players`);
            const players = response.data.players || [];
            setAllPlayers(players);
            setPlayersLoaded(true);
            console.log(`✅ Loaded ${players.length} players for the session`);
          } catch (error) {
            console.error('❌ Error fetching all players:', error);
            setAllPlayers([]);
            setPlayersLoaded(false);
          }
        };

        fetchAllPlayers();
      }, []);

      // Handle browser tab/window close and navigation away
      useEffect(() => {
        if (!isMultiplayer || !currentRoom) return;

        const isGameInProgress = currentRoom.status === 'playing' || 
                                 (mpGameState?.gamePhase === 'playing' && !mpIsFinished);

        if (!isGameInProgress) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          // Don't show warning if we're redirecting (e.g., draw accepted, game reset)
          if (isRedirectingRef.current) {
            return; // Allow navigation without warning
          }
          e.preventDefault();
          e.returnValue = ''; // Chrome requires returnValue to be set
          return ''; // Some browsers require return value
        };

        const handlePopState = (e: PopStateEvent) => {
          // Don't show warning if we're redirecting (e.g., draw accepted, game reset)
          if (isRedirectingRef.current) {
            return; // Allow navigation without warning
          }
          
          const stillInProgress = currentRoom.status === 'playing' || 
                                  (mpGameState?.gamePhase === 'playing' && !mpIsFinished);
          if (stillInProgress) {
            e.preventDefault();
            setShowLeaveConfirmation(true);
            // Push state back to prevent navigation
            window.history.pushState(null, '', window.location.href);
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        // Push initial state to track navigation
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);

        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          window.removeEventListener('popstate', handlePopState);
        };
      }, [isMultiplayer, currentRoom, mpGameState?.gamePhase, mpIsFinished]);

      // Listen for forced leave room requests from navigation (when context not available)
      useEffect(() => {
        if (!isMultiplayer || !mpLeaveRoom) return;
        
        const handleForceLeave = (event: CustomEvent) => {
          if (mpLeaveRoom) {
            mpLeaveRoom();
          }
        };
        
        window.addEventListener('mp_forceLeaveRoom', handleForceLeave as EventListener);
        return () => window.removeEventListener('mp_forceLeaveRoom', handleForceLeave as EventListener);
      }, [isMultiplayer, mpLeaveRoom]);

      // Multiplayer: Listen for game state updates
      useEffect(() => {
        if (!isMultiplayer || !socket || !currentUserId) return;
        
        // CRITICAL: Listen for gameReset event FIRST - before ANY other logic
        // This MUST work even when showing game over screen, so it's at the very top
        const handleGameReset = (data: any) => {
          isRedirectingRef.current = true; // Set flag to prevent loading screens
          setShowDrawAccepted(false); // Close draw accepted popup
          // Use window.location for immediate hard redirect - cannot be overridden
          // This ensures redirect happens even if component is showing game over screen
          // Small delay to ensure any pending state updates are processed
          setTimeout(() => {
            window.location.href = '/tictactoe-leagues';
          }, 100);
        };
        
        socket.on('gameReset', handleGameReset);
        
        // Set up event listeners once
        const handleGameStateUpdate = (data: any) => {
          if (data?.room) {
            // Room state is updated by context
            // Check if room was reset to waiting state (old draw behavior - redirect to lobby)
            if (data.room.status === 'waiting' && !data.room.gameState) {
              isRedirectingRef.current = true; // Set flag to prevent loading screens
              // Redirect after a brief delay to allow context to update
              setTimeout(() => {
                window.location.href = '/tictactoe-leagues';
              }, 500);
            }
            
            // Check if new grid was loaded after draw (drawAccepted was shown)
            if (waitingForNewGridRef.current && data.room.gameState && data.room.status === 'playing') {
              const currentTopCategories = data.room.gameState.topCategories?.map((c: any) => c.slug || c.name).join(',') || '';
              const currentLeftCategories = data.room.gameState.leftCategories?.map((c: any) => c.slug || c.name).join(',') || '';
              const prevTopCategories = previousGridCategoriesRef.current?.top.join(',') || '';
              const prevLeftCategories = previousGridCategoriesRef.current?.left.join(',') || '';
              
              // Check if grid has changed (categories are different) or drawRequest is cleared
              const gridChanged = (currentTopCategories !== prevTopCategories || currentLeftCategories !== prevLeftCategories);
              const drawRequestCleared = !data.room.gameState.drawRequest;
              
              if (gridChanged || drawRequestCleared) {
                // New grid loaded - close the loading modal
                waitingForNewGridRef.current = false; // Clear the flag
                setShowDrawAccepted(false);
                // Update previous grid reference
                previousGridCategoriesRef.current = {
                  top: data.room.gameState.topCategories?.map((c: any) => c.slug || c.name) || [],
                  left: data.room.gameState.leftCategories?.map((c: any) => c.slug || c.name) || []
                };
                console.log('[Draw] New grid loaded, closing loading modal');
              }
            } else if (data.room.gameState && data.room.status === 'playing') {
              // Update previous grid reference even if not waiting (for future comparisons)
              previousGridCategoriesRef.current = {
                top: data.room.gameState.topCategories?.map((c: any) => c.slug || c.name) || [],
                left: data.room.gameState.leftCategories?.map((c: any) => c.slug || c.name) || []
              };
            }
          }
        };
        
        const handleCellClicked = (data: any) => {
          
          // Check if players are loaded
          if (!playersLoaded || allPlayers.length === 0) {
            console.error('❌ [Frontend] Players not loaded yet, cannot open modal');
            return;
          }
          
          // Don't open modal if we just submitted an answer for this cell
          // This prevents reopening the modal after answer submission
          if (data?.userId === currentUserId && data?.row !== undefined && data?.col !== undefined) {
            // Check if this is the same cell we just submitted an answer for
            const isSameCell = submittedCellRef.current?.row === data.row && submittedCellRef.current?.col === data.col;
            if (isSameCell) {
              return;
            }
            
            setModalShouldClose(false); // Reset close flag
            setModalOpen(true);
            setActivePair([data.topCategory?.name, data.leftCategory?.name]);
            setActiveCell({ row: data.row, col: data.col });
            setSearch("");
            setShowSuggestions(false);
          }
        };
        
        const handleAnswerResult = (data: any) => {
          if (data?.userId && data?.correct !== undefined) {
            
            // Record timestamp to prevent loading screen during state update
            lastAnswerResultTimeRef.current = Date.now();
            
            // Ensure modal is closed after answer result (backup)
            setModalShouldClose(true);
            setModalOpen(false);
            setSearch("");
            setActivePair(null);
            setActiveCell(null);
            setShowSuggestions(false);
            
            // Clear submitted cell ref if this is our answer
            if (data.userId === currentUserId && data.row !== undefined && data.col !== undefined) {
              submittedCellRef.current = null;
              setModalShouldClose(false);
            }
          }
        };
        
        const handleGameWon = (data: any) => {
          // Game won - show leg win modal with winner and winning answer
          // Use room from event data (data.room) as it's guaranteed to be up-to-date
          const room = data?.room || multiplayer?.currentRoom;
          const isCurrentUserWinner = data?.winner === currentUserId;
          
          let winnerName: string;
          let winnerDisplayName: string; // For display in modal when current user lost
          
          if (isCurrentUserWinner) {
            winnerName = 'You';
            winnerDisplayName = 'You';
          } else {
            // Get the winner's symbol from event data (most reliable) or from room
            const winnerSymbol = data?.winnerSymbol || room?.players?.find((p: any) => p.userId === data?.winner)?.symbol;
            
            console.log('Winner symbol from event:', data?.winnerSymbol, 'from room:', room?.players?.find((p: any) => p.userId === data?.winner)?.symbol);
            
            // Determine Player 1 (X) or Player 2 (O) based on symbol
            if (winnerSymbol === 'X') {
              winnerDisplayName = 'Player 1';
            } else if (winnerSymbol === 'O') {
              winnerDisplayName = 'Player 2';
            } else {
              // Fallback: try to determine from player order (first player is X/Player 1, second is O/Player 2)
              const players = room?.players || [];
              const winnerIndex = players.findIndex((p: any) => p.userId === data?.winner);
              if (winnerIndex === 0) {
                winnerDisplayName = 'Player 1';
              } else if (winnerIndex === 1) {
                winnerDisplayName = 'Player 2';
              } else {
                // Final fallback to username
                const winnerPlayer = room?.players?.find((p: any) => p.userId === data?.winner);
                winnerDisplayName = winnerPlayer?.username || 'Winner';
              }
            }
            
            winnerName = winnerDisplayName;
          }
          
          // Show leg win modal with winner name and winning answer
          setLegWinModal({
            playerName: winnerDisplayName,
            winningAnswer: data?.winningAnswer || 'Unknown',
            isCurrentUser: isCurrentUserWinner
          });
          
          // Also set pendingWin for the existing flow (grid visible for 5 seconds)
          setPendingWin(winnerName);
        };
        
        const handleShowWinnerModal = (data: any) => {
          // Show winner modal after 5 seconds
          if (data?.winner === currentUserId) {
            setWinner('You');
          } else {
            // Get room from multiplayer context
            const room = multiplayer?.currentRoom;
            const winnerPlayer = room?.players.find(p => p.userId === data?.winner);
            setWinner(winnerPlayer?.username || 'Winner');
          }
        };
        
        const handleGameDraw = (data: any) => {
          // Game draw - show draw screen
          setDraw(true);
        };
        
        const handleNewGameStarted = (data: any) => {
          // New game started - reset local state
          isRedirectingRef.current = false; // Reset redirect flag
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActiveCell(null);
          setShowSuggestions(false);
          setWinner(null);
          setPendingWin(null);
          setDraw(false);
          setDrawRequested(null);
          setShowDrawConfirmation(false);
          setShowDrawRequestSent(false);
          setShowDrawAccepted(false);
          waitingForNewGridRef.current = false; // Clear the flag when new game starts
          setLegWinModal(null); // Close leg win modal when new game is loaded
          // Reset rematch state
          rematchRequestPendingRef.current = false; // Clear ref
          rematchExpiredRef.current = false; // Reset expired flag for new game
          rematchCountdownWhenRequestedRef.current = 0; // Reset stored countdown value
          setRematchRequested(false);
          setRematchAvailable(false);
          setRematchCountdown(0);
          setShowRematchModal(false);
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
          setWonByDisconnect(false); // Reset disconnect win flag
          wonByDisconnectRef.current = false; // Reset ref as well
        };
        
        const handleGameFinished = (data: any) => {
          console.log('[Rematch] handleGameFinished called. Current showRematchModal:', showRematchModal);
          // Series finished - will show final winner screen
          setWinner(null);
          setPendingWin(null);
          setLegWinModal(null); // Close leg win modal when series ends
          
          // Check if game finished due to opponent disconnect
          if (data?.reason === 'opponent_left') {
            const winner = data?.winner || data?.room?.gameState?.seriesWinner || data?.room?.gameState?.winner;
            if (winner === currentUserId) {
              setWonByDisconnect(true);
              wonByDisconnectRef.current = true;
            }
          }
          
          // Start rematch countdown timer (20 seconds)
          // Use data.room if available, otherwise fallback to currentRoom from context
          const room = data?.room || currentRoom;
          if (room && room.players && room.players.length >= 2) {
            console.log('[Rematch] Starting rematch countdown timer. Players:', room.players.length);
            // CRITICAL: Check ref FIRST - if rematch request is pending, don't touch modal state
            if (rematchRequestPendingRef.current) {
              console.log('[Rematch] handleGameFinished - rematch request pending, preserving modal state');
              // Still set rematchAvailable and countdown
              setRematchAvailable(true);
              setRematchCountdown(20);
            } else {
              // Use functional update to check current state
              setShowRematchModal((currentModalState) => {
                console.log('[Rematch] handleGameFinished - current modal state:', currentModalState);
                // Don't reset rematchRequested if modal is showing
                if (!currentModalState) {
                  setRematchRequested(false);
                }
                // Return current state to preserve it if modal is showing
                return currentModalState;
              });
              setRematchAvailable(true);
              setRematchCountdown(20);
            }
          } else {
            console.log('[Rematch] Cannot start rematch - room or players not available:', { 
              hasRoom: !!room, 
              playersCount: room?.players?.length || 0 
            });
          }
        };

        const handleDrawRequested = (data: any) => {
          console.log('[Draw] ===== drawRequested event received =====');
          console.log('[Draw] Event data:', JSON.stringify(data, null, 2));
          console.log('[Draw] Current userId:', currentUserId);
          console.log('[Draw] Current room from context:', currentRoom);
          
          const requestedBy: string | undefined = data?.requestedBy || data?.room?.gameState?.drawRequest?.requestedBy;
          console.log('[Draw] Requested by:', requestedBy);
          
          // Use room from event data as fallback if currentRoom from context is not available
          const room = data?.room || currentRoom;
          console.log('[Draw] Using room:', room ? 'from event data' : 'from context');
          
          if (!requestedBy || !room) {
            console.log('[Draw] Missing requestedBy or room, returning. requestedBy:', requestedBy, 'room:', room);
            return;
          }

          const requesterPlayer = room.players.find((p: any) => p.userId === requestedBy) as any;
          const requesterSymbol = requesterPlayer?.symbol as 'X' | 'O' | null;
          console.log('[Draw] Requester symbol:', requesterSymbol);

          // Store who requested (by symbol) so we can show in confirmation text
          if (requesterSymbol === 'X' || requesterSymbol === 'O') {
            setDrawRequested(requesterSymbol);
          } else {
            setDrawRequested(null);
          }

          // If I'm the opponent, show confirmation modal
          if (requestedBy !== currentUserId) {
            console.log('[Draw] Setting showDrawConfirmation to true (opponent)');
            setShowDrawConfirmation(true);
            setShowDrawRequestSent(false); // Ensure requester modal is closed
          } else {
            // I'm the requester - show "waiting for response" modal
            console.log('[Draw] Setting showDrawRequestSent to true (requester)');
            setShowDrawConfirmation(false);
            setShowDrawRequestSent(true);
          }
        };

        const handleDrawAccepted = (data: any) => {
          // Draw accepted - new grid will be loaded, show loading message
          isRedirectingRef.current = false; // Don't redirect - game continues
          waitingForNewGridRef.current = true; // Set flag to track we're waiting for new grid
          
          // Store current grid categories to detect when they change
          const gameState = data?.room?.gameState || (currentRoom?.gameState as any);
          if (gameState) {
            previousGridCategoriesRef.current = {
              top: (gameState.topCategories as any[])?.map((c: any) => c.slug || c.name) || [],
              left: (gameState.leftCategories as any[])?.map((c: any) => c.slug || c.name) || []
            };
          }
          
          setShowDrawConfirmation(false);
          setShowDrawRequestSent(false); // Close requester's waiting modal
          setDrawRequested(null);
          setShowDrawAccepted(true); // Show "Loading new grid..." popup
          
          // Fallback: Close modal after 3 seconds if not closed by gameStateUpdate
          setTimeout(() => {
            if (waitingForNewGridRef.current) {
              console.log('[Draw] Fallback: Closing modal after timeout');
              waitingForNewGridRef.current = false;
              setShowDrawAccepted(false);
            }
          }, 3000);
          
          // The modal will close automatically when gameStateUpdate is received with new grid
          // No redirect - game continues with new grid
        };

        const handleDrawDeclined = (data: any) => {
          // Draw declined - clear local draw state and continue game
          setShowDrawConfirmation(false);
          setShowDrawRequestSent(false); // Close requester's waiting modal
          setDrawRequested(null);
        };
        
        const handleTurnChanged = (data: any) => {
          // Turn changed - close modal if it's no longer player's turn
          if (isMultiplayer && modalOpen && currentUserId) {
            const newCurrentTurnUserId = data?.room?.currentTurnUserId;
            // If the current turn user is not me, close the modal
            if (newCurrentTurnUserId !== currentUserId) {
              setModalShouldClose(true);
              setModalOpen(false);
              setSearch("");
              setActivePair(null);
              setActiveCell(null);
              setShowSuggestions(false);
            }
          }
        };
        
        socket.on('gameStateUpdate', handleGameStateUpdate);
        socket.on('turnChanged', handleTurnChanged);
        socket.on('cellClicked', handleCellClicked);
        socket.on('answerResult', handleAnswerResult);
        socket.on('gameWon', handleGameWon);
        socket.on('showWinnerModal', handleShowWinnerModal);
        socket.on('gameDraw', handleGameDraw);
        socket.on('newGameStarted', handleNewGameStarted);
        socket.on('gameFinished', handleGameFinished);
        socket.on('drawRequested', handleDrawRequested);
        socket.on('drawAccepted', handleDrawAccepted);
        socket.on('drawDeclined', handleDrawDeclined);
        
        const handleOpponentDisconnected = (data: any) => {
          const { disconnectedPlayer, winner } = data;
          const isMe = winner === currentUserId;
          
          setDisconnectedPlayerName(disconnectedPlayer?.username || 'Opponent');
          setIsWinner(isMe);
          if (isMe) {
            setWonByDisconnect(true);
            wonByDisconnectRef.current = true; // Set ref as well
          }
        };
        
        socket.on('opponentDisconnected', handleOpponentDisconnected);
        
        // Rematch event handlers
        const handleRematchRequested = (data: any) => {
          console.log('[Rematch] ===== rematchRequested event received =====');
          console.log('[Rematch] Event data:', JSON.stringify(data, null, 2));
          console.log('[Rematch] Current socket connected:', socket?.connected);
          console.log('[Rematch] Current socket id:', socket?.id);
          console.log('[Rematch] Current userId:', currentUserId);
          const { requesterName, requesterUserId } = data;
          console.log('[Rematch] Requester:', requesterName, 'RequesterUserId:', requesterUserId);
          
          // Only show modal if this is not the requester
          if (requesterUserId && requesterUserId === currentUserId) {
            console.log('[Rematch] Ignoring rematch request - this is the requester');
            return;
          }
          
          console.log('[Rematch] Setting rematch modal to show for opponent');
          // Set ref FIRST to prevent any useEffect from resetting state
          rematchRequestPendingRef.current = true;
          // Set requester name first
          setRematchRequesterName(requesterName || 'Opponent');
          // Set modal state immediately
          setShowRematchModal(true);
          console.log('[Rematch] Modal state set to true, ref set to true');
        };

        const handleRematchAccepted = (data: any) => {
          // Rematch accepted - new game will start via gameStarted event
          rematchRequestPendingRef.current = false; // Clear ref
          setShowRematchModal(false);
          setRematchRequested(false);
          setRematchAvailable(false);
          setRematchCountdown(0);
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
        };

        const handleRematchDeclined = (data: any) => {
          // Rematch declined - restore countdown to where it was when rematch was requested
          rematchRequestPendingRef.current = false; // Clear ref
          setShowRematchModal(false);
          setRematchRequested(false);
          // Restore the countdown value from when rematch was requested
          const savedCountdown = rematchCountdownWhenRequestedRef.current;
          if (savedCountdown > 0) {
            setRematchAvailable(true);
            setRematchCountdown(savedCountdown);
            rematchCountdownWhenRequestedRef.current = 0; // Reset stored value
          } else {
            setRematchAvailable(false);
            setRematchCountdown(0);
          }
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
        };

        const handleRematchCancelled = (data: any) => {
          // Rematch cancelled (player left or timeout)
          console.log('[Rematch] handleRematchCancelled called:', data);
          rematchRequestPendingRef.current = false; // Clear ref
          setShowRematchModal(false);
          setRematchRequested(false);
          // Restore the countdown value from when rematch was requested
          const savedCountdown = rematchCountdownWhenRequestedRef.current;
          if (savedCountdown > 0) {
            setRematchAvailable(true);
            setRematchCountdown(savedCountdown);
            rematchCountdownWhenRequestedRef.current = 0; // Reset stored value
          } else {
            setRematchAvailable(false);
            setRematchCountdown(0);
          }
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
        };
        
        console.log('[Rematch] Setting up socket listeners for rematch events');
        console.log('[Rematch] Socket state:', { 
          connected: socket?.connected, 
          id: socket?.id,
          userId: currentUserId 
        });
        
        // Verify listeners are being added
        socket.on('rematchRequested', handleRematchRequested);
        socket.on('rematchAccepted', handleRematchAccepted);
        socket.on('rematchDeclined', handleRematchDeclined);
        socket.on('rematchCancelled', handleRematchCancelled);
        
        // Test: Listen to all events to see if rematchRequested is being emitted
        const testHandler = (eventName: string, ...args: any[]) => {
          if (eventName === 'rematchRequested') {
            console.log('[Rematch] TEST: Caught rematchRequested via wildcard listener:', args);
          }
        };
        console.log('[Rematch] Socket listeners registered');
        
        // Also listen to custom window event from context for gameFinished
        const handleGameFinishedCustom = (event: CustomEvent) => {
          handleGameFinished(event.detail);
        };
        window.addEventListener('gameFinished', handleGameFinishedCustom as EventListener);
        
        return () => {
          socket.off('gameReset', handleGameReset);
          socket.off('gameStateUpdate', handleGameStateUpdate);
          socket.off('turnChanged', handleTurnChanged);
          socket.off('cellClicked', handleCellClicked);
          socket.off('answerResult', handleAnswerResult);
          socket.off('gameWon', handleGameWon);
          socket.off('showWinnerModal', handleShowWinnerModal);
          socket.off('gameDraw', handleGameDraw);
          socket.off('newGameStarted', handleNewGameStarted);
          socket.off('gameFinished', handleGameFinished);
          socket.off('drawRequested', handleDrawRequested);
          socket.off('drawAccepted', handleDrawAccepted);
          socket.off('drawDeclined', handleDrawDeclined);
          socket.off('opponentDisconnected', handleOpponentDisconnected);
          socket.off('rematchRequested', handleRematchRequested);
          socket.off('rematchAccepted', handleRematchAccepted);
          socket.off('rematchDeclined', handleRematchDeclined);
          socket.off('rematchCancelled', handleRematchCancelled);
          window.removeEventListener('gameFinished', handleGameFinishedCustom as EventListener);
        };
      }, [isMultiplayer, socket, currentUserId]); // Removed playersLoaded and allPlayers.length to prevent constant re-setup

      // Multiplayer: Request game state on mount
      useEffect(() => {
        if (!isMultiplayer || !socket || !currentUserId || currentRoom) return;
        
        const requestGameState = () => {
          if (socket?.connected && currentUserId) {
            socket.emit('getGameState', { userId: currentUserId });
          }
        };
        
        if (socket?.connected) {
          requestGameState();
        } else {
          const handleConnect = () => {
            requestGameState();
            socket?.off('connect', handleConnect);
          };
          socket?.on('connect', handleConnect);
          setTimeout(requestGameState, 500);
        }
      }, [isMultiplayer, socket, currentUserId, currentRoom]);

      // Rematch countdown timer
      useEffect(() => {
        if (!isMultiplayer || !rematchAvailable || rematchCountdown <= 0) {
          if (rematchCountdown <= 0 && rematchAvailable) {
            // Countdown expired - mark as expired and hide button
            rematchExpiredRef.current = true;
            setRematchAvailable(false);
            setRematchRequested(false);
          }
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
          return;
        }

        rematchCountdownRef.current = setInterval(() => {
          setRematchCountdown((prev) => {
            if (prev <= 1) {
              // Countdown expired - mark as expired and hide button forever
              rematchExpiredRef.current = true;
              setRematchAvailable(false);
              setRematchRequested(false);
              if (rematchCountdownRef.current) {
                clearInterval(rematchCountdownRef.current);
                rematchCountdownRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
        };
      }, [isMultiplayer, rematchAvailable, rematchCountdown]);

      // Trigger rematch countdown when game finishes (fallback)
      useEffect(() => {
        if (!isMultiplayer || !mpIsFinished || !currentRoom) return;
        
        // CRITICAL: Don't reset if rematch countdown has already expired
        if (rematchExpiredRef.current) {
          console.log('[Rematch] Rematch countdown already expired, not resetting');
          return;
        }
        
        // Only start if rematch is not already available (avoid duplicate starts)
        if (!rematchAvailable && currentRoom.players.length >= 2) {
          console.log('[Rematch] Game finished - starting rematch countdown. Players:', currentRoom.players.length);
          // CRITICAL: Check ref FIRST - if rematch request is pending, don't touch modal state at all
          if (rematchRequestPendingRef.current) {
            console.log('[Rematch] useEffect - rematch request pending, skipping state reset');
            // Still set rematchAvailable and countdown, but don't touch modal state
            setRematchAvailable(true);
            setRematchCountdown(20);
            return;
          }
          
          // Only reset rematchRequested if we're starting fresh (no modal showing and no pending request)
          if (!showRematchModal && !rematchRequestPendingRef.current) {
            setRematchRequested(false);
          }
          setRematchAvailable(true);
          setRematchCountdown(20);
        }
      }, [isMultiplayer, mpIsFinished, currentRoom?.players.length, rematchAvailable, showRematchModal]);

      // Debug: Track rematch modal state changes
      useEffect(() => {
        console.log('[Rematch] Modal state changed - showRematchModal:', showRematchModal, 'requesterName:', rematchRequesterName);
        // Log stack trace to see what's changing it
        if (showRematchModal === false && rematchRequesterName) {
          console.trace('[Rematch] Modal was set to false - stack trace:');
        }
      }, [showRematchModal, rematchRequesterName]);

      // Player leave detection for rematch
      useEffect(() => {
        if (!isMultiplayer || !rematchAvailable || !currentRoom) return;

        // Check if player count dropped below 2
        if (currentRoom.players.length < 2) {
          rematchRequestPendingRef.current = false; // Clear ref
          setRematchAvailable(false);
          setRematchRequested(false);
          setRematchCountdown(0);
          setShowRematchModal(false);
          if (rematchCountdownRef.current) {
            clearInterval(rematchCountdownRef.current);
            rematchCountdownRef.current = null;
          }
        }
      }, [isMultiplayer, rematchAvailable, currentRoom?.players.length]);

      useEffect(() => {
        // Skip grid loading in multiplayer mode (grid comes from server)
        if (isMultiplayer) return;
        
        if (allPlayers.length === 0) return; // Don't load grid until players are loaded
        
        console.log(`🎯 Loading TicTacToe grid for league: ${league}`);
        setLoading(true);
        setError(null);
        
        axios.get(`${API_BASE_URL}/tictactoe/categories/grid?league=${league}`)
          .then(res => {
            setTopCategories(res.data.top);
            setLeftCategories(res.data.left);
            setPairs(res.data.pairs);
            
            // Log complete details of all 6 categories to demonstrate league filtering
            console.log('═'.repeat(80));
            console.log(`🏆 COMPLETE CATEGORY DETAILS FOR LEAGUE: ${league.toUpperCase()}`);
            console.log('═'.repeat(80));
            
            console.log('📋 TOP CATEGORIES (3 categories):');
            res.data.top.forEach((category: any, index: number) => {
              console.log(`   ${index + 1}. ${category.name}`);
              console.log(`      └─ Complete Object:`, JSON.stringify(category, null, 6));
            });
            
            console.log('📋 LEFT CATEGORIES (3 categories):');
            res.data.left.forEach((category: any, index: number) => {
              console.log(`   ${index + 1}. ${category.name}`);
              console.log(`      └─ Complete Object:`, JSON.stringify(category, null, 6));
            });
            
            console.log('═'.repeat(80));
            console.log(`✅ TOTAL: ${res.data.top.length + res.data.left.length} categories loaded for ${league}`);
            console.log('═'.repeat(80));
            
            if (res.data.cannotMatch) {
              console.log('🚫 CannotMatch Data for Selected Categories:');
              for (const category of [...res.data.top, ...res.data.left]) {
                const categoryId = category.categoryId;
                const cannotMatchList = res.data.cannotMatch[categoryId] || [];
                console.log(`   ${category.name} (ID: ${categoryId})`);
                console.log(`      Cannot match with IDs: [${cannotMatchList.join(', ')}]`);
              }
            }
            
            setLoading(false);
            setDataReady(true);
          })
          .catch(err => {
            console.error('❌ Error loading grid categories:', err);
            setError(`Failed to load grid categories: ${err.response?.data?.message || err.message}`);
            setLoading(false);
          });
      }, [league, allPlayers.length, isMultiplayer]); // Only depend on league and players count

      // Real-time suggestions as user types
      useEffect(() => {
        if (!modalOpen || !activePair || !search) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        // Generate suggestions based on search input
        const searchTerm = search.toLowerCase().trim();
        if (searchTerm.length < 2) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        // Filter players for suggestions (more aggressive matching)
        const filteredSuggestions = allPlayers
          .filter((player: any) => {
            const playerName = player['Player Name']?.toLowerCase() || '';
            return playerName.includes(searchTerm);
          })
          .slice(0, 8) // Limit to 8 suggestions for better UX
          .sort((a: any, b: any) => {
            // Sort by relevance (exact matches first, then starts with, then contains)
            const aName = a['Player Name']?.toLowerCase() || '';
            const bName = b['Player Name']?.toLowerCase() || '';
            
            if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
            if (!aName.startsWith(searchTerm) && bName.startsWith(searchTerm)) return 1;
            if (aName === searchTerm && bName !== searchTerm) return -1;
            if (aName !== searchTerm && bName === searchTerm) return 1;
            
            return aName.localeCompare(bName);
          });

        setSuggestions(filteredSuggestions);
        setShowSuggestions(filteredSuggestions.length > 0);
        
      }, [search, allPlayers, modalOpen, activePair]);

      // Reset modalShouldClose flag when modal closes
      useEffect(() => {
        if (!modalOpen) {
          // Reset the close flag when modal is closed to allow it to open again
          setModalShouldClose(false);
        }
      }, [modalOpen]);

      // Multiplayer: Redirect to lobby if room is back to waiting state (handles draw acceptance, etc.)
      // This is a fallback in case gameReset event doesn't fire or is missed
      useEffect(() => {
        if (isMultiplayer && currentRoom?.status === 'waiting') {
          // Check if gameState is missing (was reset) - this indicates we should redirect
          const hasNoGameState = !mpGameState || !currentRoom.gameState;
          const wasPlaying = currentRoom.players.some((p: any) => p.symbol !== null); // Players had symbols = game was playing
          
          if (hasNoGameState && wasPlaying && currentRoom.players.length > 0) {
            // Room was reset from playing state to waiting - redirect to lobby
            isRedirectingRef.current = true; // Set flag to prevent loading screens
            const redirectTimer = setTimeout(() => {
              window.location.href = '/tictactoe-leagues';
            }, 500); // Reduced delay for faster redirect
            return () => clearTimeout(redirectTimer);
          }
        }
      }, [isMultiplayer, currentRoom?.status, mpGameState, currentRoom?.gameState, currentRoom?.players]);

      // Filter players for the modal when modal is open, activePair or search changes
      useEffect(() => {
        if (!modalOpen || !activePair) return;
        setPlayersLoading(true);
        setPlayersError(null);
        
        // Use pre-loaded players instead of making API calls
        let filteredPlayers = allPlayers;
        
        // Filter by search term if provided
        if (search) {
          filteredPlayers = allPlayers.filter((player: any) =>
            player['Player Name']?.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        // Limit to first 50 players for performance
        filteredPlayers = filteredPlayers.slice(0, 50);
        
        setPlayers(filteredPlayers);
        setPlayersLoading(false);
        
      }, [modalOpen, search, activePair, allPlayers]);

      // Timer effect: start/reset on turn change, but only if dataReady (single-player only)
      useEffect(() => {
        if (isMultiplayer) return; // Timer is handled by server in multiplayer
        if (!dataReady) return; // Don't start timer until data is ready
        setTurnTimer(20);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTurnTimer(prev => {
            if (prev === 1) {
              clearInterval(timerRef.current!);
              setShowSkipConfirmation(false); // close skip modal if open
              setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
              setModalOpen(false);
              setSearch("");
              setActivePair(null);
              setActiveCell(null);
              return 20;
            }
            return prev - 1;
          });
        }, 1000);
        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      }, [currentTurn, winner, draw, dataReady, isMultiplayer]);
      
      // Multiplayer: Update timer from server
      useEffect(() => {
        if (!isMultiplayer || mpTimer === undefined) return;
        setTurnTimer(mpTimer);
      }, [isMultiplayer, mpTimer]);

      // Multiplayer: Close modal when turn changes (timer expires or turn advances)
      useEffect(() => {
        if (!isMultiplayer) return;
        
        // If modal is open but it's no longer player's turn, close the modal
        if (modalOpen && !mpIsMyTurn) {
          setModalShouldClose(true);
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActiveCell(null);
          setShowSuggestions(false);
        }
      }, [isMultiplayer, modalOpen, mpIsMyTurn]);

      // Multiplayer: Use multiplayer state
      const displayTopCategories = isMultiplayer ? mpTopCategories : topCategories;
      const displayLeftCategories = isMultiplayer ? mpLeftCategories : leftCategories;
      const displayPairs = isMultiplayer ? mpPairs : pairs;
      const displayCellStates = isMultiplayer ? (mpCellStates || cellStates) : cellStates;
      const displayTurn = isMultiplayer ? (currentTurnSymbol || 'X') : currentTurn;
      const displayTimer = isMultiplayer ? (mpTimer ?? 20) : turnTimer;
      const displayGameWins = isMultiplayer ? mpGameWins : { player1: player1Wins, player2: player2Wins };
      
      // Multiplayer: Get player names for display
      const player1Name = useMemo(() => {
        if (!isMultiplayer || !currentRoom) return 'Player 1';
        const player = currentRoom.players.find(p => (p as any)?.symbol === 'X');
        return player?.username || 'Player 1';
      }, [isMultiplayer, currentRoom]);
      
      const player2Name = useMemo(() => {
        if (!isMultiplayer || !currentRoom) return 'Player 2';
        const player = currentRoom.players.find(p => (p as any)?.symbol === 'O');
        return player?.username || 'Player 2';
      }, [isMultiplayer, currentRoom]);
      
      const player1WinsCount = isMultiplayer ? (displayGameWins[currentRoom?.players.find(p => (p as any)?.symbol === 'X')?.userId || ''] || 0) : player1Wins;
      const player2WinsCount = isMultiplayer ? (displayGameWins[currentRoom?.players.find(p => (p as any)?.symbol === 'O')?.userId || ''] || 0) : player2Wins;
      
      // Get current game scores for multiplayer
      const player1CurrentScore = isMultiplayer ? (mpScores[currentRoom?.players.find(p => (p as any)?.symbol === 'X')?.userId || ''] || 0) : player1Score;
      const player2CurrentScore = isMultiplayer ? (mpScores[currentRoom?.players.find(p => (p as any)?.symbol === 'O')?.userId || ''] || 0) : player2Score;

      // Don't show opponent left modal - let the game over screen handle it with the disconnect message

      // Show leave confirmation modal
      if (showLeaveConfirmation) {
        return (
          <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-gradient-to-b from-[#111827] to-black relative">
            {/* Modal Overlay */}
            <div className="absolute inset-0 bg-black/80 z-40"></div>
            
            {/* Modal Content */}
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
                    if (mpLeaveRoom) {
                      await mpLeaveRoom();
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

      // Multiplayer: Show winner screen if series is finished
      if (isMultiplayer && mpIsFinished && mpSeriesWinner) {
        const winnerName = currentRoom?.players.find(p => p.userId === mpSeriesWinner)?.username || 'Winner';
        
        return (
          <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-gradient-to-b from-[#111827] to-black relative">
            {/* Rematch Request Modal - Render on top of game over screen */}
            {showRematchModal && rematchRequesterName && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
                <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
                  <h2 className="text-2xl font-bold mb-4">Rematch Request</h2>
                  <p className="mb-6">
                    <span className="font-semibold">{rematchRequesterName}</span> requested a rematch!
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={async () => {
                        if (socket && currentUserId) {
                          setShowRematchModal(false);
                          socket.emit('acceptRematch', { userId: currentUserId });
                        }
                      }}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={async () => {
                        if (socket && currentUserId) {
                          setShowRematchModal(false);
                          socket.emit('declineRematch', { userId: currentUserId });
                        }
                      }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw Request Confirmation Modal (for opponent) - Render on top of game over screen */}
            {showDrawConfirmation && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
                <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
                  <h2 className="text-2xl font-bold mb-4">Draw Request</h2>
                  <p className="mb-6">
                    {drawRequested === 'X' ? 'Player 1' : 'Player 2'} has requested a draw. Do you want to accept?
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleDrawConfirmation(true)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleDrawConfirmation(false)}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw Request Sent Modal (for requester) - Render on top of game over screen */}
            {showDrawRequestSent && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
                <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
                  <h2 className="text-2xl font-bold mb-4">Draw Request Sent</h2>
                  <p className="mb-6">
                    Your draw request has been sent. Waiting for opponent's response...
                  </p>
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw Accepted Modal (shown while loading new grid) - Render on top of game over screen */}
            {showDrawAccepted && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
                <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
                  <h2 className="text-2xl font-bold mb-4">Draw Accepted</h2>
                  <p className="mb-6">
                    Both players have agreed to a draw. Loading new grid...
                  </p>
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                  </div>
                </div>
              </div>
            )}
            
            <h2 className="text-2xl font-bold">🎉 Game Over</h2>
            
            <div className="text-center">
              <p className="text-lg text-white/80">
                {(() => {
                  const isWinner = mpSeriesWinner === currentUserId;
                  const isDisconnectWin = wonByDisconnect || wonByDisconnectRef.current;
                  
                  if (isWinner) {
                    return isDisconnectWin
                      ? '🏆 Congratulations! You won the series due to other player disconnecting mid game!'
                      : '🏆 Congratulations! You won the series!';
                  } else {
                    return `🏆 Series Winner: ${winnerName}`;
                  }
                })()}
              </p>
              {mpGameWins && mpSeriesWinner && (
                <p className="text-sm text-white/60 mt-1">
                  Final Score: {mpGameWins[mpSeriesWinner] || 0} wins
                </p>
              )}
            </div>

            {mpGameWins && Object.keys(mpGameWins).length > 0 && (
              <div className="bg-white/10 rounded-lg p-4 mt-4">
                <h3 className="text-lg font-bold mb-2">Final Scores</h3>
                <div className="space-y-2">
                  {currentRoom?.players.map((player) => (
                    <div
                      key={player.userId}
                      className={`flex justify-between items-center p-2 rounded ${
                        player.userId === mpSeriesWinner ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'
                      }`}
                    >
                      <span>{player.username}</span>
                      <span className="font-bold">{mpGameWins[player.userId] || 0} wins</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-4 flex-wrap justify-center">
              {rematchAvailable && rematchCountdown > 0 && !rematchRequested && (
                <button
                  onClick={async () => {
                    if (socket && currentUserId) {
                      console.log('[Rematch] Rematch button clicked. Emitting rematchRequest event');
                      console.log('[Rematch] Socket connected:', socket.connected);
                      console.log('[Rematch] Socket id:', socket.id);
                      // Store current countdown value before requesting rematch
                      rematchCountdownWhenRequestedRef.current = rematchCountdown;
                      setRematchRequested(true);
                      
                      // Listen for error response
                      const errorHandler = (error: any) => {
                        console.error('[Rematch] Error from server:', error);
                        setRematchRequested(false);
                        // Restore countdown on error
                        const savedCountdown = rematchCountdownWhenRequestedRef.current;
                        if (savedCountdown > 0) {
                          setRematchCountdown(savedCountdown);
                          rematchCountdownWhenRequestedRef.current = 0;
                        }
                      };
                      socket.once('error', errorHandler);
                      
                      socket.emit('rematchRequest', { userId: currentUserId });
                      console.log('[Rematch] rematchRequest event emitted');
                      
                      // Remove error handler after 5 seconds
                      setTimeout(() => {
                        socket.off('error', errorHandler);
                      }, 5000);
                    }
                  }}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Rematch ({rematchCountdown}s)
                </button>
              )}
              {rematchRequested && (
                <button
                  disabled
                  className="px-6 py-2 bg-green-600/50 text-white rounded-lg font-semibold cursor-not-allowed"
                >
                  Waiting for response...
                </button>
              )}
              <button
                onClick={async () => {
                  try {
                    if (mpResetGame) {
                      await mpResetGame();
                      // The gameReset event will handle redirect, but fallback here just in case
                      setTimeout(() => {
                        window.location.href = '/tictactoe-leagues';
                      }, 500);
                    } else {
                      // Fallback if resetGame not available
                      window.location.href = '/tictactoe-leagues';
                    }
                  } catch (error) {
                    console.error('❌ Error resetting game:', error);
                    // Redirect anyway
                    window.location.href = '/tictactoe-leagues';
                  }
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                New Game
              </button>
              <button
                onClick={async () => {
                  if (mpLeaveRoom) {
                    await mpLeaveRoom();
                  }
                  window.location.href = '/';
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      }

      // Multiplayer: Show loading if players aren't loaded yet
      if (isMultiplayer && !playersLoaded) {
        return (
          <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#181A2A]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600]"></div>
            <h2 className="text-2xl font-bold text-[#ffd600]">Loading Players...</h2>
            <p className="text-lg text-white/80">Please wait while we fetch all players for the game</p>
          </div>
        );
      }
      
      if (loading && !isMultiplayer) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading categories...</div>;
      }
      if ((error || displayTopCategories.length < 3 || displayLeftCategories.length < 3) && !isMultiplayer) {
        return <div className="min-h-screen flex items-center justify-center text-red-400">{error || "Not enough categories in DB (need at least 6)"}</div>;
      }
      
      // Multiplayer: If room is back to waiting state (lobby), show redirect message
      // Also check if gameState was cleared (indicates reset/redirect scenario)
      // Skip showing loading if we're already redirecting
      const isRoomReset = isMultiplayer && currentRoom && !isRedirectingRef.current && (
        currentRoom.status === 'waiting' && !mpGameState ||
        (!mpGameState && currentRoom.players.some((p: any) => p.symbol !== null)) // Had symbols but gameState is gone = reset
      );
      
      if (isRoomReset) {
        return (
          <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#181A2A]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600]"></div>
            <h2 className="text-2xl font-bold text-[#ffd600]">Returning to lobby...</h2>
          </div>
        );
      }

      // Multiplayer: Show loading if game data isn't ready (but room is still in playing/starting state)
      // Only show this if we're NOT in a reset scenario (gameState exists but categories are loading)
      // Skip if we're redirecting or if we just received an answer result (state is updating)
      const timeSinceLastAnswer = Date.now() - lastAnswerResultTimeRef.current;
      const justReceivedAnswer = timeSinceLastAnswer < 1000; // Within last 1 second
      
      if (isMultiplayer && 
          !isRedirectingRef.current &&
          !justReceivedAnswer && // Don't show loading immediately after answer result
          (currentRoom?.status === 'playing' || currentRoom?.status === 'starting') && 
          mpGameState && // Only show loading if gameState exists (not reset scenario)
          (!mpTopCategories || mpTopCategories.length === 0 || !mpLeftCategories || mpLeftCategories.length === 0)) {
        return (
          <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#181A2A]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600]"></div>
            <h2 className="text-2xl font-bold text-[#ffd600]">Loading Game...</h2>
            <p className="text-lg text-white/80">Setting up the game grid</p>
          </div>
        );
      }

      // Helper to find the pair object for a given cell
      function findPair(cat1: { name: string; slug: string; categoryId: number }, cat2: { name: string; slug: string; categoryId: number }) {
        return displayPairs.find(
          (p: { categories: string[]; players: string[] }) => (p.categories[0] === cat1.name && p.categories[1] === cat2.name) ||
               (p.categories[1] === cat1.name && p.categories[0] === cat2.name)
        );
      }

      // Helper to get category icon path based on categoryId and league
      function getCategoryIconPath(categoryId: number): string {
        // Base path for tictactoe images
        const basePath = '/tictactoeimg';
        
        // Determine which league folder to use based on current league
        let leagueFolder = 'bundesligaicons'; // Default
        
        if (league === 'superlig') {
          leagueFolder = 'slicons';
        } else if (league === 'laliga') {
          leagueFolder = 'laligaicons';
        } else if (league === 'premier-lig') {
          leagueFolder = 'plicons';
        } else if (league === 'serie-a') {
          leagueFolder = 'serieaicons';
        }
        // Return the image path using the categoryId directly
        return `${basePath}/${leagueFolder}/${categoryId}.png`;
      }

      // Helper: check for win
      function checkWin(cells: CellState[][], sign: 'X' | 'O'): boolean {
        // Rows
        for (let i = 0; i < 3; i++) {
          if (cells[i][0].image === sign && cells[i][1].image === sign && cells[i][2].image === sign) return true;
        }
        // Columns
        for (let j = 0; j < 3; j++) {
          if (cells[0][j].image === sign && cells[1][j].image === sign && cells[2][j].image === sign) return true;
        }
        // Diagonals
        if (cells[0][0].image === sign && cells[1][1].image === sign && cells[2][2].image === sign) return true;
        if (cells[0][2].image === sign && cells[1][1].image === sign && cells[2][0].image === sign) return true;
        return false;
      }

      // Helper: check for draw
      function checkDraw(cells: CellState[][]): boolean {
        return cells.flat().every(cell => cell.locked);
      }

      // On cell click, open modal and store cell coordinates
      function handleCellClick(row: number, col: number) {
        // Multiplayer: Use multiplayer click handler
        if (isMultiplayer && clickTictactoeCell && mpIsMyTurn) {
          // Check if players are loaded before allowing cell click
          if (!playersLoaded || allPlayers.length === 0) {
            console.error('❌ [Frontend] Players not loaded yet, cannot click cell');
            return;
          }
          
          const currentCells = mpCellStates || cellStates;
          if (currentCells[row]?.[col]?.locked) {
            return;
          }

          // Try to open modal directly as fallback
          const topCat = mpTopCategories[col];
          const leftCat = mpLeftCategories[row];
          if (topCat && leftCat && playersLoaded && allPlayers.length > 0) {
            const pair = mpPairs?.find(
              (p: { categories: string[]; players: string[] }) => 
                (p.categories[0] === topCat.name && p.categories[1] === leftCat.name) ||
                (p.categories[1] === topCat.name && p.categories[0] === leftCat.name)
            );
            if (pair) {
              console.log('✅ Valid answers for', topCat.name, '+', leftCat.name, ':', pair.players);
            } else {
              console.log('❌ [Frontend] Pair not found for', topCat.name, '+', leftCat.name);
            }
            setModalShouldClose(false); // Reset close flag when opening modal
            setModalOpen(true);
            setActivePair([topCat.name, leftCat.name]);
            setActiveCell({ row, col });
            setSearch("");
            setShowSuggestions(false);
          }

          clickTictactoeCell(row, col);
          return;
        }
        
        // Single-player mode
        if (cellStates[row][col].locked) return;
        const pair = findPair(topCategories[col], leftCategories[row]);
        if (pair) {
          console.log('Valid answers for', topCategories[col].name, '+', leftCategories[row].name, ':', pair.players);
          console.log('Player justifications:', pair.playerJustifications);
        }
        setModalShouldClose(false); // Reset close flag when opening modal
        setModalOpen(true);
        setActivePair([topCategories[col].name, leftCategories[row].name]);
        setActivePairJustifications(pair?.playerJustifications || null);
        setActiveCell({ row, col });
        setSearch(""); // Clear search when opening modal
        setShowSuggestions(false); // Hide suggestions when opening modal
      }

      // Handle suggestion selection
      function handleSuggestionSelect(playerName: string) {
        setSearch(playerName);
        setShowSuggestions(false);
        // Auto-select the player after a short delay
        setTimeout(() => {
          handlePlayerSelect(playerName);
        }, 100);
      }

      // Reset board and fetch new grid
      function resetBoard() {
        setCellStates(Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({ locked: false, image: null, answer: null }))));
        setCurrentTurn('X');
        setPlayer1Score(0);
        setPlayer2Score(0);
        setModalOpen(false);
        setSearch("");
        setActivePair(null);
        setActiveCell(null);
        setLoading(true);
        console.log(`🔄 Resetting board and loading new grid for league: ${league}`);
        axios.get(`${API_BASE_URL}/tictactoe/categories/grid?league=${league}`)
          .then(res => {
            setTopCategories(res.data.top);
            setLeftCategories(res.data.left);
            setPairs(res.data.pairs);
            
            // Log complete details of all 6 categories to demonstrate league filtering
            console.log('═'.repeat(80));
            console.log(`🏆 COMPLETE CATEGORY DETAILS FOR LEAGUE: ${league.toUpperCase()}`);
            console.log('═'.repeat(80));
            
            console.log('📋 TOP CATEGORIES (3 categories):');
            res.data.top.forEach((category: any, index: number) => {
              console.log(`   ${index + 1}. ${category.name}`);
              console.log(`      └─ Complete Object:`, JSON.stringify(category, null, 6));
            });
            
            console.log('📋 LEFT CATEGORIES (3 categories):');
            res.data.left.forEach((category: any, index: number) => {
              console.log(`   ${index + 1}. ${category.name}`);
              console.log(`      └─ Complete Object:`, JSON.stringify(category, null, 6));
            });
            
            console.log('═'.repeat(80));
            console.log(`✅ TOTAL: ${res.data.top.length + res.data.left.length} categories loaded for ${league}`);
            console.log('═'.repeat(80));
            
            if (res.data.cannotMatch) {
              console.log('🚫 CannotMatch Data for Selected Categories:');
              for (const category of [...res.data.top, ...res.data.left]) {
                const categoryId = category.categoryId;
                const cannotMatchList = res.data.cannotMatch[categoryId] || [];
                console.log(`   ${category.name} (ID: ${categoryId})`);
                console.log(`      Cannot match with IDs: [${cannotMatchList.join(', ')}]`);
              }
            }
            
            setLoading(false);
          })
          .catch(err => {
            console.error('❌ Error loading grid categories in resetBoard:', err);
            setError(`Failed to load grid categories: ${err.response?.data?.message || err.message}`);
            setLoading(false);
          });
      }

      // On player select in modal
      function handlePlayerSelect(playerName: string) {
        if (!activePair || !activeCell) return;
        
        // Multiplayer: Use multiplayer submit handler
        if (isMultiplayer) {
          
          if (!submitTictactoeAnswer) {
            console.error('❌ [Frontend] submitTictactoeAnswer not available!');
            return;
          }
          
          // Store cell info in ref before clearing for comparison
          const submittedCell = { row: activeCell.row, col: activeCell.col };
          submittedCellRef.current = submittedCell;
          
          // Force close modal immediately using flushSync for synchronous updates
          flushSync(() => {
            setModalShouldClose(true);
            setModalOpen(false);
            setSearch("");
            setActivePair(null);
            setActiveCell(null);
            setShowSuggestions(false);
          });
          
          // Submit answer
          submitTictactoeAnswer(playerName, submittedCell.row, submittedCell.col).then(() => {
            // Clear cell ref after a delay to allow answer processing
            setTimeout(() => {
              submittedCellRef.current = null;
              setModalShouldClose(false);
            }, 2000);
          }).catch(() => {
            // Clear cell ref on error too
            submittedCellRef.current = null;
            setModalShouldClose(false);
          });
          return;
        }
        
        // Single-player mode
        // Find valid answers for this cell from the grid data
        const pair = findPair(
          { name: activePair[0], slug: '', categoryId: 0 }, 
          { name: activePair[1], slug: '', categoryId: 0 }
        );
        
        // Check if the selected player is a correct answer
        const isCorrectAnswer = pair && pair.players.includes(playerName);
        
        // Store cell info before clearing
        const cellInfo = { row: activeCell.row, col: activeCell.col };
        
        // Close modal immediately when answer is submitted using flushSync
        flushSync(() => {
          setModalShouldClose(true);
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActivePairJustifications(null);
          setActiveCell(null);
          setShowSuggestions(false);
          setSuggestions([]);
          setShowJustifications(false);
        });
        
        if (isCorrectAnswer) {
          // Correct answer: lock cell, set image, set answer, alternate turn, increment score
          setCellStates(prev => {
            const newStates = prev.map(row => row.map(cell => ({ ...cell })));
            newStates[cellInfo.row][cellInfo.col] = {
              locked: true,
              image: currentTurn,
              answer: playerName
            };
            // Check for win after updating the cell
            if (checkWin(newStates, currentTurn)) {
              const winnerName = currentTurn === 'X' ? 'Player 1' : 'Player 2';
              setPendingWin(winnerName);
              setTimeout(() => {
                setWinner(winnerName);
                if (currentTurn === 'X') {
                  setPlayer1Wins(prev => {
                const updated = prev + 1;
                if (updated === 3) {
                  setTimeout(() => router.push('/'), 2000); // Redirect to homepage after showing modal
                } else {
                  setTimeout(() => {
                    setWinner(null);
                    resetBoard();
                  }, 2000);
                }
                return updated;
              });
            } else {
              setPlayer2Wins(prev => {
                const updated = prev + 1;
                if (updated === 3) {
                setTimeout(() => router.push('/'), 2000);
                  } else {
                setTimeout(() => {
                  setWinner(null);
                  resetBoard();
                }, 2000); // Winner modal duration
                }
                return updated;
              });
            }
            setPendingWin(null);
              }, 5000); // Show grid for 5 seconds before modal
            } else if (checkDraw(newStates)) {
              setDraw(true);
              setTimeout(() => {
                setDraw(false);
                resetBoard();
              }, 2000);
            }
            // Only increment per-round score if not a win
            // if (currentTurn === 'X') {
            //   setPlayer1Score(s => s + 1);
            // } else {
            //   setPlayer2Score(s => s + 1);
            // }
            return newStates;
          });
          setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
        } else {
          // Wrong answer: skip turn (modal already closed)
          setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
        }
      }

      function handleSkip() {
        setShowSkipConfirmation(true);
      }

      function confirmSkip(confirmed: boolean) {
        setShowSkipConfirmation(false);
        if (confirmed) {
          setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
          setModalOpen(false);
          setSearch("");
          setActivePair(null);
          setActivePairJustifications(null);
          setActiveCell(null);
          setShowSuggestions(false);
          setSuggestions([]);
          setShowJustifications(false);
        }
        // If not confirmed, do nothing (let user try again)
      }

        // Handle draw request
      function handleDrawRequest() {
        // Multiplayer: send draw request to server
        if (isMultiplayer) {
          if (!socket || !currentUserId) return;
          if (!mpIsMyTurn) return;
          if (mpIsDrawPending) return;

          socket.emit('requestDraw', { userId: currentUserId });
          return;
        }

        // Single-player: local draw request between X and O
        setDrawRequested(currentTurn);
        // Skip current player's turn and show draw request to other player
        setCurrentTurn(t => (t === 'X' ? 'O' : 'X'));
        setShowDrawConfirmation(true);
      }

  // Handle second player's draw confirmation
  function handleDrawConfirmation(confirmed: boolean) {
    // Multiplayer: send response to server
    if (isMultiplayer) {
      if (!socket || !currentUserId) return;

      socket.emit('respondDraw', { userId: currentUserId, accept: confirmed });

      // Close local confirmation; backend events will handle further UI
      setShowDrawConfirmation(false);
      return;
    }

    // Single-player behaviour
    setShowDrawConfirmation(false);
    setDrawRequested(null);
    
    if (confirmed) {
      // Second player agreed to draw
      setDraw(true);
      setTimeout(() => {
        setDraw(false);
        resetBoard();
      }, 2000);
    }
    // If second player declined, game continues normally with current turn
  }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#181A2A] text-white py-2">
          {/* Header */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <span className="bg-[#222] px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                <span>{player1Name}</span>
                <span className="bg-green-700 px-2 py-1 rounded ml-2">{player1WinsCount}-{player2WinsCount}</span>
                <span>{player2Name}</span>
              </span>
              <span className="bg-green-400 text-black font-bold px-3 py-1 rounded ml-2 min-w-[48px] text-lg flex items-center justify-center" style={{letterSpacing: '1px'}}>
                {`0:${displayTimer.toString().padStart(2, '0')}`}
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <span className="bg-white text-black font-bold rounded px-4 py-2 text-sm border border-[#e5e7eb] shadow-sm" style={{minWidth: '110px', letterSpacing: '1px'}}>
                {isMultiplayer 
                  ? (mpIsMyTurn ? 'YOUR TURN' : `${currentRoom?.players.find(p => p.userId === mpCurrentTurnUserId)?.username || 'Waiting...'} TURN`)
                  : (displayTurn === 'X' ? `${player1Name} TURN` : `${player2Name} TURN`)
                }
              </span>
              <span
                className={`px-4 py-2 rounded text-sm font-bold ${
                  isMultiplayer
                    ? mpIsMyTurn
                      ? 'bg-red-500 cursor-pointer hover:bg-red-600'
                      : 'bg-red-500/60 cursor-not-allowed opacity-60'
                    : 'bg-red-500 cursor-pointer hover:bg-red-600'
                }`}
                onClick={
                  isMultiplayer
                    ? mpIsMyTurn
                      ? () => mpSkipTurn?.()
                      : undefined
                    : handleSkip
                }
              >
                SKIP
              </span>
              <button 
                onClick={
                  isMultiplayer
                    ? (mpIsMyTurn && !mpIsDrawPending ? handleDrawRequest : undefined)
                    : handleDrawRequest
                }
                className={
                  isMultiplayer
                    ? `px-5 py-2 rounded text-sm font-bold transition-colors ${
                        mpIsMyTurn && !mpIsDrawPending
                          ? 'bg-orange-400 cursor-pointer hover:bg-orange-500'
                          : 'bg-orange-400/60 cursor-not-allowed opacity-60'
                      }`
                    : 'bg-orange-400 px-5 py-2 rounded text-sm font-bold cursor-pointer hover:bg-orange-500 transition-colors'
                }
              >
                REQUEST DRAW
              </button>
            </div>
          </div>
          <div className="w-full max-w-5xl rounded-lg shadow-lg overflow-hidden bg-[#23233a] p-4">
            {/* Top row: categories (top headers) */}
            <div className="flex mb-2" style={{ height: 120 }}>
              <div className="w-[180px] flex flex-col items-center justify-center">
                {/* KI-TAKA-TOE Logo in top-left corner */}
                <Image
                  src="/tictactoeimg/kitakatloe-logo.png"
                  alt="KI-TAKA-TOE"
                  width={64}
                  height={64}
                  className="mb-3"
                  style={{ objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-sm text-white text-center font-semibold">KI-TAKA-TOE</span>
              </div>
              {displayTopCategories.map((cat: { name: string; slug: string; categoryId: number }, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-center h-full px-1">
                  <Image
                    src={getCategoryIconPath(cat.categoryId)}
                    alt={cat.name}
                    width={56}
                    height={56}
                    className="mb-2"
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-center w-full break-words leading-tight text-sm font-bold" style={{ lineHeight: '1.2' }}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
            {/* 3 rows: each with left category and 3 grid boxes */}
            {displayLeftCategories.map((leftCat: { name: string; slug: string; categoryId: number }, row: number) => (
              <div key={row} className="flex items-center" style={{ minHeight: 120 }}>
                <div className="w-[180px] flex flex-col items-center justify-center px-2">
                  <Image
                    src={getCategoryIconPath(leftCat.categoryId)}
                    alt={leftCat.name}
                    width={56}
                    height={56}
                    className="mb-2"
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-bold text-center w-full break-words leading-tight" style={{ lineHeight: '1.2' }}>
                    {leftCat.name}
                  </span>
                </div>
                {displayTopCategories.map((topCat: { name: string; slug: string; categoryId: number }, col: number) => {
                  const pair = findPair(topCat, leftCat);
                  const cell = displayCellStates[row]?.[col] || { locked: false, image: null, answer: null };
                  return (
                    <div
                      key={col}
                      className={`flex-1 flex flex-col items-center justify-center border-2 border-[#2e2e4d] rounded-none min-h-[80px] max-h-[100px] aspect-square transition text-base font-bold ${cell.locked ? 'bg-green-500 cursor-not-allowed' : (isMultiplayer && !mpIsMyTurn ? 'bg-green-600 cursor-not-allowed opacity-50' : 'bg-green-600 cursor-pointer hover:bg-green-700')}`}
                      onClick={() => !isMultiplayer || mpIsMyTurn ? handleCellClick(row, col) : undefined}
                    >
                      {cell.locked ? (
                        <>
                          <Image
                            src={cell.image === 'X' ? "/cross_image-tictactoe.png" : "/circle_image-tictactoe.png"}
                            alt={cell.image === 'X' ? 'X' : 'O'}
                            width={48}
                            height={48}
                            className="mb-1"
                          />
                          <span className="text-xs text-green-200 mt-1 text-center break-words px-1" style={{ maxWidth: '100%', lineHeight: '1.1' }}>
                            {cell.answer}
                          </span>
                        </>
                      ) : (
                        <>
                          <Image
                            src="/unselected_image_tictactoe.png"
                            alt="Unselected"
                            width={64}
                            height={64}
                            style={{ opacity: 0.7 }}
                          />
                          {/* {pair && <span className="text-xs text-green-200 mt-1">{pair.players.length} players</span>} */}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Modal */}
          {modalOpen && !modalShouldClose && activePair && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white text-black rounded-xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col">
                <h2 className="text-xl font-bold mb-2">Player Search</h2>
                <div className="text-sm mb-2 text-gray-700">Find a player for <b>{activePair[0]}</b> + <b>{activePair[1]}</b></div>
                <div className="relative mb-4">
                  <input
                    className="w-full border-2 border-lime-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400 text-lg"
                    placeholder="Search player..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(search.length >= 2)}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking on them
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    autoFocus
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-lime-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {suggestions.map((player, index) => {
                        const playerName = player['Player Name'] || 'Unknown Player';
                        return (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-lime-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => handleSuggestionSelect(playerName)}
                          >
                            <div className="font-medium text-gray-800">{playerName}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto max-h-48 mb-4 bg-gray-100 rounded-md p-2">
                  {playersLoading ? (
                    <div className="text-gray-500 text-center py-4">Loading players...</div>
                  ) : playersError ? (
                    <div className="text-red-500 text-center py-4">{playersError}</div>
                  ) : players.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No players found.</div>
                  ) : (
                    players.map((p, i) => {
                      const playerName = p['Player Name'] || p.playerName || 'Unknown Player';
                      return (
                        <div
                          key={i}
                          className="flex flex-col gap-1 py-1 px-2 hover:bg-gray-200 rounded cursor-pointer"
                          onClick={() => handlePlayerSelect(playerName)}
                        >
                          <span className="font-bold">{playerName}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* <div className="text-xs text-gray-500 mb-2">Player data was last updated on <b>5th Mar 2025</b></div> */}
                <button
                  className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded font-semibold"
                  onClick={() => { setModalShouldClose(true); setModalOpen(false); setSearch(""); setActivePair(null); setActivePairJustifications(null); setActiveCell(null); setShowSuggestions(false); setSuggestions([]); setShowJustifications(false); }}
                >
                  Cancel
                </button>
                <button
                  className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-gray-700"
                  onClick={() => { setModalShouldClose(true); setModalOpen(false); setSearch(""); setActivePair(null); setActivePairJustifications(null); setActiveCell(null); setShowSuggestions(false); setSuggestions([]); setShowJustifications(false); }}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          {/* Winner Modal */}
          {winner && !pendingWin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative flex flex-col items-center">
                <h2 className="text-3xl font-bold mb-4">{winner} Wins!</h2>
                {isMultiplayer && mpGameWins && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Current Series:</p>
                    <div className="flex gap-4 justify-center">
                      {currentRoom?.players.map((player) => (
                        <div key={player.userId} className="text-center">
                          <p className="font-semibold">{player.username}</p>
                          <p className="text-lg">{mpGameWins[player.userId] || 0} wins</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mb-6">A new game will start shortly...</p>
              </div>
            </div>
          )}
          {/* Draw Modal */}
          {draw && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
              <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative flex flex-col items-center">
                <h2 className="text-3xl font-bold mb-4">It's a Draw!</h2>
                <p className="mb-6">A new game will start shortly...</p>
              </div>
            </div>
          )}

                {/* Draw Request Confirmation Modal (for opponent) */}
      {(() => {
        if (showDrawConfirmation) {
          console.log('[Draw] Rendering draw confirmation modal. drawRequested:', drawRequested);
        }
        return null;
      })()}
      {showDrawConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
            <h2 className="text-2xl font-bold mb-4">Draw Request</h2>
            <p className="mb-6">
              {drawRequested === 'X' ? 'Player 1' : 'Player 2'} has requested a draw. Do you want to accept?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleDrawConfirmation(true)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleDrawConfirmation(false)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Request Sent Modal (for requester) */}
      {showDrawRequestSent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
            <h2 className="text-2xl font-bold mb-4">Draw Request Sent</h2>
            <p className="mb-6">
              Your draw request has been sent. Waiting for opponent's response...
            </p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          </div>
        </div>
      )}

      {/* Leg Win Modal (shown when a player wins a leg, stays until next game loads) */}
      {legWinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-3xl font-bold mb-4">🎉 Leg Won!</h2>
            {legWinModal.isCurrentUser ? (
              <p className="text-xl font-semibold mb-2 text-green-600">You Win This Leg!</p>
            ) : (
              <p className="text-xl font-semibold mb-2 text-green-600">{legWinModal.playerName} Wins This Leg!</p>
            )}
            <p className="text-sm text-gray-600 mb-4">Winning Answer:</p>
            <p className="text-lg font-bold mb-6 bg-green-100 px-4 py-2 rounded">{legWinModal.winningAnswer}</p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              <p className="ml-3 text-gray-600">Loading next round...</p>
            </div>
          </div>
        </div>
      )}

      {/* Draw Accepted Modal (shown while loading new grid) */}
      {showDrawAccepted && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
            <h2 className="text-2xl font-bold mb-4">Draw Accepted</h2>
            <p className="mb-6">
              Both players have agreed to a draw. Loading new grid...
            </p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          </div>
        </div>
      )}
        {/* Skip Confirmation Modal */}
      {showSkipConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Are you sure?</h2>
            <p className="mb-6">Do you really want to skip your turn?</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => confirmSkip(true)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => confirmSkip(false)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rematch Request Modal */}
      {showRematchModal && rematchRequesterName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" style={{ zIndex: 10000 }}>
          <div className="bg-white text-black rounded-xl p-8 max-w-md w-full text-center shadow-2xl relative z-[101]">
            <h2 className="text-2xl font-bold mb-4">Rematch Request</h2>
            <p className="mb-6">
              <span className="font-semibold">{rematchRequesterName}</span> requested a rematch!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={async () => {
                  if (socket && currentUserId) {
                    setShowRematchModal(false);
                    socket.emit('acceptRematch', { userId: currentUserId });
                  }
                }}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Accept
              </button>
              <button
                onClick={async () => {
                  if (socket && currentUserId) {
                    setShowRematchModal(false);
                    socket.emit('declineRematch', { userId: currentUserId });
                  }
                }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      );
    }

    // Main page component with Suspense wrapper
    export default function TictactoePage() {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
          <TictactoePageContent />
        </Suspense>
      );
    }
    
    function TictactoePageContent() {
      const searchParams = useSearchParams();
      const isMultiplayer = searchParams?.get('multiplayer') === 'true';
      
      // Always provide MultiplayerProvider so useMultiplayer hook can be called unconditionally
      // The hook will be available but won't be used when isMultiplayer is false
      return (
        <MultiplayerProvider namespace="/tictactoe-multiplayer">
          <TictactoeGame />
        </MultiplayerProvider>
      );
    } 