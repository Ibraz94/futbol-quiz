'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from "../../lib/config";
import Image from 'next/image';

// Enhanced type definitions for better type safety
type CategoryType = 'nationalities' | 'trophies' | 'teams' | 'teammates' | 'leagues' | 'coaches';

interface Category {
  readonly _id: string;
  readonly name: string;
  readonly type: CategoryType;
  readonly slug: string;
}

interface Player {
  readonly _id: string;
  readonly name: string;
  readonly image?: string;
  readonly categories: readonly Category[];
}

interface SelectedPlayer {
  readonly playerId: string;
  readonly playerName: string;
  readonly categoryName: string;
}

interface BingoGridResponse {
  readonly grid: readonly (readonly Category[])[];
  readonly players: readonly SelectedPlayer[];
}

type CellStatus = 'default' | 'correct' | 'wrong';


interface GameError {
  readonly message: string;
  readonly code?: string;
  readonly timestamp: number;
}

// Type guards for runtime type checking (kept only if used)

// Utility function for creating cell keys
const createCellKey = (row: number, col: number): string => {
  return `${row}-${col}`;
};

// Utility type for validating cell position
const isValidCellPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < GAME_CONFIG.GRID_SIZE && col >= 0 && col < GAME_CONFIG.GRID_SIZE;
};

// Centralized game constants
const GAME_CONFIG = {
  MAX_PLAYERS: 42,
  TIMER_DURATION: 10,
  WRONG_ANSWER_PENALTY: 2,
  CORRECT_ANSWER_PENALTY: 1,
  CELL_RESET_DELAY: 1000,
  WILDCARD_DELAY: 500,
  GRID_SIZE: 4,
  MAX_IMAGE_RETRY_ATTEMPTS: 2,
} as const;

const getCellClass = (status: CellStatus) => {
  switch (status) {
    case 'correct': return 'bg-green-500 text-white';
    case 'wrong': return 'bg-red-500 text-white';
    default: return 'bg-[#23243a] text-white/90 hover:ring-2 hover:ring-[#ffd60066] cursor-pointer';
  }
};

// Optimized logo path function with lookup table and efficient normalization
const getLogoPath = (slug: string): string | null => {
  // Pre-computed lookup table for common cases (O(1) lookup)
  const LOGO_LOOKUP: Record<string, string> = {
    // Tottenham variations
    'tottenham hotspur': 'tottenham-hotspur',
    'tottenham-hotspur': 'tottenham-hotspur',
    'tottenham': 'tottenham-hotspur',
    
    // Country variations
    'portekiz': 'portekiz',
    'çekya': 'cekiya',
    'cekiya': 'cekiya',
    'hırvatistan': 'hirvatistan',
    'hirvatistan': 'hirvatistan',
    'croatia': 'hirvatistan',
    
    // League variations
    'i̇talya serie a': 'i̇talya-serie-a',
    'italya-serie-a': 'i̇talya-serie-a',
    'italya serie a': 'i̇talya-serie-a',
    'italy serie a': 'i̇talya-serie-a',
    'italy-serie-a': 'i̇talya-serie-a',
    
    'i̇ngiltere premier league': 'i̇ngiltere-premier-league',
    'ingiltere-premier-league': 'i̇ngiltere-premier-league',
    'ingiltere premier league': 'i̇ngiltere-premier-league',
    'england premier league': 'i̇ngiltere-premier-league',
    'england-premier-league': 'i̇ngiltere-premier-league',
    
    'avrupa şampiyonası': 'avrupa-şampiyonası',
    'avrupa-şampiyonası': 'avrupa-şampiyonası',
    'avrupa-sampiyonasi': 'avrupa-şampiyonası',
    
    'süper lig': 'süper-lig',
    'süper-lig': 'süper-lig',
    'super-lig': 'süper-lig',
    
    'dünya kupası': 'dünya-kupası',
    'dünya-kupası': 'dünya-kupası',
    'dunya-kupasi': 'dünya-kupası',
    
    'afrika kupası': 'afrika-kupası',
    'afrika-kupası': 'afrika-kupası',
    'afrika-kupasi': 'afrika-kupası',
    
    'uefa şampiyonlar ligi': 'laliga', // Fallback to La Liga
    'uefa-şampiyonlar-ligi': 'laliga',
    'uefa-sampiyonlar-ligi': 'laliga',
    'champions league': 'laliga',
    'champions-league': 'laliga',
    
    'i̇spanya laliga': 'i̇spanya-laliga',
    'ispanya-laliga': 'i̇spanya-laliga',
    'spain laliga': 'i̇spanya-laliga',
    'spain-laliga': 'i̇spanya-laliga',
    
    'fildişi sahili': 'fildişi-sahili',
    'fildişi-sahili': 'fildişi-sahili',
    'fildisi-sahili': 'fildişi-sahili',
    'ivory coast': 'fildişi-sahili',
    'ivory-coast': 'fildişi-sahili',
    
    'bayer 04 leverkusen': 'bayer-leverkusen',
    'bayer-04-leverkusen': 'bayer-leverkusen',
    
    'edin visca': 'edin-visca',
    'edin-visca': 'edin-visca',
  };

  // Fast normalization function with optimized regex
  const normalizeSlug = (input: string): string => {
    return input.toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[ığüşöçİĞÜŞÖÇ]/g, (match) => {
        const turkishToLatin: Record<string, string> = {
          'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
          'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
        };
        return turkishToLatin[match] || match;
      })
      .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Fast lookup in pre-computed table
  const normalizedInput = normalizeSlug(slug);
  const directMatch = LOGO_LOOKUP[normalizedInput];
  if (directMatch) {
    return `/bingo_game_logos/${directMatch}.png`;
  }

  // Check for partial matches in lookup table (fallback)
  for (const [key, value] of Object.entries(LOGO_LOOKUP)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      return `/bingo_game_logos/${value}.png`;
    }
  }

  // Handle Turkish characters efficiently
  const hasTurkishChars = /[ığüşöçİĞÜŞÖÇ]/.test(slug);
  if (hasTurkishChars) {
    return `/bingo_game_logos/${normalizedInput}.png`;
  }

  // Final fallback
  return normalizedInput ? `/bingo_game_logos/${normalizedInput}.png` : null;
};

