'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from "../../lib/config";
import Image from 'next/image';

type Category = {
  _id: string;
  name: string;
  type: string;
  slug: string;
};

type Player = {
  _id: string;
  name: string;
  image?: string;
  categories: Category[];
};

type GameState = {
  selectedPlayers: Array<{ playerId: string; matchCount: number }>;
  totalPlayersSelected: number;
};

type CellStatus = 'default' | 'correct' | 'wrong';

const getCellClass = (status: CellStatus) => {
  switch (status) {
    case 'correct': return 'bg-green-500 text-white';
    case 'wrong': return 'bg-red-500 text-white';
    default: return 'bg-[#23243a] text-white/90 hover:ring-2 hover:ring-[#ffd60066] cursor-pointer';
  }
};

const getLogoPath = (slug: string): string | null => {
  // Simple normalization function that matches our file naming convention
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

  // Normalize the slug to match our file naming convention
  const normalizedSlug = normalizeSlug(slug);

  // Debug logging
  // console.log(`🔍 Logo search for "${slug}" → normalized: "${normalizedSlug}"`);

  // Special handling for known problematic cases
  if (slug.includes('Tottenham Hotspur') || slug.includes('tottenham-hotspur') || slug.includes('tottenham hotspur')) {
    // console.log(`🎯 Direct return for Tottenham Hotspur`);
    return `/bingo_game_logos/tottenham-hotspur.png`;
  }

  // Handle common variations for club names
  if (slug.includes('Tottenham') || slug.includes('tottenham')) {
    // console.log(`🎯 Direct return for Tottenham (variation)`);
    return `/bingo_game_logos/tottenham-hotspur.png`;
  }

  // Handle common variations for country names
  if (slug.includes('Portekiz') || slug.includes('portekiz')) {
    // console.log(`🎯 Direct return for Portekiz`);
    return `/bingo_game_logos/portekiz.png`;
  }

  // Handle common variations for country names with Turkish characters
  if (slug.includes('Çekya') || slug.includes('çekya') || slug.includes('cekiya')) {
    // console.log(`🎯 Direct return for Çekya`);
    return `/bingo_game_logos/cekiya.png`;
  }

  // Handle common variations for country-league combinations with Turkish characters
  if (slug.includes('İtalya Serie A') || slug.includes('italya-serie-a') || slug.includes('italya serie a')) {
    // console.log(`🎯 Direct return for İtalya Serie A`);
    return `/bingo_game_logos/i̇talya-serie-a.png`; // Using the correct filename with Turkish character
  }

  // Handle Hırvatistan (Croatia)
  if (slug.includes('Hırvatistan') || slug.includes('hırvatistan') || slug.includes('hirvatistan') ||
    slug.includes('Croatia') || slug.includes('croatia')) {
    // console.log(`🎯 Direct return for Hırvatistan`);
    return `/bingo_game_logos/hirvatistan.png`; // Using the normalized filename
  }

  // Handle Dünya Kupası
  if (slug.includes('Dünya Kupası') || slug.includes('dünya-kupası') || slug.includes('dunya-kupasi')) {
    // console.log(`🎯 Direct return for Dünya Kupası`);
    return `/bingo_game_logos/dünya-kupası.png`; // Using the correct filename with Turkish characters
  }

  // Handle İngiltere Premier League
  if (slug.includes('İngiltere Premier League') || slug.includes('i̇ngiltere-premier-league') || slug.includes('ingiltere-premier-league') ||
    slug.includes('England Premier League') || slug.includes('england-premier-league')) {
    // console.log(`🎯 Direct return for İngiltere Premier League`);
    return `/bingo_game_logos/i̇ngiltere-premier-league.png`; // Using the correct filename with Turkish character
  }

  // Handle İtalya Serie A
  if (slug.includes('İtalya Serie A') || slug.includes('i̇talya-serie-a') || slug.includes('italya-serie-a') ||
    slug.includes('Italy Serie A') || slug.includes('italy-serie-a')) {
    // console.log(`🎯 Direct return for İtalya Serie A`);
    return `/bingo_game_logos/i̇talya-serie-a.png`; // Using the correct filename with Turkish character
  }

  if (slug.includes('Avrupa Şampiyonası') || slug.includes('avrupa-şampiyonası') || slug.includes('avrupa-sampiyonasi')) {
    // console.log(`🎯 Direct return for Avrupa Şampiyonası (using UEFA logo)`);
    return `/bingo_game_logos/avrupa-şampiyonası.png`; // Using the correct filename with Turkish characters
  }

  if (slug.includes('Süper Lig') || slug.includes('süper-lig') || slug.includes('super-lig')) {
    // console.log(`🎯 Direct return for Süper Lig (using Turkish league logo)`);
    return `/bingo_game_logos/süper-lig.png`; // Using the correct filename with Turkish character
  }

  // Handle Bayer 04 Leverkusen
  if (slug.includes('Bayer 04 Leverkusen') || slug.includes('bayer-04-leverkusen') || slug.includes('bayer 04 leverkusen')) {
    // console.log(`🎯 Direct return for Bayer 04 Leverkusen`);
    return `/bingo_game_logos/bayer-leverkusen.png`;
  }

  // Handle Afrika Kupası
  if (slug.includes('Afrika Kupası') || slug.includes('afrika-kupası') || slug.includes('afrika-kupasi')) {
    // console.log(`🎯 Direct return for Afrika Kupası`);
    return `/bingo_game_logos/afrika-kupası.png`; // Using the correct filename with Turkish character
  }

  // Handle UEFA Şampiyonlar Ligi (UEFA Champions League)
  if (slug.includes('UEFA Şampiyonlar Ligi') || slug.includes('uefa-şampiyonlar-ligi') || slug.includes('uefa-sampiyonlar-ligi') ||
    slug.includes('Champions League') || slug.includes('champions-league')) {
    // console.log(`🎯 Direct return for UEFA Şampiyonlar Ligi`);
    return `/bingo_game_logos/laliga.png`; // Using La Liga logo as fallback for Champions League
  }

  // Handle İspanya LaLiga
  if (slug.includes('İspanya LaLiga') || slug.includes('i̇spanya-laliga') || slug.includes('ispanya-laliga') ||
    slug.includes('Spain LaLiga') || slug.includes('spain-laliga')) {
    // console.log(`🎯 Direct return for İspanya LaLiga`);
    return `/bingo_game_logos/i̇spanya-laliga.png`; // Using the correct filename with Turkish character
  }

  // Handle Fildişi Sahili (Ivory Coast)
  if (slug.includes('Fildişi Sahili') || slug.includes('fildişi-sahili') || slug.includes('fildisi-sahili') ||
    slug.includes('Ivory Coast') || slug.includes('ivory-coast')) {
    // console.log(`🎯 Direct return for Fildişi Sahili`);
    return `/bingo_game_logos/fildişi-sahili.png`; // Using the correct filename with Turkish characters
  }

  // Handle other Turkish character cases
  if (slug.includes('ç') || slug.includes('Ç')) {
    // console.log(`🎯 Turkish 'ç' detected in "${slug}", trying normalized version`);
    return `/bingo_game_logos/${normalizedSlug}.png`;
  }

  // Handle other Turkish characters
  if (slug.includes('ı') || slug.includes('İ') || slug.includes('ğ') || slug.includes('Ğ') ||
    slug.includes('ü') || slug.includes('Ü') || slug.includes('ş') || slug.includes('Ş') ||
    slug.includes('ö') || slug.includes('Ö')) {
    // console.log(`🎯 Turkish character detected in "${slug}", trying normalized version`);
    return `/bingo_game_logos/${normalizedSlug}.png`;
  }

  // Handle any slug with Turkish characters and spaces (comprehensive fallback)
  if (slug.includes(' ') && (slug.includes('ı') || slug.includes('İ') || slug.includes('ğ') || slug.includes('Ğ') ||
    slug.includes('ü') || slug.includes('Ü') || slug.includes('ş') || slug.includes('Ş') ||
    slug.includes('ö') || slug.includes('Ö') || slug.includes('ç') || slug.includes('Ç'))) {
    // console.log(`🎯 Turkish character with spaces detected in "${slug}", trying normalized version`);
    return `/bingo_game_logos/${normalizedSlug}.png`;
  }

  // Handle common variations for player names
  if (slug.includes('Edin Visca') || slug.includes('edin-visca') || slug.includes('edin visca')) {
    // console.log(`🎯 Direct return for Edin Visca`);
    return `/bingo_game_logos/edin-visca.png`;
  }

  // Return the path if we have a normalized slug
  return normalizedSlug ? `/bingo_game_logos/${normalizedSlug}.png` : null;
};

