'use client'

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function TeamGamePage() {
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leagueTeamCounts, setLeagueTeamCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("http://api.futbolquiz.staging.pegasync.com/leagues");
        const leagueList = res.data.leagues || [];
        setLeagues(leagueList);
        // Fetch team counts for each league
        const counts: Record<string, number> = {};
        await Promise.all(
          leagueList.map(async (league: string) => {
            const teamRes = await axios.get(`http://api.futbolquiz.staging.pegasync.com/leagues/${encodeURIComponent(league)}/teams`);
            counts[league] = (teamRes.data.teams || []).length;
          })
        );
        setLeagueTeamCounts(counts);
      } catch (err: any) {
        setError("Failed to fetch leagues");
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, []);

  const handleCreate = (league: string) => {
    router.push(`/teamgame/teams?league=${encodeURIComponent(league)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#111827] to-black">
      <div className="max-w-lg w-full p-6 rounded-2xl bg-gradient-to-b from-[#111827] to-black border border-white/10 text-white shadow-lg">
        <div className="mb-6">
          <h2 className="font-bold mb-2 text-lg text-accent text-white text-center">Leagues</h2>
          <div className="mb-4 divide-y divide-white/10">
            {loading && <div className="text-center py-6 text-white/60">Loading leagues...</div>}
            {error && <div className="text-center py-6 text-red-400">{error}</div>}
            {!loading && !error && leagues.length === 0 && (
              <div className="text-center py-6 text-white/60">No leagues found.</div>
            )}
            {!loading && !error && leagues.map((league, idx) => {
              const teamCount = leagueTeamCounts[league] || 0;
              const disabled = teamCount < 2;
              return (
                <div key={league + idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl drop-shadow">🏆</span>
                    <div>
                      <div className="font-semibold text-base text-white">{league}</div>
                      <div className="text-xs text-white/60">{teamCount} teams</div>
                    </div>
                  </div>
                  <div className="relative group">
                    <button
                      className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition ${disabled ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-accent hover:bg-accent/80 text-white'}`}
                      onClick={() => !disabled && handleCreate(league)}
                      disabled={disabled}
                    >
                      Create
                    </button>
                    {disabled && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-black text-white text-xs rounded px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none z-10 border border-white/10 shadow-lg transition-opacity">
                        Less than 2 teams in the League, so game not playable.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}