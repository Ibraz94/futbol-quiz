'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

type CellStatus = 'default' | 'correct' | 'wrong';

const getCellClass = (status: CellStatus) => {
  switch (status) {
    case 'correct': return 'bg-green-500 text-white';
    case 'wrong': return 'bg-red-500 text-white';
    default: return 'bg-[#23243a] text-white/90 hover:ring-2 hover:ring-[#ffd60066] cursor-pointer';
  }
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

  const currentPlayer = players[currentIndex];
  const timerTriggeredRef = React.useRef(false);
  const MAX_PLAYERS = 42;

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

        const isCorrect = correctCategories.some(c => c.id === cat._id);
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

    // Fetch next player
    fetchMatchingPlayer(updatedCategories, updatedExcludeIds)
      .then(result => {
        console.log(result.matchedCategories[0].name);
        setPlayers(prev => [
          ...prev,
          { _id: result.playerId, name: result.playerName, categories: [] },
        ]);
        setCorrectCategories(result.matchedCategories);
        setCurrentIndex(prev => prev + 1);
        setTimer(10);
      })
      .catch(err => console.error('Wildcard fetch failed:', err))
      .finally(() => setGridLoading(false));
  };

  useEffect(() => {
    const fetchGrid = async () => {
      try {
        setGridLoading(true);

        const res = await axios.get<{ grid: Category[][] }>('https://api.futbolquiz.staging.pegasync.com/bingo/csv-grid');
        const gridFromApi = res.data.grid;

        setCurrentGrid(gridFromApi);
        setCellStatus({});

        const flatCategoryIds = gridFromApi.flat().map(cat => cat._id);
        setAllCategories(flatCategoryIds);

        try {
          const result = await fetchMatchingPlayer(flatCategoryIds, []);
          console.log(result.matchedCategories[0].name);
          setPlayers([{ _id: result.playerId, name: result.playerName, categories: [] }]);
          setExcludeIds([result.playerId]);
          setCorrectCategories(result.matchedCategories);
        } catch (err) {
          console.error('Failed to fetch initial player:', err);
        }
      } catch (err) {
        console.error('Failed to load CSV grid:', err);
      } finally {
        setGridLoading(false);
      }
    };

    fetchGrid();
  }, []);


  const fetchMatchingPlayer = async (categories: string[], excludeIds: string[] = []) => {
    try {
      const response = await axios.post('https://api.futbolquiz.staging.pegasync.com/bingo/find-player', {
        categories,
        excludeIds,
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

  const handleCellClick = (cat: Category, row: number, col: number) => {
    const key = `${row}-${col}`;
    if (lockedCells.has(key) || cellStatus[key] === 'correct') return;
    if (intervalId) clearInterval(intervalId);

    timerTriggeredRef.current = true;

    const isCorrect = correctCategories.some(mc => mc.id === cat._id);

    const currentPlayerId = players[currentIndex]?._id;
    const updatedStatus = { ...cellStatus };

    if (isCorrect) {
      updatedStatus[key] = 'correct';
      setCellStatus(updatedStatus);
      setLockedCells(prev => new Set(prev).add(key));

      const updatedCategories = allCategories.filter(id => id !== cat._id);
      const updatedExcludeIds = [...excludeIds, currentPlayerId];

      setAllCategories(updatedCategories);
      setExcludeIds(updatedExcludeIds);

      fetchMatchingPlayer(updatedCategories, updatedExcludeIds)
        .then(result => {
          console.log(result.matchedCategories[0].name);
          setPlayers(prev => [
            ...prev,
            { _id: result.playerId, name: result.playerName, categories: [] },
          ]);
          setCorrectCategories(result.matchedCategories);
          setCurrentIndex(prev => prev + 1);
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

      fetchMatchingPlayer(allCategories, updatedExcludeIds)
        .then(result => {
          console.log(result.matchedCategories[0].name);
          setPlayers(prev => [
            ...prev,
            { _id: result.playerId, name: result.playerName, categories: [] },
          ]);
          setCorrectCategories(result.matchedCategories);
          setExcludeIds(updatedExcludeIds);
          setCurrentIndex(prev => prev + 1);

          fetchMatchingPlayer(allCategories, [...updatedExcludeIds, result.playerId])
            .then(skipResult => {
              console.log(skipResult.matchedCategories[0].name);
              setPlayers(prev => [
                ...prev,
                { _id: skipResult.playerId, name: skipResult.playerName, categories: [] },
              ]);
              setCorrectCategories(skipResult.matchedCategories);
              setExcludeIds(prev => [...prev, skipResult.playerId]);

              setCurrentIndex(prev => prev + 1);
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

    fetchMatchingPlayer(allCategories, updatedExcludeIds)
      .then(result => {
        console.log(result.matchedCategories[0].name);
        setPlayers(prev => [
          ...prev,
          { _id: result.playerId, name: result.playerName, categories: [] },
        ]);
        setCorrectCategories(result.matchedCategories);
        setCurrentIndex(prev => prev + 1);
      })
      .catch(err => console.error('Error fetching player after skip:', err));
  };

  const startNewGame = () => {
    if (intervalId) clearInterval(intervalId);
    timerTriggeredRef.current = true;
    setLockedCells(new Set());
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
                return (
                  <div
                    key={key}
                    className={`${getCellClass(cellStatus[key] ?? 'default')} text-xs font-medium leading-tight flex items-center justify-center text-center w-38 h-16 rounded transition-all duration-200`}
                    onClick={() => handleCellClick(cat, rowIndex, colIndex)}
                  >
                    {cellStatus[key] === 'correct' ? '🔒' : cat.name}
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