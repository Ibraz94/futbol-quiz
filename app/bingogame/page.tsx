'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { API_BASE_URL } from "../../lib/config";
import { GAME_CONFIG } from '../../lib/bingo-config';
import { Category, Player, SelectedPlayer, BingoGridResponse, CellStatus, GameError } from '../../lib/bingo-types';
import { createCellKey, isValidCellPosition, getCellClass, getLogoPath } from '../../lib/bingo-utils';
import { bingoState } from '../../lib/bingo-state';

const BingoGame: React.FC = () => {
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
    
    console.log(`📊 PLAYER DISTRIBUTION ANALYSIS:`);
    console.log(`   Total players: ${playersFromApi.length}`);
    console.log(`   Players with 'A' names: ${playersWithANames.length}`);
    console.log(`   Percentage with 'A' names: ${percentageA}%`);
    console.log(`   'A' name players: ${playersWithANames.map(p => p.playerName).join(', ')}`);

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
      console.log(`🎮 Player 1: ${firstPlayer.playerName} → ${firstPlayerAnswer}`);
    } else {
      setGameError({
        message: 'No players available from server',
        code: 'NO_PLAYERS',
        timestamp: Date.now()
      });
    }
  };

  useEffect(() => {
    const fetchGrid = async () => {
      // Use cached result if available
      if (bingoState.hasLastResult) {
        setGridLoading(true);
        try {
          setupGameData(bingoState.lastSuccessfulResult!);
        } finally {
          setGridLoading(false);
        }
        return;
      }

      // Subscribe to in-flight request if available
      if (bingoState.currentInFlightPromise) {
        setGridLoading(true);
        try {
          const data = await bingoState.currentInFlightPromise;
          setupGameData(data);
        } catch (err: any) {
          console.error('Failed to subscribe to in-flight request:', err);
          setGameError({ message: 'Failed to load game data', code: 'LOAD_ERROR', timestamp: Date.now() });
          bingoState.failRequest();
        } finally {
          setGridLoading(false);
        }
        return;
      }

      // Start new request
      try {
        setGridLoading(true);
        const abortController = new AbortController();
        bingoState.startRequest(abortController);

        const promise = axios.get<BingoGridResponse>(`${API_BASE_URL}/bingo/custom-bingo`, {
          timeout: 240000,
          signal: abortController.signal,
        }).then(res => res.data);

        bingoState.setInFlightPromise(promise);
        const data = await promise;
        bingoState.completeRequest(data);
        setupGameData(data);
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
        
        console.error('Failed to load game data:', err);
        setGameError({ message: 'Failed to load game data', code: 'LOAD_ERROR', timestamp: Date.now() });
        bingoState.failRequest();
      } finally {
        setGridLoading(false);
      }
    };

    fetchGrid();
    
    return () => {
      if (process.env.NODE_ENV === 'production') {
        bingoState.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Skip timer setup if no current player
    if (!currentPlayer) return;
    
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
  }, [currentIndex, currentPlayer]); // Fixed: depend on currentIndex instead of players.length


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
      console.log(`🎮 Player ${nextIndex + 1}: ${nextSelectedPlayer.playerName} → ${categories}`);
      
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
    if (intervalId) clearInterval(intervalId);

    timerTriggeredRef.current = true;

    const isCorrect = correctCategories.some(mc => mc.name === cell.name);
    const updatedStatus = { ...cellStatus };


    if (isCorrect) {
      updatedStatus[key] = 'correct';
      setCellStatus(updatedStatus);
      setLockedCells(prev => new Set(prev).add(key));

      console.log(`✅ CORRECT! Player "${currentPlayer?.name}" matched "${cell.name}"`);
      // Move to next player from available players
      const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);  
    } else {
      updatedStatus[key] = 'wrong';
      setCellStatus(updatedStatus);
      
      console.log(`❌ WRONG! Player "${currentPlayer?.name}" selected "${cell.name}" (expected: ${correctCategories.map(c => c.name).join(', ')})`);
      
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

  const startNewGame = (): void => {
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;
    setLockedCells(new Set());
    setFailedImageAttempts({});
    setGameError(null);
    bingoState.reset();
    window.location.reload();
  };

  const allCellsLocked = isGameWon(currentGrid, lockedCells);

  // Check if game should end or show error
  const shouldEndGame = gameEnded || !currentPlayer || currentIndex >= availablePlayers.length || allCellsLocked;
  const shouldShowError = gameError || (players.length === 0 && !gridLoading && availablePlayers.length === 0);
  
  // Show loading screen while fetching data
  if (gridLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4 bg-[#0e1118]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ffd600] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-[#ffd600] mb-2">Loading Game...</h2>
          <p className="text-lg text-white/80">Fetching players and categories</p>
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
        <p className="text-lg text-white/80">
          {gameEnded ? 'All players exhausted!' :
           allCellsLocked ? 'Congratulations! You completed the grid!' : 
           currentIndex >= availablePlayers.length ? 'All players exhausted!' : 
           'Game ended'}
        </p>
        <button onClick={startNewGame} className="bg-emerald-500 px-6 py-2 rounded-md text-black font-semibold">
          Start Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] p-6 relative">
      {gridLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white font-semibold text-lg animate-pulse mb-2">Generating game...</div>
            <div className="text-white/70 text-sm">This may take up to 3 minutes</div>
            <div className="text-white/50 text-xs mt-1">Please wait while we select the perfect players</div>
            <div className="text-green-400 text-xs mt-2">🛡️ Single API call protection active</div>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl bg-[#262346] rounded-md px-6 py-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">

          <div className="flex items-center gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-white text-[#3b27ff] text-sm font-bold grid place-items-center">
              {currentPlayer.name[0]}
            </div>
            <span className="text-white font-medium text-sm">{currentPlayer.name}</span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              disabled={wildcardUsed}
              className={`${wildcardUsed ? 'opacity-50 cursor-not-allowed' : 'bg-[#fbbc05] hover:bg-yellow-400'
                } text-black text-sm font-bold py-1 px-3 rounded-md shadow`}
              onClick={handlePlayWildcard}
            >
              Play Wildcard
            </button>
            <div className="flex items-center gap-1 text-xs text-white/70 ml-8">
              ⏱️ <span>{timer}s left</span>
            </div>
          </div>

          <div className="flex justify-end">
            <span className="text-xs text-white/70 whitespace-nowrap">
              {GAME_CONFIG.MAX_PLAYERS - currentIndex} PLAYERS LEFT
            </span>
          </div>
        </div>
      </div>
      <div className="w-full max-w-3xl bg-[#1e2033] p-4 rounded-md mx-auto">
        <div className="flex flex-col gap-2">
           {currentGrid.map((row, rowIndex) => (
             <div key={rowIndex} className="grid grid-cols-4 gap-2">
              {row.map((cat, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const logoPath = getMemoizedLogoPath(cat.slug);

                return (
                  <div
                    key={key}
                    className={`${getCellClass(cellStatus[key] ?? 'default')} text-xs font-medium leading-tight flex flex-col items-center justify-center text-center w-38 h-16 rounded transition-all duration-200 p-1`}
                    onClick={() => handleCellClick(cat, rowIndex, colIndex)}
                  >
                    {/* {cellStatus[key] === 'correct' ? (
                      '🔒'
                    ) : ( */}
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
                    {/* )} */}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-3xl flex justify-between mt-8 mx-auto">
        <button className="bg-[#ffd600] text-black font-semibold px-8 py-2 rounded" onClick={handleSkip}>
          Skip
        </button>
        <button className="bg-emerald-500 text-black font-semibold px-8 py-2 rounded" onClick={startNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
};

export default BingoGame;