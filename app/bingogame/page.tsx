'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { start } from 'repl';

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

type PlayerGrid = {
  playerId: string;
  correctCategoryIds: string[];
  correctCategoryNames: string[];
  grid: Category[][];
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
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({});
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPlayer = players[currentIndex];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await axios.get<Player[]>('http://localhost:5000/bingo/players/random');
        setPlayers(res.data);
        setCurrentIndex(0);
      } catch (err) {
        setError('Failed to load players.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchGrid = async () => {
      if (!currentPlayer) return;
      try {
        const res = await axios.get<PlayerGrid>('http://localhost:5000/bingo/player-grid', {
          params: { playerId: currentPlayer._id },
        });

        const rawGrid = res.data.grid;
        const injectedGrid = [...rawGrid]; // or clone it if necessary
        const newStatus: Record<string, CellStatus> = {};
        const availablePositions: { row: number; col: number }[] = [];

        // STEP 1: Identify locked positions and collect available ones
        injectedGrid.forEach((row, rowIndex) => {
          row.forEach((cat, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            if (lockedCells.has(key)) {
              newStatus[key] = 'correct'; // ✅ lock by position!
            } else {
              availablePositions.push({ row: rowIndex, col: colIndex });
            }
          });
        });

        // STEP 2: Inject correct categories into available positions
        const correctCategories = rawGrid
          .flat()
          .filter(cat => res.data.correctCategoryIds.includes(cat._id));
        let correctIndex = 0;

        for (let i = 0; i < availablePositions.length && correctIndex < correctCategories.length; i++) {
          const { row, col } = availablePositions[i];
          injectedGrid[row][col] = correctCategories[correctIndex];
          correctIndex++;
        }

        // STEP 3: Save updated state
        setCurrentGrid(injectedGrid);
        setCorrectIds(res.data.correctCategoryIds);
        setCellStatus(newStatus);

        console.log('✅ Correct category names:', res.data.correctCategoryNames);
      } catch (err) {
        console.error('Failed to load player grid:', err);
      }
    };

    fetchGrid();
  }, [currentPlayer]);

  const isGameWon = (grid: Category[][], status: Record<string, CellStatus>) => {
    return grid.every((row, rowIndex) =>
      row.every((_, colIndex) => status[`${rowIndex}-${colIndex}`] === 'correct')
    );
};

  const handleCellClick = (cat: Category, row: number, col: number) => {
    const key = `${row}-${col}`;
    if (lockedCells.has(key) || cellStatus[key] === 'correct') return;

    const isCorrect = correctIds.includes(cat._id);

    const updatedStatus = {
      ...cellStatus,
      [key]: isCorrect ? 'correct' : 'wrong',
    };
    setCellStatus(updatedStatus);

    if (isCorrect) {
      setLockedCells(prev => new Set(prev).add(key));
      setTimeout(() => {
        if (isGameWon(currentGrid, updatedStatus)) {
          alert('🎉 Bingo! You won!');
          startNewGame();
          return;
        }
        setCurrentIndex(i => i + 1);
      }, 200);
    } else {
      setTimeout(() => {
        setCurrentIndex(i => i + 2);
      }, 400);
    }
  };

  const handleSkip = () => {
    setCurrentIndex(i => i + 1);
  };

  const startNewGame = () => {
    setLockedCells(new Set());
    window.location.reload();
  };

  if (loading) return <p className="text-white mt-10">Loading game…</p>;
  if (error) return <p className="text-red-500 mt-10">{error}</p>;
  if (!currentPlayer || currentIndex >= players.length) {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] p-6">
      <div className="flex items-center justify-between w-full max-w-lg bg-[#262346] rounded-md px-4 py-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white text-[#3b27ff] text-xs font-bold grid place-items-center">
            {currentPlayer.name[0]}
          </div>
          <span className="text-white font-medium">{currentPlayer.name}</span>
        </div>
        <span className="text-xs text-white/70">
          {players.length - currentIndex} left
        </span>
      </div>

      <div className="bg-[#1e2033] p-4 rounded-md">
        <div className="flex flex-col gap-2">
          {currentGrid.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-4 gap-2">
              {row.map((cat, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                return (
                  <div
                    key={key}
                    className={`${getCellClass(cellStatus[key] ?? 'default')} text-[11px] font-medium leading-tight flex items-center justify-center text-center w-28 h-16 rounded`}
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


      <div className="flex justify-between w-full max-w-lg mt-8">
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