const BingoGame: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentGrid, setCurrentGrid] = useState<Category[][]>([]);
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({});
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(10);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [wildcardUsed, setWildcardUsed] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [correctCategories, setCorrectCategories] = useState<{ id: string; name: string }[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    selectedPlayers: [],
    totalPlayersSelected: 0,
  });
  const [failedImageAttempts, setFailedImageAttempts] = useState<Record<string, number>>({});
  const [memoizedLogoPaths, setMemoizedLogoPaths] = useState<Record<string, string | null>>({});

  const currentPlayer = players[currentIndex];
  const timerTriggeredRef = React.useRef(false);
  const MAX_PLAYERS = 42;

  // Memoized logo path function
  const getMemoizedLogoPath = React.useCallback((slug: string): string | null => {
    // Check if we already have this path memoized
    if (memoizedLogoPaths[slug] !== undefined) {
      return memoizedLogoPaths[slug];
    }

    // Calculate the path
    const path = getLogoPath(slug);

    // Memoize the result
    setMemoizedLogoPaths(prev => ({
      ...prev,
      [slug]: path
    }));

    return path;
  }, [memoizedLogoPaths]);

  const handlePlayWildcard = () => {
    if (wildcardUsed || !currentGrid.length) return;
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;

    setGridLoading(true);

    const updatedStatus = { ...cellStatus };
    const newLockedCells = new Set(lockedCells);
    let lockedCount = 0;

    for (let row = 0; row < currentGrid.length; row++) {
      for (let col = 0; col < currentGrid[row].length; col++) {
        const cat = currentGrid[row][col];
        const key = `${row}-${col}`;

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

    // Prepare new state
    const currentPlayerId = players[currentIndex]?._id;
    const updatedCategories = allCategories.filter(id =>
      !correctCategories.some(c => c.id === id)
    );
    const updatedExcludeIds = [...excludeIds, currentPlayerId];

    setAllCategories(updatedCategories);
    setExcludeIds(updatedExcludeIds);

    // Fetch next player with updated game state
    const updatedGameState = {
      selectedPlayers: [...gameState.selectedPlayers, { playerId: currentPlayerId, matchCount: correctCategories.length }],
      totalPlayersSelected: gameState.totalPlayersSelected + 1,
    };

    fetchMatchingPlayer(updatedCategories, updatedExcludeIds, updatedGameState)
      .then(result => {
        console.log('Wildcard player selected:', result.playerName, 'with', result.matchCount, 'matches');
        console.log('✅ Correct matches for', result.playerName, ':', result.matchedCategories.map((cat: { id: string; name: string }) => cat.name).join(', '));
        setPlayers(prev => [
          ...prev,
          { _id: result.playerId, name: result.playerName, categories: [] },
        ]);
        setCorrectCategories(result.matchedCategories);
        setCurrentIndex(prev => prev + 1);
        setTimer(10);

        // Update game state
        setGameState(updatedGameState);
      })
      .catch(err => console.error('Wildcard fetch failed:', err))
      .finally(() => setGridLoading(false));
  };

  useEffect(() => {
    const fetchGrid = async () => {
      try {
        setGridLoading(true);

        const res = await axios.get<{ grid: Category[][] }>(`${API_BASE_URL}/bingo/balanced-grid`);
        const gridFromApi = res.data.grid;

        setCurrentGrid(gridFromApi);
        setCellStatus({});

        const flatCategoryIds = gridFromApi.flat().map((cat: { _id: string; name: string; type: string; slug?: string }) => cat._id);
        setAllCategories(flatCategoryIds);

        try {
          const result = await fetchMatchingPlayer(flatCategoryIds, [], gameState);
          console.log('Initial player selected:', result.playerName, 'with', result.matchCount, 'matches');
          console.log('✅ Correct matches for', result.playerName, ':', result.matchedCategories.map((cat: { id: string; name: string }) => cat.name).join(', '));
          setPlayers([{ _id: result.playerId, name: result.playerName, categories: [] }]);
          setExcludeIds([result.playerId]);
          setCorrectCategories(result.matchedCategories);

          // Update game state after first player
          setGameState({
            selectedPlayers: [{ playerId: result.playerId, matchCount: result.matchCount }],
            totalPlayersSelected: 1,
          });
        } catch (err) {
          console.error('Failed to fetch initial player:', err);
          // Fallback to mock player if API fails
          setPlayers([{ _id: 'mock-player', name: 'Test Player', categories: [] }]);
          setCorrectCategories([{ id: 'mock-category', name: 'Mock Category' }]);
        }
      } catch (err) {
        console.error('Failed to load balanced grid:', err);
      } finally {
        setGridLoading(false);
      }
    };

    fetchGrid();
  }, []);


  const fetchMatchingPlayer = async (categories: string[], excludeIds: string[] = [], gameState?: {
    selectedPlayers: Array<{ playerId: string; matchCount: number }>;
    totalPlayersSelected: number;
  }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/bingo/select-player-smart`, {
        categories,
        excludeIds,
        gameState,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching matching player:', error);
      throw error;
    }
  };

  useEffect(() => {
    timerTriggeredRef.current = false;
    if (intervalId) clearInterval(intervalId);

    setTimer(10); // reset timer each turn

    const id = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (!timerTriggeredRef.current) {
            timerTriggeredRef.current = true;
            clearInterval(id);
            handleSkip(); // call your skip handler!
          }
          return 10; // reset timer for next turn
        }
        return prev - 1;
      });
    }, 1000);

    setIntervalId(id);

    return () => clearInterval(id);
  }, [players.length]);


  const isGameWon = (grid: Category[][], locked: Set<string>) => {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const key = `${row}-${col}`;
        if (!locked.has(key)) {
          return false; // found an unlocked cell, game not won yet
        }
      }
    }
    return true; // all cells are locked
  };

  const handleCellClick = (cell: Category, row: number, col: number) => {
    const key = `${row}-${col}`;
    if (lockedCells.has(key) || cellStatus[key] === 'correct') return;
    if (intervalId) clearInterval(intervalId);

    timerTriggeredRef.current = true;

    // Debug logging to see what's happening
    console.log('🔍 Cell Click Debug:');
    console.log('  - Clicked category:', cell.name, '(ID:', cell._id, ')');
    console.log('  - Current player:', currentPlayer?.name);
    console.log('  - Correct categories for current player:', correctCategories.map(c => `${c.name} (ID: ${c.id})`));

    const isCorrect = correctCategories.some(mc => mc.name === cell.name);
    console.log('  - Is this correct?', isCorrect);

    const currentPlayerId = players[currentIndex]?._id;
    const updatedStatus = { ...cellStatus };

    if (isCorrect) {
      updatedStatus[key] = 'correct';
      setCellStatus(updatedStatus);
      setLockedCells(prev => new Set(prev).add(key));

      const updatedCategories = allCategories.filter(id => id !== cell._id);
      const updatedExcludeIds = [...excludeIds, currentPlayerId];

      setAllCategories(updatedCategories);
      setExcludeIds(updatedExcludeIds);

      // Fetch next player with updated game state
      const updatedGameState = {
        selectedPlayers: [...gameState.selectedPlayers, { playerId: currentPlayerId, matchCount: correctCategories.length }],
        totalPlayersSelected: gameState.totalPlayersSelected + 1,
      };

      fetchMatchingPlayer(updatedCategories, updatedExcludeIds, updatedGameState)
        .then(result => {
          console.log('Correct match player selected:', result.playerName, 'with', result.matchCount, 'matches');
          console.log('✅ Correct matches for', result.playerName, ':', result.matchedCategories.map((cat: { id: string; name: string }) => cat.name).join(', '));
          setPlayers(prev => [
            ...prev,
            { _id: result.playerId, name: result.playerName, categories: [] },
          ]);
          setCorrectCategories(result.matchedCategories);
          setCurrentIndex(prev => prev + 1);

          // Update game state
          setGameState(updatedGameState);
        })
        .catch(err => console.error('Error fetching new player:', err));
    } else {
      updatedStatus[key] = 'wrong';
      setCellStatus(updatedStatus);

      setTimeout(() => {
        setCellStatus(prev => ({ ...prev, [key]: 'default' }));
      }, 1000);

      const updatedExcludeIds = [...excludeIds, currentPlayerId];
      setExcludeIds(updatedExcludeIds);

      // Fetch first player after wrong match
      const updatedGameState = {
        selectedPlayers: [...gameState.selectedPlayers, { playerId: currentPlayerId, matchCount: 0 }],
        totalPlayersSelected: gameState.totalPlayersSelected + 1,
      };

      fetchMatchingPlayer(allCategories, updatedExcludeIds, updatedGameState)
        .then(result => {
          console.log('Wrong match - first player selected:', result.playerName, 'with', result.matchCount, 'matches');
          console.log('✅ Correct matches for', result.playerName, ':', result.matchedCategories.map((cat: { id: string; name: string }) => cat.name).join(', '));
          setPlayers(prev => [
            ...prev,
            { _id: result.playerId, name: result.playerName, categories: [] },
          ]);
          setCorrectCategories(result.matchedCategories);
          setExcludeIds(updatedExcludeIds);
          setCurrentIndex(prev => prev + 1);

          // Update game state for first player
          setGameState(updatedGameState);

          // Fetch second player after skip
          const secondPlayerGameState = {
            selectedPlayers: [...updatedGameState.selectedPlayers, { playerId: result.playerId, matchCount: result.matchCount }],
            totalPlayersSelected: updatedGameState.totalPlayersSelected + 1,
          };

          fetchMatchingPlayer(allCategories, [...updatedExcludeIds, result.playerId], secondPlayerGameState)
                          .then(skipResult => {
                console.log('Wrong match - second player selected:', skipResult.playerName, 'with', skipResult.matchCount, 'matches');
                console.log('✅ Correct matches for', skipResult.playerName, ':', skipResult.matchedCategories.map((cat: { id: string; name: string }) => cat.name).join(', '));
                setPlayers(prev => [
                ...prev,
                { _id: skipResult.playerId, name: skipResult.playerName, categories: [] },
              ]);
              setCorrectCategories(skipResult.matchedCategories);
              setExcludeIds(prev => [...prev, skipResult.playerId]);
              setCurrentIndex(prev => prev + 1);

              // Update game state for second player
              setGameState(secondPlayerGameState);
            })
            .catch(err => console.error('Error fetching 2nd skip player:', err));
        })
        .catch(err => console.error('Error fetching first skip player:', err));
    }
  };

  const handleSkip = () => {
    timerTriggeredRef.current = true;
    if (intervalId) clearInterval(intervalId);

    const currentPlayerId = players[currentIndex]?._id;
    const updatedExcludeIds = [...excludeIds, currentPlayerId];
    setExcludeIds(updatedExcludeIds);

    // Fetch player after skip with updated game state
    const updatedGameState = {
      selectedPlayers: [...gameState.selectedPlayers, { playerId: currentPlayerId, matchCount: 0 }],
      totalPlayersSelected: gameState.totalPlayersSelected + 1,
    };

    fetchMatchingPlayer(allCategories, updatedExcludeIds, updatedGameState)
      .then(result => {
        console.log('Skip player selected:', result.playerName, 'with', result.matchCount, 'matches');
        console.log('✅ Correct matches for', result.playerName, ':', result.matchedCategories.map((cat: { id: string; name: string }) => cat.name).join(', '));
        setPlayers(prev => [
          ...prev,
          { _id: result.playerId, name: result.playerName, categories: [] },
        ]);
        setCorrectCategories(result.matchedCategories);
        setCurrentIndex(prev => prev + 1);

        // Update game state
        setGameState(updatedGameState);
      })
      .catch(err => console.error('Error fetching player after skip:', err));
  };

  const startNewGame = () => {
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;
    setLockedCells(new Set());
    setFailedImageAttempts({}); // Reset failed image attempts
    setMemoizedLogoPaths({}); // Reset memoized logo paths
    window.location.reload();
  };

  const allCellsLocked = isGameWon(currentGrid, lockedCells);

  if (!currentPlayer || currentIndex >= MAX_PLAYERS || allCellsLocked) {
    if (intervalId) clearInterval(intervalId);
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <h2 className="text-2xl font-bold">🎉 Game Over</h2>
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
              {MAX_PLAYERS - currentIndex} PLAYERS LEFT
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
                        {logoPath && (!failedImageAttempts[logoPath] || failedImageAttempts[logoPath] < 2) ? (
                          <Image
                            src={logoPath}
                            alt={cat.name}
                            width={24}
                            height={24}
                            className="mb-1"
                            onError={(e) => {
                              const currentAttempts = failedImageAttempts[logoPath] || 0;
                              const newAttempts = currentAttempts + 1;

                              // console.log(`❌ Failed to load logo for "${cat.name}" (slug: "${cat.slug}") at path: ${logoPath} - Attempt ${newAttempts}/2`);

                              if (newAttempts >= 2) {
                                // console.log(`🛑 Stopping retry attempts for ${logoPath} after 2 failures`);
                                e.currentTarget.style.display = 'none';
                              }

                              setFailedImageAttempts(prev => ({
                                ...prev,
                                [logoPath]: newAttempts
                              }));
                            }}
                          />
                        ) : logoPath && failedImageAttempts[logoPath] >= 2 ? (
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