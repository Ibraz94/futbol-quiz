"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Suspense } from "react";
import { API_BASE_URL } from "../../../lib/config";

function TeamsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const league = searchParams.get("league") || "";

  const [teams, setTeams] = useState<string[]>([]);
  const [randomTeams, setRandomTeams] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [timer, setTimer] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const correctCountParam = searchParams.get("correctCount");
  const correctCount = correctCountParam ? parseInt(correctCountParam, 10) : 0;

  useEffect(() => {
    if (!league) {
      router.push('/teamgame');
      return;
    }
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/leagues/${encodeURIComponent(league)}/teams`)
      .then((res) => {
        const allTeams = res.data.teams || [];
        // Shuffle and pick 10 teams
        const shuffled = allTeams.sort(() => 0.5 - Math.random());
        setTeams(allTeams);
        setRandomTeams(shuffled.slice(0, 10));
      })
      .catch(() => setError("Failed to fetch teams"))
      .finally(() => setLoading(false));
  }, [league, router]);

  useEffect(() => {
    if (selected.length === 2) {
      setTimeout(() => {
        router.push(`/teamgame/play?team1=${encodeURIComponent(selected[0])}&team2=${encodeURIComponent(selected[1])}&league=${encodeURIComponent(league)}&correctCount=${correctCount}`);
      }, 500);
    }
  }, [selected, router, league, correctCount]);

  useEffect(() => {
    if (timer === 0 && selected.length < 2) {
      // Redirect to league selection page if time is up and not enough teams selected
      router.push('/teamgame');
      return;
    }
    if (selected.length === 2) return;
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer, selected, teams, router]);

  const handleSelect = (team: string) => {
    if (selected.includes(team) || selected.length === 2) return;
    setSelected((prev) => [...prev, team]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#111827] to-black">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#23233a] border border-white/10 text-white shadow-lg mt-5">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg text-white/80">Team</div>
          <div className="text-2xl font-bold text-white/90">TIMER : {timer}'</div>
        </div>
        {loading && <div className="text-center py-6 text-white/60">Loading teams...</div>}
        {error && <div className="text-center py-6 text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="divide-y divide-white/10">
            {randomTeams.map((team) => (
              <div
                key={team}
                className={`py-2 px-4 cursor-pointer transition rounded text-white/90 ${selected.includes(team) ? "bg-accent text-white font-bold" : "hover:bg-white/10"}`}
                onClick={() => handleSelect(team)}
              >
                {team}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TeamsPageContent />
    </Suspense>
  );
} 