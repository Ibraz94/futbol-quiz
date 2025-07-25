"use client";
// This file is moved from app/teamgame/play.tsx to app/teamgame/play/page.tsx for correct routing in Next.js. No code changes needed.

import { Suspense } from "react";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_BASE_URL } from "../../../lib/config";

function PlayPageContent() {
  const searchParams = useSearchParams()!;
  const router = useRouter();
  const team1 = searchParams.get("team1") || "";
  const team2 = searchParams.get("team2") || "";
  const league = searchParams.get("league") || "";

  const [timer, setTimer] = useState(15);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timesUp, setTimesUp] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const streakParam = searchParams.get("streak");
  const [streak, setStreak] = useState(streakParam ? parseInt(streakParam, 10) : 0);
  const correctCountParam = searchParams.get("correctCount");
  const [correctCount, setCorrectCount] = useState(correctCountParam ? parseInt(correctCountParam, 10) : 0);
  const [win, setWin] = useState(false);

  useEffect(() => {
    // Log all valid players for these teams for user help
    if (team1 && team2) {
      axios.post(`${API_BASE_URL}/leagues/valid-players`, { team1, team2 })
        .then(res => {
          if (Array.isArray(res.data.players)) {
            console.log("Valid players for", team1, "&", team2, ":", res.data.players);
          }
        });
    }
  }, [team1, team2]);

  useEffect(() => {
    if (timer === 0 && !submitted) {
      setTimesUp(true);
      setSubmitted(true);
      setResult("Time's up!");
    }
    if (timer > 0 && !submitted) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer, submitted, league, router]);

  useEffect(() => {
    if (correctCount >= 3) {
      setWin(true);
      setTimeout(() => {
        router.push('/teamgame');
      }, 2000);
      return;
    }
    if (submitted && result) {
      // After showing result, redirect to teams screen for the same league
      const timeout = setTimeout(() => {
        if (league) {
          router.push(`/teamgame/teams?league=${encodeURIComponent(league)}&correctCount=${correctCount}`);
        } else {
          router.push('/teamgame');
        }
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [submitted, result, league, router, correctCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/leagues/verify-player`, {
        team1,
        team2,
        player: input,
      });
      if (res.data.valid) {
        setResult("Correct!");
        setCorrectCount(prev => prev + 1);
      } else {
        setResult("Wrong!");
        // Do not reset correctCount
      }
    } catch {
      setResult("Error verifying player.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#111827] to-black">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#23233a] border border-white/10 text-white shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg text-white/80">Teams</div>
          <div className="text-2xl font-bold text-white/90">TIMER : {timer}'</div>
        </div>
        <div className="mb-6 divide-y divide-white/10">
          <div className="py-2 px-4 font-semibold text-white/90">{team1}</div>
          <div className="py-2 px-4 font-semibold text-white/90">{team2}</div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter player name..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="bg-[#111827] border border-white/20 rounded px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={submitted || timesUp}
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent/80 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
            disabled={submitted || timesUp || !input.trim()}
          >
            Submit
          </button>
        </form>
        {/* {timesUp && <div className="mt-4 text-center text-red-400 font-bold">Time's up!</div>} */}
        {win && <div className="mt-4 text-center text-green-400 font-bold text-2xl">You win! 🎉</div>}
        {submitted && result && !win && <div className={`mt-4 text-center font-bold ${result === "Correct!" ? "text-green-400" : "text-red-400"}`}>{result}</div>}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayPageContent />
    </Suspense>
  );
} 