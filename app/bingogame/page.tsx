/* app/bingogame/page.tsx */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

////////////////////////////////////////////////////////////////////////////////
// → Types that exactly mirror your API payload
////////////////////////////////////////////////////////////////////////////////
type Category = {
  _id: string;
  name: string;
  type: string;
  slug: string;
  __v: number;
};

type Player = {
  _id: string;
  name: string;
  categories: Category[];
};

type Match = {
  playerId: string;
  categoryIds: string[];
  locked: boolean;
};

type GameResponse = {
  gameId: string;
  card: Category[][];
  players: Player[];
  matches: Match[];
};

////////////////////////////////////////////////////////////////////////////////
// → Helper that colours a grid cell
////////////////////////////////////////////////////////////////////////////////
const getCellClass = (status: CellStatus) => {
  switch (status) {
    case 'correct':
      return 'bg-green-500 text-white';
    case 'wrong':
      return 'bg-red-500 text-white';
    default:
      return 'bg-[#23243a] text-white/90 hover:ring-2 hover:ring-[#ffd60066] cursor-pointer';
  }
};

type CellStatus = 'default' | 'correct' | 'wrong';

////////////////////////////////////////////////////////////////////////////////
// → Component
////////////////////////////////////////////////////////////////////////////////
const BingoGame: React.FC = () => {
  ////////////////////////////////////////////////////////////////////////////
  // ❶  STATE
  ////////////////////////////////////////////////////////////////////////////
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [card, setCard] = useState<Category[][]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);          // which match/player is active
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({}); // categoryId ↦ status

  ////////////////////////////////////////////////////////////////////////////
  // ❷  FETCH on mount
  ////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        // 🔄  CHANGE THIS URL if your endpoint lives elsewhere
        const { data } = await axios.get<GameResponse>('http://localhost:5000/bingo/game');
        setCard(data.card);
        setPlayers(data.players);
        setMatches(data.matches);
      } catch (e) {
        setError('Could not load game.');
      } finally {
        setLoading(false);
      }
    };
    loadGame();
  }, []);

  ////////////////////////////////////////////////////////////////////////////
  // ❸  Derived helpers
  ////////////////////////////////////////////////////////////////////////////
  const matchesLeft = matches.length - currentIdx;
  const currentMatch = matches[currentIdx];

  useEffect(() => {
    if (currentMatch && card.length) {
      // console.log('Correct category IDs:', currentMatch.categoryIds);

      const correctNames = card
        .flat() // flatten 2D array to 1D
        .filter(box => currentMatch.categoryIds.includes(box._id))
        .map(box => box.name);

      console.log('✅ Correct category names:', correctNames);
    }
  }, [currentMatch, card]);


  const currentPlayer = players.find((p) => p._id === currentMatch?.playerId);

  ////////////////////////////////////////////////////////////////////////////
  // ❹  Move to next player (skip / after answer)
  ////////////////////////////////////////////////////////////////////////////
  const advancePlayer = useCallback(() => {
    // clear ONLY the red “wrong” cells, keep greens locked
    setCellStatus((prev) => {
      const cleaned: Record<string, CellStatus> = {};
      Object.entries(prev).forEach(([id, status]) => {
        if (status === 'correct') cleaned[id] = 'correct';
      });
      return cleaned;
    });
    setCurrentIdx((idx) => Math.min(idx + 1, matches.length)); // clamp
  }, [matches.length]);

  ////////////////////////////////////////////////////////////////////////////
  // ❺  Cell click handler
  ////////////////////////////////////////////////////////////////////////////
  const handleCellClick = (cat: Category) => {
    if (!currentMatch) return;
    const already = cellStatus[cat._id];
    if (already === 'correct' || already === 'wrong') return;

    const isCorrect = currentMatch.categoryIds.includes(cat._id);

    if (isCorrect) {
      setCellStatus((prev) => ({ ...prev, [cat._id]: 'correct' }));
      setTimeout(() => advancePlayer(), 400); // move to next player right away
    } else {
      setCellStatus((prev) => ({ ...prev, [cat._id]: 'wrong' }));
      setTimeout(() => advancePlayer(), 400); // move to next player
    }
  };


  ////////////////////////////////////////////////////////////////////////////
  // ❻  New Game = reload page (simplest) — you can call the API again if you prefer
  ////////////////////////////////////////////////////////////////////////////
  const startNewGame = () => {
    window.location.reload();
  };

  ////////////////////////////////////////////////////////////////////////////
  // ❼  Render
  ////////////////////////////////////////////////////////////////////////////
  if (loading) return <p className="text-center text-white mt-20">Loading…</p>;
  if (error) return <p className="text-center text-red-500 mt-20">{error}</p>;
  if (!currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <h2 className="text-2xl font-bold">🎉 Finished!</h2>
        <button onClick={startNewGame} className="bg-emerald-500 px-6 py-2 rounded-md text-black font-semibold">
          New Game
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e1118] px-4">
      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between w-full max-w-lg bg-[#262346] rounded-md px-4 py-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white text-[#3b27ff] text-xs font-bold grid place-items-center">
            {currentPlayer?.name?.[0] ?? '?'}
          </div>
          <span className="text-white font-medium">
            {currentPlayer?.name || 'Player'}
          </span>
        </div>
        <span className="text-xs text-white/70">{matchesLeft} players left</span>
      </div>

      {/* ===== GRID ===== */}
      <div className="bg-[#1e2033] p-4 rounded-md">
        <div className="grid grid-cols-5 grid-rows-5 gap-2">
          {card.flat().map((cat) => {
            const status = cellStatus[cat._id] ?? 'default';
            return (
              <div
                key={cat._id}
                onClick={() => handleCellClick(cat)}
                className={`${getCellClass(status)} text-[11px] font-medium leading-tight flex items-center justify-center text-center w-28 h-16 rounded`}
              >
                {cat.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="flex justify-between w-full max-w-lg mt-8">
        <button
          className="bg-[#ffd600] text-black font-semibold px-8 py-2 rounded"
          onClick={advancePlayer}
        >
          Skip
        </button>

        <button
          className="bg-emerald-500 text-black font-semibold px-8 py-2 rounded"
          onClick={startNewGame}
        >
          New Game
        </button>
      </div>
    </div>
  );
};

export default BingoGame;