const BingoGame: React.FC = () => {
  // Enhanced state with proper typing
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

  const currentPlayer = players[currentIndex];
  const timerTriggeredRef = React.useRef(false);

  // Memoized logo path function with stable cache
  const getMemoizedLogoPath = React.useMemo(() => {
    const cache = new Map<string, string | null>();
    
    return (slug: string): string | null => {
      if (cache.has(slug)) {
        return cache.get(slug)!;
      }
      
      const path = getLogoPath(slug);
      cache.set(slug, path);
      return path;
    };
  }, []); // No dependencies = stable function

  const handlePlayWildcard = () => {
    if (gameEnded || wildcardUsed || !currentGrid.length) return;
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;

    setGridLoading(true);

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

    console.log(`🃏 Wildcard used! Locked ${lockedCount} cells for current player "${currentPlayer?.name}"`);

    // Move to next player from available players
    setTimeout(() => {
      const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);
      
      if (!hasNextPlayer) {
        console.log('🎉 All players used! Game should end soon...');
      }
      
      setGridLoading(false);
    }, GAME_CONFIG.WILDCARD_DELAY); // Small delay to show the wildcard effect
  };

  useEffect(() => {
    const fetchGrid = async () => {
      try {
        setGridLoading(true);

        // Fetch both grid and players from the new API
        const res = await axios.get<BingoGridResponse>(`${API_BASE_URL}/bingo/balanced-grid`);
        const { grid: gridFromApi, players: playersFromApi } = res.data;

        // Set the grid
        setCurrentGrid(gridFromApi);
        setCellStatus({});

        // Store the available players from backend
        setAvailablePlayers(playersFromApi);

        // Log player distribution by category
        const playersByCategory = playersFromApi.reduce((acc, player) => {
          if (!acc[player.categoryName]) {
            acc[player.categoryName] = [];
          }
          acc[player.categoryName].push(player.playerName);
          return acc;
        }, {} as Record<string, string[]>);

        // Log detailed player distribution with names and counts
        console.log('📋 DETAILED PLAYER DISTRIBUTION:');
        console.log('═'.repeat(80));
        Object.entries(playersByCategory).forEach(([category, players]) => {
          console.log(`${category}: ${players.length} → [${players.join(', ')}]`);
        });
        console.log('═'.repeat(80));


        try {
          // Randomize the order of players for gameplay
          if (playersFromApi.length > 0) {
            const randomizedPlayers = [...playersFromApi].sort(() => Math.random() - 0.5);
                    
            // Convert SelectedPlayer to Player format and set all 42 players
            const gamePlayersInOrder = randomizedPlayers.map((selectedPlayer, index) => ({
              _id: selectedPlayer.playerId,
              name: selectedPlayer.playerName,
              categories: [], // We don't need categories for display
            }));
            
            setPlayers(gamePlayersInOrder);
            
            // Set up the first player's matching categories
            const firstPlayer = randomizedPlayers[0];
            const firstPlayerCategories = [{ id: firstPlayer.categoryName, name: firstPlayer.categoryName }];
            
            setCorrectCategories(firstPlayerCategories);
            setCurrentIndex(0); // Start with first player
            
            console.log(`🎯 Game Started - Player 1: ${firstPlayer.playerName} ✅ Correct Category: "${firstPlayer.categoryName}"`);                        
          } else {
            // No players available from backend
            console.error('❌ No players available from backend');
            setGameError({
              message: 'No players available from server',
              code: 'NO_PLAYERS',
              timestamp: Date.now()
            });
            setPlayers([]);
            setCorrectCategories([]);
          }
        } catch (err) {
          console.error('Failed to setup players:', err);
          setGameError({
            message: 'Failed to setup players',
            code: 'SETUP_ERROR',
            timestamp: Date.now()
          });
          setPlayers([]);
          setCorrectCategories([]);
        }
      } catch (err) {
        console.error('Failed to load balanced grid:', err);
        setGameError({
          message: 'Failed to load game data',
          code: 'LOAD_ERROR',
          timestamp: Date.now()
        });
      } finally {
        setGridLoading(false);
      }
    };

    fetchGrid();
  }, []);


  // No longer needed - we get all players from the grid API
  // const fetchMatchingPlayer = removed

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
      
      const nextPlayerCategories: readonly { readonly id: string; readonly name: string }[] = [
        { id: nextSelectedPlayer.categoryName, name: nextSelectedPlayer.categoryName }
      ];
      
      // Log the next player details
      console.log(`🎮 Player ${nextIndex + 1}: ${nextSelectedPlayer.playerName} ✅ Correct Category: "${nextSelectedPlayer.categoryName}"`);
            
      setCorrectCategories(nextPlayerCategories);
      setCurrentIndex(nextIndex);
      
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

      console.log(`✅ MATCH FOUND! Player "${currentPlayer?.name}" correctly matched category "${cell.name}"`);
      
      
      // Move to next player from available players
      const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);
      
      if (!hasNextPlayer) {
        console.log('🎯 GAME ENDED! All players exhausted after correct match');
      }  
    } else {
      updatedStatus[key] = 'wrong';
      setCellStatus(updatedStatus);
      
      console.log(`❌ WRONG MATCH! Player "${currentPlayer?.name}" incorrectly selected "${cell.name}" (expected: "${correctCategories[0]?.name}")`);
      
      setTimeout(() => {
        setCellStatus(prev => ({ ...prev, [key]: 'default' }));
      }, GAME_CONFIG.CELL_RESET_DELAY);

      
      // Move to next player from available players (skip current + 1 more for wrong answer)
      // For wrong answers, we need to skip 2 players total (current + 1 additional)
      const nextIndex = currentIndex + GAME_CONFIG.WRONG_ANSWER_PENALTY; // Skip players for wrong answer
      
      // Check if this wrong answer ends the game
      if (currentIndex >= availablePlayers.length - 1) {
        console.log('🎯 GAME ENDED! Last player made wrong selection - no more players available');
        setGameEnded(true);
        return; // End the game immediately
      }
      
      if (nextIndex < availablePlayers.length) {
        const nextSelectedPlayer = availablePlayers[nextIndex];
        const nextPlayerCategories = [{ id: nextSelectedPlayer.categoryName, name: nextSelectedPlayer.categoryName }];
        
        console.log(`⚠️ Wrong answer penalty: Skipping 2 players (from ${currentIndex + 1} to ${nextIndex + 1})`);
        console.log(`🎮 Player ${nextIndex + 1}: ${nextSelectedPlayer.playerName} ✅ Correct Category: "${nextSelectedPlayer.categoryName}"`);
        
        setCorrectCategories(nextPlayerCategories);
        setCurrentIndex(nextIndex);
      } else {
        console.log('🎯 GAME ENDED! Wrong answer penalty would exceed available players');
        setGameEnded(true);
        return; // End the game immediately
      }
    }
  };

  const handleSkip = () => {
    if (gameEnded) return;
    timerTriggeredRef.current = true;
    if (intervalId) clearInterval(intervalId);
    
    // Move to next player from available players
    const hasNextPlayer = getNextPlayerFromAvailable(currentIndex);
    
    if (!hasNextPlayer) {
      console.log('🎯 GAME ENDED! All players exhausted after skip');
    }
  };

  const startNewGame = (): void => {
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;
    setLockedCells(new Set());
    setFailedImageAttempts({}); // Reset failed image attempts
    setGameError(null); // Reset error state
    window.location.reload();
  };

  const allCellsLocked = isGameWon(currentGrid, lockedCells);

  // Check if game should end or show error
  const shouldEndGame = gameEnded || !currentPlayer || currentIndex >= availablePlayers.length || allCellsLocked;
  const shouldShowError = gameError || (players.length === 0 && !gridLoading);
  
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
    
    // Log game end reason
    if (gameEnded) {
      console.log('🎯 GAME ENDED! Game ended due to player exhaustion or penalty.');
    } else if (allCellsLocked) {
      console.log('🏆 GAME WON! All cells are locked!');
    } else if (currentIndex >= availablePlayers.length) {
      console.log('🎯 GAME ENDED! All players have been used or exhausted.');
    } else if (!currentPlayer) {
      console.log('❓ GAME ENDED! No current player available.');
    } else {
      console.log('❓ GAME ENDED! Unknown reason.');
    }
    
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
          <div className="text-white font-semibold text-lg animate-pulse">Loading player grid…</div>
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
                    {cellStatus[key] === 'correct' ? (
                      '🔒'
                    ) : (
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
                    )}
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