'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

type CareerEntry = {
  team: string;
  season: string;
  matches: number;
  goals: number;
  assists: number;
};

type Player = {
  name: string;
  career: CareerEntry[];
};

const QuizGame: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [series, setSeries] = useState(0);
  const [timer, setTimer] = useState(20);
  const [showGameOver, setShowGameOver] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPlayers = async () => {
    try {
      const res = await axios.get<Player[]>('http://localhost:5000/career/game');
      setPlayers(res.data);
      setScore(0);
      setSeries(0);
      setCurrentIndex(0);
      setInput('');
      setTimer(20);
      if (res.data[0]) console.log('🔍 First answer is:', res.data[0].name);
    } catch (err) {
      console.error('Failed to fetch career data', err);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const startTimer = () => {
    clearInterval(intervalRef.current!);
    setTimer(20);
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev === 1) {
          handleSkip();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (players.length > 0) startTimer();
    return () => clearInterval(intervalRef.current!);
  }, [currentIndex]);

  const currentPlayer = players[currentIndex];

  const nextPlayer = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setInput('');
    if (nextIndex >= players.length) {
      console.log('🎉 Game complete. Showing Game Over...');
      setShowGameOver(true);
      clearInterval(intervalRef.current!);
      setTimeout(() => {
        setShowGameOver(false);
        fetchPlayers();
      }, 2000);
    } else {
      console.log('🔍 Next answer is:', players[nextIndex].name);
    }
  };

  const handleGuess = () => {
    if (!currentPlayer) return;
    const guess = input.trim().toLowerCase();
    const actual = currentPlayer.name.trim().toLowerCase();

    console.log('🧠 Correct Answer:', currentPlayer.name);

    if (guess === actual) {
      setScore(prev => prev + 1);
      setSeries(prev => prev + 1);
      console.log('✅ Correct!');
    } else {
      setSeries(0);
      console.log('❌ Wrong!');
    }

    nextPlayer();
  };

  const handleSkip = () => {
    nextPlayer(); // Don't reset series
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0e1118] px-4 py-6 text-white">
      {/* Game Over Screen */}
      {showGameOver && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 animate-pulse">🎮 Game Over</h1>
          <p className="text-lg sm:text-xl text-gray-300">Restarting...</p>
        </div>
      )}

      {/* Status Bar */}
      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Duration</p>
          <p className="text-xl font-bold text-blue-400">
            ⏱️ {timer} <span className="ml-1 text-base">s</span>
          </p>
        </div>
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Score</p>
          <p className="text-xl font-bold text-yellow-400">🏆 {score}</p>
        </div>
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Series</p>
          <p className={`text-xl font-bold text-orange-400 flex items-center ${series >= 3 ? 'animate-bounce' : ''}`}>
            🔥 {series}
          </p>
        </div>
        <div className="bg-[#1a1e2d] rounded-lg flex flex-col items-center py-4">
          <p className="text-sm text-gray-400">Remainder</p>
          <p className="text-xl font-bold text-purple-400">👥 {players.length - currentIndex}</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center gap-4 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write the name of the football player..."
          className="flex-grow rounded-md bg-[#1a1e2d] py-3 px-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        />
        <button
          onClick={handleGuess}
          className="bg-[#1a1e2d] hover:bg-[#2a2f4a] rounded-md py-3 px-5 text-sm sm:text-base font-medium"
        >
          Enter
        </button>
        <button
          onClick={handleSkip}
          className="bg-[#1a1e2d] hover:bg-[#2a2f4a] rounded-md py-3 px-5 text-sm sm:text-base font-medium"
        >
          Skip
        </button>
      </div>

      {/* Career Table */}
      <div className="w-full max-w-4xl overflow-x-auto rounded-lg bg-[#1a1e2d]">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-600">
              <th className="py-3 px-4 text-sm sm:text-base">Years</th>
              <th className="py-3 px-4 text-sm sm:text-base">Set</th>
              <th className="py-3 px-4 text-sm sm:text-base">Match</th>
              <th className="py-3 px-4 text-sm sm:text-base">Goal</th>
            </tr>
          </thead>
          <tbody>
            {currentPlayer?.career.map((entry, idx) => (
              <tr key={idx} className="border-b border-gray-700 hover:bg-[#2a2f4a]/50">
                <td className="py-3 px-4 text-sm sm:text-base">{entry.season}</td>
                <td className="py-3 px-4 text-sm sm:text-base">{entry.team}</td>
                <td className="py-3 px-4 text-sm sm:text-base">{entry.matches}</td>
                <td className="py-3 px-4 text-sm sm:text-base">{entry.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuizGame;