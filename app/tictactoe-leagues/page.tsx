"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { API_BASE_URL } from "../../lib/config";
import { useRouter } from "next/navigation";

interface LeagueCategory {
  _id: string;
  ID: number;
  Category: string;
  Type: string;
  Slug: string;
}

export default function TicTacToeLeaguesPage() {
  const [leagues, setLeagues] = useState<LeagueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tictactoe/leagues`);
      setLeagues(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError('Failed to load leagues');
      setLoading(false);
    }
  };

  const handleLeagueSelect = (league: LeagueCategory) => {
    console.log('Selected league:', league);
    // Navigate to the TicTacToe game with the selected league
    router.push(`/tictactoe?league=${league.Slug}`);
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading leagues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={fetchLeagues}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-4"
          >
            Retry
          </button>
          <button
            onClick={handleBackToHome}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1f1f2e]">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            TicTacToe Game
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Choose a league to start playing
          </p>
          <button
            onClick={handleBackToHome}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-lg transition-colors"
          >
            ← Back to Home
          </button>
        </div>

        {/* Leagues List */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {leagues.map((league) => (
              <div
                key={league._id}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group"
                onClick={() => handleLeagueSelect(league)}
              >
                <div className="flex items-center justify-between">
                  {/* League Info */}
                  <div className="flex items-center space-x-4">
                    {/* League Icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      {league.Category.charAt(0)}
                    </div>
                    
                    {/* League Details */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {league.Category}
                      </h3>
                      <p className="text-gray-400 text-sm capitalize">
                        {league.Type} • ID: {league.ID}
                      </p>
                    </div>
                  </div>
                  
                  {/* Start Button */}
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300">
                    Start Game
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {leagues.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Leagues Available</h3>
              <p className="text-gray-400 mb-6">
                It looks like no leagues have been added yet.
              </p>
              <button
                onClick={fetchLeagues}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg mr-4"
              >
                Refresh
              </button>
              <button
                onClick={handleBackToHome}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-gray-400 text-sm">
            Select a league to start your TicTacToe adventure!
          </p>
        </div>
      </div>
    </div>
  );
}
