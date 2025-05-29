"use client";

import FeaturedGames from "@/components/FeaturedGames";
import HeroSection from "@/components/HeroSection";
import Information from "@/components/Information";
import Leaderboard from "@/components/LeaderBoard";
import Experience from "@/components/Experience";

const Home = () => {
  return (
    <div className="relative bg-gradient-to-b from-[#111827] to-black" >
        <div className="min-h-screen">
          <HeroSection/>
        </div>
        <div className="">
          <FeaturedGames/>
        </div>
        <div className="">
          <Information/>
        </div>
        <div className="">
          <Leaderboard/>
        </div>
        <div className="mt-52">
          <Experience/>
        </div>
    </div>
  );
};

export default Home;